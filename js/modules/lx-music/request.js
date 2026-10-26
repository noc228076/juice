/* =========================================================
   洛雪音源内核 · 请求底座
   ---------------------------------------------------------
   移植自 lx-music-desktop 的 src/renderer/utils/request.js，
   改成浏览器原生 fetch + CORS 代理。

   回调约定与原实现保持一致：
     callback(err, resp, body)
     resp = { statusCode, headers, body, raw }
   ========================================================= */
(function (root) {
  'use strict';

  // juice 的代理在 /api/proxy（Vercel serverless + 本地 server.js 同路径）
  var PROXY = '/api/proxy';

  function toProxied(url, kind) {
    if (!/^https?:\/\//i.test(url)) return url;
    var sep = PROXY.indexOf('?') > -1 ? '&' : '?';
    return PROXY + sep + 'url=' + encodeURIComponent(url) + '&kind=' + (kind || 'api') + '&_t=' + Date.now();
  }

  var DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
  };

  function encodeForm(form) {
    return Object.keys(form)
      .filter(function (k) { return form[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(String(form[k])); })
      .join('&');
  }

  function buildBody(opts) {
    if (opts.formData) {
      var fd = new FormData();
      Object.keys(opts.formData).forEach(function (k) {
        var v = opts.formData[k];
        if (v == null) return;
        fd.append(k, v instanceof Blob ? v : String(v));
      });
      return { body: fd };
    }
    if (opts.form) {
      return { body: encodeForm(opts.form), contentType: 'application/x-www-form-urlencoded' };
    }
    if (opts.body != null) {
      if (typeof opts.body === 'string') return { body: opts.body };
      return { body: JSON.stringify(opts.body), contentType: 'application/json' };
    }
    return {};
  }

  function headersToObject(headers) {
    var out = {};
    headers.forEach(function (v, k) {
      var lower = k.toLowerCase();
      if (lower === 'set-cookie') out[lower] = v.split(/,\s*(?=[^;=]+=)/);
      else out[lower] = v;
    });
    // 浏览器禁止读 set-cookie，代理把原文放在 x-set-cookie
    if (!out['set-cookie'] && out['x-set-cookie']) {
      out['set-cookie'] = String(out['x-set-cookie']).split('\n');
      delete out['x-set-cookie'];
    }
    return out;
  }

  function parseBody(text, format) {
    if (format === 'text' || format === 'script') return text;
    try { return JSON.parse(text); } catch (e) { return text; }
  }

  /**
   * 底层请求，返回 { promise, cancel }
   * 与原 httpFetch 的行为对齐（超时、取消、错误码映射）
   */
  function fetchData(url, method, opts, cb) {
    var controller = new AbortController();
    // 默认 9 秒：本地 6 秒够用，线上（尤其手机蜂窝）经常不够，
    // 太短会出现「所有源都超时、一条结果都没有」。单源超时不拖累其他源。
    var timeout = opts.timeout == null ? 9000 : opts.timeout;
    var timer = null;
    var aborted = false;
    var timedOut = false;   // 区分「超时」和「主动取消」，错误码要用对

    var cancel = function () {
      aborted = true;
      controller.abort();
    };

    var run = function () {
      if (timeout > 0) {
        timer = setTimeout(function () {
          timedOut = true;
          aborted = true;
          controller.abort();
        }, timeout);
      }

      var headers = {};
      var src = Object.assign({}, DEFAULT_HEADERS, opts.headers || {});
      Object.keys(src).forEach(function (k) {
        if (src[k] != null) headers[k] = String(src[k]);
      });

      var b = buildBody(opts);
      if (b.contentType && !Object.keys(headers).some(function (k) { return k.toLowerCase() === 'content-type'; })) {
        headers['Content-Type'] = b.contentType;
      }

      return fetch(toProxied(url, opts.kind), {
        method: (method || 'get').toUpperCase(),
        headers: headers,
        body: b.body,
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'follow',
        cache: 'no-store'
      }).then(function (resp) {
        // 二进制响应（如酷我加密歌词）不能走 text()：UTF-8 解码会把字节改坏
        if (opts.responseType === 'arraybuffer') {
          return resp.arrayBuffer().then(function (ab) {
            return {
              statusCode: resp.status,
              statusMessage: resp.statusText,
              headers: headersToObject(resp.headers),
              body: null,
              raw: new Uint8Array(ab)
            };
          });
        }
        return resp.text().then(function (text) {
          return {
            statusCode: resp.status,
            statusMessage: resp.statusText,
            headers: headersToObject(resp.headers),
            body: parseBody(text, opts.format),
            raw: text
          };
        });
      });
    };

    // cb 只允许被调用一次：成功分支里 cb 自己抛异常时，
    // 原来的写法会掉进下面的 catch 再 cb(err) 一次，调用方会被触发两回
    var cbDone = false;
    var onceCb = function (err, resp, body) {
      if (cbDone) return;
      cbDone = true;
      try { cb(err, resp, body); } catch (eCb) { /* 回调内部错误不能改变请求本身的结论 */ }
    };

    var promise = run().then(function (resp) {
      if (timer) clearTimeout(timer);
      if (aborted) throw new Error('cancel request');
      onceCb(null, resp, resp.body);
      return resp;
    }).catch(function (error) {
      if (timer) clearTimeout(timer);
      var message = (error && error.message) || String(error);
      var code = 'ENETWORK';
      // 超时和主动取消都走了 abort，必须先看 timedOut，
      // 否则超时永远被报成 'cancel request'，上层区分不了两种情况
      if (timedOut) { message = '请求超时'; code = 'ETIMEDOUT'; }
      else if (aborted) { message = 'cancel request'; code = 'ECANCELED'; }
      else if (error && error.name === 'AbortError') { message = '请求超时'; code = 'ETIMEDOUT'; }
      else if (/Failed to fetch|NetworkError|Load failed/i.test(message)) { message = '无法连接到服务器'; }
      var err = new Error(message);
      err.code = code;
      onceCb(err);
      throw err;
    });

    promise.catch(function () {});

    return { promise: promise, cancel: cancel };
  }

  /** 与洛雪 httpFetch 同签名，返回 { promise, cancelHttp, isCancelled } */
  function httpFetch(url, options) {
    options = options || { method: 'get' };
    var obj = { isCancelled: false, promise: null, cancelHttp: null, requestObj: null };

    obj.cancelHttp = function () {
      if (!obj.requestObj) { obj.isCancelled = true; return; }
      obj.requestObj.cancel();
      obj.requestObj = null;
    };

    obj.promise = new Promise(function (resolve, reject) {
      obj.requestObj = fetchData(url, options.method || 'get', options, function (err, resp) {
        obj.requestObj = null;
        if (err) return reject(err);
        resolve(resp);
      });
      if (obj.isCancelled) obj.cancelHttp();
    });

    return obj;
  }

  function httpGet(url, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    return fetchData(url, 'get', options || {}, callback);
  }

  function httpPost(url, data, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    options = options || {};
    if (data != null && options.body == null && options.form == null) options.body = data;
    return fetchData(url, 'post', options, callback);
  }

  root.LxRequest = {
    httpFetch: httpFetch,
    httpGet: httpGet,
    httpPost: httpPost,
    fetchData: fetchData
  };
})(window);
