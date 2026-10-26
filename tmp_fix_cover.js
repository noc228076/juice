const fs = require('fs');
const p = 'js/modules/lx-music/cover.js';
let s = fs.readFileSync(p, 'utf8');

// 1) 读取端：7 天 TTL + 旧格式兼容
const b1 = "    var key = cacheKey(track);\n    var cache = loadCache();\n    if (cache[key]) return Promise.resolve(cache[key]);";
if (!s.includes(b1)) { console.log('b1 NOT FOUND'); process.exit(1); }
s = s.replace(b1, [
  "    var key = cacheKey(track);",
  "    var cache = loadCache();",
  "    // 7 天 TTL：缓存值是「按歌名搜出来的版本」的封面，源站改版后旧图",
  "    // 会一直错下去。旧格式（纯字符串）当过期处理，重新覆盖写入。",
  "    var hit = cache[key];",
  "    if (hit && typeof hit === 'object' && hit.url && (Date.now() - (hit.at || 0)) < 7 * 24 * 3600 * 1000) {",
  "      return Promise.resolve(hit.url);",
  "    }"
].join('\n'));

// 2) 写入端：带时间戳
const b2 = "      cache[key] = pic;\n      saveCache();";
if (!s.includes(b2)) { console.log('b2 NOT FOUND'); process.exit(1); }
s = s.replace(b2, "      cache[key] = { url: pic, at: Date.now() };\n      saveCache();");

fs.writeFileSync(p, s);
console.log('cover TTL done');
