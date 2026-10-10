/* 自我说明书 — SVG 图标库 + 报告页渲染 + Canvas 报告卡 */
(function () {
  'use strict';

  /* ============ 24×24 线性图标(stroke 风格) ============ */
  var ICONS = {
    battery: '<rect x="2.5" y="7.5" width="16" height="9" rx="2.5"/><path d="M21.5 10.5v3"/><path d="M11.5 9.5 9 12.2h3l-2.4 2.6"/>',
    bolt: '<path d="M13 2.5 4.8 13.4h6L9.6 21.5l8.7-11.4h-6.1L13 2.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.2a5.5 5.5 0 0 1-11 0V8ZM12 16.7V21"/>',
    plane: '<path d="M21.5 2.5 11 13M21.5 2.5l-6.8 19-3.7-8.5L2.5 9.3l19-6.8Z"/>',
    hourglass: '<path d="M6.5 3h11M6.5 21h11M7.5 3v2.4l4.5 6-4.5 6V21M16.5 3v2.4l-4.5 6 4.5 6V21"/>',
    mask: '<path d="M12 3.2c3.4 0 6.4.7 7.9 1.4-.3 6-2 13.6-7.9 16-5.9-2.4-7.6-10-7.9-16C5.6 3.9 8.6 3.2 12 3.2Z"/><path d="M8.6 9.3c.8-.8 2-.8 2.8 0M12.6 9.3c.8-.8 2-.8 2.8 0M9 13.4c1.8 1.8 4.2 1.8 6 0"/>',
    ghost: '<path d="M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.2-1.8-2.1 1.8-2.2-1.8-2.2 1.8-2.1-1.8-2.2 1.8Z"/><path d="M10 10.5v1.4M14 10.5v1.4"/>',
    gamepad: '<path d="M7 8.5h10c2.8 0 4.5 2.4 4.5 5.2 0 2.5-1.5 4.3-3.6 4.3-1.4 0-2.2-.8-2.9-2h-6c-.7 1.2-1.5 2-2.9 2-2.1 0-3.6-1.8-3.6-4.3C2.5 10.9 4.2 8.5 7 8.5Z"/><path d="M8 11v3.4M6.3 12.7h3.4"/><circle cx="15.6" cy="11.6" r=".9"/><circle cx="18" cy="13.6" r=".9"/>',
    snowflake: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8"/>',
    batterylow: '<rect x="2.5" y="7.5" width="16" height="9" rx="2.5"/><path d="M21.5 10.5v3"/><rect x="5.2" y="10.3" width="3.2" height="3.4" rx="1"/>',
    fish: '<path d="M6.8 12c2.4-3.8 5.8-5.8 9.2-5.8 2.6 0 4.6 2.4 5.2 5.8-.6 3.4-2.6 5.8-5.2 5.8-3.4 0-6.8-2-9.2-5.8Z"/><path d="M6.8 12 2.2 8.8v6.4L6.8 12Z"/><circle cx="17.6" cy="10.6" r=".7"/>',
    medal: '<circle cx="12" cy="9" r="5.2"/><path d="m9.2 13.4-2 7.1 4.8-2.4 4.8 2.4-2-7.1M12 6.8l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3.9-1.8Z"/>',
    gem: '<path d="M7 3.5h10l4 5.5-9 11.5L3 9l4-5.5ZM3 9h18M12 20.5 8.2 9M12 20.5 15.8 9"/>',
    crown: '<path d="m3.5 8 4.4 3.8L12 5l4.1 6.8L20.5 8l-1.7 10.5H5.2L3.5 8Z"/>',
    moon: '<path d="M20 14.2A8.6 8.6 0 1 1 9.8 4 6.8 6.8 0 0 0 20 14.2Z"/>',
    moonback: '<path d="M19.5 13.7A8.3 8.3 0 1 1 9.8 4.2 6.6 6.6 0 0 0 19.5 13.7Z"/><path d="M14 17.5h6M17.5 15l2.5 2.5-2.5 2.5"/>',
    spiral: '<path d="M12 12a2.2 2.2 0 0 1 4.4 0 4.8 4.8 0 0 1-9.6 0A7.2 7.2 0 0 1 21 12a9.6 9.6 0 0 1-19.2 0"/>',
    candle: '<path d="M12 2.5c1.3 1.5 2 2.6 2 3.6a2 2 0 1 1-4 0c0-1 .7-2.1 2-3.6Z"/><rect x="8.5" y="9" width="7" height="12" rx="1.5"/><path d="M6 21h12"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
    cloud: '<path d="M7 18.5a4.6 4.6 0 1 1 .9-9.1 6 6 0 0 1 11.5 1.8 3.8 3.8 0 0 1-1.4 7.3H7Z"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.9"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.7a2.1 2.1 0 0 0 1.5-3.6c-.9-1-.1-2.2 1.1-2.2h1.9a3 3 0 0 0 2.8-3.1C20.7 7 16.7 3 12 3Z"/><circle cx="7.5" cy="10.5" r=".9"/><circle cx="11" cy="7" r=".9"/><circle cx="15.5" cy="7.8" r=".9"/>',
    brush: '<path d="m20.6 3.4c1 1 1 2.5 0 3.5l-8 8-3.5-3.5 8-8c1-1 2.5-1 3.5 0Z"/><path d="M9.1 11.4 12.6 14.9c-1.4 2.8-4 4.3-8.6 4.6.3-4.5 1.9-6.7 5.1-8.1Z"/>',
    book: '<path d="M4.5 5A2.5 2.5 0 0 1 7 2.5h12.5v16H7a2.5 2.5 0 0 0-2.5 2.5V5Z"/><path d="M4.5 21A2.5 2.5 0 0 1 7 18.5h12.5"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    retry: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 3.5v3.8h-3.8"/>',
    save: '<path d="M12 3.5v11M7.5 10.5l4.5 4 4.5-4M4.5 20.5h15"/>',
    heart: '<path d="M12 20.5C6.4 16 3.5 12.7 3.5 9.2 3.5 6.6 5.5 4.7 8 4.7c1.6 0 3.1.8 4 2.2.9-1.4 2.4-2.2 4-2.2 2.5 0 4.5 1.9 4.5 4.5 0 3.5-2.9 6.8-8.5 11.3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.4l3.4 2"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    swap: '<path d="M4 8h13.5M14 4.5 17.5 8 14 11.5M20 16H6.5M10 12.5 6.5 16l3.5 3.5"/>',
    sleepy: '<path d="M5 9.5h6l-6 5.5h6M14.5 4h4.7l-4.7 4.7h4.7"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    zap: '<path d="M13 2.5 4.8 13.4h6L9.6 21.5l8.7-11.4h-6.1L13 2.5Z"/>'
  };

  window.icon = function (name, cls) {
    var solid = { heart: 1 };
    var svg = '<svg viewBox="0 0 24 24" fill="' + (solid[name] ? 'currentColor' : 'none')
      + '" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '
      + (cls ? 'class="' + cls + '"' : '') + ' aria-hidden="true">' + (ICONS[name] || ICONS.star || '') + '</svg>';
    return svg;
  };
  // star 兜底
  ICONS.star = '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>';

  window.sealHTML = function (cls) {
    var small = (cls || '').indexOf('sm') > -1;
    return '<div class="seal ' + (cls || '') + '"><span class="s1">' + (small ? '我' : '自我说明书') + '</span><span class="s2">' + (small ? '正版' : 'AUTHENTIC') + '</span></div>';
  };

  /* ============ 报告页渲染 ============ */
  function fmtDate(t) {
    var d = new Date(t);
    return d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2);
  }

  window.renderReport = function (root, test, res, extra) {
    var ac = test.color;
    var html = '';

    html += '<div class="topbar"><button class="backbtn" id="rback">' + icon('back') + '</button>'
      + '<div class="tt"><div class="t1">第 ' + test.num + ' 章 · ' + test.title + '</div>'
      + '<div class="t2">' + test.en + ' · REPORT</div></div></div>';

    html += '<div class="report rise">';
    html += '<div class="rbrand"><div class="bl"><b>自我说明书</b> · SELF MANUAL<br>第 ' + test.num + ' 章 ' + test.title + '</div>' + sealHTML('sm') + '</div>';

    html += '<div class="rhero">'
      + '<div class="bigicon" style="background:' + hexSoft(ac, 0.1) + ';color:' + ac + '">' + icon(res.icon) + '</div>'
      + '<div class="rname">' + res.name + '</div>'
      + '<div class="rtag">' + res.tag + '</div>'
      + (res.cert ? '<div class="rcert">已认证 · ' + res.cert + '</div>' : '')
      + '</div>';

    if (res.big) {
      html += '<div class="bigmetric"><div class="bm-label">' + res.big.label + '</div>'
        + '<div class="bm-val">' + res.big.value + '</div></div>';
      if (res.big.battery) {
        html += '<div class="battery"><div class="bshell"><div class="bfill" id="bfill" style="background:' + batteryColor(res.big.pct) + '"></div></div>'
          + '<div class="blabel">剩余电量 · 会随社交波动,仅供参考</div></div>';
      }
    }

    html += '<div class="rtext">' + res.text + '</div>';

    if (res.bars && res.bars.length) {
      html += '<div class="bars">';
      res.bars.forEach(function (b) {
        html += '<div class="bar' + (b.hi ? ' hi' : '') + '"><div class="bl"><b>' + b.label + '</b><span>' + b.pct + '%</span></div>'
          + '<div class="btrack"><div class="bfill" data-w="' + b.pct + '" style="background:' + (b.hi ? ac : '#B9B09C') + '"></div></div></div>';
      });
      html += '</div>';
    }

    (res.blocks || []).forEach(function (bk) {
      if (!bk.h && !bk.text && !bk.rx && !bk.cert && !bk.quip) return;
      html += '<div class="block">';
      if (bk.h) html += '<div class="bh">' + bk.h + '</div>';
      if (bk.cert) html += '<div class="certline">「 ' + bk.cert + ' 」</div>';
      if (bk.full && bk.full.indexOf(' · ') > -1) html += '<div class="btext" style="margin-top:4px">' + bk.full + '</div>';
      if (bk.rx) html += '<ol>' + bk.rx.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ol>';
      if (bk.text) html += '<div class="btext">' + bk.text + '</div>';
      if (bk.quip) html += '<div class="quip">『 ' + bk.quip + ' 』</div>';
      html += '</div>';
    });

    html += '<div class="rfoot"><div class="rmeta">报告编号 <b>' + (extra && extra.no || '—') + '</b><br>'
      + fmtDate(extra && extra.t || Date.now()) + ' · 本报告仅代表此刻的你</div>'
      + sealHTML('stamp') + '</div>';

    html += '</div>';

    if (extra && extra.histText) html += '<div class="hist-strip rise">' + extra.histText + '</div>';

    html += '<div class="racts">'
      + '<button class="btn accent" id="rsave">' + icon('save') + '保存报告卡到相册</button>'
      + '<div class="half">'
      + '<button class="btn ghostbtn" id="rretry">' + icon('retry') + '再测一次</button>'
      + '<button class="btn ghostbtn" id="rhome">' + icon('book') + '回大厅</button>'
      + '</div></div>';

    root.innerHTML = html;

    // 入场动画:条形与电池
    requestAnimationFrame(function () {
      setTimeout(function () {
        var bf = root.querySelector('#bfill');
        if (bf && res.big && res.big.pct != null) bf.style.width = res.big.pct + '%';
        root.querySelectorAll('.bfill[data-w]').forEach(function (el) {
          el.style.width = el.getAttribute('data-w') + '%';
        });
      }, 120);
    });

    return {
      back: root.querySelector('#rback'),
      save: root.querySelector('#rsave'),
      retry: root.querySelector('#rretry'),
      home: root.querySelector('#rhome')
    };
  };

  function hexSoft(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function batteryColor(pct) {
    if (pct >= 60) return '#0E9F6E';
    if (pct >= 25) return '#D9A114';
    return '#C43C33';
  }

  /* ============ Canvas 报告卡文本与大指标绘制 ============ */
  function cleanText(s) {
    if (s == null) return '';
    return String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  }

  function wrapText(c, rawText, x, y, maxW, lh, maxLines) {
    var text = cleanText(rawText);
    var paragraphs = text.split('\n');
    var lines = [];
    for (var p = 0; p < paragraphs.length; p++) {
      var curPara = paragraphs[p];
      var cur = '';
      for (var i = 0; i < curPara.length; i++) {
        var ch = curPara[i];
        if (c.measureText(cur + ch).width > maxW) {
          lines.push(cur); cur = ch;
          if (lines.length >= maxLines) break;
        } else cur += ch;
      }
      if (cur) lines.push(cur);
      if (lines.length >= maxLines) break;
    }
    if (lines.length > maxLines) lines = lines.slice(0, maxLines);
    if (lines.length === maxLines && text.length > lines.join('').length) {
      var last = lines[maxLines - 1];
      lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + '…';
    }
    lines.forEach(function (ln, k) { c.fillText(ln, x, y + k * lh); });
    return y + lines.length * lh;
  }

  window.buildShareCard = function (test, res, extra) {
    var W = 750;
    // 有维度条且无大指标的卡(如拖延/熬夜)需要更高的画布
    var H = (res.big || !(res.bars && res.bars.length)) ? 1160 : 1380;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var ac = test.color;

    // 纸底 + 纹理
    c.fillStyle = '#F5F1E8'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(120,100,60,0.03)';
    for (var y = 0; y < H; y += 6) c.fillRect(0, y, W, 1);

    var M = 54;
    // 顶部章条
    c.fillStyle = ac; c.fillRect(0, 0, W, 10);

    // 品牌行
    c.fillStyle = '#C43C33';
    rr(c, M, 62, 62, 62, 14); c.fill();
    c.fillStyle = '#FFFCF6';
    c.font = '700 36px Georgia, "Noto Serif SC", serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('我', M + 31, 96);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#26231D';
    c.font = '700 34px Georgia, "Noto Serif SC", serif';
    c.fillText('自我说明书', M + 82, 92);
    c.fillStyle = '#8A8172';
    c.font = '400 15px Georgia, serif';
    c.fillText('S E L F · M A N U A L', M + 84, 116);
    // 右上:第 XX 章
    c.textAlign = 'right';
    c.fillStyle = '#B08A3E';
    c.font = 'italic 700 26px Georgia, serif';
    c.fillText('第 ' + test.num + ' 章', W - M, 92);
    c.textAlign = 'left';

    // 分隔虚线
    dash(c, M, 156, W - M * 2);

    // 章名
    c.fillStyle = '#26231D';
    c.font = '700 40px Georgia, "Noto Serif SC", serif';
    c.fillText(test.title, M, 212);
    c.fillStyle = '#8A8172';
    c.font = '400 15px Georgia, serif';
    c.fillText(test.en, M, 238);

    // 结果图标
    var cx = W / 2, cy = 330;
    c.beginPath(); c.arc(cx, cy, 62, 0, Math.PI * 2);
    c.fillStyle = hexSoft(ac, 0.12); c.fill();
    c.strokeStyle = hexSoft(ac, 0.35); c.lineWidth = 2; c.stroke();
    drawPathIcon(c, res.icon, cx - 30, cy - 30, 60, ac);

    // 类型名
    c.textAlign = 'center';
    c.fillStyle = '#26231D';
    c.font = '700 52px Georgia, "Noto Serif SC", serif';
    var nm = cleanText(res.name);
    if (c.measureText(nm).width > W - M * 2) c.font = '700 42px Georgia, "Noto Serif SC", serif';
    c.fillText(nm, cx, 452);
    c.fillStyle = ac;
    c.font = '600 24px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
    c.fillText(cleanText(res.tag), cx, 492);
    if (res.cert) {
      c.strokeStyle = 'rgba(176,138,62,.6)'; c.lineWidth = 1.5;
      var certClean = cleanText(res.cert);
      var cw = c.measureText('已认证 · ' + certClean).width + 44;
      rr(c, cx - cw / 2, 516, cw, 40, 20); c.stroke();
      c.fillStyle = '#B08A3E';
      c.font = '700 18px -apple-system, "PingFang SC", sans-serif';
      c.fillText('已认证 · ' + certClean, cx, 542);
    }
    c.textAlign = 'left';

    var yy = res.cert ? 602 : 572;

    // 大指标 (解析数字与单位，彻底根除 <small> 标签与压字重叠)
    if (res.big) {
      c.textAlign = 'center';
      c.fillStyle = '#8A8172';
      c.font = '400 18px -apple-system, "PingFang SC", sans-serif';
      c.fillText(cleanText(res.big.label), cx, yy);

      var rawVal = String(res.big.value || '');
      var numPart = '', unitPart = '';
      var mSmall = rawVal.match(/^(.*?)<small>(.*?)<\/small>(.*)$/i);
      if (mSmall) {
        numPart = (mSmall[1] + mSmall[3]).replace(/<[^>]+>/g, '').trim();
        unitPart = mSmall[2].replace(/<[^>]+>/g, '').trim();
      } else {
        var mUnits = rawVal.match(/^([\d\.\-]+)\s*([^\d\.\s]+)$/);
        if (mUnits) {
          numPart = mUnits[1].trim();
          unitPart = mUnits[2].trim();
        } else {
          numPart = rawVal.replace(/<[^>]+>/g, '').trim();
        }
      }

      var valY = yy + 68;
      if (unitPart) {
        c.font = '700 64px Georgia, serif';
        var numW = c.measureText(numPart).width;
        c.font = '600 24px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
        var unitW = c.measureText(unitPart).width;
        var totalW = numW + 8 + unitW;
        var startX = cx - totalW / 2;

        c.textAlign = 'left';
        c.fillStyle = '#26231D';
        c.font = '700 64px Georgia, serif';
        c.fillText(numPart, startX, valY);

        c.fillStyle = '#8A8172';
        c.font = '600 24px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
        c.fillText(unitPart, startX + numW + 8, valY - 6);
      } else {
        c.textAlign = 'center';
        c.fillStyle = '#26231D';
        c.font = '700 64px Georgia, serif';
        c.fillText(numPart, cx, valY);
      }

      if (res.big.battery) {
        // 电池条
        var bw = 380, bx = cx - bw / 2, by = valY + 36;
        c.strokeStyle = '#26231D'; c.lineWidth = 3;
        rr(c, bx, by, bw, 36, 10); c.stroke();
        rr(c, bx + bw + 6, by + 10, 6, 16, 3); c.fillStyle = '#26231D'; c.fill();
        var fw = (bw - 8) * res.big.pct / 100;
        c.fillStyle = res.big.pct >= 60 ? '#0E9F6E' : (res.big.pct >= 25 ? '#D9A114' : '#C43C33');
        if (fw > 4) { rr(c, bx + 4, by + 4, fw, 28, 6); c.fill(); }
        yy = by + 68;
      } else {
        yy = valY + 52; // 留出呼吸空间，彻底解决与下方主文本贴脸叠字
      }
      c.textAlign = 'left';
    }

    // 主文本
    c.fillStyle = '#57503F';
    c.font = '400 23px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
    yy = wrapText(c, res.text, M, yy, W - M * 2, 38, 5) + 18;

    // 维度条(大指标为空时展示,排在文本块之前)
    if (!res.big && res.bars && res.bars.length) {
      res.bars.slice(0, 5).forEach(function (b) {
        c.fillStyle = '#57503F';
        c.font = '400 19px -apple-system, "PingFang SC", sans-serif';
        c.fillText(b.label, M, yy + 14);
        c.fillStyle = '#D8CFB9';
        rr(c, M, yy + 24, W - M * 2, 10, 5); c.fill();
        c.fillStyle = b.hi ? ac : '#B9B09C';
        rr(c, M, yy + 24, Math.max(6, (W - M * 2) * b.pct / 100), 10, 5); c.fill();
        yy += 52;
      });
      yy += 10;
    }

    // 处方 / 带标题的文本块
    (res.blocks || []).forEach(function (bk) {
      if (yy >= H - 210) return;
      if (bk.rx) {
        c.fillStyle = ac;
        c.font = '700 20px -apple-system, "PingFang SC", sans-serif';
        c.fillText(bk.h || '处方', M, yy); yy += 40;
        c.fillStyle = '#57503F';
        c.font = '400 21px -apple-system, "PingFang SC", sans-serif';
        var marks = ['① ', '② ', '③ '];
        bk.rx.forEach(function (r, i) {
          if (i > 2) return;
          yy = wrapText(c, marks[i] + r, M, yy, W - M * 2, 32, 2) + 6;
        });
        yy += 8;
      } else if (bk.h && bk.text) {
        c.fillStyle = ac;
        c.font = '700 20px -apple-system, "PingFang SC", sans-serif';
        c.fillText(bk.h, M, yy); yy += 34;
        c.fillStyle = '#57503F';
        c.font = '400 21px -apple-system, "PingFang SC", sans-serif';
        yy = wrapText(c, bk.text, M, yy, W - M * 2, 32, 3) + 12;
      }
    });

    // 底部:编号日期 + 印章
    c.fillStyle = '#8A8172';
    c.font = '400 17px Georgia, serif';
    c.fillText('报告编号 ' + (extra && extra.no || ''), M, H - 128);
    c.fillText(fmtDate(extra && extra.t || Date.now()) + ' · 仅代表此刻的你', M, H - 100);

    drawSeal(c, W - 92 - 52, H - 210, 104);

    // 页脚
    dash(c, M, H - 66, W - M * 2);
    c.textAlign = 'center';
    c.fillStyle = '#8A8172';
    c.font = '400 16px Georgia, serif';
    c.fillText('自我说明书 · 本报告仅供娱乐', cx, H - 36);
    c.textAlign = 'left';

    return cv.toDataURL('image/png');
  };

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function dash(c, x, y, w) {
    c.save();
    c.strokeStyle = 'rgba(138,129,114,.5)'; c.lineWidth = 1;
    c.setLineDash([6, 6]);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
    c.restore();
  }
  function drawSeal(c, x, y, r) {
    c.save();
    c.translate(x + r / 2, y + r / 2);
    c.rotate(-8 * Math.PI / 180);
    c.strokeStyle = '#C43C33'; c.fillStyle = '#C43C33';
    c.globalAlpha = 0.88;
    c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, r / 2 - 2, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, r / 2 - 10, 0, Math.PI * 2); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 22px Georgia, "Noto Serif SC", serif';
    c.fillText('自我说明书', 0, -9);
    c.font = '400 10px Georgia, serif';
    c.fillText('A U T H E N T I C', 0, 13);
    c.restore();
  }
  /* 在 canvas 上同步画线性图标(解析 SVG 标记为 Path2D) */
  function drawPathIcon(c, name, x, y, size, color) {
    var markup = ICONS[name] || ICONS.star;
    c.save();
    c.translate(x, y);
    c.scale(size / 24, size / 24);
    c.strokeStyle = color;
    c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round';
    var re = /<(path|rect|circle)\b([^>]*)\/?>/g, m;
    while ((m = re.exec(markup))) {
      var attrs = m[2];
      var get = function (n) {
        var r = new RegExp(n + '="([^"]*)"').exec(attrs);
        return r ? r[1] : null;
      };
      var p = new Path2D();
      if (m[1] === 'path') p = new Path2D(get('d'));
      else if (m[1] === 'rect') p.rect(parseFloat(get('x')), parseFloat(get('y')), parseFloat(get('width')), parseFloat(get('height')));
      else if (m[1] === 'circle') { p.arc(parseFloat(get('cx')), parseFloat(get('cy')), parseFloat(get('r')), 0, Math.PI * 2); }
      c.stroke(p);
      if (get('fill') === 'currentColor') { c.fillStyle = color; c.fill(p); }
    }
    c.restore();
  }
})();
