/* 人格研究所 — 题库与档案数据 */
'use strict';

const DRINK_SVGS = {
  "ESTP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_estp_liq\" x1=\"70\" y1=\"35\" x2=\"70\" y2=\"120\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#C0392B\"/>\n        <stop offset=\"40%\" stop-color=\"#7B1E19\"/>\n        <stop offset=\"100%\" stop-color=\"#3A0D0A\"/>\n      </linearGradient>\n      <filter id=\"f_estp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#FF5A5F\" flood-opacity=\"0.3\"/>\n      </filter>\n    </defs>\n    <!-- 阴影 -->\n    <ellipse cx=\"70\" cy=\"128\" rx=\"34\" ry=\"7\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 吸管 -->\n    <rect x=\"78\" y=\"10\" width=\"8\" height=\"70\" rx=\"4\" transform=\"rotate(18 78 10)\" fill=\"#FF3B30\"/>\n    <rect x=\"80\" y=\"10\" width=\"3\" height=\"70\" rx=\"1.5\" transform=\"rotate(18 78 10)\" fill=\"#FFF\" opacity=\"0.6\"/>\n    <!-- 杯身 -->\n    <path d=\"M42 42 L48 116 C49 122 55 126 62 126 L78 126 C85 126 91 122 92 116 L98 42 Z\" fill=\"url(#g_estp_liq)\" filter=\"url(#f_estp_glow)\"/>\n    <!-- 冰块 -->\n    <rect x=\"52\" y=\"55\" width=\"16\" height=\"16\" rx=\"4\" transform=\"rotate(-12 52 55)\" fill=\"rgba(255,255,255,0.45)\" stroke=\"rgba(255,255,255,0.8)\" stroke-width=\"1.5\"/>\n    <rect x=\"74\" y=\"66\" width=\"14\" height=\"14\" rx=\"3\" transform=\"rotate(15 74 66)\" fill=\"rgba(255,255,255,0.35)\" stroke=\"rgba(255,255,255,0.7)\" stroke-width=\"1.5\"/>\n    <!-- 爆珠晶球 -->\n    <circle cx=\"56\" cy=\"98\" r=\"7\" fill=\"#FF5252\"/>\n    <circle cx=\"54\" cy=\"96\" r=\"2.5\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <circle cx=\"82\" cy=\"104\" r=\"6\" fill=\"#FF5252\"/>\n    <circle cx=\"80\" cy=\"102\" r=\"2\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <circle cx=\"68\" cy=\"112\" r=\"6.5\" fill=\"#FF3B30\"/>\n    <circle cx=\"66\" cy=\"110\" r=\"2\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <circle cx=\"68\" cy=\"82\" r=\"5\" fill=\"#FF7675\"/>\n    <circle cx=\"66.5\" cy=\"80.5\" r=\"1.8\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <!-- 飞溅气泡 -->\n    <circle cx=\"48\" cy=\"32\" r=\"3.5\" fill=\"#FF7675\"/>\n    <circle cx=\"94\" cy=\"28\" r=\"4.5\" fill=\"#FF7675\"/>\n    <circle cx=\"102\" cy=\"40\" r=\"2.5\" fill=\"#FF7675\"/>\n    <circle cx=\"36\" cy=\"48\" r=\"2.5\" fill=\"#FF7675\"/>\n    <!-- 杯口高光弧 -->\n    <path d=\"M42 42 Q70 48 98 42\" stroke=\"rgba(255,255,255,0.9)\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M48 54 L52 110\" stroke=\"rgba(255,255,255,0.25)\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <!-- 星光点缀 -->\n    <path d=\"M96 16 L98 22 L104 24 L98 26 L96 32 L94 26 L88 24 L94 22 Z\" fill=\"#FFD700\"/>\n  </svg>",
  "ESTJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_estj_liq\" x1=\"70\" y1=\"42\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#795548\"/>\n        <stop offset=\"50%\" stop-color=\"#4E342E\"/>\n        <stop offset=\"100%\" stop-color=\"#2D1E18\"/>\n      </linearGradient>\n      <filter id=\"f_estj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#8A6B4D\" flood-opacity=\"0.3\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"30\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 极简直筒冷萃吸管 -->\n    <rect x=\"74\" y=\"14\" width=\"6\" height=\"66\" rx=\"3\" transform=\"rotate(12 74 14)\" fill=\"#3E2723\"/>\n    <!-- 直筒多棱角平口玻璃杯 -->\n    <path d=\"M45 42 L50 120 C50.5 124 54 126 59 126 L81 126 C86 126 89.5 124 90 120 L95 42 Z\" fill=\"url(#g_estj_liq)\" filter=\"url(#f_estj_glow)\"/>\n    <!-- 透明层叠方形冰块 -->\n    <rect x=\"54\" y=\"52\" width=\"18\" height=\"18\" rx=\"4\" transform=\"rotate(-8 54 52)\" fill=\"rgba(255,255,255,0.4)\" stroke=\"rgba(255,255,255,0.85)\" stroke-width=\"1.8\"/>\n    <rect x=\"68\" y=\"66\" width=\"17\" height=\"17\" rx=\"4\" transform=\"rotate(18 68 66)\" fill=\"rgba(255,255,255,0.32)\" stroke=\"rgba(255,255,255,0.8)\" stroke-width=\"1.8\"/>\n    <rect x=\"56\" y=\"86\" width=\"16\" height=\"16\" rx=\"3.5\" transform=\"rotate(-15 56 86)\" fill=\"rgba(255,255,255,0.25)\" stroke=\"rgba(255,255,255,0.65)\" stroke-width=\"1.5\"/>\n    <!-- 杯壁冷凝水滴 -->\n    <circle cx=\"86\" cy=\"80\" r=\"2\" fill=\"rgba(255,255,255,0.6)\"/>\n    <circle cx=\"87\" cy=\"98\" r=\"1.5\" fill=\"rgba(255,255,255,0.5)\"/>\n    <circle cx=\"49\" cy=\"74\" r=\"1.8\" fill=\"rgba(255,255,255,0.5)\"/>\n    <!-- 玻璃厚杯底 -->\n    <path d=\"M51 118 L89 118 L88 123 C87.5 124.5 85 125.5 81 125.5 L59 125.5 C55 125.5 52.5 124.5 52 123 Z\" fill=\"rgba(255,255,255,0.25)\"/>\n    <!-- 杯口平整线 -->\n    <ellipse cx=\"70\" cy=\"42\" rx=\"25\" ry=\"4\" fill=\"rgba(255,255,255,0.2)\" stroke=\"rgba(255,255,255,0.9)\" stroke-width=\"2.5\"/>\n    <path d=\"M50 50 L53 112\" stroke=\"rgba(255,255,255,0.28)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n  </svg>",
  "ESFP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_esfp_liq\" x1=\"70\" y1=\"46\" x2=\"70\" y2=\"120\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#FFD54F\"/>\n        <stop offset=\"60%\" stop-color=\"#FFA000\"/>\n        <stop offset=\"100%\" stop-color=\"#FF6F00\"/>\n      </linearGradient>\n      <filter id=\"f_esfp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#FFA726\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"32\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 细长彩条吸管 -->\n    <rect x=\"82\" y=\"12\" width=\"7\" height=\"65\" rx=\"3.5\" transform=\"rotate(22 82 12)\" fill=\"#FF7043\"/>\n    <rect x=\"84\" y=\"12\" width=\"3\" height=\"65\" rx=\"1.5\" transform=\"rotate(22 82 12)\" fill=\"#FFF\" opacity=\"0.7\"/>\n    <!-- 郁金香波浪弧形杯身 -->\n    <path d=\"M44 48 C48 70 42 90 48 116 C49 122 55 125 62 125 L78 125 C85 125 91 122 92 116 C98 90 92 70 96 48 Z\" fill=\"url(#g_esfp_liq)\" filter=\"url(#f_esfp_glow)\"/>\n    <!-- 冰沙颗粒质感 -->\n    <circle cx=\"56\" cy=\"80\" r=\"3\" fill=\"#FFE082\" opacity=\"0.6\"/>\n    <circle cx=\"76\" cy=\"74\" r=\"4\" fill=\"#FFE082\" opacity=\"0.6\"/>\n    <circle cx=\"68\" cy=\"96\" r=\"3.5\" fill=\"#FFE082\" opacity=\"0.6\"/>\n    <circle cx=\"82\" cy=\"108\" r=\"3\" fill=\"#FFE082\" opacity=\"0.5\"/>\n    <circle cx=\"58\" cy=\"106\" r=\"2.5\" fill=\"#FFE082\" opacity=\"0.5\"/>\n    <!-- 顶部绵密奶油雪顶云朵 -->\n    <path d=\"M42 48 C42 42 48 38 54 40 C56 34 64 32 70 34 C76 30 86 32 88 38 C94 38 98 43 97 48 C94 53 45 53 42 48 Z\" fill=\"#FFF9E6\" stroke=\"#FFE082\" stroke-width=\"1.5\"/>\n    <path d=\"M60 36 C64 30 76 30 80 36\" stroke=\"#FFA000\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n    <!-- 芒果小方块果肉 -->\n    <rect x=\"52\" y=\"28\" width=\"10\" height=\"10\" rx=\"2.5\" transform=\"rotate(-15 52 28)\" fill=\"#FF8F00\" stroke=\"#FFF\" stroke-width=\"1\"/>\n    <rect x=\"66\" y=\"24\" width=\"9\" height=\"9\" rx=\"2\" transform=\"rotate(12 66 24)\" fill=\"#FFA000\" stroke=\"#FFF\" stroke-width=\"1\"/>\n    <!-- 薄荷叶 -->\n    <path d=\"M78 22 C84 20 88 23 88 27 C84 28 80 26 78 22 Z\" fill=\"#4CAF50\"/>\n    <path d=\"M79 24 C83 23 85 24 86 26\" stroke=\"#81C784\" stroke-width=\"0.8\"/>\n    <!-- 亮晶晶星星 -->\n    <path d=\"M34 38 L36 43 L41 45 L36 47 L34 52 L32 47 L27 45 L32 43 Z\" fill=\"#FFCA28\"/>\n  </svg>",
  "ESFJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_esfj_tea\" x1=\"70\" y1=\"36\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#E8C39E\"/>\n        <stop offset=\"60%\" stop-color=\"#D7A87A\"/>\n        <stop offset=\"100%\" stop-color=\"#B87D4C\"/>\n      </linearGradient>\n      <filter id=\"f_esfj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#C68B59\" flood-opacity=\"0.3\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"32\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 粗壮波霸吸管 -->\n    <rect x=\"74\" y=\"8\" width=\"12\" height=\"74\" rx=\"6\" transform=\"rotate(14 74 8)\" fill=\"#9C27B0\"/>\n    <rect x=\"76\" y=\"8\" width=\"4\" height=\"74\" rx=\"2\" transform=\"rotate(14 74 8)\" fill=\"#E1BEE7\" opacity=\"0.8\"/>\n    <!-- 圆滚滚胖胖杯身 -->\n    <path d=\"M42 42 L46 114 C47 122 54 126 62 126 L78 126 C86 126 93 122 94 114 L98 42 Z\" fill=\"url(#g_esfj_tea)\" filter=\"url(#f_esfj_glow)\"/>\n    <!-- 黑糖挂壁虎皮纹路 -->\n    <path d=\"M44 48 Q50 68 47 88\" stroke=\"#4E342E\" stroke-width=\"4.5\" stroke-linecap=\"round\" opacity=\"0.85\"/>\n    <path d=\"M96 52 Q91 72 94 92\" stroke=\"#4E342E\" stroke-width=\"4\" stroke-linecap=\"round\" opacity=\"0.85\"/>\n    <path d=\"M68 46 Q72 64 66 78\" stroke=\"#5D4037\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\"0.7\"/>\n    <!-- 饱满 Q 弹黑糖珍珠 -->\n    <circle cx=\"54\" cy=\"116\" r=\"6.5\" fill=\"#211815\"/>\n    <circle cx=\"52.5\" cy=\"114.5\" r=\"2\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <circle cx=\"68\" cy=\"118\" r=\"6.5\" fill=\"#261C19\"/>\n    <circle cx=\"66.5\" cy=\"116.5\" r=\"2\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <circle cx=\"82\" cy=\"117\" r=\"6.5\" fill=\"#1C1412\"/>\n    <circle cx=\"80.5\" cy=\"115.5\" r=\"2\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <circle cx=\"60\" cy=\"106\" r=\"6\" fill=\"#2D201C\"/>\n    <circle cx=\"58.5\" cy=\"104.5\" r=\"1.8\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <circle cx=\"74\" cy=\"107\" r=\"6.2\" fill=\"#221815\"/>\n    <circle cx=\"72.5\" cy=\"105.5\" r=\"1.8\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <circle cx=\"86\" cy=\"107\" r=\"5.5\" fill=\"#2A1E1A\"/>\n    <circle cx=\"84.5\" cy=\"105.5\" r=\"1.6\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <!-- 封口膜与可爱封边 -->\n    <ellipse cx=\"70\" cy=\"42\" rx=\"29\" ry=\"5.5\" fill=\"#FFF\" stroke=\"#D7CCC8\" stroke-width=\"2\"/>\n    <path d=\"M42 42 Q70 48 98 42\" stroke=\"#FF5722\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n    <circle cx=\"76\" cy=\"42\" r=\"7\" fill=\"#E1BEE7\" opacity=\"0.4\"/>\n  </svg>",
  "ENTP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_entp_liq\" x1=\"70\" y1=\"36\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#BA68C8\"/>\n        <stop offset=\"60%\" stop-color=\"#8E24AA\"/>\n        <stop offset=\"100%\" stop-color=\"#4A148C\"/>\n      </linearGradient>\n      <filter id=\"f_entp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#9B59B6\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"28\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 紫色透明玻璃吸管 -->\n    <rect x=\"76\" y=\"10\" width=\"6\" height=\"68\" rx=\"3\" transform=\"rotate(16 76 10)\" fill=\"#CE93D8\"/>\n    <rect x=\"78\" y=\"10\" width=\"2\" height=\"68\" rx=\"1\" transform=\"rotate(16 76 10)\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <!-- 纤长苏打高球杯 -->\n    <path d=\"M46 38 L51 118 C52 123 56 126 62 126 L78 126 C84 126 88 123 89 118 L94 38 Z\" fill=\"url(#g_entp_liq)\" filter=\"url(#f_entp_glow)\"/>\n    <!-- 晶莹剔透深色乌梅 -->\n    <circle cx=\"68\" cy=\"88\" r=\"11\" fill=\"#2E0854\" stroke=\"#4A148C\" stroke-width=\"2\"/>\n    <circle cx=\"65\" cy=\"85\" r=\"3.5\" fill=\"#BA68C8\" opacity=\"0.6\"/>\n    <circle cx=\"64\" cy=\"84\" r=\"1.5\" fill=\"#FFF\" opacity=\"0.85\"/>\n    <!-- 柠檬轮片插在杯口 -->\n    <path d=\"M42 36 A14 14 0 0 1 56 22 L42 36 Z\" fill=\"#FFEE58\" stroke=\"#FDD835\" stroke-width=\"1.8\"/>\n    <circle cx=\"49\" cy=\"29\" r=\"2\" fill=\"#FFF9C4\"/>\n    <!-- 升腾的气泡群 -->\n    <circle cx=\"58\" cy=\"108\" r=\"3\" fill=\"#E1BEE7\" opacity=\"0.8\"/>\n    <circle cx=\"78\" cy=\"112\" r=\"2.5\" fill=\"#E1BEE7\" opacity=\"0.8\"/>\n    <circle cx=\"60\" cy=\"68\" r=\"3.5\" fill=\"#E1BEE7\" opacity=\"0.75\"/>\n    <circle cx=\"80\" cy=\"64\" r=\"2\" fill=\"#E1BEE7\" opacity=\"0.75\"/>\n    <circle cx=\"72\" cy=\"48\" r=\"3\" fill=\"#E1BEE7\" opacity=\"0.9\"/>\n    <!-- 杯外欢快跳跃的气泡 -->\n    <circle cx=\"38\" cy=\"28\" r=\"3\" fill=\"#BA68C8\"/>\n    <circle cx=\"98\" cy=\"22\" r=\"4\" fill=\"#BA68C8\"/>\n    <circle cx=\"106\" cy=\"34\" r=\"2\" fill=\"#BA68C8\"/>\n    <!-- 闪烁星芒 -->\n    <path d=\"M96 14 L97.5 18.5 L102 20 L97.5 21.5 L96 26 L94.5 21.5 L90 20 L94.5 18.5 Z\" fill=\"#FFEB3B\"/>\n  </svg>",
  "ENTJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_entj_crema\" x1=\"70\" y1=\"62\" x2=\"70\" y2=\"92\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#D7A15C\"/>\n        <stop offset=\"45%\" stop-color=\"#A26B33\"/>\n        <stop offset=\"100%\" stop-color=\"#3E2723\"/>\n      </linearGradient>\n      <filter id=\"f_entj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#4E342E\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <!-- 咖啡碟 -->\n    <ellipse cx=\"70\" cy=\"120\" rx=\"46\" ry=\"10\" fill=\"#263238\" stroke=\"#37474F\" stroke-width=\"2\"/>\n    <ellipse cx=\"70\" cy=\"118\" rx=\"36\" ry=\"6\" fill=\"#1E272C\"/>\n    <!-- 小银勺 -->\n    <path d=\"M96 106 L118 122 C120 124 118 126 116 126 L94 110 Z\" fill=\"#B0BEC5\"/>\n    <ellipse cx=\"118\" cy=\"123\" rx=\"5\" ry=\"3\" transform=\"rotate(35 118 123)\" fill=\"#CFD8DC\"/>\n    <!-- 厚实黑金浓缩咖啡杯 -->\n    <path d=\"M40 64 C40 102 50 114 70 114 C90 114 100 102 100 64 Z\" fill=\"#212121\" stroke=\"#37474F\" stroke-width=\"2.5\" filter=\"url(#f_entj_glow)\"/>\n    <!-- 杯把手 -->\n    <path d=\"M98 72 C110 72 112 94 98 96\" stroke=\"#212121\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n    <path d=\"M98 72 C108 72 110 94 98 96\" stroke=\"#37474F\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n    <!-- 丰厚金棕虎皮 Crema 油脂表面 -->\n    <ellipse cx=\"70\" cy=\"65\" rx=\"27\" ry=\"9\" fill=\"url(#g_entj_crema)\"/>\n    <!-- 油脂虎皮纹路拉花 -->\n    <path d=\"M55 64 Q68 69 85 64\" stroke=\"#8D5B28\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>\n    <path d=\"M60 67 Q72 71 78 67\" stroke=\"#4E342E\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>\n    <!-- 优雅升腾热气蒸汽 -->\n    <path d=\"M62 48 Q58 36 64 26 Q70 16 66 10\" stroke=\"#B0BEC5\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\"0.6\"/>\n    <path d=\"M76 46 Q82 34 76 24 Q70 14 74 8\" stroke=\"#B0BEC5\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\"0.6\"/>\n    <!-- 高光 -->\n    <path d=\"M46 72 C46 94 52 104 62 107\" stroke=\"rgba(255,255,255,0.2)\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n  </svg>",
  "ENFP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_enfp_tea\" x1=\"70\" y1=\"40\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#FFAB91\"/>\n        <stop offset=\"50%\" stop-color=\"#FF7043\"/>\n        <stop offset=\"100%\" stop-color=\"#F4511E\"/>\n      </linearGradient>\n      <filter id=\"f_enfp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#FF7043\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"34\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 浅绿清新大吸管 -->\n    <rect x=\"78\" y=\"10\" width=\"9\" height=\"70\" rx=\"4.5\" transform=\"rotate(18 78 10)\" fill=\"#7CB342\"/>\n    <rect x=\"80\" y=\"10\" width=\"3\" height=\"70\" rx=\"1.5\" transform=\"rotate(18 78 10)\" fill=\"#DCEDC8\" opacity=\"0.8\"/>\n    <!-- 大容量透明胖胖桶杯身 -->\n    <path d=\"M40 44 L45 116 C46 123 53 126 61 126 L79 126 C87 126 94 123 95 116 L100 44 Z\" fill=\"url(#g_enfp_tea)\" filter=\"url(#f_enfp_glow)\"/>\n    <!-- 丰富新鲜水果切片 -->\n    <!-- 橙子轮片 -->\n    <circle cx=\"56\" cy=\"68\" r=\"14\" fill=\"#FFB74D\" stroke=\"#FFF\" stroke-width=\"1.5\"/>\n    <circle cx=\"56\" cy=\"68\" r=\"11\" fill=\"#FF9800\"/>\n    <path d=\"M56 57 L56 79 M45 68 L67 68 M48 60 L64 76 M48 76 L64 60\" stroke=\"#FFF\" stroke-width=\"1.2\"/>\n    <!-- 草莓心形片 -->\n    <path d=\"M78 86 C74 80 66 84 70 92 L78 100 L86 92 C90 84 82 80 78 86 Z\" fill=\"#E53935\" stroke=\"#FFF\" stroke-width=\"1.2\"/>\n    <circle cx=\"75\" cy=\"88\" r=\"0.8\" fill=\"#FFF\"/>\n    <circle cx=\"81\" cy=\"88\" r=\"0.8\" fill=\"#FFF\"/>\n    <circle cx=\"78\" cy=\"93\" r=\"0.8\" fill=\"#FFF\"/>\n    <!-- 青柠片 -->\n    <circle cx=\"82\" cy=\"62\" r=\"11\" fill=\"#C0CA33\" stroke=\"#FFF\" stroke-width=\"1.2\"/>\n    <circle cx=\"82\" cy=\"62\" r=\"8.5\" fill=\"#9E9D24\"/>\n    <path d=\"M82 53.5 L82 70.5 M73.5 62 L90.5 62\" stroke=\"#FFF\" stroke-width=\"1\"/>\n    <!-- 西瓜三角块 -->\n    <path d=\"M50 102 L64 100 L56 114 Z\" fill=\"#E53935\"/>\n    <path d=\"M49 102 L65 100\" stroke=\"#43A047\" stroke-width=\"2.5\"/>\n    <!-- 冰块浮动 -->\n    <rect x=\"74\" y=\"44\" width=\"14\" height=\"14\" rx=\"3\" transform=\"rotate(12 74 44)\" fill=\"rgba(255,255,255,0.4)\" stroke=\"rgba(255,255,255,0.8)\" stroke-width=\"1.5\"/>\n    <!-- 杯口饱满白弧 -->\n    <ellipse cx=\"70\" cy=\"44\" rx=\"30\" ry=\"5.5\" fill=\"rgba(255,255,255,0.25)\" stroke=\"#FFF\" stroke-width=\"2.5\"/>\n    <!-- 缤纷跳跃小果粒星星 -->\n    <circle cx=\"34\" cy=\"38\" r=\"3\" fill=\"#FF7043\"/>\n    <circle cx=\"106\" cy=\"50\" r=\"3\" fill=\"#FFB74D\"/>\n    <circle cx=\"100\" cy=\"24\" r=\"3.5\" fill=\"#8BC34A\"/>\n  </svg>",
  "ENFJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_enfj_yuzu\" x1=\"70\" y1=\"42\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#FFF176\"/>\n        <stop offset=\"50%\" stop-color=\"#FBC02D\"/>\n        <stop offset=\"100%\" stop-color=\"#F57F17\"/>\n      </linearGradient>\n      <filter id=\"f_enfj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#F4B942\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"30\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 温润玻璃把手花茶杯 -->\n    <path d=\"M44 48 L48 116 C49 122 55 126 62 126 L78 126 C85 126 91 122 92 116 L96 48 Z\" fill=\"url(#g_enfj_yuzu)\" filter=\"url(#f_enfj_glow)\"/>\n    <!-- 右侧圆润把手 -->\n    <path d=\"M95 62 C108 62 110 96 93 98\" stroke=\"#FFE082\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n    <path d=\"M95 62 C106 62 108 96 93 98\" stroke=\"rgba(255,255,255,0.6)\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n    <!-- 金黄透亮柚子果肉丝丝纤维 -->\n    <path d=\"M54 74 Q64 82 58 96\" stroke=\"#E65100\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\"0.75\"/>\n    <path d=\"M78 80 Q72 92 82 104\" stroke=\"#E65100\" stroke-width=\"2.2\" stroke-linecap=\"round\" opacity=\"0.75\"/>\n    <path d=\"M64 102 Q76 110 68 118\" stroke=\"#EF6C00\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\"0.75\"/>\n    <path d=\"M84 66 Q88 78 82 86\" stroke=\"#E65100\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.6\"/>\n    <!-- 晶莹剔透蜂蜜滴与光斑 -->\n    <circle cx=\"68\" cy=\"76\" r=\"4.5\" fill=\"#FFE082\" opacity=\"0.8\"/>\n    <circle cx=\"66.5\" cy=\"74.5\" r=\"1.5\" fill=\"#FFF\"/>\n    <circle cx=\"56\" cy=\"112\" r=\"3.5\" fill=\"#FFE082\" opacity=\"0.8\"/>\n    <!-- 蜂蜜搅拌木棒斜插 -->\n    <rect x=\"74\" y=\"12\" width=\"7\" height=\"60\" rx=\"3.5\" transform=\"rotate(15 74 12)\" fill=\"#8D6E63\"/>\n    <circle cx=\"83\" cy=\"24\" r=\"6\" fill=\"#A1887F\"/>\n    <circle cx=\"85\" cy=\"32\" r=\"5\" fill=\"#A1887F\"/>\n    <!-- 阳光治愈微光星星 -->\n    <path d=\"M34 42 L36 47 L41 49 L36 51 L34 56 L32 51 L27 49 L32 47 Z\" fill=\"#FFF59D\"/>\n    <path d=\"M98 26 L99.5 30.5 L104 32 L99.5 33.5 L98 38 L96.5 33.5 L92 32 L96.5 30.5 Z\" fill=\"#FFF59D\"/>\n    <!-- 杯口光泽 -->\n    <ellipse cx=\"70\" cy=\"48\" rx=\"26\" ry=\"5\" fill=\"rgba(255,255,255,0.3)\" stroke=\"#FFF\" stroke-width=\"2.2\"/>\n  </svg>",
  "ISTP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_istp_soda\" x1=\"70\" y1=\"40\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#E1F5FE\"/>\n        <stop offset=\"40%\" stop-color=\"#81D4FA\"/>\n        <stop offset=\"100%\" stop-color=\"#0288D1\"/>\n      </linearGradient>\n      <filter id=\"f_istp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#4FC3F7\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"30\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 极简冰晶白吸管 -->\n    <rect x=\"76\" y=\"10\" width=\"6\" height=\"70\" rx=\"3\" transform=\"rotate(14 76 10)\" fill=\"#B3E5FC\"/>\n    <rect x=\"78\" y=\"10\" width=\"2\" height=\"70\" rx=\"1\" transform=\"rotate(14 76 10)\" fill=\"#FFF\" opacity=\"0.9\"/>\n    <!-- 极简直筒海蓝玻璃杯 -->\n    <path d=\"M46 42 L50 118 C50.5 123 54.5 126 60 126 L80 126 C85.5 126 89.5 123 90 118 L94 42 Z\" fill=\"url(#g_istp_soda)\" filter=\"url(#f_istp_glow)\"/>\n    <!-- 巨大剔透冰块 -->\n    <rect x=\"52\" y=\"54\" width=\"19\" height=\"19\" rx=\"4\" transform=\"rotate(-12 52 54)\" fill=\"rgba(255,255,255,0.45)\" stroke=\"rgba(255,255,255,0.9)\" stroke-width=\"2\"/>\n    <rect x=\"68\" y=\"70\" width=\"18\" height=\"18\" rx=\"4\" transform=\"rotate(16 68 70)\" fill=\"rgba(255,255,255,0.38)\" stroke=\"rgba(255,255,255,0.85)\" stroke-width=\"2\"/>\n    <rect x=\"54\" y=\"90\" width=\"16\" height=\"16\" rx=\"3.5\" transform=\"rotate(-8 54 90)\" fill=\"rgba(255,255,255,0.3)\" stroke=\"rgba(255,255,255,0.8)\" stroke-width=\"1.8\"/>\n    <!-- 青柠半月轮片卡在杯壁 -->\n    <path d=\"M86 38 A14 14 0 0 1 96 52 L86 48 Z\" fill=\"#76FF03\" stroke=\"#64DD17\" stroke-width=\"2\"/>\n    <!-- 密集极冷上升气泡 -->\n    <circle cx=\"56\" cy=\"114\" r=\"2.5\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <circle cx=\"72\" cy=\"110\" r=\"3\" fill=\"#FFF\" opacity=\"0.85\"/>\n    <circle cx=\"84\" cy=\"106\" r=\"2\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <circle cx=\"62\" cy=\"78\" r=\"2.5\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <circle cx=\"86\" cy=\"84\" r=\"2\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <circle cx=\"70\" cy=\"46\" r=\"3\" fill=\"#FFF\" opacity=\"0.9\"/>\n    <!-- 极冷雪花星光 -->\n    <path d=\"M38 28 L40 33 L45 35 L40 37 L38 42 L36 37 L31 35 L36 33 Z\" fill=\"#E1F5FE\"/>\n    <ellipse cx=\"70\" cy=\"42\" rx=\"24\" ry=\"4.5\" stroke=\"#FFF\" stroke-width=\"2.5\"/>\n  </svg>",
  "ISTJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_istj_tea\" x1=\"70\" y1=\"46\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#C5E1A5\"/>\n        <stop offset=\"50%\" stop-color=\"#8BC34A\"/>\n        <stop offset=\"100%\" stop-color=\"#558B2F\"/>\n      </linearGradient>\n      <filter id=\"f_istj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#6D8B3D\" flood-opacity=\"0.3\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"32\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 东方禅意平底茶杯 -->\n    <path d=\"M44 48 L48 116 C49 122 55 125 61 125 L79 125 C85 125 91 122 92 116 L96 48 Z\" fill=\"url(#g_istj_tea)\" filter=\"url(#f_istj_glow)\"/>\n    <!-- 沉静微透光茶汤水面涟漪 -->\n    <ellipse cx=\"70\" cy=\"56\" rx=\"20\" ry=\"4\" stroke=\"rgba(255,255,255,0.4)\" stroke-width=\"1.5\" fill=\"none\"/>\n    <ellipse cx=\"70\" cy=\"56\" rx=\"12\" ry=\"2.5\" stroke=\"rgba(255,255,255,0.5)\" stroke-width=\"1.2\" fill=\"none\"/>\n    <!-- 一片优雅舒展的翠绿完整乌龙茶叶浮在水面 -->\n    <path d=\"M64 54 C66 48 76 50 78 56 C74 58 66 58 64 54 Z\" fill=\"#33691E\" stroke=\"#558B2F\" stroke-width=\"1\"/>\n    <path d=\"M66 54 L76 55\" stroke=\"#8BC34A\" stroke-width=\"0.8\"/>\n    <!-- 茶叶尖叶梗 -->\n    <path d=\"M64 54 Q61 55 60 57\" stroke=\"#33691E\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n    <!-- 杯身简约几何木质/竹质杯套线 -->\n    <line x1=\"46\" y1=\"78\" x2=\"94\" y2=\"78\" stroke=\"#3E2723\" stroke-width=\"2.5\" stroke-dasharray=\"4 3\"/>\n    <line x1=\"47\" y1=\"88\" x2=\"93\" y2=\"88\" stroke=\"#3E2723\" stroke-width=\"2.5\" stroke-dasharray=\"4 3\"/>\n    <!-- 沉稳杯口质感厚白边 -->\n    <ellipse cx=\"70\" cy=\"48\" rx=\"26\" ry=\"5.5\" fill=\"rgba(255,255,255,0.25)\" stroke=\"#ECEFF1\" stroke-width=\"3\"/>\n    <path d=\"M48 56 L51 114\" stroke=\"rgba(255,255,255,0.3)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n  </svg>",
  "ISFP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_isfp_layer\" x1=\"70\" y1=\"46\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#FFFFFF\"/>\n        <stop offset=\"35%\" stop-color=\"#DCEDC8\"/>\n        <stop offset=\"65%\" stop-color=\"#8BC34A\"/>\n        <stop offset=\"100%\" stop-color=\"#33691E\"/>\n      </linearGradient>\n      <filter id=\"f_isfp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#7CB342\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"30\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 优雅渐变玻璃拿铁杯 -->\n    <path d=\"M46 46 L50 116 C51 122 56 125 62 125 L78 125 C84 125 89 122 90 116 L94 46 Z\" fill=\"url(#g_isfp_layer)\" filter=\"url(#f_isfp_glow)\"/>\n    <!-- 拿铁分层交界云雾感 -->\n    <path d=\"M48 76 Q60 82 72 75 Q84 69 92 74\" stroke=\"#AED581\" stroke-width=\"4\" stroke-linecap=\"round\" opacity=\"0.8\"/>\n    <path d=\"M49 92 Q62 96 74 90 Q84 86 91 90\" stroke=\"#689F38\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\"0.8\"/>\n    <!-- 顶部绵密奶泡层 -->\n    <ellipse cx=\"70\" cy=\"46\" rx=\"24\" ry=\"5.5\" fill=\"#FFFDE7\" stroke=\"#DCEDC8\" stroke-width=\"2\"/>\n    <!-- 顶部精美抹茶爱心拉花 -->\n    <path d=\"M70 47 C65 43 59 46 63 50 L70 54 L77 50 C81 46 75 43 70 47 Z\" fill=\"#558B2F\"/>\n    <path d=\"M70 45 L70 55\" stroke=\"#33691E\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n    <!-- 抹茶粉星星点点撒落 -->\n    <circle cx=\"58\" cy=\"45\" r=\"1.2\" fill=\"#558B2F\"/>\n    <circle cx=\"62\" cy=\"43\" r=\"1\" fill=\"#558B2F\"/>\n    <circle cx=\"78\" cy=\"44\" r=\"1.2\" fill=\"#558B2F\"/>\n    <circle cx=\"82\" cy=\"47\" r=\"1\" fill=\"#558B2F\"/>\n    <!-- 艺术感水滴光泽 -->\n    <path d=\"M50 56 L53 110\" stroke=\"rgba(255,255,255,0.4)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n    <!-- 浪漫四芒星 -->\n    <path d=\"M96 24 L98 29 L103 31 L98 33 L96 38 L94 33 L89 31 L94 29 Z\" fill=\"#C5E1A5\"/>\n  </svg>",
  "ISFJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_isfj_milk\" x1=\"70\" y1=\"46\" x2=\"70\" y2=\"120\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#FFFFFF\"/>\n        <stop offset=\"50%\" stop-color=\"#FFF9C4\"/>\n        <stop offset=\"100%\" stop-color=\"#FFE082\"/>\n      </linearGradient>\n      <filter id=\"f_isfj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#F5D7A1\" flood-opacity=\"0.4\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"126\" rx=\"34\" ry=\"6\" fill=\"rgba(0,0,0,0.15)\"/>\n    <!-- 圆滚滚可爱白瓷马克杯 -->\n    <path d=\"M42 52 C42 104 50 118 70 118 C90 118 98 104 98 52 Z\" fill=\"#FFFDE7\" stroke=\"#FFE082\" stroke-width=\"3\" filter=\"url(#f_isfj_glow)\"/>\n    <!-- 大大温暖杯把手 -->\n    <path d=\"M96 64 C112 64 114 96 96 98\" stroke=\"#FFE082\" stroke-width=\"7\" stroke-linecap=\"round\"/>\n    <path d=\"M96 64 C110 64 112 96 96 98\" stroke=\"#FFF\" stroke-width=\"3.5\" stroke-linecap=\"round\"/>\n    <!-- 温暖热牛奶液面 -->\n    <ellipse cx=\"70\" cy=\"52\" rx=\"28\" ry=\"8\" fill=\"url(#g_isfj_milk)\"/>\n    <!-- 漂浮小棉花糖 -->\n    <rect x=\"62\" y=\"47\" width=\"10\" height=\"9\" rx=\"3\" transform=\"rotate(-10 62 47)\" fill=\"#FFF\" stroke=\"#FFCCBC\" stroke-width=\"1.2\"/>\n    <rect x=\"74\" y=\"50\" width=\"8\" height=\"7\" rx=\"2.5\" transform=\"rotate(15 74 50)\" fill=\"#FFF\" stroke=\"#FFCCBC\" stroke-width=\"1.2\"/>\n    <!-- 杯身上治愈小爱心贴图 -->\n    <path d=\"M70 82 C67 78 61 80 63 84 L70 90 L77 84 C79 80 73 78 70 82 Z\" fill=\"#FF8A80\"/>\n    <!-- 升腾的治愈心形蒸汽云朵 -->\n    <path d=\"M58 38 C54 30 64 24 68 30 C72 24 82 30 78 38 C74 44 62 44 58 38 Z\" fill=\"rgba(255,255,255,0.7)\"/>\n    <path d=\"M66 22 Q64 14 70 8\" stroke=\"#FFF\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.6\"/>\n  </svg>",
  "INTP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_intp_cold\" x1=\"70\" y1=\"40\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#455A64\"/>\n        <stop offset=\"50%\" stop-color=\"#263238\"/>\n        <stop offset=\"100%\" stop-color=\"#102027\"/>\n      </linearGradient>\n      <filter id=\"f_intp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#37474F\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"32\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 实验烧杯/几何冷萃杯身 -->\n    <path d=\"M46 44 L44 116 C44 122 50 126 58 126 L82 126 C90 126 96 122 96 116 L94 44 Z\" fill=\"url(#g_intp_cold)\" filter=\"url(#f_intp_glow)\"/>\n    <!-- 科学刻度线 -->\n    <line x1=\"84\" y1=\"62\" x2=\"92\" y2=\"62\" stroke=\"rgba(255,255,255,0.45)\" stroke-width=\"1.8\"/>\n    <line x1=\"86\" y1=\"74\" x2=\"92\" y2=\"74\" stroke=\"rgba(255,255,255,0.35)\" stroke-width=\"1.5\"/>\n    <line x1=\"84\" y1=\"86\" x2=\"92\" y2=\"86\" stroke=\"rgba(255,255,255,0.45)\" stroke-width=\"1.8\"/>\n    <line x1=\"86\" y1=\"98\" x2=\"92\" y2=\"98\" stroke=\"rgba(255,255,255,0.35)\" stroke-width=\"1.5\"/>\n    <!-- 单个超大正圆手工冰球 -->\n    <circle cx=\"68\" cy=\"84\" r=\"16\" fill=\"rgba(255,255,255,0.32)\" stroke=\"rgba(255,255,255,0.85)\" stroke-width=\"2\"/>\n    <ellipse cx=\"64\" cy=\"78\" rx=\"6\" ry=\"4\" transform=\"rotate(-30 64 78)\" fill=\"#FFF\" opacity=\"0.6\"/>\n    <!-- 烧杯倒嘴 -->\n    <path d=\"M46 44 L40 40 L44 48 Z\" fill=\"rgba(255,255,255,0.6)\"/>\n    <!-- 平整烧杯口 -->\n    <ellipse cx=\"70\" cy=\"44\" rx=\"24\" ry=\"4.5\" fill=\"rgba(255,255,255,0.15)\" stroke=\"#FFF\" stroke-width=\"2.5\"/>\n    <!-- 科技极客四芒星 -->\n    <path d=\"M98 22 L99.5 27.5 L105 29 L99.5 30.5 L98 36 L96.5 30.5 L91 29 L96.5 27.5 Z\" fill=\"#90A4AE\"/>\n  </svg>",
  "INTJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_intj_liq\" x1=\"70\" y1=\"70\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#5D4037\"/>\n        <stop offset=\"50%\" stop-color=\"#3E2723\"/>\n        <stop offset=\"100%\" stop-color=\"#1B0000\"/>\n      </linearGradient>\n      <filter id=\"f_intj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#263238\" flood-opacity=\"0.4\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"36\" ry=\"6\" fill=\"rgba(0,0,0,0.2)\"/>\n    <!-- 下层分享壶 -->\n    <path d=\"M42 72 L36 116 C35 122 40 126 48 126 L92 126 C100 126 105 122 104 116 L98 72 Z\" fill=\"url(#g_intj_liq)\" filter=\"url(#f_intj_glow)\"/>\n    <!-- 分享壶把手 -->\n    <path d=\"M100 78 C114 80 114 112 98 116\" stroke=\"#455A64\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n    <path d=\"M100 78 C112 80 112 112 98 116\" stroke=\"#90A4AE\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n    <!-- 上层 V60 滤杯 -->\n    <path d=\"M40 28 L56 68 L84 68 L100 28 Z\" fill=\"#CFD8DC\" stroke=\"#78909C\" stroke-width=\"2.2\"/>\n    <ellipse cx=\"70\" cy=\"28\" rx=\"30\" ry=\"6\" fill=\"#ECEFF1\" stroke=\"#90A4AE\" stroke-width=\"2\"/>\n    <!-- 滤纸与咖啡粉层 -->\n    <path d=\"M46 32 L58 64 L82 64 L94 32 Z\" fill=\"#D7CCC8\"/>\n    <ellipse cx=\"70\" cy=\"34\" rx=\"20\" ry=\"3.5\" fill=\"#3E2723\"/>\n    <!-- 悬空正在滴落的纯黑手冲水滴 -->\n    <path d=\"M70 66 C68 66 67 69 70 73 C73 69 72 66 70 66 Z\" fill=\"#3E2723\"/>\n    <!-- 分享壶琥珀光泽 -->\n    <path d=\"M42 80 L39 114\" stroke=\"rgba(255,255,255,0.3)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n  </svg>",
  "INFP": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_infp_mint\" x1=\"70\" y1=\"42\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#E8F5E9\"/>\n        <stop offset=\"45%\" stop-color=\"#A5D6A7\"/>\n        <stop offset=\"100%\" stop-color=\"#66BB6A\"/>\n      </linearGradient>\n      <filter id=\"f_infp_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#81C784\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <ellipse cx=\"70\" cy=\"128\" rx=\"30\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <!-- 薄荷绿与粉白相间小吸管 -->\n    <rect x=\"78\" y=\"10\" width=\"7\" height=\"66\" rx=\"3.5\" transform=\"rotate(18 78 10)\" fill=\"#81C784\"/>\n    <rect x=\"80\" y=\"10\" width=\"2.5\" height=\"66\" rx=\"1.2\" transform=\"rotate(18 78 10)\" fill=\"#F8BBD0\"/>\n    <!-- 梦幻马卡龙色杯身 -->\n    <path d=\"M44 46 L48 116 C49 122 55 125 62 125 L78 125 C85 125 91 122 92 116 L96 46 Z\" fill=\"url(#g_infp_mint)\" filter=\"url(#f_infp_glow)\"/>\n    <!-- 顶部绵密小奶盖云朵 -->\n    <ellipse cx=\"70\" cy=\"46\" rx=\"26\" ry=\"6.5\" fill=\"#FFF\" stroke=\"#C8E6C9\" stroke-width=\"2\"/>\n    <!-- 治愈薄荷双生小嫩芽 -->\n    <path d=\"M70 42 C64 36 60 40 64 44 C68 44 70 43 70 42 Z\" fill=\"#4CAF50\"/>\n    <path d=\"M70 42 C76 36 80 40 76 44 C72 44 70 43 70 42 Z\" fill=\"#66BB6A\"/>\n    <path d=\"M70 42 L70 46\" stroke=\"#388E3C\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n    <!-- 梦幻彩虹小光点与气泡 -->\n    <circle cx=\"56\" cy=\"82\" r=\"3\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <circle cx=\"78\" cy=\"94\" r=\"3.5\" fill=\"#FFF\" opacity=\"0.75\"/>\n    <circle cx=\"64\" cy=\"110\" r=\"2.5\" fill=\"#FFF\" opacity=\"0.8\"/>\n    <!-- 浪漫四芒星与粉心 -->\n    <path d=\"M34 36 L36 41 L41 43 L36 45 L34 50 L32 45 L27 43 L32 41 Z\" fill=\"#FF80AB\"/>\n    <path d=\"M98 22 L100 27 L105 29 L100 31 L98 36 L96 31 L91 29 L96 27 Z\" fill=\"#B9F6CA\"/>\n  </svg>",
  "INFJ": "<svg viewBox=\"0 0 140 140\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" class=\"drink-art-svg\">\n    <defs>\n      <linearGradient id=\"g_infj_tea\" x1=\"70\" y1=\"48\" x2=\"70\" y2=\"124\" gradientUnits=\"userSpaceOnUse\">\n        <stop offset=\"0%\" stop-color=\"#FFE082\"/>\n        <stop offset=\"50%\" stop-color=\"#FFB74D\"/>\n        <stop offset=\"100%\" stop-color=\"#B08D57\"/>\n      </linearGradient>\n      <filter id=\"f_infj_glow\" x=\"-10\" y=\"-10\" width=\"160\" height=\"160\">\n        <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#B08D57\" flood-opacity=\"0.35\"/>\n      </filter>\n    </defs>\n    <!-- 禅意底托 -->\n    <ellipse cx=\"70\" cy=\"128\" rx=\"34\" ry=\"6\" fill=\"rgba(0,0,0,0.18)\"/>\n    <ellipse cx=\"70\" cy=\"124\" rx=\"28\" ry=\"4\" fill=\"#5D4037\" opacity=\"0.5\"/>\n    <!-- 东方紫砂/青瓷细口温润茶杯 -->\n    <path d=\"M44 50 C44 80 40 102 48 116 C49 121 54 124 61 124 L79 124 C86 124 91 121 92 116 C100 102 96 80 96 50 Z\" fill=\"url(#g_infj_tea)\" filter=\"url(#f_infj_glow)\"/>\n    <!-- 水面漂浮散落的金黄四瓣桂花 -->\n    <g transform=\"translate(60, 60)\">\n      <circle cx=\"0\" cy=\"-3\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"3\" cy=\"0\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"0\" cy=\"3\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"-3\" cy=\"0\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"0\" cy=\"0\" r=\"1.2\" fill=\"#FF8F00\"/>\n    </g>\n    <g transform=\"translate(76, 72) scale(0.85)\">\n      <circle cx=\"0\" cy=\"-3\" r=\"2\" fill=\"#FFE082\"/>\n      <circle cx=\"3\" cy=\"0\" r=\"2\" fill=\"#FFE082\"/>\n      <circle cx=\"0\" cy=\"3\" r=\"2\" fill=\"#FFE082\"/>\n      <circle cx=\"-3\" cy=\"0\" r=\"2\" fill=\"#FFE082\"/>\n      <circle cx=\"0\" cy=\"0\" r=\"1.2\" fill=\"#FF8F00\"/>\n    </g>\n    <g transform=\"translate(66, 92) scale(0.9)\">\n      <circle cx=\"0\" cy=\"-3\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"3\" cy=\"0\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"0\" cy=\"3\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"-3\" cy=\"0\" r=\"2\" fill=\"#FFD54F\"/>\n      <circle cx=\"0\" cy=\"0\" r=\"1.2\" fill=\"#FF8F00\"/>\n    </g>\n    <!-- 幽香缥缈淡金色香气烟雾 -->\n    <path d=\"M60 42 Q54 32 62 22 Q70 12 66 6\" stroke=\"#FFE082\" stroke-width=\"1.8\" stroke-linecap=\"round\" opacity=\"0.6\"/>\n    <path d=\"M78 40 Q84 30 78 20 Q72 10 76 4\" stroke=\"#FFE082\" stroke-width=\"1.8\" stroke-linecap=\"round\" opacity=\"0.6\"/>\n    <!-- 杯口质感 -->\n    <ellipse cx=\"70\" cy=\"50\" rx=\"26\" ry=\"5\" fill=\"rgba(255,255,255,0.25)\" stroke=\"#FFE082\" stroke-width=\"2.2\"/>\n  </svg>"
};

