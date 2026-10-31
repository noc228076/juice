/* =========================================================
   模块 10：今日风向标 (Daily Inspiration & Trends)
   60秒读懂世界 · 全网热榜追踪 · 必应 4K 壁纸 · 豆瓣高分影视
   ========================================================= */

(function () {
  'use strict';

  const CACHE_PREFIX = 'juice_daily_';
  const CACHE_TTL_MS = 25 * 60 * 1000; // 25分钟本地缓存，彻底杜绝并发风控与 429 报错

  // 各平台官方热榜入口：作为兜底链接与降级提示的落点，
  // 严禁复用某一平台的地址，否则「知乎」标签下点进去会落到微博。
  const PLATFORM_META = {
    weibo: { name: '微博热搜', home: 'https://s.weibo.com/top/summary' },
    zhihu: { name: '知乎热榜', home: 'https://www.zhihu.com/hot' },
    bili: { name: 'B站热搜', home: 'https://www.bilibili.com/v/popular/rank/all' },
    douyin: { name: '抖音热点', home: 'https://www.douyin.com/hot' },
    'ai-news': { name: 'AI 前沿快讯', home: 'https://www.jiqizhixin.com/' },
    toutiao: { name: '今日头条', home: 'https://www.toutiao.com/' }
  };

  // 离线兜底文案模板：link 在渲染时按当前平台动态注入，不在此处写死任何平台地址
  const HOT_SEED_TOPICS = [
    { title: '当代年轻人为什么越来越注重精神健康与自我解压', hot_value: 1250000 },
    { title: '国产科技创新突破性进展引全网热议', hot_value: 980000 },
    { title: '秋日第一杯治愈特调饮品喝什么最舒心', hot_value: 760000 },
    { title: '豆瓣高分口碑影视佳作盘点与周末追剧指南', hot_value: 650000 },
    { title: '全球自然风光大片展出：必应今日秋日秘境摄影', hot_value: 520000 },
    { title: '微调作息与自我生活节奏的 5 个实用习惯', hot_value: 410000 }
  ];

  // 本地海报兜底：豆瓣 CDN 需要 Referer，浏览器直链会 403/418，
  // 而图片代理对这批旧海报 ID 已返回 404。影视与心情配片统一用站点图标，
  // 保证任何网络环境下都不出现死图。
  const LOCAL_POSTER = 'assets/icons/icon-192.png';

  // 优质离线/超时兜底数据种子（确保网络异常或接口受限时界面绝不空白）
  const FALLBACK_SEEDS = {
    news60s: {
      date: new Date().toISOString().split('T')[0],
      day_of_week: '星期' + ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()],
      lunar_date: '金秋吉日',
      tip: '保持热爱，奔赴山海，生活总会在不经意处给你意想不到的惊喜与温暖。',
      news: [
        '国内绿色能源发电量再创新高，清洁能源消费占比持续稳步攀升',
        '人工智能大模型多模态能力加速落地，智能终端迎来全新交互体验升级',
        '多地文旅推出秋日慢游专线与沉浸式非遗体验，年轻群体青睐反向旅游',
        '空间站科学实验取得新进展，多项微重力材料与生物实验成果丰硕',
        '健康生活理念普及，低糖无糖茶饮与轻养生食品成为年轻消费新潮流',
        '高校创新创业孵化体系不断健全，青年科技人才自主攻坚成效显著',
        '全球多国签署数字贸易便利化协定，跨境电商物流时效迎来显著提升',
        '深海科考探测器下潜突破万米，深渊生命起源研究迈出关键一步',
        '天文学家观测到高红移星系群新特征，有助于深入探究早期宇宙演化',
        '城市绿道与口袋公园建设持续推进，十分钟家门口生态休闲圈全面成型'
      ]
    },
    hotlist: HOT_SEED_TOPICS,
    bing: {
      title: '蓝与绿的交响曲',
      copyright: '普利特维采湖群国家公园，克罗地亚 (© Jan Wlodarczyk/Alamy)',
      description: '普利特维采湖群国家公园是克罗地亚最著名的国家公园，拥有 16 个由钙华屏障连接的梯级湖泊与飞瀑，湖水在蓝、绿、青之间变幻莫测。',
      cover: 'https://www.bing.com/th?id=OHR.PlitviceAutumn_ZH-CN5646237897_1920x1080.jpg',
      cover_4k: 'https://www.bing.com/th?id=OHR.PlitviceAutumn_ZH-CN5646237897_UHD.jpg',
      date: new Date().toISOString().split('T')[0]
    },
    movies: [
      {
        rank: 1,
        title: '罗斯',
        rating: 8.5,
        card_subtitle: '奥地利 / 德国 / 剧情 / 马库斯·施莱泽 / 桑德拉·惠勒',
        cover_proxy: LOCAL_POSTER,
        url: 'https://movie.douban.com',
        tags: ['高分力荐', '年度佳作']
      },
      {
        rank: 2,
        title: '生化危机：爆发夜',
        rating: 7.3,
        card_subtitle: '德国 / 法国 / 科幻 惊悚 / 扎克·克雷格',
        cover_proxy: LOCAL_POSTER,
        url: 'https://movie.douban.com',
        tags: ['惊险刺激', '视觉盛宴']
      },
      {
        rank: 3,
        title: '野兽之心',
        rating: 7.3,
        card_subtitle: '美国 / 剧情 动作 冒险 / 大卫·阿耶 / 布拉德·皮特',
        cover_proxy: LOCAL_POSTER,
        url: 'https://movie.douban.com',
        tags: ['硬核动作', '热血冒险']
      },
      {
        rank: 4,
        title: '500英里',
        rating: 7.6,
        card_subtitle: '英国 / 爱尔兰 / 剧情 / 摩根·马修斯',
        cover_proxy: LOCAL_POSTER,
        url: 'https://movie.douban.com',
        tags: ['公路温情', '治愈心灵']
      }
    ]
  };

  // 心情配片与特调建议智囊库
  const MOOD_DATA = {
    laugh: {
      label: '想笑解压',
      icon: '😆',
      title: '三傻大闹宝莱坞',
      score: 9.2,
      desc: '笑中带泪的顶级喜剧经典，专治精神内耗与生活焦虑，看完一身轻快。',
      drink: '🍹 推荐特调：【快乐暴击微气泡杨枝甘露】（多加脆啵啵，嚼碎烦恼）',
      cover: 'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p579729551.jpg'
    },
    brain: {
      label: '深度烧脑',
      icon: '🧠',
      title: '星际穿越',
      score: 9.4,
      desc: '诺兰硬核科幻巅峰之作，关于爱、引力与时空的永恒交织，维度跳跃极致震撼。',
      drink: '☕ 推荐特调：【超光速冷萃冰美式】（双倍浓缩加冰，逻辑瞬间苏醒）',
      cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2614988097.jpg'
    },
    heal: {
      label: '治愈温暖',
      icon: '🍵',
      title: '小森林 夏秋篇',
      score: 9.0,
      desc: '把四季晨昏与一蔬一饭过成诗，安静从容，抚平所有浮躁与焦虑。',
      drink: '🥛 推荐特调：【热白桃乌龙厚乳茶】（三分微糖，暖胃抚平一切褶皱）',
      cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2232317770.jpg'
    },
    rush: {
      label: '热血刺激',
      icon: '⚡',
      title: '疯狂的麦克斯4：狂暴之路',
      score: 8.7,
      desc: '全程无尿点的纯粹重金属废土狂飙，引擎轰鸣，肾上腺素瞬间狂飙到顶。',
      drink: '🍋 推荐特调：【手打香水浓柠暴打苏打水】（满杯冰块，激情回血）',
      cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2236181653.jpg'
    },
    work: {
      label: '社畜共鸣',
      icon: '💼',
      title: '白日梦想家',
      score: 8.6,
      desc: '跳出格子间的平庸桎梏，去格陵兰跳海、去冰岛滑板，找回生命原本的旷野。',
      drink: '🧋 推荐特调：【焦糖海盐红茶拿铁五分甜】（生活微苦，焦糖自渡）',
      cover: 'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2893896472.jpg'
    }
  };

  let curSection = 'hot'; // 'hot' | 'movie' | 'wallpaper'
  let curPlatform = 'weibo';
  let curMovieType = 'weekly_movie';
  let isSiteBgActive = false;
  let activeWp = FALLBACK_SEEDS.bing;
  let cachedHotData = [];
  let hotDataSource = 'fallback'; // 'network' | 'cache' | 'stale' | 'fallback'
  let hotLoadToken = 0;           // 竞态令牌：快速切换平台时丢弃过期响应
  let lastNewsMeta = null;        // 农历库晚到时只补日期徽标，不重拉新闻

  // 跨域缓存获取器。
  // source 用于让调用方判断数据是否来自兜底：
  // 'network' 实时接口 | 'cache' 本地缓存 | 'stale' 过期缓存 | 'fallback' 离线种子
  async function fetchWithCacheDetail(url, cacheKey, fallback, timeoutMs = 7500) {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL_MS && parsed.data) {
          return { data: parsed.data, source: 'cache' };
        }
      }
    } catch (_) {}

    // 完全离线时连 fetch 都不发：浏览器会为每个失败请求打印 net::ERR_FAILED，
    // 即使业务层已经降级，控制台仍会一片红。这里直接返回缓存 / 种子。
    if (navigator.onLine === false) {
      try {
        const cached = localStorage.getItem(CACHE_PREFIX + cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.data) return { data: parsed.data, source: 'stale' };
        }
      } catch (_) {}
      return { data: fallback, source: 'fallback' };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        const data = json.data || json;
        try {
          localStorage.setItem(
            CACHE_PREFIX + cacheKey,
            JSON.stringify({ ts: Date.now(), data })
          );
        } catch (_) {}
        return { data, source: 'network' };
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      console.warn('[Daily] Fetch API warning, using cache/fallback:', cacheKey, e);
    }

    try {
      const cached = localStorage.getItem(CACHE_PREFIX + cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data) return { data: parsed.data, source: 'stale' };
      }
    } catch (_) {}

    return { data: fallback, source: 'fallback' };
  }

  async function fetchWithCache(url, cacheKey, fallback) {
    const r = await fetchWithCacheDetail(url, cacheKey, fallback);
    return r.data;
  }

  // HTML 转义：统一委托 window.escHtml（js/esc.js，核心包）
  function esc(str) {
    return window.escHtml(str);
  }

  // ================= 加载态：骨架屏 =================
  // 骨架必须复刻真实条目的 DOM 结构与尺寸，否则数据到达瞬间列表高度会突变，
  // 造成页面跳动 + 内容「闪出」的割裂感。

  const HOT_SKELETON_ROWS = 8;
  const NEWS_SKELETON_ROWS = 10;

  function hotSkeletonHtml() {
    return Array(HOT_SKELETON_ROWS)
      .fill(0)
      .map(
        () => `
        <div class="daily-hot-item is-skeleton" aria-hidden="true">
          <div class="daily-hot-left">
            <span class="daily-hot-rank"></span>
            <span class="daily-skeleton" style="flex:1;height:14px;max-width:320px;"></span>
          </div>
          <div class="daily-hot-right">
            <span class="daily-skeleton" style="width:44px;height:12px;"></span>
            <span style="width:12px;"></span>
          </div>
        </div>`
      )
      .join('');
  }

  function newsSkeletonHtml() {
    return Array(NEWS_SKELETON_ROWS)
      .fill(0)
      .map(
        (_, i) => `
        <div class="daily-60s-item is-skeleton" aria-hidden="true">
          <span class="daily-60s-num"></span>
          <span class="daily-skeleton" style="flex:1;height:13px;max-width:${88 - (i % 4) * 9}%;"></span>
        </div>`
      )
      .join('');
  }

  function showSkeleton(el, html) {
    if (!el) return;
    el.classList.add('daily-loading');
    el.innerHTML = html;
  }

  function fillWithContent(el, html) {
    if (!el) return;
    el.classList.remove('daily-loading');
    el.innerHTML = html;
    // 强制重排后再挂淡入类，确保动画在首次渲染时就能触发
    void el.offsetWidth;
    el.classList.add('daily-fade-in');
  }

  // ================= 1. 每日 60 秒与全网热搜 =================
  function dateKey(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // 60s 新闻缓存按日期开新键，不清理的话 localStorage 每天膨胀几 KB 且永不回收。
  // 写入后只保留最近 5 天。
  function trimNews60sCache(keepDays) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(CACHE_PREFIX + 'news_60s_') === 0) keys.push(k);
      }
      keys.sort();
      keys.slice(0, Math.max(0, keys.length - (keepDays || 5))).forEach(function (k) {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    } catch (_) {}
  }

  // 静态源不带星期与农历，用本地日期推导，避免依赖任何第三方日历接口。
  function newsDateMeta(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return { dateLabel: '', day_of_week: '', lunar_date: '' };
    const dayOfWeek = '星期' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    let lunarDate = '';
    try {
      if (window.Solar) {
        const lunar = window.Solar.fromDate(d).getLunar();
        lunarDate = '农历' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese();
      }
    } catch (_) {}
    return { dateLabel: dateStr, day_of_week: dayOfWeek, lunar_date: lunarDate };
  }

  function isValidNews60s(data) {
    return !!(data && Array.isArray(data.news) && data.news.length);
  }

  function renderNewsDateBadge(data) {
    const dateEl = document.getElementById('dl60sDateBadge');
    if (!dateEl || !data) return;
    const meta = newsDateMeta(data.date || dateKey(new Date()));
    lastNewsMeta = { data, meta };
    const dateText = data.date || meta.dateLabel;
    const parts = [dateText, data.day_of_week || meta.day_of_week, data.lunar_date || meta.lunar_date].filter(Boolean);
    if (parts.length) dateEl.textContent = parts.join(' · ');
  }

  // 主包先渲染新闻，农历 chunk 到达后只更新徽标。
  // 这样 Daily 深链不会被 89 KB Brotli 的 lunar 库卡住首屏。
  function refreshLunar() {
    if (!lastNewsMeta || !window.Solar) return;
    renderNewsDateBadge(lastNewsMeta.data);
  }

  // 60s 官方静态 JSON：https://60s-static.viki.moe/60s/YYYY-MM-DD.json
  // 只保留当天 / 昨天 / 前天三个候选，避免跨天时静态文件尚未生成而空白。
  async function fetch60sStatic() {
    const today = new Date();
    let stale = null;
    for (let offset = 0; offset < 3; offset++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      const key = dateKey(d);
      const cacheKey = 'news_60s_' + key;

      try {
        const cached = localStorage.getItem(CACHE_PREFIX + cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (isValidNews60s(parsed.data)) {
            if (Date.now() - parsed.ts < CACHE_TTL_MS) return { data: parsed.data, source: 'cache' };
            if (!stale) stale = parsed.data;
          }
        }
      } catch (_) {}

      if (navigator.onLine === false) continue;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7500);
        try {
          const res = await fetch('https://60s-static.viki.moe/60s/' + key + '.json', {
            signal: controller.signal
          });
          if (!res.ok) continue;
          const json = await res.json();
          if (!isValidNews60s(json)) continue;
          try {
            localStorage.setItem(
              CACHE_PREFIX + cacheKey,
              JSON.stringify({ ts: Date.now(), data: json })
            );
            trimNews60sCache(5);
          } catch (_) {}
          return { data: json, source: 'network' };
        } finally {
          clearTimeout(timer);
        }
      } catch (_) {}
    }

    if (stale) return { data: stale, source: 'stale' };

    // 三个候选都失败时才读改造前的老 key，最后才用本地种子
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + 'news_60s');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (isValidNews60s(parsed.data)) {
          const oldData = parsed.data;
          // 老缓存来自 60s 动态接口，可能带星期 / 农历；缺失时补本地推导
          if (!oldData.day_of_week || !oldData.lunar_date) {
            const meta = newsDateMeta(oldData.date || dateKey(new Date()));
            oldData.day_of_week = oldData.day_of_week || meta.day_of_week;
            oldData.lunar_date = oldData.lunar_date || meta.lunar_date;
          }
          return { data: oldData, source: 'stale' };
        }
      }
    } catch (_) {}

    return { data: FALLBACK_SEEDS.news60s, source: 'fallback' };
  }

  async function load60sNews() {
    const box = document.getElementById('dl60sList');
    const tipEl = document.getElementById('dl60sTip');
    if (!box) return;

    showSkeleton(box, newsSkeletonHtml());

    const result = await fetch60sStatic();
    const data = result.data;
    renderNewsDateBadge(data);
    if (tipEl && data.tip) {
      tipEl.textContent = `“ ${data.tip} ”`;
    }

    const newsArr = isValidNews60s(data) ? data.news : FALLBACK_SEEDS.news60s.news;
    fillWithContent(
      box,
      newsArr
        .map(
          (item, idx) => `
        <div class="daily-60s-item" style="--i:${idx < 12 ? idx : 11}">
          <span class="daily-60s-num">${idx + 1}</span>
          <span>${esc(String(item))}</span>
        </div>`
        )
        .join('')
    );
  }

  /* ---------------- 热榜多源降级 ----------------
     同一个平台配多个源，按顺序尝试，任一成功即止。
     背景：原来 7 个平台全押在 60s.viki.moe 一个服务上。
     2026-10 实测该域名全部路径返回 Cloudflare 403 且无 ACAO，
     浏览器里会直接报 CORS 错误，因此已全部移除，不再发死请求。

     实测各源可用性（2026-10）：
       api.codelife.cc 微博/知乎/抖音/AI 可用（按 id 区分），需 ACAO 回显
       v2.xxapi.cn     微博/B站/抖音 可用（ACAO: *）
     B站与抖音的官方接口虽然能拿到数据，但不返回 CORS 头，
     浏览器里必然失败，所以只能用这些聚合源。
     头条官方接口（hot-event/hot-board）同样不带 CORS 头，但服务端可拉，
     已由自家 /api/toutiao 代理；小红书无公开接口（需签名），已移除该平台。

     注意：codelife 对未知 id 会返回 HTTP 200 + 空 data，
     所以不能只看 res.ok，必须校验列表非空。

     normalize 把各家的字段差异拉平为 { title, hot_value, link }：
       codelife:  { title, hotValue(如 "108万"), link }
       xxapi:     { title, hot(如 "108万"), url } / B站为纯字符串数组
     ------------------------------------------------ */
  // 热榜请求超时：比通用接口宽松，给慢源留出时间，避免误判为不可用
  const HOT_FETCH_TIMEOUT_MS = 12000;

  const HOT_SOURCES = {
    weibo: [
      { url: 'https://api.codelife.cc/api/top/list?lang=cn&id=KqndgxeLl9', kind: 'codelife' },
      { url: 'https://v2.xxapi.cn/api/weibohot', kind: 'xxapi' }
    ],
    zhihu: [
      { url: 'https://api.codelife.cc/api/top/list?lang=cn&id=mproPpoq6O', kind: 'codelife' }
    ],
    bili: [
      { url: 'https://v2.xxapi.cn/api/bilibilihot', kind: 'xxapi' }
    ],
    douyin: [
      { url: 'https://api.codelife.cc/api/top/list?lang=cn&id=DpQvNABoNE', kind: 'codelife' },
      { url: 'https://v2.xxapi.cn/api/douyinhot', kind: 'xxapi' }
    ],
    'ai-news': [
      // 36kr 科技/AI 快讯（codelife 的科技频道），字段与普通热榜一致
      { url: 'https://api.codelife.cc/api/top/list?lang=cn&id=Q1Vd5Ko85R', kind: 'codelife' }
    ],
    // 头条官方接口不带 CORS 头，浏览器直连必失败，走自家 /api/toutiao 代理；
    // 代理已把字段拉平成 { title, hot_value, link }，用 'any' 解析即可
    toutiao: [
      { url: '/api/toutiao', kind: 'any' }
    ]
  };

  // 把 "108万" / "1.2亿" / "947.5w" / 数字 统一成数值，便于按热度排序与展示
  function parseHotValue(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    const m = s.match(/^([\d.]+)\s*(万|亿|w|W)?/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    if (!isFinite(n)) return 0;
    if (m[2] === '亿') return Math.round(n * 1e8);
    if (m[2] === '万' || m[2] === 'w' || m[2] === 'W') return Math.round(n * 1e4);
    return Math.round(n);
  }

  function normalizeHotItem(item, kind) {
    // xxapi 的 B站热榜只给字符串数组：["韩立", "垃圾焚烧…", ...]
    if (typeof item === 'string') {
      const t = item.trim();
      return t ? { title: t, hot_value: 0, link: '' } : null;
    }
    if (!item || typeof item !== 'object') return null;
    const title = item.title || item.name || item.word || '';
    if (!title) return null;
    const link = item.link || item.url || '';
    let hot = 0;
    if (kind === 'codelife') hot = parseHotValue(item.hotValue || item.hot_value);
    else if (kind === 'xxapi') hot = parseHotValue(item.hot || item.hot_value || item.heat);
    else if (kind === 'any') hot = parseHotValue(
      item.hot_value || item.hotValue || item.hot_value_desc || item.hot || item.score || item.heat
    );
    else hot = parseHotValue(item.hot_value || item.heat);
    return { title, hot_value: hot, link };
  }

  // 各家列表挂载位置不一致，统一取出条目数组
  function extractHotArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'object') return [];
    if (Array.isArray(raw.news)) return raw.news; // ai-news: { date, news: [...] }
    if (Array.isArray(raw.list)) return raw.list;
    if (Array.isArray(raw.data)) return raw.data;
    return [];
  }

  // 依次尝试该平台的源；全部失败则回落到缓存/离线种子
  // 注意：某个源的「过期缓存」不能提前返回，否则会挡住后面仍然可用的备用源。
  // 所以先把过期缓存记下来，等所有源都试完再用。
  async function fetchHotWithFallback(platform) {
    const sources = HOT_SOURCES[platform] || HOT_SOURCES.weibo;
    let staleHit = null;

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const key = 'hot_' + platform + '_s' + i;
      // 热榜接口普遍 2~5s（AI 快讯最慢，实测 4~5s），单独放宽超时，
      // 否则会在数据到达前就 abort，白白回落到离线示例
      const { data: raw, source } = await fetchWithCacheDetail(src.url, key, null, HOT_FETCH_TIMEOUT_MS);
      if (source === 'fallback') continue; // 该源不可用，试下一个
      if (raw && typeof raw === 'object' && raw.code != null && Number(raw.code) !== 200) continue;

      const list = extractHotArray(raw)
        .map(it => normalizeHotItem(it, src.kind))
        .filter(Boolean);
      if (!list.length) continue;

      // 全部条目都有热度才重排；部分缺失时保留接口给出的原始名次
      if (list.every(x => x.hot_value > 0)) list.sort((a, b) => b.hot_value - a.hot_value);
      if (source === 'stale') {
        if (!staleHit) staleHit = list;
        continue; // 继续找还活着的源
      }
      return { data: list, source: source }; // 'cache' | 'network'
    }

    if (staleHit) return { data: staleHit, source: 'stale' };

    // 连过期缓存都没有：翻改造前的老 key，再不行用离线种子
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + 'hot_' + platform);
      if (cached) {
        const parsed = JSON.parse(cached);
        const old = extractHotArray(parsed.data)
          .map(it => normalizeHotItem(it, 'any'))
          .filter(Boolean);
        if (old.length) return { data: old, source: 'stale' };
      }
    } catch (_) {}

    return { data: HOT_SEED_TOPICS, source: 'fallback' };
  }

  async function loadHotList(platform = 'weibo') {
    curPlatform = platform;
    const listEl = document.getElementById('dlHotList');
    if (!listEl) return;

    const token = ++hotLoadToken;
    const meta = PLATFORM_META[platform] || PLATFORM_META.weibo;
    showSkeleton(listEl, hotSkeletonHtml());

    const { data: raw, source } = await fetchHotWithFallback(platform);
    // 响应回来时用户可能已切到别的平台，丢弃过期结果，避免「切回时显示别的平台数据」
    if (token !== hotLoadToken) return;

    const list = Array.isArray(raw) ? raw : (raw && raw.list) || HOT_SEED_TOPICS;
    cachedHotData = list;
    hotDataSource = source;
    renderHotItems(list, meta, source, true, platform);
  }

  function renderHotItems(list, meta = PLATFORM_META[curPlatform] || PLATFORM_META.weibo, source = hotDataSource, showNotice = true, platform = curPlatform) {
    const listEl = document.getElementById('dlHotList');
    if (!listEl) return;

    if (!list || !list.length) {
      listEl.classList.remove('daily-loading', 'daily-fade-in');
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--tx-dim);">暂无当前热搜数据</div>';
      return;
    }

    // 兜底文案没有真实条目链接，一律指向当前平台的官方热榜页，
    // 绝不能出现「知乎标签点进去是微博热搜」这类错位
    const isFallback = source === 'fallback';
    const isUnavailable = source === 'fallback' && !(HOT_SOURCES[platform] || []).length;
    const noticeText = isUnavailable
      ? `${meta.name}暂无稳定的跨域实时源，当前为离线精选内容，点条目将前往官方页面`
      : `${meta.name}数据源暂不可用，当前为离线示例，点条目将前往官方热榜页`;
    const notice = !showNotice
      ? ''
      : isFallback
        ? `
      <div class="daily-hot-notice">
        <span class="daily-hot-notice-txt">⚠️ ${esc(noticeText)}</span>
        <button type="button" class="daily-hot-retry" data-retry-hot>重试</button>
      </div>`
        : source === 'stale'
          ? `
      <div class="daily-hot-notice">
        <span class="daily-hot-notice-txt">🕐 接口暂不可用，展示的是上次缓存内容</span>
        <button type="button" class="daily-hot-retry" data-retry-hot>重试</button>
      </div>`
          : '';

    fillWithContent(
      listEl,
      notice +
        list
          .slice(0, 30)
          .map((item, idx) => {
            const title = item.title || item.name || item.word || '热门事件';
            const hotVal = item.hot_value
              ? item.hot_value > 10000
                ? (item.hot_value / 10000).toFixed(1) + '万'
                : item.hot_value
              : item.heat || '';
            // 兜底种子与无链接条目统一落到当前平台官方页
            const link = (!isFallback && (item.link || item.url)) || meta.home;
            const t = esc(title);
            return `
          <a class="daily-hot-item" style="--i:${idx < 14 ? idx : 13}" href="${window.escUrl(link)}" target="_blank" rel="noopener noreferrer">
            <div class="daily-hot-left">
              <span class="daily-hot-rank">${idx + 1}</span>
              <span class="daily-hot-title" title="${t}">${t}</span>
            </div>
            <div class="daily-hot-right">
              ${hotVal ? `<span class="daily-hot-val">🔥 ${esc(hotVal)}</span>` : ''}
              <span class="daily-hot-arrow">↗</span>
            </div>
          </a>
        `;
          })
          .join('')
    );

    const retry = listEl.querySelector('[data-retry-hot]');
    if (retry) {
      retry.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        loadHotList(curPlatform);
      };
    }
  }

  // ================= 2. 影视风向标 & 心情选片 =================
  // 豆瓣影视接口不返回 ACAO，浏览器直连必然 CORS 失败；
  // 60s 的豆瓣代理已下线。这里改为本地片单，不制造无效请求。
  const MOVIE_SEEDS = {
    weekly_movie: FALLBACK_SEEDS.movies,
    tv_chinese: [
      { title: '漫长的季节', rating: 9.4, card_subtitle: '中国大陆 / 剧情 悬疑 / 辛爽 / 范伟 秦昊', tags: ['年度口碑', '悬疑佳作'] },
      { title: '我的阿勒泰', rating: 8.9, card_subtitle: '中国大陆 / 剧情 / 滕丛丛 / 马伊琍 周依然', tags: ['治愈系', '高分短剧'] },
      { title: '繁花', rating: 8.7, card_subtitle: '中国大陆 / 剧情 / 王家卫 / 胡歌 马伊琍', tags: ['年代质感', '沪上风情'] },
      { title: '三体', rating: 8.7, card_subtitle: '中国大陆 / 科幻 悬疑 / 杨磊 / 张鲁一 于和伟', tags: ['硬核科幻', '原著改编'] }
    ],
    tv_global: [
      { title: '切尔诺贝利', rating: 9.6, card_subtitle: '美国 / 剧情 历史 / 约翰·伦克 / 杰瑞德·哈里斯', tags: ['封神之作', '历史灾难'] },
      { title: '绝命毒师', rating: 9.6, card_subtitle: '美国 / 剧情 犯罪 / 文斯·吉利根 / 布莱恩·科兰斯顿', tags: ['犯罪经典', '全程高能'] },
      { title: '老友记', rating: 9.8, card_subtitle: '美国 / 喜剧 爱情 / 大卫·克莱恩 / 詹妮弗·安妮斯顿', tags: ['下饭神剧', '温暖治愈'] },
      { title: '黑镜', rating: 9.0, card_subtitle: '英国 / 科幻 剧情 / 查理·布鲁克 / 丹尼尔·卡卢亚', tags: ['科技寓言', '细思极恐'] }
    ]
  };

  /* 豆瓣图床按 Referer 放行，浏览器 <img> 直连会 418。
     统一走自家 /api/douban 代理（服务端补 Referer）。 */
  function posterSrc(url) {
    if (!url) return LOCAL_POSTER;
    if (url.indexOf('/api/douban') === 0) return url;
    return '/api/douban?img=' + encodeURIComponent(url);
  }

  /* 前端榜单 key → 代理支持的豆瓣集合 */
  const MOVIE_COLLECTION = {
    weekly_movie: 'movie_weekly_best',
    tv_chinese: 'tv_chinese_best_weekly',
    tv_global: 'tv_global_best_weekly'
  };

  function normalizeMovieSeed(m, idx) {
    return {
      rank: idx + 1,
      title: m.title,
      rating: m.rating,
      card_subtitle: m.card_subtitle || m.description || '',
      cover_proxy: m.pic ? posterSrc(m.pic) : (m.cover_proxy || m.cover || LOCAL_POSTER),
      url: m.url || 'https://movie.douban.com',
      tags: Array.isArray(m.tags) ? m.tags : []
    };
  }

  let movieLoadToken = 0;   // 竞态令牌：快速连点分类时旧响应后到不得覆盖
  async function loadMovieList(type = 'weekly_movie') {
    curMovieType = type;
    const my = ++movieLoadToken;
    const grid = document.getElementById('dlMovieGrid');
    if (!grid) return;

    grid.innerHTML = Array(4)
      .fill(0)
      .map(() => '<div class="daily-skeleton" style="height:140px;border-radius:16px;"></div>')
      .join('');

    /* 优先拉豆瓣实时榜单（经 /api/douban 代理，绕开 CORS 与 Referer 限制）；
       接口不可用时回退本地种子，保证永不空白。 */
    let list = null;
    const collection = MOVIE_COLLECTION[type] || MOVIE_COLLECTION.weekly_movie;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7500);
      const resp = await fetch('/api/douban?list=' + encodeURIComponent(collection), {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      }).finally(() => clearTimeout(timer));
      const data = await resp.json();
      if (resp.ok && data && data.ok && Array.isArray(data.items) && data.items.length) {
        list = data.items.slice(0, 10).map(normalizeMovieSeed);
      }
    } catch (e) { /* 走下面的种子兜底 */ }

    if (my !== movieLoadToken) return;   // 用户已切到别的分类，丢弃旧结果
    if (!list || !list.length) {
      const seeds = MOVIE_SEEDS[type] || MOVIE_SEEDS.weekly_movie;
      list = seeds.map(normalizeMovieSeed);
    }

    fillWithContent(
      grid,
      list
        .map((m, idx) => {
          const poster = esc(m.cover_proxy || m.cover || LOCAL_POSTER);
          const rating = m.rating ? `★ ${m.rating}` : '暂无评分';
          const tags = Array.isArray(m.tags) ? m.tags : [];
          return `
          <a class="daily-movie-card" style="--i:${idx < 8 ? idx : 7}" href="${window.escUrl(m.url || '#')}" target="_blank" rel="noopener noreferrer">
            <img class="daily-mcard-poster" src="${poster}" alt="${esc(m.title)}" decoding="async" onerror="this.onerror=null;this.src='${LOCAL_POSTER}'" />
            <div class="daily-mcard-info">
              <div>
                <div class="daily-mcard-head">
                  <span class="daily-mcard-title">#${idx + 1} ${esc(m.title)}</span>
                  <span class="daily-mcard-score">${rating}</span>
                </div>
                ${tags.length ? `<div class="daily-mcard-tags">${tags.map(t => `<span class="daily-mcard-tag">${esc(t)}</span>`).join('')}</div>` : ''}
              </div>
              <div class="daily-mcard-sub">${esc(m.card_subtitle || m.description || '高口碑精品之作')}</div>
            </div>
          </a>
        `;
        })
        .join('')
    );
  }

  function pickMoodMovie(moodKey) {
    const data = MOOD_DATA[moodKey] || MOOD_DATA.laugh;
    const resEl = document.getElementById('dlMoodResult');
    if (!resEl) return;

    resEl.innerHTML = `
      <img class="daily-mood-res-img" src="${esc(posterSrc(data.cover))}" alt="${esc(data.title)}" loading="lazy" onerror="this.src='${LOCAL_POSTER}'" />
      <div class="daily-mood-res-info">
        <div class="daily-mood-res-title">${esc(data.title)}</div>
        <div class="daily-mood-res-score">★ ${data.score} 豆瓣高分经典</div>
        <div class="daily-mood-res-drink">${esc(data.drink)}</div>
        <div class="daily-mood-res-desc">${esc(data.desc)}</div>
      </div>
    `;

    document.querySelectorAll('.daily-mood-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === moodKey);
    });

    if (window.SFX && window.SFX.tap) window.SFX.tap();
  }

  /* ================== 壁纸来源 ==================
     bing   必应每日（biturl API，近 8 日画廊）
     random 随机灵感（picsum.photos，免 key，seed 可复现）
     custom 我的壁纸（用户粘贴 https 图片直链，仅存本机，最多 8 张） */
  const WP_SOURCE_KEY = 'juice_daily_wp_source';
  const WP_CUSTOM_KEY = 'juice_daily_wp_custom';
  let wpSource = 'bing';
  let customWps = [];
  let randomItems = [];

  function normalizeBingWallpaper(raw) {
    if (!raw || !raw.url) return null;
    const copyright = String(raw.copyright || '').trim();
    const title = copyright.split('(')[0].trim() || '今日必应壁纸';
    return {
      source: 'bing',
      title: title,
      copyright: copyright,
      description: copyright,
      cover: raw.url,
      cover_4k: raw.url.replace('_1920x1080.jpg', '_UHD.jpg'),
      date: raw.end_date || raw.start_date || dateKey(new Date())
    };
  }

  /* https 图片直链白名单校验：设为全站背景的 URL 会拼进 CSS url("...")，
     必须是 https 直链且不含引号/括号/空白（CSS 字符串逃逸字符）。
     必应直链天然满足；随机源与用户自定义链接靠它放行。 */
  function isSafeImgUrl(u) {
    u = String(u || '');
    return /^https:\/\/\S+$/i.test(u) && !/["')\s]/.test(u);
  }

  /* 图片可加载性预检（8s 超时）：坏链接不进画廊、不上全站背景 */
  function preloadImage(url) {
    return new Promise((resolve) => {
      const im = new Image();
      let done = false;
      const finish = (ok) => { if (!done) { done = true; clearTimeout(timer); resolve(ok); } };
      const timer = setTimeout(() => finish(false), 8000);
      im.onload = () => finish(im.naturalWidth > 0);
      im.onerror = () => finish(false);
      im.referrerPolicy = 'no-referrer';
      im.src = url;
    });
  }

  /* 必应图床双域名兜底：www.bing.com 偶发被 DNS/代理拦时切 cn.bing.com */
  function bingFallbackSrc(src) {
    if (/^https:\/\/www\.bing\.com\//.test(src)) return src.replace('www.bing.com', 'cn.bing.com');
    if (/^https:\/\/cn\.bing\.com\//.test(src)) return src.replace('cn.bing.com', 'www.bing.com');
    return null;
  }

  function attachBingFallback(img) {
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      var alt = bingFallbackSrc(img.getAttribute('src') || '');
      if (alt) {
        img.setAttribute('src', alt);
      }
    });
  }

  /* 画廊渲染统一管线：三个来源共用，active 态按 cover URL 对齐 */
  function renderGallery(items, opts) {
    const grid = document.getElementById('dlWpGalleryGrid');
    if (!grid) return;
    opts = opts || {};
    if (!items.length) {
      grid.innerHTML = '<p class="daily-wp-custom-tip" style="grid-column:1/-1;padding:20px 0;">' +
        '还没有保存的壁纸——粘贴一张 https 图片直链到上方输入框添加。</p>';
      return;
    }
    grid.innerHTML = items.map((item, i) => `
      <div class="daily-wp-thumb-card ${activeWp && activeWp.cover === item.cover ? 'active' : ''}" data-idx="${i}">
        <img class="daily-wp-thumb-img" src="${esc(item.cover)}" alt="${esc(item.copyright || item.title)}" loading="lazy" ${item.source === 'custom' ? 'referrerpolicy="no-referrer"' : ''} />
        <div class="daily-wp-thumb-meta">
          <span class="daily-wp-thumb-date">${esc(item.date || item.sourceLabel || '')}</span>
          <div class="daily-wp-thumb-title" title="${esc(item.copyright)}">${esc(item.title)}</div>
        </div>
        ${item.source === 'custom' ? '<button class="daily-wp-thumb-del" data-del-idx="' + i + '" type="button" title="删除这张" aria-label="删除这张">✕</button>' : ''}
      </div>
    `).join('');
    grid.querySelectorAll('.daily-wp-thumb-img').forEach(attachBingFallback);
    grid.querySelectorAll('.daily-wp-thumb-card').forEach((card) => {
      card.onclick = (ev) => {
        if (ev.target.closest('[data-del-idx]')) return;   // 删除按钮自己处理
        const item = items[+card.dataset.idx];
        if (!item) return;
        grid.querySelectorAll('.daily-wp-thumb-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        selectWallpaper(item);
      };
    });
    grid.querySelectorAll('[data-del-idx]').forEach((btn) => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        const i = +btn.getAttribute('data-del-idx');
        const removed = customWps.splice(i, 1)[0];
        saveCustomWps();
        if (activeWp && removed && activeWp.cover === removed.url) {
          activeWp = customWps[0] || FALLBACK_SEEDS.bing;
          renderMainWallpaper(activeWp);
        }
        renderGallery(customWps.map(customItemOf), { source: 'custom' });
        showDailyToast('🗑️ 已删除');
        if (window.SFX && window.SFX.tap) window.SFX.tap();
      };
    });
  }

  /* 选中一张（任意来源）：换大图；全站背景开着就同步换背景 */
  function selectWallpaper(item) {
    activeWp = item;
    renderMainWallpaper(item);
    if (isSiteBgActive) {
      const url = item.cover_4k || item.cover;
      preloadImage(url).then((ok) => {
        if (!ok) { showDailyToast('⚠️ 这张图加载失败，全站背景未切换'); return; }
        applySiteBackground(url, item.title);
        showDailyToast(`✨ 全站背景已切换：${item.title}`);
      });
    }
    if (window.SFX && window.SFX.tap) window.SFX.tap();
  }

  /* ---------------- 随机灵感（picsum.photos，免 key） ---------------- */
  function makeRandomSeeds(n) {
    const out = [];
    while (out.length < n) {
      out.push('juice-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
    }
    return out;
  }

  function buildRandomItems() {
    return makeRandomSeeds(9).map((seed, i) => ({
      source: 'random',
      title: `灵感 ${String(i + 1).padStart(2, '0')}`,
      copyright: 'Picsum Photos（Unsplash 摄影师作品聚合）',
      description: '随机灵感图库 · 点「换一批」再来九张',
      cover: `https://picsum.photos/seed/${seed}/1920/1080`,
      cover_4k: `https://picsum.photos/seed/${seed}/3840/2160`,
      date: '',
      sourceLabel: '灵感图库'
    }));
  }

  function loadRandomWallpapers() {
    randomItems = buildRandomItems();
    activeWp = randomItems[0];
    renderMainWallpaper(activeWp);
    renderGallery(randomItems, { source: 'random' });
  }

  /* ---------------- 我的壁纸（自定义直链，仅存本机） ---------------- */
  function loadCustomWps() {
    try {
      const raw = JSON.parse(localStorage.getItem(WP_CUSTOM_KEY) || '[]');
      customWps = Array.isArray(raw) ? raw.filter((x) => x && isSafeImgUrl(x.url)).slice(0, 8) : [];
    } catch (_) {
      customWps = [];
    }
  }

  function saveCustomWps() {
    try { localStorage.setItem(WP_CUSTOM_KEY, JSON.stringify(customWps.slice(0, 8))); } catch (_) {}
  }

  function customItemOf(c) {
    return {
      source: 'custom',
      title: c.title || '我的壁纸',
      copyright: '自定义壁纸 · ' + (c.url || '').replace(/^https:\/\//, '').slice(0, 40),
      description: '我的壁纸',
      cover: c.url,
      cover_4k: c.url,
      date: '',
      sourceLabel: '我的壁纸'
    };
  }

  function renderCustomGallery() {
    const items = customWps.map(customItemOf);
    if (items.length) activeWp = items[0];
    renderMainWallpaper(activeWp);
    renderGallery(items, { source: 'custom' });
  }

  function addCustomWallpaper() {
    const input = document.getElementById('dlWpCustomUrl');
    const addBtn = document.getElementById('dlWpCustomAdd');
    if (!input || !addBtn) return;
    const url = String(input.value || '').trim();
    if (!isSafeImgUrl(url)) {
      showDailyToast('⚠️ 请粘贴 https:// 开头的图片直链（不含空格和引号）');
      return;
    }
    if (customWps.some((c) => c.url === url)) {
      showDailyToast('这张已经加过了');
      return;
    }
    if (customWps.length >= 8) {
      showDailyToast('最多存 8 张，先删一张再加');
      return;
    }
    addBtn.disabled = true;
    showDailyToast('⏳ 正在校验图片…');
    preloadImage(url).then((ok) => {
      addBtn.disabled = false;
      if (!ok) { showDailyToast('❌ 这张图加载失败，检查链接或换个图源'); return; }
      customWps.unshift({ url: url, title: '我的壁纸 · ' + new Date().toLocaleDateString('zh-CN') });
      saveCustomWps();
      input.value = '';
      renderCustomGallery();
      renderWpSourceBar();
      showDailyToast('✅ 已添加到「我的壁纸」');
      if (window.SFX && window.SFX.ok) window.SFX.ok();
    });
  }

  /* ---------------- 来源切换条 ---------------- */
  const WP_SOURCE_META = {
    bing: { icon: '🗓️', title: '近期必应壁纸时间画廊 (点击可预览并下载)', badge: '🌟 今日必应 4K 甄选摄影' },
    random: { icon: '🎲', title: '随机灵感图库（点击预览，「换一批」再来九张）', badge: '🎲 灵感图库 · 每次都不一样' },
    custom: { icon: '🖼️', title: '我的壁纸（点击预览，可设为全站背景）', badge: '🖼️ 我的壁纸' }
  };

  function renderWpSourceBar() {
    const bar = document.getElementById('dlWpSourceBar');
    if (!bar) return;
    bar.querySelectorAll('[data-wp-source]').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.wpSource === wpSource);
    });
    const meta = WP_SOURCE_META[wpSource] || WP_SOURCE_META.bing;
    const icon = document.getElementById('dlWpGalleryIcon');
    const title = document.getElementById('dlWpGalleryTitle');
    const badge = document.getElementById('dlWpMainBadge');
    const refresh = document.getElementById('dlWpRefreshRandom');
    const customBox = document.getElementById('dlWpCustomBox');
    if (icon) icon.textContent = meta.icon;
    if (title) title.textContent = meta.title;
    if (badge) badge.textContent = meta.badge;
    if (refresh) refresh.hidden = wpSource !== 'random';
    if (customBox) customBox.hidden = wpSource !== 'custom';
  }

  function switchWpSource(v) {
    if (v === wpSource) return;
    wpSource = v;
    try { localStorage.setItem(WP_SOURCE_KEY, wpSource); } catch (_) {}
    renderWpSourceBar();
    if (wpSource === 'bing') loadBingWallpaper();
    else if (wpSource === 'random') loadRandomWallpapers();
    else renderCustomGallery();
    if (window.SFX && window.SFX.tap) window.SFX.tap();
  }

  async function loadBingWallpaper() {
    const raw = await fetchWithCache(
      'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN',
      'bing_today',
      null
    );

    activeWp = normalizeBingWallpaper(raw) || FALLBACK_SEEDS.bing;
    renderMainWallpaper(activeWp);
    loadRecentWallpapers();
  }

  function renderMainWallpaper(wp) {
    const imgEl = document.getElementById('dlWpMainImg');
    const titleEl = document.getElementById('dlWpMainTitle');
    const descEl = document.getElementById('dlWpMainDesc');
    const metaEl = document.getElementById('dlWpMainMeta');
    const dlBtn = document.getElementById('dlWpBtnDownload');

    // 图片本身加载完成前不做处理，这里只负责写入文案，避免「默认值 → 真实值」的闪跳
    if (titleEl) titleEl.textContent = wp.title || '今日壁纸大片';
    if (descEl) descEl.textContent = wp.description || wp.main_text || wp.copyright || '';
    if (metaEl) metaEl.textContent = wp.copyright ? `📷 摄影版权：${wp.copyright}` : '';
    // 下载链接走 escUrl：外部 API 返回的 URL 不直接进 href sink
    if (dlBtn) dlBtn.href = window.escUrl(wp.cover_4k || wp.cover || '#');

    if (!imgEl) return;
    const src = wp.cover_4k || wp.cover;
    if (!src) return;
    if (imgEl.src === src && imgEl.naturalWidth) return;

    // 换图时先挂占位类，图片解码完成后淡入，消除白屏闪烁
    imgEl.classList.add('is-loading');
    attachBingFallback(imgEl);
    const onReady = () => {
      imgEl.classList.remove('is-loading');
      imgEl.classList.add('is-ready');
      imgEl.removeEventListener('load', onReady);
      imgEl.removeEventListener('error', onErr);
    };
    const onErr = () => {
      imgEl.classList.remove('is-loading');
      imgEl.removeEventListener('load', onReady);
      imgEl.removeEventListener('error', onErr);
    };
    imgEl.addEventListener('load', onReady);
    imgEl.addEventListener('error', onErr);
    // 离线时图片必然加载失败，浏览器会打印 net::ERR_INTERNET_DISCONNECTED。
    // 保留已有画面，不发起注定失败的请求。
    if (navigator.onLine === false) return;
    imgEl.src = src;
  }

  async function loadRecentWallpapers() {
    const galleryGrid = document.getElementById('dlWpGalleryGrid');
    if (!galleryGrid) return;

    // 并发拉取近 8 日壁纸（开源项目 bing.biturl.top index=0~7）
    const promises = [0, 1, 2, 3, 4, 5, 6, 7].map((idx) =>
      fetchWithCache(
        `https://bing.biturl.top/?resolution=1920&format=json&index=${idx}&mkt=zh-CN`,
        `bing_hist_${idx}`,
        null
      )
    );

    const results = await Promise.all(promises);
    const items = results.map(normalizeBingWallpaper).filter(Boolean);
    renderGallery(items, { source: 'bing' });
  }

  // 设为全站沉浸背景
  function toggleSiteBackground() {
    if (isSiteBgActive) {
      isSiteBgActive = false;
      clearSiteBackground();
      updateSetBgBtnState();
      showDailyToast('🖥️ 已恢复默认背景');
      syncWallpaperDismissBtn();
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      return;
    }
    const wpUrl = String((activeWp && (activeWp.cover_4k || activeWp.cover)) || FALLBACK_SEEDS.bing.cover);
    const title = activeWp ? activeWp.title : '今日必应壁纸';
    if (!isSafeImgUrl(wpUrl)) {
      showDailyToast('⚠️ 仅支持 https 图片直链');
      return;
    }
    showDailyToast('⏳ 正在校验图片…');
    preloadImage(wpUrl).then((ok) => {
      if (!ok) {
        showDailyToast('❌ 图片加载失败，未能设为全站背景');
        return;
      }
      isSiteBgActive = true;
      if (!applySiteBackground(wpUrl, title)) {
        isSiteBgActive = false;
        updateSetBgBtnState();
        showDailyToast('⚠️ 这个链接不能用作背景');
        return;
      }
      updateSetBgBtnState();
      showDailyToast('✨ 已设为全站沉浸背景，已贯通所有模块');
      syncWallpaperDismissBtn();
      if (window.SFX && window.SFX.ok) window.SFX.ok();
    });
  }

  function updateSetBgBtnState() {
    const btn = document.getElementById('dlWpBtnSetBg');
    if (!btn) return;
    if (isSiteBgActive) {
      btn.classList.add('active');
      btn.innerHTML = '<span>✨</span><span>已设为全站背景 (点击取消)</span>';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🖥️</span><span>设为全站沉浸背景</span>';
    }
  }

  function applySiteBackground(url, title) {
    /* 校验放宽为「https 图片直链」白名单：必应直链、随机灵感、用户自定义
       都能上全站背景；防线仍然保留——
       1) 只接受 https（禁 javascript:/data:）；
       2) 拒绝引号/括号/空白（CSS url("...") 字符串逃逸字符）；
       3) 调用方先用 preloadImage 预检，坏链不落 localStorage。 */
    url = String(url || '');
    if (!isSafeImgUrl(url)) return false;
    document.documentElement.style.setProperty('--daily-bg-url', `url("${url}")`);
    document.body.style.setProperty('--daily-bg-url', `url("${url}")`);
    document.documentElement.classList.add('has-daily-ambient-bg');
    document.body.classList.add('has-daily-ambient-bg');
    const backdrop = document.getElementById('appAmbientBackdrop');
    if (backdrop) backdrop.style.backgroundImage = `url("${url}")`;
    try {
      localStorage.setItem('daily_site_bg_active', 'true');
      localStorage.setItem('daily_site_bg_url', url);
      if (title) localStorage.setItem('daily_site_bg_title', title);
    } catch (_) {}
    return true;
  }

  function clearSiteBackground() {
    document.documentElement.classList.remove('has-daily-ambient-bg');
    document.body.classList.remove('has-daily-ambient-bg');
    try {
      localStorage.removeItem('daily_site_bg_active');
    } catch (_) {}
  }

  function showDailyToast(msg) {
    let t = document.getElementById('dailyToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dailyToast';
      t.className = 'daily-toast-msg';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // 生成锁屏日签海报
  function generateLockscreenPoster() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeWp.cover || FALLBACK_SEEDS.bing.cover;

    img.onload = () => {
      // 绘制背景图（Cover 裁剪模式）
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (canvas.width - img.width * ratio) / 2;
      const centerShiftY = (canvas.height - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

      // 上下沉浸暗角渐变
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)');
      grad.addColorStop(0.3, 'rgba(0,0,0,0.1)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 顶部时间与星期
      const now = new Date();
      const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}`;

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 120px -apple-system, sans-serif';
      ctx.fillText(timeStr, canvas.width / 2, 320);

      ctx.font = '500 34px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(dateStr, canvas.width / 2, 390);

      // 底部标题与摄影版权
      ctx.textAlign = 'left';
      ctx.font = 'bold 52px -apple-system, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(activeWp.title || '今日壁纸', 80, 1660);

      ctx.font = '400 28px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      const desc = activeWp.description ? activeWp.description.substring(0, 48) + '...' : '';
      ctx.fillText(desc, 80, 1720);

      ctx.font = '400 22px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('饮料人格研究所 · 今日风向标灵感生成', 80, 1780);

      // 导出下载
      const a = document.createElement('a');
      a.download = `每日锁屏壁纸_${now.toISOString().split('T')[0]}.jpg`;
      a.href = canvas.toDataURL('image/jpeg', 0.92);
      a.click();
    };

    img.onerror = () => {
      alert('抱歉，壁纸跨域限制暂无法合成海报，已为您直接打开 4K 原图下载！');
      const u = activeWp.cover_4k || activeWp.cover || '';
      /* window.open 同样要拦协议：javascript: 会在继承 origin 的空白页里执行 */
      if (/^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener');
    };
  }

  // 绑定交互事件
  function bindEvents() {
    // 三合一主 Tab 切换
    document.querySelectorAll('.daily-nav-btn').forEach(btn => {
      btn.onclick = () => {
        const sec = btn.dataset.sec;
        if (sec === curSection) return;
        curSection = sec;

        document.querySelectorAll('.daily-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.daily-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById('dlSec-' + sec);
        if (target) target.classList.add('active');

        if (window.SFX && window.SFX.tap) window.SFX.tap();
      };
    });

    // 平台切换胶囊
    document.querySelectorAll('.daily-plat-pill').forEach(pill => {
      pill.onclick = () => {
        const plat = pill.dataset.plat;
        if (plat === curPlatform) return;   // 已在该平台，重复点不重拉
        document.querySelectorAll('.daily-plat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        loadHotList(plat);
        if (window.SFX && window.SFX.tap) window.SFX.tap();
      };
    });

    // 影视分类切换
    document.querySelectorAll('.daily-mtype-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.type;
        document.querySelectorAll('.daily-mtype-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadMovieList(type);
        if (window.SFX && window.SFX.tap) window.SFX.tap();
      };
    });

    // 心情选片按钮
    document.querySelectorAll('.daily-mood-btn').forEach(btn => {
      btn.onclick = () => pickMoodMovie(btn.dataset.mood);
    });

    // 搜索过滤热搜
    const searchInput = document.getElementById('dlSearchInput');
    if (searchInput) {
      searchInput.oninput = () => {
        const kw = searchInput.value.trim().toLowerCase();
        if (!kw) {
          renderHotItems(cachedHotData);
          return;
        }
        const filtered = cachedHotData.filter(i => {
          const t = (i.title || i.name || i.word || '').toLowerCase();
          return t.includes(kw);
        });
        // 过滤态下不重复渲染降级提示条，避免干扰结果阅读
        renderHotItems(filtered, undefined, undefined, false);
      };
    }
    // 复制 60s 早报
    const copyBtn = document.getElementById('dlBtnCopy60s');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const items = Array.from(document.querySelectorAll('#dl60sList .daily-60s-item span:last-child'))
          .map((el, i) => `${i + 1}. ${el.textContent}`)
          .join('\n');
        const text = `📰 【每天 60 秒读懂世界】\n${items}\n\n✦ 灵感来源：饮料人格研究所 · 今日风向标`;
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '✓ 已复制早报';
          setTimeout(() => (copyBtn.textContent = '📋 复制文本'), 1800);
        }).catch(() => {
          copyBtn.textContent = '✗ 复制失败';
          setTimeout(() => (copyBtn.textContent = '📋 复制文本'), 1800);
        });
      };
    }

    // 设为全站沉浸背景
    const setBgBtn = document.getElementById('dlWpBtnSetBg');
    if (setBgBtn) {
      setBgBtn.onclick = toggleSiteBackground;
      updateSetBgBtnState();
    }

    // 壁纸来源切换条
    document.querySelectorAll('#dlWpSourceBar [data-wp-source]').forEach((chip) => {
      chip.onclick = () => switchWpSource(chip.dataset.wpSource);
    });

    // 随机灵感：换一批
    const wpRefresh = document.getElementById('dlWpRefreshRandom');
    if (wpRefresh) wpRefresh.onclick = () => { loadRandomWallpapers(); };

    // 我的壁纸：添加（按钮 + 回车）
    const customAdd = document.getElementById('dlWpCustomAdd');
    const customInput = document.getElementById('dlWpCustomUrl');
    if (customAdd) customAdd.onclick = addCustomWallpaper;
    if (customInput) {
      customInput.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addCustomWallpaper(); }
      };
    }

    // 生成锁屏日签卡
    const posterBtn = document.getElementById('dlWpBtnPoster');
    if (posterBtn) posterBtn.onclick = generateLockscreenPoster;

    // 随机换一部心情选片
    const diceBtn = document.getElementById('dlBtnRandomMood');
    if (diceBtn) {
      diceBtn.onclick = () => {
        const keys = Object.keys(MOOD_DATA);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        pickMoodMovie(randomKey);
      };
    }
  }

  // 恢复已保存的全站背景状态
  function restoreSavedAmbientBg() {
    try {
      const savedActive = localStorage.getItem('daily_site_active_fix') === 'true'
        || localStorage.getItem('daily_site_bg_active') === 'true';
      let savedUrl = localStorage.getItem('daily_site_bg_url') || '';
      /* v301/v302 代理方案残留清理：存的 /api/bing-img?u=<编码直链>
         解码还原回 bing 直链（代理已删除，代理地址会 404 导致背景空白） */
      if (savedUrl.indexOf('/api/bing-img?u=') === 0) {
        try {
          const inner = decodeURIComponent(savedUrl.split('u=')[1] || '');
          if (/^https:\/\/(www|cn)\.bing\.com\/th\?id=OHR\./.test(inner)) savedUrl = inner;
        } catch (e) {}
      }
      if (savedActive && savedUrl) {
        isSiteBgActive = true;
        applySiteBackground(savedUrl, localStorage.getItem('daily_site_bg_title'));
      }
    } catch (_) {}
    syncWallpaperDismissBtn();
  }

  // 全站壁纸一旦开启就会常驻（存在 localStorage），关闭入口却深埋在
  // 「今日风向 → 每日 4K 壁纸」里，用户几乎想不起来自己开过。
  // 这里在顶栏常驻一个一键关闭入口。
  function syncWallpaperDismissBtn() {
    const btn = document.getElementById('globalBtnWallpaper');
    if (!btn) return;
    btn.hidden = !isSiteBgActive;
    // 菜单开着时壁纸项显隐变化，保持菜单高度自然
    const menu = document.getElementById('gnavMenu');
    if (menu && !menu.hidden) menu.hidden = false;
  }

  function init() {
    const root = document.getElementById('mod-daily');
    if (!root) return;

    restoreSavedAmbientBg();
    bindEvents();
    updateSetBgBtnState();
    load60sNews();
    loadHotList('weibo');
    loadMovieList('weekly_movie');
    /* 壁纸按用户上次的来源加载（默认必应每日） */
    try { wpSource = localStorage.getItem(WP_SOURCE_KEY) || 'bing'; } catch (_) {}
    if (!WP_SOURCE_META[wpSource]) wpSource = 'bing';
    loadCustomWps();
    renderWpSourceBar();
    if (wpSource === 'bing') loadBingWallpaper();
    else if (wpSource === 'random') loadRandomWallpapers();
    else renderCustomGallery();
    pickMoodMovie('laugh');
  }

  // 顶栏一键关闭全站壁纸背景。
  // 必须绑在模块顶层而非 init() 里 —— init() 只在用户真正进入「今日风向」时才跑，
  // 而开了壁纸的用户可能一直在别的模块，此时顶栏按钮会点了没反应。
  const wallpaperDismissBtn = document.getElementById('globalBtnWallpaper');
  if (wallpaperDismissBtn) {
    wallpaperDismissBtn.onclick = () => {
      if (!isSiteBgActive) return;
      isSiteBgActive = false;
      clearSiteBackground();
      updateSetBgBtnState();
      syncWallpaperDismissBtn();
      showDailyToast('🖼️ 已关闭全站壁纸背景');
      if (window.SFX && window.SFX.tap) window.SFX.tap();
    };
  }

  // 模块加载即尝试恢复全站背景
  restoreSavedAmbientBg();

  window.AppDaily = {
    init,
    restoreSavedAmbientBg,
    refreshLunar,
    load60sNews,
    loadHotList,
    loadMovieList,
    loadBingWallpaper
  };
})();

