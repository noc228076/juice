#!/usr/bin/env node
/* 把 scripts/tv-src/*.m3u 生成 tv-worker/src/data.js
 *
 * - 只保留 http(s)、排除已知错误源（TVU 测试卡等）
 * - 按频道基础名归并，生成稳定的 cid（sha1 前 10 位）
 * - 同一 cid 内按来源顺序编号 i，Worker 用 /media?cid=…&i=… 取真实地址
 * - 真实地址只进 Worker 包，不下发到浏览器
 *
 * 用法：node scripts/build-tv-data.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'scripts', 'tv-src');
const OUT = path.join(ROOT, 'tv-worker', 'src', 'data.js');
const SOURCES = [
  { key: 'extra', file: 'extra.m3u', label: '人工精测源' },
  { key: 'verified', file: 'verified.m3u', label: '已测可用' },
];

const URL_BLACKLIST = [
  /event\.pull\.hebtv\.com\/jishi/i, // TVU 测试卡，曾被标成 CCTV-13/14
  /\/tvu\//i,
];
/* 已实测为「冻结/循环播放列表」的源：m3u8 能打开，但 MEDIA-SEQUENCE 不前进，
   画面永远停在同一段（浙江广电 ali-m-l / ali-vl 的部分频道）。
   这些条目不删除，只打 static 标记；客户端不会把它们当实时源播放。 */
const STATIC_BLACKLIST = [
  // 合并单条正则（审计 P2-11）：host 支持 :80 端口写法，尾斜杠保证
  // channel01 不会误吃 channel011
  /ali-(?:m-l|vl)\.cztv\.com(?::\d+)?\/channels\/lantian\/channel(?:21|001|01|10|008)\//i,
];
const LANTIAN_RE = /ali-(?:m-l|vl|xwl)\.cztv\.com(?::\d+)?\/channels\/lantian\/channel\d+\//i;
const ANIM_RE = /卡通|动画|动漫|少儿|儿童|哈哈炫动|卡酷|金鹰卡通|优漫|嘉佳|炫动|优优宝贝|宝贝家|亲子|动漫秀场|新动漫/;

function parseM3U(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const info = line.split(',').slice(1).join(',').trim();
      const attrs = {};
      line.replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
      cur = {
        name: (attrs['tvg-name'] || info || '').trim(),
        group: (attrs['group-title'] || '其他').trim(),
        logo: (attrs['tvg-logo'] || '').trim(),
        url: '',
      };
    } else if (line.startsWith('#')) {
      continue;
    } else if (cur) {
      cur.url = line;
      out.push(cur);
      cur = null;
    }
  }
  return out;
}

function baseName(n) {
  return String(n)
    .replace(/\s*\((?:\d{3,4}[pi]|HD|SD|FHD|UHD)\)\s*$/i, '')
    .replace(/\s*\[[^\]]*\]\s*$/i, '')
    .replace(/\s+(?:8K|UHD|FHD|HD|SD)$/i, '')
    .trim() || String(n);
}
function keyOf(n) {
  return baseName(n).toLowerCase().replace(/[\s\-_.·]/g, '');
}
function mainGroupOf(name) {
  if (/cctv|cgtn|央视/i.test(name)) return '央视';
  if (name.includes('卫视')) return '卫视';
  if (ANIM_RE.test(name)) return '动画';
  return '';
}
function hostOf(url) {
  try { return new URL(url).host.toLowerCase(); } catch (e) { return ''; }
}
function isBlacklisted(url) {
  return URL_BLACKLIST.some((re) => re.test(url));
}
function isStatic(url) {
  return STATIC_BLACKLIST.some((re) => re.test(url));
}
/* m3u 注释黏在 URL 后的脏行（如 `...1080p.m3u8$LR•IPV4『线路27』`）：
   截到第一个非可打印 ASCII 前，再用 URL 解析兜底（审计 P2-10） */