const QUESTIONS_DRINK = [{"q":"周五晚上突然空出一整晚，你的第一反应是——","opts":[{"t":"快摇人！这么好的夜晚不组局可惜了","k":"E"},{"t":"太好了，终于可以独处充电了","k":"I"},{"t":"先把周末两天都安排明白","k":"J"},{"t":"随缘，今晚走到哪算哪","k":"P"}]},{"q":"朋友深夜发来 59 秒语音连环吐槽，你会——","opts":[{"t":"立刻回拨，先接住他的情绪","k":"F"},{"t":"听完理出问题，回三条建议","k":"T"},{"t":"逐条回应语音里的每一件事","k":"S"},{"t":"听着听着开始联想别的，聊飞了","k":"N"}]},{"q":"新任务突然砸到手上，你的开局是——","opts":[{"t":"拉表排期，拆好每一步再动工","k":"J"},{"t":"先干起来，方向边跑边调","k":"P"},{"t":"先脑暴：有没有更聪明的玩法","k":"N"},{"t":"先问清验收标准和死线","k":"S"}]},{"q":"在奶茶店，店员问「要不要试试新品」，你会——","opts":[{"t":"试！顺便跟店员聊上两句","k":"E"},{"t":"不用了，我常喝的就那一杯","k":"I"},{"t":"店员推荐得这么真诚，那就试试","k":"F"},{"t":"先看配料表和价格再决定","k":"T"}]},{"q":"你的快乐瞬间，更像下面哪一种——","opts":[{"t":"奶茶第一口咬到珍珠，扎实","k":"S"},{"t":"洗澡时突然想到一个绝妙点子","k":"N"},{"t":"一桌人被你逗笑到拍桌子","k":"E"},{"t":"深夜独处，整个世界安静下来","k":"I"}]},{"q":"旅行前一晚，你的行李箱是——","opts":[{"t":"还没收拾，反正路上什么都买得到","k":"P"},{"t":"清单逐项打钩，充电宝都备两块","k":"J"},{"t":"只带必需品，轻装上阵","k":"T"},{"t":"塞了给朋友们带的特产和小礼物","k":"F"}]},{"q":"团建拍大合照，你通常是——","opts":[{"t":"站在队伍边缘，笑得比较含蓄","k":"I"},{"t":"站 C 位，顺便指挥大家摆姿势","k":"E"},{"t":"摆着摆着开始即兴发挥","k":"N"},{"t":"站好别动，数到三准时看镜头","k":"S"}]},{"q":"计划被临时打乱，你的内心是——","opts":[{"t":"快速评估损失，马上换 B 方案","k":"T"},{"t":"有点难受，需要缓一缓","k":"F"},{"t":"正好！其实早就想改了","k":"P"},{"t":"表面淡定，内心已重排全部计划","k":"J"}]},{"q":"朋友让你推荐一家餐厅，你会——","opts":[{"t":"开始描述氛围：灯光、音乐、靠窗的位置","k":"N"},{"t":"甩出店名+招牌菜+人均+导航","k":"S"},{"t":"发个收藏链接，不想多打字","k":"I"},{"t":"「走！我带你去，现在就出发」","k":"E"}]},{"q":"听到别人当面吐槽你的缺点，你会——","opts":[{"t":"心里先受伤，之后反复回味","k":"F"},{"t":"有道理就记下，没道理就归零","k":"T"},{"t":"反感「突袭」，下次请提前预约","k":"J"},{"t":"哈哈一笑，五分钟后就忘了","k":"P"}]},{"q":"你发朋友圈 / 动态的频率和画风——","opts":[{"t":"高频，生活直播现场","k":"E"},{"t":"极少冒泡，看看别人就好","k":"I"},{"t":"只发实拍，九宫格纪律严明","k":"S"},{"t":"文案比图精彩，全是脑洞","k":"N"}]},{"q":"聊到「五年后的自己」，你心里想的是——","opts":[{"t":"五年计划早就写好了","k":"J"},{"t":"计划赶不上变化，先活好当下","k":"P"},{"t":"希望爱我的人和我爱的人都在","k":"F"},{"t":"列了目标清单，按性价比排好了序","k":"T"}]}];

const QUESTIONS_MBTI_SHORT = [{"q":"在大型社交聚会或派对中，你通常处于什么状态？","opts":[{"t":"与许多人交流互动，结识新朋友让你越聊越兴奋","k":"E"},{"t":"更愿意和少数几位熟人深聊，社交时间长了会感到消耗精力","k":"I"}]},{"q":"经历了一整周高强度的忙碌后，周末你想如何恢复能量？","opts":[{"t":"和朋友聚餐、逛街、参加户外活动，在热闹中释放压力","k":"E"},{"t":"独自宅在家里看书、打游戏或放空，享受无人打扰的宁静","k":"I"}]},{"q":"遇到棘手问题或复杂情绪时，你第一反应倾向于：","opts":[{"t":"找信任的朋友倾诉，在与别人的讨论中理清头绪","k":"E"},{"t":"先一个人静静思考消化，等自己想明白了再考虑是否与人说","k":"I"}]},{"q":"进入一个全新的集体环境（如新团队或新班级），你通常：","opts":[{"t":"比较主动地自我介绍并开启话题，破冰对你来说相对自然","k":"E"},{"t":"习惯先保持低调观察，等待别人主动接近或慢慢熟悉","k":"I"}]},{"q":"在多人参与的头脑风暴或讨论会上，你的表达习惯是：","opts":[{"t":"边说边想，想到新点子就立刻抛出来与大家碰火花","k":"E"},{"t":"先在心里反复推敲斟酌，等到观点相对成熟时再发言","k":"I"}]},{"q":"如果你必须在一个陌生的城市独自度过一整天：","opts":[{"t":"你会主动探索热闹的市集、打卡网红店，享受与陌生人的偶遇互动","k":"E"},{"t":"你会漫步于幽静的美术馆、老巷子或书店，享受深度的独处探索","k":"I"}]},{"q":"周围人对你的日常社交印象更接近下面哪一种？","opts":[{"t":"开朗热情、反应敏捷、容易打成一片，情绪较为外显","k":"E"},{"t":"沉稳独立、注重边界感、有自己的精神世界，不易完全看透","k":"I"}]},{"q":"接触并学习一项全新技能或概念时，你更关注：","opts":[{"t":"具体的案例、明确的操作步骤以及当前的现实应用","k":"S"},{"t":"背后的底层原理、发展脉络以及未来的各种可能性","k":"N"}]},{"q":"当你向别人描述一件事情时，你的表达偏好是：","opts":[{"t":"如实还原具体的时间、地点、数据和事实细节","k":"S"},{"t":"概述整体感觉、深层含义以及由此引发的脑洞与启示","k":"N"}]},{"q":"当思考“未来的方向”时，你的思维重心往往落在：","opts":[{"t":"立足当前的现实条件与可用资源，走好当下的每一步","k":"S"},{"t":"描绘未来的长远蓝图与宏观愿景，寻找突破现有限制的机会","k":"N"}]},{"q":"在阅读或观影时，哪类风格更容易引发你的共鸣？","opts":[{"t":"刻画入微、逻辑写实、细节扎实有据的纪实与现实主义作品","k":"S"},{"t":"隐喻深刻、富有哲学意味、脑洞大开的科幻与先锋象征作品","k":"N"}]},{"q":"面对已被前人长期验证过的成熟经验或规范流程：","opts":[{"t":"倾向于遵循并熟练运用它，因为这通常是最省力且稳妥的途径","k":"S"},{"t":"忍不住琢磨是否有遗漏的漏洞，渴望跳出框架寻找全新的颠覆解法","k":"N"}]},{"q":"如果用一个词形容你的注意力习惯，它更偏向于：","opts":[{"t":"立足实景：眼见为实，善于观察周围环境的现实变化与细节","k":"S"},{"t":"浮想联翩：容易走神，脑海里常像播放电影一样联想不同概念","k":"N"}]},{"q":"做决策或制定计划时，你最信任的信息来源是：","opts":[{"t":"过往累积的真实经验数据、眼前的客观证据与落地先例","k":"S"},{"t":"对事物发展大趋势的直觉预感、潜在洞察与前瞻性设想","k":"N"}]},{"q":"面对工作中的重大方案决策，你首要依据的评判标准是：","opts":[{"t":"客观数据、投入产出比逻辑与方案本身的严密性","k":"T"},{"t":"该决定对团队成员心理、人际氛围及各方感受的影响","k":"F"}]},{"q":"当朋友陷入低谷向你诉苦时，你下意识的本能反应是：","opts":[{"t":"迅速帮 TA 理清问题根源，分析并提供切实可行的解决建议","k":"T"},{"t":"优先照顾并接住 TA 的情绪，给予无条件的拥抱、倾听与共情","k":"F"}]},{"q":"评价一个优秀的团队领导者时，你更看重哪项素质？","opts":[{"t":"决断果敢、能力过硬、赏罚分明，能够带领团队高效拿到成果","k":"T"},{"t":"善解人意、关怀成员、善于凝聚人心，能够营造温暖和谐的氛围","k":"F"}]},{"q":"在一场激烈的讨论或争辩中，你的态度是：","opts":[{"t":"真理越辩越明，分清是非曲直比表面的一团和气更重要","k":"T"},{"t":"委婉表达自己的观点，尽量避免发生言语冲突导致双方伤了感情","k":"F"}]},{"q":"做重大消费决定（如换新手机或大件数码家电）时，你更依赖：","opts":[{"t":"各平台性能测评数据、性价比参数对比与功能实用度","k":"T"},{"t":"品牌审美、外观设计眼缘以及使用该产品时带来的主观愉悦感","k":"F"}]},{"q":"当你不得不向下属或合作伙伴指出严重工作失误时：","opts":[{"t":"实事求是直击痛点，直接说明问题与后果，讲求效率","k":"T"},{"t":"深思熟虑措辞，先肯定付出再委婉提醒，避免伤害对方自尊心","k":"F"}]},{"q":"你如何看待“原则”与“人情”之间的冲突？","opts":[{"t":"无规矩不成方圆，原则一旦确立就应对所有人一视同仁","k":"T"},{"t":"规则是死的人是活的，面对特殊困境应当有人情味的变通","k":"F"}]},{"q":"面对一次期待已久的远途旅行，你的准备方式是：","opts":[{"t":"提前规划好路线、酒店和每日核心打卡点，准备好备选方案","k":"J"},{"t":"只定好大交通，走到哪里算哪里，享受未知的惊喜与偶遇","k":"P"}]},{"q":"面对一个两周后截止的重要任务，你通常的节奏是：","opts":[{"t":"制定阶段进度，每天推进一部分，在截止前留出充裕的复核时间","k":"J"},{"t":"边做边寻找灵感，在临近死线的紧迫感与倒计时中集中爆发","k":"P"}]},{"q":"当原本安排好的日程突然被不可控因素打乱时，你的内心反应通常是：","opts":[{"t":"感到阵阵烦躁或不适，会立即调整并重新梳理出一套新秩序","k":"J"},{"t":"适应良好，觉得“变化本来就是常态”，顺其自然随遇而安","k":"P"}]},{"q":"环顾你的日常办公桌或电脑文件目录，它更呈现出：","opts":[{"t":"分类清晰、层级分明，常用物品用完后习惯物归原位","k":"J"},{"t":"相对自由随意，虽然他人看来有些杂乱，但自己心里清楚位置","k":"P"}]},{"q":"当一件重要的事情尚未尘埃落定时，你的心理状态是：","opts":[{"t":"心里一直悬着不踏实，迫切希望尽快敲定并看到明确结论","k":"J"},{"t":"觉得完全可以接受，保持开放态度、留有更多可能性更自由","k":"P"}]},{"q":"去大型超市或商场购物时，你的习惯是：","opts":[{"t":"心中或手机里有明确的必买清单，直奔目标货架，高效搞定","k":"J"},{"t":"漫步闲逛，随走随看，遇到感兴趣或打折的东西就顺便加购","k":"P"}]},{"q":"你更向往的生活状态与人生步调是：","opts":[{"t":"心中有明确节奏与目标、生活秩序井然、充满掌控感的状态","k":"J"},{"t":"自由随性、充满变数与新体验、不受过多条条框框束缚的状态","k":"P"}]}];

const QUESTIONS_MBTI_FORM_M = [{"q":"在大型社交聚会或派对中，你通常处于什么状态？","opts":[{"t":"与许多人交流互动，结识新朋友让你越聊越兴奋","k":"E"},{"t":"更愿意和少数几位熟人深聊，社交时间长了会感到消耗精力","k":"I"}]},{"q":"经历了一整周高强度的忙碌后，周末你想如何恢复能量？","opts":[{"t":"和朋友聚餐、逛街、参加户外活动，在热闹中释放压力","k":"E"},{"t":"独自宅在家里看书、打游戏或放空，享受无人打扰的宁静","k":"I"}]},{"q":"遇到棘手问题或复杂情绪时，你第一反应倾向于：","opts":[{"t":"找信任的朋友倾诉，在与别人的讨论中理清头绪","k":"E"},{"t":"先一个人静静思考消化，等自己想明白了再考虑是否与人说","k":"I"}]},{"q":"进入一个全新的集体环境（如新团队或新班级），你通常：","opts":[{"t":"比较主动地自我介绍并开启话题，破冰对你来说相对自然","k":"E"},{"t":"习惯先保持低调观察，等待别人主动接近或慢慢熟悉","k":"I"}]},{"q":"在多人参与的头脑风暴或讨论会上，你的表达习惯是：","opts":[{"t":"边说边想，想到新点子就立刻抛出来与大家碰火花","k":"E"},{"t":"先在心里反复推敲斟酌，等到观点相对成熟时再发言","k":"I"}]},{"q":"如果你必须在一个陌生的城市独自度过一整天：","opts":[{"t":"你会主动探索热闹的市集、打卡网红店，享受与陌生人的偶遇互动","k":"E"},{"t":"你会漫步于幽静的美术馆、老巷子或书店，享受深度的独处探索","k":"I"}]},{"q":"周围人对你的日常社交印象更接近下面哪一种？","opts":[{"t":"开朗热情、反应敏捷、容易打成一片，情绪较为外显","k":"E"},{"t":"沉稳独立、注重边界感、有自己的精神世界，不易完全看透","k":"I"}]},{"q":"当面对一个需要跨多个部门协同的复杂项目时，你更适应的工作角色是：","opts":[{"t":"站在台前充当核心联络人与宣讲者，积极穿梭于各方沟通协调","k":"E"},{"t":"退居幕后专注把控核心逻辑、方案设计与专项难题攻关","k":"I"}]},{"q":"在参加一个持续多天的行业峰会或线下培训时，你的精力曲线通常是：","opts":[{"t":"越听越兴奋，晚上的交流酒会或夜聊聚会依然能神采奕奕参与","k":"E"},{"t":"白天虽全神贯注，但傍晚只想迅速回到自己的房间安静独处充能","k":"I"}]},{"q":"在你的手机通讯录或社交好友列表中，你的人际网络更趋向于：","opts":[{"t":"范围广泛，好友众多，且能在不同的圈子中迅速找到共同话题","k":"E"},{"t":"圈子高度精炼，只有少数几位历经多年考验的挚友保持深度联络","k":"I"}]},{"q":"当你在工作中突然产生了一个极有创意的灵感点子时，你更自然的习惯是：","opts":[{"t":"立刻转头分享给身边的同事或拉人快速碰撞，在互动中完善它","k":"E"},{"t":"先自己默默写在备忘录里梳理推演，等成型有把握后再对外提出","k":"I"}]},{"q":"如果在毫无安排的假期里连续三天完全一个人独处、没有任何社交对话：","opts":[{"t":"会感到有些失落无聊甚至憋闷，极度渴望出去走走或约朋友聊聊天","k":"E"},{"t":"感到极其惬意与充实，甚至希望这样的神仙独处时光能更长一点","k":"I"}]},{"q":"在大型公开会议上当主持人突然点名要求即兴发表看法时：","opts":[{"t":"通常能快速接话，边讲边组织语言，不怯场且容易带动现场氛围","k":"E"},{"t":"内心会有一丝抗拒，更希望提前拿到发言提纲，讨厌毫无准备地开麦","k":"I"}]},{"q":"你如何定义高质量的‘休息与充电’？","opts":[{"t":"换个环境，和志同道合的人一起做一件有趣又有活力的新鲜事","k":"E"},{"t":"彻底切断外界的嘈杂信息输入，在不受打扰的私密空间里沉淀自我","k":"I"}]},{"q":"收到朋友突然发来的视频通话请求时，你的本能反应通常是：","opts":[{"t":"直接按接听，觉得视频面对面聊天更亲切、效率更高","k":"E"},{"t":"有些措手不及，往往更希望对方先打字说明来意或发语音","k":"I"}]},{"q":"在开放式大工位或咖啡厅等嘈杂环境中工作时：","opts":[{"t":"周围的人声和动静对你影响不大，甚至觉得有些热闹的环境更有干劲","k":"E"},{"t":"极难长时间集中注意力，必须戴上降噪耳机或寻找封闭安静的角落","k":"I"}]},{"q":"当你与他人初次见面产生短暂的尴尬沉默时，你通常会：","opts":[{"t":"感到有些不自在，主动寻找天气、衣着或周遭事物等话题打破沉默","k":"E"},{"t":"觉得沉默完全可以接受，静观其变，不觉得有必要强行找话聊","k":"I"}]},{"q":"在团队完成了一项重大成就之后，你最向往的庆祝方式是：","opts":[{"t":"全员一起去热闹的餐厅聚餐、开香槟狂欢，大声分享喜悦","k":"E"},{"t":"在群里发个红包互道辛苦，然后各自早早回家享受宁静的夜晚","k":"I"}]},{"q":"关于‘结识新朋友’，你内心的真实写照更接近：","opts":[{"t":"生活就像开盲盒，结识形形色色的人能极大丰富认知与体验","k":"E"},{"t":"建立新的人际链接需要投入大量社交成本，随缘就好，无需强求","k":"I"}]},{"q":"当你在思考一个极其抽象复杂的理论时，哪种方式让你效率更高？","opts":[{"t":"找一个伙伴相互问答、辩论，在言语攻防中理顺逻辑体系","k":"E"},{"t":"独自在纸上画思维导图或闭目凝神，在深层内心世界中推演","k":"I"}]},{"q":"在旅行途中，如果遇到同样独自旅行的热情背包客：","opts":[{"t":"很乐意与对方结伴同游一段时间，拼车拼餐，享受偶遇的缘分","k":"E"},{"t":"礼貌寒暄几句后保持距离，依然坚持自己独立自由的游览节奏","k":"I"}]},{"q":"当你感到内心委屈或压力极大时，你通常：","opts":[{"t":"迫切需要把情绪宣泄出来，听到身边人的正面回应才能真正释怀","k":"E"},{"t":"把情绪深埋在心底独自消化，不喜欢在他人面前暴露自己的脆弱","k":"I"}]},{"q":"在一个新项目中，面对‘拓展新外部客户’与‘内部底层技术攻关’两个任务：","opts":[{"t":"更倾向于选择前者，擅长在商务谈判与人际斡旋中拿结果","k":"E"},{"t":"更倾向于选择后者，擅长在安静不受打扰的代码或架构中深耕","k":"I"}]},{"q":"接触并学习一项全新技能或概念时，你更关注：","opts":[{"t":"具体的案例、明确的操作步骤以及当前的现实应用","k":"S"},{"t":"背后的底层原理、发展脉络以及未来的各种可能性","k":"N"}]},{"q":"当你向别人描述一件事情时，你的表达偏好是：","opts":[{"t":"如实还原具体的时间、地点、数据和事实细节","k":"S"},{"t":"概述整体感觉、深层含义以及由此引发的脑洞与启示","k":"N"}]},{"q":"当思考“未来的方向”时，你的思维重心往往落在：","opts":[{"t":"立足当前的现实条件与可用资源，走好当下的每一步","k":"S"},{"t":"描绘未来的长远蓝图与宏观愿景，寻找突破现有限制的机会","k":"N"}]},{"q":"在阅读或观影时，哪类风格更容易引发你的共鸣？","opts":[{"t":"刻画入微、逻辑写实、细节扎实有据的纪实与现实主义作品","k":"S"},{"t":"隐喻深刻、富有哲学意味、脑洞大开的科幻与先锋象征作品","k":"N"}]},{"q":"面对已被前人长期验证过的成熟经验或规范流程：","opts":[{"t":"倾向于遵循并熟练运用它，因为这通常是最省力且稳妥的途径","k":"S"},{"t":"忍不住琢磨是否有遗漏的漏洞，渴望跳出框架寻找全新的颠覆解法","k":"N"}]},{"q":"如果用一个词形容你的注意力习惯，它更偏向于：","opts":[{"t":"立足实景：眼见为实，善于观察周围环境的现实变化与细节","k":"S"},{"t":"浮想联翩：容易走神，脑海里常像播放电影一样联想不同概念","k":"N"}]},{"q":"做决策或制定计划时，你最信任的信息来源是：","opts":[{"t":"过往累积的真实经验数据、眼前的客观证据与落地先例","k":"S"},{"t":"对事物发展大趋势的直觉预感、潜在洞察与前瞻性设想","k":"N"}]},{"q":"阅读一本专业书籍或行业深度分析报告时，你最先留意的是：","opts":[{"t":"书中的真实案例、具体数据报表与立即可落地的操作方法","k":"S"},{"t":"作者搭建的底层理论模型、思维范式以及对未来大趋势的预测","k":"N"}]},{"q":"如果让你接手并整理一个杂乱无章的资料库或云盘，你的动力主要来自于：","opts":[{"t":"看到原本混乱的具体文件被规整分类、井井有条的秩序实感","k":"S"},{"t":"重新设计一套极富前瞻性、扩展性极强的信息检索与组织架构体系","k":"N"}]},{"q":"对于职场或生活中的‘常规流程规范’，你的根本看法倾向于：","opts":[{"t":"流程是过往经验换来的宝贵结晶，严格遵守是效率与质量的底线","k":"S"},{"t":"流程往往容易让人固步自封，时刻审视其局限并尝试颠覆式优化才更有价值","k":"N"}]},{"q":"在一次关于未来的头脑风暴会上，哪种讨论方式更容易让你感到疲惫？","opts":[{"t":"漫无边际、脱离现有物理与资源条件的科幻式空想与哲学思辨","k":"S"},{"t":"纠缠于现阶段某个细枝末节的执行琐事，缺乏对全局宏观视野的把握","k":"N"}]},{"q":"如果你去参观一个大型当代艺术展，吸引你驻足更久的通常是：","opts":[{"t":"精湛细腻的制作工艺、对光影材质细节的极高还原度与具象美感","k":"S"},{"t":"作品背后隐喻的思想冲突、哲学讽刺以及打破常规的先锋概念符号","k":"N"}]},{"q":"当面对一个未知的崭新问题时，你的本能探索路径往往是：","opts":[{"t":"查找过往类似成功经验的标准解法，借鉴成熟路径逐步拆解落地","k":"S"},{"t":"依赖直觉与跨界联想，尝试从一个完全不相干的领域借用灵感破局","k":"N"}]},{"q":"如果用一句话概括你的思维习惯，它更贴近：","opts":[{"t":"‘看得见摸得着的才是真实的’，脚踏实地把握眼前的每一件具体实事","k":"S"},{"t":"‘凡是过往皆为序章’，随时随地探索万事万物背后的隐秘关联与未来可能","k":"N"}]},{"q":"在厨房尝试烹饪一道全新的复杂菜肴时：","opts":[{"t":"严格按照菜谱要求的克数、火候和翻炒分钟数精准复刻","k":"S"},{"t":"大致浏览一遍食材，凭直觉和灵感自由搭配调味，享受创作的偶得","k":"N"}]},{"q":"在评估一个创业项目或商业计划书时，你最先质疑的切入点是：","opts":[{"t":"商业模式的现金流测算、落地成本、获客渠道等现实可行性细节","k":"S"},{"t":"赛道是否存在颠覆性机会、技术天花板有多高以及未来五年的想象空间","k":"N"}]},{"q":"你如何看待自己对物理现实环境（如室内装修、光线、气味）的敏锐度？","opts":[{"t":"非常敏锐，桌上的微小位移、空调温度的轻微变化都能第一时间察觉","k":"S"},{"t":"相对迟钝，只要能用就行，常常沉浸在思考中而忽视身边物理环境的变化","k":"N"}]},{"q":"当别人向你讲解一个全新项目时，你最常发出的提问是：","opts":[{"t":"‘这个产品具体是怎么运作的？第一步先做什么？谁来交付？’","k":"S"},{"t":"‘这个项目的核心立意是什么？它解决的核心本质问题是什么？’","k":"N"}]},{"q":"在购买一件价格不菲的高科技数码产品时，你最看重：","opts":[{"t":"各大专业平台的实际跑分数据、续航实测、做工用料与保修服务","k":"S"},{"t":"这款产品所代表的前沿技术突破、工业设计美学与未来生态愿景","k":"N"}]},{"q":"当你回忆起五年前的一次难忘旅行时，最先浮现于脑海的是：","opts":[{"t":"当时吃到的某道地道小吃的滋味、海风吹拂的触感等具体感官记忆","k":"S"},{"t":"那趟旅程带给自己的人生体悟、心境转折以及对生命意义的新认知","k":"N"}]},{"q":"面对日常生活中的琐碎事务（如交账单、修电器、填报销单）：","opts":[{"t":"习惯有条不紊、按部就班地逐一处理完毕，脚踏实地落实","k":"S"},{"t":"本能地感到极其枯燥厌倦，常常拖延，觉得这些琐事在吞噬自己的灵性","k":"N"}]},{"q":"在写报告或文章时，你更擅长并引以为傲的部分是：","opts":[{"t":"数据扎实、证据链完整无破绽、排版工整规范、逻辑环环相扣","k":"S"},{"t":"立意高屋建瓴、观点新颖独到、善用精妙的比喻与穿透性的洞察","k":"N"}]},{"q":"当一个方案出现未曾预料到的卡点时，你通常：","opts":[{"t":"回退检查每一个执行参数和操作步骤，在细节中排查故障原因","k":"S"},{"t":"跳出当前执行层面，站在全局审视原本的方向假设是否根本上出了偏差","k":"N"}]},{"q":"面对工作中的重大方案决策，你首要依据的评判标准是：","opts":[{"t":"客观数据、投入产出比逻辑与方案本身的严密性","k":"T"},{"t":"该决定对团队成员心理、人际氛围及各方感受的影响","k":"F"}]},{"q":"当朋友陷入低谷向你诉苦时，你下意识的本能反应是：","opts":[{"t":"迅速帮 TA 理清问题根源，分析并提供切实可行的解决建议","k":"T"},{"t":"优先照顾并接住 TA 的情绪，给予无条件的拥抱、倾听与共情","k":"F"}]},{"q":"评价一个优秀的团队领导者时，你更看重哪项素质？","opts":[{"t":"决断果敢、能力过硬、赏罚分明，能够带领团队高效拿到成果","k":"T"},{"t":"善解人意、关怀成员、善于凝聚人心，能够营造温暖和谐的氛围","k":"F"}]},{"q":"在一场激烈的讨论或争辩中，你的态度是：","opts":[{"t":"真理越辩越明，分清是非曲直比表面的一团和气更重要","k":"T"},{"t":"委婉表达自己的观点，尽量避免发生言语冲突导致双方伤了感情","k":"F"}]},{"q":"做重大消费决定（如换新手机或大件数码家电）时，你更依赖：","opts":[{"t":"各平台性能测评数据、性价比参数对比与功能实用度","k":"T"},{"t":"品牌审美、外观设计眼缘以及使用该产品时带来的主观愉悦感","k":"F"}]},{"q":"当你不得不向下属或合作伙伴指出严重工作失误时：","opts":[{"t":"实事求是直击痛点，直接说明问题与后果，讲求效率","k":"T"},{"t":"深思熟虑措辞，先肯定付出再委婉提醒，避免伤害对方自尊心","k":"F"}]},{"q":"你如何看待“原则”与“人情”之间的冲突？","opts":[{"t":"无规矩不成方圆，原则一旦确立就应对所有人一视同仁","k":"T"},{"t":"规则是死的人是活的，面对特殊困境应当有人情味的变通","k":"F"}]},{"q":"在团队合作中，如果一位关系很好的密友交付了质量严重不合格的成果，你会：","opts":[{"t":"对事不对人，实事求是指出错误与标准差距，要求其限期修正","k":"T"},{"t":"先照顾对方的情绪，委婉指出问题，甚至暗中帮其弥补不足避免尴尬","k":"F"}]},{"q":"面对一个社会公共争议事件时，你的本能判断准则是：","opts":[{"t":"依据规则法理、客观证据链与因果逻辑，厘清是非曲直","k":"T"},{"t":"置身处地体会当事各方的处境苦衷，关注人文关怀与情感正义","k":"F"}]},{"q":"在挑选长期共事的合作伙伴时，你更看重对方身上的哪项特质？","opts":[{"t":"业务能力强悍、逻辑缜密清晰、客观理性，哪怕性格稍微严肃冷淡","k":"T"},{"t":"心地善良诚恳、同理心极强、沟通如沐春风，懂得关照他人感受","k":"F"}]},{"q":"当你的观点遭到他人公开质疑或尖锐反驳时，你的第一心理反应是：","opts":[{"t":"立刻调动大脑逻辑库，分析对方论据是否有破绽，准备事实反驳","k":"T"},{"t":"心里会本能地产生一阵不适或被冒犯感，觉得对方态度缺乏温和与尊重","k":"F"}]},{"q":"被别人评价为下面哪一句话会让你内心更有成就感？","opts":[{"t":"‘TA 的分析非常专业尖锐，逻辑极其严密，抓问题一针见血’","k":"T"},{"t":"‘TA 是一个极其温暖体贴的人，每次与 TA 交流都被深深理解与治愈’","k":"F"}]},{"q":"当朋友身处情绪低谷向你痛哭倾诉时，你内心常出现的拉扯是：","opts":[{"t":"‘我很想安慰 TA，但我脑子里一直在转如何帮 TA 把根源问题彻底解决’","k":"T"},{"t":"‘先别讲大道理，此时此刻全心全意的拥抱和陪伴才是最珍贵的支持’","k":"F"}]},{"q":"在制定团队考核或奖励规则时，你更倾向于坚守的底线是：","opts":[{"t":"客观公平的量化指标面前人人平等，杜绝因感情用事而破坏制度权威","k":"T"},{"t":"必须考虑每个人的特殊现实困境与成长空间，留有人性温度与柔性关怀","k":"F"}]},{"q":"在法庭审判或纠纷仲裁中，你更认同的法哲学倾向是：","opts":[{"t":"严格遵循成文法典与契约条款，法律的确定性高于朴素道德感","k":"T"},{"t":"综合考虑动机善意、弱势处境与实质正义，法外亦应有天理人情","k":"F"}]},{"q":"当他人因为被批评而当场落泪时，你更常产生的内心反应是：","opts":[{"t":"感到有些无所适从或尴尬，认为哭泣并不能解决问题本身","k":"T"},{"t":"强烈的同情与揪心，立刻软下心来想要安抚对方的情绪","k":"F"}]},{"q":"在评估一笔慈善捐款或志愿服务时，你最看重的是：","opts":[{"t":"资金的使用透明度、实际救助转化率与审计合规性","k":"T"},{"t":"该项目传递的纯粹爱心、人道主义温度与对受助者心灵的抚慰","k":"F"}]},{"q":"当你自己做错了一件导致不良后果的决定时，最折磨你的是：","opts":[{"t":"对自我判断失误的懊恼，觉得自己逻辑不够周密、犯了低级错误","k":"T"},{"t":"对连累了他人或辜负了伙伴信任的深深愧疚与心理自责","k":"F"}]},{"q":"如果在会议中必须给出一个否定性意见，你的沟通策略是：","opts":[{"t":"直接陈述否定理由与替代建议，简洁高效，避免模糊预期","k":"T"},{"t":"采用‘三明治沟通法’：先表扬优点，再委婉指出担忧，最后鼓励","k":"F"}]},{"q":"你如何看待‘善意的谎言’？","opts":[{"t":"即使残酷也应该告知客观真相，隐瞒真相往往埋下更大的隐患","k":"T"},{"t":"在某些情况下，为了保护脆弱之人的心理防线，适度谎言是仁慈的","k":"F"}]},{"q":"在选择一部打动你的电影或小说时，哪种核心特质最吸引你？","opts":[{"t":"严丝合缝的悬疑推理、没有丝毫降智的硬核逻辑与高智商博弈","k":"T"},{"t":"细腻动人的人性羁绊、刻骨铭心的情感共鸣与触及灵魂的温情","k":"F"}]},{"q":"在团队分配年终奖金时，面对‘绩效顶尖但性格自私孤僻’与‘绩效平庸但热心奉献助人’两人：","opts":[{"t":"坚决将大头给前者，商业价值创造是商业组织的唯一分配正义","k":"T"},{"t":"给予后者相当的倾斜认可，团队凝聚力与善良底色不可被纯功利抹杀","k":"F"}]},{"q":"当别人对你提出非常严厉但客观属实的批评时，你能否做到‘坦然接受’？","opts":[{"t":"可以迅速剥离情绪，客观审视错误所在并立即着手复盘优化","k":"T"},{"t":"理性上知道是对的，但在感性上内心依然会受伤并难过很长一段时间","k":"F"}]},{"q":"你更反感下面哪种合作搭档？","opts":[{"t":"逻辑混乱、感情用事、动辄把工作摩擦上升到个人恩怨的人","k":"T"},{"t":"冷酷自私、缺乏基本同理心、为了指标完全不顾及同伴尊严的人","k":"F"}]},{"q":"面对一次期待已久的远途旅行，你的准备方式是：","opts":[{"t":"提前规划好路线、酒店和每日核心打卡点，准备好备选方案","k":"J"},{"t":"只定好大交通，走到哪里算哪里，享受未知的惊喜与偶遇","k":"P"}]},{"q":"面对一个两周后截止的重要任务，你通常的节奏是：","opts":[{"t":"制定阶段进度，每天推进一部分，在截止前留出充裕的复核时间","k":"J"},{"t":"边做边寻找灵感，在临近死线的紧迫感与倒计时中集中爆发","k":"P"}]},{"q":"当原本安排好的日程突然被不可控因素打乱时，你的内心反应通常是：","opts":[{"t":"感到阵阵烦躁或不适，会立即调整并重新梳理出一套新秩序","k":"J"},{"t":"适应良好，觉得“变化本来就是常态”，顺其自然随遇而安","k":"P"}]},{"q":"环顾你的日常办公桌或电脑文件目录，它更呈现出：","opts":[{"t":"分类清晰、层级分明，常用物品用完后习惯物归原位","k":"J"},{"t":"相对自由随意，虽然他人看来有些杂乱，但自己心里清楚位置","k":"P"}]},{"q":"当一件重要的事情尚未尘埃落定时，你的心理状态是：","opts":[{"t":"心里一直悬着不踏实，迫切希望尽快敲定并看到明确结论","k":"J"},{"t":"觉得完全可以接受，保持开放态度、留有更多可能性更自由","k":"P"}]},{"q":"去大型超市或商场购物时，你的习惯是：","opts":[{"t":"心中或手机里有明确的必买清单，直奔目标货架，高效搞定","k":"J"},{"t":"漫步闲逛，随走随看，遇到感兴趣或打折的东西就顺便加购","k":"P"}]},{"q":"你更向往的生活状态与人生步调是：","opts":[{"t":"心中有明确节奏与目标、生活秩序井然、充满掌控感的状态","k":"J"},{"t":"自由随性、充满变数与新体验、不受过多条条框框束缚的状态","k":"P"}]},{"q":"面对一次期待已久的周末短途自驾游，你的理想准备方式是：","opts":[{"t":"提前确定好出发时间、必经路线与主要打卡点，心中有数才踏实","k":"J"},{"t":"只定好大致方向，看到美丽的风景随时下道拐弯，走到哪里算哪里","k":"P"}]},{"q":"当你终于搞定了一件长期困扰的重大待办事项时，你最大的内心感受是：","opts":[{"t":"巨大的踏实与掌控感，终于画上句号、把事情落实闭环了","k":"J"},{"t":"些许释怀，但很快开始期待接下来又会有哪些未知的趣味可能性","k":"P"}]},{"q":"面对一整天充满不确定性、随叫随到的临时突发任务安排：","opts":[{"t":"感到极其抓狂，这种不断被切碎日程的节奏会极大破坏你的心理秩序","k":"J"},{"t":"适应良好，觉得兵来将挡水来土掩，充满变化的一天反而不那么沉闷","k":"P"}]},{"q":"在准备做出一项人生重大选择（如换城市、择业、转行）时，你更符合：","opts":[{"t":"制定决策死线，搜集足量信息后坚决拍板，尽快开启确定的新节奏","k":"J"},{"t":"尽量延后做最终决定的时间，保持多重选项开放，观望更多变量","k":"P"}]},{"q":"当你着手开展一项需要持续两周的复杂大任务时，你的习惯是：","opts":[{"t":"拆解每天的具体目标并雷打不动执行，在截止前留出充裕的复查期","k":"J"},{"t":"前几天广泛发散、搜集素材，在临近截止前的极限压力下高度专注爆发","k":"P"}]},{"q":"你如何看待手机里的日历、待办清单（To-do App）与日程提醒？","opts":[{"t":"必不可少的第二大脑，每日日程清清楚楚，划掉待办是极大的心理爽点","k":"J"},{"t":"偶尔记录重大时间节点，但反感把每日生活机械精确地绑定在时间表里","k":"P"}]},{"q":"在团队里与他人协作时，哪种工作风格最容易让你感到心累？","opts":[{"t":"目标模糊、朝令夕改、截止时间随意顺延、缺乏明确推进节奏的伙伴","k":"J"},{"t":"事事都要严格按死板时间表推进、缺乏丝毫灵活性与即兴调整空间的伙伴","k":"P"}]},{"q":"在准备收拾行李出门旅行时，你的收拾时间点通常是：","opts":[{"t":"提前前一天甚至几天就照着清单逐一打包妥当，拉链封好","k":"J"},{"t":"临出发前几个小时甚至半小时才手忙脚乱地往箱子里塞东西","k":"P"}]},{"q":"如果一个周末两天完全没有任何既定计划与日程约束：","opts":[{"t":"内心会有点隐隐的发慌或虚度感，忍不住想列几个待办事项充实起来","k":"J"},{"t":"感到神仙般的纯粹自由，一觉睡到自然醒，随时听从内心的召唤行动","k":"P"}]},{"q":"对于‘截止日期（Deadline）’，你内心的真实定义是：","opts":[{"t":"神圣不可逾越的硬性红线，必须在之前保质保量交付","k":"J"},{"t":"给工作画下的弹性能量触发点，如果情况有变往往可以商量延期","k":"P"}]},{"q":"当你与朋友相约聚餐时，你更喜欢的约定方式是：","opts":[{"t":"明确具体到‘周五晚 18:30 在某某餐厅 3 号桌见’","k":"J"},{"t":"模糊约定‘周五晚上咱们找地方随便吃点，到时看谁先下班联系’","k":"P"}]},{"q":"在管理个人财务或家庭预算时，你的习惯是：","opts":[{"t":"有明确的储蓄规划、投资定投比例与日常记账习惯，财务状况清晰可控","k":"J"},{"t":"大致心里有个数，随赚随花，不喜欢被极其死板的预算表格约束生活","k":"P"}]},{"q":"当你买了一本很有深度的新书准备阅读时：","opts":[{"t":"习惯从第一章一页一页顺着读到最后，读完才开启下一本","k":"J"},{"t":"翻到感兴趣的章节随手跳读，同时可能手头开着三四本不同的书轮流翻","k":"P"}]},{"q":"面对领导下达的模糊任务指令‘你看着办，灵活处理’：","opts":[{"t":"更希望领导给出明确的目标验收标准与交付边界，心里才踏实","k":"J"},{"t":"非常享受这种不设限的自由空间，认为这正好给了自己最大的发挥天地","k":"P"}]},{"q":"如果你计划在今天晚上完成三项工作：","opts":[{"t":"按部就班按预定顺序逐项完成并划掉，不完成绝不安然入睡","k":"J"},{"t":"做着做着被某个突发灵感吸引走去干别的，只要开心哪怕主任务顺延也无妨","k":"P"}]},{"q":"你如何看待生活中的‘规矩与仪式感’？","opts":[{"t":"固定的作息、整理习惯与日常仪式是构筑内在秩序与安宁的基石","k":"J"},{"t":"过多的条条框框是在消磨灵气，随性自在的生活才最本真","k":"P"}]}];

