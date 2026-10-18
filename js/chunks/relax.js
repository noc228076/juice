/* === js/modules/clock.js === */
/* =========================================================
   模块 8：摸鱼发薪实时时钟 (Workplace Slacking & Salary Ticker)
   扎心又快乐的工位时钟 · 毫秒级窝囊费跳字 · 带薪摸鱼计时 · 战报海报
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'juice_clock_config_v2';

  const REST_MODE_META = {
    double:     { label: '📅 双休制',     workDays: 21.75, desc: '双休(六日休)' },
    single_sun: { label: '🐂 单休(休日)', workDays: 26,    desc: '单休(仅周日休)' },
    bi_small:   { label: '📅 大小周(小)', workDays: 24,    desc: '本周小周(周六上班)' },
    bi_big:     { label: '🏖️ 大小周(大)', workDays: 24,    desc: '本周大周(六日休)' },
    single_sat: { label: '📆 单休(休六)', workDays: 26,    desc: '单休(仅周六休)' },
    none:       { label: '⚙️ 全勤排班',   workDays: 30,    desc: '今日正常排班' }
  };

  let cfg = {
    monthlySalary: 12000,
    restMode: 'double',
    otRate: 1.5,
    startTime: '09:00',
    endTime: '18:00',
    payday: 15,
    maskSalary: false
  };

  // 加班状态：'none' (正常上下班) | 'paid' (付费加班) | 'unpaid' (无偿加班)
  let overtimeMode = 'none';
  let otStartMs = 0;

  // 带薪摸鱼专项计时状态
  let isSlacking = false;
  let slackType = '🚽 带薪如厕';
  let slackStartMs = 0;
  let slackAccumulatedMs = 0;
  let tickerInterval = null;
  let lastClockRecord = null;

  // 3D 拟真机械大翻页倒计时全屏沉浸屏保状态 (Fliqlo 风格)
  let isZenOpen = false;
  let zenMode = 'offwork'; // 'offwork' | 'realtime' | 'friday'
  let zenIdleTimer = null;

  function loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('juice_clock_config_v1');
      if (saved) {
        cfg = { ...cfg, ...JSON.parse(saved) };
      }
    } catch (e) {}
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {}
  }

  function parseHm(str, defH, defM) {
    const parts = String(str || '').split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return {
      h: isNaN(h) ? defH : Math.min(23, Math.max(0, h)),
      m: isNaN(m) ? defM : Math.min(59, Math.max(0, m))
    };
  }

  function isDateRestDay(dateObj, mode) {
    const d = dateObj.getDay(); // 0 = 周日, 6 = 周六
    switch (mode) {
      case 'single_sun':
      case 'bi_small':
        return d === 0; // 仅周日休息，周六正常上班
      case 'single_sat':
        return d === 6; // 仅周六休息，周日正常上班
      case 'none':
        return false;   // 全勤排班
      case 'double':
      case 'bi_big':
      default:
        return d === 0 || d === 6; // 周六、周日均休息
    }
  }

  function getRates() {
    const salary = Math.max(100, Number(cfg.monthlySalary) || 12000);
    const meta = REST_MODE_META[cfg.restMode] || REST_MODE_META.double;
    const days = meta.workDays;
    const dailySalary = salary / days;

    const st = parseHm(cfg.startTime, 9, 0);
    const et = parseHm(cfg.endTime, 18, 0);
    let workMinutes = (et.h * 60 + et.m) - (st.h * 60 + st.m);
    if (workMinutes <= 0) workMinutes = 540; // 默认 9 小时
    const workSeconds = workMinutes * 60;
    const perSecond = dailySalary / workSeconds;
    const otMult = Math.max(1, Number(cfg.otRate) || 1.5);

    return { salary, days, dailySalary, st, et, workSeconds, perSecond, otMult, restDesc: meta.desc };
  }

  function pad2(n) {
    return String(Math.floor(Math.max(0, n))).padStart(2, '0');
  }

  function formatDurationHMS(sec) {
    const s = Math.max(0, Math.floor(sec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  }

  function formatDurationCN(sec) {
    const s = Math.max(0, Math.floor(sec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (hh > 0) return `${hh}小时${mm}分${ss}秒`;
    if (mm > 0) return `${mm}分${ss}秒`;
    return `${ss}秒`;
  }

  function getNextHoliday(now) {
    const y = now.getFullYear();
    const holidays = [
      { name: '元旦假期', m: 1, d: 1 },
      { name: '春节长假', m: 2, d: 17 },
      { name: '清明假期', m: 4, d: 5 },
      { name: '五一劳动节', m: 5, d: 1 },
      { name: '端午假期', m: 6, d: 19 },
      { name: '中秋假期', m: 9, d: 25 },
      { name: '十一国庆节', m: 10, d: 1 },
      { name: '元旦假期', m: 1, d: 1, nextY: true }
    ];

    for (const h of holidays) {
      const targetYear = h.nextY ? y + 1 : y;
      const targetDate = new Date(targetYear, h.m - 1, h.d, 0, 0, 0);
      if (targetDate > now) {
        const diffDays = Math.ceil((targetDate - now) / (1000 * 86400));
        return { name: h.name, days: diffDays };
      }
    }
    return { name: '元旦假期', days: 30 };
  }

  // 获取农历日期字符串（如：农历九月初六，逢节气如：农历九月十四 · 霜降）
  function getLunarDateString(date) {
    try {
      const solarObj = (typeof window !== 'undefined' && window.Solar) ? window.Solar : (typeof Solar !== 'undefined' ? Solar : null);
      if (solarObj && typeof solarObj.fromDate === 'function') {
        const lunar = solarObj.fromDate(date).getLunar();
        const month = lunar.getMonthInChinese();
        const day = lunar.getDayInChinese();
        const jieQi = lunar.getJieQi();
        if (jieQi) {
          return `农历${month}月${day} · ${jieQi}`;
        }
        return `农历${month}月${day}`;
      }
    } catch (e) {}
    return '';
  }

  // 农历 chunk 晚于时钟到达时，只刷新日期文本；时钟本身的 tick 不会因此停摆。
  function refreshLunar() {
    if (!isInitialized) return;
    try {
      updateTick();
    } catch (e) {}
  }

  // 计算当前加班已持续的秒数
  function getOvertimeSeconds(now, todayIsRest, startOfTodayWork, endOfTodayWork) {
    if (overtimeMode === 'none') return 0;
    if (!todayIsRest && now > endOfTodayWork) {
      // 工作日已过下班点：自动从下班点开始累计加班时长（若手动开启更早则取较大值）
      const sinceOffwork = (now - endOfTodayWork) / 1000;
      const sinceClick = otStartMs ? (Date.now() - otStartMs) / 1000 : 0;
      return Math.max(sinceOffwork, sinceClick);
    }
    if (todayIsRest && now >= startOfTodayWork) {
      // 休息日加班：如果当前在常规上班时段之后，默认从今日上班打卡点或手动点击点计算
      const sinceClick = otStartMs ? (Date.now() - otStartMs) / 1000 : 0;
      const sinceMorning = (now - startOfTodayWork) / 1000;
      return Math.max(sinceClick, Math.min(sinceMorning, 3600 * 12));
    }
    return otStartMs ? Math.max(0, (Date.now() - otStartMs) / 1000) : 0;
  }

  // Fliqlo 拟真机械翻页卡片核心更新器 (双叶片 3D 折叠，完全静音)
  function updateFlipUnit(cardEl, newVal) {
    if (!cardEl) return;
    const currentVal = cardEl.getAttribute('data-val') || '';
    if (currentVal === newVal) return;

    const topStaticNum = cardEl.querySelector('.static-top .zen-num');
    const botStaticNum = cardEl.querySelector('.static-bot .zen-num');
    const flapTop = cardEl.querySelector('.flap-top');
    const flapBot = cardEl.querySelector('.flap-bot');
    const flapTopNum = flapTop ? flapTop.querySelector('.zen-num') : null;
    const flapBotNum = flapBot ? flapBot.querySelector('.zen-num') : null;

    if (!currentVal) {
      cardEl.setAttribute('data-val', newVal);
      if (topStaticNum) topStaticNum.textContent = newVal;
      if (botStaticNum) botStaticNum.textContent = newVal;
      if (flapTopNum) flapTopNum.textContent = newVal;
      if (flapBotNum) flapBotNum.textContent = newVal;
      return;
    }

    // 翻页前准备：
    // 上半部静止层预先置入新数值（被 flapTop 遮挡）
    // 下半部静止层保持旧数值（等待 flapBot 翻转落下遮盖）
    // 上翻转叶 flapTop 显示当前旧数值，向下折叠 90 度
    // 下翻转叶 flapBot 显示目标新数值，从 90 度折叠展平至 0 度
    if (topStaticNum) topStaticNum.textContent = newVal;
    if (botStaticNum) botStaticNum.textContent = currentVal;
    if (flapTopNum) flapTopNum.textContent = currentVal;
    if (flapBotNum) flapBotNum.textContent = newVal;

    cardEl.classList.remove('is-flipping');
    void cardEl.offsetWidth; // 触发 reflow 重新执行折叠动画
    cardEl.classList.add('is-flipping');
    cardEl.setAttribute('data-val', newVal);

    clearTimeout(cardEl._flipTimer);
    cardEl._flipTimer = setTimeout(() => {
      cardEl.classList.remove('is-flipping');
      if (botStaticNum) botStaticNum.textContent = newVal;
      if (flapTopNum) flapTopNum.textContent = newVal;
    }, 580);
  }

  // 全屏沉浸屏保实时渲染核心（下班倒计时 / 实时工位时钟 / 周末倒计时）
  function updateZenScreensaver(now, rates, todayIsRest, startOfTodayWork, endOfTodayWork, earnedToday, progressPct, overtimeMode, otSec) {
    const overlay = document.getElementById('ckZenOverlay');
    if (!overlay || !isZenOpen) return;

    const brandText = document.getElementById('zenBrandText');
    const titleEl = document.getElementById('zenEyebrowTitle');

    const wrapDD = document.getElementById('zenWrapDD');
    const colonDD = document.getElementById('zenColonDD');
    const cardDD = document.getElementById('zenCardDD');
    const cardHH = document.getElementById('zenCardHH');
    const cardMM = document.getElementById('zenCardMM');
    const cardSS = document.getElementById('zenCardSS');

    const progLabel = document.getElementById('zenProgLabel');
    const progVal = document.getElementById('zenProgVal');
    const progFill = document.getElementById('zenProgressFill');
    const progSub = document.getElementById('zenProgressSub');

    const zenIncVal = document.getElementById('zenIncomeVal');
    const zenIncRate = document.getElementById('zenIncomeRate');

    // 1. 同步副信息区：实时窝囊费跳表与秒级进账速度
    const intPart = Math.floor(earnedToday);
    const decPart = (earnedToday - intPart).toFixed(4).substring(1);
    if (zenIncVal) zenIncVal.textContent = intPart.toLocaleString() + decPart;
    if (zenIncRate) {
      if (overtimeMode === 'unpaid') {
        zenIncRate.textContent = '(无偿加班 +¥0.0000)';
      } else if (overtimeMode === 'paid') {
        zenIncRate.textContent = `(付费加班每秒 +¥${(rates.perSecond * rates.otMult).toFixed(4)})`;
      } else if (todayIsRest) {
        zenIncRate.textContent = '(休假暂停跳字)';
      } else {
        zenIncRate.textContent = `(每秒 +¥${rates.perSecond.toFixed(4)})`;
      }
    }

    // 2. 根据三大模式计算翻页倒计时数值
    if (zenMode === 'offwork') {
      if (brandText) brandText.textContent = '🏃 下班倒计时 · 沉浸屏保';

      if (todayIsRest) {
        if (titleEl) titleEl.textContent = '今日休假 · 享受自由人生';
        if (wrapDD) wrapDD.style.display = 'none';
        if (colonDD) colonDD.style.display = 'none';
        updateFlipUnit(cardHH, '00');
        updateFlipUnit(cardMM, '00');
        updateFlipUnit(cardSS, '00');

        if (progLabel) progLabel.textContent = '今日休假状态';
        if (progVal) progVal.textContent = '100%';
        if (progFill) progFill.style.width = '100%';
        if (progSub) progSub.textContent = `当前为${rates.restDesc}，好好休息，蓄满电量！`;
      } else if (now < startOfTodayWork) {
        const waitSec = Math.max(0, Math.floor((startOfTodayWork - now) / 1000));
        if (titleEl) titleEl.textContent = `今日 ${cfg.startTime} 准时开工 · 准备起航`;
        if (wrapDD) wrapDD.style.display = 'none';
        if (colonDD) colonDD.style.display = 'none';
        updateFlipUnit(cardHH, pad2(Math.floor(waitSec / 3600)));
        updateFlipUnit(cardMM, pad2(Math.floor((waitSec % 3600) / 60)));
        updateFlipUnit(cardSS, pad2(waitSec % 60));

        if (progLabel) progLabel.textContent = '开工倒计时';
        if (progVal) progVal.textContent = '0%';
        if (progFill) progFill.style.width = '0%';
        if (progSub) progSub.textContent = '先喝杯咖啡喘口气，带薪搬砖即将就绪';
      } else if (now <= endOfTodayWork) {
        const remSec = Math.max(0, Math.floor((endOfTodayWork - now) / 1000));
        if (titleEl) titleEl.textContent = `今日下班倒计时 · 已熬过 ${progressPct.toFixed(1)}%`;
        if (wrapDD) wrapDD.style.display = 'none';
        if (colonDD) colonDD.style.display = 'none';
        updateFlipUnit(cardHH, pad2(Math.floor(remSec / 3600)));
        updateFlipUnit(cardMM, pad2(Math.floor((remSec % 3600) / 60)));
        updateFlipUnit(cardSS, pad2(remSec % 60));

        if (progLabel) progLabel.textContent = '今日工时熬过进度';
        if (progVal) progVal.textContent = `${progressPct.toFixed(1)}%`;
        if (progFill) progFill.style.width = `${progressPct.toFixed(1)}%`;
        if (progSub) progSub.textContent = `已在工位 ${formatDurationCN((now - startOfTodayWork) / 1000)} · 再撑 ${Math.ceil(remSec / 60)} 分钟即可合上电脑跑路 🏃💨`;
      } else {
        if (overtimeMode === 'paid') {
          if (titleEl) titleEl.textContent = `延时加班计时中 · 已累计加班 ${formatDurationCN(otSec)}`;
          if (wrapDD) wrapDD.style.display = 'none';
          if (colonDD) colonDD.style.display = 'none';
          updateFlipUnit(cardHH, pad2(Math.floor(otSec / 3600)));
          updateFlipUnit(cardMM, pad2(Math.floor((otSec % 3600) / 60)));
          updateFlipUnit(cardSS, pad2(otSec % 60));

          if (progLabel) progLabel.textContent = '加班已多赚窝囊费';
          if (progVal) progVal.textContent = `+¥${(otSec * rates.perSecond * rates.otMult).toFixed(2)}`;
          if (progFill) progFill.style.width = '100%';
          if (progSub) progSub.textContent = `延时加班费正在按 ${rates.otMult} 倍跳字累加，注意身体早点回家`;
        } else if (overtimeMode === 'unpaid') {
          if (titleEl) titleEl.textContent = `无偿加班计时中 · 已倒贴工时 ${formatDurationCN(otSec)}`;
          if (wrapDD) wrapDD.style.display = 'none';
          if (colonDD) colonDD.style.display = 'none';
          updateFlipUnit(cardHH, pad2(Math.floor(otSec / 3600)));
          updateFlipUnit(cardMM, pad2(Math.floor((otSec % 3600) / 60)));
          updateFlipUnit(cardSS, pad2(otSec % 60));

          if (progLabel) progLabel.textContent = '无偿加班倒贴工时';
          if (progVal) progVal.textContent = '¥0/秒';
          if (progFill) progFill.style.width = '100%';
          if (progSub) progSub.textContent = '薪资已停涨，相当于白白送钱！快合上电脑离开！';
        } else {
          if (titleEl) titleEl.textContent = '今日已顺利下班解放 🎉';
          if (wrapDD) wrapDD.style.display = 'none';
          if (colonDD) colonDD.style.display = 'none';
          updateFlipUnit(cardHH, '00');
          updateFlipUnit(cardMM, '00');
          updateFlipUnit(cardSS, '00');

          if (progLabel) progLabel.textContent = '今日工时进度';
          if (progVal) progVal.textContent = '100%';
          if (progFill) progFill.style.width = '100%';
          if (progSub) progSub.textContent = `已过 ${cfg.endTime} 下班点，正班日薪全额落袋，快快背上书包撤退！`;
        }
      }
    } else if (zenMode === 'realtime') {
      if (brandText) brandText.textContent = '⏰ 实时时钟 · 沉浸屏保';
      const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const lunarStr = getLunarDateString(now);
      if (titleEl) {
        titleEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${weekNames[now.getDay()]}${lunarStr ? ' · ' + lunarStr : ''}`;
      }
      if (wrapDD) wrapDD.style.display = 'none';
      if (colonDD) colonDD.style.display = 'none';

      updateFlipUnit(cardHH, pad2(now.getHours()));
      updateFlipUnit(cardMM, pad2(now.getMinutes()));
      updateFlipUnit(cardSS, pad2(now.getSeconds()));

      if (progLabel) progLabel.textContent = '今日工时进度';
      if (progVal) progVal.textContent = `${progressPct.toFixed(1)}%`;
      if (progFill) progFill.style.width = `${progressPct.toFixed(1)}%`;
      if (progSub) progSub.textContent = `上班 ${cfg.startTime} · 下班 ${cfg.endTime} · 每一秒呼吸都在带薪搞钱`;
    } else if (zenMode === 'friday') {
      if (brandText) brandText.textContent = '🍻 周末倒计时 · 沉浸屏保';

      if (cfg.restMode === 'none') {
        if (titleEl) titleEl.textContent = '全勤排班 · 每一天都元气满满';
        if (wrapDD) wrapDD.style.display = 'none';
        if (colonDD) colonDD.style.display = 'none';
        updateFlipUnit(cardHH, '00');
        updateFlipUnit(cardMM, '00');
        updateFlipUnit(cardSS, '00');

        if (progLabel) progLabel.textContent = '排班模式';
        if (progVal) progVal.textContent = '全勤排班';
        if (progFill) progFill.style.width = '100%';
        if (progSub) progSub.textContent = '可在时钟配置面板切换为双休或单休';
      } else {
        const dayOfWeek = now.getDay();
        const isSatWork = (cfg.restMode === 'single_sun' || cfg.restMode === 'bi_small');
        const targetWeekendDay = isSatWork ? 6 : 5;
        const targetDayName = isSatWork ? '周六' : '周五';

        if (dayOfWeek === targetWeekendDay && now >= endOfTodayWork) {
          if (titleEl) titleEl.textContent = '🎉 周末狂欢进行时 · 尽情享受自由！';
          if (wrapDD) wrapDD.style.display = 'none';
          if (colonDD) colonDD.style.display = 'none';
          updateFlipUnit(cardHH, '00');
          updateFlipUnit(cardMM, '00');
          updateFlipUnit(cardSS, '00');

          if (progLabel) progLabel.textContent = '周末假期状态';
          if (progVal) progVal.textContent = '100%';
          if (progFill) progFill.style.width = '100%';
          if (progSub) progSub.textContent = '自由时间，禁止任何工作打扰！';
        } else {
          let daysToTarget = targetWeekendDay - dayOfWeek;
          if (daysToTarget < 0) daysToTarget += 7;
          const wkEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToTarget, rates.et.h, rates.et.m, 0);
          const diffSec = Math.max(0, Math.floor((wkEnd - now) / 1000));
          const fd = Math.floor(diffSec / 86400);
          const fh = Math.floor((diffSec % 86400) / 3600);
          const fm = Math.floor((diffSec % 3600) / 60);
          const fs = diffSec % 60;

          if (titleEl) titleEl.textContent = `离${targetDayName}放假还剩 ${fd > 0 ? fd + ' 天 ' : ''}${pad2(fh)} 小时 ${pad2(fm)} 分钟`;

          if (fd > 0) {
            if (wrapDD) wrapDD.style.display = 'flex';
            if (colonDD) colonDD.style.display = 'block';
            updateFlipUnit(cardDD, pad2(fd));
          } else {
            if (wrapDD) wrapDD.style.display = 'none';
            if (colonDD) colonDD.style.display = 'none';
          }

          updateFlipUnit(cardHH, pad2(fh));
          updateFlipUnit(cardMM, pad2(fm));
          updateFlipUnit(cardSS, pad2(fs));

          if (progLabel) progLabel.textContent = '本周工作日冲刺';
          if (progVal) progVal.textContent = `${fd > 0 ? fd + '天 ' : ''}${pad2(fh)}:${pad2(fm)}`;
          if (progFill) progFill.style.width = `${progressPct.toFixed(1)}%`;
          if (progSub) progSub.textContent = `距离${targetDayName} ${cfg.endTime} 准时放假，胜利就在眼前！`;
        }
      }
    }
  }

  // 屏保控制：自动静止 2.5 秒淡出控制栏
  function resetZenIdle() {
    const overlay = document.getElementById('ckZenOverlay');
    if (!overlay) return;
    overlay.classList.remove('is-idle');
    clearTimeout(zenIdleTimer);
    if (isZenOpen) {
      zenIdleTimer = setTimeout(() => {
        if (isZenOpen) overlay.classList.add('is-idle');
      }, 2500);
    }
  }

  function onZenKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      closeZenScreensaver();
    }
  }

  function openZenScreensaver(options) {
    options = options || {};
    if (!options.fromRouter && window.AppRouter && typeof window.AppRouter.openLayer === 'function') {
      window.AppRouter.openLayer('clock');
      return;
    }
    if (isZenOpen) return;
    isZenOpen = true;
    const overlay = document.getElementById('ckZenOverlay');
    const btnZen = document.getElementById('ckBtnZen');
    if (overlay) {
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
    }
    if (btnZen) btnZen.textContent = '🔙 退出屏保';

    // 锁定根页面滚动条，杜绝 Windows 系统滚动条底色/白边露出
    document.documentElement.classList.add('zen-screensaver-active');
    document.body.classList.add('zen-screensaver-active');

    // 优先让全屏屏保容器自身进入系统全屏（隔离根页面文档，彻底消除浏览器右侧滚动条）
    const targetEl = overlay || document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      try {
        if (targetEl.requestFullscreen) {
          targetEl.requestFullscreen().catch(() => {});
        } else if (targetEl.webkitRequestFullscreen) {
          targetEl.webkitRequestFullscreen();
        } else if (targetEl.msRequestFullscreen) {
          targetEl.msRequestFullscreen();
        }
      } catch (e) {}
    }

    resetZenIdle();
    window.addEventListener('mousemove', resetZenIdle, { passive: true });
    window.addEventListener('touchstart', resetZenIdle, { passive: true });
    window.addEventListener('keydown', onZenKeyDown);
    updateTick();
  }

  function closeZenScreensaver(options) {
    options = options || {};
    if (!options.fromRouter && !options.domOnly && window.AppRouter && typeof window.AppRouter.dismissLayer === 'function') {
      window.AppRouter.dismissLayer('clock');
      return;
    }
    isZenOpen = false;
    const overlay = document.getElementById('ckZenOverlay');
    const btnZen = document.getElementById('ckBtnZen');
    if (overlay) {
      overlay.classList.remove('is-active', 'is-idle');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (btnZen) btnZen.textContent = '🖥️ 极简屏保';

    // 恢复根页面滚动状态
    document.documentElement.classList.remove('zen-screensaver-active');
    document.body.classList.remove('zen-screensaver-active');

    clearTimeout(zenIdleTimer);
    window.removeEventListener('mousemove', resetZenIdle);
    window.removeEventListener('touchstart', resetZenIdle);
    window.removeEventListener('keydown', onZenKeyDown);

    // 退出系统/浏览器全屏
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      } catch (e) {}
    }
  }

  function updateTick() {
    const now = new Date();
    const rates = getRates();
    const todayIsRest = isDateRestDay(now, cfg.restMode);

    // 1. 翻页时钟更新
    const hhEl = document.getElementById('ckFlipHH');
    const mmEl = document.getElementById('ckFlipMM');
    const ssEl = document.getElementById('ckFlipSS');
    const dateEl = document.getElementById('ckDateLine');

    if (hhEl) hhEl.textContent = pad2(now.getHours());
    if (mmEl) mmEl.textContent = pad2(now.getMinutes());
    if (ssEl) ssEl.textContent = pad2(now.getSeconds());

    const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (dateEl) {
      const salaryDisplay = cfg.maskSalary ? '¥ *****/月' : `¥ ${rates.salary.toLocaleString()}/月`;
      const lunarStr = getLunarDateString(now);
      dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${weekNames[now.getDay()]}${lunarStr ? ' · ' + lunarStr : ''} (${rates.restDesc}) · 设定 ${salaryDisplay}`;
    }

    // 2. 计算今日工时进度与实时已赚窝囊费（严禁下班后或休息日无故乱加钱！）
    const startOfTodayWork = new Date(now.getFullYear(), now.getMonth(), now.getDate(), rates.st.h, rates.st.m, 0, 0);
    const endOfTodayWork = new Date(now.getFullYear(), now.getMonth(), now.getDate(), rates.et.h, rates.et.m, 0, 0);

    let baseEarnedToday = 0;
    let progressPct = 0;
    let statusText = '🟢 工位带薪搬砖中';
    let eyebrowText = '💰 今日在工位已赚窝囊费';
    let rateSubText = `日薪 ¥${rates.dailySalary.toFixed(1)}  ·  每秒入账 ¥${rates.perSecond.toFixed(4)}  ·  呼吸都在赚钱`;

    if (todayIsRest) {
      // 今天是休息日：正班薪资为 0，不再跳字加钱
      baseEarnedToday = 0;
      progressPct = 100;
      statusText = '🏖️ 今日休假不计薪 · 尽情享受生活';
      eyebrowText = '🏖️ 今日休假中 · 工位正班计薪已暂停';
      rateSubText = `休息日正班不计薪 (日薪标准 ¥${rates.dailySalary.toFixed(1)}) · 如被叫去加班请点下方按钮`;
    } else if (now < startOfTodayWork) {
      // 工作日早于上班打卡时间：正班薪资为 0
      baseEarnedToday = 0;
      progressPct = 0;
      statusText = '🌅 尚未到岗打卡 · 等待到点计薪';
      eyebrowText = `🌅 尚未到 ${cfg.startTime} 上班时间 · 到点自动开始计薪`;
      rateSubText = `日薪 ¥${rates.dailySalary.toFixed(1)}  ·  到岗后每秒入账 ¥${rates.perSecond.toFixed(4)}`;
    } else if (now <= endOfTodayWork) {
      // 工作日正常上班时段：实时增加窝囊费
      const elapsedSec = (now - startOfTodayWork) / 1000;
      baseEarnedToday = elapsedSec * rates.perSecond;
      progressPct = Math.min(100, (elapsedSec / rates.workSeconds) * 100);
      if (now.getHours() === 12) {
        statusText = '🍱 午休干饭回血 · 照常带薪入账中';
      } else {
        statusText = '🟢 工位带薪搬砖 · 每一秒都没白挨';
      }
      eyebrowText = '💰 今日在工位已赚窝囊费';
      rateSubText = `日薪 ¥${rates.dailySalary.toFixed(1)}  ·  每秒入账 +¥${rates.perSecond.toFixed(4)}  ·  呼吸都在赚钱`;
    } else {
      // 工作日已过下班时间：正班薪资封顶停止跳字！除非开启「付费加班」
      baseEarnedToday = rates.dailySalary;
      progressPct = 100;
      statusText = '🛑 已到点下班 · 今日正班窝囊费已封顶';
      eyebrowText = `🎉 已过 ${cfg.endTime} 下班时间 · 今日正班薪资已全额入袋`;
      rateSubText = `今日正班日薪 ¥${rates.dailySalary.toFixed(1)} 已封顶 (每秒 +¥0.0000) · 若还在工位请点下方加班按钮`;
    }

    // 处理加班模式（付费加班 vs 无偿加班）
    let earnedToday = baseEarnedToday;
    const otSec = getOvertimeSeconds(now, todayIsRest, startOfTodayWork, endOfTodayWork);
    const otBannerEl = document.getElementById('ckOvertimeBanner');

    if (overtimeMode === 'paid') {
      const otEarned = otSec * rates.perSecond * rates.otMult;
      earnedToday = baseEarnedToday + otEarned;
      statusText = `💸 付费加班搞钱中 (${rates.otMult}倍计薪)`;
      eyebrowText = todayIsRest
        ? `💸 休息日付费加班中 (${rates.otMult}倍加班费实时入账)`
        : `💸 延时付费加班中 (正班薪资 + ${rates.otMult}倍加班费)`;
      rateSubText = `加班每秒入账 +¥${(rates.perSecond * rates.otMult).toFixed(4)}  ·  已加班 ${formatDurationCN(otSec)}  ·  加班费 +¥${otEarned.toFixed(2)}`;
      if (otBannerEl) {
        otBannerEl.style.display = 'block';
        otBannerEl.className = 'ck-overtime-banner paid';
        otBannerEl.textContent = `💸 付费加班计薪中：按 ${rates.otMult} 倍时薪折算，已累计加班 ${formatDurationCN(otSec)}，额外多赚 +¥${otEarned.toFixed(3)}！`;
      }
    } else if (overtimeMode === 'unpaid') {
      // 无偿加班：一分钱都不增加！实时展示白送给老板的免费劳动价值
      earnedToday = baseEarnedToday;
      const freeLaborVal = otSec * rates.perSecond;
      statusText = '😭 无偿加班用爱发电 · 薪资已冻结';
      eyebrowText = '😭 无偿加班大冤种状态 · 窝囊费停止增加';
      rateSubText = `当前每秒入账 +¥0.0000 (纯纯用爱发电)  ·  正班薪资锁定 ¥${baseEarnedToday.toFixed(2)}`;
      if (otBannerEl) {
        otBannerEl.style.display = 'block';
        otBannerEl.className = 'ck-overtime-banner unpaid';
        otBannerEl.textContent = `😭 无偿加班用爱发电中 (+¥0.0000/秒)：已白送老板 ${formatDurationCN(otSec)}，相当于无偿倒贴工时价值 ¥${freeLaborVal.toFixed(2)}！快收拾书包跑路吧！`;
      }
    } else {
      if (otBannerEl) {
        otBannerEl.style.display = 'none';
      }
    }

    const statusTxtEl = document.getElementById('ckStatusText');
    const eyebrowEl = document.getElementById('ckHeroEyebrow');
    if (statusTxtEl) statusTxtEl.textContent = statusText;
    if (eyebrowEl) eyebrowEl.textContent = eyebrowText;

    const intPart = Math.floor(earnedToday);
    const decPart = (earnedToday - intPart).toFixed(4).substring(1); // .xxxx

    const intEl = document.getElementById('ckMoneyInt');
    const decEl = document.getElementById('ckMoneyDec');
    const rateSubEl = document.getElementById('ckRateSub');

    if (intEl) intEl.textContent = intPart.toLocaleString();
    if (decEl) decEl.textContent = decPart;
    if (rateSubEl) rateSubEl.textContent = rateSubText;

    // 3. 快乐等价物换算
    const milkteaCount = (earnedToday / 18).toFixed(1);
    const kfcCount = (earnedToday / 50).toFixed(1);
    const tissueCount = Math.floor(earnedToday / 3.5);

    const eqMilktea = document.getElementById('ckEqMilktea');
    const eqKfc = document.getElementById('ckEqKfc');
    const eqTissue = document.getElementById('ckEqTissue');
    if (eqMilktea) eqMilktea.textContent = milkteaCount;
    if (eqKfc) eqKfc.textContent = kfcCount;
    if (eqTissue) eqTissue.textContent = tissueCount;

    // 4. 带薪摸鱼专项计时器跳字
    let curSlackMs = slackAccumulatedMs;
    if (isSlacking) {
      curSlackMs += (performance.now() - slackStartMs);
    }
    const slackSec = curSlackMs / 1000;
    const slackMoney = slackSec * rates.perSecond;

    const slackTimeEl = document.getElementById('ckSlackTime');
    const slackEarnedEl = document.getElementById('ckSlackEarnedVal');
    if (slackTimeEl) {
      slackTimeEl.textContent = formatDurationHMS(slackSec);
    }
    if (slackEarnedEl) {
      slackEarnedEl.textContent = `¥ ${slackMoney.toFixed(3)}`;
    }

    // 5. 四大扎心倒计时更新（严格根据单双休制度统一状态，绝不自相矛盾！）
    const cdOffLabel = document.getElementById('ckCdOffworkLabel');
    const cdOffEl = document.getElementById('ckCdOffwork');
    const cdOffBar = document.getElementById('ckCdOffworkBar');
    const cdOffSub = document.getElementById('ckCdOffworkSub');

    const cdFriLabel = document.getElementById('ckCdFridayLabel');
    const cdFriEl = document.getElementById('ckCdFriday');
    const cdFriSub = document.getElementById('ckCdFridaySub');

    if (todayIsRest) {
      // 今日是休息日
      if (overtimeMode === 'none') {
        if (cdOffLabel) cdOffLabel.textContent = '🏖️ 今日休假状态';
        if (cdOffEl) cdOffEl.textContent = '今日休假中';
        if (cdOffBar) cdOffBar.style.width = '100%';
        if (cdOffSub) cdOffSub.textContent = `当前为${rates.restDesc}，今天不用打卡上班！`;

        if (cdFriLabel) cdFriLabel.textContent = '🎉 周末狂欢状态';
        if (cdFriEl) cdFriEl.textContent = '周末狂欢中';
        if (cdFriSub) cdFriSub.textContent = '🍻 好好享受属于你的自由假期，禁止思考工作！';
      } else {
        if (cdOffLabel) cdOffLabel.textContent = overtimeMode === 'paid' ? '💸 休息日付费加班中' : '😭 休息日无偿加班中';
        if (cdOffEl) cdOffEl.textContent = formatDurationHMS(otSec);
        if (cdOffBar) cdOffBar.style.width = '100%';
        if (cdOffSub) {
          cdOffSub.textContent = overtimeMode === 'paid'
            ? `已按 ${rates.otMult} 倍计薪加班 ${formatDurationCN(otSec)}，早点收工休息`
            : '🚨 休息日无偿加班 ¥0/秒，建议立刻合上电脑逃跑！';
        }

        if (cdFriLabel) cdFriLabel.textContent = '😭 周末被抓来加班';
        if (cdFriEl) cdFriEl.textContent = '周末泡汤中';
        if (cdFriSub) cdFriSub.textContent = '本来该在被窝狂欢，结果在工位当牛马';
      }
    } else {
      // 今日是正常工作日
      if (now < startOfTodayWork) {
        const waitSec = Math.max(0, Math.floor((startOfTodayWork - now) / 1000));
        if (cdOffLabel) cdOffLabel.textContent = '🌅 距离今日上班打卡';
        if (cdOffEl) cdOffEl.textContent = formatDurationHMS(waitSec);
        if (cdOffBar) cdOffBar.style.width = '0%';
        if (cdOffSub) cdOffSub.textContent = `今日 ${cfg.startTime} 准时开工，先喝杯咖啡喘口气`;
      } else if (now <= endOfTodayWork) {
        const remSec = Math.max(0, Math.floor((endOfTodayWork - now) / 1000));
        if (cdOffLabel) cdOffLabel.textContent = '🏃 距离今日下班解放';
        if (cdOffEl) cdOffEl.textContent = formatDurationHMS(remSec);
        if (cdOffBar) cdOffBar.style.width = `${progressPct.toFixed(1)}%`;
        if (cdOffSub) cdOffSub.textContent = `今日工时已熬过 ${progressPct.toFixed(1)}%，再撑 ${Math.ceil(remSec / 60)} 分钟解放`;
      } else {
        // 已过今日下班点
        if (overtimeMode === 'none') {
          if (cdOffLabel) cdOffLabel.textContent = '🏃 今日下班状态';
          if (cdOffEl) cdOffEl.textContent = '已到点下班';
          if (cdOffBar) cdOffBar.style.width = '100%';
          if (cdOffSub) cdOffSub.textContent = `🎉 已过 ${cfg.endTime} 下班时间，快背上书包合法溜号！`;
        } else {
          if (cdOffLabel) cdOffLabel.textContent = overtimeMode === 'paid' ? '💸 下班后延时加班' : '😭 下班后无偿加班';
          if (cdOffEl) cdOffEl.textContent = formatDurationHMS(otSec);
          if (cdOffBar) cdOffBar.style.width = '100%';
          if (cdOffSub) {
            cdOffSub.textContent = overtimeMode === 'paid'
              ? `💸 正在累计 ${rates.otMult} 倍延时加班费，注意身体`
              : '😭 无偿加班一分钱不加，快关电脑跑路吧！';
          }
        }
      }

      // 计算距离本轮周末放假还有多久（根据单休/双休自动识别周五下班或周六下班）
      if (cfg.restMode === 'none') {
        if (cdFriLabel) cdFriLabel.textContent = '🐂 全勤排班状态';
        if (cdFriEl) cdFriEl.textContent = '全年无休模式';
        if (cdFriSub) cdFriSub.textContent = '可在下方设置切换为「双休」或「单休」';
      } else {
        const dayOfWeek = now.getDay(); // 1..6 (0已被如果是休假拦截，若是single_sat则周日是工作日)
        const isSatWork = (cfg.restMode === 'single_sun' || cfg.restMode === 'bi_small');
        const targetWeekendDay = isSatWork ? 6 : 5; // 单休/小周盼周六下班，双休/大周盼周五下班
        const targetDayName = isSatWork ? '周六' : '周五';

        if (cdFriLabel) cdFriLabel.textContent = `🍻 距离${targetDayName}下班狂欢`;

        if (dayOfWeek === targetWeekendDay && now >= endOfTodayWork) {
          if (overtimeMode === 'none') {
            if (cdFriEl) cdFriEl.textContent = '周末狂欢中';
            if (cdFriSub) cdFriSub.textContent = `🎉 熬完${targetDayName}最后一班岗，正式进入周末假期！`;
          } else {
            if (cdFriEl) cdFriEl.textContent = '周末夜加班中';
            if (cdFriSub) cdFriSub.textContent = `😭 都到${targetDayName}下班点了还在工位加班！`;
          }
        } else {
          let daysToTarget = targetWeekendDay - dayOfWeek;
          if (daysToTarget < 0) daysToTarget += 7;
          const wkEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToTarget, rates.et.h, rates.et.m, 0);
          const diffSec = Math.max(0, Math.floor((wkEnd - now) / 1000));
          const fd = Math.floor(diffSec / 86400);
          const fh = Math.floor((diffSec % 86400) / 3600);
          const fm = Math.floor((diffSec % 3600) / 60);
          if (cdFriEl) cdFriEl.textContent = `${fd}天 ${pad2(fh)}时 ${pad2(fm)}分`;
          if (cdFriSub) cdFriSub.textContent = `距离${targetDayName} ${cfg.endTime} 下班放假，撑住就是胜利`;
        }
      }
    }

    // (c) 距离下次发薪日
    const cdPayEl = document.getElementById('ckCdPayday');
    const cdPaySub = document.getElementById('ckCdPaydaySub');
    const pDay = Math.min(28, Math.max(1, parseInt(cfg.payday, 10) || 15));
    let nextPayDate = new Date(now.getFullYear(), now.getMonth(), pDay, 9, 0, 0);
    if (now.getDate() === pDay) {
      if (cdPayEl) cdPayEl.textContent = '🎉 就是今天！';
      if (cdPaySub) cdPaySub.textContent = `每月 ${pDay} 号窝囊费到账日`;
    } else {
      if (now > nextPayDate) {
        nextPayDate = new Date(now.getFullYear(), now.getMonth() + 1, pDay, 9, 0, 0);
      }
      const payDays = Math.ceil((nextPayDate - now) / (1000 * 86400));
      if (cdPayEl) cdPayEl.textContent = `${payDays} 天`;
      if (cdPaySub) cdPaySub.textContent = `每月 ${pDay} 号准时回血`;
    }

    // (d) 距离下一个法定节假日
    const hol = getNextHoliday(now);
    const cdHolEl = document.getElementById('ckCdHoliday');
    const cdHolSub = document.getElementById('ckCdHolidaySub');
    if (cdHolEl) cdHolEl.textContent = `${hol.days} 天`;
    if (cdHolSub) cdHolSub.textContent = `距离【${hol.name}】放假`;

    // 6. 3D 拟真机械翻页全屏屏保同步更新
    if (isZenOpen) {
      updateZenScreensaver(now, rates, todayIsRest, startOfTodayWork, endOfTodayWork, earnedToday, progressPct, overtimeMode, otSec);
    }
  }

  function toggleSlacking() {
    const card = document.getElementById('ckSlackCard');
    const btn = document.getElementById('ckBtnSlack');

      if (!isSlacking) {
      // 开始摸鱼
      isSlacking = true;
      slackStartMs = performance.now();
      if (window.SFX && window.SFX.go) window.SFX.go();
      if (card) card.classList.add('slacking-active');
      if (btn) {
        btn.textContent = '⏸️ 结束本次摸鱼 (结算入档)';
        btn.classList.add('stop');
      }
    } else {
      // 结束摸鱼并结算归档（不自动弹窗下载图片，保存图片仅由底部按钮触发）
      isSlacking = false;
      slackAccumulatedMs += (performance.now() - slackStartMs);
      if (window.SFX && window.SFX.reveal) window.SFX.reveal();
      if (card) card.classList.remove('slacking-active');
      if (btn) {
        btn.textContent = '🐟 继续带薪摸鱼计时';
        btn.classList.remove('stop');
      }

      const rates = getRates();
      const totalSec = Math.max(1, Math.round(slackAccumulatedMs / 1000));
      const slackEarned = (totalSec * rates.perSecond).toFixed(2);

      lastClockRecord = {
        slackType: slackType,
        slackSeconds: totalSec,
        slackEarned: slackEarned,
        dailySalary: rates.dailySalary.toFixed(1),
        timeStr: new Date().toLocaleString('zh-CN', { hour12: false })
      };

      if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
        window.UniversalHistory.add({
          module: 'clock',
          title: `带薪摸鱼净赚 ¥${slackEarned}`,
          subtitle: `${slackType} · 耗时 ${totalSec} 秒 · 老板含泪买单`,
          color: '#FACC15',
          badge: '⏰ 摸鱼',
          avatar: '🐟',
          data: lastClockRecord
        });
      }
    }
  }

  // 生成《工位摸鱼发薪战报》高清分享图
  function drawClockPoster(record) {
    const rates = getRates();
    const intEl = document.getElementById('ckMoneyInt');
    const decEl = document.getElementById('ckMoneyDec');
    const todayEarnedStr = `${intEl ? intEl.textContent : '168'}${decEl ? decEl.textContent : '.8800'}`;

    const totalSec = record ? record.slackSeconds : Math.round(slackAccumulatedMs / 1000);
    const slackMoney = record ? record.slackEarned : (totalSec * rates.perSecond).toFixed(2);
    const sType = record ? record.slackType : slackType;

    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1620;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    ctx.fillStyle = isDark ? '#0B0E14' : '#F3F4F6';
    ctx.fillRect(0, 0, 1080, 1620);

    // 战报主卡片
    ctx.fillStyle = isDark ? '#151923' : '#FFFFFF';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 5;
    roundRect(ctx, 80, 90, 920, 1440, 36);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FACC15';
    ctx.font = '900 26px monospace';
    ctx.fillText('WORKSTATION SALARY & SLACKING REPORT', 540, 180);

    ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('工位带薪摸鱼 · 实时战报', 540, 265);

    // 今日累计窝囊费大字框
    ctx.fillStyle = isDark ? 'rgba(250, 204, 21, 0.10)' : 'rgba(250, 204, 21, 0.12)';
    roundRect(ctx, 140, 330, 800, 280, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText('💰 今日在工位已窝囊赚取', 540, 405);

    ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
    ctx.font = '900 84px monospace';
    ctx.fillText(`¥ ${todayEarnedStr}`, 540, 520);

    ctx.fillStyle = isDark ? '#9CA3AF' : '#4B5563';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`折合 🧋 ${(parseFloat(todayEarnedStr.replace(/,/g, '')) / 18).toFixed(1)} 杯生椰拿铁  |  🍗 ${(parseFloat(todayEarnedStr.replace(/,/g, '')) / 50).toFixed(1)} 顿疯狂星期四`, 540, 578);

    // 专项带薪摸鱼白嫖统计
    ctx.fillStyle = isDark ? 'rgba(34, 211, 238, 0.10)' : 'rgba(6, 182, 212, 0.08)';
    roundRect(ctx, 140, 660, 800, 240, 24);
    ctx.fill();
    ctx.strokeStyle = '#22D3EE';
    ctx.stroke();

    ctx.fillStyle = '#22D3EE';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText(`🐟 专项摸鱼科目：【${sType}】`, 540, 730);

    ctx.fillStyle = isDark ? '#FFFFFF' : '#0F172A';
    ctx.font = '900 46px system-ui, sans-serif';
    ctx.fillText(`耗时 ${totalSec} 秒 · 净白嫖老板 ¥ ${slackMoney}`, 540, 815);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('✦ 每一秒带薪发呆，都是对资本的温柔反击 ✦', 540, 868);

    // 打工人金句与印章
    ctx.textAlign = 'left';
    ctx.fillStyle = isDark ? '#D1D5DB' : '#374151';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('【工位生存哲学】', 150, 990);
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText('上班是为了下班，打卡是为了发薪。只要我摸鱼的速度够快，', 150, 1048);
    ctx.fillText('内耗就追不上我！今日份窝囊费已妥善入袋，功德圆满！', 150, 1096);

    // 红色盖章
    ctx.save();
    ctx.translate(540, 1270);
    ctx.rotate(-8 * Math.PI / 180);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 5;
    roundRect(ctx, -160, -55, 320, 110, 16);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#EF4444';
    ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillText('带薪摸鱼 · 功德无量', 0, 14);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '22px monospace';
    ctx.fillText('灵感人格研究所 · 摸鱼发薪实时时钟', 540, 1460);

    const a = document.createElement('a');
    a.download = `摸鱼发薪战报_${Date.now()}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    loadConfig();

    // 同步输入框初始值
    const inpSalary = document.getElementById('ckInpSalary');
    const inpPayday = document.getElementById('ckInpPayday');
    const inpStart = document.getElementById('ckInpStart');
    const inpEnd = document.getElementById('ckInpEnd');
    const inpRestMode = document.getElementById('ckInpRestMode');
    const inpOtRate = document.getElementById('ckInpOtRate');
    const btnRestQuick = document.getElementById('ckBtnRestQuick');

    function syncRestUi() {
      const meta = REST_MODE_META[cfg.restMode] || REST_MODE_META.double;
      if (inpRestMode) inpRestMode.value = cfg.restMode in REST_MODE_META ? cfg.restMode : 'double';
      if (btnRestQuick) btnRestQuick.textContent = meta.label;
    }

    if (inpSalary) {
      inpSalary.value = cfg.monthlySalary;
      inpSalary.oninput = () => {
        cfg.monthlySalary = Math.max(100, Number(inpSalary.value) || 12000);
        saveConfig();
        updateTick();
      };
    }
    if (inpRestMode) {
      syncRestUi();
      inpRestMode.onchange = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        cfg.restMode = inpRestMode.value || 'double';
        syncRestUi();
        saveConfig();
        updateTick();
      };
    }
    if (btnRestQuick) {
      syncRestUi();
      const cycleOrder = ['double', 'single_sun', 'bi_small', 'bi_big', 'none'];
      btnRestQuick.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const curIdx = cycleOrder.indexOf(cfg.restMode);
        cfg.restMode = cycleOrder[(curIdx + 1) % cycleOrder.length];
        syncRestUi();
        saveConfig();
        updateTick();
      };
    }
    if (inpOtRate) {
      inpOtRate.value = String(cfg.otRate || 1.5);
      inpOtRate.onchange = () => {
        cfg.otRate = Number(inpOtRate.value) || 1.5;
        saveConfig();
        updateTick();
      };
    }
    if (inpPayday) {
      inpPayday.value = cfg.payday;
      inpPayday.oninput = () => {
        cfg.payday = Math.min(31, Math.max(1, Number(inpPayday.value) || 15));
        saveConfig();
        updateTick();
      };
    }
    if (inpStart) {
      inpStart.value = cfg.startTime;
      inpStart.onchange = () => {
        cfg.startTime = inpStart.value || '09:00';
        saveConfig();
        updateTick();
      };
    }
    if (inpEnd) {
      inpEnd.value = cfg.endTime;
      inpEnd.onchange = () => {
        cfg.endTime = inpEnd.value || '18:00';
        saveConfig();
        updateTick();
      };
    }

    // 加班模式切换按钮 (正常上下班 / 付费加班 / 无偿加班)
    document.querySelectorAll('.ck-ot-btn').forEach(btn => {
      btn.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const mode = btn.dataset.ot || 'none';
        overtimeMode = mode;
        if (mode !== 'none') {
          otStartMs = Date.now();
          // 若在休息日开启付费加班，默认将加班倍率贴心设为 2.0（若之前为 1.5）
          const todayRest = isDateRestDay(new Date(), cfg.restMode);
          if (mode === 'paid' && todayRest && Number(cfg.otRate) === 1.5) {
            cfg.otRate = 2.0;
            if (inpOtRate) inpOtRate.value = '2.0';
            saveConfig();
          }
        } else {
          otStartMs = 0;
        }
        document.querySelectorAll('.ck-ot-btn').forEach(b => b.classList.toggle('active', b === btn));
        updateTick();
      };
    });

    // 隐私隐藏开关
    const btnMask = document.getElementById('ckBtnMask');
    if (btnMask) {
      btnMask.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        cfg.maskSalary = !cfg.maskSalary;
        if (inpSalary) inpSalary.type = cfg.maskSalary ? 'password' : 'number';
        btnMask.textContent = cfg.maskSalary ? '👁️ 显示月薪' : '🙈 隐藏月薪';
        saveConfig();
        updateTick();
      };
    }

    // 3D 拟真机械翻页全屏沉浸屏保开关
    const btnZen = document.getElementById('ckBtnZen');
    if (btnZen) {
      btnZen.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (isZenOpen) {
          closeZenScreensaver();
        } else {
          openZenScreensaver();
        }
      };
    }

    // 屏保内关闭按钮
    const zenBtnClose = document.getElementById('zenBtnClose');
    if (zenBtnClose) {
      zenBtnClose.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        closeZenScreensaver();
      };
    }

    // 屏保背景双击退出
    const zenOverlay = document.getElementById('ckZenOverlay');
    if (zenOverlay) {
      zenOverlay.ondblclick = (e) => {
        if (!e.target.closest('.zen-topbar') && !e.target.closest('.zen-mode-pills')) {
          closeZenScreensaver();
        }
      };
    }

    // 监听系统/浏览器全屏变化：用户通过 ESC 键或系统手势退出全屏时同步退出屏保
    function onFullscreenChange() {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFs && isZenOpen) {
      if (window.AppRouter && typeof window.AppRouter.dismissLayer === 'function') {
        window.AppRouter.dismissLayer('clock');
      } else {
        closeZenScreensaver({ fromRouter: true, domOnly: true });
      }
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    // 屏保三大倒计时模式胶囊切换
    document.querySelectorAll('.zen-mode-pill').forEach(pill => {
      pill.onclick = (e) => {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const mode = pill.dataset.zenMode || 'offwork';
        zenMode = mode;
        document.querySelectorAll('.zen-mode-pill').forEach(p => p.classList.toggle('active', p === pill));
        // 重置卡片缓存属性，确保模式切换后能立即渲染最新数值
        ['zenCardDD', 'zenCardHH', 'zenCardMM', 'zenCardSS'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.removeAttribute('data-val');
        });
        updateTick();
      };
    });

    // 摸鱼科目切换
    document.querySelectorAll('.ck-stag').forEach(tag => {
      tag.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        slackType = tag.dataset.stype;
        document.querySelectorAll('.ck-stag').forEach(t => t.classList.toggle('active', t === tag));
      };
    });

    // 带薪摸鱼按钮
    const btnSlack = document.getElementById('ckBtnSlack');
    if (btnSlack) btnSlack.onclick = toggleSlacking;

    // 战报生成按钮
    const btnPoster = document.getElementById('ckBtnPoster');
    if (btnPoster) {
      btnPoster.onclick = () => {
        if (window.SFX && window.SFX.save) window.SFX.save();
        const rates = getRates();
        const curSec = Math.round((slackAccumulatedMs + (isSlacking ? performance.now() - slackStartMs : 0)) / 1000);
        const rec = {
          slackType: slackType,
          slackSeconds: curSec,
          slackEarned: (curSec * rates.perSecond).toFixed(2),
          dailySalary: rates.dailySalary.toFixed(1)
        };
        if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
          const intEl = document.getElementById('ckMoneyInt');
          window.UniversalHistory.add({
            module: 'clock',
            title: `今日已赚窝囊费 ¥${intEl ? intEl.textContent : '168'}`,
            subtitle: `日薪 ¥${rates.dailySalary.toFixed(0)} · ${slackType}白嫖 ¥${rec.slackEarned}`,
            color: '#FACC15',
            badge: '⏰ 摸鱼',
            avatar: '🐟',
            data: rec
          });
        }
        drawClockPoster(rec);
      };
    }

    updateTick();
    if (tickerInterval) clearInterval(tickerInterval);
    tickerInterval = setInterval(updateTick, 100);
  }

  function restore(recordData) {
    init();
    if (recordData && recordData.slackSeconds) {
      slackAccumulatedMs = recordData.slackSeconds * 1000;
      updateTick();
    }
  }

  window.AppClock = {
    init,
    refreshLunar,
    restore,
    toggleSlacking,
    drawClockPoster,
    openZenScreensaver,
    closeZenScreensaver
  };
})();

