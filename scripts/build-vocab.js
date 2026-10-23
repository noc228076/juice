/* 把 KyleBing/english-vocabulary 的 full jsonl 裁成项目用的紧凑词库
   输出：assets/vocab/cet4.json / cet6.json（词+音标+释义）
        assets/vocab/cet4_ex.json / cet6_ex.json（例句，按索引对齐，按需加载） */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SRC = { cet4: process.argv[2] || 'scratch/v-cet4.jsonl', cet6: process.argv[3] || 'scratch/v-六级.jsonl' };
const OUT = 'assets/vocab';
fs.mkdirSync(OUT, { recursive: true });

function dedupe(objs) {
  const m = new Map();
  for (const o of objs) {
    const k = o.headWord.toLowerCase();
    const c = o.content.word.content;
    const s = c.sentence && c.sentence.sentences && c.sentence.sentences[0];
    const score = (s && s.sContent ? 2 : 0) + (c.trans && c.trans[0] && c.trans[0].tranCn ? 1 : 0);
    const cur = m.get(k);
    if (!cur || score > cur.score) m.set(k, { score, o });
  }
  return [...m.values()].map(x => x.o);
}

function build(level) {
  const raw = fs.readFileSync(SRC[level], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const list = dedupe(raw);
  const words = [];
  const ex = [];
  for (const o of list) {
    const c = o.content.word.content;
    const t = (c.trans && c.trans[0]) || {};
    const s = (c.sentence && c.sentence.sentences && c.sentence.sentences[0]) || {};
    const meaning = ((t.pos ? t.pos + '. ' : '') + (t.tranCn || '')).trim();
    if (!meaning) continue;
    // 压缩行：[词, 音标, 释义]
    words.push([o.headWord, c.usphone || c.ukphone || '', meaning]);
    // 例句只在真的包含该词时才收，避免填空题出不来
    const hit = s.sContent && s.sContent.toLowerCase().includes(o.headWord.toLowerCase());
    ex.push(hit ? [s.sContent, s.sCn || ''] : null);
  }
  const wJson = JSON.stringify(words);
  const exCompact = ex.map(e => e || 0);
  const eJson = JSON.stringify(exCompact);
  fs.writeFileSync(path.join(OUT, level + '.json'), wJson);
  fs.writeFileSync(path.join(OUT, level + '_ex.json'), eJson);
  console.log(level, '| words', words.length,
    '| base', (Buffer.byteLength(wJson) / 1024).toFixed(0) + 'KB raw /',
    (zlib.gzipSync(wJson).length / 1024).toFixed(0) + 'KB gz',
    '| ex', (Buffer.byteLength(eJson) / 1024).toFixed(0) + 'KB raw /',
    (zlib.gzipSync(eJson).length / 1024).toFixed(0) + 'KB gz',
    '| withEx', ex.filter(Boolean).length);
  return words;
}

const a = build('cet4');
const b = build('cet6');
const sa = new Set(a.map(w => w[0].toLowerCase()));
const sb = new Set(b.map(w => w[0].toLowerCase()));
console.log('unique merged:', new Set([...sa, ...sb]).size, '| overlap', [...sa].filter(w => sb.has(w)).length);