const QUESTIONS_MBTI_FORM_Q = [{"q":"在大型社交聚会或派对中，你通常处于什么状态？","opts":[{"t":"与许多人交流互动，结识新朋友让你越聊越兴奋","k":"E"},{"t":"更愿意和少数几位熟人深聊，社交时间长了会感到消耗精力","k":"I"}]},{"q":"经历了一整周高强度的忙碌后，周末你想如何恢复能量？","opts":[{"t":"和朋友聚餐、逛街、参加户外活动，在热闹中释放压力","k":"E"},{"t":"独自宅在家里看书、打游戏或放空，享受无人打扰的宁静","k":"I"}]},{"q":"遇到棘手问题或复杂情绪时，你第一反应倾向于：","opts":[{"t":"找信任的朋友倾诉，在与别人的讨论中理清头绪","k":"E"},{"t":"先一个人静静思考消化，等自己想明白了再考虑是否与人说","k":"I"}]},{"q":"进入一个全新的集体环境（如新团队或新班级），你通常：","opts":[{"t":"比较主动地自我介绍并开启话题，破冰对你来说相对自然","k":"E"},{"t":"习惯先保持低调观察，等待别人主动接近或慢慢熟悉","k":"I"}]},{"q":"在多人参与的头脑风暴或讨论会上，你的表达习惯是：","opts":[{"t":"边说边想，想到新点子就立刻抛出来与大家碰火花","k":"E"},{"t":"先在心里反复推敲斟酌，等到观点相对成熟时再发言","k":"I"}]},{"q":"如果你必须在一个陌生的城市独自度过一整天：","opts":[{"t":"你会主动探索热闹的市集、打卡网红店，享受与陌生人的偶遇互动","k":"E"},{"t":"你会漫步于幽静的美术馆、老巷子或书店，享受深度的独处探索","k":"I"}]},{"q":"周围人对你的日常社交印象更接近下面哪一种？","opts":[{"t":"开朗热情、反应敏捷、容易打成一片，情绪较为外显","k":"E"},{"t":"沉稳独立、注重边界感、有自己的精神世界，不易完全看透","k":"I"}]},{"q":"当面对一个需要跨多个部门协同的复杂项目时，你更适应的工作角色是：","opts":[{"t":"站在台前充当核心联络人与宣讲者，积极穿梭于各方沟通协调","k":"E"},{"t":"退居幕后专注把控核心逻辑、方案设计与专项难题攻关","k":"I"}]},{"q":"在参加一个持续多天的行业峰会或线下培训时，你的精力曲线通常是：","opts":[{"t":"越听越兴奋，晚上的交流酒会或夜聊聚会依然能神采奕奕参与","k":"E"},{"t":"白天虽全神贯注，但傍晚只想迅速回到自己的房间安静独处充能","k":"I"}]},{"q":"在你的手机通讯录或社交好友列表中，你的人际网络更趋向于：","opts":[{"t":"范围广泛，好友众多，且能在不同的圈子中迅速找到共同话题","k":"E"},{"t":"圈子高度精炼，只有少数几位历经多年考验的挚友保持深度联络","k":"I"}]},{"q":"当你在工作中突然产生了一个极有创意的灵感点子时，你更自然的习惯是：","opts":[{"t":"立刻转头分享给身边的同事或拉人快速碰撞，在互动中完善它","k":"E"},{"t":"先自己默默写在备忘录里梳理推演，等成型有把握后再对外提出","k":"I"}]},{"q":"如果在毫无安排的假期里连续三天完全一个人独处、没有任何社交对话：","opts":[{"t":"会感到有些失落无聊甚至憋闷，极度渴望出去走走或约朋友聊聊天","k":"E"},{"t":"感到极其惬意与充实，甚至希望这样的神仙独处时光能更长一点","k":"I"}]},{"q":"在大型公开会议上当主持人突然点名要求即兴发表看法时：","opts":[{"t":"通常能快速接话，边讲边组织语言，不怯场且容易带动现场氛围","k":"E"},{"t":"内心会有一丝抗拒，更希望提前拿到发言提纲，讨厌毫无准备地开麦","k":"I"}]},{"q":"你如何定义高质量的‘休息与充电’？","opts":[{"t":"换个环境，和志同道合的人一起做一件有趣又有活力的新鲜事","k":"E"},{"t":"彻底切断外界的嘈杂信息输入，在不受打扰的私密空间里沉淀自我","k":"I"}]},{"q":"收到朋友突然发来的视频通话请求时，你的本能反应通常是：","opts":[{"t":"直接按接听，觉得视频面对面聊天更亲切、效率更高","k":"E"},{"t":"有些措手不及，往往更希望对方先打字说明来意或发语音","k":"I"}]},{"q":"在开放式大工位或咖啡厅等嘈杂环境中工作时：","opts":[{"t":"周围的人声和动静对你影响不大，甚至觉得有些热闹的环境更有干劲","k":"E"},{"t":"极难长时间集中注意力，必须戴上降噪耳机或寻找封闭安静的角落","k":"I"}]},{"q":"当你与他人初次见面产生短暂的尴尬沉默时，你通常会：","opts":[{"t":"感到有些不自在，主动寻找天气、衣着或周遭事物等话题打破沉默","k":"E"},{"t":"觉得沉默完全可以接受，静观其变，不觉得有必要强行找话聊","k":"I"}]},{"q":"在团队完成了一项重大成就之后，你最向往的庆祝方式是：","opts":[{"t":"全员一起去热闹的餐厅聚餐、开香槟狂欢，大声分享喜悦","k":"E"},{"t":"在群里发个红包互道辛苦，然后各自早早回家享受宁静的夜晚","k":"I"}]},{"q":"关于‘结识新朋友’，你内心的真实写照更接近：","opts":[{"t":"生活就像开盲盒，结识形形色色的人能极大丰富认知与体验","k":"E"},{"t":"建立新的人际链接需要投入大量社交成本，随缘就好，无需强求","k":"I"}]},{"q":"当你在思考一个极其抽象复杂的理论时，哪种方式让你效率更高？","opts":[{"t":"找一个伙伴相互问答、辩论，在言语攻防中理顺逻辑体系","k":"E"},{"t":"独自在纸上画思维导图或闭目凝神，在深层内心世界中推演","k":"I"}]},{"q":"在旅行途中，如果遇到同样独自旅行的热情背包客：","opts":[{"t":"很乐意与对方结伴同游一段时间，拼车拼餐，享受偶遇的缘分","k":"E"},{"t":"礼貌寒暄几句后保持距离，依然坚持自己独立自由的游览节奏","k":"I"}]},{"q":"当你感到内心委屈或压力极大时，你通常：","opts":[{"t":"迫切需要把情绪宣泄出来，听到身边人的正面回应才能真正释怀","k":"E"},{"t":"把情绪深埋在心底独自消化，不喜欢在他人面前暴露自己的脆弱","k":"I"}]},{"q":"在一个新项目中，面对‘拓展新外部客户’与‘内部底层技术攻关’两个任务：","opts":[{"t":"更倾向于选择前者，擅长在商务谈判与人际斡旋中拿结果","k":"E"},{"t":"更倾向于选择后者，擅长在安静不受打扰的代码或架构中深耕","k":"I"}]},{"q":"你如何看待公共社交平台（如朋友圈、即刻、小红书）的动态发布？","opts":[{"t":"乐于分享日常点滴与即时想法，享受与好友点赞互动的联结感","k":"E"},{"t":"极少公开发表动态，更习惯做一个安静的浏览者或仅自己可见","k":"I"}]},{"q":"在长达三小时的聚会接近尾声时，你的状态通常是：","opts":[{"t":"依然意犹未尽，可能还会主动提议去下一场继续转场宵夜","k":"E"},{"t":"电量彻底见底，虽然表面维持礼貌微笑，但灵魂早就想回床上了","k":"I"}]},{"q":"对于日常工作中的‘同步对齐会’，你的态度是：","opts":[{"t":"开会拉齐信息非常必要，面对面哪怕多花点时间也能确保共识","k":"E"},{"t":"非必要不大会，更希望通过异步文档或文字留言高效推进","k":"I"}]},{"q":"在逛大型商场或超市时，如果营业员非常热情地上前推销引导：","opts":[{"t":"能够轻松与营业员攀谈互动，甚至顺便了解一下当季新品信息","k":"E"},{"t":"会感到有些心理压力或紧绷，更希望对方不要关注自己、自由选购","k":"I"}]},{"q":"如果要你在两种生活方式中二选一，你更向往：","opts":[{"t":"身处信息流中心，每天与不同的人发生精彩交集，充满烟火气的生活","k":"E"},{"t":"有大量可自主掌控的宁静时间，拥有独立精神天地的高自洽生活","k":"I"}]},{"q":"当你学到了一项冷门而有趣的冷知识时：","opts":[{"t":"迫不及待地想在下次聚餐或聊天时当成趣闻讲给大家听","k":"E"},{"t":"自己默默咀嚼回味并查阅更多资料，沉浸在纯粹的私密求知欲中","k":"I"}]},{"q":"别人形容你‘说话做事’的节奏往往是：","opts":[{"t":"语速较快、情绪饱满、肢体语言丰富，善于调动全场视线","k":"E"},{"t":"语调平缓、惜字如金、条理清晰，只有在关键节点精准发声","k":"I"}]},{"q":"面对一个由完全不熟悉的人组成的兴趣社团（如飞盘、徒步群）：","opts":[{"t":"毫不犹豫直接报名，相信去了自然就能交到一帮新朋友","k":"E"},{"t":"犹豫再三，通常只有在有熟人陪同的情况下才愿意前往参加","k":"I"}]},{"q":"在多人聚餐时，你通常习惯扮演的角色是：","opts":[{"t":"招呼大家点菜、递纸巾、主动抛出话题活跃气氛的热络组织者","k":"E"},{"t":"安静坐在一旁品尝美食、微笑着倾听他人高谈阔论的陪伴者","k":"I"}]},{"q":"如果你在一家公司待了两年，你所熟识的同事范围通常：","opts":[{"t":"跨越多个部门，保洁阿姨、前台和不同项目组的人大都能聊上几句","k":"E"},{"t":"严格局限在本工作组内，离开紧密协作圈之外的人基本很少交集","k":"I"}]},{"q":"在处理突发紧急冲突时，你更自然的应对姿态是：","opts":[{"t":"当面快速对话或直接打电话对质，绝不隔夜，必须即时沟通","k":"E"},{"t":"先各自冷静一段时间，通过字斟句酌的长信息把关键事实梳理清楚","k":"I"}]},{"q":"当你身处一个人潮拥挤的跨年晚会或演唱会现场：","opts":[{"t":"被全场数万人的欢呼声深深感染，热血沸腾，彻底沉浸在集体狂欢中","k":"E"},{"t":"虽然享受音乐，但面对巨大的人流拥挤会本能地产生想要逃离的窒息感","k":"I"}]},{"q":"你如何看待自己的内在思维世界与外部现实世界的关系？","opts":[{"t":"思维是为了更好地指引外部行动，外部世界才是实现自我价值的舞台","k":"E"},{"t":"外部世界只是思维映照的投影，内心深处的自省与沉思才是一切的核心","k":"I"}]},{"q":"接触并学习一项全新技能或概念时，你更关注：","opts":[{"t":"具体的案例、明确的操作步骤以及当前的现实应用","k":"S"},{"t":"背后的底层原理、发展脉络以及未来的各种可能性","k":"N"}]},{"q":"当你向别人描述一件事情时，你的表达偏好是：","opts":[{"t":"如实还原具体的时间、地点、数据和事实细节","k":"S"},{"t":"概述整体感觉、深层含义以及由此引发的脑洞与启示","k":"N"}]},{"q":"当思考“未来的方向”时，你的思维重心往往落在：","opts":[{"t":"立足当前的现实条件与可用资源，走好当下的每一步","k":"S"},{"t":"描绘未来的长远蓝图与宏观愿景，寻找突破现有限制的机会","k":"N"}]},{"q":"在阅读或观影时，哪类风格更容易引发你的共鸣？","opts":[{"t":"刻画入微、逻辑写实、细节扎实有据的纪实与现实主义作品","k":"S"},{"t":"隐喻深刻、富有哲学意味、脑洞大开的科幻与先锋象征作品","k":"N"}]},{"q":"面对已被前人长期验证过的成熟经验或规范流程：","opts":[{"t":"倾向于遵循并熟练运用它，因为这通常是最省力且稳妥的途径","k":"S"},{"t":"忍不住琢磨是否有遗漏的漏洞，渴望跳出框架寻找全新的颠覆解法","k":"N"}]},{"q":"如果用一个词形容你的注意力习惯，它更偏向于：","opts":[{"t":"立足实景：眼见为实，善于观察周围环境的现实变化与细节","k":"S"},{"t":"浮想联翩：容易走神，脑海里常像播放电影一样联想不同概念","k":"N"}]},{"q":"做决策或制定计划时，你最信任的信息来源是：","opts":[{"t":"过往累积的真实经验数据、眼前的客观证据与落地先例","k":"S"},{"t":"对事物发展大趋势的直觉预感、潜在洞察与前瞻性设想","k":"N"}]},{"q":"阅读一本专业书籍或行业深度分析报告时，你最先留意的是：","opts":[{"t":"书中的真实案例、具体数据报表与立即可落地的操作方法","k":"S"},{"t":"作者搭建的底层理论模型、思维范式以及对未来大趋势的预测","k":"N"}]},{"q":"如果让你接手并整理一个杂乱无章的资料库或云盘，你的动力主要来自于：","opts":[{"t":"看到原本混乱的具体文件被规整分类、井井有条的秩序实感","k":"S"},{"t":"重新设计一套极富前瞻性、扩展性极强的信息检索与组织架构体系","k":"N"}]},{"q":"对于职场或生活中的‘常规流程规范’，你的根本看法倾向于：","opts":[{"t":"流程是过往经验换来的宝贵结晶，严格遵守是效率与质量的底线","k":"S"},{"t":"流程往往容易让人固步自封，时刻审视其局限并尝试颠覆式优化才更有价值","k":"N"}]},{"q":"在一次关于未来的头脑风暴会上，哪种讨论方式更容易让你感到疲惫？","opts":[{"t":"漫无边际、脱离现有物理与资源条件的科幻式空想与哲学思辨","k":"S"},{"t":"纠缠于现阶段某个细枝末节的执行琐事，缺乏对全局宏观视野的把握","k":"N"}]},{"q":"如果你去参观一个大型当代艺术展，吸引你驻足更久的通常是：","opts":[{"t":"精湛细腻的制作工艺、对光影材质细节的极高还原度与具象美感","k":"S"},{"t":"作品背后隐喻的思想冲突、哲学讽刺以及打破常规的先锋概念符号","k":"N"}]},{"q":"当面对一个未知的崭新问题时，你的本能探索路径往往是：","opts":[{"t":"查找过往类似成功经验的标准解法，借鉴成熟路径逐步拆解落地","k":"S"},{"t":"依赖直觉与跨界联想，尝试从一个完全不相干的领域借用灵感破局","k":"N"}]},{"q":"如果用一句话概括你的思维习惯，它更贴近：","opts":[{"t":"‘看得见摸得着的才是真实的’，脚踏实地把握眼前的每一件具体实事","k":"S"},{"t":"‘凡是过往皆为序章’，随时随地探索万事万物背后的隐秘关联与未来可能","k":"N"}]},{"q":"在厨房尝试烹饪一道全新的复杂菜肴时：","opts":[{"t":"严格按照菜谱要求的克数、火候和翻炒分钟数精准复刻","k":"S"},{"t":"大致浏览一遍食材，凭直觉和灵感自由搭配调味，享受创作的偶得","k":"N"}]},{"q":"在评估一个创业项目或商业计划书时，你最先质疑的切入点是：","opts":[{"t":"商业模式的现金流测算、落地成本、获客渠道等现实可行性细节","k":"S"},{"t":"赛道是否存在颠覆性机会、技术天花板有多高以及未来五年的想象空间","k":"N"}]},{"q":"你如何看待自己对物理现实环境（如室内装修、光线、气味）的敏锐度？","opts":[{"t":"非常敏锐，桌上的微小位移、空调温度的轻微变化都能第一时间察觉","k":"S"},{"t":"相对迟钝，只要能用就行，常常沉浸在思考中而忽视身边物理环境的变化","k":"N"}]},{"q":"当别人向你讲解一个全新项目时，你最常发出的提问是：","opts":[{"t":"‘这个产品具体是怎么运作的？第一步先做什么？谁来交付？’","k":"S"},{"t":"‘这个项目的核心立意是什么？它解决的核心本质问题是什么？’","k":"N"}]},{"q":"在购买一件价格不菲的高科技数码产品时，你最看重：","opts":[{"t":"各大专业平台的实际跑分数据、续航实测、做工用料与保修服务","k":"S"},{"t":"这款产品所代表的前沿技术突破、工业设计美学与未来生态愿景","k":"N"}]},{"q":"当你回忆起五年前的一次难忘旅行时，最先浮现于脑海的是：","opts":[{"t":"当时吃到的某道地道小吃的滋味、海风吹拂的触感等具体感官记忆","k":"S"},{"t":"那趟旅程带给自己的人生体悟、心境转折以及对生命意义的新认知","k":"N"}]},{"q":"面对日常生活中的琐碎事务（如交账单、修电器、填报销单）：","opts":[{"t":"习惯有条不紊、按部就班地逐一处理完毕，脚踏实地落实","k":"S"},{"t":"本能地感到极其枯燥厌倦，常常拖延，觉得这些琐事在吞噬自己的灵性","k":"N"}]},{"q":"在写报告或文章时，你更擅长并引以为傲的部分是：","opts":[{"t":"数据扎实、证据链完整无破绽、排版工整规范、逻辑环环相扣","k":"S"},{"t":"立意高屋建瓴、观点新颖独到、善用精妙的比喻与穿透性的洞察","k":"N"}]},{"q":"当一个方案出现未曾预料到的卡点时，你通常：","opts":[{"t":"回退检查每一个执行参数和操作步骤，在细节中排查故障原因","k":"S"},{"t":"跳出当前执行层面，站在全局审视原本的方向假设是否根本上出了偏差","k":"N"}]},{"q":"你如何看待所谓的‘流行趋势’或‘风口浪潮’？","opts":[{"t":"关注它在当下是否有真实的落地消费场景和可变现的数据验证","k":"S"},{"t":"着迷于它底层技术演进的哲学逻辑，试图推演其十年后的社会形态","k":"N"}]},{"q":"如果你要向别人解释一个深奥的概念，你最常用的教学手法是：","opts":[{"t":"举出生活中常见、亲切的具体例子或拆解为步骤操作演示","k":"S"},{"t":"打一个跨领域的精妙比喻或画出一幅高度凝练的概念抽象图谱","k":"N"}]},{"q":"在你的书架或收藏夹里，占比更高的内容类型通常是：","opts":[{"t":"工具书、实用指南、人物传记、历史实录与专业实战教程","k":"S"},{"t":"科幻小说、哲学思辨、前沿科技预测、象征艺术与神秘学思考","k":"N"}]},{"q":"在组装一件复杂的宜家平板家具时，你的习惯是：","opts":[{"t":"一页一页严格比对说明书中的螺丝型号与图示方向进行组装","k":"S"},{"t":"瞄一眼成品效果图，凭直觉快速摸索拼装，遇到卡死才翻看说明书","k":"N"}]},{"q":"如果必须在以下两种赞誉中选择一项，你更渴望听到：","opts":[{"t":"‘TA 做事极其靠谱落地，细节把控无懈可击，从不掉链子’","k":"S"},{"t":"‘TA 的思维极其深邃开阔，总能提出意想不到的开创性真知灼见’","k":"N"}]},{"q":"当你在散步放空时，你的注意力更常停留在：","opts":[{"t":"路边盛开的花草种类、周围行人的穿搭神态以及街景的具体变化","k":"S"},{"t":"脑海中正在构思的故事、某个未解逻辑难题或对宇宙人生的宏大联想","k":"N"}]},{"q":"对于日常交流中的‘潜台词’或‘言外之意’：","opts":[{"t":"更希望对方开门见山、字面直说，反感云山雾罩的猜谜式沟通","k":"S"},{"t":"能本能且极其敏锐地捕捉到对方语气中的微妙隐喻、动机与弦外之音","k":"N"}]},{"q":"当面对一件已被普遍视为定论的科学常识时：","opts":[{"t":"尊重科学事实与现有公理，在此基础上去解决实际问题","k":"S"},{"t":"喜欢思索‘如果这个前提条件在极端环境下失效，世界会变成怎样？’","k":"N"}]},{"q":"在设计或改造你的居住空间时，你的最高指导原则通常是：","opts":[{"t":"收纳动线合理、材质耐脏实用、符合日常身体力学的舒适度","k":"S"},{"t":"空间的情绪氛围感、独特的个人审美哲学符号与跳脱常规的构思","k":"N"}]},{"q":"面对那些充满未知、尚未形成任何既有规范的全新前沿领域：","opts":[{"t":"会保持适度谨慎，等待先驱者趟平道路、验证出成熟方案后再稳步介入","k":"S"},{"t":"感到极度兴奋与跃跃欲试，渴望成为第一个吃螃蟹的人去定义新规则","k":"N"}]},{"q":"在分析一位历史人物的功过得失时，你更关注：","opts":[{"t":"其具体政令施行后的粮食产量、户口增减、战役得失等确凿历史事实","k":"S"},{"t":"其思想对后世数百年文明演进产生的隐秘暗流与精神范式变革","k":"N"}]},{"q":"如果在工作中让你负责以下某一部分，你会感到更得心应手：","opts":[{"t":"产品的品控复核、精细化运营、标准作业程序的落地监督","k":"S"},{"t":"产品的概念雏形预研、概念验证（PoC）、探索未来的可能性方向","k":"N"}]},{"q":"概括而言，你更擅长从哪种视角来审视世界？","opts":[{"t":"显微镜视角：洞察每一片叶子纹理的真实质地与现实构造","k":"S"},{"t":"望远镜视角：透过地平线眺望星辰轨迹与未知远方的深邃星云","k":"N"}]},{"q":"面对工作中的重大方案决策，你首要依据的评判标准是：","opts":[{"t":"客观数据、投入产出比逻辑与方案本身的严密性","k":"T"},{"t":"该决定对团队成员心理、人际氛围及各方感受的影响","k":"F"}]},{"q":"当朋友陷入低谷向你诉苦时，你下意识的本能反应是：","opts":[{"t":"迅速帮 TA 理清问题根源，分析并提供切实可行的解决建议","k":"T"},{"t":"优先照顾并接住 TA 的情绪，给予无条件的拥抱、倾听与共情","k":"F"}]},{"q":"评价一个优秀的团队领导者时，你更看重哪项素质？","opts":[{"t":"决断果敢、能力过硬、赏罚分明，能够带领团队高效拿到成果","k":"T"},{"t":"善解人意、关怀成员、善于凝聚人心，能够营造温暖和谐的氛围","k":"F"}]},{"q":"在一场激烈的讨论或争辩中，你的态度是：","opts":[{"t":"真理越辩越明，分清是非曲直比表面的一团和气更重要","k":"T"},{"t":"委婉表达自己的观点，尽量避免发生言语冲突导致双方伤了感情","k":"F"}]},{"q":"做重大消费决定（如换新手机或大件数码家电）时，你更依赖：","opts":[{"t":"各平台性能测评数据、性价比参数对比与功能实用度","k":"T"},{"t":"品牌审美、外观设计眼缘以及使用该产品时带来的主观愉悦感","k":"F"}]},{"q":"当你不得不向下属或合作伙伴指出严重工作失误时：","opts":[{"t":"实事求是直击痛点，直接说明问题与后果，讲求效率","k":"T"},{"t":"深思熟虑措辞，先肯定付出再委婉提醒，避免伤害对方自尊心","k":"F"}]},{"q":"你如何看待“原则”与“人情”之间的冲突？","opts":[{"t":"无规矩不成方圆，原则一旦确立就应对所有人一视同仁","k":"T"},{"t":"规则是死的人是活的，面对特殊困境应当有人情味的变通","k":"F"}]},{"q":"在团队合作中，如果一位关系很好的密友交付了质量严重不合格的成果，你会：","opts":[{"t":"对事不对人，实事求是指出错误与标准差距，要求其限期修正","k":"T"},{"t":"先照顾对方的情绪，委婉指出问题，甚至暗中帮其弥补不足避免尴尬","k":"F"}]},{"q":"面对一个社会公共争议事件时，你的本能判断准则是：","opts":[{"t":"依据规则法理、客观证据链与因果逻辑，厘清是非曲直","k":"T"},{"t":"置身处地体会当事各方的处境苦衷，关注人文关怀与情感正义","k":"F"}]},{"q":"在挑选长期共事的合作伙伴时，你更看重对方身上的哪项特质？","opts":[{"t":"业务能力强悍、逻辑缜密清晰、客观理性，哪怕性格稍微严肃冷淡","k":"T"},{"t":"心地善良诚恳、同理心极强、沟通如沐春风，懂得关照他人感受","k":"F"}]},{"q":"当你的观点遭到他人公开质疑或尖锐反驳时，你的第一心理反应是：","opts":[{"t":"立刻调动大脑逻辑库，分析对方论据是否有破绽，准备事实反驳","k":"T"},{"t":"心里会本能地产生一阵不适或被冒犯感，觉得对方态度缺乏温和与尊重","k":"F"}]},{"q":"被别人评价为下面哪一句话会让你内心更有成就感？","opts":[{"t":"‘TA 的分析非常专业尖锐，逻辑极其严密，抓问题一针见血’","k":"T"},{"t":"‘TA 是一个极其温暖体贴的人，每次与 TA 交流都被深深理解与治愈’","k":"F"}]},{"q":"当朋友身处情绪低谷向你痛哭倾诉时，你内心常出现的拉扯是：","opts":[{"t":"‘我很想安慰 TA，但我脑子里一直在转如何帮 TA 把根源问题彻底解决’","k":"T"},{"t":"‘先别讲大道理，此时此刻全心全意的拥抱和陪伴才是最珍贵的支持’","k":"F"}]},{"q":"在制定团队考核或奖励规则时，你更倾向于坚守的底线是：","opts":[{"t":"客观公平的量化指标面前人人平等，杜绝因感情用事而破坏制度权威","k":"T"},{"t":"必须考虑每个人的特殊现实困境与成长空间，留有人性温度与柔性关怀","k":"F"}]},{"q":"在法庭审判或纠纷仲裁中，你更认同的法哲学倾向是：","opts":[{"t":"严格遵循成文法典与契约条款，法律的确定性高于朴素道德感","k":"T"},{"t":"综合考虑动机善意、弱势处境与实质正义，法外亦应有天理人情","k":"F"}]},{"q":"当他人因为被批评而当场落泪时，你更常产生的内心反应是：","opts":[{"t":"感到有些无所适从或尴尬，认为哭泣并不能解决问题本身","k":"T"},{"t":"强烈的同情与揪心，立刻软下心来想要安抚对方的情绪","k":"F"}]},{"q":"在评估一笔慈善捐款或志愿服务时，你最看重的是：","opts":[{"t":"资金的使用透明度、实际救助转化率与审计合规性","k":"T"},{"t":"该项目传递的纯粹爱心、人道主义温度与对受助者心灵的抚慰","k":"F"}]},{"q":"当你自己做错了一件导致不良后果的决定时，最折磨你的是：","opts":[{"t":"对自我判断失误的懊恼，觉得自己逻辑不够周密、犯了低级错误","k":"T"},{"t":"对连累了他人或辜负了伙伴信任的深深愧疚与心理自责","k":"F"}]},{"q":"如果在会议中必须给出一个否定性意见，你的沟通策略是：","opts":[{"t":"直接陈述否定理由与替代建议，简洁高效，避免模糊预期","k":"T"},{"t":"采用‘三明治沟通法’：先表扬优点，再委婉指出担忧，最后鼓励","k":"F"}]},{"q":"你如何看待‘善意的谎言’？","opts":[{"t":"即使残酷也应该告知客观真相，隐瞒真相往往埋下更大的隐患","k":"T"},{"t":"在某些情况下，为了保护脆弱之人的心理防线，适度谎言是仁慈的","k":"F"}]},{"q":"在选择一部打动你的电影或小说时，哪种核心特质最吸引你？","opts":[{"t":"严丝合缝的悬疑推理、没有丝毫降智的硬核逻辑与高智商博弈","k":"T"},{"t":"细腻动人的人性羁绊、刻骨铭心的情感共鸣与触及灵魂的温情","k":"F"}]},{"q":"在团队分配年终奖金时，面对‘绩效顶尖但性格自私孤僻’与‘绩效平庸但热心奉献助人’两人：","opts":[{"t":"坚决将大头给前者，商业价值创造是商业组织的唯一分配正义","k":"T"},{"t":"给予后者相当的倾斜认可，团队凝聚力与善良底色不可被纯功利抹杀","k":"F"}]},{"q":"当别人对你提出非常严厉但客观属实的批评时，你能否做到‘坦然接受’？","opts":[{"t":"可以迅速剥离情绪，客观审视错误所在并立即着手复盘优化","k":"T"},{"t":"理性上知道是对的，但在感性上内心依然会受伤并难过很长一段时间","k":"F"}]},{"q":"你更反感下面哪种合作搭档？","opts":[{"t":"逻辑混乱、感情用事、动辄把工作摩擦上升到个人恩怨的人","k":"T"},{"t":"冷酷自私、缺乏基本同理心、为了指标完全不顾及同伴尊严的人","k":"F"}]},{"q":"在面对重大医患伦理抉择时（如有限医疗资源的救治分配）：","opts":[{"t":"遵循量化生存概率与医学评分算法，用理性计算争取最大救活率","k":"T"},{"t":"关注每个活生生个体的家庭期望与痛苦，很难单纯将人命视作冷冰数据","k":"F"}]},{"q":"当你在社交网络上看到明显存在逻辑硬伤的煽情谣言时：","opts":[{"t":"忍不住想要留言拆穿其事实漏洞与逻辑谬误，维护事实真相","k":"T"},{"t":"理解转发者内心的善良动机，觉得没必要过于刻薄地煞风景","k":"F"}]},{"q":"在日常人际交往中，你更习惯展现出的底色是：","opts":[{"t":"冷静、克制、边界感明确、就事论事，保持理智的旁观姿态","k":"T"},{"t":"随和、热忱、善解人意、容易共鸣，始终散发着善意的温度","k":"F"}]},{"q":"对于‘会哭的孩子有奶吃’这种社会现象，你的第一反应是：","opts":[{"t":"极其厌恶这种破坏规则的行为，坚决不让非理性哭闹凌驾于制度之上","k":"T"},{"t":"同情其背后的委屈无助，觉得若非走投无路也不会选择此种极端方式","k":"F"}]},{"q":"当有人送你一份用心挑选但你实际上完全用不上的礼物时：","opts":[{"t":"礼貌道谢，但之后可能会坦诚沟通自己的真实需求或转赠给需要的人","k":"T"},{"t":"深深被对方的心意打动，即便完全不用也会视若珍宝地妥善珍藏","k":"F"}]},{"q":"在进行商业或薪酬谈判时，你的内在底气主要来源于：","opts":[{"t":"对自身市场价值的客观调研、交付数据的硬核支撑与底线测算","k":"T"},{"t":"彼此之间的信任基石、长期共赢的合作诚意与人际认同感","k":"F"}]},{"q":"面对身边人的争执，如果你被邀请充当调解人，你的核心目标是：","opts":[{"t":"把事件的因果责任划分清楚，形成清晰的责任认定与解决协议","k":"T"},{"t":"化解彼此内心的积怨与心结，让双方重新建立情感连接与和睦关系","k":"F"}]},{"q":"你如何看待自己做决定时的‘果断度’？","opts":[{"t":"只要逻辑闭环且利大于弊，便能迅速拍板，哪怕需要承担阵痛","k":"T"},{"t":"常常因为顾及不同人的复杂心情而瞻前顾后，很难做到绝对铁石心肠","k":"F"}]},{"q":"对于‘真诚但伤人’与‘虚伪但悦耳’两种表达，你的评价是：","opts":[{"t":"毫不犹豫选择前者，虚伪的赞美是在浪费时间并阻碍个人进化","k":"T"},{"t":"认为沟通形式与内容同等重要，带刺的真诚有时是缺乏修养的傲慢","k":"F"}]},{"q":"在遭遇重大危机考验时，你依靠什么作为最底层的精神支柱？","opts":[{"t":"对客观规律与因果必然性的认知，相信理智可以战胜一切混乱","k":"T"},{"t":"对爱、善意与人性温暖的永恒信念，相信同舟共济的情感力量","k":"F"}]},{"q":"如果一个决定在逻辑上完美无缺，但在道德直觉上让人感到不适：","opts":[{"t":"坚信逻辑分析的正确性，认为道德不适往往是人类非理性的感性偏见","k":"T"},{"t":"会强烈踩下刹车，认为内心的良知与道德直觉往往比冷冰逻辑更睿智","k":"F"}]},{"q":"一言以蔽之，你更希望自己成为一个怎样的人？","opts":[{"t":"头脑清醒、逻辑严明、坚韧果敢、洞悉世间真理的智者","k":"T"},{"t":"心灵丰盈、富有同理、仁爱宽厚、能够温暖世界的仁者","k":"F"}]},{"q":"面对一次期待已久的远途旅行，你的准备方式是：","opts":[{"t":"提前规划好路线、酒店和每日核心打卡点，准备好备选方案","k":"J"},{"t":"只定好大交通，走到哪里算哪里，享受未知的惊喜与偶遇","k":"P"}]},{"q":"面对一个两周后截止的重要任务，你通常的节奏是：","opts":[{"t":"制定阶段进度，每天推进一部分，在截止前留出充裕的复核时间","k":"J"},{"t":"边做边寻找灵感，在临近死线的紧迫感与倒计时中集中爆发","k":"P"}]},{"q":"当原本安排好的日程突然被不可控因素打乱时，你的内心反应通常是：","opts":[{"t":"感到阵阵烦躁或不适，会立即调整并重新梳理出一套新秩序","k":"J"},{"t":"适应良好，觉得“变化本来就是常态”，顺其自然随遇而安","k":"P"}]},{"q":"环顾你的日常办公桌或电脑文件目录，它更呈现出：","opts":[{"t":"分类清晰、层级分明，常用物品用完后习惯物归原位","k":"J"},{"t":"相对自由随意，虽然他人看来有些杂乱，但自己心里清楚位置","k":"P"}]},{"q":"当一件重要的事情尚未尘埃落定时，你的心理状态是：","opts":[{"t":"心里一直悬着不踏实，迫切希望尽快敲定并看到明确结论","k":"J"},{"t":"觉得完全可以接受，保持开放态度、留有更多可能性更自由","k":"P"}]},{"q":"去大型超市或商场购物时，你的习惯是：","opts":[{"t":"心中或手机里有明确的必买清单，直奔目标货架，高效搞定","k":"J"},{"t":"漫步闲逛，随走随看，遇到感兴趣或打折的东西就顺便加购","k":"P"}]},{"q":"你更向往的生活状态与人生步调是：","opts":[{"t":"心中有明确节奏与目标、生活秩序井然、充满掌控感的状态","k":"J"},{"t":"自由随性、充满变数与新体验、不受过多条条框框束缚的状态","k":"P"}]},{"q":"面对一次期待已久的周末短途自驾游，你的理想准备方式是：","opts":[{"t":"提前确定好出发时间、必经路线与主要打卡点，心中有数才踏实","k":"J"},{"t":"只定好大致方向，看到美丽的风景随时下道拐弯，走到哪里算哪里","k":"P"}]},{"q":"当你终于搞定了一件长期困扰的重大待办事项时，你最大的内心感受是：","opts":[{"t":"巨大的踏实与掌控感，终于画上句号、把事情落实闭环了","k":"J"},{"t":"些许释怀，但很快开始期待接下来又会有哪些未知的趣味可能性","k":"P"}]},{"q":"面对一整天充满不确定性、随叫随到的临时突发任务安排：","opts":[{"t":"感到极其抓狂，这种不断被切碎日程的节奏会极大破坏你的心理秩序","k":"J"},{"t":"适应良好，觉得兵来将挡水来土掩，充满变化的一天反而不那么沉闷","k":"P"}]},{"q":"在准备做出一项人生重大选择（如换城市、择业、转行）时，你更符合：","opts":[{"t":"制定决策死线，搜集足量信息后坚决拍板，尽快开启确定的新节奏","k":"J"},{"t":"尽量延后做最终决定的时间，保持多重选项开放，观望更多变量","k":"P"}]},{"q":"当你着手开展一项需要持续两周的复杂大任务时，你的习惯是：","opts":[{"t":"拆解每天的具体目标并雷打不动执行，在截止前留出充裕的复查期","k":"J"},{"t":"前几天广泛发散、搜集素材，在临近截止前的极限压力下高度专注爆发","k":"P"}]},{"q":"你如何看待手机里的日历、待办清单（To-do App）与日程提醒？","opts":[{"t":"必不可少的第二大脑，每日日程清清楚楚，划掉待办是极大的心理爽点","k":"J"},{"t":"偶尔记录重大时间节点，但反感把每日生活机械精确地绑定在时间表里","k":"P"}]},{"q":"在团队里与他人协作时，哪种工作风格最容易让你感到心累？","opts":[{"t":"目标模糊、朝令夕改、截止时间随意顺延、缺乏明确推进节奏的伙伴","k":"J"},{"t":"事事都要严格按死板时间表推进、缺乏丝毫灵活性与即兴调整空间的伙伴","k":"P"}]},{"q":"在准备收拾行李出门旅行时，你的收拾时间点通常是：","opts":[{"t":"提前前一天甚至几天就照着清单逐一打包妥当，拉链封好","k":"J"},{"t":"临出发前几个小时甚至半小时才手忙脚乱地往箱子里塞东西","k":"P"}]},{"q":"如果一个周末两天完全没有任何既定计划与日程约束：","opts":[{"t":"内心会有点隐隐的发慌或虚度感，忍不住想列几个待办事项充实起来","k":"J"},{"t":"感到神仙般的纯粹自由，一觉睡到自然醒，随时听从内心的召唤行动","k":"P"}]},{"q":"对于‘截止日期（Deadline）’，你内心的真实定义是：","opts":[{"t":"神圣不可逾越的硬性红线，必须在之前保质保量交付","k":"J"},{"t":"给工作画下的弹性能量触发点，如果情况有变往往可以商量延期","k":"P"}]},{"q":"当你与朋友相约聚餐时，你更喜欢的约定方式是：","opts":[{"t":"明确具体到‘周五晚 18:30 在某某餐厅 3 号桌见’","k":"J"},{"t":"模糊约定‘周五晚上咱们找地方随便吃点，到时看谁先下班联系’","k":"P"}]},{"q":"在管理个人财务或家庭预算时，你的习惯是：","opts":[{"t":"有明确的储蓄规划、投资定投比例与日常记账习惯，财务状况清晰可控","k":"J"},{"t":"大致心里有个数，随赚随花，不喜欢被极其死板的预算表格约束生活","k":"P"}]},{"q":"当你买了一本很有深度的新书准备阅读时：","opts":[{"t":"习惯从第一章一页一页顺着读到最后，读完才开启下一本","k":"J"},{"t":"翻到感兴趣的章节随手跳读，同时可能手头开着三四本不同的书轮流翻","k":"P"}]},{"q":"面对领导下达的模糊任务指令‘你看着办，灵活处理’：","opts":[{"t":"更希望领导给出明确的目标验收标准与交付边界，心里才踏实","k":"J"},{"t":"非常享受这种不设限的自由空间，认为这正好给了自己最大的发挥天地","k":"P"}]},{"q":"如果你计划在今天晚上完成三项工作：","opts":[{"t":"按部就班按预定顺序逐项完成并划掉，不完成绝不安然入睡","k":"J"},{"t":"做着做着被某个突发灵感吸引走去干别的，只要开心哪怕主任务顺延也无妨","k":"P"}]},{"q":"你如何看待生活中的‘规矩与仪式感’？","opts":[{"t":"固定的作息、整理习惯与日常仪式是构筑内在秩序与安宁的基石","k":"J"},{"t":"过多的条条框框是在消磨灵气，随性自在的生活才最本真","k":"P"}]},{"q":"在租房或买房签订租约或合同时，你的态度通常是：","opts":[{"t":"逐字审阅违约责任、交房时间与细项条款，确保没有模糊灰色地带","k":"J"},{"t":"抓住大框架没硬伤即可，觉得很多细节到时大家根据实际情况沟通变通","k":"P"}]},{"q":"当你计划去一个热门旅游城市度假时，对于餐厅的选择：","opts":[{"t":"提前翻遍大众点评并提前数天甚至数周预订好热门餐厅的座位","k":"J"},{"t":"走到哪条街闻到哪家香就进哪家，甚至专挑无预订、无招牌的苍蝇小馆","k":"P"}]},{"q":"如果让你同时接手三个需要长期推进的不同项目：","opts":[{"t":"必须拉出清晰甘特图，划分优先级，确保各个节点按部就班闭环","k":"J"},{"t":"根据当天的心情与灵感状态自由切换推进，多线并行不拘泥于特定日程","k":"P"}]},{"q":"对于日常穿搭，你的习惯往往更符合：","opts":[{"t":"前一天晚上就会根据第二天天气与日程搭配好衣服甚至熨烫整齐","k":"J"},{"t":"早晨出门前几分钟拉开衣柜，顺手抓起哪件顺眼就穿哪件","k":"P"}]},{"q":"当你在写一篇需要严密论证的万字长文时，你的创作习惯通常是：","opts":[{"t":"先花费数天打磨极其详尽的提纲与每节论点，骨架齐备后再填肉","k":"J"},{"t":"先顺着澎湃的情感与灵感信马由缰狂写，写完后再大刀阔斧重构章节","k":"P"}]},{"q":"在面对突如其来的‘周末加塞加班’要求时：","opts":[{"t":"内心极度抗拒与烦躁，因为这彻底摧毁了自己精心规划的个人日程","k":"J"},{"t":"虽然不爽，但心态切换很快，既然来了就干，干完再随时找时间补休","k":"P"}]},{"q":"你如何评价自己做事情的‘收尾能力’？","opts":[{"t":"极强的强迫症式闭环能力，无法忍受未完工半成品悬而未决","k":"J"},{"t":"起步阶段灵感爆发、热情极高，但到了收尾琐碎阶段往往容易失去耐心","k":"P"}]},{"q":"去影院看一场电影，你的购票习惯通常是：","opts":[{"t":"提前一天以上选定黄金座位，准时或提前到达影院等候开场","k":"J"},{"t":"开场前一小时才临时起意买票，踩着龙标甚至进片尾才进场也心大","k":"P"}]},{"q":"关于‘决定（Decision）’的本质，你的哲学认知倾向于：","opts":[{"t":"决定是为了终结不确定性，越早形成定论，越有利于集中力量推进","k":"J"},{"t":"决定是在人为切断未来可能性，尽可能拖后做决定才能保留最多机动性","k":"P"}]},{"q":"在你的电脑浏览器里，通常呈现的标签页（Tab）状态是：","opts":[{"t":"用完即关，常年保持少于 8 个标签页，甚至装了标签页分类整理插件","k":"J"},{"t":"同时开着二三十个标签页舍不得关，挤得连网站小图标都看不清","k":"P"}]},{"q":"在与一个习惯‘迟到或临时取消约会’的人共事或相处时：","opts":[{"t":"会感到自己的时间被严重蔑视，极其消耗耐性，很难建立长期深度信任","k":"J"},{"t":"心态相对宽容，觉得突发意外谁都有，顺便自己也能趁机干点别的事","k":"P"}]},{"q":"你如何看待自己人生的大方向规划？","opts":[{"t":"心中有清晰的三年/五年里程碑设想，习惯为目标制定分步拆解阶梯","k":"J"},{"t":"人生是一场随风航行的探险，相比于刻板的五年计划，时刻保持敏锐适应力更重要","k":"P"}]},{"q":"最终而言，哪种工作环境能最大化激发你的潜能？","opts":[{"t":"权责分明、流程清晰、目标明确、成果验收标准高度确定性的环境","k":"J"},{"t":"高度自主、规则宽松、允许试错、充满即兴创造与探索弹性的环境","k":"P"}]}];

