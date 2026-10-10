const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;

// 1. 读取干净的基础模板 template.html
const templatePath = path.join(root, 'template.html');
if (!fs.existsSync(templatePath)) {
  console.error('template.html not found! Please ensure template.html exists.');
  process.exit(1);
}
let html = fs.readFileSync(templatePath, 'utf8');

// 2. 读取所有 CSS 文件并合并
const cssFiles = [
  'css/modules/nav.css',
  'css/modules/milktea.css',
  'css/modules/fengshui.css',
  'css/modules/tarot.css',
  'css/modules/manual.css',
  'css/modules/history.css'
];

let mergedCss = '\n/* ====== 全局模块样式合并集 ====== */\n';
for (const file of cssFiles) {
  const filePath = path.join(root, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    mergedCss += `\n/* ====== ${file} ====== */\n${content}\n`;
  }
}

// 移除 template.html 中的 <link rel="stylesheet" ...>
for (const file of cssFiles) {
  const linkRegex = new RegExp(`<link\\s+rel=["']stylesheet["']\\s+href=["']${file}["'][^>]*>\\s*`, 'g');
  html = html.replace(linkRegex, '');
}

// 将合并的 CSS 注入到已有 <style> 标签的最前部
html = html.replace('<style>', () => `<style>\n${mergedCss}\n`);

// 3. 读取所有 JS 模块文件并合并
const jsFiles = [
  'js/sfx.js',
  'js/modules/milktea.js',
  'js/modules/fengshui.js',
  'js/modules/tarot.js',
  'js/modules/manual-data.js',
  'js/modules/manual-games.js',
  'js/modules/manual-report.js',
  'js/modules/manual.js',
  'js/modules/history.js',
  'js/modules/router.js'
];

let mergedJs = '\n/* ====== 全局模块脚本合并集 ====== */\n';
for (const file of jsFiles) {
  const filePath = path.join(root, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    mergedJs += `\n/* ====== ${file} ====== */\n${content}\n`;
  }
}

// 移除 template.html 底部的模块 <script src="...">
for (const file of jsFiles) {
  const scriptRegex = new RegExp(`<script\\s+src=["']${file}["'][^>]*><\\/script>\\s*`, 'g');
  html = html.replace(scriptRegex, '');
}

// 将合并的 JS 注入到 </body> 之前
html = html.replace('</body>', () => `<script>\n${mergedJs}\n</script>\n</body>`);

// 4. 对生成的 HTML 内部的所有 script 做语法校验
const scriptMatches = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
console.log(`Found ${scriptMatches.length} <script> blocks in bundled HTML.`);
let hasError = false;
scriptMatches.forEach((m, idx) => {
  const code = m[1];
  try {
    new vm.Script(code);
    console.log(`  Block #${idx + 1}: Syntax OK (${(code.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`  Block #${idx + 1}: SYNTAX ERROR ->`, err.message);
    hasError = true;
  }
});

if (hasError) {
  console.error('ABORTING: Generated bundle has syntax errors!');
  process.exit(1);
}

// 5. 写入最终 index.html
fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8');
console.log(`\nSUCCESS: index.html updated successfully! Total size: ${(html.length / 1024).toFixed(1)} KB\n`);
