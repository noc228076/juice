# -*- coding: utf-8 -*-
import io

p = 'js/modules/music.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new, 1)

# 1) Tab 重排：搜歌为默认首屏；脚本独立成 Tab
rep("""  var el = null;
  var tab = 'local';""","""  var el = null;
  var tab = 'search';""")
rep("""  function homeHtml() {
    var tabs = [['local', '📁 本机音乐'], ['links', '🔗 直链歌单'], ['source', '🧩 音源脚本']];
    return playerBarHtml() +
      '<div class="mu-tabs">' + tabs.map(function (t) {
        return '<button class="mu-tab' + (tab === t[0] ? ' active' : '') + '" data-mu-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (tab === 'local' ? localHtml() : tab === 'links' ? linksHtml() : sourceHtml());
  }""","""  function homeHtml() {
    var tabs = [
      ['search', '🔍 在线搜歌'],
      ['local', '📁 本机音乐'],
      ['links', '🔗 直链歌单'],
      ['script', '🧩 音源脚本']
    ];
    return playerBarHtml() +
      '<div class="mu-tabs">' + tabs.map(function (t) {
        return '<button class="mu-tab' + (tab === t[0] ? ' active' : '') + '" data-mu-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (tab === 'search' ? searchHtml()
        : tab === 'local' ? localHtml()
        : tab === 'links' ? linksHtml()
        : scriptHtml());
  }""")

# 2) sourceHtml 拆成 searchHtml（首屏）+ scriptHtml（独立 Tab）
rep("""    var BUILTIN_CHIPS = [""","""    var BUILTIN_CHIPS = [""")
old_source_head = """    return '<div class="mu-panel">' + builtinHtml +
      '<h3 class="mu-h3" style="margin-top:14px">🧩 自定义音源脚本</h3>' +
      (cur === 'custom'
        ? '<p class="mu-note">粘贴你自己写的音源脚本（定义 MusicSource 对象，实现 search(keyword)）。脚本只保存在本机浏览器，本站仓库与服务器不经手任何脚本内容。</p>' +
          '<textarea class="mu-textarea mono" id="muSrcCode" rows="8" placeholder="// 粘贴音源脚本…"></textarea>' +
          '<div class="mu-btns">' +
            '<button class="mu-btn primary" id="muSrcAdd">保存并加载</button>' +
            '<button class="mu-btn" id="muSrcExample">填入模板</button>' +
          '</div>' +
          (srcRows ? '<div class="mu-src-list">' + srcRows + '</div>' : '')
        : '<p class="mu-note">切到「自定义脚本」标签后在此粘贴脚本。</p>') +
      '<div class="mu-searchbar">' +
        '<input class="mu-input" id="muSearchKw" placeholder="加载音源后，搜歌名 / 歌手…">' +
        '<button class="mu-btn primary" id="muSearchBtn">🔍 搜索</button>' +
      '</div>' +
      (searchResults.length
        ? '<div class="mu-list">' + searchResults.map(function (t, i) { return listRowHtml(t, i, '搜索结果'); }).join('') + '</div>'
        : '<div class="mu-empty">搜索结果会出现在这里</div>') +
    '</div>';
  }"""
new_source_head = """    return '<div class="mu-panel">' + builtinHtml +
      '<div class="mu-searchbar">' +
        '<input class="mu-input" id="muSearchKw" placeholder="输入歌名 / 歌手 / 风格，回车或点搜索…">' +
        '<button class="mu-btn primary" id="muSearchBtn">🔍 搜索</button>' +
      '</div>' +
      (searchResults.length
        ? '<div class="mu-list">' + searchResults.map(function (t, i) { return listRowHtml(t, i, '搜索结果'); }).join('') + '</div>'
        : '<div class="mu-empty">默认用 Audius（免登录、全曲播放）——想听什么直接搜</div>') +
    '</div>';
  }

  function scriptHtml() {
    var srcRows = (state.sources || []).map(function (s, i) {
      var on = activeSource && activeSource.name === s.name;
      return '<div class="mu-src' + (on ? ' on' : '') + '" data-src="' + i + '">' +
        '<b>' + esc(s.name || '未命名音源') + '</b>' +
        '<span class="mu-src-ops">' +
          '<button class="mu-btn mini" data-src-use="' + i + '">' + (on ? '已加载' : '加载') + '</button>' +
          '<button class="mu-btn mini danger" data-src-del="' + i + '">删除</button>' +
        '</span></div>';
    }).join('');
    return '<div class="mu-panel">' +
      '<h3 class="mu-h3">🧩 自定义音源脚本</h3>' +
      '<p class="mu-note">粘贴你自己写的音源脚本（定义 MusicSource 对象，实现 search(keyword)）。脚本只保存在本机浏览器，本站仓库与服务器不经手任何脚本内容。加载脚本后请到「在线搜歌」页搜索。</p>' +
      '<textarea class="mu-textarea mono" id="muSrcCode" rows="8" placeholder="// 粘贴音源脚本…"></textarea>' +
      '<div class="mu-btns">' +
        '<button class="mu-btn primary" id="muSrcAdd">保存并加载</button>' +
        '<button class="mu-btn" id="muSrcExample">填入模板</button>' +
      '</div>' +
      (srcRows ? '<div class="mu-src-list">' + srcRows + '</div>' : '') +
    '</div>';
  }"""
