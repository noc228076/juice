const fs = require('fs');
const p = 'js/modules/daily.js';
let s = fs.readFileSync(p, 'utf8');
const needle = "  function applySiteBackground(url, title) {\n    if (!url) return;";
if (!s.includes(needle)) { console.log('NOT FOUND'); process.exit(1); }
const repl = [
  "  function applySiteBackground(url, title) {",
  "    if (!url) return;",
  "    // url 会拼进 CSS url(\"...\")：非 bing 直链一律拒绝，",
  "    // 含引号/括号的地址能突破 url() 写入任意 CSS 并持久化",
  "    if (!/^https:\\/\\/(www|cn)\\.bing\\.com\\/th\\?id=OHR\\./.test(String(url))) return;"
].join('\n');
s = s.replace(needle, repl);
fs.writeFileSync(p, s);
console.log('daily.js fixed');
