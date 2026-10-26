const fs = require('fs');
const p = 'js/modules/lx-music/request.js';
let s = fs.readFileSync(p, 'utf8');
const needle = "      if (aborted) throw new Error('cancel request');\n      onceCb(null, resp, resp.body);";
if (!s.includes(needle)) { console.log('NOT FOUND'); process.exit(1); }
const repl = [
  "      // 响应已经完整到手就别丢：fetch resolve 和超时定时器存在竞态，",
  "      // 恰好踩中时旧代码把有效响应当取消扔掉，上层白白失败一次",
  "      if (aborted && !resp) throw new Error('cancel request');",
  "      onceCb(null, resp, resp.body);"
].join('\n');
s = s.replace(needle, repl);
fs.writeFileSync(p, s);
console.log('request race fixed');