rep(old_source_head, new_source_head)

# 3) 内置 chips 增加「自定义脚本」项时不需要了——保留三档（audius/jamendo/custom），
#    custom 选中时搜索走脚本；searchHtml 的 chips 区域微调提示
rep("""    var builtinHtml = '<div class="mu-builtin">' +
      '<h3 class="mu-h3">📡 开源音源</h3>' +
      '<p class="mu-note">内置两个合法开源曲库（浏览器直连，无第三方服务器中转）。' +
        '其他开源库（Internet Archive / Openverse 等）国内直连不通，需要时走下方自定义脚本。</p>' +
      chipsHtml +""","""    var builtinHtml = '<div class="mu-builtin">' +
      '<h3 class="mu-h3">📡 选择曲库</h3>' +
      '<p class="mu-note">两个内置开源曲库（浏览器直连，无服务器中转）。' +
        'Internet Archive / Openverse 等国内直连不通，需要时用「音源脚本」自接。</p>' +
      chipsHtml +""")

# 4) Audius 过滤掉已删除曲目（/stream 404 的主要来源）
rep("""          return list
            .filter(function (t) { return t.streamable !== false && t.duration > 0; })""","""          return list
            .filter(function (t) { return t.streamable !== false && t.duration > 0 && !t.is_delete; })""")

# 5) 播放容错：搜索结果里点中下架曲（403/404）自动跳下一首，连续 8 首失败才放弃
rep("""    audio.addEventListener('play', function () { syncPlayUI(true); });
    audio.addEventListener('pause', function () { syncPlayUI(false); });
    audio.addEventListener('error', function () {
      if (cur) toast('「' + cur.title + '」播放失败（链接失效或格式不支持）');
      syncPlayUI(false);
    });""","""    audio.addEventListener('play', function () { syncPlayUI(true); });
    audio.addEventListener('playing', function () { failStreak = 0; });
    audio.addEventListener('pause', function () { syncPlayUI(false); });
    audio.addEventListener('error', function () {
      /* 搜索结果里有相当比例的下架曲（接口 403/404），点中时自动跳下一首 */
      if (qName === '搜索结果' && queue.length > 1 && failStreak < 8) {
        failStreak++;
        toast('「' + (cur ? cur.title : '') + '」已下架，自动跳下一首');
        nextTrack(true);
        return;
      }
      if (cur) toast('「' + cur.title + '」播放失败（链接失效或格式不支持）');
      syncPlayUI(false);
    });""")
rep("""  var objUrls = [];            // 本会话创建的 objectURL，切歌复用）""","""  var objUrls = [];            // 本会话创建的 objectURL，切歌复用）
  var failStreak = 0;          // 搜索结果连续播放失败计数（下架曲自动跳过用）""")

# 6) 绑定调整：scriptTab 的按钮绑定搬到 bindScript；searchTab 绑定在 bindHome 通用路径
rep("""    // 音源
    var sadd = el.querySelector('#muSrcAdd');
    var scode = el.querySelector('#muSrcCode');""","""    bindScriptTab();
  }

  function bindScriptTab() {
    var sadd = el.querySelector('#muSrcAdd');
    var scode = el.querySelector('#muSrcCode');
    if (!sadd) return;""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('restructure ok')