function cleanUpstreamUrl(line) {
  var u = String(line || '').trim();
  // 只截「黏在完整 URL 尾部的注释 junk」——路径里合法的中文（/地方台8563/海南.php）不能动：
  // 锚点是 CJK 标点（『【】•）或「$ 后跟非 ASCII」，两者都是 m3u 注释特征而非 URL 字符
  // 先截 $ 后黏连（$LR•IPV4...），再兜底 CJK 标点
  var dollar = u.indexOf('$');
  if (dollar > 0 && /[^!-~]/.test(u.slice(dollar))) {
    console.warn('[tv-data] 截断脏 URL: ' + u.slice(0, 90) + ' -> ' + u.slice(0, dollar));
    u = u.slice(0, dollar);
  }
  var junkM = u.match(/[「」【】•·]/);
  if (junkM && /^https?:\/\//i.test(u)) {
    var cut = u.slice(0, u.indexOf(junkM[0]));
    if (/^https?:\/\/\S+$/.test(cut)) {
      console.warn('[tv-data] 截断脏 URL: ' + u.slice(0, 90) + ' -> ' + cut);
      u = cut;
    }
  }
  try {
    var parsed = new URL(u);
    if (!parsed.hostname || isPrivateHostLike(parsed.hostname)) return '';
  } catch (e) { return ''; }
  return u;
}
function isPrivateHostLike(hostname) {
  var h = String(hostname || '').toLowerCase().replace(/^\[+|\]+$/g, '').replace(/\.+$/, '');
  if (!h) return true;
  if (h === 'localhost' || /\.(local|internal)$/.test(h) || /^\d+$/.test(h) || /^(0x[0-9a-f]+)(\.(0x[0-9a-f]+|\d+))+$/.test(h) || /^0x[0-9a-f]+$/.test(h)) return true;
  if (/^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

const entries = [];
const urlsByCid = Object.create(null);
const urlIndexByCid = Object.create(null); // cid -> Map<url, i>，跨源重复地址复用同一个 i
const cidOrder = [];
const sourcesRead = [];
const hostSet = new Set();
let rawExtra = 0;
let rawVerified = 0;
let staticCount = 0;

for (const src of SOURCES) {
  const file = path.join(SRC, src.file);
  if (!fs.existsSync(file)) {
    throw new Error('缺少频道源：' + file + '（先从 iptv-web 归档复制 m3u）');
  }
  const raw = parseM3U(fs.readFileSync(file, 'utf8'));
  if (src.key === 'extra') rawExtra = raw.length;
  if (src.key === 'verified') rawVerified = raw.length;
  let kept = 0;
  for (const ch of raw) {
    ch.url = cleanUpstreamUrl(ch.url);
    if (!ch.url) continue;
    if (isBlacklisted(ch.url)) continue;
    if (!ch.name) continue;
    const key = keyOf(ch.name);
    if (!key) continue;
    const group = mainGroupOf(ch.name);
    if (!group) continue; // 只要央视/卫视/动画
    const cid = crypto.createHash('sha1').update(key).digest('hex').slice(0, 10);
    // 保留各源原始条数（extra 185 / verified 194），但同一频道内重复的上游地址
    // 复用同一个 i：客户端拿到的 /media 地址相同，mergeFeeds 会自然去重。
    if (!urlsByCid[cid]) {
      urlsByCid[cid] = [];
      urlIndexByCid[cid] = new Map();
      cidOrder.push(cid);
    }
    let i = urlIndexByCid[cid].get(ch.url);
    if (i === undefined) {
      i = urlsByCid[cid].length;
      urlsByCid[cid].push(ch.url);
      urlIndexByCid[cid].set(ch.url, i);
    }
    const st = isStatic(ch.url) ? 1 : 0;
    if (st) staticCount++;
    if (!st && LANTIAN_RE.test(ch.url)) {
      console.warn('[tv-data] 未标记 static 的 lantian 频道源（确认是否冻结）: ' + ch.url);
    }
    const entry = { s: src.key, n: ch.name, g: group, l: ch.logo, c: cid, i };
    if (st) entry.st = 1;
    entries.push(entry);
    const host = hostOf(ch.url);
    if (host) hostSet.add(host);
    kept++;
  }
  sourcesRead.push({ key: src.key, label: src.label, raw: raw.length, kept });
}

if (!entries.length) throw new Error('没有解析到任何频道，检查 m3u 内容');

const uniqueUrls = Object.values(urlsByCid).reduce((s, a) => s + a.length, 0);
const meta = {
  generated: new Date().toISOString(),
  sources: sourcesRead,
  entries: entries.length,
  urls: uniqueUrls,
  static: staticCount,
  channels: cidOrder.length,
  hosts: hostSet.size,
  rawExtra,
  rawVerified,
};

const banner = '/* 由 scripts/build-tv-data.js 生成，勿手改。' +
  ' 来源：scripts/tv-src/*.m3u；生成时间：' + meta.generated + ' */\n';
const body =
  banner +
  'export const ENTRY = ' + JSON.stringify(entries) + ';\n' +
  'export const URLS = ' + JSON.stringify(urlsByCid) + ';\n' +
  'export const HOSTS = ' + JSON.stringify([...hostSet]) + ';\n' +
  'export const META = ' + JSON.stringify(meta) + ';\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, 'utf8');

const groupCount = { 央视: 0, 卫视: 0, 动画: 0 };
const channelSeen = new Set();
for (const e of entries) {
  if (channelSeen.has(e.c)) continue;
  channelSeen.add(e.c);
  groupCount[e.g] = (groupCount[e.g] || 0) + 1;
}

console.log('频道数据已生成 -> ' + path.relative(ROOT, OUT));
console.log('  原始：extra ' + rawExtra + ' 条 / verified ' + rawVerified + ' 条');
console.log('  保留：' + uniqueUrls + ' 条唯一地址（' + entries.length + ' 条源条目） / ' +
  cidOrder.length + ' 个频道 / ' + hostSet.size + ' 个 host');
console.log('  静态回放源：' + staticCount + ' 条（已标记 static，客户端不播放）');
console.log('  分组：央视 ' + groupCount['央视'] + ' / 卫视 ' + groupCount['卫视'] + ' / 动画 ' + groupCount['动画']);
