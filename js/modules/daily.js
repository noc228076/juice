/* =========================================================
   模块 10：今日风向标 (Daily Inspiration & Trends)
   60秒读懂世界 · 全网热榜追踪 · 必应 4K 壁纸 · 豆瓣高分影视
   ========================================================= */

(function () {
  'use strict';

  const CACHE_PREFIX = 'juice_daily_';
  const CACHE_TTL_MS = 25 * 60 * 1000; // 25分钟本地缓存，彻底杜绝并发风控与 429 报错

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
    hotlist: [
      { title: '当代年轻人为什么越来越注重精神健康与自我解压', hot_value: 1250000, link: 'https://s.weibo.com' },
      { title: '国产科技创新突破性进展引全网热议', hot_value: 980000, link: 'https://s.weibo.com' },
      { title: '秋日第一杯治愈特调饮品喝什么最舒心', hot_value: 760000, link: 'https://s.weibo.com' },
      { title: '豆瓣高分口碑影视佳作盘点与周末追剧指南', hot_value: 650000, link: 'https://s.weibo.com' },
      { title: '全球自然风光大片展出：必应今日秋日秘境摄影', hot_value: 520000, link: 'https://s.weibo.com' },
      { title: '微调作息与自我生活节奏的 5 个实用习惯', hot_value: 410000, link: 'https://s.weibo.com' }
    ],
    bing: {
      title: '蓝与绿的交响曲',
      copyright: '普利特维采湖群国家公园，克罗地亚 (© Jan Wlodarczyk/Alamy)',
      description: '普利特维采湖群国家公园是克罗地亚最著名的国家公园，拥有 16 个由钙华屏障连接的梯级湖泊与飞瀑，湖水在蓝、绿、青之间变幻莫测。',
      cover: 'https://bing.com/th?id=OHR.PlitviceAutumn_ZH-CN5646237897_1920x1080.jpg',
      cover_4k: 'https://bing.com/th?id=OHR.PlitviceAutumn_ZH-CN5646237897_UHD.jpg',
      date: new Date().toISOString().split('T')[0]
    },
    movies: [
      {
        rank: 1,
        title: '罗斯',
        rating: 8.5,
        card_subtitle: '奥地利 / 德国 / 剧情 / 马库斯·施莱泽 / 桑德拉·惠勒',
        cover_proxy: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2935294362.jpg',
        url: 'https://movie.douban.com',
        tags: ['高分力荐', '年度佳作']
      },
      {
        rank: 2,
        title: '生化危机：爆发夜',
        rating: 7.3,
        card_subtitle: '德国 / 法国 / 科幻 惊悚 / 扎克·克雷格',
        cover_proxy: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2936442661.jpg',
        url: 'https://movie.douban.com',
        tags: ['惊险刺激', '视觉盛宴']
      },
      {
        rank: 3,
        title: '野兽之心',
        rating: 7.3,
        card_subtitle: '美国 / 剧情 动作 冒险 / 大卫·阿耶 / 布拉德·皮特',
        cover_proxy: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2933185536.jpg',
        url: 'https://movie.douban.com',
        tags: ['硬核动作', '热血冒险']
      },
      {
        rank: 4,
        title: '500英里',
        rating: 7.6,
        card_subtitle: '英国 / 爱尔兰 / 剧情 / 摩根·马修斯',
        cover_proxy: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2932686404.jpg',
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
      cover: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p579729551.jpg'
    },
    brain: {
      label: '深度烧脑',
      icon: '🧠',
      title: '星际穿越',
      score: 9.4,
      desc: '诺兰硬核科幻巅峰之作，关于爱、引力与时空的永恒交织，维度跳跃极致震撼。',
      drink: '☕ 推荐特调：【超光速冷萃冰美式】（双倍浓缩加冰，逻辑瞬间苏醒）',
      cover: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2614988097.jpg'
    },
    heal: {
      label: '治愈温暖',
      icon: '🍵',
      title: '小森林 夏秋篇',
      score: 9.0,
      desc: '把四季晨昏与一蔬一饭过成诗，安静从容，抚平所有浮躁与焦虑。',
      drink: '🥛 推荐特调：【热白桃乌龙厚乳茶】（三分微糖，暖胃抚平一切褶皱）',
      cover: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2564498893.jpg'
    },
    rush: {
      label: '热血刺激',
      icon: '⚡',
      title: '疯狂的麦克斯4：狂暴之路',
      score: 8.7,
      desc: '全程无尿点的纯粹重金属废土狂飙，引擎轰鸣，肾上腺素瞬间狂飙到顶。',
      drink: '🍋 推荐特调：【手打香水浓柠暴打苏打水】（满杯冰块，激情回血）',
      cover: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2236242605.jpg'
    },
    work: {
      label: '社畜共鸣',
      icon: '💼',
      title: '白日梦想家',
      score: 8.6,
      desc: '跳出格子间的平庸桎梏，去格陵兰跳海、去冰岛滑板，找回生命原本的旷野。',
      drink: '🧋 推荐特调：【焦糖海盐红茶拿铁五分甜】（生活微苦，焦糖自渡）',
      cover: 'https://doubanio.viki.moe/view/photo/m_ratio_poster/public/p2160195181.jpg'
    }
  };

  let curSection = 'hot'; // 'hot' | 'movie' | 'wallpaper'
  let curPlatform = 'weibo';
  let curMovieType = 'weekly_movie';
  let isSiteBgActive = false;
  let activeWp = FALLBACK_SEEDS.bing;
  let cachedHotData = [];

  // 跨域缓存获取器
  async function fetchWithCache(url, cacheKey, fallback) {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL_MS && parsed.data) {
          return parsed.data;
        }
      }
    } catch (_) {}

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        try {
          localStorage.setItem(
            CACHE_PREFIX + cacheKey,
            JSON.stringify({ ts: Date.now(), data })
          );
        } catch (_) {}
        return data;
      }
    } catch (e) {
      console.warn('[Daily] Fetch API warning, using cache/fallback:', cacheKey, e);
    }

    try {
      const cached = localStorage.getItem(CACHE_PREFIX + cacheKey);
      if (cached) return JSON.parse(cached).data;
    } catch (_) {}

    return fallback;
  }

  // ================= 1. 每日 60 秒与全网热搜 =================
  async function load60sNews() {
    const box = document.getElementById('dl60sList');
    const tipEl = document.getElementById('dl60sTip');
    const dateEl = document.getElementById('dl60sDateBadge');
    if (!box) return;

    box.innerHTML = '<div class="daily-skeleton" style="height:80px;width:100%;"></div>';

    const data = await fetchWithCache(
      'https://60s.viki.moe/v2/60s',
      'news_60s',
      FALLBACK_SEEDS.news60s
    );

    if (dateEl && data.date) {
      dateEl.textContent = `${data.date} · ${data.day_of_week || ''} · ${data.lunar_date || ''}`;
    }
    if (tipEl && data.tip) {
      tipEl.textContent = `“ ${data.tip} ”`;
    }

    const newsArr = Array.isArray(data.news) ? data.news : FALLBACK_SEEDS.news60s.news;
    box.innerHTML = newsArr
      .map(
        (item, idx) => `
        <div class="daily-60s-item">
          <span class="daily-60s-num">${idx + 1}</span>
          <span>${item}</span>
        </div>
      `
      )
      .join('');
  }

  async function loadHotList(platform = 'weibo') {
    curPlatform = platform;
    const listEl = document.getElementById('dlHotList');
    if (!listEl) return;

    listEl.innerHTML = Array(6)
      .fill(0)
      .map(() => '<div class="daily-skeleton" style="height:48px;border-radius:12px;margin-bottom:8px;"></div>')
      .join('');

    const endpointMap = {
      weibo: 'https://60s.viki.moe/v2/weibo',
      zhihu: 'https://60s.viki.moe/v2/zhihu',
      bili: 'https://60s.viki.moe/v2/bili',
      douyin: 'https://60s.viki.moe/v2/douyin',
      rednote: 'https://60s.viki.moe/v2/rednote',
      'ai-news': 'https://60s.viki.moe/v2/ai-news',
      toutiao: 'https://60s.viki.moe/v2/toutiao'
    };

    const url = endpointMap[platform] || endpointMap.weibo;
    const raw = await fetchWithCache(url, 'hot_' + platform, FALLBACK_SEEDS.hotlist);
    let list = Array.isArray(raw) ? raw : (raw.list || FALLBACK_SEEDS.hotlist);

    cachedHotData = list;
    renderHotItems(list);
  }

  function renderHotItems(list) {
    const listEl = document.getElementById('dlHotList');
    if (!listEl) return;

    if (!list || !list.length) {
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--tx-dim);">暂无当前热搜数据</div>';
      return;
    }

    listEl.innerHTML = list
      .slice(0, 30)
      .map((item, idx) => {
        const title = item.title || item.name || item.word || '热门事件';
        const hotVal = item.hot_value
          ? item.hot_value > 10000
            ? (item.hot_value / 10000).toFixed(1) + '万'
            : item.hot_value
          : item.heat || '';
        const link = item.link || item.url || '#';
        return `
          <a class="daily-hot-item" href="${link}" target="_blank" rel="noopener noreferrer">
            <div class="daily-hot-left">
              <span class="daily-hot-rank">${idx + 1}</span>
              <span class="daily-hot-title" title="${title}">${title}</span>
            </div>
            <div class="daily-hot-right">
              ${hotVal ? `<span class="daily-hot-val">🔥 ${hotVal}</span>` : ''}
              <span class="daily-hot-arrow">↗</span>
            </div>
          </a>
        `;
      })
      .join('');
  }

  // ================= 2. 影视风向标 & 心情选片 =================
  async function loadMovieList(type = 'weekly_movie') {
    curMovieType = type;
    const grid = document.getElementById('dlMovieGrid');
    if (!grid) return;

    grid.innerHTML = Array(4)
      .fill(0)
      .map(() => '<div class="daily-skeleton" style="height:140px;border-radius:16px;"></div>')
      .join('');

    const urlMap = {
      weekly_movie: 'https://60s.viki.moe/v2/douban/weekly/movie',
      tv_chinese: 'https://60s.viki.moe/v2/douban/weekly/tv_chinese',
      tv_global: 'https://60s.viki.moe/v2/douban/weekly/tv_global'
    };

    const url = urlMap[type] || urlMap.weekly_movie;
    const raw = await fetchWithCache(url, 'movie_' + type, FALLBACK_SEEDS.movies);
    const list = Array.isArray(raw) ? raw : (raw.list || FALLBACK_SEEDS.movies);

    grid.innerHTML = list
      .map((m, idx) => {
        const poster = m.cover_proxy || m.cover || 'assets/icons/icon-192.png';
        const rating = m.rating ? `★ ${m.rating}` : '暂无评分';
        const tags = Array.isArray(m.tags) ? m.tags : [];
        return `
          <a class="daily-movie-card" href="${m.url || '#'}" target="_blank" rel="noopener noreferrer">
            <img class="daily-mcard-poster" src="${poster}" alt="${m.title}" loading="lazy" onerror="this.src='assets/icons/icon-192.png'" />
            <div class="daily-mcard-info">
              <div>
                <div class="daily-mcard-head">
                  <span class="daily-mcard-title">#${idx + 1} ${m.title}</span>
                  <span class="daily-mcard-score">${rating}</span>
                </div>
                ${tags.length ? `<div class="daily-mcard-tags">${tags.map(t => `<span class="daily-mcard-tag">${t}</span>`).join('')}</div>` : ''}
              </div>
              <div class="daily-mcard-sub">${m.card_subtitle || m.description || '高口碑精品之作'}</div>
            </div>
          </a>
        `;
      })
      .join('');
  }

  function pickMoodMovie(moodKey) {
    const data = MOOD_DATA[moodKey] || MOOD_DATA.laugh;
    const resEl = document.getElementById('dlMoodResult');
    if (!resEl) return;

    resEl.innerHTML = `
      <img class="daily-mood-res-img" src="${data.cover}" alt="${data.title}" onerror="this.src='assets/icons/icon-192.png'" />
      <div class="daily-mood-res-info">
        <div class="daily-mood-res-title">${data.title}</div>
        <div class="daily-mood-res-score">★ ${data.score} 豆瓣高分经典</div>
        <div class="daily-mood-res-drink">${data.drink}</div>
        <div class="daily-mood-res-desc">${data.desc}</div>
      </div>
    `;

    document.querySelectorAll('.daily-mood-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mood === moodKey);
    });

    if (window.SFX && window.SFX.tap) window.SFX.tap();
  }

  // ================= 3. 必应 4K 每日壁纸 =================
  async function loadBingWallpaper() {
    const raw = await fetchWithCache(
      'https://60s.viki.moe/v2/bing',
      'bing_today',
      FALLBACK_SEEDS.bing
    );

    activeWp = raw && raw.cover ? raw : FALLBACK_SEEDS.bing;
    renderMainWallpaper(activeWp);
    loadRecentWallpapers();
  }

  function renderMainWallpaper(wp) {
    const imgEl = document.getElementById('dlWpMainImg');
    const titleEl = document.getElementById('dlWpMainTitle');
    const descEl = document.getElementById('dlWpMainDesc');
    const metaEl = document.getElementById('dlWpMainMeta');
    const dlBtn = document.getElementById('dlWpBtnDownload');

    if (imgEl) imgEl.src = wp.cover_4k || wp.cover;
    if (titleEl) titleEl.textContent = wp.title || '今日壁纸大片';
    if (descEl) descEl.textContent = wp.description || wp.main_text || wp.copyright || '';
    if (metaEl) metaEl.textContent = wp.copyright ? `📷 摄影版权：${wp.copyright}` : '';
    if (dlBtn) dlBtn.href = wp.cover_4k || wp.cover;
  }

  async function loadRecentWallpapers() {
    const galleryGrid = document.getElementById('dlWpGalleryGrid');
    if (!galleryGrid) return;

    galleryGrid.innerHTML = Array(6)
      .fill(0)
      .map(() => '<div class="daily-skeleton" style="aspect-ratio:16/9;border-radius:14px;"></div>')
      .join('');

    // 并发依次拉取近 6 日壁纸（使用开源项目 bing.biturl.top index=0~5）
    const promises = [0, 1, 2, 3, 4, 5].map(idx =>
      fetchWithCache(
        `https://bing.biturl.top/?resolution=1920&format=json&index=${idx}&mkt=zh-CN`,
        `bing_hist_${idx}`,
        null
      )
    );

    const results = await Promise.all(promises);
    const valid = results.filter(Boolean);

    if (!valid.length) {
      galleryGrid.innerHTML = `
        <div class="daily-wp-thumb-card active">
          <img class="daily-wp-thumb-img" src="${activeWp.cover}" />
          <div class="daily-wp-thumb-meta">
            <span class="daily-wp-thumb-date">今日</span>
            <div class="daily-wp-thumb-title">${activeWp.title}</div>
          </div>
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = valid
      .map(
        (item, i) => `
        <div class="daily-wp-thumb-card ${i === 0 ? 'active' : ''}" data-idx="${i}">
          <img class="daily-wp-thumb-img" src="${item.url}" alt="${item.copyright}" loading="lazy" />
          <div class="daily-wp-thumb-meta">
            <span class="daily-wp-thumb-date">${item.end_date || `近第 ${i + 1} 日`}</span>
            <div class="daily-wp-thumb-title" title="${item.copyright}">${item.copyright.split('(')[0] || item.copyright}</div>
          </div>
        </div>
      `
      )
      .join('');

    galleryGrid.querySelectorAll('.daily-wp-thumb-card').forEach((card, idx) => {
      card.onclick = () => {
        const item = valid[idx];
        if (!item) return;
        galleryGrid.querySelectorAll('.daily-wp-thumb-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        activeWp = {
          title: item.copyright.split('(')[0].trim() || '必应风光大片',
          description: item.copyright,
          copyright: item.copyright,
          cover: item.url,
          cover_4k: item.url.replace('_1920x1080.jpg', '_UHD.jpg')
        };
        renderMainWallpaper(activeWp);
        if (window.SFX && window.SFX.tap) window.SFX.tap();
      };
    });
  }

  // 设为全站沉浸背景
  function toggleSiteBackground() {
    isSiteBgActive = !isSiteBgActive;
    const btn = document.getElementById('dlWpBtnSetBg');
    if (isSiteBgActive && activeWp) {
      document.body.style.setProperty('--daily-bg-url', `url("${activeWp.cover}")`);
      document.body.classList.add('has-daily-ambient-bg');
      if (btn) btn.innerHTML = '✨ 已设为全站背景 (点击取消)';
    } else {
      document.body.classList.remove('has-daily-ambient-bg');
      if (btn) btn.innerHTML = '🖥️ 设为全站沉浸背景';
    }
    if (window.SFX && window.SFX.tap) window.SFX.tap();
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
      window.open(activeWp.cover_4k || activeWp.cover, '_blank');
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
        renderHotItems(filtered);
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
        });
      };
    }

    // 设为全站沉浸背景
    const setBgBtn = document.getElementById('dlWpBtnSetBg');
    if (setBgBtn) setBgBtn.onclick = toggleSiteBackground;

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

  function init() {
    const root = document.getElementById('mod-daily');
    if (!root) return;

    bindEvents();
    load60sNews();
    loadHotList('weibo');
    loadMovieList('weekly_movie');
    loadBingWallpaper();
    pickMoodMovie('laugh');
  }

  window.AppDaily = {
    init,
    load60sNews,
    loadHotList,
    loadMovieList,
    loadBingWallpaper
  };
})();