/* ========================================================
   SBTI MENTAL STATUS SYSTEM (当代青年精神状态测试 数据包)
   31 题情景测试 · 15 维度评分与向量匹配算法
   ======================================================== */

const QUESTIONS_SBTI_MAIN = [
  {
    "id": "q1",
    "dim": "S1",
    "q": "我不仅是屌丝，我还是joker,我还是咸鱼，这辈子没谈过一场恋爱，胆怯又自卑，我的青春就是一场又一场的意淫，每一天幻想着我也能有一个女孩子和我一起压马路，一起逛街，一起玩，现实却是爆了父母金币，读了个烂学校，混日子之后找班上，没有理想，没有目标，没有能力的三无人员，每次看到你能在网上开屌丝的玩笑，我都想哭，我就是地底下的老鼠，透过下水井的缝隙，窥探地上的各种美好，每一次看到这种都是对我心灵的一次伤害，对我生存空间的一次压缩，求求哥们给我们这种小丑一点活路吧，我真的不想在白天把枕巾哭湿一大片",
    "opts": [
      {
        "t": "我哭了。。",
        "v": 1
      },
      {
        "t": "这是什么。。",
        "v": 2
      },
      {
        "t": "这不是我！",
        "v": 3
      }
    ]
  },
  {
    "id": "q2",
    "dim": "S1",
    "q": "我不够好，周围的人都比我优秀",
    "opts": [
      {
        "t": "确实",
        "v": 1
      },
      {
        "t": "有时",
        "v": 2
      },
      {
        "t": "不是",
        "v": 3
      }
    ]
  },
  {
    "id": "q3",
    "dim": "S2",
    "q": "我很清楚真正的自己是什么样的",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q4",
    "dim": "S2",
    "q": "我内心有真正追求的东西",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q5",
    "dim": "S3",
    "q": "我一定要不断往上爬、变得更厉害",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q6",
    "dim": "S3",
    "q": "外人的评价对我来说无所吊谓。",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q7",
    "dim": "E1",
    "q": "对象超过5小时没回消息，说自己窜稀了，你会怎么想？",
    "opts": [
      {
        "t": "拉稀不可能5小时，也许ta隐瞒了我。",
        "v": 1
      },
      {
        "t": "在信任和怀疑之间摇摆。",
        "v": 2
      },
      {
        "t": "也许今天ta真的不太舒服。",
        "v": 3
      }
    ]
  },
  {
    "id": "q8",
    "dim": "E1",
    "q": "我在感情里经常担心被对方抛弃",
    "opts": [
      {
        "t": "是的",
        "v": 1
      },
      {
        "t": "偶尔",
        "v": 2
      },
      {
        "t": "不是",
        "v": 3
      }
    ]
  },
  {
    "id": "q9",
    "dim": "E2",
    "q": "我对天发誓，我对待每一份感情都是认真的！",
    "opts": [
      {
        "t": "并没有",
        "v": 1
      },
      {
        "t": "也许？",
        "v": 2
      },
      {
        "t": "是的！（问心无愧骄傲脸）",
        "v": 3
      }
    ]
  },
  {
    "id": "q10",
    "dim": "E2",
    "q": "你的恋爱对象是一个尊老爱幼，温柔敦厚，洁身自好，光明磊落，大义凛然，能言善辩，口才流利，观察入微，见多识广，博学多才，诲人不倦，和蔼可亲，平易近人，心地善良，慈眉善目，积极进取，意气风发，玉树临风，国色天香，倾国倾城，花容月貌的人，此时你会？",
    "opts": [
      {
        "t": "就算ta再优秀我也不会陷入太深。",
        "v": 1
      },
      {
        "t": "会介于A和C之间。",
        "v": 2
      },
      {
        "t": "会非常珍惜ta，也许会变成恋爱脑。",
        "v": 3
      }
    ]
  },
  {
    "id": "q11",
    "dim": "E3",
    "q": "恋爱后，对象非常黏人，你作何感想？",
    "opts": [
      {
        "t": "那很爽了",
        "v": 1
      },
      {
        "t": "都行无所谓",
        "v": 2
      },
      {
        "t": "我更喜欢保留独立空间",
        "v": 3
      }
    ]
  },
  {
    "id": "q12",
    "dim": "E3",
    "q": "我在任何关系里都很重视个人空间",
    "opts": [
      {
        "t": "我更喜欢依赖与被依赖",
        "v": 1
      },
      {
        "t": "看情况",
        "v": 2
      },
      {
        "t": "是的！（斩钉截铁地说道）",
        "v": 3
      }
    ]
  },
  {
    "id": "q13",
    "dim": "A1",
    "q": "大多数人是善良的",
    "opts": [
      {
        "t": "其实邪恶的人心比世界上的痔疮更多。",
        "v": 1
      },
      {
        "t": "也许吧。",
        "v": 2
      },
      {
        "t": "是的，我愿相信好人更多。",
        "v": 3
      }
    ]
  },
  {
    "id": "q14",
    "dim": "A1",
    "q": "你走在街上，一位萌萌的小女孩蹦蹦跳跳地朝你走来（正脸、侧脸看都萌，用vivo、苹果、华为、OPPO手机看都萌，实在是非常萌的那种），她递给你一根棒棒糖，此时你作何感想？",
    "opts": [
      {
        "t": "呜呜她真好真可爱！居然给我棒棒糖！",
        "v": 3
      },
      {
        "t": "一脸懵逼，作挠头状",
        "v": 2
      },
      {
        "t": "这也许是一种新型诈骗？还是走开为好。",
        "v": 1
      }
    ]
  },
  {
    "id": "q15",
    "dim": "A2",
    "q": "快考试了，学校规定必须上晚自习，请假会扣分，但今晚你约了女/男神一起玩《绝地求生：刺激战场》（一款刺激的游戏），你怎么办？",
    "opts": [
      {
        "t": "翘了！反正就一次！",
        "v": 1
      },
      {
        "t": "干脆请个假吧。",
        "v": 2
      },
      {
        "t": "都快考试了还去啥。",
        "v": 3
      }
    ]
  },
  {
    "id": "q16",
    "dim": "A2",
    "q": "我喜欢打破常规，不喜欢被束缚",
    "opts": [
      {
        "t": "认同",
        "v": 1
      },
      {
        "t": "保持中立",
        "v": 2
      },
      {
        "t": "不认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q17",
    "dim": "A3",
    "q": "我做事通常有目标。",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q18",
    "dim": "A3",
    "q": "突然某一天，我意识到人生哪有什么他妈的狗屁意义，人不过是和动物一样被各种欲望支配着，纯纯是被激素控制的东西，饿了就吃，困了就睡，一发情就想交配，我们简直和猪狗一样没什么区别。",
    "opts": [
      {
        "t": "是这样的。",
        "v": 1
      },
      {
        "t": "也许是，也许不是。",
        "v": 2
      },
      {
        "t": "这简直是胡扯",
        "v": 3
      }
    ]
  },
  {
    "id": "q19",
    "dim": "Ac1",
    "q": "我做事主要为了取得成果和进步，而不是避免麻烦和风险。",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q20",
    "dim": "Ac1",
    "q": "你因便秘坐在马桶上（已长达30分钟），拉不出很难受。此时你更像",
    "opts": [
      {
        "t": "再坐三十分钟看看，说不定就有了。",
        "v": 1
      },
      {
        "t": "用力拍打自己的屁股并说：“死屁股，快拉啊！”",
        "v": 2
      },
      {
        "t": "使用开塞露，快点拉出来才好。",
        "v": 3
      }
    ]
  },
  {
    "id": "q21",
    "dim": "Ac2",
    "q": "我做决定比较果断，不喜欢犹豫",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q22",
    "dim": "Ac2",
    "q": "此题没有题目，请盲选",
    "opts": [
      {
        "t": "反复思考后感觉应该选A？",
        "v": 1
      },
      {
        "t": "啊，要不选B？",
        "v": 2
      },
      {
        "t": "不会就选C？",
        "v": 3
      }
    ]
  },
  {
    "id": "q23",
    "dim": "Ac3",
    "q": "别人说你“执行力强”，你内心更接近哪句？",
    "opts": [
      {
        "t": "我被逼到最后确实执行力超强。。。",
        "v": 1
      },
      {
        "t": "啊，有时候吧。",
        "v": 2
      },
      {
        "t": "是的，事情本来就该被推进",
        "v": 3
      }
    ]
  },
  {
    "id": "q24",
    "dim": "Ac3",
    "q": "我做事常常有计划，____",
    "opts": [
      {
        "t": "然而计划不如变化快。",
        "v": 1
      },
      {
        "t": "有时能完成，有时不能。",
        "v": 2
      },
      {
        "t": "我讨厌被打破计划。",
        "v": 3
      }
    ]
  },
  {
    "id": "q25",
    "dim": "So1",
    "q": "你因玩《第五人格》（一款刺激的游戏）而结识许多网友，并被邀请线下见面，你的想法是？",
    "opts": [
      {
        "t": "网上口嗨下就算了，真见面还是有点忐忑。",
        "v": 1
      },
      {
        "t": "见网友也挺好，反正谁来聊我就聊两句。",
        "v": 2
      },
      {
        "t": "我会打扮一番并热情聊天，万一呢，我是说万一呢？",
        "v": 3
      }
    ]
  },
  {
    "id": "q26",
    "dim": "So1",
    "q": "朋友带了ta的朋友一起来玩，你最可能的状态是",
    "opts": [
      {
        "t": "对“朋友的朋友”天然有点距离感，怕影响二人关系",
        "v": 1
      },
      {
        "t": "看对方，能玩就玩。",
        "v": 2
      },
      {
        "t": "朋友的朋友应该也算我的朋友！要热情聊天",
        "v": 3
      }
    ]
  },
  {
    "id": "q27",
    "dim": "So2",
    "q": "我和人相处主打一个电子围栏，靠太近会自动报警。",
    "opts": [
      {
        "t": "认同",
        "v": 3
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "不认同",
        "v": 1
      }
    ]
  },
  {
    "id": "q28",
    "dim": "So2",
    "q": "我渴望和我信任的人关系密切，熟得像失散多年的亲戚。",
    "opts": [
      {
        "t": "认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "不认同",
        "v": 3
      }
    ]
  },
  {
    "id": "q29",
    "dim": "So3",
    "q": "有时候你明明对一件事有不同的、负面的看法，但最后没说出来。多数情况下原因是：",
    "opts": [
      {
        "t": "这种情况较少。",
        "v": 1
      },
      {
        "t": "可能碍于情面或者关系。",
        "v": 2
      },
      {
        "t": "不想让别人知道自己是个阴暗的人。",
        "v": 3
      }
    ]
  },
  {
    "id": "q30",
    "dim": "So3",
    "q": "我在不同人面前会表现出不一样的自己",
    "opts": [
      {
        "t": "不认同",
        "v": 1
      },
      {
        "t": "中立",
        "v": 2
      },
      {
        "t": "认同",
        "v": 3
      }
    ]
  }
];
const QUESTIONS_SBTI_SPECIAL = [
  {
    "id": "drink_gate_q1",
    "special": true,
    "kind": "drink_gate",
    "q": "您平时有什么爱好？",
    "opts": [
      {
        "t": "吃喝拉撒",
        "v": 1
      },
      {
        "t": "艺术爱好",
        "v": 2
      },
      {
        "t": "饮酒",
        "v": 3
      },
      {
        "t": "健身",
        "v": 4
      }
    ]
  },
  {
    "id": "drink_gate_q2",
    "special": true,
    "kind": "drink_trigger",
    "q": "您对饮酒的态度是？",
    "opts": [
      {
        "t": "小酌怡情，喝不了太多。",
        "v": 1
      },
      {
        "t": "我习惯将白酒灌在保温杯，当白开水喝，酒精令我信服。",
        "v": 2
      }
    ]
  }
];
const SBTI_NORMAL_TYPES = [
  {
    "code": "CTRL",
    "pattern": "HHH-HMH-MHH-HHH-MHM"
  },
  {
    "code": "ATM-er",
    "pattern": "HHH-HHM-HHH-HMH-MHL"
  },
  {
    "code": "Dior-s",
    "pattern": "MHM-MMH-MHM-HMH-LHL"
  },
  {
    "code": "BOSS",
    "pattern": "HHH-HMH-MMH-HHH-LHL"
  },
  {
    "code": "THAN-K",
    "pattern": "MHM-HMM-HHM-MMH-MHL"
  },
  {
    "code": "OH-NO",
    "pattern": "HHL-LMH-LHH-HHM-LHL"
  },
  {
    "code": "GOGO",
    "pattern": "HHM-HMH-MMH-HHH-MHM"
  },
  {
    "code": "SEXY",
    "pattern": "HMH-HHL-HMM-HMM-HLH"
  },
  {
    "code": "LOVE-R",
    "pattern": "MLH-LHL-HLH-MLM-MLH"
  },
  {
    "code": "MUM",
    "pattern": "MMH-MHL-HMM-LMM-HLL"
  },
  {
    "code": "FAKE",
    "pattern": "HLM-MML-MLM-MLM-HLH"
  },
  {
    "code": "OJBK",
    "pattern": "MMH-MMM-HML-LMM-MML"
  },
  {
    "code": "MALO",
    "pattern": "MLH-MHM-MLH-MLH-LMH"
  },
  {
    "code": "JOKE-R",
    "pattern": "LLH-LHL-LML-LLL-MLM"
  },
  {
    "code": "WOC!",
    "pattern": "HHL-HMH-MMH-HHM-LHH"
  },
  {
    "code": "THIN-K",
    "pattern": "HHL-HMH-MLH-MHM-LHH"
  },
  {
    "code": "SHIT",
    "pattern": "HHL-HLH-LMM-HHM-LHH"
  },
  {
    "code": "ZZZZ",
    "pattern": "MHL-MLH-LML-MML-LHM"
  },
  {
    "code": "POOR",
    "pattern": "HHL-MLH-LMH-HHH-LHL"
  },
  {
    "code": "MONK",
    "pattern": "HHL-LLH-LLM-MML-LHM"
  },
  {
    "code": "IMSB",
    "pattern": "LLM-LMM-LLL-LLL-MLM"
  },
  {
    "code": "SOLO",
    "pattern": "LML-LLH-LHL-LML-LHM"
  },
  {
    "code": "FUCK",
    "pattern": "MLL-LHL-LLM-MLL-HLH"
  },
  {
    "code": "DEAD",
    "pattern": "LLL-LLM-LML-LLL-LHM"
  },
  {
    "code": "IMFW",
    "pattern": "LLH-LHL-LML-LLL-MLL"
  }
];
const SBTI_DIMENSION_META = {
  "S1": {
    "name": "S1 自尊自信",
    "model": "自我模型"
  },
  "S2": {
    "name": "S2 自我清晰度",
    "model": "自我模型"
  },
  "S3": {
    "name": "S3 核心价值",
    "model": "自我模型"
  },
  "E1": {
    "name": "E1 依恋安全感",
    "model": "情感模型"
  },
  "E2": {
    "name": "E2 情感投入度",
    "model": "情感模型"
  },
  "E3": {
    "name": "E3 边界与依赖",
    "model": "情感模型"
  },
  "A1": {
    "name": "A1 世界观倾向",
    "model": "态度模型"
  },
  "A2": {
    "name": "A2 规则与灵活度",
    "model": "态度模型"
  },
  "A3": {
    "name": "A3 人生意义感",
    "model": "态度模型"
  },
  "Ac1": {
    "name": "Ac1 动机导向",
    "model": "行动驱力模型"
  },
  "Ac2": {
    "name": "Ac2 决策风格",
    "model": "行动驱力模型"
  },
  "Ac3": {
    "name": "Ac3 执行模式",
    "model": "行动驱力模型"
  },
  "So1": {
    "name": "So1 社交主动性",
    "model": "社交模型"
  },
  "So2": {
    "name": "So2 人际边界感",
    "model": "社交模型"
  },
  "So3": {
    "name": "So3 表达与真实度",
    "model": "社交模型"
  }
};
const SBTI_DIM_EXPLANATIONS = {
  "S1": {
    "L": "对自己下手比别人还狠，夸你两句你都想先验明真伪。",
    "M": "自信值随天气波动，顺风能飞，逆风先缩。",
    "H": "心里对自己大致有数，不太会被路人一句话打散。"
  },
  "S2": {
    "L": "内心频道雪花较多，常在“我是谁”里循环缓存。",
    "M": "平时还能认出自己，偶尔也会被情绪临时换号。",
    "H": "对自己的脾气、欲望和底线都算门儿清。"
  },
  "S3": {
    "L": "更在意舒服和安全，没必要天天给人生开冲刺模式。",
    "M": "想上进，也想躺会儿，价值排序经常内部开会。",
    "H": "很容易被目标、成长或某种重要信念推着往前。"
  },
  "E1": {
    "L": "感情里警报器灵敏，已读不回都能脑补到大结局。",
    "M": "一半信任，一半试探，感情里常在心里拉锯。",
    "H": "更愿意相信关系本身，不会被一点风吹草动吓散。"
  },
  "E2": {
    "L": "感情投入偏克制，心门不是没开，是门禁太严。",
    "M": "会投入，但会给自己留后手，不至于全盘梭哈。",
    "H": "一旦认定就容易认真，情绪和精力都给得很足。"
  },
  "E3": {
    "L": "容易黏人也容易被黏，关系里的温度感很重要。",
    "M": "亲密和独立都要一点，属于可调节型依赖。",
    "H": "空间感很重要，再爱也得留一块属于自己的地。"
  },
  "A1": {
    "L": "看世界自带防御滤镜，先怀疑，再靠近。",
    "M": "既不天真也不彻底阴谋论，观望是你的本能。",
    "H": "更愿意相信人性和善意，遇事不急着把世界判死刑。"
  },
  "A2": {
    "L": "规则能绕就绕，舒服和自由往往排在前面。",
    "M": "该守的时候守，该变通的时候也不死磕。",
    "H": "秩序感较强，能按流程来就不爱即兴炸场。"
  },
  "A3": {
    "L": "意义感偏低，容易觉得很多事都像在走过场。",
    "M": "偶尔有目标，偶尔也想摆烂，人生观处于半开机。",
    "H": "做事更有方向，知道自己大概要往哪边走。"
  },
  "Ac1": {
    "L": "做事先考虑别翻车，避险系统比野心更先启动。",
    "M": "有时想赢，有时只想别麻烦，动机比较混合。",
    "H": "更容易被成果、成长和推进感点燃。"
  },
  "Ac2": {
    "L": "做决定前容易多转几圈，脑内会议常常超时。",
    "M": "会想，但不至于想死机，属于正常犹豫。",
    "H": "拍板速度快，决定一下就不爱回头磨叽。"
  },
  "Ac3": {
    "L": "执行力和死线有深厚感情，越晚越像要觉醒。",
    "M": "能做，但状态看时机，偶尔稳偶尔摆。",
    "H": "推进欲比较强，事情不落地心里都像卡了根刺。"
  },
  "So1": {
    "L": "社交启动慢热，主动出击这事通常得攒半天气。",
    "M": "有人来就接，没人来也不硬凑，社交弹性一般。",
    "H": "更愿意主动打开场子，在人群里不太怕露头。"
  },
  "So2": {
    "L": "关系里更想亲近和融合，熟了就容易把人划进内圈。",
    "M": "既想亲近又想留缝，边界感看对象调节。",
    "H": "边界感偏强，靠太近会先本能性后退半步。"
  },
  "So3": {
    "L": "表达更直接，心里有啥基本不爱绕。",
    "M": "会看气氛说话，真实和体面通常各留一点。",
    "H": "对不同场景的自我切换更熟练，真实感会分层发放。"
  }
};
const SBTI_DIMENSION_ORDER = [
  "S1",
  "S2",
  "S3",
  "E1",
  "E2",
  "E3",
  "A1",
  "A2",
  "A3",
  "Ac1",
  "Ac2",
  "Ac3",
  "So1",
  "So2",
  "So3"
];
const PERSONAS_SBTI = {
  "CTRL": {
    "code": "CTRL",
    "sbtiCode": "CTRL",
    "name": "CTRL · 拿捏者",
    "cn": "拿捏者",
    "en": "The Puppet Master",
    "archetype": "掌控一切 · 终极存档",
    "color": "#5C6BC0",
    "intro": "怎么样，被我拿捏了吧？",
    "desc": "恭喜您，您测出了全中国最为罕见的人格，您是宇宙熵增定律的天然反抗者！全世界所谓成功人士里，99.99%都是您的拙劣模仿者。CTRL人格，是行走的人形自走任务管理器，普通人眼中的“规则”，在您这里只是出厂的基础参数设置；凡人所谓的“计划”，对您而言不过是心血来潮的随手涂鸦。拥有一个CTRL朋友意味着什么？意味着你的人生导航系统会变得更加精准、高效。因为CTRL最会拿捏了。CTRL会在你人生列车即将脱轨的前一秒，用一个“Ctrl+S”帮你硬核存档，再用一套无法拒绝的逻辑把你强行拽回正轨。他们是你混乱生活最后的备份盘，是宇宙崩塌前唯一还亮着的那个重启键。",
    "isSpecial": false,
    "pattern": "HHH-HMH-MHH-HHH-MHM",
    "imageFile": "assets/sbti/CTRL.png",
    "tags": [
      "全知全能",
      "人形自走管理器",
      "终极掌控"
    ],
    "ingredients": [
      {
        "n": "全知全能",
        "p": 40
      },
      {
        "n": "人形自走管理器",
        "p": 30
      },
      {
        "n": "终极掌控",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>怎么样，被我拿捏了吧？</b><p>恭喜您，您测出了全中国最为罕见的人格，您是宇宙熵增定律的天然反抗者！全世界所谓成功人士里，99.99%都是您的拙劣模仿者。CTRL人格，是行走的人形自…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "ATM-er": {
    "code": "ATM-er",
    "sbtiCode": "ATM-er",
    "name": "ATM-er · 送钱者",
    "cn": "送钱者",
    "en": "The Payer",
    "archetype": "默默买单 · 责任过载",
    "color": "#26A69A",
    "intro": "你以为我很有钱吗？",
    "desc": "恭喜您，您竟然测出了这个世界上最稀有的人格。您或将成为金融界的未解之谜——是的，ATM-er不一定真的“送钱”，但可能永远在“支付”。支付时间、支付精力、支付耐心、支付一个本该安宁的夜晚。因此像一部老旧但坚固的ATM机，插进去的是别人的焦虑和麻烦，吐出来的是“没事，有我”的安心保证。您的人生就是一场盛大的、无人喝彩的单人付账秀。您竟用磐石般的可靠，承受了瀑布般的索取，偶尔夜深人静才会对着账单——可能是精神上的——发出一声叹息：我这该死的、无处安放的责任心啊。",
    "isSpecial": false,
    "pattern": "HHH-HHM-HHH-HMH-MHL",
    "imageFile": "assets/sbti/ATM-er.png",
    "tags": [
      "单人付账秀",
      "责任心过剩",
      "人形自走ATM"
    ],
    "ingredients": [
      {
        "n": "单人付账秀",
        "p": 40
      },
      {
        "n": "责任心过剩",
        "p": 30
      },
      {
        "n": "人形自走ATM",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>你以为我很有钱吗？</b><p>恭喜您，您竟然测出了这个世界上最稀有的人格。您或将成为金融界的未解之谜——是的，ATM-er不一定真的“送钱”，但可能永远在“支付”。支付时间、支付精…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "Dior-s": {
    "code": "Dior-s",
    "sbtiCode": "Dior-s",
    "name": "Dior-s · 屌丝",
    "cn": "屌丝",
    "en": "The Cynic Sage",
    "archetype": "人桶合一 · 犬儒真传",
    "color": "#8D6E63",
    "intro": "等着我屌丝逆袭。",
    "desc": "恭喜！您并非屌丝，您是犬儒主义先贤第欧根尼失散多年的精神传人，因为屌丝的全称是 Diogenes' Original Realist - sage。Dior-s人格，是对当代消费主义陷阱和成功学PUA最彻底的蔑视。他们不是“不求上进”，而是早已看穿一切“上进”的尽头不过是更高级的牢房。屌丝有着大智慧。当别人在追逐风口，被时代的巨浪拍得七荤八素时，Dior-s早已在自己的精神木桶里晒着太阳，达到了“人桶合一”的至高境界。他们信奉的不是空话，是经过亿万次实践检验的物理法则与生物本能：一、躺着比站着舒服；二、饭点到了就得干饭。",
    "isSpecial": false,
    "pattern": "MHM-MMH-MHM-HMH-LHL",
    "imageFile": "assets/sbti/Dior-s.png",
    "tags": [
      "人桶合一",
      "大智若愚",
      "犬儒真传"
    ],
    "ingredients": [
      {
        "n": "人桶合一",
        "p": 40
      },
      {
        "n": "大智若愚",
        "p": 30
      },
      {
        "n": "犬儒真传",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>等着我屌丝逆袭。</b><p>恭喜！您并非屌丝，您是犬儒主义先贤第欧根尼失散多年的精神传人，因为屌丝的全称是 Diogenes' Original Realist - sage。D…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "BOSS": {
    "code": "BOSS",
    "sbtiCode": "BOSS",
    "name": "BOSS · 领导者",
    "cn": "领导者",
    "en": "The Supreme Leader",
    "archetype": "方向盘霸权 · 永恒向上",
    "color": "#E53935",
    "intro": "方向盘给我，我来开。",
    "desc": "BOSS是一个手里永远拿着方向盘的人。哪怕油箱已经亮了红灯，哪怕导航在胡说八道，你都会面无表情地说一句：我来开。然后真的把车开到了目的地。该人格拥有独立的物理法则——永恒向上定律。BOSS人格看世界，就像玩通关了的玩家在看新手教程。效率是他们的信仰，秩序是他们的呼吸。他们不是“自带领袖气场”，他们本身就是人形的气场发生器，方圆五米内，空气都会自动变得严肃而高效。他们眼中的“自我突破”，约等于普通人眼中的“自虐”。今天掌握一门新语言，明天考下一个专业证书，后天就计划殖民火星。你说这太卷了，他会用一种看弱鸡的眼神看着你：不是我太狠，是你太松。",
    "isSpecial": false,
    "pattern": "HHH-HMH-MMH-HHH-LHL",
    "imageFile": "assets/sbti/BOSS.png",
    "tags": [
      "永恒向上",
      "方向盘狂魔",
      "自带气场"
    ],
    "ingredients": [
      {
        "n": "永恒向上",
        "p": 40
      },
      {
        "n": "方向盘狂魔",
        "p": 30
      },
      {
        "n": "自带气场",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>方向盘给我，我来开。</b><p>BOSS是一个手里永远拿着方向盘的人。哪怕油箱已经亮了红灯，哪怕导航在胡说八道，你都会面无表情地说一句：我来开。然后真的把车开到了目的地。该人格拥有独…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "THAN-K": {
    "code": "THAN-K",
    "sbtiCode": "THAN-K",
    "name": "THAN-K · 感恩者",
    "cn": "感恩者",
    "en": "The Grateful One",
    "archetype": "感恩苍天 · 正能量发射塔",
    "color": "#FFA726",
    "intro": "我感谢苍天！我感谢大地！",
    "desc": "恭喜您，您测出了全中国最为罕见的人格。您应当感谢我！感谢您在此刻拥有了生命的滋润！倘若您上班路上堵车了？您也应当说一句：我感谢这次堵车，它让我有更多时间聆听这首美妙的歌曲，并欣赏窗外每一张因焦虑而扭曲的脸庞，让我更珍惜内心的平静。是的，THAN-K拥有温润如玉的性格和海纳百川的胸怀。他们眼中的世界没有完全的坏人，只有“尚未被感恩光芒照耀到的朋友”。拥有一个THAN-K朋友，就像身边多了一个永不枯竭的正能量发射塔。TA甚至能帮你从墙角的霉斑里发现一幅梵高风格的星空图。",
    "isSpecial": false,
    "pattern": "MHM-HMM-HHM-MMH-MHL",
    "imageFile": "assets/sbti/THAN-K.png",
    "tags": [
      "正能量发射塔",
      "万物皆可谢",
      "海纳百川"
    ],
    "ingredients": [
      {
        "n": "正能量发射塔",
        "p": 40
      },
      {
        "n": "万物皆可谢",
        "p": 30
      },
      {
        "n": "海纳百川",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>我感谢苍天！我感谢大地！</b><p>恭喜您，您测出了全中国最为罕见的人格。您应当感谢我！感谢您在此刻拥有了生命的滋润！倘若您上班路上堵车了？您也应当说一句：我感谢这次堵车，它让我有更多时…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "OH-NO": {
    "code": "OH-NO",
    "sbtiCode": "OH-NO",
    "name": "OH-NO · 哦不人",
    "cn": "哦不人",
    "en": "The Anxious Order",
    "archetype": "风险防御 · 神经紧绷",
    "color": "#AB47BC",
    "intro": "哦不！我怎么会是这个人格？！",
    "desc": "“哦不！”并非恐惧的尖叫，而是一种顶级的智慧。当普通人看到一个杯子放在桌沿，哦不人看到的是一场由“水渍-短路-火灾-全楼疏散-经济损失-蝴蝶效应-世界末日”构成的灾难史诗。于是，伴随着一声发自灵魂深处的 Oh, no!，他们会以迅雷不及掩耳之势把杯子挪到桌子正中央，然后再垫上一张吸水杯垫。哦不人对“边界”有一种近乎偏执的尊重：你的就是你的，我的就是我的。所有意外和风险都已经在他的“Oh, no!”声中，被扼杀在了萌芽状态。他们是秩序的守护神，是混乱世界里最后那批神经绷得很直的体面人。",
    "isSpecial": false,
    "pattern": "HHL-LMH-LHH-HHM-LHL",
    "imageFile": "assets/sbti/OH-NO.png",
    "tags": [
      "秩序守护神",
      "灾难防御MAX",
      "体面人"
    ],
    "ingredients": [
      {
        "n": "秩序守护神",
        "p": 40
      },
      {
        "n": "灾难防御MAX",
        "p": 30
      },
      {
        "n": "体面人",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>哦不！我怎么会是这个人格？！</b><p>“哦不！”并非恐惧的尖叫，而是一种顶级的智慧。当普通人看到一个杯子放在桌沿，哦不人看到的是一场由“水渍-短路-火灾-全楼疏散-经济损失-蝴蝶效应-世界…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "GOGO": {
    "code": "GOGO",
    "sbtiCode": "GOGO",
    "name": "GOGO · 行者",
    "cn": "行者",
    "en": "The Fast Walker",
    "archetype": "所见即所得 · 待办粉碎机",
    "color": "#43A047",
    "intro": "gogogo~出发咯",
    "desc": "经研究发现，GOGO人格的大脑构造与常人有根本性不同。GOGO活在一个极致的“所见即所得”世界里，人生信条简单粗暴到令人发指：只要我闭上眼睛，天就是黑的；只要我把钱都花了，我就没有钱了；只要我站在斑马线上，我现在就是行人了。逻辑完美闭环，根本无法反驳。别人还在为“先有鸡还是先有蛋”而辩论，GOGO行者已经把鸡和蛋一起做成了一盘“鸡生蛋，蛋生鸡之终极奥义盖浇饭”。他们不是在“解决问题”，他们是在“清除待办事项”。对他们来说，世界上只有两种状态：已完成，和即将被我完成。",
    "isSpecial": false,
    "pattern": "HHM-HMH-MMH-HHH-MHM",
    "imageFile": "assets/sbti/GOGO.png",
    "tags": [
      "所见即所得",
      "待办粉碎机",
      "执行力怪兽"
    ],
    "ingredients": [
      {
        "n": "所见即所得",
        "p": 40
      },
      {
        "n": "待办粉碎机",
        "p": 30
      },
      {
        "n": "执行力怪兽",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>gogogo~出发咯</b><p>经研究发现，GOGO人格的大脑构造与常人有根本性不同。GOGO活在一个极致的“所见即所得”世界里，人生信条简单粗暴到令人发指：只要我闭上眼睛，天就是黑…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "SEXY": {
    "code": "SEXY",
    "sbtiCode": "SEXY",
    "name": "SEXY · 尤物",
    "cn": "尤物",
    "en": "The Pure Allure",
    "archetype": "天生尤物 · 魅力黑洞",
    "color": "#EC407A",
    "intro": "您就是天生的尤物！",
    "desc": "当您走进一个房间，照明系统会自动将您识别为天生的尤物，并自觉调暗亮度，以避免能源浪费。当您微笑时，您就变成了微笑着的尤物，周围的空气湿度也会显著下降，因为水蒸气都凝结成了人眼中的爱心。无论是谁，都容易对您的存在产生一种超标的注意力。传说，如果有足够多的SEXY人格聚集在一起开派对，其释放出的综合魅力能量足以暂时扭曲时空结构，让参加者产生“时间变慢了”的幸福错觉。他们不需要卖力表达，很多时候，单是存在本身就已经很像一篇华丽到过分的赋。",
    "isSpecial": false,
    "pattern": "HMH-HHL-HMM-HMM-HLH",
    "imageFile": "assets/sbti/SEXY.png",
    "tags": [
      "天生尤物",
      "魅力引力场",
      "存在即是赋"
    ],
    "ingredients": [
      {
        "n": "天生尤物",
        "p": 40
      },
      {
        "n": "魅力引力场",
        "p": 30
      },
      {
        "n": "存在即是赋",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>您就是天生的尤物！</b><p>当您走进一个房间，照明系统会自动将您识别为天生的尤物，并自觉调暗亮度，以避免能源浪费。当您微笑时，您就变成了微笑着的尤物，周围的空气湿度也会显著下降，…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "LOVE-R": {
    "code": "LOVE-R",
    "sbtiCode": "LOVE-R",
    "name": "LOVE-R · 多情者",
    "cn": "多情者",
    "en": "The Romantic Bard",
    "archetype": "彩虹脑电波 · 绝代吟游诗人",
    "color": "#E91E63",
    "intro": "爱意太满，现实显得有点贫瘠。",
    "desc": "LOVE-R人格像远古神话时代幸存至今的珍稀物种，其存在概率比你在马桶里钓到作者胳膊的概率还低。您简直是这个钢铁森林时代最后的、也是最不合时宜的吟游诗人。因为您的情感处理器不是二进制的，而是彩虹制的。一片落叶，在常人眼里只是“秋天来了”，在LOVE-R眼中，则是一场关于轮回、牺牲与无言之爱的十三幕悲喜剧。您内心世界像一座永不关门的主题公园，一生都在寻找那个能看懂园区地图、并愿意陪你坐旋转木马直到宇宙尽头的灵魂伴侣。",
    "isSpecial": false,
    "pattern": "MLH-LHL-HLH-MLM-MLH",
    "imageFile": "assets/sbti/LOVE-R.png",
    "tags": [
      "彩虹处理器",
      "吟游诗人",
      "深情永不打烊"
    ],
    "ingredients": [
      {
        "n": "彩虹处理器",
        "p": 40
      },
      {
        "n": "吟游诗人",
        "p": 30
      },
      {
        "n": "深情永不打烊",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>爱意太满，现实显得有点贫瘠。</b><p>LOVE-R人格像远古神话时代幸存至今的珍稀物种，其存在概率比你在马桶里钓到作者胳膊的概率还低。您简直是这个钢铁森林时代最后的、也是最不合时宜的吟游诗…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "MUM": {
    "code": "MUM",
    "sbtiCode": "MUM",
    "name": "MUM · 妈妈",
    "cn": "妈妈",
    "en": "The Universal Mom",
    "archetype": "无私包容 · 共情天使",
    "color": "#FF7043",
    "intro": "或许...我可以叫你妈妈吗....?",
    "desc": "恭喜您，您测出了全中国最稀有的妈妈人格。是的，在混沌未开、时间尚无姓名之前，在第一颗恒星打出第一个嗝之前，就已经有了妈妈。妈妈人格的底色是温柔，擅长感知情绪，具有超强共情力，知道什么时候该停下来，什么时候该对自己说一句“算了”。妈妈像一个医生，治愈了别人的不开心。只可惜，当妈妈落泪时，TA给自己的药，剂量总是比给别人小一号。MUM对自己的温柔，常常打了折。",
    "isSpecial": false,
    "pattern": "MMH-MHL-HMM-LMM-HLL",
    "imageFile": "assets/sbti/MUM.png",
    "tags": [
      "共情天花板",
      "情绪大夫",
      "温柔无上限"
    ],
    "ingredients": [
      {
        "n": "共情天花板",
        "p": 40
      },
      {
        "n": "情绪大夫",
        "p": 30
      },
      {
        "n": "温柔无上限",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>或许...我可以叫你妈妈吗....?</b><p>恭喜您，您测出了全中国最稀有的妈妈人格。是的，在混沌未开、时间尚无姓名之前，在第一颗恒星打出第一个嗝之前，就已经有了妈妈。妈妈人格的底色是温柔，擅长感…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "FAKE": {
    "code": "FAKE",
    "sbtiCode": "FAKE",
    "name": "FAKE · 伪人",
    "cn": "伪人",
    "en": "The Synth Person",
    "archetype": "千面伪人 · 社交仿生机器",
    "color": "#78909C",
    "intro": "已经，没有人类了。",
    "desc": "SCP基金会紧急报告：项目编号 SCP-CN-████ “伪人”。在社交场合，伪人是八面玲珑的存在，因为他们切换人格面具比切换手机输入法还快。上一秒还是推心置腹的铁哥们模式，下一秒领导来了，瞬间切换成沉稳可靠好员工模式，连脸上的光泽度和卷曲度都会发生微调。你以为你交到了一个真心懂你的朋友？醒醒。你只是幸运地遇到了一个善于伪装、高性能的仿生人罢了。夜深人静时，伪人把面具一层层摘下来，最后才发现，面具下空得很，正是这些面具构成了自己。",
    "isSpecial": false,
    "pattern": "HLM-MML-MLM-MLM-HLH",
    "imageFile": "assets/sbti/FAKE.png",
    "tags": [
      "面具大师",
      "社交变色龙",
      "高性能仿生人"
    ],
    "ingredients": [
      {
        "n": "面具大师",
        "p": 40
      },
      {
        "n": "社交变色龙",
        "p": 30
      },
      {
        "n": "高性能仿生人",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>已经，没有人类了。</b><p>SCP基金会紧急报告：项目编号 SCP-CN-████ “伪人”。在社交场合，伪人是八面玲珑的存在，因为他们切换人格面具比切换手机输入法还快。上一秒还…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "OJBK": {
    "code": "OJBK",
    "sbtiCode": "OJBK",
    "name": "OJBK · 无所谓人",
    "cn": "无所谓人",
    "en": "The Carefree Monarch",
    "archetype": "无所谓神功 · 随缘帝王",
    "color": "#7E57C2",
    "intro": "我说随便，是真的随便。",
    "desc": "让我们直面这个词的粗犷本质：OJBK。这已经不是一种人格，而是一种统治哲学。当凡人面临“中午吃米饭还是面条”的世纪抉择时，大脑在激烈燃烧卡路里；而OJBK人格，会用一种批阅奏章般的淡然，轻飘飘地吐出两个字：都行。这不是没主见，这是在告诉你：尔等凡俗的选择，于朕而言，皆为蝼蚁。为什么不争执？因为跟草履虫辩论宇宙的未来毫无意义。为什么不较真？因为帝王不会在意脚下的尘埃是往左飘还是往右飘。",
    "isSpecial": false,
    "pattern": "MMH-MMM-HML-LMM-MML",
    "imageFile": "assets/sbti/OJBK.png",
    "tags": [
      "都行哲学",
      "无所谓神功",
      "凡俗皆蝼蚁"
    ],
    "ingredients": [
      {
        "n": "都行哲学",
        "p": 40
      },
      {
        "n": "无所谓神功",
        "p": 30
      },
      {
        "n": "凡俗皆蝼蚁",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>我说随便，是真的随便。</b><p>让我们直面这个词的粗犷本质：OJBK。这已经不是一种人格，而是一种统治哲学。当凡人面临“中午吃米饭还是面条”的世纪抉择时，大脑在激烈燃烧卡路里；而OJ…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "MALO": {
    "code": "MALO",
    "sbtiCode": "MALO",
    "name": "MALO · 吗喽",
    "cn": "吗喽",
    "en": "The Cyber Macaque",
    "archetype": "精神吗喽 · 文明逆行者",
    "color": "#8D6E63",
    "intro": "人生是个副本，而我只是一只吗喽。",
    "desc": "朋友，你不是“童心未泯”，你压根就没进化。你的灵魂还停留在那个挂在树上荡秋千、看见香蕉就两眼放光的快乐时代。当人类祖先决定从树上下来、学会直立行走、穿上西装打领带时，吗喽人格的祖先在旁边的大树上看着他们，挠了挠屁股，嘴里发出一声不屑的“吱”。他们看透了一切：所谓的“文明”，不过是一场最无聊、最不好玩的付费游戏。规则偶尔是可以打破的，天花板是用来倒挂的，会议室是用来表演后空翻的。MALO本身就是一个从巨大脑洞里掉出来、忘了关门的奇思妙想。",
    "isSpecial": false,
    "pattern": "MLH-MHM-MLH-MLH-LMH",
    "imageFile": "assets/sbti/MALO.png",
    "tags": [
      "精神吗喽",
      "文明逆行者",
      "天花板倒挂"
    ],
    "ingredients": [
      {
        "n": "精神吗喽",
        "p": 40
      },
      {
        "n": "文明逆行者",
        "p": 30
      },
      {
        "n": "天花板倒挂",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>人生是个副本，而我只是一只吗喽。</b><p>朋友，你不是“童心未泯”，你压根就没进化。你的灵魂还停留在那个挂在树上荡秋千、看见香蕉就两眼放光的快乐时代。当人类祖先决定从树上下来、学会直立行走、穿…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "JOKE-R": {
    "code": "JOKE-R",
    "sbtiCode": "JOKE-R",
    "name": "JOKE-R · 小丑",
    "cn": "小丑",
    "en": "The Tearful Clown",
    "archetype": "小丑竟是我 · 含泪整活",
    "color": "#9C27B0",
    "intro": "原来我们都是小丑。",
    "desc": "请注意，JOKE-R人格不是一个“人”，更像一个把笑话穿在身上的小丑。你打开一层，是个笑话；再打开一层，是个段子；你一层层打开，直到最后，你发现最里面……是空的，只剩下一点微弱的回声在说：哈，没想到吧。JOKE-R是社交场合的气氛组组长兼唯一指定火力输出。有他们在，场子就不会冷。所有人前仰后合地笑着，而笑得最开心的，往往也是他们自己——用最大的笑声，盖住心碎的声音。",
    "isSpecial": false,
    "pattern": "LLH-LHL-LML-LLL-MLM",
    "imageFile": "assets/sbti/JOKE-R.png",
    "tags": [
      "气氛组组长",
      "小丑竟是我",
      "含泪整活"
    ],
    "ingredients": [
      {
        "n": "气氛组组长",
        "p": 40
      },
      {
        "n": "小丑竟是我",
        "p": 30
      },
      {
        "n": "含泪整活",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>原来我们都是小丑。</b><p>请注意，JOKE-R人格不是一个“人”，更像一个把笑话穿在身上的小丑。你打开一层，是个笑话；再打开一层，是个段子；你一层层打开，直到最后，你发现最里面…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "WOC!": {
    "code": "WOC!",
    "sbtiCode": "WOC!",
    "name": "WOC! · 握草人",
    "cn": "握草人",
    "en": "The Grass Grasper",
    "archetype": "握草人 · 人间清醒看戏",
    "color": "#F57C00",
    "intro": "卧槽，我怎么是这个人格？",
    "desc": "我们发现了一种神奇的生物——WOC!人。他们拥有两种完全独立的操作系统：一个叫“表面系统”，负责发出“我操”“牛逼”“啊？”等一系列大惊小怪的拟声词；另一个叫“后台系统”，负责冷静分析：嗯，果然不出我所料。WOC!人只会卧槽，不会多管闲事，因为他们深知，给傻逼讲道理，就像扶着烂泥上墙，不仅浪费体力，还弄自己一手屎。所以他们选择，握着一根智慧的大草，用一声饱含深情的“WOC！”来为这个疯狂的世界献上最高敬意。",
    "isSpecial": false,
    "pattern": "HHL-HMH-MMH-HHM-LHH",
    "imageFile": "assets/sbti/WOC.png",
    "tags": [
      "双操作系统",
      "卧槽走天下",
      "大智慧观望"
    ],
    "ingredients": [
      {
        "n": "双操作系统",
        "p": 40
      },
      {
        "n": "卧槽走天下",
        "p": 30
      },
      {
        "n": "大智慧观望",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>卧槽，我怎么是这个人格？</b><p>我们发现了一种神奇的生物——WOC!人。他们拥有两种完全独立的操作系统：一个叫“表面系统”，负责发出“我操”“牛逼”“啊？”等一系列大惊小怪的拟声词；…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "THIN-K": {
    "code": "THIN-K",
    "sbtiCode": "THIN-K",
    "name": "THIN-K · 思考者",
    "cn": "思考者",
    "en": "The Overthinker",
    "archetype": "深度思考者 · 信息粉碎机",
    "color": "#0288D1",
    "intro": "已深度思考100s。",
    "desc": "经研究发现，THIN-K人格的大脑构造与常人有根本性不同。正如名称所示，您的大脑长时间处于思考状态。您十分会审判信息，注重论点、论据、逻辑推理、潜在偏见，乃至“作者本人三代以内思想背景调查报告”的全套材料。在这个信息爆炸的时代，您绝不会轻易盲从，会在关系中衡量利弊，也十分捍卫自己的自我空间。当别人看到您独处时在发呆？愚蠢，那不是发呆，那是您的大脑正在对今天接收到的所有信息进行分类、归档和销毁。",
    "isSpecial": false,
    "pattern": "HHL-HMH-MLH-MHM-LHH",
    "imageFile": "assets/sbti/THIN-K.png",
    "tags": [
      "大脑风暴中",
      "反刍信息狂",
      "防被忽悠达人"
    ],
    "ingredients": [
      {
        "n": "大脑风暴中",
        "p": 40
      },
      {
        "n": "反刍信息狂",
        "p": 30
      },
      {
        "n": "防被忽悠达人",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>已深度思考100s。</b><p>经研究发现，THIN-K人格的大脑构造与常人有根本性不同。正如名称所示，您的大脑长时间处于思考状态。您十分会审判信息，注重论点、论据、逻辑推理、潜在偏…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "SHIT": {
    "code": "SHIT",
    "sbtiCode": "SHIT",
    "name": "SHIT · 愤世者",
    "cn": "愤世者",
    "en": "The Cynical Worker",
    "archetype": "边骂构石 · 边拯救世界",
    "color": "#5D4037",
    "intro": "这个世界，构石一坨。",
    "desc": "恭喜您，SHIT人格是宇宙中已知的唯一一种稀有人格。所谓狗屎，并不是在抱怨，而是在进行一种神秘仪式。SHIT的行为模式是一场惊天动地的悖论戏剧。嘴上：这个项目简直是屎。手上：默默打开 Excel，开始建构函数模型和甘特图。嘴上：这帮同事都是 shit。手上：在同事搞砸之后，一边烦着，一边熬夜把烂摊子收拾得明明白白。嘴上：这个世界就是一坨 shit，赶紧毁灭吧。手上：第二天早上七点准时起床，挤上 shit 一样的地铁，去干那份 shit 一样的工作。别怕，那不是世界末日的警报，那是他马上要开始拯救世界的冲锋号。",
    "isSpecial": false,
    "pattern": "HHL-HLH-LMM-HHM-LHH",
    "imageFile": "assets/sbti/SHIT.png",
    "tags": [
      "构石一坨",
      "边骂边干",
      "拯救世界冲锋号"
    ],
    "ingredients": [
      {
        "n": "构石一坨",
        "p": 40
      },
      {
        "n": "边骂边干",
        "p": 30
      },
      {
        "n": "拯救世界冲锋号",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>这个世界，构石一坨。</b><p>恭喜您，SHIT人格是宇宙中已知的唯一一种稀有人格。所谓狗屎，并不是在抱怨，而是在进行一种神秘仪式。SHIT的行为模式是一场惊天动地的悖论戏剧。嘴上：…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "ZZZZ": {
    "code": "ZZZZ",
    "sbtiCode": "ZZZZ",
    "name": "ZZZZ · 装死者",
    "cn": "装死者",
    "en": "The Feigned Sleeper",
    "archetype": "装死大师 · 死线觉醒战神",
    "color": "#546E7A",
    "intro": "我没死，我只是在睡觉。",
    "desc": "恭喜您，您测出了全中国最稀有的装死人格。群里99+条消息您可以视而不见，但当有人发出“@全体成员 还有半小时就截止了”的最后通牒时，您也许会像刚从千年古墓里苏醒一样，缓缓地敲出一个“收到”，然后在29分钟内，交出一份虽然及格的答卷。是的，直到“死线”这个唯一的、最高权限的指令出现，您就真正爆发了，不鸣则已，一鸣惊人。您向宇宙证明了一个真理：有时什么都不做，就不会做错。",
    "isSpecial": false,
    "pattern": "MHL-MLH-LML-MML-LHM",
    "imageFile": "assets/sbti/ZZZZ.png",
    "tags": [
      "死线战神",
      "装死防背锅",
      "深眠大招"
    ],
    "ingredients": [
      {
        "n": "死线战神",
        "p": 40
      },
      {
        "n": "装死防背锅",
        "p": 30
      },
      {
        "n": "深眠大招",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>我没死，我只是在睡觉。</b><p>恭喜您，您测出了全中国最稀有的装死人格。群里99+条消息您可以视而不见，但当有人发出“@全体成员 还有半小时就截止了”的最后通牒时，您也许会像刚从千年…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "POOR": {
    "code": "POOR",
    "sbtiCode": "POOR",
    "name": "POOR · 贫困者",
    "cn": "贫困者",
    "en": "The Laser Focus",
    "archetype": "极简专精 · 精神深矿井",
    "color": "#7CB342",
    "intro": "我穷，但我很专。",
    "desc": "恭喜您，您测出了【POOR - 贫困者】。这个“贫困”不是钱包余额的判决书，更像一种欲望断舍离后的资源再分配。别人把精力撒成漫天二维码，你把精力压成一束激光，照哪儿，哪儿就开始冒烟。POOR的世界很简单：不重要的东西一律降噪，重要的东西狠狠干到底。热闹、社交、虚荣、到处刷存在感？抱歉，没空。你不是资源少，你是把资源全部灌进了一个坑里，所以看起来像贫困，实际上像矿井。一旦某件事被你认定值得钻，外界再吵也只是背景杂音。",
    "isSpecial": false,
    "pattern": "HHL-MLH-LMH-HHH-LHL",
    "imageFile": "assets/sbti/POOR.png",
    "tags": [
      "激光聚焦",
      "极度专一",
      "精神矿井"
    ],
    "ingredients": [
      {
        "n": "激光聚焦",
        "p": 40
      },
      {
        "n": "极度专一",
        "p": 30
      },
      {
        "n": "精神矿井",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>我穷，但我很专。</b><p>恭喜您，您测出了【POOR - 贫困者】。这个“贫困”不是钱包余额的判决书，更像一种欲望断舍离后的资源再分配。别人把精力撒成漫天二维码，你把精力压成一…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "MONK": {
    "code": "MONK",
    "sbtiCode": "MONK",
    "name": "MONK · 僧人",
    "cn": "僧人",
    "en": "The Ascetic",
    "archetype": "看破红尘 · 绝对结界",
    "color": "#FB8C00",
    "intro": "没有那种世俗的欲望。",
    "desc": "当别人在KTV里参悟爱与恨的纠缠，MONK人格选择在家中参悟一份大道。MONK已然看破红尘，不希望闲人来扰其清修、破其道行。MONK的个人空间，是他们的结界，是他们的须弥山，是他们的绝对领域，神圣不可侵犯。踏入者，会感受到一种来自灵魂深处的窒息感。MONK们不黏不缠，因为在他们的世界观里，万物皆有其独立轨道。行星与行星之间保持着亿万公里的距离，才构成和谐宇宙，人与人之间为什么不行？",
    "isSpecial": false,
    "pattern": "HHL-LLH-LLM-MML-LHM",
    "imageFile": "assets/sbti/MONK.png",
    "tags": [
      "看破红尘",
      "神圣结界",
      "无欲无求"
    ],
    "ingredients": [
      {
        "n": "看破红尘",
        "p": 40
      },
      {
        "n": "神圣结界",
        "p": 30
      },
      {
        "n": "无欲无求",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>没有那种世俗的欲望。</b><p>当别人在KTV里参悟爱与恨的纠缠，MONK人格选择在家中参悟一份大道。MONK已然看破红尘，不希望闲人来扰其清修、破其道行。MONK的个人空间，是他们…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "IMSB": {
    "code": "IMSB",
    "sbtiCode": "IMSB",
    "name": "IMSB · 傻者",
    "cn": "傻者",
    "en": "The Self Doubter",
    "archetype": "内心大戏 · 纠结大宗师",
    "color": "#D81B60",
    "intro": "认真的么？我真的是傻逼么？",
    "desc": "恭喜您！您根本不在人类范畴内！您测出了百万年一遇的【IMSB】人格。IMSB人格的大脑里住着两个不死不休的究极战士：一个叫“我他妈冲了！”，另一个叫“我是个傻逼！”。当IMSB面对一个有好感的人时，前者会说：冲啊！去要微信！去约饭！爱要大声说出来！后者接着说：人家凭什么看得上你？你去了就是自取其辱！最终结果：盯着对方背影直到消失，然后掏出手机搜索“如何克服社交恐惧症”。IMSB不是真的傻，只是您的内心戏，可能比漫威宇宙所有电影加起来都长。",
    "isSpecial": false,
    "pattern": "LLM-LMM-LLL-LLL-MLM",
    "imageFile": "assets/sbti/IMSB.png",
    "tags": [
      "内心戏超长",
      "自嘲王者",
      "纠结大宗师"
    ],
    "ingredients": [
      {
        "n": "内心戏超长",
        "p": 40
      },
      {
        "n": "自嘲王者",
        "p": 30
      },
      {
        "n": "纠结大宗师",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>认真的么？我真的是傻逼么？</b><p>恭喜您！您根本不在人类范畴内！您测出了百万年一遇的【IMSB】人格。IMSB人格的大脑里住着两个不死不休的究极战士：一个叫“我他妈冲了！”，另一个叫“…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "SOLO": {
    "code": "SOLO",
    "sbtiCode": "SOLO",
    "name": "SOLO · 孤儿",
    "cn": "孤儿",
    "en": "The Hedgehog King",
    "archetype": "刺猬孤岛 · 莫挨老子",
    "color": "#3949AB",
    "intro": "我哭了，我怎么会是孤儿？",
    "desc": "恭喜您，您测出了全中国最稀有的【SOLO - 孤儿】人格。别急着哭，国王的加冕仪式，通常都是一个人。孤儿的自我价值感偏低，因此有时主动疏远他人，孤儿们在自己的灵魂外围建起了一座名为“莫挨老子”的万里长城。每一块砖，都是过去的一道伤口。孤儿就像一只把所有软肋都藏起来，然后用最硬的刺对着世界的刺猬。那满身的尖刺不是攻击，那是一句句说不出口的“别过来，我怕你也受伤”和“求求你，别离开”。",
    "isSpecial": false,
    "pattern": "LML-LLH-LHL-LML-LHM",
    "imageFile": "assets/sbti/SOLO.png",
    "tags": [
      "万里长城",
      "刺猬保护罩",
      "孤独王者"
    ],
    "ingredients": [
      {
        "n": "万里长城",
        "p": 40
      },
      {
        "n": "刺猬保护罩",
        "p": 30
      },
      {
        "n": "孤独王者",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>我哭了，我怎么会是孤儿？</b><p>恭喜您，您测出了全中国最稀有的【SOLO - 孤儿】人格。别急着哭，国王的加冕仪式，通常都是一个人。孤儿的自我价值感偏低，因此有时主动疏远他人，孤儿们…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "FUCK": {
    "code": "FUCK",
    "sbtiCode": "FUCK",
    "name": "FUCK · 草者",
    "cn": "草者",
    "en": "The Wild Weed",
    "archetype": "野草命格 · 纯粹生命力",
    "color": "#E53935",
    "intro": "操！这是什么人格？",
    "desc": "恭喜您！您根本不在人类范畴内！您测出了百万年一遇的【FUCK】人格。人类文明城市里，出现了一株无法被任何除草剂杀死的、具有超级生命力的人形野草——那就是草者人格。它的学名，就叫 FUCK。在FUCK的世界观里，世俗规则简直毫无意义，并且FUCK的情绪开关是物理拨片式的：FUCK YEAH 和 FUCK OFF。FUCK追求的不只是当下快感，也在追求一种在体内横冲直撞的生命力。当所有人都被驯化成了温顺家禽，FUCK则是荒野上最后那一声狼嚎。",
    "isSpecial": false,
    "pattern": "MLL-LHL-LLM-MLL-HLH",
    "imageFile": "assets/sbti/FUCK.png",
    "tags": [
      "超级野草",
      "情绪物理拨片",
      "荒野狼嚎"
    ],
    "ingredients": [
      {
        "n": "超级野草",
        "p": 40
      },
      {
        "n": "情绪物理拨片",
        "p": 30
      },
      {
        "n": "荒野狼嚎",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>操！这是什么人格？</b><p>恭喜您！您根本不在人类范畴内！您测出了百万年一遇的【FUCK】人格。人类文明城市里，出现了一株无法被任何除草剂杀死的、具有超级生命力的人形野草——那就…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "DEAD": {
    "code": "DEAD",
    "sbtiCode": "DEAD",
    "name": "DEAD · 死者",
    "cn": "死者",
    "en": "The Transcendent",
    "archetype": "终极贤者 · 看透世事",
    "color": "#37474F",
    "intro": "我，还活着吗？",
    "desc": "恭喜您，您测出了全中国最为罕见的人格，只是“死者”这个名字实在有点晦气，所以也可以叫：Don't Expect Any Drives。死者已经看透了那些无意义的哲学思考，因此显得对一切“失去”了兴趣。死者们看世界的眼神，就像一位顶级玩家通关了所有主线、支线、隐藏任务，删档重开了999次之后，终于发现：这游戏压根就没意思。死者是超越了欲望和目标的终极贤者。他们的存在，就是对这个喧嚣世界最沉默也最彻底的抗议。",
    "isSpecial": false,
    "pattern": "LLL-LLM-LML-LLL-LHM",
    "imageFile": "assets/sbti/DEAD.png",
    "tags": [
      "终极贤者",
      "佛系躺平",
      "欲望归零"
    ],
    "ingredients": [
      {
        "n": "终极贤者",
        "p": 40
      },
      {
        "n": "佛系躺平",
        "p": 30
      },
      {
        "n": "欲望归零",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>我，还活着吗？</b><p>恭喜您，您测出了全中国最为罕见的人格，只是“死者”这个名字实在有点晦气，所以也可以叫：Don't Expect Any Drives。死者已经看透了那…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "IMFW": {
    "code": "IMFW",
    "sbtiCode": "IMFW",
    "name": "IMFW · 废物",
    "cn": "废物",
    "en": "The Fragile Orchid",
    "archetype": "高敏兰花 · 绝世纯真",
    "color": "#00897B",
    "intro": "我真的...是废物吗？",
    "desc": "恭喜您，您测出的不是一个普通人格，您是一种极其珍稀的、仅占世界人口0.0001％的——【废物】。废物们的自尊通常有些脆弱，缺乏安全感，偶尔也会缺乏主见，因此这种人格能精确地感知到周围最强的那个 WiFi 信号——也就是他们心里最可靠的人。走进【废物】人格的生活，就像走进了一个顶级兰花温室：需要精确控制温度、湿度，以及每天定时进行“我爱你”的言语光合作用。给废物一颗糖，他们会还你一个完全信任你、亮晶晶的眼神。你未必是废物，你只是太没防备，太容易认真。",
    "isSpecial": false,
    "pattern": "LLH-LHL-LML-LLL-MLL",
    "imageFile": "assets/sbti/IMFW.png",
    "tags": [
      "兰花温室",
      "高敏雷达",
      "纯真易碎"
    ],
    "ingredients": [
      {
        "n": "兰花温室",
        "p": 40
      },
      {
        "n": "高敏雷达",
        "p": 30
      },
      {
        "n": "纯真易碎",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>我真的...是废物吗？</b><p>恭喜您，您测出的不是一个普通人格，您是一种极其珍稀的、仅占世界人口0.0001％的——【废物】。废物们的自尊通常有些脆弱，缺乏安全感，偶尔也会缺乏主见…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "HHHH": {
    "code": "HHHH",
    "sbtiCode": "HHHH",
    "name": "HHHH · 傻乐者",
    "cn": "傻乐者",
    "en": "The Laughing Void",
    "archetype": "宇宙级脑抽 · 傻乐兜底",
    "color": "#FDD835",
    "intro": "哈哈哈哈哈哈。",
    "desc": "恭喜您！由于您的思维回路过于清奇，标准人格库已全面崩溃。第一人格匹配率只有60％以下时，系统才会为您强制匹配这个人格——【HHHH - 傻乐者】。这个人格有什么特质？哈哈哈哈哈哈哈哈哈哈哈哈！对不起，这就是全部的特质了。您可以查看十五维度进行不专业的评估，实在是抱歉！作者设置人格时没有考虑全面，因此才会出现这样的状况。哈哈哈哈哈哈……笑着笑着，我便哭了出来。怎么会有人的脑回路这么新奇。",
    "isSpecial": true,
    "pattern": "",
    "imageFile": "assets/sbti/HHHH.png",
    "tags": [
      "脑回路崩溃",
      "哈哈哈哈",
      "系统强制兜底"
    ],
    "ingredients": [
      {
        "n": "脑回路崩溃",
        "p": 40
      },
      {
        "n": "哈哈哈哈",
        "p": 30
      },
      {
        "n": "系统强制兜底",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>哈哈哈哈哈哈。</b><p>恭喜您！由于您的思维回路过于清奇，标准人格库已全面崩溃。第一人格匹配率只有60％以下时，系统才会为您强制匹配这个人格——【HHHH - 傻乐者】。这个…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  },
  "DRUNK": {
    "code": "DRUNK",
    "sbtiCode": "DRUNK",
    "name": "DRUNK · 酒鬼",
    "cn": "酒鬼",
    "en": "The Drunken Poet",
    "archetype": "酒精信徒 · 保温杯白酒",
    "color": "#C2185B",
    "intro": "烈酒烧喉，不得不醉。",
    "desc": "您为什么走路摇摇晃晃？您为什么总是情绪高涨？您为什么看东西是重影的？因为您体内流淌的不是血液，是美味的五粮液！是国窖1573！是江小白！是陕西五粮液！哦，美味的白酒，每一滴都在燃烧，都在沸腾。您是否已经习惯了将白酒灌入保温杯，当作白开水一饮而下？多么伟大的白酒！它让您在饭桌上谈笑风生，在厕所里抱着马桶忏悔人生；它让您觉得自己是夜场诗人，是宇宙中心那团不灭的火，直到第二天上午十点，您的头像裂开的核桃，嘴角挂着食物残渣，灵魂缩在角落里。您终于明白，昨晚那个高谈阔论、拍桌怒吼的人，已经成为了一个酒鬼。",
    "isSpecial": true,
    "pattern": "",
    "imageFile": "assets/sbti/DRUNK.png",
    "tags": [
      "酒精接管",
      "保温杯灌白酒",
      "夜场大诗人"
    ],
    "ingredients": [
      {
        "n": "酒精接管",
        "p": 40
      },
      {
        "n": "保温杯灌白酒",
        "p": 30
      },
      {
        "n": "夜场大诗人",
        "p": 20
      },
      {
        "n": "纯天然人间烟火",
        "p": 10
      }
    ],
    "trio": {
      "shine": "<b>烈酒烧喉，不得不醉。</b><p>您为什么走路摇摇晃晃？您为什么总是情绪高涨？您为什么看东西是重影的？因为您体内流淌的不是血液，是美味的五粮液！是国窖1573！是江小白！是陕西五粮液！…</p>",
      "warn": "<b>过度消耗警报</b><p>小心精神电量见底，记得给自己留出与世界断联的私密缓冲带。</p>",
      "match": "<b>绝配精神病友</b><p>与理解你荒诞幽默感的灵魂频率共振，互相接梗不冷场。</p>"
    }
  }
};
const SBTI_IMAGES = {
  "ATM-er": "assets/sbti/ATM-er.webp",
  "BOSS": "assets/sbti/BOSS.webp",
  "CTRL": "assets/sbti/CTRL.webp",
  "DEAD": "assets/sbti/DEAD.webp",
  "DRUNK": "assets/sbti/DRUNK.webp",
  "Dior-s": "assets/sbti/Dior-s.webp",
  "FAKE": "assets/sbti/FAKE.webp",
  "FUCK": "assets/sbti/FUCK.webp",
  "GOGO": "assets/sbti/GOGO.webp",
  "HHHH": "assets/sbti/HHHH.webp",
  "IMFW": "assets/sbti/IMFW.webp",
  "IMSB": "assets/sbti/IMSB.webp",
  "JOKE-R": "assets/sbti/JOKE-R.webp",
  "LOVE-R": "assets/sbti/LOVE-R.webp",
  "MALO": "assets/sbti/MALO.webp",
  "MONK": "assets/sbti/MONK.webp",
  "MUM": "assets/sbti/MUM.webp",
  "OH-NO": "assets/sbti/OH-NO.webp",
  "OJBK": "assets/sbti/OJBK.webp",
  "POOR": "assets/sbti/POOR.webp",
  "SEXY": "assets/sbti/SEXY.webp",
  "SHIT": "assets/sbti/SHIT.webp",
  "SOLO": "assets/sbti/SOLO.webp",
  "THAN-K": "assets/sbti/THAN-K.webp",
  "THIN-K": "assets/sbti/THIN-K.webp",
  "WOC": "assets/sbti/WOC.webp",
  "ZZZZ": "assets/sbti/ZZZZ.webp",
  "WOC!": "assets/sbti/WOC.webp"
};

for (const k in PERSONAS_SBTI) {
  const p = PERSONAS_SBTI[k];
  if (!p.quote) p.quote = p.intro ? ('“' + p.intro + '”') : '';
  if (!p.shine && p.trio) p.shine = p.trio.shine;
  if (!p.warn && p.trio) p.warn = p.trio.warn;
  if (!p.match && p.trio) p.match = p.trio.match;
  if (SBTI_IMAGES[k]) p.imageFile = SBTI_IMAGES[k];
}

const QUESTIONS_SBTI = [...QUESTIONS_SBTI_MAIN, QUESTIONS_SBTI_SPECIAL[0]];

const MBTI_IMAGES = {
  "ENFJ": "assets/mbti/ENFJ.webp",
  "ENFP": "assets/mbti/ENFP.webp",
  "ENTJ": "assets/mbti/ENTJ.webp",
  "ENTP": "assets/mbti/ENTP.webp",
  "ESFJ": "assets/mbti/ESFJ.webp",
  "ESFP": "assets/mbti/ESFP.webp",
  "ESTJ": "assets/mbti/ESTJ.webp",
  "ESTP": "assets/mbti/ESTP.webp",
  "INFJ": "assets/mbti/INFJ.webp",
  "INFP": "assets/mbti/INFP.webp",
  "INTJ": "assets/mbti/INTJ.webp",
  "INTP": "assets/mbti/INTP.webp",
  "ISFJ": "assets/mbti/ISFJ.webp",
  "ISFP": "assets/mbti/ISFP.webp",
  "ISTJ": "assets/mbti/ISTJ.webp",
  "ISTP": "assets/mbti/ISTP.webp"
};


const AXES_DRINK = [
  {
    "key": "EI",
    "l": "外放气泡 (E)",
    "r": "内敛冰萃 (I)",
    "lK": "E",
    "rK": "I"
  },
  {
    "key": "SN",
    "l": "具象实感 (S)",
    "r": "抽象脑洞 (N)",
    "lK": "S",
    "rK": "N"
  },
  {
    "key": "TF",
    "l": "理性回甘 (T)",
    "r": "感性奶盖 (F)",
    "lK": "T",
    "rK": "F"
  },
  {
    "key": "JP",
    "l": "计划冰格 (J)",
    "r": "即兴摇晃 (P)",
    "lK": "J",
    "rK": "P"
  }
];

/* 四个维度的两极命名(MBTI 心理学测试) */
const AXES_MBTI = [
  {
    "key": "EI",
    "l": "外向表达 (E)",
    "r": "内向充能 (I)",
    "lK": "E",
    "rK": "I"
  },
  {
    "key": "SN",
    "l": "实感体验 (S)",
    "r": "直觉洞察 (N)",
    "lK": "S",
    "rK": "N"
  },
  {
    "key": "TF",
    "l": "理性逻辑 (T)",
    "r": "感性共情 (F)",
    "lK": "T",
    "rK": "F"
  },
  {
    "key": "JP",
    "l": "计划秩序 (J)",
    "r": "即兴弹性 (P)",
    "lK": "J",
    "rK": "P"
  }
];

// (SBTI uses 15 dimensions evaluated via Manhattan distance)

/* ============================================================
   16 种饮料人格档案 (专用于饮料人格测试)
   ============================================================ */
const PERSONAS_DRINK = {
  "ESTP": {
    "name": "爆珠可乐",
    "en": "Explosive Cola",
    "color": "#FF5A5F",
    "tags": [
      "派对心脏",
      "行动派",
      "抗压能力 MAX"
    ],
    "desc": "你是人群里那瓶一开盖就「呲——」的可乐：反应快、胆子大、气氛永远由你点燃。别人还在权衡，你已经上手试了三遍。规则对你只是参考答案，刺激和即时反馈才是你的燃料。",
    "ingredients": [
      {
        "n": "气泡冲击",
        "p": 35
      },
      {
        "n": "冒险精神",
        "p": 30
      },
      {
        "n": "快乐因子",
        "p": 25
      },
      {
        "n": "冰块冷静",
        "p": 10
      }
    ],
    "shine": "危机现场你最稳，天生的破冰高手和救火队员，执行力快到让人放心。",
    "warn": "太追求即时爽感，容易被「麻烦但重要」的事劝退；偶尔收着点气泡，让耐心上桌。",
    "match": "INFJ 桂花乌龙——你的炸场气泡，刚好需要一点温柔的回甘来落座。",
    "quote": "「人生这瓶可乐，摇一摇才够劲。」"
  },
  "ESTJ": {
    "name": "冰美式",
    "en": "Iced Americano",
    "color": "#8A6B4D",
    "tags": [
      "行走的掌柜",
      "靠谱本谱",
      "原则如铁"
    ],
    "desc": "你是一杯不加糖的冰美式：入口提神，回味可靠。事情交到你手上就是上了保险——目标明确、流程清晰、说到做到。你不喜欢模糊地带，清清楚楚才让你安心。",
    "ingredients": [
      {
        "n": "咖啡因执行率",
        "p": 40
      },
      {
        "n": "秩序感",
        "p": 30
      },
      {
        "n": "责任浓缩液",
        "p": 20
      },
      {
        "n": "冰块克制",
        "p": 10
      }
    ],
    "shine": "团队的天花板担当：你定的标准，别人直接抄作业。",
    "warn": "对自己太狠，对流程太较真；偶尔把「效率」换成一杯奶茶的甜，你会更受欢迎。",
    "match": "ENFP 满杯水果茶——你的秩序感，需要一点不受控的果肉来松动。",
    "quote": "「效率是最好的礼貌。」"
  },
  "ESFP": {
    "name": "芒果冰沙",
    "en": "Mango Smoothie",
    "color": "#FFA726",
    "tags": [
      "氛围组台柱",
      "人间小太阳",
      "活在当下"
    ],
    "desc": "你是一杯现打的芒果冰沙：浓郁、鲜活、甜得毫无负担。你的快乐会自动外溢，走到哪儿，哪儿的灯就亮一档。你不爱想太远，因为眼前这一口已经足够好喝。",
    "ingredients": [
      {
        "n": "果肉热情",
        "p": 35
      },
      {
        "n": "即兴表演欲",
        "p": 30
      },
      {
        "n": "甜度满分",
        "p": 25
      },
      {
        "n": "碎冰俏皮",
        "p": 10
      }
    ],
    "shine": "天生的气氛雷达，能第一时间发现谁不开心，并用一支舞的时间解决。",
    "warn": "兴头来得快去得也快，无聊的事容易滑走；给热爱装个保温杯，别让它化太快。",
    "match": "INTJ 手冲单品——你的果肉甜，刚好软化那杯过于清醒的苦。",
    "quote": "「快乐要现打现喝，过冰不候。」"
  },
  "ESFJ": {
    "name": "三分糖珍珠奶茶",
    "en": "Brown Sugar Milk Tea",
    "color": "#C68B59",
    "tags": [
      "全员充电宝",
      "团魂本魂",
      "细节暖手"
    ],
    "desc": "你是那杯三分糖的珍珠奶茶：甜得恰到好处，谁捧着都舒服。你记得每个人的口味，关心谁没吃到饭，聚会的你、生日会的主角、深夜的倾听者，常常是同一个人——你。",
    "ingredients": [
      {
        "n": "共情奶基",
        "p": 35
      },
      {
        "n": "责任感 Q 弹",
        "p": 30
      },
      {
        "n": "细节糖分",
        "p": 25
      },
      {
        "n": "珍珠耐心",
        "p": 10
      }
    ],
    "shine": "把每个人都照顾到位的隐形操盘手，团队凝聚力一半是你煮的。",
    "warn": "太会照顾人，常常忘了自己也需要被照顾；学会说「我不行」，不会掉粉。",
    "match": "INTP 冷萃黑咖——你负责温柔加糖，TA 负责让你慢下来想点远的。",
    "quote": "「甜度三分，用心十分。」"
  },
  "ENTP": {
    "name": "酸梅气泡水",
    "en": "Sour Plum Fizz",
    "color": "#9B59B6",
    "tags": [
      "鬼马军师",
      "嘴强王者",
      "反套路先锋"
    ],
    "desc": "你是一杯酸梅气泡水：酸得机灵，气得通透，一口下去整个人清醒三分。你的大脑永远在后台运行「换一种玩法」，抬杠不是抬杠，是给世界做压力测试。",
    "ingredients": [
      {
        "n": "脑洞气泡",
        "p": 35
      },
      {
        "n": "辩论酸度",
        "p": 30
      },
      {
        "n": "机敏气泡糖",
        "p": 25
      },
      {
        "n": "自由气泡",
        "p": 10
      }
    ],
    "shine": "点子比谁都多，死局到你手里总能拐出一条新路。",
    "warn": "口才太好容易赢下辩论、输掉氛围；偶尔收枪，让别人的想法飞一会儿。",
    "match": "ISTJ 无糖乌龙——你的酸，需要 TA 的稳来兑水。",
    "quote": "「规则？先问问它敢不敢被我推翻。」"
  },
  "ENTJ": {
    "name": "双份浓缩",
    "en": "Double Espresso",
    "color": "#4E342E",
    "tags": [
      "天生掌舵人",
      "目标制导",
      "狠人美学"
    ],
    "desc": "你是一杯双份浓缩：小杯，但后劲巨大。你的字典里没有「随便」，只有「目标、路径、执行」。别人休息时你在赶路，别人赶路时你已经在画下一张地图。",
    "ingredients": [
      {
        "n": "野心浓缩",
        "p": 40
      },
      {
        "n": "决断咖啡因",
        "p": 30
      },
      {
        "n": "战略油脂",
        "p": 20
      },
      {
        "n": "苦味自律",
        "p": 10
      }
    ],
    "shine": "长期主义的坚定执行者，你能把「不可能」排进日程表并准时完成。",
    "warn": "节奏太快容易甩下同行的人；记得回头等一等，山顶的风景要有人分享才够味。",
    "match": "ISFP 抹茶拿铁——你的浓烈，需要 TA 的温柔拉花来中和。",
    "quote": "「方向有了，剩下的只是执行。」"
  },
  "ENFP": {
    "name": "满杯水果茶",
    "en": "Full-Cup Fruit Tea",
    "color": "#FF7043",
    "tags": [
      "快乐永动机",
      "热忱开罐器",
      "兴趣广泛"
    ],
    "desc": "你是一杯满杯水果茶：料多、鲜活、五颜六色，喝的人不知道先咬哪一口，你自己也不知道下一个热情会砸在哪。你相信世界很大、人很好玩、明天总有新副本。",
    "ingredients": [
      {
        "n": "热情果肉",
        "p": 35
      },
      {
        "n": "好奇心气泡",
        "p": 30
      },
      {
        "n": "共情甜度",
        "p": 25
      },
      {
        "n": "跳跃维 C",
        "p": 10
      }
    ],
    "shine": "你的热忱会传染，被你鼓励过的人，真的会去试一试。",
    "warn": "开坑一时爽，收尾火葬场；把「想做的 100 件」砍到「正在做的 3 件」，你会发光得更久。",
    "match": "INFJ 桂花乌龙——你是 TA 的果肉，TA 是你的回甘。",
    "quote": "「人生是自助餐，我全都要一点。」"
  },
  "ENFJ": {
    "name": "蜂蜜柚子茶",
    "en": "Honey Yuzu Tea",
    "color": "#F4B942",
    "tags": [
      "温柔发动机",
      "人生导师预备役",
      "暖而不烫"
    ],
    "desc": "你是一杯蜂蜜柚子茶：微苦回甘，暖得刚刚好，是冬夜玻璃杯里的小太阳。你总能看出别人没说出口的那句话，并且知道什么时候递台阶、什么时候递纸巾。",
    "ingredients": [
      {
        "n": "共情蜂蜜",
        "p": 35
      },
      {
        "n": "理想柚香",
        "p": 30
      },
      {
        "n": "鼓励维生素",
        "p": 25
      },
      {
        "n": "微苦清醒",
        "p": 10
      }
    ],
    "shine": "把「相信你」说进人心里的能力，是你的超能力。",
    "warn": "把别人的课题背在自己身上，会累垮的；先给自己倒一杯，再去暖别人。",
    "match": "INTP 冷萃黑咖——你的甜让 TA 出圈，TA 的冷让你清醒。",
    "quote": "「先温暖世界，也别忘了自己那杯。」"
  },
  "ISTP": {
    "name": "冰镇苏打",
    "en": "Chilled Soda",
    "color": "#4FC3F7",
    "tags": [
      "冷面实操王",
      "少说多做",
      "危机淡定侠"
    ],
    "desc": "你是一杯冰镇苏打：清冽、利落、不甜腻，一口下去燥热全消。话不多，但手很稳——东西坏了你修，场面冷了你撤，危机来了你反而格外平静。",
    "ingredients": [
      {
        "n": "冷静气泡",
        "p": 35
      },
      {
        "n": "动手能力",
        "p": 30
      },
      {
        "n": "极简矿泉",
        "p": 25
      },
      {
        "n": "自由气泡",
        "p": 10
      }
    ],
    "shine": "关键时刻的一只稳手：你不在群里说话时，都在默默解决问题。",
    "warn": "太习惯独自消化，别人会以为你不需要；偶尔开盖放气，让在乎的人进来。",
    "match": "ENFJ 蜂蜜柚子茶——你的冰需要一点暖柚来化，TA 的暖需要你的稳来托。",
    "quote": "「能动手的，尽量别吵吵。」"
  },
  "ISTJ": {
    "name": "无糖乌龙",
    "en": "Sugar-Free Oolong",
    "color": "#6D8B3D",
    "tags": [
      "人形日程表",
      "沉默的靠谱",
      "细节海关"
    ],
    "desc": "你是一杯无糖乌龙：不甜、不炸、不花哨，但解腻、解渴、越喝越离不开。你的世界有一套隐形秩序：答应的事一定做到，说好的时间一分不差。",
    "ingredients": [
      {
        "n": "纪律茶多酚",
        "p": 40
      },
      {
        "n": "责任回甘",
        "p": 30
      },
      {
        "n": "细节滤网",
        "p": 20
      },
      {
        "n": "低调茶底",
        "p": 10
      }
    ],
    "shine": "你是团队的定海神针，守诺程度堪比银行金库。",
    "warn": "变化会让你难受，但偶尔，计划外的窗外也有好风景。",
    "match": "ENTP 酸梅气泡水——TA 负责冒泡，你负责把瓶盖拧稳。",
    "quote": "「凡事有交代，件件有着落。」"
  },
  "ISFP": {
    "name": "抹茶拿铁",
    "en": "Matcha Latte",
    "color": "#7CB342",
    "tags": [
      "慢炖艺术家",
      "温柔有骨",
      "氛围感本人"
    ],
    "desc": "你是一杯抹茶拿铁：温润、细腻、配色高级，连沉默都是好看的。你不太争，但心里有一套自己的审美和底线——平时像云，踩到底线时像山。",
    "ingredients": [
      {
        "n": "审美抹茶",
        "p": 35
      },
      {
        "n": "温柔奶盖",
        "p": 30
      },
      {
        "n": "安静观察",
        "p": 25
      },
      {
        "n": "底线茶涩",
        "p": 10
      }
    ],
    "shine": "你总能在平凡日子里发现美的切片，并把它留在照片、穿搭和字里行间。",
    "warn": "不喜欢的事容易拖着不说，积到临界再一起爆炸；小事也请及时表达。",
    "match": "ENTJ 双份浓缩——TA 带你走快一点，你教 TA 慢下来看看花。",
    "quote": "「温柔是我的底色，不是我的软弱。」"
  },
  "ISFJ": {
    "name": "热牛奶",
    "en": "Warm Milk",
    "color": "#F5D7A1",
    "tags": [
      "睡前拥抱担当",
      "无声守护者",
      "记忆守望者"
    ],
    "desc": "你是一杯温热的牛奶：不抢戏、不刺激，但每个疲惫的深夜都需要你。你把关心做成日常：提醒带伞、留好座位、记住别人随口提过的忌口。",
    "ingredients": [
      {
        "n": "暖心乳脂",
        "p": 35
      },
      {
        "n": "记忆糖蛋白",
        "p": 30
      },
      {
        "n": "耐心恒温",
        "p": 25
      },
      {
        "n": "安睡因子",
        "p": 10
      }
    ],
    "shine": "你记得的小事，构成了别人心里的大事——这世上最贵的就是这种稳定的爱。",
    "warn": "付出不求回报是你，委屈不说也是你；偶尔把「我想要」大声讲出来。",
    "match": "ESTP 爆珠可乐——TA 负责带你冒险，你负责在终点放一杯温水。",
    "quote": "「我没什么大梦想，就想让你们好好的。」"
  },
  "INTP": {
    "name": "冷萃黑咖",
    "en": "Cold Brew",
    "color": "#37474F",
    "tags": [
      "佛系观察员",
      "十万个为什么",
      "精神世界巨富"
    ],
    "desc": "你是一杯 12 小时冷萃：低温慢出，清醒到底，苦得有层次。你不太关心热搜，但非常关心「这世界到底是怎么运转的」。社交耗电，思考回血。",
    "ingredients": [
      {
        "n": "逻辑咖啡因",
        "p": 40
      },
      {
        "n": "好奇心冷萃",
        "p": 30
      },
      {
        "n": "抽离气泡",
        "p": 20
      },
      {
        "n": "散漫回甘",
        "p": 10
      }
    ],
    "shine": "别人绕不过去的问题，你能在脑子里拆成零件再装回去。",
    "warn": "想得太远容易动得太晚；60 分的实践，胜过 100 分的空想。",
    "match": "ESFJ 珍珠奶茶——TA 把你从脑子里捞出来吃人间烟火。",
    "quote": "「我不是高冷，我只是在线下飞行模式。」"
  },
  "INTJ": {
    "name": "手冲单品",
    "en": "Pour-Over Single Origin",
    "color": "#263238",
    "tags": [
      "深海策略家",
      "低社交高续航",
      "标准极严"
    ],
    "desc": "你是一杯手冲单品：水温、粉比、时间都有讲究，喝的就是一个「清醒的秩序感」。你的社交安静而挑剔——不是不合群，是圈层自带滤镜。",
    "ingredients": [
      {
        "n": "战略咖啡因",
        "p": 35
      },
      {
        "n": "独立萃取",
        "p": 30
      },
      {
        "n": "远见风味",
        "p": 25
      },
      {
        "n": "挑剔酸质",
        "p": 10
      }
    ],
    "shine": "你看得到三步之后的棋，提前把路铺在别人看不见的地方。",
    "warn": "标准太高容易孤立自己；把「我可以」换成「我们一起」，胜率反而更高。",
    "match": "ESFP 芒果冰沙——TA 让你尝到即兴的甜，你让 TA 的甜有地方落。",
    "quote": "「我不怕慢，我只怕方向错了。」"
  },
  "INFP": {
    "name": "薄荷奶绿",
    "en": "Mint Green Milk",
    "color": "#81C784",
    "tags": [
      "白日梦收藏家",
      "嘴笨心软",
      "内心宇宙辽阔"
    ],
    "desc": "你是一杯薄荷奶绿：清爽里藏着温柔，温柔里藏着一片海。表面岁月静好，脑内每天上演史诗连续剧。你对世界的善意很认真，对不公平的事，心里门儿清。",
    "ingredients": [
      {
        "n": "幻想薄荷",
        "p": 35
      },
      {
        "n": "共情奶绿",
        "p": 30
      },
      {
        "n": "理想主义糖浆",
        "p": 25
      },
      {
        "n": "敏感气泡",
        "p": 10
      }
    ],
    "shine": "你的真诚在这个速食时代非常稀有——被你认定的人，会被稳稳放在心上。",
    "warn": "情绪内耗是你的隐藏 BOSS；把心里的戏拍出来(写、画、说)，别一个人消化。",
    "match": "ESTJ 冰美式——TA 帮你把梦排进日程，你帮 TA 把日程过成生活。",
    "quote": "「我话不多，但我心里的字数超了八百万。」"
  },
  "INFJ": {
    "name": "桂花乌龙",
    "en": "Osmanthus Oolong",
    "color": "#B08D57",
    "tags": [
      "深海温柔",
      "读心嘉宾",
      "外冷内烫"
    ],
    "desc": "你是一杯桂花乌龙：初见清冷，细品全是香气。你能一瞬间读懂气氛和人心，却很少说破；看起来疏离，实际上把在乎的人看得比谁都重。",
    "ingredients": [
      {
        "n": "洞察茶底",
        "p": 35
      },
      {
        "n": "温柔桂花",
        "p": 30
      },
      {
        "n": "理想回甘",
        "p": 25
      },
      {
        "n": "神秘乌龙",
        "p": 10
      }
    ],
    "shine": "你给出的每一句「我懂」，都是精准投放；和你深聊过的人都会记住你。",
    "warn": "太容易替别人难过，也太容易把门关上；试着让信任先走一步。",
    "match": "ENFP 满杯水果茶——TA 的热闹敲开你的门，你的深沉留住 TA 的光。",
    "quote": "「我不常见你，但我一直看得见你。」"
  }
};

/* ============================================================
   16 型标准 MBTI 人格档案 (用于 Short Form / Form M / Form Q)
   ============================================================ */
const PERSONAS_MBTI = {
  "INTJ": {
    "name": "建筑师 · 战略家",
    "en": "The Architect",
    "color": "#37474F",
    "tags": [
      "深谋远虑",
      "底层逻辑",
      "终身进化"
    ],
    "desc": "你拥有极敏锐的洞察力与严谨的系统思维。你习惯站在未来审视现在，擅长在复杂混乱中提炼核心规律。你对无意义的社交保持克制，但在自己的认知领地里，有着近乎完美的执着追求与执行力。",
    "ingredients": [
      {
        "n": "战略规划",
        "p": 35
      },
      {
        "n": "独立理性",
        "p": 30
      },
      {
        "n": "底层洞察",
        "p": 25
      },
      {
        "n": "完美标准",
        "p": 10
      }
    ],
    "shine": "你看得到三步之外的棋局，能在复杂局面中快速厘清最优路径并坚定执行。",
    "warn": "容易对低效他人失去耐心；学会给予协作伙伴适度试错空间会让推进更顺畅。",
    "match": "ENFP 竞选者 / ENTP 辩论家 —— 灵感碰撞与完美执行的最佳拍档。",
    "quote": "「我不怕慢，我只怕方向偏离了本质。」"
  },
  "INTP": {
    "name": "逻辑学家 · 思想家",
    "en": "The Logician",
    "color": "#3949AB",
    "tags": [
      "逻辑解构狂",
      "头脑宇宙",
      "真理探索"
    ],
    "desc": "你的大脑是一座永不停歇的思想实验室。你痴迷于事物背后的运行机理与抽象概念，擅长发现隐蔽的逻辑漏洞并重构体系。对于繁文缛节毫不在意，只对纯粹的智慧与规律保持敬畏。",
    "ingredients": [
      {
        "n": "逻辑推演",
        "p": 35
      },
      {
        "n": "概念重构",
        "p": 30
      },
      {
        "n": "求知探索",
        "p": 25
      },
      {
        "n": "去伪存真",
        "p": 10
      }
    ],
    "shine": "你能一针见血地看穿假象与逻辑硬伤，提供颠覆性的全新认知视角与解决方案。",
    "warn": "容易陷入过度分析导致的行动瘫痪；先完成再完美，胜过无止境的理论推演。",
    "match": "ENTJ 指挥官 / ENFJ 主人公 —— 理论落地与行动驱动的绝佳互补。",
    "quote": "「不要只告诉我结论，告诉我它底层为什么是这样。」"
  },
  "ENTJ": {
    "name": "指挥官 · 统帅",
    "en": "The Commander",
    "color": "#C62828",
    "tags": [
      "天生统帅",
      "目标导向",
      "破局执行"
    ],
    "desc": "你具有强大的战略眼光与果决的领导魄力。对你而言，障碍就是用来跨越的，目标就是用来达成的。你擅长整合一切可用资源，带领团队以最高的效率直击核心结果。",
    "ingredients": [
      {
        "n": "决断统御",
        "p": 35
      },
      {
        "n": "宏观视野",
        "p": 30
      },
      {
        "n": "执行推进",
        "p": 25
      },
      {
        "n": "竞争意志",
        "p": 10
      }
    ],
    "shine": "在迷雾与危机中总能稳定大局，迅速制定明确方向并带领全员打赢硬仗。",
    "warn": "过分关注结果可能忽视伙伴的情感体验；适时的倾听是更高级的领导力。",
    "match": "INTP 逻辑学家 / INFP 调停者 —— 理性共鸣与情感温润的完美平衡。",
    "quote": "「没有解决不了的困局，只有不够清晰的推进路径。」"
  },
  "ENTP": {
    "name": "辩论家 · 远见者",
    "en": "The Debater",
    "color": "#EF6C00",
    "tags": [
      "思维冲浪手",
      "敏锐机智",
      "颠覆常规"
    ],
    "desc": "你拥有极度活跃的头脑与旺盛的求知欲。你讨厌教条与刻板规则，热爱挑战既定观念。对你而言，思维的火花碰撞就是最顶级的乐趣，随时都能提出意想不到的颠覆性新解法。",
    "ingredients": [
      {
        "n": "发散创意",
        "p": 35
      },
      {
        "n": "机智敏捷",
        "p": 30
      },
      {
        "n": "破局反思",
        "p": 25
      },
      {
        "n": "幽默锋芒",
        "p": 10
      }
    ],
    "shine": "打破僵局的高手，擅长将跨领域的概念奇妙组合，催生突破性的创新机遇。",
    "warn": "对新鲜事物的热爱容易导致后劲不足；学会在最有价值的赛道上持续深耕。",
    "match": "INFJ 提倡者 / INTJ 建筑师 —— 灵魂共振与深度思想的无缝共鸣。",
    "quote": "「规则是用来理解规律的，也是用来被更优解超越的。」"
  },
  "INFJ": {
    "name": "提倡者 · 引路人",
    "en": "The Advocate",
    "color": "#00695C",
    "tags": [
      "深邃洞察",
      "灵魂共情",
      "坚定信念"
    ],
    "desc": "稀有而深刻的理想主义者。你外表温和沉静，内心却燃烧着对人性与意义的执着追求。你能轻易感知他人的情绪波动与潜台词，始终追寻能够让世界变得更美好的精神价值。",
    "ingredients": [
      {
        "n": "直觉洞察",
        "p": 35
      },
      {
        "n": "人文共情",
        "p": 30
      },
      {
        "n": "理想信念",
        "p": 25
      },
      {
        "n": "内在定力",
        "p": 10
      }
    ],
    "shine": "拥有触及心灵的深刻同理心与远见，能在精神层面给予他人巨大的定力与方向。",
    "warn": "容易因过度吸收他人的负能量而身心疲惫；记得给自己建立一道健康的精神边界。",
    "match": "ENTP 辩论家 / ENFP 竞选者 —— 懂你深邃的知己与点亮灵魂的火花。",
    "quote": "「我不常见你，但我一直注视着光明的方向。」"
  },
  "INFP": {
    "name": "调停者 · 治愈家",
    "en": "The Mediator",
    "color": "#2E7D32",
    "tags": [
      "内心辽阔",
      "真诚治愈",
      "理想主义"
    ],
    "desc": "你拥有一座辽阔而细腻的内心宇宙。你极为珍视真实、善良与内在价值准则，对世间万物抱有温柔的同理心。虽然不喜喧嚣，但灵魂深处始终保留着纯粹的诗意与对自由的向往。",
    "ingredients": [
      {
        "n": "纯真共情",
        "p": 35
      },
      {
        "n": "价值坚守",
        "p": 30
      },
      {
        "n": "艺术直觉",
        "p": 25
      },
      {
        "n": "温柔善意",
        "p": 10
      }
    ],
    "shine": "你的真诚在这个时代非常稀有——被你认定的人，会被稳稳放在最温柔的心底。",
    "warn": "容易陷入情绪内耗；试着把心中的丰富世界用行动或创作表达出来，别一个人消化。",
    "match": "ENFJ 主人公 / ENTJ 指挥官 —— 珍视你的纯粹，带你看遍广阔世界。",
    "quote": "「即便世界喧嚣纷扰，我依然坚守内心的温柔与真实。」"
  },
  "ENFJ": {
    "name": "主人公 · 导师",
    "en": "The Protagonist",
    "color": "#D84315",
    "tags": [
      "天生感召力",
      "温暖灯塔",
      "赋能他人"
    ],
    "desc": "你拥有极强的人格魅力与同理心。你真心实意地关怀身边的每一个人，擅长发掘他人的闪光点并激励他们成为更好的自己。你是群体中的凝聚纽带，总能把大家引向充满希望的未来。",
    "ingredients": [
      {
        "n": "同理共鸣",
        "p": 35
      },
      {
        "n": "感召领导",
        "p": 30
      },
      {
        "n": "团队赋能",
        "p": 25
      },
      {
        "n": "真诚奉献",
        "p": 10
      }
    ],
    "shine": "卓越的沟通与激励能力，能把分散的个体凝聚成充满信念与战斗力的团队。",
    "warn": "容易背负过多他人的期待与责任；学会适度放手，照顾好自己的精力。",
    "match": "INFP 调停者 / INTP 逻辑学家 —— 深度的情感互信与知己般的默契。",
    "quote": "「点亮他人的同时，自己的世界也会充满光芒。」"
  },
  "ENFP": {
    "name": "竞选者 · 追光者",
    "en": "The Campaigner",
    "color": "#F57F17",
    "tags": [
      "快乐永动机",
      "灵感捕手",
      "热爱自由"
    ],
    "desc": "你是一个充满生命力与热忱的自由灵魂。你把人生看作一场充满惊喜的探险，对新鲜事物永远保持着旺盛的探索欲。你的笑容和感染力能瞬间点亮任何灰暗沉闷的角落。",
    "ingredients": [
      {
        "n": "灵感热情",
        "p": 35
      },
      {
        "n": "社交引力",
        "p": 30
      },
      {
        "n": "直觉敏锐",
        "p": 25
      },
      {
        "n": "自由渴望",
        "p": 10
      }
    ],
    "shine": "拥有极强的创造力与亲和力，能把枯燥的事情变得生动有趣，感染身边所有人。",
    "warn": "容易因兴趣广泛而分散注意力；为真正热爱的事设立清晰阶段目标并坚持到底。",
    "match": "INTJ 建筑师 / INFJ 提倡者 —— 稳住你的漂泊，点亮 TA 的世界。",
    "quote": "「人生是一片广阔的原野，每一天都值得热烈地奔跑。」"
  },
  "ISTJ": {
    "name": "物流师 · 严守者",
    "en": "The Logistician",
    "color": "#455A64",
    "tags": [
      "靠谱天花板",
      "严谨守则",
      "秩序基石"
    ],
    "desc": "你是现实生活最值得信赖的定海神针。你讲究事实、注重细节、严守承诺，做事实事求是、井井有条。答应别人的事必定兑现，用踏实与稳健构筑起不可动摇的信誉基石。",
    "ingredients": [
      {
        "n": "责任守诺",
        "p": 35
      },
      {
        "n": "严谨细致",
        "p": 30
      },
      {
        "n": "稳健秩序",
        "p": 25
      },
      {
        "n": "务实求真",
        "p": 10
      }
    ],
    "shine": "极强的稳定性与执行力，在别人手忙脚乱时，你依然能条理分明把事情做到极致。",
    "warn": "过于依赖旧经验可能对新变化产生抵触；适度拥抱一些不确定性会带来新惊喜。",
    "match": "ESFP 表演家 / ESTP 实践家 —— 带来欢声笑语，打破单调与刻板。",
    "quote": "「言出必行，脚踏实地，是对生活最大的诚意。」"
  },
  "ISFJ": {
    "name": "守卫者 · 守护天使",
    "en": "The Defender",
    "color": "#5D4037",
    "tags": [
      "温暖坚实",
      "细致周到",
      "默默守望"
    ],
    "desc": "你是生活中最温厚可靠的守护者。你记忆力极佳，能记住朋友每一个微小的习惯与喜好。你不争不抢，总是默默承担责任、照顾大家，用最朴素细致的关怀让身边的人安心。",
    "ingredients": [
      {
        "n": "细致关照",
        "p": 35
      },
      {
        "n": "忠诚踏实",
        "p": 30
      },
      {
        "n": "同理温润",
        "p": 25
      },
      {
        "n": "责任担当",
        "p": 10
      }
    ],
    "shine": "无微不至的关照力与极高的责任感，只要有你在身边，后方永远井然有序。",
    "warn": "不习惯拒绝别人，容易把委屈憋在心里；勇敢说出自己的需求，并不会破坏关系。",
    "match": "ESFJ 执政官 / ESTJ 总经理 —— 彼此深知责任与付出的珍贵，稳稳相伴。",
    "quote": "「生活由细节组成，而我愿意默默守护每一个平凡的幸福。」"
  },
  "ESTJ": {
    "name": "总经理 · 执行官",
    "en": "The Executive",
    "color": "#1565C0",
    "tags": [
      "高效推进",
      "秩序法则",
      "铁血执行"
    ],
    "desc": "你是天生的规则捍卫者与项目推进器。你讲求逻辑、事实与效率，面对混乱局面你能迅速建立秩序与标准流程。言行一致、雷厉风行，是团队中最不可或缺的中流砥柱。",
    "ingredients": [
      {
        "n": "组织管理",
        "p": 35
      },
      {
        "n": "流程规划",
        "p": 30
      },
      {
        "n": "务实决断",
        "p": 25
      },
      {
        "n": "原则坚守",
        "p": 10
      }
    ],
    "shine": "将复杂混乱的目标拆解为清晰的执行步骤并高速落地，成果转化能力极强。",
    "warn": "容易显得过于严苛和就事论事；在追求效率的同时，多照顾团队成员的情绪感受。",
    "match": "ISFP 探险家 / ISTP 鉴赏家 —— 互补柔化锋芒，共同实现务实成果。",
    "quote": "「做好规划，严格落实，好的结果自会水到渠成。」"
  },
  "ESFJ": {
    "name": "执政官 · 东道主",
    "en": "The Consul",
    "color": "#AD1457",
    "tags": [
      "社交黏合剂",
      "热情周到",
      "集体荣誉"
    ],
    "desc": "你是大家心目中最暖心的聚会灵魂。你拥有极高的情商与社交敏锐度，时刻关注每个人的情绪与需求。你热爱集体、维护和谐，总能把任何团队与聚会打理得宾至如归。",
    "ingredients": [
      {
        "n": "社交关怀",
        "p": 35
      },
      {
        "n": "共情敏锐",
        "p": 30
      },
      {
        "n": "协调凝聚",
        "p": 25
      },
      {
        "n": "热情奉献",
        "p": 10
      }
    ],
    "shine": "极强的群体维系力与社交智慧，能迅速化解人际隔阂，创造充满温情的凝聚力。",
    "warn": "容易因别人的冷淡或否定而陷入自我怀疑；将认同感立足于内心，而非他人评价。",
    "match": "ISFJ 守卫者 / ISTJ 物流师 —— 彼此理解付出，温情长久。",
    "quote": "「让身边的每一个人都感受到被爱与被重视，是我的幸福。」"
  },
  "ISTP": {
    "name": "鉴赏家 · 巧匠",
    "en": "The Virtuoso",
    "color": "#4E342E",
    "tags": [
      "硬核酷客",
      "临危不乱",
      "动手破局"
    ],
    "desc": "你是冷静务实的现实手艺人。你喜欢探索现实工具、机械与现实系统的运作原理。面对突发危机，你能瞬间抛开情绪、冷静分析并迅速动手排障。话不多，但出手必定见真章。",
    "ingredients": [
      {
        "n": "实战拆解",
        "p": 35
      },
      {
        "n": "应急破局",
        "p": 30
      },
      {
        "n": "冷静理性",
        "p": 25
      },
      {
        "n": "自由独立",
        "p": 10
      }
    ],
    "shine": "临危处置能力极强，遇事不慌，能用最精炼直接的方式迅速搞定棘手技术难题。",
    "warn": "有时显得过于疏离、不喜沟通承诺；适度表达自己的想法会让在乎你的人更安心。",
    "match": "ESTJ 总经理 / ESFJ 执政官 —— 行动力极强，互补协作的高效搭档。",
    "quote": "「少说多做，真正的问题要在行动中被解决。」"
  },
  "ISFP": {
    "name": "探险家 · 艺术家",
    "en": "The Adventurer",
    "color": "#00897B",
    "tags": [
      "美学感知",
      "随性自在",
      "温柔真我"
    ],
    "desc": "你用感官和心灵体验这个世界。你拥有敏锐的美感与艺术触觉，讨厌被条条框框束缚。为人谦逊随和、内心炽热，喜欢在自己的节奏里探索生活的美好与未知。",
    "ingredients": [
      {
        "n": "美感直觉",
        "p": 35
      },
      {
        "n": "当下感知",
        "p": 30
      },
      {
        "n": "随性温和",
        "p": 25
      },
      {
        "n": "真我表达",
        "p": 10
      }
    ],
    "shine": "出众的审美力与真诚随和的气质，能给身处内卷的人带来舒缓治愈的松弛感。",
    "warn": "面对冲突习惯回避，对未来规划容易随缘；适时为关键目标定下明确的时间节点。",
    "match": "ESFJ 执政官 / ESTJ 总经理 —— 为你的随性带来踏实稳定的方向感。",
    "quote": "「活在当下，体验每一刻真实的心跳与色彩。」"
  },
  "ESTP": {
    "name": "实践家 · 破局者",
    "en": "The Entrepreneur",
    "color": "#D84315",
    "tags": [
      "临场之王",
      "无畏冒险",
      "行动派"
    ],
    "desc": "你是充满活力的现场行动家。你讨厌理论空谈，偏爱真实的碰撞与实战。你具备极快的临场反应和敏锐的现实嗅觉，敢于冒险、敢为人先，走到哪里都是行动的核心焦点。",
    "ingredients": [
      {
        "n": "临场决断",
        "p": 35
      },
      {
        "n": "冒险魄力",
        "p": 30
      },
      {
        "n": "观察敏锐",
        "p": 25
      },
      {
        "n": "实用主义",
        "p": 10
      }
    ],
    "shine": "出色的临场发挥与危机破局力，能在逆境中瞬间抓住转瞬即逝的商机与突破口。",
    "warn": "容易因一时冲动而忽略长远风险；在迈出大步之前稍微留两秒复盘。",
    "match": "ISFJ 守卫者 / ISTJ 物流师 —— 互为底线与先锋，攻守兼备。",
    "quote": "「不要纸上谈兵，下场一试便知胜负。」"
  },
  "ESFP": {
    "name": "表演家 · 聚光者",
    "en": "The Entertainer",
    "color": "#E91E63",
    "tags": [
      "天生主角",
      "即兴感染",
      "能量光芒"
    ],
    "desc": "你是把生活过成秀场的天生主角。你充满热情、善于逗乐，拥有极强的感染力。只要你在场，气氛就永远不会冷清。你全情投入当下的每一分每一秒，将欢乐播撒给所有人。",
    "ingredients": [
      {
        "n": "舞台魅力",
        "p": 35
      },
      {
        "n": "即兴感染",
        "p": 30
      },
      {
        "n": "当下享乐",
        "p": 25
      },
      {
        "n": "真诚坦率",
        "p": 10
      }
    ],
    "shine": "天生的情绪调节大师，能瞬间打破尴尬与沉闷，让每个人都感受到生活的热烈。",
    "warn": "容易逃避枯燥的日常事务或深层矛盾；学会面对平淡是成熟的必经之路。",
    "match": "ISTJ 物流师 / INTJ 建筑师 —— 稳稳接住你的热情，给你坚实的港湾。",
    "quote": "「生活就是一场盛大的派对，尽情起舞吧！」"
  }
};

// (PERSONAS_SBTI is defined in the authentic bundle above)

const TESTS = {
  drink: {
    id: 'drink',
    name: '饮料人格测试',
    tag: '趣味特调',
    sub: '12 题 · 趣味特调',
    desc: '凭日常第一直觉秒选，摇出一杯专属于你的特调饮料与风味人格',
    icon: '🍹',
    type: 'choice',
    questions: QUESTIONS_DRINK,
    personas: PERSONAS_DRINK,
    axes: AXES_DRINK,
    secTitleAxes: '四维成分轴',
    secTitleDesc: '配方解析',
    ingTitle: '性格成分表',
    ingSub: 'NUTRITION FACTS / 每杯含量',
    trioTitles: {
      shine: '闪光点 <i>SHINE</i>',
      warn: '雷区 <i>WARN</i>',
      match: '绝配饮料 <i>MATCH</i>'
    },
    eyebrow: 'YOUR PERSONA · 检测完毕',
    stamp: '饮料人格研究所 · 出品认证',
    btnStartText: '开始饮料调配',
    btnStartSub: 'SHAKE IT →',
    btnRetryText: '再摇一杯',
    shakeTexts: ['正在加入气泡…', '注入灵魂糖浆…', '均匀摇晃中…', '挂霜摆盘，盖章认证…'],
    shareTitle: 'D R I N K   P E R S O N A   L A B',
    shareSub: '—— 饮料人格特调 · 检测完毕 ——',
    shareFoot: '饮料人格研究所 · 12 道题摇出真实的你'
  },
  sbti: {
    id: 'sbti',
    name: 'SBTI · 精神状态测试',
    tag: '精神状态',
    sub: '31 题 · 精神状态',
    desc: '专治各种精神内耗，测测你的当代网络精神状态与打工魂',
    icon: '🎭',
    type: 'choice',
    questions: QUESTIONS_SBTI,
    personas: PERSONAS_SBTI,
    axes: null,
    secTitleAxes: '十五维度评分',
    secTitleDesc: '精神状态深度解析',
    ingTitle: '打工精神成分表',
    ingSub: 'MENTAL STATUS / 精神切片',
    trioTitles: {
      shine: '精神超能力 <i>SUPERPOWER</i>',
      warn: '发作诱因 <i>TRIGGER</i>',
      match: '病友搭档 <i>CO-MAD</i>'
    },
    eyebrow: 'SBTI MENTAL LAB · 诊断报告出炉',
    stamp: '当代青年精神状态研究所 · 鉴定盖章',
    btnStartText: '测测精神状态',
    btnStartSub: 'GO CRAZY →',
    btnRetryText: '换个姿势发疯',
    shakeTexts: ['正在扫描脑波信号…', '提取精神内耗切片…', '诊断 15 维度发疯特征…', '出具当代精神病历报告…'],
    shareTitle: 'S B T I   M E N T A L   L A B',
    shareSub: '—— 当代年轻人精神状态测试 · 诊断报告 ——',
    shareFoot: '当代精神状态研究所 · 31 道题看透你的真实精神状态'
  },
  mbti_short: {
    id: 'mbti_short',
    name: 'MBTI · Short Form',
    tag: '快速版',
    sub: '28 题 · 快速版',
    desc: '28 道精选情景题，快速测出你的性格偏好',
    icon: '⚡',
    type: 'choice',
    questions: QUESTIONS_MBTI_SHORT,
    personas: PERSONAS_MBTI,
    axes: AXES_MBTI,
    secTitleAxes: '性格能量偏好',
    secTitleDesc: '性格深度解析',
    ingTitle: '性格能量画像',
    ingSub: 'PERSONALITY PROFILE / 特质权重',
    trioTitles: {
      shine: '核心优势 <i>STRENGTHS</i>',
      warn: '潜在盲点 <i>WEAKNESSES</i>',
      match: '最佳拍档 <i>BEST MATCH</i>'
    },
    eyebrow: 'MBTI SHORT FORM · 检测完毕',
    stamp: 'MBTI 认知研究所 · 出品认证',
    btnStartText: '开始 Short Form',
    btnStartSub: 'START →',
    btnRetryText: '再测一次',
    shakeTexts: ['正在整理你的直觉选择…', '交叉校验性格偏好…', '梳理性格档案…', '生成专属报告…'],
    shareTitle: 'M B T I   P E R S O N A L I T Y   L A B',
    shareSub: '—— Short Form 快速测评 · 认证档案 ——',
    shareFoot: 'MBTI 认知研究所 · 28 道题解锁真实自我'
  },
  mbti_form_m: {
    id: 'mbti_form_m',
    name: 'MBTI · Form M',
    tag: '标准版',
    sub: '93 题 · 标准版',
    desc: '93 道经典情景题，全面测出你的性格类型',
    icon: '📋',
    type: 'choice',
    questions: QUESTIONS_MBTI_FORM_M,
    personas: PERSONAS_MBTI,
    axes: AXES_MBTI,
    secTitleAxes: '标准性格偏好',
    secTitleDesc: '标准性格深度解析',
    ingTitle: '性格特质分布',
    ingSub: 'FORM M PROFILE / 基准权重',
    trioTitles: {
      shine: '核心优势 <i>STRENGTHS</i>',
      warn: '潜在盲点 <i>WEAKNESSES</i>',
      match: '最佳拍档 <i>BEST MATCH</i>'
    },
    eyebrow: 'MBTI FORM M · 检测完毕',
    stamp: 'MBTI 认知研究所 · 标准认证',
    btnStartText: '开始 Form M',
    btnStartSub: 'START →',
    btnRetryText: '再测一次',
    shakeTexts: ['正在分析 93 项选择…', '综合比对性格特征…', '深度梳理偏好倾向…', '生成标准性格报告…'],
    shareTitle: 'M B T I   P E R S O N A L I T Y   L A B',
    shareSub: '—— Form M 标准测评 · 认证档案 ——',
    shareFoot: 'MBTI 认知研究所 · 93 题基准深度测评'
  },
  mbti_form_q: {
    id: 'mbti_form_q',
    name: 'MBTI · Form Q',
    tag: '深度版',
    sub: '144 题 · 深度版',
    desc: '144 道全景情景题，深度洞悉真实性格特质',
    icon: '🔬',
    type: 'choice',
    questions: QUESTIONS_MBTI_FORM_Q,
    personas: PERSONAS_MBTI,
    axes: AXES_MBTI,
    secTitleAxes: '全景特质能量分布',
    secTitleDesc: '全景性格深度解析',
    ingTitle: '性格特质全景画像',
    ingSub: 'FORM Q PROFILE / 全景深度',
    trioTitles: {
      shine: '核心优势 <i>STRENGTHS</i>',
      warn: '潜在盲点 <i>WEAKNESSES</i>',
      match: '最佳拍档 <i>BEST MATCH</i>'
    },
    eyebrow: 'MBTI FORM Q · 检测完毕',
    stamp: 'MBTI 认知研究所 · 深度认证',
    btnStartText: '开始 Form Q',
    btnStartSub: 'START →',
    btnRetryText: '再测一次',
    shakeTexts: ['正在全面分析 144 项情景选择…', '深度洞悉性格潜质…', '细致测算特质倾向…', '生成完整深度报告…'],
    shareTitle: 'M B T I   P E R S O N A L I T Y   L A B',
    shareSub: '—— Form Q 深度测评 · 认证档案 ——',
    shareFoot: 'MBTI 认知研究所 · 144 题全景深度测评'
  }
};

/* 兼容别名映射 */
TESTS.mental = TESTS.sbti;
TESTS.mbti = TESTS.mbti_short;
TESTS.classic = TESTS.mbti_short;
TESTS.quick = TESTS.drink;
TESTS.mbti_quick = TESTS.mbti_short;
TESTS.mbti_pro = TESTS.mbti_form_m;
TESTS.mbti_scale = TESTS.mbti_form_q;
const TEST_MODES = TESTS;

const QUESTIONS_QUICK = QUESTIONS_DRINK;
const QUESTIONS_CLASSIC = QUESTIONS_MBTI_SHORT;
const QUESTIONS = QUESTIONS_DRINK;
const PERSONAS = PERSONAS_DRINK;
const AXES = AXES_DRINK;

/* 饮料人格研究所 — WebAudio 合成音效 + 震动 */
'use strict';

const SFX = (function () {
  let ctx = null;
  let master = null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} }
  };
  const state = {
    sound: store.get('dp_sound', true),
    vibrate: store.get('dp_vibrate', true)
  };

  function ensure() {
    if (!state.sound) return null;
    if (window.SFX && typeof window.SFX.isMuted === 'function' && window.SFX.isMuted()) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* 基础振荡器音 */
  function tone(freq, dur, type, vol, slideTo, delay) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.3, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  /* 滤波噪声(气泡/水声/开瓶) */
  function noise(dur, from, to, vol, delay, q) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  function vib(p) {
    if (!state.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {}
  }

  return {
    get sound() { return state.sound; },
    get vibrate() { return state.vibrate; },
    setSound(v) {
      state.sound = v;
      store.set('dp_sound', v);
      if (window.SFX && typeof window.SFX.setSound === 'function') {
        window.SFX.setSound(v);
      }
      const gBtn = document.getElementById('globalBtnSfx');
      if (gBtn) {
        gBtn.textContent = v ? '🔊' : '🔇';
        if (gBtn.title) gBtn.title = v ? '音效已开启' : '音效已静音';
      }
      if (v) ensure();
    },
    setVibrate(v) { state.vibrate = v; store.set('dp_vibrate', v); if (v) vib(20); },
    unlock() { ensure(); },

    /* —— 具体音效 —— */
    tap()      { tone(300, 0.05, 'triangle', 0.12); vib(8); },
    select()   { tone(560, 0.10, 'sine', 0.30, 920); noise(0.06, 1400, 2400, 0.10, 0, 3); vib(18); },
    page()     { noise(0.16, 500, 1600, 0.14); tone(340, 0.10, 'sine', 0.08, 520); vib(10); },
    back()     { noise(0.14, 1400, 420, 0.12); tone(420, 0.10, 'sine', 0.08, 300); vib(10); },
    pour() {   /* 开始测试:注水声 */
      noise(0.5, 300, 900, 0.20, 0, 0.8);
      tone(180, 0.5, 'sine', 0.06, 240);
      vib([20, 40, 20]);
    },
    bubble(i) {  /* 小气泡音(摇杯页随机) */
      tone(700 + Math.random() * 500, 0.06, 'sine', 0.10, 1200 + Math.random() * 600);
      vib(6);
    },
    shake() {    /* 摇杯 */
      noise(0.10, 2000, 700, 0.22, 0, 0.9);
      noise(0.10, 1800, 600, 0.22, 0.22, 0.9);
      noise(0.12, 2200, 800, 0.24, 0.46, 0.9);
      vib([40, 90, 40, 90, 50]);
    },
    reveal() {   /* 结果揭晓:开瓶 pop + 上行琶音 */
      noise(0.09, 2500, 900, 0.34, 0, 1.6);
      tone(523, 0.16, 'sine', 0.22, null, 0.10);
      tone(659, 0.16, 'sine', 0.22, null, 0.20);
      tone(784, 0.18, 'sine', 0.24, null, 0.30);
      tone(1047, 0.34, 'sine', 0.26, null, 0.40);
      noise(0.5, 3200, 2200, 0.05, 0.42, 2);
      vib([30, 60, 30, 60, 120]);
    },
    save() { tone(660, 0.10, 'sine', 0.2); tone(880, 0.16, 'sine', 0.2, null, 0.09); vib(15); },
    toggle() { tone(480, 0.06, 'square', 0.08); tone(720, 0.08, 'square', 0.08, null, 0.06); vib(12); }
  };
})();

/* 饮料人格研究所 — 主流程 */
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const screens = { cover: $('scr-cover'), quiz: $('scr-quiz'), shake: $('scr-shake'), result: $('scr-result') };
  let cur = 'cover';

  /* ---------- 状态 ---------- */
  let curTest = 'drink';          // 'drink' (饮料人格测试) 或 'mbti' (MBTI)
  let qList = QUESTIONS_DRINK;    // 当前测试题库
  let qIdx = 0;                   // 当前题号
  const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const answers = [];             // 每题已选字母
  let persona = null;
  let currentDrinkImg = null;
  let sbtiAnswers = {};
  let currentResultImg = null;
  let currentResultSrc = null;

  function loadResultImage(src, onLoaded) {
    if (!src) {
      currentResultImg = null;
      currentResultSrc = null;
      if (onLoaded) onLoaded(null);
      return;
    }
    if (currentResultSrc === src && currentResultImg && currentResultImg.complete && (currentResultImg.naturalWidth > 0 || currentResultImg.width > 0)) {
      if (onLoaded) onLoaded(currentResultImg);
      return;
    }
    const img = new Image();
    // Do NOT set crossOrigin on data: URIs or local relative paths (breaks on file://)
    if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
      try {
        const u = new URL(src, window.location.href);
        if (u.origin !== window.location.origin) {
          img.crossOrigin = 'anonymous';
        }
      } catch (e) {}
    }
    img.onload = () => {
      currentResultImg = img;
      currentResultSrc = src;
      if (onLoaded) onLoaded(img);
    };
    img.onerror = () => {
      const domImg = $('cardArt') ? $('cardArt').querySelector('img') : null;
      if (domImg && domImg.complete && (domImg.naturalWidth > 0 || domImg.width > 0)) {
        currentResultImg = domImg;
        currentResultSrc = src;
        if (onLoaded) onLoaded(domImg);
      } else {
        currentResultImg = null;
        currentResultSrc = null;
        if (onLoaded) onLoaded(null);
      }
    };
    img.src = src;
    if (img.complete && (img.naturalWidth > 0 || img.width > 0)) {
      currentResultImg = img;
      currentResultSrc = src;
      if (onLoaded) onLoaded(img);
    }
  }

  function updateDrinkImage(code) {
    if (curTest === 'drink' && typeof DRINK_SVGS !== 'undefined' && DRINK_SVGS[code]) {
      const svg = DRINK_SVGS[code];
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { currentDrinkImg = img; };
      img.src = url;
    } else {
      currentDrinkImg = null;
    }
  }



  let isAnswering = false;

  function previewDrink(code) {
    const p = PERSONAS_DRINK[code];
    if (!p) return;
    curTest = 'drink';
    persona = { ...p, code };
    const typical = {
      ESTP: { E: 6, I: 2, S: 6, N: 2, T: 6, F: 2, P: 6, J: 2 },
      ESTJ: { E: 6, I: 2, S: 6, N: 2, T: 6, F: 2, J: 6, P: 2 },
      ESFP: { E: 6, I: 2, S: 6, N: 2, F: 6, T: 2, P: 6, J: 2 },
      ESFJ: { E: 6, I: 2, S: 6, N: 2, F: 6, T: 2, J: 6, P: 2 },
      ENTP: { E: 6, I: 2, N: 6, S: 2, T: 6, F: 2, P: 6, J: 2 },
      ENTJ: { E: 6, I: 2, N: 6, S: 2, T: 6, F: 2, J: 6, P: 2 },
      ENFP: { E: 6, I: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 },
      ENFJ: { E: 6, I: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 },
      ISTP: { I: 6, E: 2, S: 6, N: 2, T: 6, F: 2, P: 6, J: 2 },
      ISTJ: { I: 6, E: 2, S: 6, N: 2, T: 6, F: 2, J: 6, P: 2 },
      ISFP: { I: 6, E: 2, S: 6, N: 2, F: 6, T: 2, P: 6, J: 2 },
      ISFJ: { I: 6, E: 2, S: 6, N: 2, F: 6, T: 2, J: 6, P: 2 },
      INTP: { I: 6, E: 2, N: 6, S: 2, T: 6, F: 2, P: 6, J: 2 },
      INTJ: { I: 6, E: 2, N: 6, S: 2, T: 6, F: 2, J: 6, P: 2 },
      INFP: { I: 6, E: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 },
      INFJ: { I: 6, E: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 }
    };
    const c = typical[code] || { E: 6, I: 2, S: 6, N: 2, T: 6, F: 2, P: 6, J: 2 };
    for (const k in counts) counts[k] = c[k] || 0;
    renderResult();
    show('result');
    saveCurrentToHistory();
    SFX.reveal();
  }

  function previewMbti(code) {
    const target = (code || 'INTJ').toUpperCase();
    const p = PERSONAS_MBTI[target];
    if (!p) return;
    curTest = 'mbti_short';
    persona = { ...p, code: target };
    const typical = {
      ESTP: { E: 6, I: 2, S: 6, N: 2, T: 6, F: 2, P: 6, J: 2 },
      ESTJ: { E: 6, I: 2, S: 6, N: 2, T: 6, F: 2, J: 6, P: 2 },
      ESFP: { E: 6, I: 2, S: 6, N: 2, F: 6, T: 2, P: 6, J: 2 },
      ESFJ: { E: 6, I: 2, S: 6, N: 2, F: 6, T: 2, J: 6, P: 2 },
      ENTP: { E: 6, I: 2, N: 6, S: 2, T: 6, F: 2, P: 6, J: 2 },
      ENTJ: { E: 6, I: 2, N: 6, S: 2, T: 6, F: 2, J: 6, P: 2 },
      ENFP: { E: 6, I: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 },
      ENFJ: { E: 6, I: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 },
      ISTP: { I: 6, E: 2, S: 6, N: 2, T: 6, F: 2, P: 6, J: 2 },
      ISTJ: { I: 6, E: 2, S: 6, N: 2, T: 6, F: 2, J: 6, P: 2 },
      ISFP: { I: 6, E: 2, S: 6, N: 2, F: 6, T: 2, P: 6, J: 2 },
      ISFJ: { I: 6, E: 2, S: 6, N: 2, F: 6, T: 2, J: 6, P: 2 },
      INTP: { I: 6, E: 2, N: 6, S: 2, T: 6, F: 2, P: 6, J: 2 },
      INTJ: { I: 6, E: 2, N: 6, S: 2, T: 6, F: 2, J: 6, P: 2 },
      INFP: { I: 6, E: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 },
      INFJ: { I: 6, E: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 }
    };
    const c = typical[target] || { I: 6, E: 2, N: 6, S: 2, F: 6, T: 2, P: 6, J: 2 };
    for (const k in counts) counts[k] = c[k] || 0;
    renderResult();
    show('result');
    saveCurrentToHistory();
    SFX.reveal();
  }

  function previewSbti(code) {
    let target = (code || 'MALO').toUpperCase();
    if (!PERSONAS_SBTI[target]) target = 'MALO';
    const p = PERSONAS_SBTI[target];
    curTest = 'sbti';
    persona = { ...p, code: target, rawScores: {}, levels: {} };
    SBTI_DIMENSION_ORDER.forEach((dim, idx) => {
      persona.levels[dim] = (p.pattern ? p.pattern.replace(/-/g, '')[idx] : 'M') || 'M';
      persona.rawScores[dim] = persona.levels[dim] === 'H' ? 5 : (persona.levels[dim] === 'M' ? 4 : 3);
    });
    renderResult();
    show('result');
    saveCurrentToHistory();
    SFX.reveal();
  }

  /* ---------- 屏幕切换 ---------- */
  function show(name) {
    screens[cur].classList.remove('on');
    screens[name].classList.add('on');
    cur = name;
  }

  /* ---------- 主题 ---------- */
  function getTheme() {
    try { return localStorage.getItem('dp_theme') || 'dark'; } catch (e) { return 'dark'; }
  }
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('themeIcon').textContent = t === 'dark' ? '☾' : '☀';
    $('btnTheme2').querySelector('span').textContent = t === 'dark' ? '☾' : '☀';
    const gTheme = document.getElementById('globalBtnTheme');
    if (gTheme) gTheme.textContent = t === 'dark' ? '☾' : '☀';
    try { localStorage.setItem('dp_theme', t); } catch (e) {}
    if (window.AndroidBridge && AndroidBridge.setLightTheme) {
      AndroidBridge.setLightTheme(t === 'light');
    }
  }
  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    SFX.toggle();
  }

  /* ---------- 测评项目切换 ---------- */
  function setMode(modeKey) {
    let key = modeKey;
    if (key === 'mbti' || key === 'classic' || key === 'mbti_quick') key = 'mbti_short';
    if (key === 'mbti_pro') key = 'mbti_form_m';
    if (key === 'mbti_scale') key = 'mbti_form_q';
    if (key === 'quick') key = 'drink';
    if (key === 'mental') key = 'sbti';
    if (!TESTS[key]) key = 'drink';
    curTest = key;
    const cfg = TESTS[curTest];
    qList = cfg.questions;

    // 更新封面卡片激活状态
    const cards = document.querySelectorAll('.mode-card');
    cards.forEach(card => {
      const cMode = card.dataset.mode;
      const active = (cMode === curTest);
      card.classList.toggle('active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // 更新封面主按钮文字
    const btnText = $('btnStartText');
    const btnSub = $('btnStartSub');
    if (btnText) btnText.textContent = cfg.btnStartText;
    if (btnSub) btnSub.textContent = cfg.btnStartSub;

    // 更新答题页顶部模式药丸
    const pill = $('quizModePill');
    if (pill) {
      pill.textContent = `${cfg.icon} ${cfg.name}`;
    }
  }

  /* ---------- 封面气泡 ---------- */
  function makeBubbles() {
    const box = $('coverBubbles');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('i');
      const s = 8 + Math.random() * 34;
      b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;` +
        `animation-duration:${7 + Math.random() * 9}s;animation-delay:${-Math.random() * 12}s;`;
      frag.appendChild(b);
    }
    box.appendChild(frag);
  }

  /* ---------- 计分与结果 ---------- */
  function pickAnswer(k, val, opt) {
    if (isAnswering) return;
    isAnswering = true;
    if (curTest === 'sbti') {
      const q = qList[qIdx];
      const optVal = (typeof val === 'number') ? val : ((opt && typeof opt.v === 'number') ? opt.v : (typeof k === 'number' ? k : 1));
      sbtiAnswers[q.id] = optVal;

      // 动态展开/移除饮酒二选一门控题
      if (q.id === 'drink_gate_q1') {
        const g2Idx = qList.findIndex(it => it.id === 'drink_gate_q2');
        if (optVal === 3) {
          if (g2Idx === -1) {
            qList.splice(qIdx + 1, 0, QUESTIONS_SBTI_SPECIAL[1]);
          }
        } else {
          if (g2Idx !== -1) {
            qList.splice(g2Idx, 1);
            delete sbtiAnswers['drink_gate_q2'];
          }
        }
      }
      answers.push({ type: 'sbti', qId: q.id, val: optVal });
      $('quizFill').style.width = (answers.length / qList.length * 100) + '%';
      if (answers.length >= qList.length) {
        setTimeout(() => startShake(), 340);
      } else {
        setTimeout(() => { qIdx++; renderQuestion(); SFX.page(); }, 280);
      }
      return;
    }

    if (typeof val === 'number') {
      const q = qList[qIdx];
      let addPole = null, addVal = 0;
      if (val > 0) {
        addPole = q.pole;
        addVal = val;
      } else if (val < 0) {
        const opp = { E: 'I', I: 'E', S: 'N', N: 'S', T: 'F', F: 'T', J: 'P', P: 'J' };
        addPole = opp[q.pole];
        addVal = -val;
      }
      if (addPole && addVal > 0) {
        counts[addPole] += addVal;
      }
      answers.push({ type: 'scale', pole: addPole, val: addVal });
    } else {
      counts[k] += 2;
      answers.push({ type: 'choice', k });
    }

    $('quizFill').style.width = (answers.length / qList.length * 100) + '%';
    if (answers.length >= qList.length) {
      setTimeout(() => startShake(), 340);
    } else {
      setTimeout(() => { qIdx++; renderQuestion(); SFX.page(); }, 280);
    }
  }

  function undoAnswer() {
    isAnswering = false;
    const item = answers.pop();
    if (item) {
      if (item.type === 'sbti') {
        delete sbtiAnswers[item.qId];
        if (item.qId === 'drink_gate_q1') {
          const g2Idx = qList.findIndex(it => it.id === 'drink_gate_q2');
          if (g2Idx !== -1) {
            qList.splice(g2Idx, 1);
            delete sbtiAnswers['drink_gate_q2'];
          }
        }
      } else if (item.type === 'scale') {
        if (item.pole && item.val > 0) counts[item.pole] -= item.val;
      } else if (item.type === 'choice') {
        counts[item.k] -= 2;
      } else if (typeof item === 'string') {
        counts[item] -= 2;
      }
    }
    $('quizFill').style.width = (answers.length / qList.length * 100) + '%';
  }

  function resolveCode() {
    const tie = { EI: 'I', SN: 'S', TF: 'F', JP: 'P' };
    const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
    let code = '';
    for (const [a, b] of pairs) {
      if (counts[a] > counts[b]) code += a;
      else if (counts[b] > counts[a]) code += b;
      else code += tie[a + b];
    }
    return code;
  }

  function computeSbtiOutcome() {
    const rawScores = {};
    const levels = {};
    SBTI_DIMENSION_ORDER.forEach(dim => { rawScores[dim] = 0; });

    QUESTIONS_SBTI_MAIN.forEach(q => {
      rawScores[q.dim] += Number(sbtiAnswers[q.id] || 0);
    });

    SBTI_DIMENSION_ORDER.forEach(dim => {
      const s = rawScores[dim];
      levels[dim] = (s <= 3) ? 'L' : ((s === 4) ? 'M' : 'H');
    });

    const levelNum = lvl => ({ L: 1, M: 2, H: 3 }[lvl] || 2);
    const userVector = SBTI_DIMENSION_ORDER.map(dim => levelNum(levels[dim]));

    const ranked = SBTI_NORMAL_TYPES.map(type => {
      const vector = type.pattern.replace(/-/g, '').split('').map(levelNum);
      let distance = 0, exact = 0;
      for (let i = 0; i < vector.length; i++) {
        const diff = Math.abs(userVector[i] - vector[i]);
        distance += diff;
        if (diff === 0) exact += 1;
      }
      const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
      return { ...type, ...PERSONAS_SBTI[type.code], distance, exact, similarity };
    }).sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (b.exact !== a.exact) return b.exact - a.exact;
      return b.similarity - a.similarity;
    });

    const bestNormal = ranked[0];
    const drunkTriggered = (sbtiAnswers['drink_gate_q2'] === 2);

    let finalOutcome;
    if (drunkTriggered) {
      finalOutcome = { ...PERSONAS_SBTI['DRUNK'], isSpecial: true, similarity: 100, exact: 15, modeKicker: '隐藏人格已激活', badgeText: '匹配度 100% · 酒精异常因子已接管' };
    } else if (bestNormal.similarity < 60) {
      finalOutcome = { ...PERSONAS_SBTI['HHHH'], isSpecial: true, similarity: bestNormal.similarity, exact: bestNormal.exact, modeKicker: '系统强制兜底', badgeText: `标准人格库最高匹配仅 ${bestNormal.similarity}%` };
    } else {
      finalOutcome = { ...bestNormal, modeKicker: '你的主类型', badgeText: `匹配度 ${bestNormal.similarity}% · 精准命中 ${bestNormal.exact}/15 维` };
    }

    finalOutcome.rawScores = rawScores;
    finalOutcome.levels = levels;
    return finalOutcome;
  }

  function computePersona() {
    if (curTest === 'sbti') {
      return computeSbtiOutcome();
    }
    const cfg = TESTS[curTest] || TESTS.drink;
    const code = resolveCode();
    const p = cfg.personas[code];
    return p ? { ...p, code } : null;
  }

  /* ---------- 答题 ---------- */
  const KEYS = ['A', 'B', 'C', 'D'];
  function renderQuestion() {
    isAnswering = false;
    const q = qList[qIdx];
    const total = qList.length;
    const cfg = TESTS[curTest] || TESTS.drink;
    const isMbti = (curTest !== 'drink');
    const isLikert = (cfg.type === 'likert');

    $('quizCount').textContent = `Q${qIdx + 1}/${total}`;
    $('quizEyebrow').textContent = (curTest === 'drink')
      ? `第 ${qIdx + 1} 杯 · 正在注入`
      : (curTest === 'sbti')
        ? `第 ${qIdx + 1} 题 · 精神状态诊断中`
        : `第 ${qIdx + 1} 题 · ${cfg.name}`;

    const qEl = $('quizQ');
    qEl.style.animation = 'none';
    void qEl.offsetWidth;
    qEl.style.animation = '';
    qEl.textContent = q.q;

    const box = $('quizOpts');
    box.innerHTML = '';
    const hintEl = $('quizHint');

    if (isLikert) {
      box.className = 'quiz-opts is-likert';
      const wrap = document.createElement('div');
      wrap.className = 'likert-wrap';

      const lbls = document.createElement('div');
      lbls.className = 'likert-labels';
      lbls.innerHTML = `<span class="likert-lbl agree">同意</span><span class="likert-lbl neutral">中立</span><span class="likert-lbl disagree">反对</span>`;
      wrap.appendChild(lbls);

      const scale = document.createElement('div');
      scale.className = 'likert-scale';

      const dots = [
        { v: 3, cls: 'dot-val-p3', t: '非常同意', key: '1' },
        { v: 2, cls: 'dot-val-p2', t: '比较同意', key: '2' },
        { v: 1, cls: 'dot-val-p1', t: '稍微同意', key: '3' },
        { v: 0, cls: 'dot-val-0',  t: '中立',     key: '4' },
        { v: -1, cls: 'dot-val-m1', t: '稍微反对', key: '5' },
        { v: -2, cls: 'dot-val-m2', t: '比较反对', key: '6' },
        { v: -3, cls: 'dot-val-m3', t: '非常反对', key: '7' }
      ];

      dots.forEach(d => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `likert-dot ${d.cls}`;
        btn.setAttribute('aria-label', `${d.t} (按键 ${d.key})`);
        btn.innerHTML = `<span class="dot-circle"></span><span class="dot-sub">${d.t}</span>`;
        btn.addEventListener('click', () => {
          btn.classList.add('picked');
          box.style.pointerEvents = 'none';
          setTimeout(() => { box.style.pointerEvents = ''; }, 320);
          SFX.select();
          pickAnswer(null, d.v);
        });
        scale.appendChild(btn);
      });

      wrap.appendChild(scale);
      box.appendChild(wrap);

      if (hintEl) {
        hintEl.innerHTML = `根据真实符合度打分<span class="pc-key-tip-inline"> · 可按键盘 <b>1(非常同意) ~ 7(非常反对)</b> 作答</span>`;
      }
    } else {
      box.className = 'quiz-opts';
      q.opts.forEach((o, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt';
        btn.innerHTML = `<span class="opt-key">${KEYS[i]}</span><span class="opt-t"></span>`;
        btn.querySelector('.opt-t').textContent = o.t;
        btn.addEventListener('click', () => {
          SFX.select();
          btn.classList.add('picked');
          box.style.pointerEvents = 'none';
          setTimeout(() => { box.style.pointerEvents = ''; }, 320);
          pickAnswer(o.k, o.v, o);
        });
        box.appendChild(btn);
      });

      if (hintEl) {
        if (q.opts.length === 2) {
          hintEl.innerHTML = `凭第一直觉选择更符合你的一项<span class="pc-key-tip-inline"> · 可按键盘 <b>A/B</b> 或 <b>1/2</b> 作答</span>`;
        } else {
          hintEl.innerHTML = `凭第一直觉选，答案没有对错<span class="pc-key-tip-inline"> · 可按键盘 <b>A/B/C/D</b> 或 <b>1/2/3/4</b> 作答</span>`;
        }
      }
    }
  }

  function startQuiz() {
    isAnswering = false;
    counts.E = counts.I = counts.S = counts.N = counts.T = counts.F = counts.J = counts.P = 0;
    answers.length = 0;
    qIdx = 0;
    sbtiAnswers = {};
    const cfg = TESTS[curTest] || TESTS.drink;
    if (curTest === 'sbti') {
      qList = [...QUESTIONS_SBTI_MAIN, QUESTIONS_SBTI_SPECIAL[0]];
    } else {
      qList = cfg.questions;
    }
    qIdx = 0;
    answers.length = 0;
    for (const k in counts) counts[k] = 0;
    $('quizFill').style.width = '0%';
    renderQuestion();
    show('quiz');
  }

  /* ---------- 摇杯过渡 ---------- */
  function startShake() {
    show('shake');
    SFX.shake();
    const cfg = TESTS[curTest] || TESTS.drink;
    const texts = cfg.shakeTexts || ['正在加入气泡…', '注入灵魂糖浆…', '均匀摇晃中…', '挂霜摆盘，盖章认证…'];
    const bar = $('shakeBar'), tx = $('shakeText');
    bar.style.width = '0%';
    let step = 0;
    const total = 2600, per = 650;
    const timer = setInterval(() => {
      step++;
      const p = Math.min(100, step * per / total * 100);
      bar.style.width = p + '%';
      tx.textContent = texts[Math.min(step, texts.length - 1)];
      if (Math.random() < 0.7) SFX.bubble();
      if (step * per >= total) {
        clearInterval(timer);
        persona = computePersona();
        renderResult();
        saveCurrentToHistory();
        SFX.reveal();
        setTimeout(() => show('result'), 260);
      }
    }, per);
  }

  /* ---------- 结果渲染 ---------- */
  function isDarkColor(hex) {
    const m = hex.replace('#', '');
    const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  }

  
  /* ==================== 历史测评档案系统 ==================== */
  const STORAGE_KEY_HISTORY = 'juice_persona_history_v1';

  function getHistoryList() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to read history from localStorage', e);
      return [];
    }
  }

  function setHistoryList(list) {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to write history to localStorage', e);
    }
  }

  function formatRecordDate(d) {
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month}月${date}日 ${hours}:${mins}`;
  }

  function getTestModeName(testKey) {
    if (testKey === 'sbti') return 'SBTI 发疯档案';
    if (testKey === 'drink') return '饮料灵魂特调';
    if (testKey === 'mbti_short') return 'MBTI 快速测评';
    if (testKey === 'mbti_form_m') return 'MBTI Form M 权威版';
    if (testKey === 'mbti_form_q') return 'MBTI Form Q 深度版';
    return '人格档案';
  }

  function getAvatarSrc(testKey, itemCode) {
    if (testKey === 'drink') return null;
    if (testKey === 'sbti') return SBTI_IMAGES[itemCode] || '';
    return MBTI_IMAGES[itemCode] || '';
  }

  function saveCurrentToHistory() {
    if (!persona) return;
    const code = (curTest === 'sbti') ? (persona.code || 'SBTI') : resolveCode();
    const list = getHistoryList();
    const now = Date.now();

    // 防抖去重：如果在 15 秒内测出的同模式同代码，不重复追加
    if (list.length > 0) {
      const top = list[0];
      if (top.test === curTest && top.code === code && (now - top.timestamp < 15000)) {
        return;
      }
    }

    const subText = persona.intro ? `“${persona.intro}”` : (persona.archetype || persona.quote || '');

    const newItem = {
      id: now + '_' + Math.random().toString(36).slice(2, 6),
      timestamp: now,
      dateStr: formatRecordDate(new Date(now)),
      test: curTest,
      testName: getTestModeName(curTest),
      code: code,
      name: persona.name,
      en: persona.en || '',
      color: persona.color || '#D6FF4B',
      subText: subText,
      scoresSnap: (curTest === 'drink' || curTest.startsWith('mbti')) ? JSON.parse(JSON.stringify(counts || {})) : null,
      sbtiSnap: (curTest === 'sbti') ? JSON.parse(JSON.stringify(sbtiAnswers || {})) : null,
      levelsSnap: (curTest === 'sbti' && persona.levels) ? JSON.parse(JSON.stringify(persona.levels)) : null,
      rawScoresSnap: (curTest === 'sbti' && persona.rawScores) ? JSON.parse(JSON.stringify(persona.rawScores)) : null,
      customPersona: (persona.isCustomSpecial || persona.isSpecial) ? JSON.parse(JSON.stringify(persona)) : null
    };

    list.unshift(newItem);
    if (list.length > 30) list.pop();
    setHistoryList(list);
    updateHistoryBadge();

    // 同步沉淀至全所综合历史档案库
    if (window.UniversalHistory) {
      window.UniversalHistory.add({
        module: 'drinks',
        title: `${persona.name} (${code})`,
        subtitle: `${getTestModeName(curTest)} · ${subText}`,
        color: persona.color || '#D6FF4B',
        badge: curTest === 'sbti' ? '🧟 SBTI' : (curTest === 'drink' ? '🍹 特调' : '🧠 MBTI'),
        avatar: curTest === 'drink' ? '🍹' : (curTest === 'sbti' ? '🧟' : '🧠'),
        data: {
          test: curTest,
          code: code,
          persona: persona,
          counts: counts,
          sbtiAnswers: sbtiAnswers
        }
      });
    }
  }

  function updateHistoryBadge() {
    if (window.UniversalHistory && typeof window.UniversalHistory.updateBadges === 'function') {
      window.UniversalHistory.updateBadges();
      return;
    }
    const list = getHistoryList();
    const count = list.length;
    const badges = document.querySelectorAll('.history-count-badge');
    badges.forEach(b => {
      if (count > 0) {
        b.textContent = count > 99 ? '99+' : count;
        b.style.display = 'inline-flex';
      } else {
        b.style.display = 'none';
      }
    });
    const subTxt = $('historySubText');
    if (subTxt) {
      subTxt.textContent = `共 ${count} 份测验档案`;
    }
  }

  function removeHistoryItem(id) {
    let list = getHistoryList();
    list = list.filter(item => item.id !== id);
    setHistoryList(list);
    updateHistoryBadge();
    renderHistoryDrawer();
    SFX.tap();
  }

  function clearAllHistory() {
    if (window.UniversalHistory && typeof window.UniversalHistory.clear === 'function') {
      window.UniversalHistory.clear();
      return;
    }
    if (!confirm('确定要清空所有历史测评档案吗？')) return;
    setHistoryList([]);
    updateHistoryBadge();
    renderHistoryDrawer();
    SFX.tap();
  }

  function restoreHistoryReport(id) {
    const list = getHistoryList();
    const item = list.find(x => x.id === id);
    if (!item) return;

    curTest = item.test;
    if (item.test === 'sbti') {
      sbtiAnswers = item.sbtiSnap || {};
      persona = item.customPersona ? { ...item.customPersona } : { ...PERSONAS_SBTI[item.code] };
      persona.code = item.code;
      if (item.levelsSnap) persona.levels = item.levelsSnap;
      if (item.rawScoresSnap) persona.rawScores = item.rawScoresSnap;
      if (!persona.levels) {
        persona.levels = {};
        persona.rawScores = {};
        SBTI_DIMENSION_ORDER.forEach((dim, idx) => {
          persona.levels[dim] = (persona.pattern ? persona.pattern.replace(/-/g, '')[idx] : 'M') || 'M';
          persona.rawScores[dim] = persona.levels[dim] === 'H' ? 5 : (persona.levels[dim] === 'M' ? 4 : 3);
        });
      }
    } else if (item.test === 'drink') {
      const savedCounts = item.scoresSnap || {};
      for (const k in counts) counts[k] = savedCounts[k] || 0;
      persona = { ...PERSONAS_DRINK[item.code], code: item.code };
    } else {
      const savedCounts = item.scoresSnap || {};
      for (const k in counts) counts[k] = savedCounts[k] || 0;
      persona = { ...PERSONAS_MBTI[item.code], code: item.code };
    }

    if (!persona) return;

    renderResult();
    show('result');
    hideHistoryDrawer();
    SFX.page();
  }

  window.__restoreHistory = restoreHistoryReport;
  window.__restoreDrinkRecord = function (rec) {
    if (!rec) return;
    if (typeof rec === 'string') {
      restoreHistoryReport(rec);
    } else if (rec.data) {
      const d = rec.data;
      curTest = d.test || 'drink';
      if (curTest === 'sbti') {
        sbtiAnswers = d.sbtiSnap || d.sbtiAnswers || {};
        persona = d.customPersona ? { ...d.customPersona } : { ...(PERSONAS_SBTI[d.code] || d.persona) };
        persona.code = d.code;
        if (d.levelsSnap) persona.levels = d.levelsSnap;
        if (d.rawScoresSnap) persona.rawScores = d.rawScoresSnap;
      } else if (curTest === 'drink') {
        const savedCounts = d.scoresSnap || d.counts || {};
        for (const k in counts) counts[k] = savedCounts[k] || 0;
        persona = { ...(PERSONAS_DRINK[d.code] || d.persona), code: d.code };
      } else {
        const savedCounts = d.scoresSnap || d.counts || {};
        for (const k in counts) counts[k] = savedCounts[k] || 0;
        persona = { ...(PERSONAS_MBTI[d.code] || d.persona), code: d.code };
      }
      renderResult();
      show('result');
      hideHistoryDrawer();
      SFX.page();
    }
  };
  window.__delHistory = removeHistoryItem;

  function renderHistoryDrawer() {
    if (window.UniversalHistory && typeof window.UniversalHistory.renderDrawer === 'function') {
      window.UniversalHistory.renderDrawer();
      return;
    }
    const listContainer = $('historyList');
    if (!listContainer) return;
    const list = getHistoryList();

    if (list.length === 0) {
      listContainer.innerHTML = `
        <div class="history-empty">
          <div class="empty-cup-icon">🍹</div>
          <h4>暂无测验档案</h4>
          <p>完成任意一次测试后，你的专属人格档案和配方分析将自动保存在这里。</p>
        </div>
      `;
      const btnClear = $('btnClearHistory');
      if (btnClear) btnClear.style.display = 'none';
      return;
    }

    const btnClear = $('btnClearHistory');
    if (btnClear) btnClear.style.display = 'block';

    listContainer.innerHTML = list.map(item => {
      let avatarHtml = '';
      if (item.test === 'drink') {
        const svg = (typeof DRINK_SVGS !== 'undefined' && DRINK_SVGS[item.code]) ? DRINK_SVGS[item.code] : '🍹';
        avatarHtml = `<div class="hist-avatar-svg">${svg}</div>`;
      } else {
        const src = getAvatarSrc(item.test, item.code);
        if (src) {
          avatarHtml = `<img src="${src}" alt="${item.code}" class="hist-avatar-img" />`;
        } else {
          avatarHtml = `<span class="hist-avatar-txt">${item.code}</span>`;
        }
      }

      return `
        <div class="history-card" data-id="${item.id}" style="--item-color:${item.color};">
          <div class="hist-left">
            <div class="hist-avatar-circle">
              ${avatarHtml}
            </div>
          </div>
          <div class="hist-mid">
            <div class="hist-meta">
              <span class="hist-mode-tag">${item.testName}</span>
              <span class="hist-date">${item.dateStr}</span>
            </div>
            <div class="hist-name-row">
              <strong class="hist-code">${item.code}</strong>
              <span class="hist-name">${item.name}</span>
            </div>
            ${item.subText ? `<p class="hist-quote">${item.subText}</p>` : ''}
          </div>
          <div class="hist-right">
            <button class="btn-hist-view" onclick="window.__restoreHistory('${item.id}')" title="查看完整报告">查看</button>
            <button class="btn-hist-del" onclick="window.__delHistory('${item.id}')" title="删除记录">×</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function showHistoryDrawer() {
    if (window.UniversalHistory && typeof window.UniversalHistory.openDrawer === 'function') {
      window.UniversalHistory.openDrawer();
      return;
    }
    renderHistoryDrawer();
    const modal = $('modalHistory');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      SFX.tap();
    }
  }

  function hideHistoryDrawer() {
    if (window.UniversalHistory && typeof window.UniversalHistory.closeDrawer === 'function') {
      window.UniversalHistory.closeDrawer();
      return;
    }
    const modal = $('modalHistory');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function renderResult() {
    const p = persona;
    const cfg = TESTS[curTest] || TESTS.drink;
    const code = (p && p.code) || ((curTest === 'sbti') ? 'SBTI' : resolveCode());
    const card = $('resultCard');
    card.style.setProperty('--pc', p.color);
    const ink = isDarkColor(p.color) ? '#FFFFFF' : 'var(--ac-ink)';
    $('cardBand').style.color = ink;

    const nameEl = $('cardName');
    const subEl = $('cardSubName');
    const isMbti = (curTest !== 'drink');

    if (curTest === 'sbti') {
      $('cardCode').textContent = p.code || 'SBTI';
      $('cardEn').textContent = p.en ? p.en.toUpperCase() : 'SBTI';
      nameEl.textContent = p.name;
      nameEl.classList.remove('is-mbti-code');
      if (subEl) {
        subEl.style.display = 'block';
        subEl.textContent = p.intro ? `“${p.intro}”` : (p.archetype || '');
      }
    } else if (isMbti) {
      $('cardCode').textContent = 'MBTI';
      $('cardEn').textContent = p.en.toUpperCase();
      nameEl.textContent = code;
      nameEl.classList.add('is-mbti-code');
      if (subEl) {
        subEl.style.display = 'block';
        subEl.textContent = `${p.archetype || ''} · ${p.name}`;
      }
    } else {
      $('cardCode').textContent = code;
      $('cardEn').textContent = p.en.toUpperCase();
      nameEl.textContent = p.name;
      nameEl.classList.remove('is-mbti-code');
      if (subEl) subEl.style.display = 'none';
    }

    // 渲染或隐藏专属卡通配图 / 头像
    const artBox = $('cardArt');
    if (artBox) {
      if (curTest === 'drink' && typeof DRINK_SVGS !== 'undefined' && DRINK_SVGS[code]) {
        artBox.style.display = 'flex';
        artBox.innerHTML = '<div class="card-art-circle">' + DRINK_SVGS[code] + '</div>';
        updateDrinkImage(code);
      } else if (curTest.startsWith('mbti') && (MBTI_IMAGES[code] || p.imageFile)) {
        const imgSrc = MBTI_IMAGES[code] || p.imageFile;
        artBox.style.display = 'flex';
        artBox.innerHTML = '<div class="card-art-circle"><img src="' + imgSrc + '" alt="' + code + '" class="mbti-avatar-img" /></div>';
        loadResultImage(imgSrc);
      } else if (curTest === 'sbti' && (SBTI_IMAGES[p.code] || p.imageFile)) {
        const imgSrc = SBTI_IMAGES[p.code] || p.imageFile;
        artBox.style.display = 'flex';
        artBox.innerHTML = '<div class="card-art-circle"><img src="' + imgSrc + '" alt="' + p.code + '" class="sbti-avatar-img" /></div>';
        loadResultImage(imgSrc);
      } else {
        artBox.style.display = 'none';
        artBox.innerHTML = '';
        currentResultImg = null;
      }
    }

    $('cardTags').innerHTML = p.tags.map(t => `<i>${t}</i>`).join('');
    $('cardIng').innerHTML =
      `<div class="ing-head"><b>${cfg.ingTitle}</b><span>${cfg.ingSub}</span></div>` +
      p.ingredients.map(x =>
        `<div class="ing-row"><b>${x.n}</b><span class="dots"></span><em>${x.p}%</em></div>`).join('');

    const eyebrow = $('resultEyebrow');
    if (eyebrow) eyebrow.textContent = cfg.eyebrow;
    const stamp = $('cardStamp');
    if (stamp) stamp.textContent = cfg.stamp;

    // 动态板块标题
    const secAxes = $('secTitleAxes');
    if (secAxes) secAxes.textContent = cfg.secTitleAxes || '四维成分轴';
    const secDesc = $('secTitleDesc');
    if (secDesc) secDesc.textContent = cfg.secTitleDesc || '配方解析';

    const tShine = $('titleShine');
    if (tShine) tShine.innerHTML = cfg.trioTitles.shine;
    const tWarn = $('titleWarn');
    if (tWarn) tWarn.innerHTML = cfg.trioTitles.warn;
    const tMatch = $('titleMatch');
    if (tMatch) tMatch.innerHTML = cfg.trioTitles.match;

    const rFoot = $('resultFoot');
    if (rFoot) {
      rFoot.textContent = (curTest === 'sbti')
        ? 'SBTI MENTAL LAB · 仅供精神状态与精神自愈 · 拒绝内耗'
        : (isMbti ? 'MBTI PERSONALITY LAB · 认知功能深度测评' : 'DRINK PERSONA LAB · 仅供娱乐 · 甜度自选');
    }

    // 重试按钮文字
    document.querySelectorAll('.btn-retry-act').forEach(b => {
      b.textContent = cfg.btnRetryText || '再测一次';
    });

    renderAxes();
    $('paraDesc').innerHTML = p.desc;
    if (p.trio && p.trio.shine && (p.trio.shine.includes('<') || p.trio.shine.includes('\n'))) {
      $('paraShine').innerHTML = p.trio.shine;
      $('paraWarn').innerHTML = p.trio.warn;
      $('paraMatch').innerHTML = p.trio.match;
    } else {
      $('paraShine').textContent = p.shine || (p.trio && p.trio.shine) || '';
      $('paraWarn').textContent = p.warn || (p.trio && p.trio.warn) || '';
      const mStr = p.match || (p.trio && p.trio.match) || '';
      const mm = mStr.match(/^(.+?)——(.+)$/);
      $('paraMatch').innerHTML = mm ? `<b>${mm[1]}</b> —— ${mm[2]}` : mStr;
    }
    $('paraQuote').textContent = p.quote || (p.intro ? `“${p.intro}”` : '');

    // 重置滚动
    document.querySelector('.result-scroll').scrollTop = 0;
    // 四维条动画
    setTimeout(() => {
      document.querySelectorAll('.axis-fill').forEach(el => { el.style.width = el.dataset.w + '%'; });
    }, 500);
  }

  function codeLetters() {
    const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
    let c = '';
    for (const [a, b] of pairs) c += counts[a] >= counts[b] ? a : b;
    return c;
  }

  function renderAxes() {
    const box = $('axesBox');
    box.innerHTML = '';
    if (curTest === 'sbti') {
      const p = persona;
      const levels = p.levels || {};
      const rawScores = p.rawScores || {};

      const grid = document.createElement('div');
      grid.className = 'sbti-dims-grid';
      SBTI_DIMENSION_ORDER.forEach(dim => {
        const lvl = levels[dim] || 'M';
        const meta = SBTI_DIMENSION_META[dim];
        const exp = (SBTI_DIM_EXPLANATIONS[dim] && SBTI_DIM_EXPLANATIONS[dim][lvl]) || '';
        const item = document.createElement('div');
        item.className = 'sbti-dim-item';
        item.innerHTML = `
          <div class="sbti-dim-top">
            <span class="sbti-dim-name"><b>${meta.name}</b> <small>(${meta.model})</small></span>
            <span class="sbti-dim-badge lvl-${lvl}">${lvl} / ${rawScores[dim] || 0}分</span>
          </div>
          <div class="sbti-dim-desc">${exp}</div>
        `;
        grid.appendChild(item);
      });
      box.appendChild(grid);
      return;
    }
    const cfg = TESTS[curTest] || TESTS.drink;
    const axesList = cfg.axes || AXES_DRINK;
    axesList.forEach((ax, i) => {
      const l = counts[ax.lK], r = counts[ax.rK];
      const tot = l + r || 1;
      const lp = Math.round(l / tot * 100), rp = 100 - lp;
      const lWin = l >= r;
      const row = document.createElement('div');
      row.className = 'axis';
      row.innerHTML =
        `<span class="axis-side l ${lWin ? 'win' : ''}">${ax.l}</span>` +
        `<div class="axis-bar">` +
        `<div class="axis-half l"><div class="axis-fill" data-w="${lp}"></div></div>` +
        `<div class="axis-half r"><div class="axis-fill" data-w="${rp}"></div></div>` +
        `</div>` +
        `<span class="axis-side r ${!lWin ? 'win' : ''}">${ax.r}</span>` +
        `<span class="axis-pct">${lp}% : ${rp}%</span>`;
      box.appendChild(row);
    });
  }

  /* ---------- 分享长图 ---------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCoverImage(ctx, img, dx, dy, dw, dh) {
    if (!img) return;
    const iw = img.naturalWidth || img.width || dw;
    const ih = img.naturalHeight || img.height || dh;
    if (!iw || !ih) {
      try { ctx.drawImage(img, dx, dy, dw, dh); } catch (e) {}
      return;
    }
    const scale = Math.max(dw / iw, dh / ih);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;
    try {
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    } catch (e) {
      try { ctx.drawImage(img, dx, dy, dw, dh); } catch (e2) {}
    }
  }

  function drawShareCard() {
    const p = persona;
    const cfg = TESTS[curTest] || TESTS.drink;
    const code = (p && p.code) || ((curTest === 'sbti') ? 'SBTI' : resolveCode());
    const cv = $('shareCanvas'), c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const F = (s, w) => `${w || 400} ${s}px "MiSans","HarmonyOS Sans SC","PingFang SC","Microsoft YaHei",sans-serif`;

    // 跟随当前主题 (深色 vs 浅色)
    const isLight = (document.documentElement.dataset.theme === 'light') || (getTheme() === 'light');
    const th = isLight ? {
      bg: '#F5F6F1',
      bBub1: 'rgba(120,150,0,0.06)',
      bBub2: 'rgba(0,0,0,0.025)',
      bBubStroke: 'rgba(120,150,0,0.13)',
      titleTop: '#6E9C16',
      subTop: '#7D8474',
      artBg: '#FFFFFF',
      artStroke: 'rgba(20,24,18,0.12)',
      mainTitle: '#171A14',
      subName: '#6E9C16',
      tagBg: '#FFFFFF',
      tagStroke: 'rgba(20,24,18,0.12)',
      tagTx: '#484E40',
      cardBg: '#FFFFFF',
      cardStroke: 'rgba(20,24,18,0.09)',
      cardTx: '#171A14',
      cardSub: '#7D8474',
      cardDiv: '#171A14',
      barTrack: 'rgba(20,24,18,0.07)',
      barFill: '#78B21D',
      barPct: '#6E9C16',
      quote: '#40463A',
      axesBoxBg: '#FFFFFF',
      axesBoxStroke: 'rgba(120,150,0,0.30)',
      axesTitle: '#6E9C16',
      axesLabel: '#505648',
      axesTrack: 'rgba(20,24,18,0.07)',
      axesFill: '#78B21D',
      foot: '#7D8474'
    } : {
      bg: '#0B0C10',
      bBub1: 'rgba(214,255,75,0.05)',
      bBub2: 'rgba(255,255,255,0.035)',
      bBubStroke: 'rgba(214,255,75,0.10)',
      titleTop: '#D6FF4B',
      subTop: '#5A6070',
      artBg: '#14161E',
      artStroke: 'rgba(255,255,255,0.18)',
      mainTitle: '#F2F4F0',
      subName: '#D6FF4B',
      tagBg: 'rgba(255,255,255,0.04)',
      tagStroke: 'rgba(255,255,255,0.16)',
      tagTx: '#B4BAD0',
      cardBg: '#14161E',
      cardStroke: 'rgba(255,255,255,0.14)',
      cardTx: '#F2F4F0',
      cardSub: '#7D8474',
      cardDiv: '#FFFFFF',
      barTrack: 'rgba(255,255,255,0.08)',
      barFill: '#D6FF4B',
      barPct: '#D6FF4B',
      quote: '#E0E4DE',
      axesBoxBg: 'transparent',
      axesBoxStroke: 'rgba(214,255,75,0.32)',
      axesTitle: '#D6FF4B',
      axesLabel: '#BAC0D4',
      axesTrack: 'rgba(255,255,255,0.08)',
      axesFill: '#D6FF4B',
      foot: '#5A6070'
    };

    // 底色
    c.fillStyle = th.bg; c.fillRect(0, 0, W, H);
    // 气泡
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 4 + Math.random() * 22;
      c.beginPath(); c.arc(x, y, r, 0, 7);
      c.fillStyle = Math.random() < 0.5 ? th.bBub1 : th.bBub2;
      c.fill();
      c.strokeStyle = th.bBubStroke; c.stroke();
    }

    // 顶部品牌
    c.textAlign = 'center';
    c.fillStyle = th.titleTop;
    c.font = F(26, 700);
    c.fillText(cfg.shareTitle, W / 2, 108);
    c.fillStyle = th.subTop;
    c.font = F(20, 500);
    c.fillText(cfg.shareSub, W / 2, 148);

    // 色带(MBTI + EN)
    const bandY = 196, bandH = 60;
    const dark = isDarkColor(p.color);
    const isMbti = (curTest !== 'drink');
    c.fillStyle = p.color;
    rr(c, W / 2 - 270, bandY, 540, bandH, 30); c.fill();
    c.fillStyle = dark ? '#FFFFFF' : '#10120A';
    c.font = F(28, 900);
    if (curTest === 'sbti') {
      c.fillText((p.code || 'SBTI') + '  ·  ' + (p.en ? p.en.toUpperCase() : 'SBTI'), W / 2, bandY + 41);
    } else if (isMbti) {
      c.fillText('MBTI · ' + p.en.toUpperCase(), W / 2, bandY + 41);
    } else {
      c.fillText((code || resolveCode()) + '  ·  ' + p.en.toUpperCase(), W / 2, bandY + 41);
    }

    // 名字 / 主标题 & 卡通插画
    c.textAlign = 'center';
    let tagY = 548;
    let cardY = 638;

    if (curTest === 'sbti') {
      // 精神状态圆形头像徽章 (原装插画)
      const artX = W / 2, artY = 348, artR = 62;
      const grad = c.createRadialGradient(artX, artY, 12, artX, artY, artR + 14);
      grad.addColorStop(0, p.color + (isLight ? '40' : '55'));
      grad.addColorStop(0.75, p.color + (isLight ? '08' : '12'));
      grad.addColorStop(1, 'transparent');
      c.fillStyle = grad;
      c.beginPath(); c.arc(artX, artY, artR + 14, 0, Math.PI * 2); c.fill();

      c.fillStyle = th.artBg;
      c.beginPath(); c.arc(artX, artY, artR, 0, Math.PI * 2); c.fill();
      c.strokeStyle = th.artStroke; c.lineWidth = 2; c.stroke();

      let artImg = currentResultImg;
      if (!artImg || !artImg.complete || !(artImg.naturalWidth || artImg.width)) {
        const domImg = $('cardArt') ? $('cardArt').querySelector('img') : null;
        if (domImg && domImg.complete && (domImg.naturalWidth || domImg.width)) {
          artImg = domImg;
        }
      }
      if (!artImg || !artImg.complete) {
        const fallbackSrc = SBTI_IMAGES[p.code] || p.imageFile;
        if (fallbackSrc) {
          const directImg = new Image();
          directImg.src = fallbackSrc;
          if (directImg.complete || directImg.naturalWidth || directImg.width) {
            artImg = directImg;
          }
        }
      }
      if (artImg) {
        c.save();
        c.beginPath(); c.arc(artX, artY, artR - 4, 0, Math.PI * 2); c.clip();
        drawCoverImage(c, artImg, artX - (artR - 4), artY - (artR - 4), (artR - 4) * 2, (artR - 4) * 2);
        c.restore();
      }

      // 名字 / 主标题 (如: MALO · 吗喽)
      c.fillStyle = th.mainTitle;
      const nameFontSize = p.name.length > 8 ? 58 : 70;
      c.font = F(nameFontSize, 900);
      c.fillText(p.name, W / 2, 498);

      // 原型名言副标题
      c.fillStyle = th.subName;
      c.font = F(20, 700);
      const subQuote = p.intro ? `“${p.intro}”` : (p.archetype || '');
      c.fillText(subQuote, W / 2, 532);

      tagY = 562;
      cardY = 642;
    } else if (isMbti) {
      // MBTI 官方 16 人格头像徽章
      const artX = W / 2, artY = 348, artR = 62;
      const grad = c.createRadialGradient(artX, artY, 12, artX, artY, artR + 14);
      grad.addColorStop(0, p.color + (isLight ? '40' : '55'));
      grad.addColorStop(0.75, p.color + (isLight ? '08' : '12'));
      grad.addColorStop(1, 'transparent');
      c.fillStyle = grad;
      c.beginPath(); c.arc(artX, artY, artR + 14, 0, Math.PI * 2); c.fill();

      c.fillStyle = th.artBg;
      c.beginPath(); c.arc(artX, artY, artR, 0, Math.PI * 2); c.fill();
      c.strokeStyle = th.artStroke; c.lineWidth = 2; c.stroke();

      let artImg = currentResultImg;
      if (!artImg || !artImg.complete || !(artImg.naturalWidth || artImg.width)) {
        const domImg = $('cardArt') ? $('cardArt').querySelector('img') : null;
        if (domImg && domImg.complete && (domImg.naturalWidth || domImg.width)) {
          artImg = domImg;
        }
      }
      if (!artImg || !artImg.complete) {
        const fallbackSrc = MBTI_IMAGES[code] || p.imageFile;
        if (fallbackSrc) {
          const directImg = new Image();
          directImg.src = fallbackSrc;
          if (directImg.complete || directImg.naturalWidth || directImg.width) {
            artImg = directImg;
          }
        }
      }
      if (artImg) {
        c.save();
        c.beginPath(); c.arc(artX, artY, artR - 4, 0, Math.PI * 2); c.clip();
        drawCoverImage(c, artImg, artX - (artR - 4), artY - (artR - 4), (artR - 4) * 2, (artR - 4) * 2);
        c.restore();
      }

      // MBTI 代码 (如: INFP / INTJ)
      c.fillStyle = th.mainTitle;
      c.font = '950 78px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      c.fillText(code, W / 2, 488);

      // 人格称号 (如: 调停者 · 追光诗人)
      c.fillStyle = th.subName;
      c.font = F(26, 800);
      c.fillText(p.name, W / 2, 530);

      tagY = 562;
      cardY = 642;
    } else {
      if (currentDrinkImg && currentDrinkImg.complete) {
        const artX = W / 2, artY = 348, artR = 62;
        const grad = c.createRadialGradient(artX, artY, 12, artX, artY, artR + 14);
        grad.addColorStop(0, p.color + (isLight ? '40' : '55'));
        grad.addColorStop(0.75, p.color + (isLight ? '08' : '12'));
        grad.addColorStop(1, 'transparent');
        c.fillStyle = grad;
        c.beginPath(); c.arc(artX, artY, artR + 14, 0, Math.PI * 2); c.fill();

        c.fillStyle = th.artBg;
        c.beginPath(); c.arc(artX, artY, artR, 0, Math.PI * 2); c.fill();
        c.strokeStyle = th.artStroke; c.lineWidth = 2; c.stroke();

        const svgW = 100, svgH = 100;
        c.drawImage(currentDrinkImg, artX - svgW / 2, artY - svgH / 2, svgW, svgH);

        c.fillStyle = th.mainTitle;
        const nameFontSize = p.name.length > 8 ? 58 : 70;
        c.font = F(nameFontSize, 900);
        c.fillText(p.name, W / 2, 498);

        c.fillStyle = th.subName;
        c.font = F(24, 800);
        const drinkSub = p.archetype || (p.en ? p.en.toUpperCase() : '');
        if (drinkSub) c.fillText(drinkSub, W / 2, 538);

        tagY = 568;
        cardY = 648;
      } else {
        c.fillStyle = th.mainTitle;
        const nameFontSize = p.name.length > 8 ? 64 : 76;
        c.font = F(nameFontSize, 900);
        c.fillText(p.name, W / 2, 388);

        c.fillStyle = th.subName;
        c.font = F(28, 800);
        const drinkSub2 = p.archetype || (p.en ? p.en.toUpperCase() : '');
        if (drinkSub2) c.fillText(drinkSub2, W / 2, 442);

        tagY = 480;
        cardY = 570;
      }
    }

    // 标签
    const tagGap = 12, tagH = 46;
    c.font = F(20, 600);
    const tagWidths = p.tags.map(t => c.measureText(t).width + 36);
    const totalTagW = tagWidths.reduce((a, b) => a + b, 0) + tagGap * (p.tags.length - 1);
    let tagX = (W - totalTagW) / 2;
    p.tags.forEach((t, i) => {
      const w = tagWidths[i];
      c.fillStyle = th.tagBg;
      rr(c, tagX, tagY, w, tagH, 23); c.fill();
      c.strokeStyle = th.tagStroke; c.lineWidth = 1.5;
      rr(c, tagX, tagY, w, tagH, 23); c.stroke();
      c.fillStyle = th.tagTx;
      c.textAlign = 'center';
      c.fillText(t, tagX + w / 2, tagY + 30);
      tagX += w + tagGap;
    });

    // 配方卡片
    const cx = 100, cy = cardY, cw = W - 200, ch = 340;
    c.fillStyle = th.cardBg;
    rr(c, cx, cy, cw, ch, 30); c.fill();
    c.strokeStyle = th.cardStroke; c.lineWidth = 2;
    rr(c, cx, cy, cw, ch, 30); c.stroke();

    // 卡片表头
    c.textAlign = 'left';
    c.fillStyle = th.cardTx; c.font = F(24, 900);
    c.fillText(cfg.ingTitle, cx + 42, cy + 54);
    c.fillStyle = th.cardSub; c.font = F(18, 600);
    c.textAlign = 'right';
    c.fillText(cfg.ingSub, cx + cw - 42, cy + 54);

    c.strokeStyle = th.cardDiv; c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx + 42, cy + 76); c.lineTo(cx + cw - 42, cy + 76); c.stroke();

    // 配方行
    p.ingredients.forEach((x, i) => {
      const yy = cy + 128 + i * 50;
      c.textAlign = 'left';
      c.fillStyle = th.cardTx; c.font = F(22, 700);
      c.fillText(x.n, cx + 42, yy);
      c.fillStyle = th.barPct; c.font = F(26, 900);
      c.textAlign = 'right'; c.fillText(x.p + '%', cx + cw - 42, yy);
      c.textAlign = 'left';
      c.fillStyle = th.barTrack;
      rr(c, cx + 210, yy - 14, cw - 252, 10, 5); c.fill();
      c.fillStyle = th.barFill;
      rr(c, cx + 210, yy - 14, (cw - 252) * x.p / 100, 10, 5); c.fill();
    });

    // 语录
    const quoteY = cy + ch + 60;
    c.textAlign = 'center';
    c.fillStyle = th.quote; c.font = F(26, 700);
    const quoteText = p.quote || (p.intro ? `“${p.intro}”` : '');
    if (quoteText) c.fillText(quoteText, W / 2, quoteY);

    // 底部轴框
    const axesY = quoteY + 48, axesH = 300;
    if (th.axesBoxBg !== 'transparent') {
      c.fillStyle = th.axesBoxBg;
      rr(c, 100, axesY, W - 200, axesH, 30); c.fill();
    }
    c.strokeStyle = th.axesBoxStroke; c.lineWidth = 2;
    rr(c, 100, axesY, W - 200, axesH, 30); c.stroke();

    if (curTest === 'sbti') {
      c.fillStyle = th.axesTitle; c.font = F(24, 900);
      c.fillText('十 五 维 度 诊 断 矩 阵', W / 2, axesY + 44);

      const levels = (p && p.levels) || {};
      const colW = (W - 240) / 3;
      const startX = 120;
      const startY = axesY + 84;
      const rowH = 38;

      SBTI_DIMENSION_ORDER.forEach((dim, idx) => {
        const col = Math.floor(idx / 5);
        const row = idx % 5;
        const x = startX + col * colW;
        const y = startY + row * rowH;
        const meta = SBTI_DIMENSION_META[dim];
        const lvl = levels[dim] || 'M';

        // 维度名称
        c.textAlign = 'left';
        c.fillStyle = th.axesLabel;
        c.font = F(19, 700);
        c.fillText(`${meta.name}`, x + 6, y);

        // 徽章
        const badgeX = x + colW - 56;
        const badgeY = y - 18;
        const badgeW = 46, badgeH = 22;
        const lvlColor = lvl === 'H' ? '#4ade80' : (lvl === 'M' ? '#facc15' : '#94a3b8');
        const lvlBg = lvl === 'H' ? (isLight ? 'rgba(34,197,94,0.18)' : 'rgba(74,222,128,0.22)') :
                     (lvl === 'M' ? (isLight ? 'rgba(234,179,8,0.18)' : 'rgba(250,204,21,0.22)') :
                                    (isLight ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.22)'));
        c.fillStyle = lvlBg;
        rr(c, badgeX, badgeY, badgeW, badgeH, 11);
        c.fill();
        c.fillStyle = lvlColor;
        c.textAlign = 'center';
        c.font = F(14, 800);
        c.fillText(lvl, badgeX + badgeW / 2, badgeY + 16);
      });
    } else {
      c.fillStyle = th.axesTitle; c.font = F(24, 900);
      c.fillText(cfg.secTitleAxes || '四 维 成 分 轴', W / 2, axesY + 46);
      const axesList = cfg.axes || AXES_DRINK;
      axesList.forEach((ax, i) => {
        const l = counts[ax.lK], r = counts[ax.rK], tot = l + r || 1;
        const lp = Math.round(l / tot * 100), rp = 100 - lp;
        const yy = axesY + 98 + i * 46;
        c.textAlign = 'left'; c.fillStyle = th.axesLabel; c.font = F(22, 700);
        c.fillText(ax.l, 145, yy);
        c.textAlign = 'right';
        c.fillText(ax.r, W - 145, yy);
        c.textAlign = 'left';
        c.fillStyle = th.axesTrack;
        rr(c, 320, yy - 18, W - 640, 10, 5); c.fill();
        c.fillStyle = th.axesFill;
        rr(c, 320, yy - 18, (W - 640) * lp / 100, 10, 5); c.fill();
      });
    }

    // 底部印章
    c.textAlign = 'center';
    c.fillStyle = th.foot; c.font = F(20, 600);
    c.fillText(cfg.shareFoot, W / 2, axesY + axesH + 52);

    return cv;
  }

  async function saveShare() {
    SFX.save();
    const code = (persona && persona.code) || ((curTest === 'sbti') ? 'SBTI' : resolveCode());
    const isMbti = (curTest !== 'drink');

    if (curTest === 'drink') {
      if ((!currentDrinkImg || !currentDrinkImg.complete) && typeof DRINK_SVGS !== 'undefined' && DRINK_SVGS[code]) {
        await new Promise(res => {
          updateDrinkImage(code);
          if (currentDrinkImg) {
            currentDrinkImg.onload = res;
            currentDrinkImg.onerror = res;
            setTimeout(res, 200);
          } else {
            res();
          }
        });
      }
    } else {
      if (!currentResultImg || !currentResultImg.complete || !(currentResultImg.naturalWidth || currentResultImg.width)) {
        const domImg = $('cardArt') ? $('cardArt').querySelector('img') : null;
        if (domImg && domImg.complete && (domImg.naturalWidth || domImg.width)) {
          currentResultImg = domImg;
        } else {
          const imgSrc = (curTest === 'sbti') ? (SBTI_IMAGES[code] || persona.imageFile) : (MBTI_IMAGES[code] || persona.imageFile);
          if (imgSrc) {
            await new Promise(res => {
              loadResultImage(imgSrc, res);
              setTimeout(res, 250);
            });
          }
        }
      }
    }

    const cv = drawShareCard();
    const data = cv.toDataURL('image/png');
    if (window.AndroidBridge && AndroidBridge.saveImage) {
      AndroidBridge.saveImage(data);
    } else {
      const a = document.createElement('a');
      a.href = data;
      const pre = (curTest === 'sbti') ? `SBTI-${persona.code || code}-` : ((curTest !== 'drink') ? `MBTI-${code}-` : `Drink-${code}-`);
      a.download = pre + persona.name + '.png';
      a.click();
    }
  }

  /* ---------- 返回协议(支持原生返回与浏览器后退) ---------- */
  window.__dpCanGoBack = function () {
    if (cur === 'quiz') return true;
    if (cur === 'result') return true;
    return false;
  };
  window.__dpGoBack = function () {
    if (cur === 'quiz') {
      if (answers.length > 0) {
        undoAnswer();
        qIdx = answers.length;
        renderQuestion();
        SFX.back();
      } else {
        show('cover');
        SFX.back();
      }
    } else if (cur === 'result') {
      show('cover');
      SFX.back();
    }
  };

  /* ---------- 开关 ---------- */
  function refreshToggles() {
    $('tglSound').classList.toggle('off', !SFX.sound);
    $('tglVib').classList.toggle('off', !SFX.vibrate);
  }
  window.__syncDrinkSfx = function (enabled) {
    state.sound = !!enabled;
    store.set('dp_sound', !!enabled);
    refreshToggles();
  };

  /* ---------- 启动 ---------- */
  function init() {
    applyTheme(getTheme());
    makeBubbles();
    refreshToggles();

    // 默认初始化饮料人格测试
    setMode('drink');

    updateHistoryBadge();
    if (!window.UniversalHistory) {
      const btnHist = $('btnOpenHistory');
      if (btnHist) btnHist.addEventListener('click', showHistoryDrawer);
      const btnHistRes = $('btnResultHistory');
      if (btnHistRes) btnHistRes.addEventListener('click', showHistoryDrawer);
      const btnHistResPc = $('btnResultHistoryPc');
      if (btnHistResPc) btnHistResPc.addEventListener('click', showHistoryDrawer);
      const btnCloseHist = $('btnCloseHistory');
      if (btnCloseHist) btnCloseHist.addEventListener('click', hideHistoryDrawer);
      const backdropHist = $('historyBackdrop');
      if (backdropHist) backdropHist.addEventListener('click', hideHistoryDrawer);
      const btnClrHist = $('btnClearHistory');
      if (btnClrHist) btnClrHist.addEventListener('click', clearAllHistory);
    }


    $('btnStart').addEventListener('click', () => { SFX.pour(); startQuiz(); });

    $('btnTheme').addEventListener('click', toggleTheme);
    $('btnTheme2').addEventListener('click', toggleTheme);

    // 测验项目卡片点击/回车切换
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        setMode(card.dataset.mode);
        SFX.select();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setMode(card.dataset.mode);
          SFX.select();
        }
      });
    });

    // 切换测验项目按钮 (结果页返回封面重新选项目)
    document.querySelectorAll('.btn-mode-act').forEach(b => {
      b.addEventListener('click', () => {
        SFX.page();
        show('cover');
      });
    });

    document.querySelectorAll('.btn-save-act').forEach(b => {
      b.addEventListener('click', saveShare);
    });
    document.querySelectorAll('.btn-retry-act').forEach(b => {
      b.addEventListener('click', () => { SFX.pour(); startQuiz(); });
    });

    $('tglSound').addEventListener('click', () => { SFX.setSound(!SFX.sound); refreshToggles(); SFX.tap(); });
    $('tglVib').addEventListener('click', () => { SFX.setVibrate(!SFX.vibrate); refreshToggles(); });

    const btnBack = $('btnBack');
    if (btnBack) {
      btnBack.addEventListener('click', () => { window.__dpGoBack(); });
    }

    // 浏览器键盘快捷键支持 (桌面端体验增强，仅在特调灵魂馆模块激活且非输入框聚焦时生效)
    document.addEventListener('keydown', (e) => {
      const modalHist = $('modalHistory');
      if (modalHist && modalHist.classList.contains('open') && e.key === 'Escape') {
        hideHistoryDrawer();
        return;
      }
      const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) {
        return;
      }
      const activeMod = document.documentElement.dataset.activeModule;
      if (activeMod && activeMod !== 'drinks') {
        return;
      }
      if (cur === 'quiz') {
        const cfg = TESTS[curTest] || TESTS.drink;
        if (cfg.type === 'likert') {
          const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6 };
          if (e.key in keyMap) {
            const dots = $('quizOpts').querySelectorAll('.likert-dot');
            const idx = keyMap[e.key];
            if (dots[idx]) dots[idx].click();
          } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'ArrowLeft') {
            window.__dpGoBack();
          }
        } else {
          const keyMap = { '1': 0, 'a': 0, 'A': 0, '2': 1, 'b': 1, 'B': 1, '3': 2, 'c': 2, 'C': 2, '4': 3, 'd': 3, 'D': 3 };
          if (e.key in keyMap) {
            const opts = $('quizOpts').querySelectorAll('.opt');
            const idx = keyMap[e.key];
            if (opts[idx]) opts[idx].click();
          } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'ArrowLeft') {
            window.__dpGoBack();
          }
        }
      } else if (cur === 'cover') {
        if (e.key === '1') {
          setMode('drink');
          SFX.tap();
        } else if (e.key === '2') {
          setMode('sbti');
          SFX.tap();
        } else if (e.key === '3') {
          setMode('mbti_short');
          SFX.tap();
        } else if (e.key === '4') {
          setMode('mbti_form_m');
          SFX.tap();
        } else if (e.key === '5') {
          setMode('mbti_form_q');
          SFX.tap();
        } else if (e.key === 'Enter' || e.key === ' ') {
          $('btnStart').click();
        }
      } else if (cur === 'result' && (e.key === 'Escape' || e.key === 'Backspace')) {
        window.__dpGoBack();
      }
    });

    // 浏览器历史记录前进后退兼容
    window.addEventListener('popstate', () => {
      if (window.__dpCanGoBack()) {
        window.__dpGoBack();
      }
    });

    document.addEventListener('pointerdown', () => SFX.unlock(), { once: true });

    // 本地快速检阅支持：URL 参数 ?drink=ESTP / ?sbti=MALO 或控制台 window.previewDrink('ESTP') / window.previewSbti('MALO')
    window.previewDrink = previewDrink;
    window.previewMbti = previewMbti;
    window.previewSbti = previewSbti;
    window.drawShareCard = drawShareCard;
    const urlParams = new URLSearchParams(window.location.search);
    const sbtiParam = (urlParams.get('sbti') || '').toUpperCase();
    const mbtiParam = (urlParams.get('mbti') || '').toUpperCase();
    const debugCode = (urlParams.get('drink') || urlParams.get('test') || '').toUpperCase();
    if (sbtiParam) {
      previewSbti(sbtiParam);
    } else if (mbtiParam && PERSONAS_MBTI[mbtiParam]) {
      previewMbti(mbtiParam);
    } else if (debugCode && PERSONAS_DRINK[debugCode]) {
      previewDrink(debugCode);
    } else {
      show('cover');
    }
    if (urlParams.get('autocard')) {
      setTimeout(() => {
        try {
          const cv = drawShareCard();
          const d = cv.toDataURL('image/png');
          const img = document.createElement('img');
          img.id = 'shareCardAutoImg';
          img.src = d;
          img.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:contain;z-index:999999;background:#000;';
          document.body.appendChild(img);
        } catch (e) {
          console.error('autocard error', e);
        }
      }, 300);
    }
  }

  init();
})();


if ('serviceWorker' in navigator) {
  // 关键：首次访问时 SW 尚未接管页面，install -> activate -> clients.claim()
  // 必然触发一次 controllerchange。若不加 hadController 判断，
  // 每个新访客都会被强制 location.reload()，整站资源下载两遍
  // （实测 24s 下载 x2 = 48.9s）。
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;   // 首次接管，不是版本更新，无需刷新
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
