// 构建 morphicons + lucide 图标子集 vendor 包（可重跑）
const esbuild = require('esbuild');
const fs = require('fs');

(async () => {
  const lucide = await import('lucide');
  const pick = {};
  const wanted = ['Play','Pause','Brain','BookOpen','Volume2','VolumeX','Sparkles','Check','CheckCircle2',
    'X','ArrowRight','RotateCcw','RefreshCw','Coins','Dices','Wand2','Zap','Smile','Meh','Frown','Star','Award','GraduationCap',
    'Flame','Eye','EyeOff','ChevronRight','Repeat','Shuffle'];
  for (const k of wanted) if (lucide[k]) pick[k] = lucide[k];
  console.log('lucide 图标子集:', Object.keys(pick).length, '个');
  fs.writeFileSync('js/vendor/lucide-icons.js', 'window.LUCIDE_ICONS=' + JSON.stringify(pick) + ';');

  // stdin 入口 + 虚拟文件，bundle 选项放在顶层
  await esbuild.build({
    entryPoints: ['js/vendor/_morph-entry.js'],
    bundle: true, format: 'iife', minify: true, target: 'es2019',
    outfile: 'js/vendor/morphicons.js', logLevel: 'silent'
  });
  console.log('vendor 产物:',
    fs.statSync('js/vendor/morphicons.js').size, '+',
    fs.statSync('js/vendor/lucide-icons.js').size, 'bytes');
})();
