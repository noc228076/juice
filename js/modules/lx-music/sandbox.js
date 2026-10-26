/* =========================================================
   洛雪音源内核 · 自定义音源沙箱
   ---------------------------------------------------------
   用 sandbox iframe 执行用户音源脚本，契约与洛雪桌面端一致：
     globalThis.lx = { EVENT_NAMES, request, send, on, utils, currentScriptInfo, version, env }

   脚本只负责 musicUrl / lyric / pic（不提供搜索——搜索走内置平台接口）。
   ========================================================= */
(function (root) {
  'use strict';

  var SANDBOX_URL = '/lx-user-api-sandbox.html';
  var SANDBOX_TIMEOUT = 12000;

  var sandboxes = [];

  function parseScriptInfo(script) {
    var head = String(script || '').slice(0, 4096);
    var read = function (field) {
      var re = new RegExp(
        '^[ \\t]*(?:\\*|//|/\\*+!?)?[ \\t]*@' + field + '[ \\t\\u3000\\u00a0]+([^\\r\\n]+?)[ \\t]*(?:\\*/)?[ \\t]*$',
        'm'
      );
      var m = re.exec(head);
      return m ? m[1].trim() : '';
    };
    var name = read('name');
    var fallback = '未命名音源';
    if (!name) {
      var hash = 0;
      for (var i = 0; i < script.length; i++) hash = (hash * 31 + script.charCodeAt(i)) | 0;
      fallback = '未命名音源_' + (hash >>> 0).toString(36).slice(0, 6);
    }
    return {
      name: name || fallback,
      description: read('description'),
      version: read('version'),
      author: read('author'),
      homepage: read('homepage') || read('repository'),
      rawScript: script
    };
  }

  /** 转发沙箱发起的 HTTP 请求 */
  function forwardRequest(payload) {
    var R = root.LxRequest;
    var headers = payload.headers || {};
    var options = {
      method: (payload.method || 'get').toLowerCase(),
      headers: headers,
      timeout: payload.timeout || 20000,
      // 音源脚本会打到几十个第三方聚合 API，用 api 通道不套域名白名单
      kind: 'api'
    };
    if (payload.form) options.form = payload.form;
    else if (payload.body != null) options.body = payload.body;

    return R.httpFetch(payload.url, options).promise.then(function (resp) {
      return {
        statusCode: resp.statusCode,
        statusMessage: resp.statusMessage,
        headers: resp.headers,
        bytes: resp.raw ? resp.raw.length : 0,
        raw: resp.raw,
        body: resp.body
      };
    });
  }

  function createSandbox(script, scriptInfo) {
    return new Promise(function (resolve, reject) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.style.display = 'none';
      iframe.src = SANDBOX_URL;

      var sb = {
        id: 'sb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        iframe: iframe,
        scriptInfo: scriptInfo,
        sources: {},
        requestSeq: 0,
        aborted: {}
      };

      var settled = false;
      var readyResolve = null;
      var readyPromise = new Promise(function (res) { readyResolve = res; });

      /**
       * 彻底拆掉这个沙箱。
       * 之前超时/失败分支只 reject，iframe 和 message 监听都留着：
       * 迟到的 ready 仍会触发 init，脚本在一个没人管理的孤儿 iframe 里
       * 继续跑，还能继续命中残留的监听器发网络请求。内置 9 个脚本
       * 串行加载时，每个失败的都留一份，越用越慢。
       */
      function teardown() {
        clearTimeout(timer);
        try { window.removeEventListener('message', onMessage); } catch (e) {}
        try { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch (e) {}
        sb.sources = {};
        sb.dead = true;
      }
      sb.teardown = teardown;

      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        teardown();
        reject(new Error('音源「' + scriptInfo.name + '」加载超时'));
      }, SANDBOX_TIMEOUT);

      function onMessage(event) {
        if (event.source !== iframe.contentWindow) return;
        var data = event.data;
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
          case 'ready':
            if (readyResolve) readyResolve();
            break;

          case 'inited': {
            // 与洛雪桌面端一致：只要求有 sources，不检查 status
            var sources = data.data && data.data.sources;
            var valid = {};
            if (sources && typeof sources === 'object') {
              Object.keys(sources).forEach(function (k) {
                if (sources[k] && sources[k].type === 'music') valid[k] = sources[k];
              });
            }
            if (!Object.keys(valid).length) {
              var msg = (data.data && data.data.message) || ('音源「' + scriptInfo.name + '」未声明任何可用平台');
              if (!settled) { settled = true; teardown(); reject(new Error(msg)); }
              break;
            }
            sb.sources = valid;
            if (!settled) { settled = true; clearTimeout(timer); resolve(sb); }
            break;
          }

          case 'request': {
            (function (d) {
              var id = d.id;
              if (sb.aborted[id]) { delete sb.aborted[id]; return; }
              // iframe 可能在请求途中被销毁，此时 contentWindow 为 null，
              // 直接 postMessage 会抛错并产生未处理的 rejection
              var reply = function (msg) {
                var w = iframe.contentWindow;
                if (!w) return;
                try { w.postMessage(msg, '*'); } catch (e) {}
              };
              forwardRequest(d.payload).then(function (resp) {
                reply({ type: 'request-result', id: id, resp: resp });
              }).catch(function (error) {
                reply({
                  type: 'request-result',
                  id: id,
                  error: (error && error.message) || String(error)
                });
              });
            })(data);
            break;
          }

          case 'abort':
            sb.aborted[data.id] = true;
            break;

          case 'error':
            console.error('[音源:' + scriptInfo.name + ']', data.message);
            break;
        }
      }

      window.addEventListener('message', onMessage);
      document.body.appendChild(iframe);

      readyPromise.then(function () {
        iframe.contentWindow.postMessage({ type: 'init', script: script, scriptInfo: scriptInfo }, '*');
      });
    });
  }

  function requestFromSandbox(sb, payload) {
    var reqId = ++sb.requestSeq;
    return new Promise(function (resolve, reject) {
      // 8 秒：取地址是「点一下就等」的交互，等满 30 秒用户早就以为卡死了。
      // 正常的脚本 1~3 秒就返回，超时说明它自己有问题，早放弃好换下一个。
      var timer = setTimeout(function () {
        window.removeEventListener('message', onMessage);
        reject(new Error('音源「' + sb.scriptInfo.name + '」请求超时'));
      }, 8000);

      function onMessage(event) {
        if (event.source !== sb.iframe.contentWindow) return;
        var data = event.data;
        if (!data || data.type !== 'invoke-result' || data.reqId !== reqId) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        if (data.error) reject(new Error(data.error));
        else resolve(data.result);
      }

      window.addEventListener('message', onMessage);
      sb.iframe.contentWindow.postMessage({ type: 'invoke-request', reqId: reqId, payload: payload }, '*');
    });
  }

  /** 加载一个音源脚本（追加） */
  function load(script) {
    var info = parseScriptInfo(script);
    return createSandbox(script, info).then(function (sb) {
      sandboxes.push(sb);
      return { id: sb.id, name: sb.scriptInfo.name, version: sb.scriptInfo.version, sources: Object.keys(sb.sources) };
    });
  }

  /**
   * 请求播放地址（多音源 fallback：按加载顺序依次尝试）
   * @returns {Promise<string>} 音频 URL
   */
  function candidatesFor(sourceId) {
    return sandboxes.filter(function (sb) {
      var info = sb.sources[sourceId];
      return info && info.actions && info.actions.indexOf('musicUrl') > -1;
    });
  }

  /**
   * 单个沙箱取址。bridge 拿它做「逐脚本校验」，所以必须能指定沙箱。
   */
  function getMusicUrlFrom(sb, sourceId, musicInfo, quality) {
    return requestFromSandbox(sb, {
      source: sourceId,
      action: 'musicUrl',
      info: { type: quality || '128k', musicInfo: musicInfo }
    });
  }

  function getMusicUrl(sourceId, musicInfo, quality) {
    var candidates = candidatesFor(sourceId);
    if (!candidates.length) {
      return Promise.reject(new Error('没有音源支持 ' + sourceId + ' 的播放地址获取'));
    }

    var errors = [];
    function tryNext(i) {
      if (i >= candidates.length) {
        return Promise.reject(new Error(errors.join('\n')));
      }
      var sb = candidates[i];
      return getMusicUrlFrom(sb, sourceId, musicInfo, quality).catch(function (err) {
        errors.push(sb.scriptInfo.name + ': ' + ((err && err.message) || err));
        return tryNext(i + 1);
      });
    }
    return tryNext(0);
  }

  function getLyric(sourceId, musicInfo) {
    var sb = sandboxes.find(function (s) {
      var info = s.sources[sourceId];
      return info && info.actions && info.actions.indexOf('lyric') > -1;
    });
    if (!sb) return Promise.reject(new Error('没有音源支持歌词'));
    return requestFromSandbox(sb, { source: sourceId, action: 'lyric', info: { musicInfo: musicInfo } });
  }

  function destroy() {
    sandboxes.forEach(function (sb) {
      if (sb.teardown) sb.teardown(); else sb.iframe.remove();
    });
    sandboxes = [];
  }

  function removeByName(name, version) {
    sandboxes = sandboxes.filter(function (sb) {
      if (sb.scriptInfo.name === name && sb.scriptInfo.version === version) {
        if (sb.teardown) sb.teardown(); else sb.iframe.remove();
        return false;
      }
      return true;
    });
  }

  function listLoaded() {
    return sandboxes.map(function (sb) {
      return { id: sb.id, name: sb.scriptInfo.name, version: sb.scriptInfo.version, sources: Object.keys(sb.sources) };
    });
  }

  function hasAny() {
    return sandboxes.length > 0;
  }

  root.LxSandbox = {
    parseScriptInfo: parseScriptInfo,
    load: load,
    getMusicUrl: getMusicUrl,
    getMusicUrlFrom: getMusicUrlFrom,
    candidatesFor: candidatesFor,
    getLyric: getLyric,
    destroy: destroy,
    removeByName: removeByName,
    listLoaded: listLoaded,
    hasAny: hasAny
  };
})(window);