;
/* === js/modules/merit.js === */
/* =========================================================
   模块 9：静心功德局 · 电子木鱼 & 怨气粉碎机 (Cyber Merit & Stress Relief)
   三大解压法器：电子木鱼 / 无尽减压泡泡纸 / 怨气碎纸机与火盆
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'juice_merit_state_v1';

  let state = {
    todayMerit: 0,
    totalMerit: 0,
    poppedCount: 0,
    shreddedCount: 0,
    lastDate: ''
  };

  let curSubmod = 'muyu';
  let curChant = '功德 +1';
  let curChantVal = 1;
  let curSoundMode = 'wood'; // 'wood' | 'bowl' | 'duck'
  let autoTimer = null;
  let isPointerDownOnBubbles = false;
  let isDestroying = false;

  // Web Audio 合成器上下文
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isSfxMuted() {
    return window.SFX && typeof window.SFX.isMuted === 'function' && window.SFX.isMuted();
  }

  // 合成逼真木鱼 / 颂钵 / 功德鸭 / 捏泡泡 / 碎纸音效
  function playMeritSound(type) {
    if (isSfxMuted()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'wood') {
      // 檀木鱼：低频空腔共鸣 + 瞬态木槌敲击
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(195, now);
      osc1.frequency.exponentialRampToValueAtTime(142, now + 0.14);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(585, now);
      osc2.frequency.exponentialRampToValueAtTime(290, now + 0.06);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.19);
      osc2.stop(now + 0.19);
    } else if (type === 'bowl') {
      // 藏式静心颂钵：悠长空灵泛音
      [432, 648, 864].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const startVol = [0.28, 0.14, 0.07][idx];
        gain.gain.setValueAtTime(startVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } else if (type === 'duck') {
      // 功德小黄鸭：滑音谐振
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.18);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'pop') {
      // 塑料泡泡清脆爆破音（随机微调音高）
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = 320 + Math.random() * 180;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.6, now + 0.045);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'goldpop') {
      // 黄金泡泡暴击音效
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.22, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.24);
      });
    } else if (type === 'shred') {
      // 拟真碎纸机音效：低频电机嗡鸣 + 连续带节奏的纸张刀片咬合切割声 (1.5秒)
      const dur = 1.5;
      const motor = ctx.createOscillator();
      const motorGain = ctx.createGain();
      motor.type = 'sawtooth';
      motor.frequency.setValueAtTime(118, now);
      motor.frequency.linearRampToValueAtTime(104, now + dur);
      motorGain.gain.setValueAtTime(0.06, now);
      motorGain.gain.exponentialRampToValueAtTime(0.005, now + dur);
      motor.connect(motorGain);
      motorGain.connect(ctx.destination);
      motor.start(now);
      motor.stop(now + dur);

      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const pulse = 0.55 + 0.45 * Math.sin(t * 68);
        data[i] = (Math.random() * 2 - 1) * pulse;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1350, now);
      filter.Q.setValueAtTime(1.8, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.setValueAtTime(0.24, now + dur * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.008, now + dur);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === 'burn') {
      // 拟真火焰焚烧噼啪声：低沉火浪呼啸 + 高频火星爆裂噼啪声 (1.55秒)
      const dur = 1.55;
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const crackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 2.8 : (Math.random() * 2 - 1) * 0.45;
        data[i] = crackle * Math.exp(-i / (ctx.sampleRate * 1.1));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    }
  }

  function loadState() {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...state, ...parsed };
      }
    } catch (e) {}
    if (state.lastDate !== todayStr) {
      state.todayMerit = 0;
      state.lastDate = todayStr;
      saveState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function getMeritRank(total) {
    if (total >= 10000) return '👑 大威天龙功德神';
    if (total >= 3000) return '🪷 功德圆满活佛';
    if (total >= 1000) return '🧘 人间清醒禅师';
    if (total >= 300) return '📿 工位静心大师';
    if (total >= 88) return '🕯️ 情绪稳定居士';
    return '🌱 初级牛马行者';
  }

  function updateStatsBanner() {
    const elToday = document.getElementById('mrStatToday');
    const elTotal = document.getElementById('mrStatTotal');
    const elPopped = document.getElementById('mrStatPopped');
    const elRank = document.getElementById('mrStatRank');

    if (elToday) elToday.textContent = state.todayMerit.toLocaleString();
    if (elTotal) elTotal.textContent = state.totalMerit.toLocaleString();
    if (elPopped) elPopped.textContent = state.poppedCount.toLocaleString();
    if (elRank) elRank.textContent = getMeritRank(state.totalMerit);
  }

  function addMerit(amount) {
    state.todayMerit += amount;
    state.totalMerit += amount;
    saveState();
    updateStatsBanner();
  }

  // 渲染高光檀木鎏金电子木鱼与木槌 SVG
  function renderMuyuSvg() {
    const box = document.getElementById('mrMuyuSvgBox');
    if (!box) return;
    box.innerHTML = `
      <div class="muyu-ripple"></div>
      <svg viewBox="0 0 220 180" width="200" height="164" style="filter: drop-shadow(0 14px 24px rgba(0,0,0,0.45));">
        <defs>
          <radialGradient id="g_muyu_body" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#FDE68A"/>
            <stop offset="28%" stop-color="#D97706"/>
            <stop offset="72%" stop-color="#92400E"/>
            <stop offset="100%" stop-color="#451A03"/>
          </radialGradient>
          <linearGradient id="g_muyu_pad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#991B1B"/>
            <stop offset="50%" stop-color="#DC2626"/>
            <stop offset="100%" stop-color="#7F1D1D"/>
          </linearGradient>
        </defs>
        <!-- 锦缎莲花坐垫 -->
        <ellipse cx="110" cy="152" rx="76" ry="18" fill="url(#g_muyu_pad)" stroke="#F59E0B" stroke-width="2.5"/>
        <ellipse cx="110" cy="148" rx="64" ry="12" fill="none" stroke="rgba(253,230,138,0.45)" stroke-width="1.5" stroke-dasharray="6 4"/>
        <!-- 木鱼饱满圆润主体 -->
        <path d="M38,108 C34,58 68,28 112,28 C158,28 186,60 182,108 C180,138 152,150 110,150 C68,150 40,138 38,108 Z" fill="url(#g_muyu_body)" stroke="#78350F" stroke-width="2"/>
        <!-- 顶部温润高光 -->
        <ellipse cx="92" cy="54" rx="34" ry="13" transform="rotate(-10 92 54)" fill="rgba(255,255,255,0.28)"/>
        <!-- 木鱼共鸣音槽与鱼目雕刻 -->
        <path d="M40,106 Q110,122 178,104" fill="none" stroke="#290F02" stroke-width="9" stroke-linecap="round"/>
        <path d="M42,106 Q110,122 176,104" fill="none" stroke="#451A03" stroke-width="4" stroke-linecap="round"/>
        <circle cx="62" cy="105" r="9" fill="#290F02" stroke="#F59E0B" stroke-width="2"/>
        <circle cx="62" cy="105" r="3.5" fill="#FDE68A"/>
        <!-- 梵文金印纹饰 -->
        <text x="114" y="86" font-size="16" font-weight="900" fill="rgba(254,243,199,0.55)" text-anchor="middle" letter-spacing="3">MINDFUL ZEN</text>
      </svg>
      <div class="muyu-mallet">
        <svg viewBox="0 0 100 100" width="92" height="92">
          <line x1="25" y1="25" x2="82" y2="82" stroke="#B45309" stroke-width="8" stroke-linecap="round"/>
          <circle cx="22" cy="22" r="15" fill="#F59E0B" stroke="#FEF3C7" stroke-width="2"/>
        </svg>
      </div>
    `;
  }

  function knockMuyu(clientX, clientY) {
    playMeritSound(curSoundMode);
    if (navigator.vibrate) {
      try { navigator.vibrate(10); } catch (e) {}
    }

    addMerit(curChantVal);

    const actor = document.getElementById('mrMuyuSvgBox');
    if (actor) {
      actor.classList.remove('hit');
      void actor.offsetWidth;
      actor.classList.add('hit');
      setTimeout(() => actor.classList.remove('hit'), 110);
    }

    // 生成飘字
    const layer = document.getElementById('mrMuyuFloatLayer');
    const stage = document.getElementById('mrMuyuStage');
    if (layer && stage) {
      const rect = stage.getBoundingClientRect();
      let x = rect.width / 2 + (Math.random() * 60 - 30);
      let y = rect.height * 0.36;
      if (typeof clientX === 'number' && clientX > 0) {
        x = Math.min(rect.width - 50, Math.max(50, clientX - rect.left));
        y = Math.min(rect.height - 60, Math.max(40, clientY - rect.top - 20));
      }

      const item = document.createElement('div');
      item.className = 'muyu-float-item';
      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
      item.textContent = curChant;
      layer.appendChild(item);
      setTimeout(() => item.remove(), 960);
    }
  }

  function toggleAutoKnock() {
    const btn = document.getElementById('mrBtnAutoMuyu');
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      if (btn) {
        btn.classList.remove('running');
        btn.textContent = '⚡ 开启自动连续敲击';
      }
    } else {
      knockMuyu();
      autoTimer = setInterval(() => {
        const mod = document.getElementById('mod-merit');
        if (!mod || !mod.classList.contains('active') || curSubmod !== 'muyu') return;
        knockMuyu();
      }, 650);
      if (btn) {
        btn.classList.add('running');
        btn.textContent = '⏸️ 自动连续敲击攒功德中...';
      }
    }
  }

  /* =========================================================
     子模式 2：无尽减压泡泡纸 (Bubble Wrap)
     ========================================================= */
  const POP_WORDS = ['爽!', '噗!', '解压+1', '内耗-1', '舒坦', '波~', '焦虑-1'];
  let sheetPopped = 0;
  const SHEET_TOTAL = 36;

  function renderBubbleSheet() {
    const grid = document.getElementById('mrBubbleGrid');
    const toast = document.getElementById('mrBubbleToast');
    if (!grid) return;

    sheetPopped = 0;
    if (toast) toast.classList.remove('show');
    updateBubbleProgress();

    // 随机选 2 颗作为黄金暴击泡泡
    const goldIdx1 = Math.floor(Math.random() * SHEET_TOTAL);
    let goldIdx2 = Math.floor(Math.random() * SHEET_TOTAL);
    if (goldIdx2 === goldIdx1) goldIdx2 = (goldIdx1 + 7) % SHEET_TOTAL;

    grid.innerHTML = '';
    for (let i = 0; i < SHEET_TOTAL; i++) {
      const btn = document.createElement('button');
      const isGold = i === goldIdx1 || i === goldIdx2;
      btn.className = 'bubble-cell' + (isGold ? ' golden' : '');
      btn.dataset.gold = isGold ? '1' : '0';
      btn.setAttribute('aria-label', isGold ? '黄金减压泡泡' : '减压泡泡');

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isPointerDownOnBubbles = true;
        popBubbleCell(btn);
      });

      btn.addEventListener('pointerenter', () => {
        if (isPointerDownOnBubbles) {
          popBubbleCell(btn);
        }
      });

      grid.appendChild(btn);
    }
  }

  function popBubbleCell(cell) {
    if (!cell || cell.classList.contains('popped')) return;
    cell.classList.add('popped');
    const isGold = cell.dataset.gold === '1';

    if (isGold) {
      playMeritSound('goldpop');
      cell.textContent = '暴富!';
      addMerit(10);
    } else {
      playMeritSound('pop');
      cell.textContent = POP_WORDS[Math.floor(Math.random() * POP_WORDS.length)];
      addMerit(1);
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(isGold ? [15, 30, 20] : 8); } catch (e) {}
    }

    sheetPopped++;
    state.poppedCount++;
    saveState();
    updateStatsBanner();
    updateBubbleProgress();

    if (sheetPopped >= SHEET_TOTAL) {
      const toast = document.getElementById('mrBubbleToast');
      if (toast) toast.classList.add('show');
      if (window.SFX && window.SFX.reveal) window.SFX.reveal();
    }
  }

  function updateBubbleProgress() {
    const el = document.getElementById('mrBubbleSheetProgress');
    if (el) {
      el.innerHTML = `当前整张进度：<b>${sheetPopped} / ${SHEET_TOTAL}</b> 颗（支持按住滑动连环捏爆）`;
    }
  }

  /* =========================================================
     子模式 3：怨气碎纸机 & 除秽火盆 (Shredder)
     ========================================================= */
  const SHRED_QUOTES = [
    '✨ 粉碎完成！该破防事项已从宇宙时间线彻底抹除，功德 +10！',
    '🔥 焚化完毕！所有水逆与甩锅晦气已反弹回始作俑者，功德 +10！',
    '⚡ 烦恼清除成功！今日份精神内耗已转化为纯正摸鱼能量，功德 +10！',
    '🛡️ 物理级销毁达成！没人能再拿这件事消耗你的乳腺与发际线！'
  ];

  function triggerDestroy(mode) {
    if (isDestroying) return;
    const stage = document.getElementById('mrShredStage');
    const note = document.getElementById('mrShredPaper');
    const textarea = document.getElementById('mrShredInput');
    const stripsBox = document.getElementById('mrShredStrips');
    const fireLayer = document.getElementById('mrShredFireLayer');
    const fxBox = document.getElementById('mrShredFxBox');
    const slotTitle = document.getElementById('mrShredSlotTitle');
    const msgEl = document.getElementById('mrShredResultMsg');

    if (!note || !textarea) return;
    const textVal = textarea.value.trim() || '不可名状的上班怨气与精神内耗';
    // 如果用户没写字，把默认字填进纸条，让用户亲眼看着字被切碎/烧掉！
    if (!textarea.value.trim()) {
      textarea.value = textVal;
    }

    isDestroying = true;
    playMeritSound(mode === 'burn' ? 'burn' : 'shred');
    if (navigator.vibrate) {
      try { navigator.vibrate([30, 50, 30, 50, 40]); } catch (e) {}
    }

    if (stage) stage.classList.add('vibrating');

    if (mode === 'burn') {
      if (slotTitle) slotTitle.textContent = '🔥 三昧真火高温焚化炉运转中 🔥';
      if (msgEl) msgEl.textContent = '🔥 正在启动三昧真火将怨气烧成灰烬……';
      note.classList.add('burning');

      // 在进纸视窗生成多束升腾烈焰与飞舞火星
      if (fireLayer) {
        fireLayer.innerHTML = '';
        for (let i = 0; i < 12; i++) {
          const tongue = document.createElement('div');
          tongue.className = 'burn-flame-tongue';
          tongue.style.left = `${4 + i * 8 + (Math.random() * 4 - 2)}%`;
          tongue.style.animationDelay = `${(Math.random() * 0.22).toFixed(2)}s`;
          fireLayer.appendChild(tongue);
        }
        for (let j = 0; j < 26; j++) {
          const ember = document.createElement('div');
          ember.className = 'burn-ember';
          ember.style.left = `${8 + Math.random() * 84}%`;
          ember.style.setProperty('--ex', `${(Math.random() * 60 - 30).toFixed(1)}px`);
          ember.style.animationDelay = `${(Math.random() * 0.65).toFixed(2)}s`;
          fireLayer.appendChild(ember);
        }
      }
    } else {
      if (slotTitle) slotTitle.textContent = '⚙️ 高压钛合金刀辊高速咬合切碎中 ⚙️';
      if (msgEl) msgEl.textContent = '⚙️ 正在将破防便签卷入刀辊切成 16 缕碎纸条……';
      note.classList.add('shredding');

      // 根据用户输入的真实文本生成 16 根带残字的竖向碎纸条，从刀口下方同步吐出
      if (stripsBox) {
        stripsBox.classList.remove('active');
        const cleanChars = textVal.replace(/\s+/g, '');
        const stripCount = 16;
        let html = '';
        for (let i = 0; i < stripCount; i++) {
          // 每一根纸条截取对应的残字
          let stripChars = '';
          for (let r = 0; r < 5; r++) {
            const chIdx = (i + r * 3) % cleanChars.length;
            stripChars += cleanChars[chIdx] || '碎';
          }
          const delay = ((i % 4) * 0.03 + Math.random() * 0.04).toFixed(2);
          const dx = ((i - stripCount / 2) * 1.8 + (Math.random() * 6 - 3)).toFixed(1);
          const rotMid = ((Math.random() * 8 - 4)).toFixed(1);
          const rotEnd = ((i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 14)).toFixed(1);
          html += `<div class="shred-strip" style="--delay:${delay}s;--dx:${dx}px;--rotMid:${rotMid}deg;--rotEnd:${rotEnd}deg;">${stripChars}</div>`;
        }
        stripsBox.innerHTML = html;
        void stripsBox.offsetWidth;
        stripsBox.classList.add('active');
      }

      // 同时在集屑仓喷溅细碎纸屑颗粒
      if (fxBox) {
        fxBox.querySelectorAll('.shred-crumb').forEach(el => el.remove());
        for (let k = 0; k < 18; k++) {
          const crumb = document.createElement('div');
          crumb.className = 'shred-crumb';
          crumb.style.left = `${12 + Math.random() * 76}%`;
          crumb.style.setProperty('--cx', `${(Math.random() * 70 - 35).toFixed(1)}px`);
          crumb.style.setProperty('--cr', `${Math.floor(Math.random() * 360 - 180)}deg`);
          crumb.style.animationDelay = `${(0.15 + Math.random() * 0.75).toFixed(2)}s`;
          fxBox.appendChild(crumb);
        }
      }
    }

    setTimeout(() => {
      if (stage) stage.classList.remove('vibrating');
      if (slotTitle) slotTitle.textContent = '▼ 高压钛合金碎纸刀辊 · 除秽焚化炉 ▼';

      state.shreddedCount++;
      addMerit(10);
      if (window.SFX && window.SFX.reveal) window.SFX.reveal();

      const quote = SHRED_QUOTES[Math.floor(Math.random() * SHRED_QUOTES.length)];
      if (msgEl) msgEl.textContent = `【已清运 ${state.shreddedCount} 件】${quote}`;

      // 恢复空白新便签纸
      note.classList.remove('shredding', 'burning');
      if (stripsBox) {
        stripsBox.classList.remove('active');
        stripsBox.innerHTML = '';
      }
      if (fireLayer) fireLayer.innerHTML = '';
      if (fxBox) fxBox.querySelectorAll('.shred-crumb').forEach(el => el.remove());

      textarea.value = '';
      textarea.placeholder = `上一条「${textVal.slice(0, 12)}…」已彻底粉碎清零！还有什么不爽继续写下来销毁…`;
      isDestroying = false;
    }, 1680);
  }

  /* =========================================================
     生成《静心功德与怨气清运凭证》高清分享海报
     ========================================================= */
  function drawMeritPoster() {
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1620;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    // 背景
    ctx.fillStyle = isDark ? '#111018' : '#FAF7F2';
    ctx.fillRect(0, 0, 1080, 1620);

    // 外框卡片
    ctx.fillStyle = isDark ? '#1B1926' : '#FFFFFF';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 5;
    roundRect(ctx, 80, 80, 920, 1460, 36);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 26px monospace';
    ctx.fillText('MINDFUL MERIT & STRESS RELIEF CERTIFICATE', 540, 175);

    ctx.fillStyle = isDark ? '#FFFFFF' : '#1E1B18';
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('静心功德与怨气清运凭证', 540, 260);

    // 禅修境界勋章
    const rankTitle = getMeritRank(state.totalMerit);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    roundRect(ctx, 310, 305, 460, 68, 34);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillText(`当前果位：${rankTitle}`, 540, 351);

    // 三大功德数据格
    const cards = [
      { label: '🪵 累计敲击静心功德', val: `${state.totalMerit}`, unit: '点功德圆满', color: '#F59E0B' },
      { label: '🫧 累计捏爆减压泡泡', val: `${state.poppedCount}`, unit: '颗焦虑清零', color: '#22D3EE' },
      { label: '🔥 累计粉碎破防怨气', val: `${state.shreddedCount}`, unit: '件水逆退散', color: '#FB7185' }
    ];

    cards.forEach((c, idx) => {
      const y = 430 + idx * 210;
      ctx.fillStyle = isDark ? '#242134' : '#F3EFE6';
      roundRect(ctx, 140, y, 800, 180, 24);
      ctx.fill();
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = c.color;
      ctx.font = '800 28px system-ui, sans-serif';
      ctx.fillText(c.label, 185, y + 62);

      ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
      ctx.font = '900 64px monospace';
      ctx.fillText(c.val, 185, y + 142);

      ctx.textAlign = 'right';
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(c.unit, 895, y + 135);
    });

    // 静心箴言
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#E2E8F0' : '#334155';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('「敲最响的电子木鱼，捏最爽的减压泡泡，烧最烦的破防瞬间」', 540, 1135);
    ctx.font = '25px system-ui, sans-serif';
    ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
    ctx.fillText('经静心功德局核验：持证人今日体内怨气已 100% 物理超度，', 540, 1190);
    ctx.fillText('诸邪退散、Bug 清零、乳腺畅通、财源滚滚！', 540, 1235);

    // 朱砂印章
    ctx.save();
    ctx.translate(540, 1355);
    ctx.rotate(-7 * Math.PI / 180);
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 5;
    roundRect(ctx, -175, -52, 350, 104, 16);
    ctx.stroke();
    ctx.fillStyle = '#E11D48';
    ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillText('诸邪退散 · 功德无量', 0, 14);
    ctx.restore();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px monospace';
    ctx.fillText('灵感人格研究所 · 静心功德局', 540, 1485);

    const a = document.createElement('a');
    a.download = `静心功德凭证_${Date.now()}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function switchSubmod(sub) {
    curSubmod = sub;
    if (window.SFX && window.SFX.tap) window.SFX.tap();
    document.querySelectorAll('#mod-merit .mr-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.submod === sub);
    });
    document.querySelectorAll('#mod-merit .mr-substage').forEach(s => {
      s.classList.toggle('active', s.id === `mr-sub-${sub}`);
    });
  }

  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    loadState();
    renderMuyuSvg();
    renderBubbleSheet();
    updateStatsBanner();

    // 全局松开指针结束滑动捏泡泡
    window.addEventListener('pointerup', () => {
      isPointerDownOnBubbles = false;
    });

    // 绑定三大子法器切换
    document.querySelectorAll('#mod-merit .mr-tab').forEach(tab => {
      tab.onclick = () => switchSubmod(tab.dataset.submod);
    });

    // 绑定木鱼祈福词条切换
    document.querySelectorAll('#mod-merit .muyu-pill').forEach(pill => {
      pill.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curChant = pill.dataset.chant || '功德 +1';
        curChantVal = parseInt(pill.dataset.val || '1', 10);
        document.querySelectorAll('#mod-merit .muyu-pill').forEach(p => p.classList.toggle('active', p === pill));
      };
    });

    // 绑定木鱼舞台点击
    const muyuStage = document.getElementById('mrMuyuStage');
    if (muyuStage) {
      muyuStage.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        knockMuyu(e.clientX, e.clientY);
      });
    }

    // 绑定空格键敲木鱼
    window.addEventListener('keydown', (e) => {
      const mod = document.getElementById('mod-merit');
      if (!mod || !mod.classList.contains('active')) return;
      if (curSubmod === 'muyu' && e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        knockMuyu();
      }
    });

    // 绑定木鱼音色切换
    document.querySelectorAll('#mod-merit [data-muyu-sound]').forEach(btn => {
      btn.onclick = () => {
        curSoundMode = btn.dataset.muyuSound;
        playMeritSound(curSoundMode);
        document.querySelectorAll('#mod-merit [data-muyu-sound]').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // 绑定自动敲木鱼
    const btnAuto = document.getElementById('mrBtnAutoMuyu');
    if (btnAuto) btnAuto.onclick = toggleAutoKnock;

    // 绑定换一张泡泡纸
    const btnNewSheet = document.getElementById('mrBtnNewBubbleSheet');
    if (btnNewSheet) {
      btnNewSheet.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderBubbleSheet();
      };
    }

    // 绑定怨气预设词条点击填入
    document.querySelectorAll('#mod-merit .shred-preset-tag').forEach(tag => {
      tag.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const inp = document.getElementById('mrShredInput');
        if (inp) inp.value = tag.textContent.trim();
      };
    });

    // 绑定粉碎与火盆按钮
    const btnShred = document.getElementById('mrBtnDoShred');
    if (btnShred) btnShred.onclick = () => triggerDestroy('shred');

    const btnBurn = document.getElementById('mrBtnDoBurn');
    if (btnBurn) btnBurn.onclick = () => triggerDestroy('burn');

    // 绑定底部开具凭证与归档按钮
    const btnPoster = document.getElementById('mrBtnPoster');
    if (btnPoster) {
      btnPoster.onclick = () => {
        if (window.SFX && window.SFX.save) window.SFX.save();
        const rank = getMeritRank(state.totalMerit);
        if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
          window.UniversalHistory.add({
            module: 'merit',
            title: `${rank} · 功德 ${state.totalMerit}`,
            subtitle: `捏爆泡泡 ${state.poppedCount} 颗 · 粉碎怨气 ${state.shreddedCount} 件`,
            color: '#F59E0B',
            badge: '📿 功德',
            avatar: '🪵',
            data: { ...state }
          });
        }
        drawMeritPoster();
      };
    }
  }

  function restore(recordData) {
    init();
    if (recordData && typeof recordData.totalMerit === 'number') {
      state.totalMerit = Math.max(state.totalMerit, recordData.totalMerit);
      updateStatsBanner();
    }
  }

  window.AppMerit = {
    init,
    restore,
    knockMuyu,
    drawMeritPoster
  };
})();
