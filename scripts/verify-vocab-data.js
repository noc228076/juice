/* 词库数据体检（纯 Node，无需浏览器）
   用法：node scripts/verify-vocab-data.js
   检查项：条目形状、空/占位释义、词典排版噪音、重复词、索引对齐 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'vocab');
const POS = /^(?:n|v|vi|vt|adj|adv|prep|conj|pron|num|art|abbr|aux|int|modalv|pl)\./;

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : ''));
}

function load(level) {
  return JSON.parse(fs.readFileSync(path.join(DIR, level + '.json'), 'utf8'));
}

for (const level of ['cet4', 'cet6']) {
  const words = load(level);
  const n = words.length;

  check(`[${level}] 每条都是 [词,音标,释义]`, words.every(w => Array.isArray(w) && w.length >= 3), n);

  const emptyMeaning = words.filter(w => !String(w[2] || '').trim());
  check(`[${level}] 无空释义`, emptyMeaning.length === 0, emptyMeaning.slice(0, 5).map(w => w[0]));

  const placeholder = words.filter(w => /^[-—－]+$/.test(String(w[2]).trim()));
  check(`[${level}] 无占位释义（-）`, placeholder.length === 0, placeholder.map(w => w[0]));

  const nameNoise = words.filter(w => /人名；|\(人名\)|（人名）/.test(String(w[2])));
  check(`[${level}] 无人名译名噪音`, nameNoise.length === 0, nameNoise.slice(0, 5).map(w => w[0]));

  const appNoise = words.filter(w => /服务类型|账户总览|可360|苹果公司开创|三星智能手机品牌/.test(String(w[2])));
  check(`[${level}] 无 App 推广文案`, appNoise.length === 0, appNoise.map(w => w[0]));

  const conjTable = words.filter(w => /\[\s*过去式|\[\s*复数/.test(String(w[2])));
  check(`[${level}] 无方括号变位表`, conjTable.length === 0, conjTable.slice(0, 5).map(w => w[0]));

  const lower = words.map(w => String(w[0]).toLowerCase());
  const dup = lower.filter((w, i) => lower.indexOf(w) !== i);
  check(`[${level}] 无重复词`, dup.length === 0, [...new Set(dup)].slice(0, 5));

  const withPos = words.filter(w => POS.test(String(w[2]).trim())).length;
  check(`[${level}] 释义以词性开头占比 ≥ 90%`, withPos / n >= 0.9,
    `${withPos}/${n} = ${(withPos / n * 100).toFixed(1)}%`);

  const tooLong = words.filter(w => String(w[2]).length > 150);
  check(`[${level}] 释义长度 ≤ 150 字`, tooLong.length === 0, tooLong.map(w => [w[0], String(w[2]).length]));

  // 索引对齐：_ex / _roots / _exam 按词库索引取，超出长度的词只是没有附加数据，不应错位
  for (const suffix of ['_ex', '_roots', '_exam']) {
    let extra;
    try { extra = JSON.parse(fs.readFileSync(path.join(DIR, level + suffix + '.json'), 'utf8')); }
    catch (e) { check(`[${level}${suffix}] 可加载`, false, e.message); continue; }
    check(`[${level}${suffix}] 长度不超过词库（索引不越界）`, extra.length <= n,
      { extra: extra.length, words: n });
  }
}

const cet6 = load('cet6');
const phMissing = cet6.filter(w => !String(w[1] || '').trim()).length;
check('[cet6] 音标覆盖率 ≥ 90%', phMissing / cet6.length <= 0.1,
  `${cet6.length - phMissing}/${cet6.length} = ${((1 - phMissing / cet6.length) * 100).toFixed(1)}%`);

const bad = results.filter(r => !r.ok);
console.log('\n=== ' + (results.length - bad.length) + '/' + results.length + ' 通过 ===');
process.exit(bad.length ? 1 : 0);
