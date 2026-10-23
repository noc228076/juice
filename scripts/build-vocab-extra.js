/* 从 KyleBing/english-vocabulary 的 full jsonl 抽取「词根词缀 / 同根词 / 真题例句」
   输出到 assets/vocab/：
     cet4_roots.json   [拆词解释, [[派生词, 词性], ...]]
     cet6_roots.json
     cet4_exam.json    [[真题句, 出处], ...]
     cet6_exam.json
   三份都与 cet4.json / cet6.json 逐条对齐，没有数据处为 0。 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SRC = {
  cet4: process.argv[2] || 'scratch/v-cet4.jsonl',
  cet6: process.argv[3] || 'scratch/v-六级.jsonl'
};
const OUT = 'assets/vocab';
fs.mkdirSync(OUT, { recursive: true });

/* 与 build-vocab.js 完全一致的去重规则，保证三份文件索引对齐 */
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

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function build(level) {
  const raw = fs.readFileSync(SRC[level], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const list = dedupe(raw);

  const roots = [];
  const exams = [];

  for (const o of list) {
    const c = o.content.word.content;

    /* 拆词：remMethod.val 形如 "ab(离去) ＋ sorb(吸收) → 吸收掉 → 吸收" */
    const rem = c.remMethod && c.remMethod.val ? clean(c.remMethod.val) : '';

    /* 同根词：relWord.rels[].words[]，最多留 8 个，词形 + 词性 */
    let rel = 0;
    if (c.relWord && Array.isArray(c.relWord.rels)) {
      const flat = [];
      c.relWord.rels.forEach(g => {
        (g.words || []).forEach(w => {
          if (w.hwd && flat.length < 8) flat.push([w.hwd, g.pos || '']);
        });
      });
      if (flat.length) rel = flat;
    }

    roots.push(rem || rel ? [rem, rel] : 0);

    /* 真题例句：取第一条，带年份/卷次/题型 */
    let exam = 0;
    if (c.realExamSentence && Array.isArray(c.realExamSentence.sentences) && c.realExamSentence.sentences.length) {
      const s = c.realExamSentence.sentences[0];
      const si = s.sourceInfo || {};
      const src = [si.level, si.year, si.type].filter(Boolean).join(' · ');
      if (s.sContent) exam = [clean(s.sContent), src];
    }
    exams.push(exam);
  }

  const write = (name, data) => {
    const j = JSON.stringify(data);
    fs.writeFileSync(path.join(OUT, name), j);
    return { raw: Buffer.byteLength(j), gz: zlib.gzipSync(j).length };
  };

  const r = write(level + '_roots.json', roots);
  const e = write(level + '_exam.json', exams);

  console.log(level,
    '| 词数', list.length,
    '| 拆词', roots.filter(x => x && x[0]).length,
    '| 同根', roots.filter(x => x && x[1]).length,
    '| 真题', exams.filter(Boolean).length);
  console.log('   roots', (r.raw / 1024).toFixed(0) + 'KB raw /', (r.gz / 1024).toFixed(0) + 'KB gz');
  console.log('   exam ', (e.raw / 1024).toFixed(0) + 'KB raw /', (e.gz / 1024).toFixed(0) + 'KB gz');
}

build('cet4');
build('cet6');
