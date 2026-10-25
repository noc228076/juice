/* =========================================================
   洛雪音源内核 · 搜索联想（平台热词）
   ---------------------------------------------------------
   移植自 lx-music-desktop 各源的 tipSearch：
     酷狗 searchtip.kugou.com/getSearchTip
     酷我 tips.kuwo.cn/t.s
   与本地搜索历史合并展示，行为对齐洛雪的输入联想。
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;

  var kgRequest = null;
  var kwRequest = null;

  /** 酷狗热词 */
  function tipKg(str) {
    if (kgRequest) { kgRequest.cancelHttp(); kgRequest = null; }
    var url = 'https://searchtip.kugou.com/getSearchTip?MusicTipCount=10&keyword=' + encodeURIComponent(str);
    kgRequest = R.httpFetch(url, { headers: { referer: 'https://www.kugou.com/' }, timeout: 4000 });
    return kgRequest.promise.then(function (resp) {
      var body = resp.body;
      var records = body && body.data && body.data[0] && body.data[0].RecordDatas;
      if (!Array.isArray(records)) return [];
      return records.map(function (x) { return x.HintInfo; }).filter(Boolean);
    }).catch(function () { return []; });
  }

  /** 酷我热词 */
  function tipKw(str) {
    if (kwRequest) { kwRequest.cancelHttp(); kwRequest = null; }
    var url = 'https://tips.kuwo.cn/t.s?corp=kuwo&newver=3&p2p=1&notrace=0&c=mbox&w='
      + encodeURIComponent(str) + '&encoding=utf8&rformat=json';
    kwRequest = R.httpFetch(url, { headers: { Referer: 'http://www.kuwo.cn/' }, timeout: 4000 });
    return kwRequest.promise.then(function (resp) {
      var body = resp.body;
      var items = body && body.WORDITEMS;
      if (!Array.isArray(items)) return [];
      return items.map(function (x) { return x.RELWORD; }).filter(Boolean);
    }).catch(function () { return []; });
  }

  /**
   * 获取联想词：两个平台并行，合并去重，最多 10 条。
   * 任一平台失败不影响另一个。
   */
  function tipSearch(str) {
    str = String(str || '').trim();
    if (!str) return Promise.resolve([]);

    return Promise.all([tipKg(str), tipKw(str)]).then(function (results) {
      var seen = {};
      var out = [];
      results.forEach(function (list) {
        list.forEach(function (w) {
          var key = String(w).trim();
          if (!key || seen[key]) return;
          seen[key] = true;
          out.push(key);
        });
      });
      return out.slice(0, 10);
    });
  }

  root.LxTipSearch = { tipSearch: tipSearch };
})(window);
