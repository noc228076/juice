/* =========================================================
   模块 8：摸鱼发薪实时时钟 (Cyber Slacking & Salary Ticker)
   扎心又快乐的工位时钟 · 毫秒级窝囊费跳字 · 带薪摸鱼计时 · 战报海报
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'juice_clock_config_v1';

  let cfg = {
    monthlySalary: 12000,
    workDays: 21.75,
    startTime: '09:00',
    endTime: '18:00',
    payday: 15,
    maskSalary: false
  };

  // 带薪摸鱼专项计时状态
  let isSlacking = false;
  let slackType = '🚽 带薪如厕';
  let slackStartMs = 0;
  let slackAccumulatedMs = 0;
  let tickerInterval = null;
  let lastClockRecord = null;

  function loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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

  function getRates() {
    const salary = Math.max(100, Number(cfg.monthlySalary) || 12000);
    const days = Math.max(1, Number(cfg.workDays) || 21.75);
    const dailySalary = salary / days;

    const st = parseHm(cfg.startTime, 9, 0);
    const et = parseHm(cfg.endTime, 18, 0);
    let workMinutes = (et.h * 60 + et.m) - (st.h * 60 + st.m);
    if (workMinutes <= 0) workMinutes = 540; // 默认 9 小时
    const workSeconds = workMinutes * 60;
    const perSecond = dailySalary / workSeconds;

    return { salary, days, dailySalary, st, et, workSeconds, perSecond };
  }

  function pad2(n) {
    return String(Math.floor(Math.max(0, n))).padStart(2, '0');
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

  function updateTick() {
    const now = new Date();
    const rates = getRates();

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
      dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${weekNames[now.getDay()]} · 设定 ${salaryDisplay}`;
    }

    // 2. 计算今日工时进度与实时已赚窝囊费
    const startOfTodayWork = new Date(now.getFullYear(), now.getMonth(), now.getDate(), rates.st.h, rates.st.m, 0, 0);
    const endOfTodayWork = new Date(now.getFullYear(), now.getMonth(), now.getDate(), rates.et.h, rates.et.m, 0, 0);

    let earnedToday = 0;
    let progressPct = 0;
    let statusText = '🟢 工位带薪搬砖计薪中';

    if (now < startOfTodayWork) {
      // 早于上班时间：展示昨日余温或呼吸模拟跳字
      const secSinceMidnight = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) + now.getMilliseconds() / 1000;
      earnedToday = secSinceMidnight * rates.perSecond * 0.25;
      progressPct = 0;
      statusText = '🌅 尚未到岗 · 赛博预热计薪中';
    } else if (now <= endOfTodayWork) {
      const elapsedSec = (now - startOfTodayWork) / 1000;
      earnedToday = elapsedSec * rates.perSecond;
      progressPct = Math.min(100, (elapsedSec / rates.workSeconds) * 100);
      if (now.getHours() === 12) {
        statusText = '🍱 午休干饭回血 · 照常计薪中';
      } else {
        statusText = '🟢 工位带薪搬砖 · 秒级暴富中';
      }
    } else {
      // 已过下班时间：正班满额 + 赛博加班呼吸微跳动，确保任何时刻打开都有毫秒跳字快感
      const overSec = (now - endOfTodayWork) / 1000;
      earnedToday = rates.dailySalary + overSec * rates.perSecond * 0.35;
      progressPct = 100;
      statusText = '🎉 今日正班窝囊费已满额 · 赛博延时跳表中';
    }

    const statusTxtEl = document.getElementById('ckStatusText');
    if (statusTxtEl) statusTxtEl.textContent = statusText;

    const intPart = Math.floor(earnedToday);
    const decPart = (earnedToday - intPart).toFixed(4).substring(1); // .xxxx

    const intEl = document.getElementById('ckMoneyInt');
    const decEl = document.getElementById('ckMoneyDec');
    const rateSubEl = document.getElementById('ckRateSub');

    if (intEl) intEl.textContent = intPart.toLocaleString();
    if (decEl) decEl.textContent = decPart;
    if (rateSubEl) {
      rateSubEl.textContent = `日薪 ¥${rates.dailySalary.toFixed(1)}  ·  每秒入账 ¥${rates.perSecond.toFixed(4)}  ·  呼吸都在赚钱`;
    }

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
      const sh = Math.floor(slackSec / 3600);
      const sm = Math.floor((slackSec % 3600) / 60);
      const ss = Math.floor(slackSec % 60);
      slackTimeEl.textContent = `${pad2(sh)}:${pad2(sm)}:${pad2(ss)}`;
    }
    if (slackEarnedEl) {
      slackEarnedEl.textContent = `¥ ${slackMoney.toFixed(3)}`;
    }

    // 5. 四大扎心倒计时更新
    // (a) 距离今日下班
    const cdOffEl = document.getElementById('ckCdOffwork');
    const cdOffBar = document.getElementById('ckCdOffworkBar');
    const cdOffSub = document.getElementById('ckCdOffworkSub');
    if (now < endOfTodayWork && now >= startOfTodayWork) {
      const remSec = Math.max(0, Math.floor((endOfTodayWork - now) / 1000));
      const rh = Math.floor(remSec / 3600);
      const rm = Math.floor((remSec % 3600) / 60);
      const rs = remSec % 60;
      if (cdOffEl) cdOffEl.textContent = `${pad2(rh)}:${pad2(rm)}:${pad2(rs)}`;
      if (cdOffBar) cdOffBar.style.width = `${progressPct.toFixed(1)}%`;
      if (cdOffSub) cdOffSub.textContent = `今日工时已熬过 ${progressPct.toFixed(1)}%`;
    } else {
      if (cdOffEl) cdOffEl.textContent = '00:00:00';
      if (cdOffBar) cdOffBar.style.width = '100%';
      if (cdOffSub) cdOffSub.textContent = '🎉 恭喜！当前处于下班自由时间';
    }

    // (b) 距离周五下班
    const cdFriEl = document.getElementById('ckCdFriday');
    const cdFriSub = document.getElementById('ckCdFridaySub');
    const dayOfWeek = now.getDay(); // 0 is Sun, 6 is Sat
    if (dayOfWeek === 0 || dayOfWeek === 6 || (dayOfWeek === 5 && now >= endOfTodayWork)) {
      if (cdFriEl) cdFriEl.textContent = '周末狂欢中';
      if (cdFriSub) cdFriSub.textContent = '🍻 尽情享受周末，禁止思考工作！';
    } else {
      const daysToFri = 5 - dayOfWeek;
      const friEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToFri, rates.et.h, rates.et.m, 0);
      const diffSec = Math.max(0, Math.floor((friEnd - now) / 1000));
      const fd = Math.floor(diffSec / 86400);
      const fh = Math.floor((diffSec % 86400) / 3600);
      const fm = Math.floor((diffSec % 3600) / 60);
      if (cdFriEl) cdFriEl.textContent = `${fd}天 ${pad2(fh)}时 ${pad2(fm)}分`;
      if (cdFriSub) cdFriSub.textContent = '撑住，胜利的曙光就在前方';
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
    ctx.fillText('CYBER WORKSTATION SALARY & SLACKING REPORT', 540, 180);

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

    if (inpSalary) {
      inpSalary.value = cfg.monthlySalary;
      inpSalary.oninput = () => {
        cfg.monthlySalary = Math.max(100, Number(inpSalary.value) || 12000);
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

    // 极简屏保模式开关
    const btnZen = document.getElementById('ckBtnZen');
    const modClock = document.getElementById('mod-clock');
    if (btnZen && modClock) {
      btnZen.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const isZen = modClock.classList.toggle('zen-mode');
        btnZen.textContent = isZen ? '🔙 退出屏保' : '🖥️ 极简屏保';
      };
    }

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
    restore,
    toggleSlacking,
    drawClockPoster
  };
})();
