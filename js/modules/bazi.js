/**
 * 生辰八字命理全景命盘 (Cyber BaZi Horoscope)
 * 依赖: 6tail/lunar-javascript (MIT) 与 bazi-cities.js
 * 涵盖：
 * 1. 真太阳时经度校准 (全国 34 省市、370+ 地级市县联动、模糊检索、GPS定位、自定义经度)
 * 2. 命格核心速览 (太长不看版，通俗大白话一眼看懂)
 * 3. 五行能量占比雷达与缺啥补啥开运方案
 * 4. 严格水平对齐的四柱八字神机表格与神煞三垣
 * 5. 当代打工人深度白话专题 (搞钱财运 / 职场事业 / 情感正缘 / 健康精力)
 * 6. 步步大运轮盘 (自动高亮当前所处大运) & 袁天罡称骨命书
 * 7. 1080×1920 烫金朱砂宣纸全景长图一键导出
 */
(function() {
  'use strict';

  // 天干五行对应
  const GAN_WUXING = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水'
  };

  // 地支主气五行与生肖图标
  const ZHI_MAIN_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水'
  };

  const ZHI_ZODIAC = {
    '子': { name: '鼠', icon: '🐭' },
    '丑': { name: '牛', icon: '🐂' },
    '寅': { name: '虎', icon: '🐯' },
    '卯': { name: '兔', icon: '🐰' },
    '辰': { name: '龙', icon: '🐲' },
    '巳': { name: '蛇', icon: '🐍' },
    '午': { name: '马', icon: '🐴' },
    '未': { name: '羊', icon: '🐐' },
    '申': { name: '猴', icon: '🐒' },
    '酉': { name: '鸡', icon: '🐔' },
    '戌': { name: '狗', icon: '🐶' },
    '亥': { name: '猪', icon: '🐷' }
  };

  // 十神白话通俗标签
  const SHISHEN_HUMAN_TAG = {
    '比肩': '同伴帮衬/自立',
    '劫财': '竞争博弈/开拓',
    '食神': '才华口才/温和',
    '伤官': '叛逆创新/才思',
    '偏财': '副业机遇/商机',
    '正财': '稳健薪资/务实',
    '七杀': '魄力权柄/果敢',
    '正官': '组织威信/自律',
    '偏印': '偏门灵感/玄思',
    '正印': '长辈贵人/学识',
    '日主': '命主元神★'
  };

  // 夫妻宫地支特征画像
  const SPOUSE_PALACE_TRAITS = {
    '子': { appearance: '清秀白皙、五官端正、眼神灵动聪慧', character: '机智敏捷、心思细腻、有幽默感，但情绪波动稍大，喜被夸赞。' },
    '丑': { appearance: '敦厚稳健、身材匀称、气质沉静踏实', character: '任劳任怨、忠诚顾家、不善言辞却极具行动力，有时略显倔强执拗。' },
    '寅': { appearance: '身材高挑挺拔、英姿飒爽、气场阳光自信', character: '正直豪爽、有领导魄力、敢作敢当，自尊心强，喜欢占主导地位。' },
    '卯': { appearance: '眉清目秀、身材修长苗条、气质斯文温润', character: '温柔善良、心思玲珑、极富艺术美感同理心，依赖心较强，需安全感。' },
    '辰': { appearance: '相貌端庄大方、骨骼匀称、自带贵气威仪', character: '格局宏大、富有抱负、善于谋划，内心极有主见，不喜受制于人。' },
    '巳': { appearance: '眼神深邃明亮、五官立体、气质热情迷人', character: '聪明敏锐、善于观察、防备心初时较重，动情后极其专一炽热。' },
    '午': { appearance: '面色红润阳光、笑容灿烂、充满青春活力', character: '性格开朗爽直、急公好义、爱憎分明，行事雷厉风行但偶尔欠缺耐心。' },
    '未': { appearance: '面相和善柔美、身段丰满匀称、气质亲和随和', character: '隐忍包容、顾家体贴、重感情讲义气，容易心软吃暗亏。' },
    '申': { appearance: '肤色白皙、轮廓分明、英气勃发动作敏捷', character: '幽默风趣、善于社交应酬、思维开阔，但性急且喜新鲜事物。' },
    '酉': { appearance: '五官极为精致秀美、皮肤白皙、衣品极佳注重形象', character: '追求完美、条理清晰、讲究品质细节，嘴硬心软，受不得冷落。' },
    '戌': { appearance: '相貌质朴周正、身姿稳健、给人强烈信赖感', character: '忠诚可靠、重情重义、极具责任担当，虽少浪漫甜言但能托付终身。' },
    '亥': { appearance: '体态丰盈饱满、皮肤水润、面相慈祥和善', character: '心胸宽阔、随和不计较、享受生活福禄，性情温厚但也偶有惰性。' }
  };

  // 袁天罡称骨歌数据表 (骨重与原版诗诀 + 白话解读)
  const BONE_WEIGHT_POEMS = {
    '2.1': { poem: '短命非业谓大略，平生浪费用心机。殃及骨肉无情意，借问此命谁可期。', interp: '幼年需多积福，行事宜低调稳健，宜厚德载物。' },
    '2.2': { poem: '身寒骨冷苦伶仃，此命推来行乞人。劳劳碌碌无度日，中年衣食尚难称。', interp: '早年多波折，宜习得一技之长立身，脚踏实地。' },
    '2.3': { poem: '此命推来骨肉轻，求谋做事事难成。妻儿兄弟实难靠，独自移居改姓行。', interp: '宜出外发展，靠自身坚韧破局，广结善缘。' },
    '2.4': { poem: '此命推来福禄无，门庭困苦总难荣。六亲骨肉皆无靠，流落他乡作老翁。', interp: '白手起家之格，宜少攀比，专注于专业手艺技能。' },
    '2.5': { poem: '此命推来祖业微，门庭萧条少光辉。一生作事多颠沛，到老何曾饱暖归。', interp: '早岁奔波劳碌，宜注重养生与内求安宁。' },
    '2.6': { poem: '平生衣禄苦中求，独自营谋事不休。离祖出门宜早计，晚来衣禄始无忧。', interp: '动中求财之格，适合离开出生地去沿海或大城市开拓。' },
    '2.7': { poem: '一生作事少商量，难靠祖宗作主张。独马单枪空做去，早年晚岁总无长。', interp: '性格刚强果决，宜多听取他人中肯建议，避免孤军奋战。' },
    '2.8': { poem: '一生行事似飘蓬，祖宗产业在梦中。若不过房改姓氏，也当移徒二三通。', interp: '适合变动性强的行业，多走动、多搬迁反能转运。' },
    '2.9': { poem: '初年运限未曾亨，纵有功名在后成。须过四旬方可好，移居改姓始为良。', interp: '大器晚成之格，前期的所有踩坑都是后期的垫脚石。' },
    '3.0': { poem: '劳劳碌碌苦中求，东奔西走何日休。若使终身勤与俭，老来衣食免忧愁。', interp: '勤劳致富典型，善于精打细算，晚景丰足安康。' },
    '3.1': { poem: '忙忙碌碌苦中求，何日云开见日头。难得祖基家可立，中年衣食渐能周。', interp: '三十五岁后运势渐开，稳扎稳打必有丰厚回报。' },
    '3.2': { poem: '初年运蹇事难谋，渐有财源如水流。到得中年衣食旺，那时名利一齐收。', interp: '先苦后甜，中年财库大开，事业水到渠成。' },
    '3.3': { poem: '早年做事事难成，百年勤劳枉费心。半世自谋独自立，晚年衣禄始亨通。', interp: '前半生多磨砺心智，后半生智慧成熟，福禄绵延。' },
    '3.4': { poem: '此命福气果如何，僧道门中衣禄多。离祖出家方得好，终朝拜佛念弥陀。', interp: '心性慈悲具佛缘哲学根器，宜从事文化、教育、疗愈事业。' },
    '3.5': { poem: '生平福量不周全，祖业根基亦少传。营谋做事实难就，奔波劳碌过平生。', interp: '宜求稳守成，做好风险控制，知足常乐福自来。' },
    '3.6': { poem: '不须劳碌过平生，独自成家福不轻。早岁双亲难依靠，自成自立显门庭。', interp: '典型独立创富之命，虽少靠山但自身能力极强，光宗耀祖。' },
    '3.7': { poem: '此命般般事不成，弟兄少力自孤行。虽然祖业须微有，来得明时去得暗。', interp: '注重财物留存，切勿投机取巧，宜配置稳健资产。' },
    '3.8': { poem: '一身骨肉最清高，早入簧门姓名标。待到年将三十六，蓝衫脱去换红袍。', interp: '文昌贵人照命，利读书考学进大厂考公，三十六岁后大展宏图。' },
    '3.9': { poem: '此命少年运不通，劳心劳力功不成。但到三十九岁后，枯木逢春日日荣。', interp: '中年爆发力极强，三十九岁迎来黄金十年大运。' },
    '4.0': { poem: '平生衣禄是绵长，件件心中自主张。前面风霜多受过，后来必定享安康。', interp: '主见极强极有韧性，前半生积累后半生坐享其成。' },
    '4.1': { poem: '此命推来事不同，为人能干异凡庸。中年还有良运到，春到枝头始见红。', interp: '才华横溢不甘平庸，中年遇贵人提携，事业步步登高。' },
    '4.2': { poem: '得宽怀处且宽怀，何用双眉皱不开。若使中年命运济，那时名利自然来。', interp: '心宽体胖福气自生，莫要过度内耗，时来天地皆同力。' },
    '4.3': { poem: '为人心性最聪明，做事轩昂有才能。待到年逢四十二，名利双收显门庭。', interp: '聪明伶俐领悟力极快，职场骨干核心，名利双收。' },
    '4.4': { poem: '万事由天莫强求，何须作事苦忧愁。如今贵人已出现，日后荣华不用忧。', interp: '命中自带天乙贵人，逢凶化吉，关键时刻必有人拉一把。' },
    '4.5': { poem: '名利推来竟若何，前番辛苦后奔波。命中早注休嗟叹，晚景荣华福禄多。', interp: '晚年福泽极其深厚，儿孙孝顺，财富传承有方。' },
    '4.6': { poem: '东西南北尽皆通，出姓移居更觉隆。衣禄无亏天数定，中年晚景一般同。', interp: '四方皆可通达，天生适合做国际贸易、互联网出海、异地开拓。' },
    '4.7': { poem: '此命推来旺末年，妻荣子贵自怡然。平生原有滔滔福，可有荣华在后天。', interp: '旺相之命，家庭和睦相濡以沫，晚年生活滋润怡然自得。' },
    '4.8': { poem: '初年运道未曾通，几许嗟叹在其中。兄弟六亲少助力，一生事业晚年成。', interp: '独立自主典范，越老越吃香，晚年威望极高。' },
    '4.9': { poem: '此命推来福不轻，自成自立显门庭。从来富贵人钦敬，使婢差奴过一生。', interp: '大富大贵之相，领袖统御之才，能带团队成大事业。' },
    '5.0': { poem: '为人心性最公道，作事轩昂有胆量。前程自有荣华在，一生衣禄自康强。', interp: '为人正直深得人心，财官两旺，一生身体健朗福寿双全。' },
    '5.1': { poem: '一世荣华事事通，不须劳碌自亨通。兄弟叔侄皆如意，家业丰盈自称翁。', interp: '顺风顺水锦鲤之命，家族助力大，家底丰厚。' },
    '5.2': { poem: '一世亨通事事能，不须劳苦自然宁。宗族欣然心皆好，家业丰盈自称翁。', interp: '天生福相贵气逼人，不费吹灰之力常得机缘眷顾。' },
    '5.3': { poem: '此格推来气象真，兴家立业在其中。一生福禄安排定，却是有财又有荣。', interp: '兴家旺族栋梁之材，财库充盈，社会地位卓越。' },
    '5.4': { poem: '此命推来厚且坚，谋事成名在眼前。富贵荣华天注定，五谷丰登庆丰年。', interp: '福厚禄重厚积薄发，名利皆收，一生衣食丰盈无忧。' },
    '5.5': { poem: '策马扬鞭步步高，前程万里任逍遥。名显高门人钦敬，晚景荣华更自豪。', interp: '事业步步高升，前程无量，声名显赫受人景仰。' },
    '5.6': { poem: '此格推来礼义通，一身福禄用无穷。甜酸苦辣皆尝过，财源滚滚晚景荣。', interp: '阅历丰富见识卓远，吃过苦更享得住滔天富贵。' },
    '5.7': { poem: '福禄丰盈万事全，一身荣耀乐天年。名扬四海人钦仰，富贵双全在晚年。', interp: '名扬四海之造，声誉财富兼备，乐享天年。' },
    '5.8': { poem: '平生衣禄自然来，名利兼全福寿偕。初年运限虽平稳，晚岁荣华富贵开。', interp: '平稳上升长青之树，越往后走越顺遂富贵。' },
    '5.9': { poem: '细推此命福不轻，安居乐业度生平。名利二字早成就，日后荣华自称英。', interp: '早慧成名典型，三十岁前立威立德，中晚年悠游自得。' },
    '6.0': { poem: '一朝金榜快题名，显姓扬名立大勋。若遇吉人天相助，日后荣华不用惊。', interp: '仕途文贵大吉，极具统御才能与高级管理天赋。' },
    '6.1': { poem: '不作朝中金榜客，定是世上大财翁。聪明才智超群类，富贵荣华显祖宗。', interp: '不是体制高官，必为商界巨贾！智商格局超凡脱俗。' },
    '6.2': { poem: '此命生来福不穷，读书必定显亲宗。紫衣玉带为卿相，富贵荣华极品隆。', interp: '极品贵格，天生将相之材，功成名就福泽万民。' },
    '6.3': { poem: '命主为官福禄长，得来富贵实非常。名题金榜传天下，荣华富贵寿元长。', interp: '福寿禄三全，位高权重威名远播。' },
    '6.4': { poem: '此格威权不可当，紫袍金带坐高堂。荣华富贵谁能及，积玉堆金满库仓。', interp: '大权独揽富甲一方，威望崇隆财库万仓。' },
    '6.5': { poem: '细推此命福不轻，定国安邦极品人。文绣雕梁荣富贵，威名显赫震乾坤。', interp: '经天纬地治国安邦之大才，气吞山河。' },
    '6.6': { poem: '此格推来礼义通，一身福禄用无穷。甜酸苦辣皆尝过，财源滚滚晚景荣。', interp: '福禄无限大智若愚，晚年更达圆融大化之境。' },
    '6.7': { poem: '冠世之才实奇特，名扬四海天下知。官居极品享荣华，富贵人间第一流。', interp: '人间第一流格局，天命所归，旷世奇才。' },
    '6.8': { poem: '富贵由天莫苦求，万贯家财用不休。朝拜君王称上相，一生荣华足千秋。', interp: '千秋万载家业常青，世代富贵绵长。' },
    '6.9': { poem: '君是人间第一流，一身福禄更何求。紫袍玉带为卿相，富贵荣华在后头。', interp: '超凡入圣顶格贵造，福慧双全极贵之身。' },
    '7.0': { poem: '此命推来福不轻，不须劳碌自丰亨。天禄天然生福寿，富贵荣华显祖宗。', interp: '天生宿慧极福之造，享尽人间至福。' },
    '7.1': { poem: '此命生来大不同，公侯卿相在其中。一生自有高人敬，富贵荣华第一翁。', interp: '顶天立地帝王卿相之造，万众敬仰。' }
  };

  // 十天干日主（元神）性格画像与当代打工人解构
  const DAY_MASTER_ARCHETYPES = {
    '甲': {
      name: '甲木参天 · 坚韧领袖格',
      tags: ['👑 担当主心骨', '🌲 宁折不弯', '📈 长期主义', '💼 靠实力搞钱'],
      quote: '甲木参天，脱胎要火。春不容金，秋不容土。',
      personality: '犹如巍峨参天栋梁大树，仁慈直率、骨气刚健，宁折不弯。在团队中天然自带“主心骨”气质，极具责任担当，最讨厌耍小聪明与暗箱操作。',
      wealth: '财星为土。甲木克土为财，适合靠实打实的专业硬实力、平台影响力与长期主义搞钱，越稳重厚道财库越深。',
      career: '适合大厂技术总监、业务操盘手、教育科研、创业团队舵手。需防盲目死扛重担导致自身精力透支，学会适度柔韧借力。',
      love: '深情专一但表达内敛，甚至有些直男/直女思维。喜欢坦诚透明、能给彼此精神支撑的伴侣。',
      health: '甲木主肝胆与神经系统。工作压力大时易肝气郁结、头面偏头痛，需忌长期熬夜，多走向大自然疏通经络。'
    },
    '乙': {
      name: '乙木秀林 · 柔韧破局者',
      tags: ['🌿 柔韧通变', '💡 借势起飞', '🤝 人脉变现', '🎯 敏锐捕捉风口'],
      quote: '乙木虽柔，刲羊解牛。怀丁抱丙，跨凤乘猴。',
      personality: '犹如春日绿草花藤，柔韧敏锐、极具弹性与适应力。“野火烧不尽，春风吹又生”就是你的写照。表面温和谦逊，内心极为坚韧，最善于审时度势化解危机。',
      wealth: '擅长资源整合、人脉中介变现、副业投资与轻资产运营，总能在风口夹缝中发现搞钱暗道。',
      career: '公关传播、内容创意、产品运营、咨询商务的高段位操盘手。善于“藤萝系甲”抱大腿借大平台迅速崛起。',
      love: '体贴细腻情绪价值拉满，但有时容易陷入多愁善感。适合沉稳厚重、能给予确定安全感的对象。',
      health: '乙木主颈椎、四肢关节与筋骨。久坐易气血不畅，适合练八段锦、瑜伽，保持身体柔软通畅。'
    },
    '丙': {
      name: '丙火普照 · 活力开拓者',
      tags: ['☀️ 能量发光体', '⚡ 执行力极强', '🔥 敢想敢干', '📢 天生号召力'],
      quote: '丙火猛烈，欺霜傲雪。能成水火，化生万物。',
      personality: '犹如普照大地的烈日骄阳，热情爽朗、光明磊落、自带号召力。行事雷厉风行，不喜藏着掖着，走到哪里都是团队的氛围担当与士气引擎。',
      wealth: '财星为金。大开大合，敢想敢干，常在风口机遇中抓到大钱。需注意冲动消费与借钱给人，守财比赚财更关键。',
      career: '极适合市场开拓、品牌公关、演说带货、高管统御。天生不甘居人下，适合开拓性极强的先锋疆场。',
      love: '爱憎分明，喜欢一个人就倾其所有毫无保留。偶尔脾气急躁，需另一半如静水般包容化解。',
      health: '丙火主心脑血管与眼目。易内火旺盛、心浮气躁、口干舌燥，需常饮清热温水，戒烟少酒，忌大喜大悲。'
    },
    '丁': {
      name: '丁火烛照 · 灵秀智囊格',
      tags: ['💡 智谋军师', '🎯 灵感敏锐', '🛡️ 外柔内刚', '🔥 凭技艺生财'],
      quote: '丁火柔中，内性昭融。抱乙而孝，合壬而忠。',
      personality: '犹如黑夜中的烛光星火或高炉烈焰，外表温和文雅，内心极其敏锐深邃。洞察力堪称人形透视仪，擅长在复杂局面中抽丝剥茧洞见本质。',
      wealth: '擅长精密理财、技术复利、知识付费与细分赛道闷声发大财，不显山不露水却底仓雄厚。',
      career: '技术架构师、研究学者、战略军师、心理咨询师、独立创作者。夜间灵感格外迸发。',
      love: '慢热深情，看似平静如水，实则内热如火。一旦认定便是一生挚友与灵魂伴侣。',
      health: '丁火主体温调节与睡眠质量。思虑过密易心悸失眠、多梦浅眠，睡前切忌多刷手机，宜安神静心。'
    },
    '戊': {
      name: '戊土厚德 · 团队磐石格',
      tags: ['🏔️ 稳健可靠', '🛡️ 守财高手', '⚓ 定海神针', '🤝 一诺千金'],
      quote: '戊土固重，既中且正。静翕动辟，万物司命。',
      personality: '犹如巍峨昆仑大山，包容万物、稳如泰山、讲信誉守契约。别人慌张时你总能沉住气，行事稳扎稳打步步为营，让人感到极度安心可靠。',
      wealth: '财星为水。戊土克水为财，最懂守财与聚财，不动产与稳健分红型资产的绝佳持有者。',
      career: '大型机构骨干、财务风控、传统实业、供应链管理、重大项目总监。动荡环境下最显压舱石价值。',
      love: '忠诚踏实可靠，虽然不常说浪漫甜言蜜语，但行动上把对方照顾得无微不至。',
      health: '戊土主脾胃与消化系统。易因饮食不节消化不良或腹胀，需规律饮食，少吃生冷油腻，健脾养胃。'
    },
    '己': {
      name: '己土温润 · 协调巧匠格',
      tags: ['🌾 温厚包容', '🤝 高情商协调', '📊 稳扎稳打', '💰 细水长流'],
      quote: '己土卑湿，中正蓄藏。不愁木盛，不畏水狂。',
      personality: '犹如孕育万物的田园沃土，温厚包容、细腻周到、极富同理心。擅长在多方博弈中斡旋平衡，兼收并蓄，让人如沐春风。',
      wealth: '财源细水长流，擅长稳中求进搞多元收入，善于通过精细化运营与人情往来沉淀财富。',
      career: '人力资源、客户关系、行政运营、财务审计、设计策划。是团队中不可或缺的粘合剂。',
      love: '温柔顾家，能设身处地为对方着想。有时要学会明确表达自己的需求，别委屈自己。',
      health: '己土主腹部肠道与吸收功能。宜多饮温润汤饮，防湿气凝滞，适度慢跑发汗祛湿。'
    },
    '庚': {
      name: '庚金利刃 · 破局战神格',
      tags: ['⚔️ 披荆斩棘', '⚡ 执行力拉满', '🛡️ 讲义气护短', '🏹 敢打硬仗'],
      quote: '庚金带杀，刚健为最。得火而锐，逢水而清。',
      personality: '犹如出鞘寒光宝剑或矿山顽铁，果决刚毅、讲义气、讨厌拖泥带水。具有强大的破局执行力与斗争精神，直面困难绝不退缩。',
      wealth: '财星为木。庚金劈木引火，擅长在竞争激烈的蓝海或重组变革中快准狠拿下大单。',
      career: '销售总监、法务合规、军警执法、供应链攻坚、自主创业。危机时刻最值得托付的先锋战将。',
      love: '外刚内柔，嘴硬心软。外人面前独当一面，在伴侣面前却极为护短、男友/女友力爆棚。',
      health: '庚金主呼吸道、大肠与肺经。空气干燥时易咳嗽、咽干鼻塞，宜多食雪梨百合银耳润肺生津。'
    },
    '辛': {
      name: '辛金璀璨 · 典雅贵人格',
      tags: ['💎 追求极致', '✨ 审美洁癖', '👑 自尊心强', '🎨 专业溢价'],
      quote: '辛金软弱，温润而清。畏土之叠，乐水之盈。',
      personality: '犹如经过雕琢的钻石珠宝或温润金玉，天生对美感、品质与精神共鸣有极高要求。自尊心强，气质出众，行事优雅且极其注重细节把控。',
      wealth: '适合通过高溢价专业技能、品牌调性、高端定制或审美认知变现，不适合粗放型体力卷工。',
      career: '产品经理、UI/UX设计、媒体出版、珠宝奢侈品、高端医疗、品牌主理人。',
      love: '精神洁癖，宁缺毋滥。只有懂得欣赏你独特内在价值、同样自律优秀的人才能走进你的心。',
      health: '辛金主皮肤毛孔与呼吸系统。换季易皮肤过敏或气短乏力，需注重保湿防尘与肺部保养。'
    },
    '壬': {
      name: '壬水通河 · 浩瀚战略家',
      tags: ['🌊 海纳百川', '🌐 商业大格局', '⚡ 借势造势', '🚢 适合跨界开拓'],
      quote: '壬水通河，能泄金气。刚中之德，周流不滞。',
      personality: '犹如奔流不息的大江大河，胸襟开阔、灵动通达、极具宏观战略思维。适应力极强，随方就圆，不拘泥于死板规矩，有海纳百川的气魄。',
      wealth: '财星为火。水火既济，善于借势造势、捕捉周期机遇，具有极强的商业嗅觉与跨界变现能力。',
      career: '战略投资、国际金融、供应链物流、公关策划、CEO。天然适合在大江大浪中施展抱负。',
      love: '向往自由与灵魂共鸣，讨厌被条条框框束缚。能与你并肩看世界的伴侣最合心意。',
      health: '壬水主泌尿生殖系统与体液循环。防久坐阻滞下焦循环，多喝水，避免憋尿与受寒受凉。'
    },
    '癸': {
      name: '癸水朝霖 · 灵敏策士格',
      tags: ['💧 润物无声', '🔮 直觉超群', '🧠 幕后参谋', '📈 智慧复利'],
      quote: '癸水至弱，达于天津。得龙而运，功化斯神。',
      personality: '犹如滋润万物的晨露春雨或山涧清泉，柔和内敛、灵性极高、直觉敏锐过人。善于润物细无声地渗透影响周围人，善解人意，具有很强的艺术直觉。',
      wealth: '擅长以小博大、信息差套利、内容创作与智慧复利，常常能在别人看不懂的地方悄悄攒下小金库。',
      career: '心理学、艺术创作、数据分析、神秘学研究、创意策划。具有极强的情感感知力。',
      love: '细腻体贴极富牺牲奉献精神。需要学会多爱自己一点，寻找懂得珍惜你付出的靠谱伴侣。',
      health: '癸水主肾经、耳朵与元气储备。易精神疲乏、四肢发凉，宜早睡养肾，常热水泡脚温补元阳。'
    }
  };

  /* =========================================================
     五行缺失与喜用神调候开运锦囊
     ========================================================= */
  const WUXING_REMEDIES = {
    '木': {
      name: '木 (主仁爱 · 生发条达)',
      color: '青绿色、翠绿、薄荷绿、森林绿',
      dir: '正东方、东南方 (海滨江淮一带)',
      num: '3、8',
      food: '绿叶蔬菜、绿豆、猕猴桃、绿茶、茼蒿、西蓝花',
      stones: '天然绿幽灵、绿松石、沉香木手串、橄榄石',
      tip: '在工位左手方（青龙位）摆放阔叶多肉或绿萝水培；多晨起去公园散步，生发肝木之气。'
    },
    '火': {
      name: '火 (主力行 · 热情通明)',
      color: '红色、粉色、朱砂红、紫色、橙色',
      dir: '正南方 (华南、海南、阳光充沛之地)',
      num: '2、7',
      food: '番茄、红豆、红枣、枸杞、胡萝卜、山楂、苹果',
      stones: '天然红玛瑙、石榴石、红纹石、草莓晶、南红',
      tip: '办公桌可配置一盏护眼暖光台灯；多晒晒正午阳光，穿戴带红色/粉色的小内搭或手绳。'
    },
    '土': {
      name: '土 (主信实 · 承载厚重)',
      color: '黄色、米白色、卡其色、焦糖色、咖啡色',
      dir: '中央本地、西南方、东北方',
      num: '5、0',
      food: '小米、山药、南瓜、红薯、玉米、土豆、黄豆',
      stones: '黄水晶、和田黄玉、虎眼石、蜜蜡、陶土紫砂器',
      tip: '多去爬山亲近泥土大自然；工位摆放陶瓷水杯或紫砂小茶宠，稳定气场、减少浮躁。'
    },
    '金': {
      name: '金 (主义气 · 果断肃杀)',
      color: '白色、银色、浅灰色、香槟金、金属色',
      dir: '正西方、西北方 (内陆干爽高燥之地)',
      num: '4、9',
      food: '白萝卜、百合、银耳、梨、莲藕、杏仁、白芝麻',
      stones: '白水晶、月光石、银饰、铂金项链、黄铜机械键盘',
      tip: '穿着剪裁利落的白衬衫或西装外套；桌上可放金属闹钟或机械摆件，聚拢肃杀威仪。'
    },
    '水': {
      name: '水 (主智慧 · 灵动通达)',
      color: '黑色、藏青色、深海蓝、玄色、深灰',
      dir: '正北方 (环海滨水城市、北方水泽之地)',
      num: '1、6',
      food: '黑芝麻、黑豆、黑木耳、紫菜、海带、蓝莓、海鲜',
      stones: '黑曜石、海蓝宝、青金石、黑碧玺、蓝晶石',
      tip: '养成每日足量饮温水的好习惯；工位可摆小型加湿器或小水盆，助灵感如泉涌。'
    }
  };

  /* =========================================================
     八字神煞算法引擎 (Shensha System)
     ========================================================= */
  function calcShensha(bazi) {
    const dayGan = bazi.getDayGan();
    const yearGan = bazi.getYearGan();
    const yearZhi = bazi.getYearZhi();
    const dayZhi = bazi.getDayZhi();
    const monthZhi = bazi.getMonthZhi();
    const allZhis = [bazi.getYearZhi(), bazi.getMonthZhi(), bazi.getDayZhi(), bazi.getTimeZhi()];

    const result = [];

    // 天乙贵人
    const tianYiMap = {
      '甲': ['丑', '未'], '戊': ['丑', '未'],
      '乙': ['子', '申'], '己': ['子', '申'],
      '丙': ['亥', '酉'], '丁': ['亥', '酉'],
      '壬': ['卯', '巳'], '癸': ['卯', '巳'],
      '庚': ['寅', '午'], '辛': ['寅', '午']
    };
    const tyTargets = (tianYiMap[dayGan] || []).concat(tianYiMap[yearGan] || []);
    if (allZhis.some(z => tyTargets.includes(z))) {
      result.push({ name: '天乙贵人 ★★★★★', desc: '遇难成祥，关键时刻必有贵人扶持拉一把，逢凶化吉。' });
    }

    // 文昌贵人
    const wenChangMap = {
      '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
      '丁': '酉', '己': '酉', '庚': '亥', '辛': '子',
      '壬': '寅', '癸': '卯'
    };
    if (allZhis.includes(wenChangMap[dayGan]) || allZhis.includes(wenChangMap[yearGan])) {
      result.push({ name: '文昌贵人 ★★★★', desc: '利读书进修，考公考级利市，文思泉涌才华出众。' });
    }

    // 禄神
    const luMap = {
      '甲': '寅', '乙': '卯', '丙': '巳', '戊': '巳',
      '丁': '午', '己': '午', '庚': '申', '辛': '酉',
      '壬': '亥', '癸': '子'
    };
    if (allZhis.includes(luMap[dayGan])) {
      result.push({ name: '禄神入命 ★★★★', desc: '衣食无忧，食禄丰厚，自立自强有底气。' });
    }

    // 羊刃
    const yangRenMap = {
      '甲': '卯', '乙': '辰', '丙': '午', '戊': '午',
      '丁': '未', '己': '未', '庚': '酉', '辛': '戌',
      '壬': '子', '癸': '丑'
    };
    if (allZhis.includes(yangRenMap[dayGan])) {
      result.push({ name: '日坐羊刃/入刃 ★★★', desc: '性情刚毅果断，敢为人先，利竞争开创大业。' });
    }

    // 驿马
    const yiMaMap = {
      '申': '寅', '子': '寅', '辰': '寅',
      '寅': '申', '午': '申', '戌': '申',
      '巳': '亥', '酉': '亥', '丑': '亥',
      '亥': '巳', '卯': '巳', '未': '巳'
    };
    if (allZhis.includes(yiMaMap[yearZhi]) || allZhis.includes(yiMaMap[dayZhi])) {
      result.push({ name: '驿马星动 ★★★', desc: '宜出外发展，经常出差旅行或跨境开拓，动中求财大吉。' });
    }

    // 咸池桃花
    const taoHuaMap = {
      '申': '酉', '子': '酉', '辰': '酉',
      '寅': '卯', '午': '卯', '戌': '卯',
      '巳': '午', '酉': '午', '丑': '午',
      '亥': '子', '卯': '子', '未': '子'
    };
    if (allZhis.includes(taoHuaMap[yearZhi]) || allZhis.includes(taoHuaMap[dayZhi])) {
      result.push({ name: '咸池桃花 ★★★', desc: '容貌出众，情商高人缘极佳，自带亲和异性魅力。' });
    }

    // 华盖
    const huaGaiMap = {
      '申': '辰', '子': '辰', '辰': '辰',
      '寅': '戌', '午': '戌', '戌': '戌',
      '巳': '丑', '酉': '丑', '丑': '丑',
      '亥': '未', '卯': '未', '未': '未'
    };
    if (allZhis.includes(huaGaiMap[yearZhi]) || allZhis.includes(huaGaiMap[dayZhi])) {
      result.push({ name: '华盖入命 ★★★', desc: '悟性极高，具哲思玄学与艺术天赋，享受深度独处。' });
    }

    // 将星
    const jiangXingMap = {
      '申': '子', '子': '子', '辰': '子',
      '寅': '午', '午': '午', '戌': '午',
      '巳': '酉', '酉': '酉', '丑': '酉',
      '亥': '卯', '卯': '卯', '未': '卯'
    };
    if (allZhis.includes(jiangXingMap[yearZhi]) || allZhis.includes(jiangXingMap[dayZhi])) {
      result.push({ name: '将星当令 ★★★★', desc: '具领导组织才华，团队帅印担当，压得住大场面。' });
    }

    // 天德/月德贵人
    const tianDeMap = {
      '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
      '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
      '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
    };
    const allGans = [bazi.getYearGan(), bazi.getMonthGan(), bazi.getDayGan(), bazi.getTimeGan()];
    if (allGans.includes(tianDeMap[monthZhi])) {
      result.push({ name: '天德贵人 ★★★★', desc: '祖荫庇佑，心性慈祥仁爱，一生少灾多福。' });
    }

    return result;
  }

  /* =========================================================
     五行能量打分与日元强弱推算
     ========================================================= */
  function calcWuxingStats(bazi) {
    const scores = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

    // 天干各记 10 分
    const gans = [bazi.getYearGan(), bazi.getMonthGan(), bazi.getDayGan(), bazi.getTimeGan()];
    gans.forEach(g => {
      const wx = GAN_WUXING[g];
      if (wx) scores[wx] += 10;
    });

    // 月支（提纲司权）权重 30 分
    const mZhi = bazi.getMonthZhi();
    const mWx = ZHI_MAIN_WUXING[mZhi];
    if (mWx) scores[mWx] += 30;

    // 年、日、时地支各记 15 分
    const otherZhis = [bazi.getYearZhi(), bazi.getDayZhi(), bazi.getTimeZhi()];
    otherZhis.forEach(z => {
      const wx = ZHI_MAIN_WUXING[z];
      if (wx) scores[wx] += 15;
    });

    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const pcts = {};
    for (const k in scores) {
      pcts[k] = Math.round((scores[k] / total) * 100);
    }

    // 找出最弱缺失的五行
    let minWx = '水';
    let minVal = 999;
    for (const k of ['木', '火', '土', '金', '水']) {
      if (scores[k] < minVal) {
        minVal = scores[k];
        minWx = k;
      }
    }

    // 日主得令得助分析判定身强身弱
    const dayGan = bazi.getDayGan();
    const dayWx = GAN_WUXING[dayGan];

    const shengMe = {
      '木': '水', '火': '木', '土': '火', '金': '土', '水': '金'
    };
    const mySupporter = shengMe[dayWx];
    const selfEnergy = (scores[dayWx] || 0) + (scores[mySupporter] || 0);
    const isStrong = (selfEnergy / total) >= 0.44;

    let strengthStr = '';
    let strengthSub = '';
    let xiYong = [];
    let jiShen = [];

    if (isStrong) {
      strengthStr = '身旺 (日元能量厚重)';
      strengthSub = '得令得地得势，自身元气充沛，抗压耐磨，能挑大梁担大财。';
      // 身旺宜克泄耗（财、官、食伤）
      const keMe = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
      const woKe = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
      const woSheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
      xiYong = [woSheng[dayWx], woKe[dayWx], keMe[dayWx]].filter((v, i, a) => a.indexOf(v) === i);
      jiShen = [mySupporter, dayWx];
    } else {
      strengthStr = '身弱 (日元宜印比生扶)';
      strengthSub = '心思灵敏善解人意，但偶尔精力易透支，宜借大平台借势或团队合作。';
      // 身弱宜生扶（印星、比劫）
      xiYong = [mySupporter, dayWx];
      const keMe = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
      const woKe = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
      jiShen = [keMe[dayWx], woKe[dayWx]];
    }

    const primaryXi = xiYong[0] || '木';
    const remedy = WUXING_REMEDIES[primaryXi] || WUXING_REMEDIES['木'];
    const deficientRemedy = WUXING_REMEDIES[minWx] || WUXING_REMEDIES['水'];

    return {
      scores,
      pcts,
      isStrong,
      strength: strengthStr,
      strengthSub,
      xiYong,
      jiShen,
      primaryXi,
      minWx,
      minVal,
      remedy,
      deficientRemedy
    };
  }

  /* =========================================================
     袁天罡称骨两钱推算 (Bone Weight Calculator)
     ========================================================= */
  function calcBoneWeight(lunar) {
    const yearWeights = {
      '甲子': 12, '乙丑': 9, '丙寅': 6, '丁卯': 7, '戊辰': 12, '己巳': 5, '庚午': 9, '辛未': 8, '壬申': 7, '癸酉': 8,
      '甲戌': 15, '乙亥': 9, '丙子': 16, '丁丑': 8, '戊寅': 8, '己卯': 19, '庚辰': 12, '辛巳': 6, '壬午': 8, '癸未': 7,
      '甲申': 5, '乙酉': 15, '丙戌': 6, '丁亥': 16, '戊子': 15, '己丑': 7, '庚寅': 9, '辛卯': 12, '壬辰': 10, '癸巳': 7,
      '甲午': 15, '乙未': 6, '丙申': 5, '丁酉': 14, '戊戌': 14, '己亥': 9, '庚子': 7, '辛丑': 7, '壬寅': 9, '癸卯': 12,
      '甲辰': 8, '乙巳': 7, '丙午': 13, '丁未': 5, '戊申': 14, '己酉': 5, '庚戌': 9, '辛亥': 17, '壬子': 5, '癸丑': 7,
      '甲寅': 12, '乙卯': 8, '丙辰': 8, '丁巳': 6, '戊午': 19, '己未': 6, '庚申': 8, '辛酉': 16, '壬戌': 10, '癸亥': 6
    };
    const monthWeights = [6, 7, 18, 9, 5, 16, 9, 15, 18, 8, 9, 5];
    const dayWeights = [
      5, 10, 8, 15, 16, 15, 8, 16, 8, 16,
      9, 17, 8, 17, 10, 8, 9, 18, 5, 15,
      10, 9, 8, 9, 15, 18, 7, 8, 16, 6
    ];
    const hourWeights = {
      '子': 16, '丑': 6, '寅': 7, '卯': 10,
      '辰': 9, '巳': 16, '午': 10, '未': 8,
      '申': 8, '酉': 9, '戌': 11, '亥': 6
    };

    const gzYear = lunar.getYearInGanZhi();
    const wYear = yearWeights[gzYear] || 10;
    const m = Math.min(Math.max(Math.abs(lunar.getMonth()), 1), 12);
    const wMonth = monthWeights[m - 1] || 8;
    const d = Math.min(Math.max(lunar.getDay(), 1), 30);
    const wDay = dayWeights[d - 1] || 10;
    const zHour = lunar.getTimeZhi();
    const wHour = hourWeights[zHour] || 10;

    const total = (wYear + wMonth + wDay + wHour) / 10;
    const liang = Math.floor(total);
    const qian = Math.round((total - liang) * 10);
    const key = `${liang}.${qian}`;

    const poemData = BONE_WEIGHT_POEMS[key] || {
      poem: '此命推来福气绵，平生作事多有缘。若遇贵人来相助，锦上添花显门前。',
      interp: '天资聪慧有福禄，善于借力贵人，中年后渐入佳境。'
    };

    return {
      weightStr: `${liang}两${qian}钱`,
      weightVal: total,
      poem: poemData.poem,
      interp: poemData.interp
    };
  }

  /* =========================================================
     核心数据解析与排盘执行
     ========================================================= */
  let currentBaziResult = null;

  function runBazi(options) {
    if (typeof window.Solar === 'undefined' || typeof window.Lunar === 'undefined') {
      console.error('lunar-javascript library not loaded!');
      return null;
    }

    const isLunar = !!options.isLunar;
    let y = parseInt(options.year, 10) || 1998;
    let m = parseInt(options.month, 10) || 8;
    let d = parseInt(options.day, 10) || 18;
    let h = parseInt(options.hour, 10) || 12;
    let min = parseInt(options.minute, 10) || 0;
    const gender = parseInt(options.gender, 10) === 0 ? 0 : 1; // 1: 乾造(男), 0: 坤造(女)

    // 真太阳时经度时差校准
    let solarOffsetMinutes = 0;
    if (options.useSolarTime) {
      if (options.customLng !== undefined && !isNaN(options.customLng)) {
        solarOffsetMinutes = (options.customLng - 120) * 4;
      } else if (options.solarLng !== undefined && !isNaN(options.solarLng)) {
        solarOffsetMinutes = (options.solarLng - 120) * 4;
      }
    }

    let solarDate;
    if (isLunar) {
      try {
        // 校验农历月份与闰月有效性
        let validM = m;
        if (typeof window.LunarYear !== 'undefined') {
          const ly = window.LunarYear.fromYear(y);
          const leap = ly.getLeapMonth();
          if (m < 0 && Math.abs(m) !== leap) {
            validM = Math.abs(m);
          }
        }
        let validD = d;
        if (typeof window.LunarMonth !== 'undefined') {
          try {
            const lm = window.LunarMonth.fromYm(y, validM);
            if (lm && validD > lm.getDayCount()) {
              validD = lm.getDayCount();
            }
          } catch (e) {}
        }
        const lunar = window.Lunar.fromYmdHms(y, validM, validD, h, min, 0);
        solarDate = lunar.getSolar();
      } catch (err) {
        console.warn('农历日期换算异常，自动校正降级:', err);
        const safeM = Math.min(12, Math.max(1, Math.abs(m)));
        const safeD = Math.min(28, Math.max(1, d));
        try {
          const lunar = window.Lunar.fromYmdHms(y, safeM, safeD, h, min, 0);
          solarDate = lunar.getSolar();
        } catch (e2) {
          solarDate = window.Solar.fromYmdHms(y, safeM, safeD, h, min, 0);
        }
      }
    } else {
      const safeM = Math.min(12, Math.max(1, m));
      const maxD = new Date(y, safeM, 0).getDate();
      const safeD = Math.min(maxD, Math.max(1, d));
      solarDate = window.Solar.fromYmdHms(y, safeM, safeD, h, min, 0);
    }

    // 应用真太阳时偏移
    if (solarOffsetMinutes !== 0) {
      const ts = new Date(solarDate.getYear(), solarDate.getMonth() - 1, solarDate.getDay(), solarDate.getHour(), solarDate.getMinute(), 0).getTime();
      const adjustedDate = new Date(ts + solarOffsetMinutes * 60 * 1000);
      solarDate = window.Solar.fromYmdHms(
        adjustedDate.getFullYear(),
        adjustedDate.getMonth() + 1,
        adjustedDate.getDate(),
        adjustedDate.getHours(),
        adjustedDate.getMinutes(),
        0
      );
    }

    const finalLunar = solarDate.getLunar();
    const eightChar = finalLunar.getEightChar();

    // 四柱数据
    const pillars = [
      {
        title: '时柱',
        scope: '晚景 · 归宿 (49岁后)',
        gan: eightChar.getTimeGan(),
        zhi: eightChar.getTimeZhi(),
        gz: eightChar.getTime(),
        shishenGan: eightChar.getTimeShiShenGan(),
        diShi: eightChar.getTimeDiShi(),
        nayin: eightChar.getTimeNaYin(),
        xunKong: eightChar.getTimeXunKong(),
        hideGan: eightChar.getTimeHideGan()
      },
      {
        title: '日柱',
        scope: '自身 · 夫妻 (33-48岁)',
        gan: eightChar.getDayGan(),
        zhi: eightChar.getDayZhi(),
        gz: eightChar.getDay(),
        shishenGan: '日主 (元神)',
        diShi: eightChar.getDayDiShi(),
        nayin: eightChar.getDayNaYin(),
        xunKong: eightChar.getDayXunKong(),
        hideGan: eightChar.getDayHideGan()
      },
      {
        title: '月柱',
        scope: '事业 · 职场提纲 (17-32岁)',
        gan: eightChar.getMonthGan(),
        zhi: eightChar.getMonthZhi(),
        gz: eightChar.getMonth(),
        shishenGan: eightChar.getMonthShiShenGan(),
        diShi: eightChar.getMonthDiShi(),
        nayin: eightChar.getMonthNaYin(),
        xunKong: eightChar.getMonthXunKong(),
        hideGan: eightChar.getMonthHideGan()
      },
      {
        title: '年柱',
        scope: '祖荫 · 幼年家境 (1-16岁)',
        gan: eightChar.getYearGan(),
        zhi: eightChar.getYearZhi(),
        gz: eightChar.getYear(),
        shishenGan: eightChar.getYearShiShenGan(),
        diShi: eightChar.getYearDiShi(),
        nayin: eightChar.getYearNaYin(),
        xunKong: eightChar.getYearXunKong(),
        hideGan: eightChar.getYearHideGan()
      }
    ];

    const dayGan = eightChar.getDayGan();
    const dayZhi = eightChar.getDayZhi();
    const archetype = DAY_MASTER_ARCHETYPES[dayGan] || DAY_MASTER_ARCHETYPES['甲'];
    const spouseTrait = SPOUSE_PALACE_TRAITS[dayZhi] || SPOUSE_PALACE_TRAITS['子'];

    const shenshaList = calcShensha(eightChar);
    const wuxingData = calcWuxingStats(eightChar);
    const boneData = calcBoneWeight(finalLunar);

    // 大运推演
    const yun = eightChar.getYun(gender, 1);
    const rawDaYun = yun.getDaYun(8);
    const currentYear = new Date().getFullYear();
    const birthYear = solarDate.getYear();
    const currentAge = Math.max(1, currentYear - birthYear + 1);

    const daYunList = rawDaYun.map(dy => {
      const startAge = dy.getStartAge();
      const endAge = dy.getEndAge();
      const isCurrent = currentAge >= startAge && currentAge <= endAge;
      return {
        startAge,
        endAge,
        startYear: dy.getStartYear(),
        gz: dy.getGanZhi(),
        isCurrent
      };
    });

    const result = {
      solarStr: `${solarDate.getYear()}年${solarDate.getMonth()}月${solarDate.getDay()}日 ${String(solarDate.getHour()).padStart(2, '0')}:${String(solarDate.getMinute()).padStart(2, '0')}`,
      lunarStr: `农历${finalLunar.getYearInGanZhi()}年 ${finalLunar.getMonthInChinese()}月${finalLunar.getDayInChinese()} ${finalLunar.getTimeZhi()}时 (${finalLunar.getYearShengXiao()}年)`,
      genderStr: gender === 1 ? '乾造 (男命)' : '坤造 (女命)',
      eightCharStr: `${eightChar.getYear()} ${eightChar.getMonth()} ${eightChar.getDay()} ${eightChar.getTime()}`,
      dayGan,
      dayZhi,
      taiYuan: eightChar.getTaiYuan(),
      mingGong: eightChar.getMingGong(),
      shenGong: eightChar.getShenGong(),
      pillars,
      shenshaList,
      wuxingData,
      boneData,
      archetype,
      spouseTrait,
      startYunYear: yun.getStartYear(),
      startYunMonth: yun.getStartMonth(),
      daYunList,
      rawOptions: options
    };

    currentBaziResult = result;
    return result;
  }

  /* =========================================================
     DOM 渲染展示
     ========================================================= */
  function getWxColorClass(char) {
    const wx = GAN_WUXING[char] || ZHI_MAIN_WUXING[char];
    if (wx === '木') return 'wx-mu';
    if (wx === '火') return 'wx-huo';
    if (wx === '土') return 'wx-tu';
    if (wx === '金') return 'wx-jin';
    if (wx === '水') return 'wx-shui';
    return '';
  }

  function getWxBgClass(wx) {
    if (wx === '木') return 'bg-wx-mu';
    if (wx === '火') return 'bg-wx-huo';
    if (wx === '土') return 'bg-wx-tu';
    if (wx === '金') return 'bg-wx-jin';
    if (wx === '水') return 'bg-wx-shui';
    return '';
  }

  function renderResult(res, shouldScroll = false) {
    if (!res) return;

    const stage = document.getElementById('bzResultStage');
    if (!stage) return;
    stage.classList.add('active');

    // ZONE 1: 🌟 命格核心速览 (太长不看版)
    const elVerdictTitle = document.getElementById('bzVerdictTitle');
    const elVerdictTags = document.getElementById('bzVerdictTags');
    const elVerdictMaster = document.getElementById('bzVerdictMaster');
    const elVerdictStrength = document.getElementById('bzVerdictStrength');
    const elVerdictXiYong = document.getElementById('bzVerdictXiYong');
    const elVerdictDeficit = document.getElementById('bzVerdictDeficit');
    const elVerdictQuote = document.getElementById('bzVerdictQuote');

    if (elVerdictTitle) elVerdictTitle.textContent = `${res.archetype.name} · ${res.boneData.weightStr}`;
    if (elVerdictTags) {
      elVerdictTags.innerHTML = res.archetype.tags.map(t => `<span class="bz-verdict-tag">${t}</span>`).join('');
    }
    if (elVerdictMaster) {
      elVerdictMaster.textContent = `${res.dayGan}${GAN_WUXING[res.dayGan]} · 坐${res.dayZhi}${ZHI_MAIN_WUXING[res.dayZhi]}`;
    }
    if (elVerdictStrength) {
      elVerdictStrength.textContent = res.wuxingData.strength;
    }
    if (elVerdictXiYong) {
      elVerdictXiYong.textContent = res.wuxingData.xiYong.join('、');
    }
    if (elVerdictDeficit) {
      const minTxt = res.wuxingData.scores[res.wuxingData.minWx] === 0 ? `极度缺【${res.wuxingData.minWx}】` : `偏弱【${res.wuxingData.minWx}】`;
      elVerdictDeficit.textContent = `${minTxt} · 宜生扶`;
    }
    if (elVerdictQuote) {
      elVerdictQuote.innerHTML = `
        <b>【人生大局定论】：</b>${res.archetype.personality}<br>
        <span style="font-size:12.5px;color:var(--tx-dim);margin-top:6px;display:block;">
          ✨ <b>袁天罡骨重断语：</b>骨重【${res.boneData.weightStr}】—— ${res.boneData.interp}
        </span>
      `;
    }

    // ZONE 2: ☯️ 五行能量分布与调候补益
    const wxListEl = document.getElementById('bzWxBarsList');
    if (wxListEl) {
      const wxs = ['木', '火', '土', '金', '水'];
      const fills = {
        '木': 'linear-gradient(90deg, #059669, #10B981)',
        '火': 'linear-gradient(90deg, #DC2626, #EF4444)',
        '土': 'linear-gradient(90deg, #D97706, #F59E0B)',
        '金': 'linear-gradient(90deg, #94A3B8, #E2E8F0)',
        '水': 'linear-gradient(90deg, #0284C7, #38BDF8)'
      };
      wxListEl.innerHTML = wxs.map(k => {
        const pct = res.wuxingData.pcts[k] || 0;
        const score = res.wuxingData.scores[k] || 0;
        let tag = '适中';
        if (pct >= 40) tag = '极旺';
        else if (pct >= 25) tag = '偏旺';
        else if (pct <= 5) tag = '极弱缺失';
        else if (pct <= 12) tag = '偏弱';

        return `
          <div class="bz-wx-bar-item">
            <div class="bz-wx-bar-head">
              <span class="${getWxColorClass(k)}">${k} (${score}分 · ${tag})</span>
              <span>${pct}%</span>
            </div>
            <div class="bz-wx-track">
              <div class="bz-wx-fill" style="width:${pct}%;background:${fills[k]};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    const elRemedyBox = document.getElementById('bzXiRemedyBox');
    if (elRemedyBox) {
      const rem = res.wuxingData.remedy;
      const def = res.wuxingData.deficientRemedy;
      elRemedyBox.innerHTML = `
        <span class="bz-xi-box-title">🌟 量身定制日常五行开运锦囊 (以【${res.wuxingData.primaryXi}】为主)：</span>
        <div style="display:flex;flex-direction:column;gap:6px;line-height:1.7;">
          <div>🎨 <b>幸运开运色：</b>${rem.color}</div>
          <div>🧭 <b>旺运贵人方位：</b>${rem.dir} · 🔢 <b>吉利数字：</b>${rem.num}</div>
          <div>🥗 <b>五行滋补饮食：</b>${rem.food}</div>
          <div>💎 <b>开运材质配饰：</b>${rem.stones}</div>
          <div>🪴 <b>工位转运风水：</b>${rem.tip}</div>
          <div style="margin-top:4px;padding-top:6px;border-top:1px dashed var(--line);font-size:12px;color:var(--tx-dim);">
            ⚠️ <b>命局五行欠缺提醒：</b>命局【${def.name}】偏少，日常可多饮水、多接触${def.color.split('、')[0]}系好物补齐元气。
          </div>
        </div>
      `;
    }

    // ZONE 3: 🏛️ 四柱神机全览 (严格水平对齐的真表格)
    const tableBody = document.getElementById('bzTableBody');
    if (tableBody) {
      const p = res.pillars; // [时柱, 日柱, 月柱, 年柱]
      tableBody.innerHTML = `
        <!-- 行 1: 十神主星 -->
        <tr>
          <td class="bz-td-lbl">十神主星</td>
          ${p.map((item, idx) => {
            const isDay = idx === 1;
            const humanTag = SHISHEN_HUMAN_TAG[item.shishenGan] || item.shishenGan;
            return `<td class="${isDay ? 'bz-col-day bz-td-day' : ''}">
              <b style="color:${isDay ? '#FBBF24' : 'var(--tx)'};font-size:13px;">${item.shishenGan}</b>
              <span style="font-size:10.5px;color:var(--tx-dim);display:block;margin-top:1px;">${humanTag}</span>
            </td>`;
          }).join('')}
        </tr>

        <!-- 行 2: 天干 -->
        <tr>
          <td class="bz-td-lbl">天干 (显性)</td>
          ${p.map((item, idx) => {
            const isDay = idx === 1;
            const wx = GAN_WUXING[item.gan];
            return `<td class="${isDay ? 'bz-col-day bz-td-day' : ''}">
              <span class="bz-char-big ${getWxColorClass(item.gan)}">${item.gan}</span>
              <span class="bz-wx-badge ${getWxBgClass(wx)}">${wx}</span>
            </td>`;
          }).join('')}
        </tr>

        <!-- 行 3: 地支 -->
        <tr>
          <td class="bz-td-lbl">地支 (隐性)</td>
          ${p.map((item, idx) => {
            const isDay = idx === 1;
            const wx = ZHI_MAIN_WUXING[item.zhi];
            const zod = ZHI_ZODIAC[item.zhi] || { name: '', icon: '' };
            return `<td class="${isDay ? 'bz-col-day bz-td-day' : ''}">
              <div class="bz-zhi-box">
                <span class="bz-char-big ${getWxColorClass(item.zhi)}">${item.zhi}</span>
                <span class="bz-zodiac-icon" title="${zod.name}">${zod.icon}</span>
                <span class="bz-wx-badge ${getWxBgClass(wx)}">${wx}</span>
              </div>
            </td>`;
          }).join('')}
        </tr>

        <!-- 行 4: 支藏十神 -->
        <tr>
          <td class="bz-td-lbl">支藏十神</td>
          ${p.map((item, idx) => {
            const isDay = idx === 1;
            const hides = (item.hideGan || []).map(g => {
              const gWx = GAN_WUXING[g];
              return `<span class="${getWxColorClass(g)}">${g}</span>`;
            }).join(' ');
            return `<td class="${isDay ? 'bz-col-day bz-td-day' : ''}" style="font-size:12px;">
              ${hides || '无'}
            </td>`;
          }).join('')}
        </tr>

        <!-- 行 5: 十二长生 -->
        <tr>
          <td class="bz-td-lbl">十二长生</td>
          ${p.map((item, idx) => {
            const isDay = idx === 1;
            return `<td class="${isDay ? 'bz-col-day bz-td-day' : ''}" style="font-size:12px;font-weight:700;color:var(--tx);">
              ${item.diShi}
            </td>`;
          }).join('')}
        </tr>

        <!-- 行 6: 纳音五行 -->
        <tr>
          <td class="bz-td-lbl">纳音五行</td>
          ${p.map((item, idx) => {
            const isDay = idx === 1;
            return `<td class="${isDay ? 'bz-col-day bz-td-day' : ''}" style="font-size:12px;color:var(--tx);font-weight:600;">
              ${item.nayin}
            </td>`;
          }).join('')}
        </tr>

        <!-- 行 7: 空亡旬空 -->
        <tr>
          <td class="bz-td-lbl">空亡旬空</td>
          ${p.map((item, idx) => {
            const isDay = idx === 1;
            return `<td class="${isDay ? 'bz-col-day bz-td-day' : ''}" style="font-size:11.5px;color:var(--tx-dim);font-weight:600;">
              ${item.xunKong}
            </td>`;
          }).join('')}
        </tr>
      `;
    }

    // 三垣与神煞
    const shenshaRow = document.getElementById('bzShenshaRow');
    if (shenshaRow) {
      const ssItems = res.shenshaList.map(s => `
        <div class="bz-shensha-pill">
          <b>✨ ${s.name}</b>
          <span>${s.desc}</span>
        </div>
      `).join('');

      shenshaRow.innerHTML = `
        <div class="bz-shensha-pill" style="border-color:rgba(245,158,11,0.4);">
          <b>胎元：${res.taiYuan}</b>
          <span>受胎天机之根</span>
        </div>
        <div class="bz-shensha-pill" style="border-color:rgba(56,189,248,0.4);">
          <b>命宫：${res.mingGong}</b>
          <span>精神与后天归宿</span>
        </div>
        <div class="bz-shensha-pill" style="border-color:rgba(16,185,129,0.4);">
          <b>身宫：${res.shenGong}</b>
          <span>立身行事之格局</span>
        </div>
        ${ssItems}
      `;
    }

    // ZONE 4: 💼 当代打工人深度人生白话拆解
    const arch = res.archetype;
    const sp = res.spouseTrait;

    const elCaiYunTxt = document.getElementById('bzInterpCaiYun');
    const elShiYeTxt = document.getElementById('bzInterpShiYe');
    const elQingGanTxt = document.getElementById('bzInterpQingGan');
    const elJianKangTxt = document.getElementById('bzInterpJianKang');

    if (elCaiYunTxt) {
      elCaiYunTxt.innerHTML = `
        <b>【搞钱密码】：</b>${arch.wealth}<br>
        <span style="display:block;margin-top:6px;color:var(--tx-dim);">
          💡 <b>守财建议：</b>${res.wuxingData.isStrong ? '身旺能担大财，但需防冲动开支与朋友借贷，多布局稳定沉淀资产。' : '身弱适合借助平台、团队或合伙人借力生财，不宜单打独斗盲目重资产加杠杆。'}
        </span>
      `;
    }

    if (elShiYeTxt) {
      elShiYeTxt.innerHTML = `
        <b>【职场定位】：</b>${arch.career}<br>
        <span style="display:block;margin-top:6px;color:var(--tx-dim);">
          🧭 <b>发展赛道：</b>${res.wuxingData.primaryXi === '木' ? '文化传媒、教育培训、设计创新' : res.wuxingData.primaryXi === '火' ? '互联网、能源科技、品牌宣传' : res.wuxingData.primaryXi === '土' ? '传统实业、供应链、不动产' : res.wuxingData.primaryXi === '金' ? '金融合规、精密制造、法律法务' : '跨境电商、物流水运、自由咨询'}赛道更易脱颖而出。
        </span>
      `;
    }

    if (elQingGanTxt) {
      elQingGanTxt.innerHTML = `
        <b>【配偶画像 (夫妻宫坐${res.dayZhi})】：</b><br>
        • <b>长相神采：</b>${sp.appearance}<br>
        • <b>性格特质：</b>${sp.character}<br>
        <span style="display:block;margin-top:6px;color:var(--tx-dim);">
          💌 <b>相处之道：</b>${arch.love}
        </span>
      `;
    }

    if (elJianKangTxt) {
      elJianKangTxt.innerHTML = `
        <b>【精力与脏腑调护】：</b>${arch.health}<br>
        <span style="display:block;margin-top:6px;color:var(--tx-dim);">
          🌿 <b>养生提示：</b>五行注重阴阳平衡，劳逸结合，保持身心松弛是您最好的转运灵药。
        </span>
      `;
    }

    // ZONE 5: 📜 步步大运轮盘 & 称骨诗诀
    const elBoneTitle = document.getElementById('bzBoneTitle');
    const elBonePoem = document.getElementById('bzBonePoemLines');
    const elBoneInterp = document.getElementById('bzBoneInterpTxt');

    if (elBoneTitle) elBoneTitle.textContent = `📜 袁天罡称骨命诀 · 骨重【${res.boneData.weightStr}】`;
    if (elBonePoem) elBonePoem.innerHTML = res.boneData.poem.replace(/。/g, '。<br>').replace(/<br>$/, '');
    if (elBoneInterp) elBoneInterp.innerHTML = `<b>【白话解析】：</b>${res.boneData.interp}`;

    const dayunScroll = document.getElementById('bzDayunScroll');
    if (dayunScroll) {
      dayunScroll.innerHTML = res.daYunList.map(dy => `
        <div class="bz-dayun-item ${dy.isCurrent ? 'is-current' : ''}">
          <span class="bz-dayun-age">${dy.startAge} - ${dy.endAge} 岁</span>
          <span class="bz-dayun-gz">${dy.gz}</span>
          <span class="bz-dayun-ss">${dy.startYear}年起</span>
          ${dy.isCurrent ? '<span class="bz-dayun-tag">★ 当前大运</span>' : ''}
        </div>
      `).join('');
    }

    // 平滑滚动至结果区顶部（仅在主动提交排盘或点击预设时滚动）
    if (shouldScroll) {
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* =========================================================
     海报导出 (1080×1920 烫金朱砂宣纸全景长图)
     ========================================================= */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return y;
    const chars = text.split('');
    let line = '';
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        if (chars[i] === '\n') {
          ctx.fillText(line, x, y);
          line = '';
          y += lineHeight;
          continue;
        }
        ctx.fillText(line, x, y);
        line = chars[i];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  let lastPosterKey = '';   // 同一命盘只入库一次：连点「保存画报」不再插 N 条重复档案
  function exportBaziPoster() {
    if (!currentBaziResult) return;
    if (window.SFX && window.SFX.save) window.SFX.save();
    const res = currentBaziResult;

    // 写入统一历史档案
    if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
      const dedupeKey = res.eightCharStr + '|' + (res.rawOptions && res.rawOptions.hour);
      if (lastPosterKey !== dedupeKey) {
        lastPosterKey = dedupeKey;
        window.UniversalHistory.add({
          module: 'bazi',
          title: `八字命盘：${res.archetype.name}`,
          subtitle: `${res.eightCharStr} · 骨重${res.boneData.weightStr}`,
          color: '#F59E0B',
          badge: '📜 八字命盘',
          avatar: '📜',
          data: res.rawOptions
        });
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // 宣纸烫金深色底纹
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#100D09');
    bgGrad.addColorStop(0.4, '#1C1610');
    bgGrad.addColorStop(1, '#0C0A07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 烫金朱砂外边框
    roundRect(ctx, 52, 52, 976, 1816, 32);
    ctx.fillStyle = 'rgba(28, 22, 16, 0.9)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#D97706';
    ctx.stroke();

    // 内细金边
    roundRect(ctx, 68, 68, 944, 1784, 24);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.stroke();

    // 顶部篆书大标题
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 22px "MiSans", sans-serif';
    ctx.fillText('BAZI HOROSCOPE · 生辰八字全景命书', 104, 128);

    ctx.fillStyle = '#FEF3C7';
    ctx.font = '900 46px "Noto Serif SC", serif';
    ctx.fillText(`${res.genderStr} · ${res.archetype.name}`, 104, 192);

    ctx.fillStyle = '#D97706';
    ctx.font = '22px "MiSans", sans-serif';
    ctx.fillText(`${res.solarStr} · ${res.lunarStr}`, 104, 236);

    // 四柱大卡片
    roundRect(ctx, 104, 280, 872, 360, 20);
    ctx.fillStyle = 'rgba(40, 30, 20, 0.7)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.stroke();

    const colWidth = 872 / 4;
    const titles = ['时柱', '日柱 (自身★)', '月柱', '年柱'];
    for (let i = 0; i < 4; i++) {
      const p = res.pillars[i];
      const cx = 104 + i * colWidth + colWidth / 2;

      ctx.fillStyle = i === 1 ? '#FBBF24' : '#9CA3AF';
      ctx.font = 'bold 18px "MiSans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(titles[i], cx, 324);

      ctx.fillStyle = i === 1 ? '#F59E0B' : '#E5E7EB';
      ctx.font = 'bold 20px "MiSans", sans-serif';
      ctx.fillText(p.shishenGan, cx, 366);

      ctx.font = '900 68px "Noto Serif SC", serif';
      ctx.fillStyle = '#FEF3C7';
      ctx.fillText(p.gan, cx, 448);
      ctx.fillText(p.zhi, cx, 526);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '18px "MiSans", sans-serif';
      ctx.fillText(`${p.diShi} · ${p.nayin}`, cx, 584);
      ctx.fillText(p.xunKong, cx, 614);
    }
    ctx.textAlign = 'left';

    // 五行与喜用神
    roundRect(ctx, 104, 670, 872, 190, 20);
    ctx.fillStyle = 'rgba(40, 30, 20, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 22px "MiSans", sans-serif';
    ctx.fillText('☯️ 五行能量与喜用神调候', 136, 712);

    ctx.fillStyle = '#FEF3C7';
    ctx.font = '20px "MiSans", sans-serif';
    const wxStr = Object.entries(res.wuxingData.pcts).map(([k, v]) => `${k}:${v}%`).join('   ');
    ctx.fillText(`五行占比：${wxStr}`, 136, 756);

    ctx.fillText(`日元旺衰：${res.wuxingData.strength}`, 136, 796);
    ctx.fillText(`喜用神：${res.wuxingData.xiYong.join('、')}    忌神：${res.wuxingData.jiShen.join('、')}`, 136, 836);

    // 袁天罡称骨命书
    roundRect(ctx, 104, 888, 872, 220, 20);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 22px "MiSans", sans-serif';
    ctx.fillText(`📜 袁天罡称骨命诀 · 骨重【${res.boneData.weightStr}】`, 136, 932);

    ctx.fillStyle = '#FEF3C7';
    ctx.font = 'bold 23px "Noto Serif SC", serif';
    const poemParts = res.boneData.poem.split('。').filter(Boolean);
    if (poemParts.length >= 2) {
      ctx.fillText(`${poemParts[0]}。${poemParts[1]}。`, 136, 976);
      if (poemParts[2]) {
        ctx.fillText(`${poemParts[2]}。${poemParts[3] || ''}${poemParts[3] ? '。' : ''}`, 136, 1010);
      }
    } else {
      ctx.fillText(res.boneData.poem, 136, 982);
    }

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '19px "MiSans", sans-serif';
    wrapText(ctx, `【白话断语】：${res.boneData.interp}`, 136, 1048, 808, 28);

    // 当代打工人白话格局
    roundRect(ctx, 104, 1136, 872, 590, 20);
    ctx.fillStyle = 'rgba(30, 22, 14, 0.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 22px "MiSans", sans-serif';
    ctx.fillText('🌟 当代人生白话深度拆解', 136, 1180);

    ctx.fillStyle = '#FEF3C7';
    ctx.font = 'bold 20px "MiSans", sans-serif';
    ctx.fillText(`【本命元神】：${res.archetype.name}`, 136, 1224);
    ctx.font = '18px "MiSans", sans-serif';
    ctx.fillStyle = '#D1D5DB';
    let curY = wrapText(ctx, res.archetype.personality, 136, 1260, 808, 28);

    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 20px "MiSans", sans-serif';
    ctx.fillText('【搞钱财运局】：', 136, curY + 20);
    ctx.font = '18px "MiSans", sans-serif';
    ctx.fillStyle = '#D1D5DB';
    curY = wrapText(ctx, res.archetype.wealth, 136, curY + 54, 808, 28);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 20px "MiSans", sans-serif';
    ctx.fillText('【职场事业局】：', 136, curY + 20);
    ctx.font = '18px "MiSans", sans-serif';
    ctx.fillStyle = '#D1D5DB';
    curY = wrapText(ctx, res.archetype.career, 136, curY + 54, 808, 28);

    ctx.fillStyle = '#F472B6';
    ctx.font = 'bold 20px "MiSans", sans-serif';
    ctx.fillText(`【情感夫妻宫 (坐${res.dayZhi})】：`, 136, curY + 20);
    ctx.font = '18px "MiSans", sans-serif';
    ctx.fillStyle = '#D1D5DB';
    wrapText(ctx, `${res.spouseTrait.appearance}。${res.spouseTrait.character}`, 136, curY + 54, 808, 28);

    // 底部水印印章
    ctx.fillStyle = '#78716C';
    ctx.font = '17px "MiSans", sans-serif';
    ctx.fillText('生辰八字命理馆 · 仅供文化娱乐参考 · 时来天地皆同力', 104, 1780);

    // 导出并下载
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    const wxChar = GAN_WUXING[res.dayGan] || '';
    a.download = `生辰八字全景命书_${res.dayGan}${wxChar}_${res.solarStr.split(' ')[0]}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* =========================================================
     四轴生辰轮盘选择器 (Theme-Unified Date & Time Wheel)
     ========================================================= */
  const LUNAR_MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  const LUNAR_DAY_NAMES = [
    '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ];

  const TIME_SLOTS = [
    { hour: 0, zhi: '子', solarLabel: '00:00 - 00:59 (早子时)', lunarLabel: '早子时 (00:00 - 00:59) · 夜半子水' },
    { hour: 1, zhi: '丑', solarLabel: '01:00 - 02:59 (丑时)', lunarLabel: '丑时 (01:00 - 02:59) · 鸡鸣丑土' },
    { hour: 3, zhi: '寅', solarLabel: '03:00 - 04:59 (寅时)', lunarLabel: '寅时 (03:00 - 04:59) · 平旦寅木' },
    { hour: 5, zhi: '卯', solarLabel: '05:00 - 06:59 (卯时)', lunarLabel: '卯时 (05:00 - 06:59) · 日出卯木' },
    { hour: 7, zhi: '辰', solarLabel: '07:00 - 08:59 (辰时)', lunarLabel: '辰时 (07:00 - 08:59) · 食时辰土' },
    { hour: 9, zhi: '巳', solarLabel: '09:00 - 10:59 (巳时)', lunarLabel: '巳时 (09:00 - 10:59) · 隅中巳火' },
    { hour: 11, zhi: '午', solarLabel: '11:00 - 12:59 (午时)', lunarLabel: '午时 (11:00 - 12:59) · 日中午火' },
    { hour: 13, zhi: '未', solarLabel: '13:00 - 14:59 (未时)', lunarLabel: '未时 (13:00 - 14:59) · 日昳未土' },
    { hour: 15, zhi: '申', solarLabel: '15:00 - 16:59 (申时)', lunarLabel: '申时 (15:00 - 16:59) · 哺时申金' },
    { hour: 17, zhi: '酉', solarLabel: '17:00 - 18:59 (酉时)', lunarLabel: '酉时 (17:00 - 18:59) · 日入酉金' },
    { hour: 19, zhi: '戌', solarLabel: '19:00 - 20:59 (戌时)', lunarLabel: '戌时 (19:00 - 20:59) · 黄昏戌土' },
    { hour: 21, zhi: '亥', solarLabel: '21:00 - 22:59 (亥时)', lunarLabel: '亥时 (21:00 - 22:59) · 人定亥水' },
    { hour: 23, zhi: '子', solarLabel: '23:00 - 23:59 (夜子时)', lunarLabel: '夜子时 (23:00 - 23:59) · 宵分子水' }
  ];

  // 轮盘内部双历法同步状态
  let pickerState = {
    // 公历
    sYear: 1998,
    sMonth: 8,
    sDay: 18,
    sHour: 11,
    // 农历
    lYear: 1998,
    lMonth: 6,
    lDay: 27,
    lHour: 11
  };

  let isLunarSelected = false;
  let currentGender = 1; // 1: 乾造, 0: 坤造

  function getLunarMonthsForYear(year) {
    if (typeof window.LunarYear === 'undefined') {
      return Array.from({ length: 12 }, (_, i) => ({ val: i + 1, text: LUNAR_MONTH_NAMES[i + 1] }));
    }
    const ly = window.LunarYear.fromYear(year);
    const leap = ly.getLeapMonth();
    const res = [];
    for (let m = 1; m <= 12; m++) {
      res.push({ val: m, text: LUNAR_MONTH_NAMES[m] });
      if (m === leap) {
        res.push({ val: -m, text: '闰' + LUNAR_MONTH_NAMES[m] });
      }
    }
    return res;
  }

  function getLunarDaysForYearMonth(year, month) {
    let dayCount = 30;
    if (typeof window.LunarMonth !== 'undefined') {
      try {
        const lm = window.LunarMonth.fromYm(year, month);
        if (lm) dayCount = lm.getDayCount();
      } catch (e) {
        dayCount = 30;
      }
    }
    const res = [];
    for (let d = 1; d <= dayCount; d++) {
      res.push({ val: d, text: LUNAR_DAY_NAMES[d] || `${d}日` });
    }
    return res;
  }

  function getSolarDaysForYearMonth(year, month) {
    const dayCount = new Date(year, month, 0).getDate();
    const res = [];
    for (let d = 1; d <= dayCount; d++) {
      res.push({ val: d, text: `${String(d).padStart(2, '0')}日` });
    }
    return res;
  }

  function normalizeLunarState() {
    const months = getLunarMonthsForYear(pickerState.lYear);
    if (!months.some(m => m.val === pickerState.lMonth)) {
      const absM = Math.abs(pickerState.lMonth);
      if (months.some(m => m.val === absM)) {
        pickerState.lMonth = absM;
      } else {
        pickerState.lMonth = months[0].val;
      }
    }
    const days = getLunarDaysForYearMonth(pickerState.lYear, pickerState.lMonth);
    if (pickerState.lDay > days.length) {
      pickerState.lDay = days.length;
    }
    if (pickerState.lDay < 1) pickerState.lDay = 1;
  }

  function normalizeSolarState() {
    const maxDays = new Date(pickerState.sYear, pickerState.sMonth, 0).getDate();
    if (pickerState.sDay > maxDays) {
      pickerState.sDay = maxDays;
    }
    if (pickerState.sDay < 1) pickerState.sDay = 1;
  }

  function syncStateFromSolar() {
    if (typeof window.Solar === 'undefined') return;
    normalizeSolarState();
    try {
      const s = window.Solar.fromYmdHms(pickerState.sYear, pickerState.sMonth, pickerState.sDay, pickerState.sHour, 0, 0);
      const l = s.getLunar();
      pickerState.lYear = l.getYear();
      pickerState.lMonth = l.getMonth();
      pickerState.lDay = l.getDay();
      pickerState.lHour = pickerState.sHour;
    } catch (e) {
      console.warn('Sync solar to lunar error:', e);
    }
  }

  function syncStateFromLunar() {
    if (typeof window.Lunar === 'undefined') return;
    normalizeLunarState();
    try {
      const l = window.Lunar.fromYmdHms(pickerState.lYear, pickerState.lMonth, pickerState.lDay, pickerState.lHour, 0, 0);
      const s = l.getSolar();
      pickerState.sYear = s.getYear();
      pickerState.sMonth = s.getMonth();
      pickerState.sDay = s.getDay();
      pickerState.sHour = pickerState.lHour;
    } catch (e) {
      console.warn('Sync lunar to solar error:', e);
    }
  }

  function updateWheelPreviewText() {
    const badge = document.getElementById('bzSyncBadge');
    const txt = document.getElementById('bzSyncTxt');
    if (!badge || !txt || typeof window.Solar === 'undefined') return;

    const pad = n => String(n).padStart(2, '0');
    const slot = TIME_SLOTS.find(t => t.hour === (isLunarSelected ? pickerState.lHour : pickerState.sHour)) || TIME_SLOTS[6];

    if (isLunarSelected) {
      // 农历模式下：展示地道农历生辰 ➔ 对应公历
      badge.textContent = '🌙 农历 ➔ ☀️ 公历';
      try {
        const l = window.Lunar.fromYmdHms(pickerState.lYear, pickerState.lMonth, pickerState.lDay, pickerState.lHour, 0, 0);
        const s = l.getSolar();
        txt.textContent = `已选农历：${l.getYearInGanZhi()}年 (${l.getYearShengXiao()}年) ${l.getMonthInChinese()}月${l.getDayInChinese()} ${slot.zhi}时  ➔  对应公历：${s.getYear()}年${pad(s.getMonth())}月${pad(s.getDay())}日 ${pad(s.getHour())}:00`;
      } catch (e) {
        txt.textContent = `农历：${pickerState.lYear}年 ${pickerState.lMonth}月${pickerState.lDay}日 ${slot.zhi}时`;
      }
    } else {
      // 公历模式下：展示公历生辰 ➔ 对应农历
      badge.textContent = '☀️ 公历 ➔ 🌙 农历';
      try {
        const s = window.Solar.fromYmdHms(pickerState.sYear, pickerState.sMonth, pickerState.sDay, pickerState.sHour, 0, 0);
        const l = s.getLunar();
        txt.textContent = `已选公历：${s.getYear()}年${pad(s.getMonth())}月${pad(s.getDay())}日 ${pad(s.getHour())}:00  ➔  对应农历：${l.getYearInGanZhi()}年 (${l.getYearShengXiao()}年) ${l.getMonthInChinese()}月${l.getDayInChinese()} ${slot.zhi}时`;
      } catch (e) {
        txt.textContent = `公历：${pickerState.sYear}年${pad(pickerState.sMonth)}月${pad(pickerState.sDay)}日`;
      }
    }
  }

  function renderWheelPicker() {
    const elYearTitle = document.getElementById('bzColYearTitle');
    const elMonthTitle = document.getElementById('bzColMonthTitle');
    const elDayTitle = document.getElementById('bzColDayTitle');
    const elHourTitle = document.getElementById('bzColHourTitle');

    const selYear = document.getElementById('bzWheelYear');
    const selMonth = document.getElementById('bzWheelMonth');
    const selDay = document.getElementById('bzWheelDay');
    const selHour = document.getElementById('bzWheelHour');

    if (!selYear || !selMonth || !selDay || !selHour) return;

    if (isLunarSelected) {
      // 农历模式标签
      if (elYearTitle) elYearTitle.textContent = '农历年份 (干支生肖)';
      if (elMonthTitle) elMonthTitle.textContent = '农历月份 (正月-腊月)';
      if (elDayTitle) elDayTitle.textContent = '农历日辰 (初一-三十)';
      if (elHourTitle) elHourTitle.textContent = '出生时辰 (地支十二时)';

      // 1. 年份 (1930 ~ 2035)
      const currentLY = pickerState.lYear;
      selYear.innerHTML = Array.from({ length: 106 }, (_, i) => {
        const y = 1930 + i;
        let gzSx = '';
        if (typeof window.Lunar !== 'undefined') {
          try {
            const l = window.Lunar.fromYmdHms(y, 1, 1, 12, 0, 0);
            gzSx = ` (${l.getYearInGanZhi()}${l.getYearShengXiao()}年)`;
          } catch (e) {}
        }
        return `<option value="${y}" ${y === currentLY ? 'selected' : ''}>${y}年${gzSx}</option>`;
      }).join('');

      // 2. 月份 (动态包含闰月)
      const months = getLunarMonthsForYear(currentLY);
      if (!months.some(m => m.val === pickerState.lMonth)) {
        pickerState.lMonth = months[0].val;
      }
      selMonth.innerHTML = months.map(m => `
        <option value="${m.val}" ${m.val === pickerState.lMonth ? 'selected' : ''}>${m.text}</option>
      `).join('');

      // 3. 日期 (初一 ~ 廿九/三十)
      const days = getLunarDaysForYearMonth(currentLY, pickerState.lMonth);
      if (pickerState.lDay > days.length) {
        pickerState.lDay = days.length;
      }
      selDay.innerHTML = days.map(d => `
        <option value="${d.val}" ${d.val === pickerState.lDay ? 'selected' : ''}>${d.text}</option>
      `).join('');

      // 4. 时辰 (地支十二时)
      selHour.innerHTML = TIME_SLOTS.map(t => `
        <option value="${t.hour}" ${t.hour === pickerState.lHour ? 'selected' : ''}>${t.lunarLabel}</option>
      `).join('');

    } else {
      // 公历模式标签
      if (elYearTitle) elYearTitle.textContent = '公历年份';
      if (elMonthTitle) elMonthTitle.textContent = '公历月份';
      if (elDayTitle) elDayTitle.textContent = '公历日期';
      if (elHourTitle) elHourTitle.textContent = '出生时辰 (二十四小时制)';

      // 1. 年份
      const currentSY = pickerState.sYear;
      selYear.innerHTML = Array.from({ length: 106 }, (_, i) => {
        const y = 1930 + i;
        return `<option value="${y}" ${y === currentSY ? 'selected' : ''}>${y}年</option>`;
      }).join('');

      // 2. 月份
      const currentSM = pickerState.sMonth;
      selMonth.innerHTML = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return `<option value="${m}" ${m === currentSM ? 'selected' : ''}>${String(m).padStart(2, '0')}月</option>`;
      }).join('');

      // 3. 日期
      const days = getSolarDaysForYearMonth(currentSY, currentSM);
      if (pickerState.sDay > days.length) {
        pickerState.sDay = days.length;
      }
      selDay.innerHTML = days.map(d => `
        <option value="${d.val}" ${d.val === pickerState.sDay ? 'selected' : ''}>${d.text}</option>
      `).join('');

      // 4. 时辰
      selHour.innerHTML = TIME_SLOTS.map(t => `
        <option value="${t.hour}" ${t.hour === pickerState.sHour ? 'selected' : ''}>${t.solarLabel}</option>
      `).join('');
    }

    updateWheelPreviewText();
  }

  /* =========================================================
     省市二级联动与真太阳时交互逻辑
     ========================================================= */
  let currentProvIdx = 0;
  let currentCityIdx = 0;
  let currentLng = 116.40; // 默认北京
  let isCustomLng = false;

  function populateProvinceDropdown() {
    const selProv = document.getElementById('bzSolarProv');
    if (!selProv || !window.BaziCities) return;

    selProv.innerHTML = window.BaziCities.provinces.map((p, idx) => `
      <option value="${idx}" ${idx === currentProvIdx ? 'selected' : ''}>${p.province}</option>
    `).join('');
  }

  function populateCityDropdown(provIdx) {
    const selCity = document.getElementById('bzSolarCity');
    if (!selCity || !window.BaziCities) return;

    const prov = window.BaziCities.provinces[provIdx] || window.BaziCities.provinces[0];
    selCity.innerHTML = prov.cities.map((c, idx) => {
      const diff = window.BaziCities.calcSolarDiffMinutes(c.lng);
      const sign = diff >= 0 ? '+' : '';
      return `<option value="${idx}" ${idx === currentCityIdx ? 'selected' : ''}>
        ${c.name} (${c.lng}°E, 时差${sign}${diff}分)
      </option>`;
    }).join('');

    updateCitySelection();
  }

  function updateCitySelection() {
    if (!window.BaziCities) return;
    const selProv = document.getElementById('bzSolarProv');
    const selCity = document.getElementById('bzSolarCity');
    const pIdx = selProv ? parseInt(selProv.value, 10) : 0;
    const cIdx = selCity ? parseInt(selCity.value, 10) : 0;

    currentProvIdx = pIdx;
    currentCityIdx = cIdx;

    const prov = window.BaziCities.provinces[pIdx];
    if (prov && prov.cities[cIdx]) {
      const city = prov.cities[cIdx];
      currentLng = city.lng;
      updateSolarFeedback();
    }
  }

  function updateSolarFeedback() {
    const chkSolar = document.getElementById('bzChkSolar');
    const feedbackTxt = document.getElementById('bzSolarFeedbackTxt');
    const controls = document.getElementById('bzSolarControls');
    if (!feedbackTxt || !window.BaziCities) return;

    const enabled = chkSolar ? chkSolar.checked : false;
    if (controls) {
      controls.style.opacity = enabled ? '1' : '0.55';
      controls.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    if (!enabled) {
      feedbackTxt.textContent = '未启用真太阳时校准（直接以平太阳时 120°E 排盘）';
      return;
    }

    let activeLng = currentLng;
    if (isCustomLng) {
      const inp = document.getElementById('bzInpCustomLng');
      const val = inp ? parseFloat(inp.value) : NaN;
      if (!isNaN(val)) activeLng = val;
    }

    const diff = window.BaziCities.calcSolarDiffMinutes(activeLng);
    const diffDesc = window.BaziCities.formatSolarDiffText(diff);
    feedbackTxt.textContent = `已校准：经度 ${activeLng.toFixed(2)}°E · 时差 ${diffDesc}`;
  }

  function handleCalculate(shouldScroll = true) {
    if (shouldScroll && window.SFX && window.SFX.select) window.SFX.select();

    const chkSolar = document.getElementById('bzChkSolar');
    const useSolar = chkSolar ? chkSolar.checked : false;

    /* 未来日期拦截：给还没出生的人排盘语义错误。
       注意农历分支：lunar→solar 转换在 runBazi 内部，这里按公历近似拦截，
       农历年底 1 天的误差可接受（农历 2035 年腊月可能落在公历 2036 年初）。 */
    const pickY = isLunarSelected ? pickerState.lYear : pickerState.sYear;
    const pickM = isLunarSelected ? pickerState.lMonth : pickerState.sMonth;
    const pickD = isLunarSelected ? pickerState.lDay : pickerState.sDay;
    /* 农历闰月 lMonth 是负数（如 -6 表示闰六月），直接进 Date 会把月份
       下标算成 -7 滚回上一年，拦截窗口失真——取绝对值按平月近似判断 */
    if (new Date(pickY, Math.abs(pickM) - 1, pickD, 23, 59, 59) > new Date()) {
      alert('出生时间不能晚于现在哦');
      return;
    }

    let activeLng = currentLng;
    if (isCustomLng) {
      const inp = document.getElementById('bzInpCustomLng');
      const val = inp ? parseFloat(inp.value) : NaN;
      if (!isNaN(val)) activeLng = val;
    }

    const options = {
      isLunar: isLunarSelected,
      year: isLunarSelected ? pickerState.lYear : pickerState.sYear,
      month: isLunarSelected ? pickerState.lMonth : pickerState.sMonth,
      day: isLunarSelected ? pickerState.lDay : pickerState.sDay,
      hour: isLunarSelected ? pickerState.lHour : pickerState.sHour,
      minute: 0,
      gender: currentGender,
      useSolarTime: useSolar,
      solarLng: activeLng,
      provIndex: currentProvIdx,
      cityIndex: currentCityIdx,
      isCustomLng
    };

    const res = runBazi(options);
    if (res) {
      renderResult(res, shouldScroll);
      if (shouldScroll && window.AppRouter && typeof window.AppRouter.pushView === 'function') {
        const st = window.AppRouter.getState();
        if (st && st.view === 'result') {
          window.AppRouter.replaceView('result', { options: res.rawOptions });
        } else {
          window.AppRouter.pushView('result', { options: res.rawOptions });
        }
      }
    }
  }

  function restore(data) {
    if (!data) return;
    if (data.gender !== undefined) currentGender = data.gender;
    if (data.isLunar !== undefined) isLunarSelected = data.isLunar;

    if (data.isLunar) {
      if (data.year) pickerState.lYear = data.year;
      if (data.month) pickerState.lMonth = data.month;
      if (data.day) pickerState.lDay = data.day;
      if (data.hour !== undefined) pickerState.lHour = data.hour;
      syncStateFromLunar();
    } else {
      if (data.year) pickerState.sYear = data.year;
      if (data.month) pickerState.sMonth = data.month;
      if (data.day) pickerState.sDay = data.day;
      if (data.hour !== undefined) pickerState.sHour = data.hour;
      syncStateFromSolar();
    }

    const chkSolar = document.getElementById('bzChkSolar');
    const selProv = document.getElementById('bzSolarProv');
    const selCity = document.getElementById('bzSolarCity');

    if (chkSolar) chkSolar.checked = !!data.useSolarTime;

    if (data.provIndex !== undefined) {
      currentProvIdx = data.provIndex;
      if (selProv) selProv.value = currentProvIdx;
      populateCityDropdown(currentProvIdx);
    }
    if (data.cityIndex !== undefined) {
      currentCityIdx = data.cityIndex;
      if (selCity) selCity.value = currentCityIdx;
    }
    if (data.solarLng !== undefined) {
      currentLng = data.solarLng;
    }

    document.querySelectorAll('.bz-gender-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.gender, 10) === currentGender);
    });
    document.querySelectorAll('.bz-cal-tab').forEach(b => {
      b.classList.toggle('active', (b.dataset.cal === 'lunar') === isLunarSelected);
    });

    renderWheelPicker();
    updateSolarFeedback();
    const res = runBazi(data);
    if (res) renderResult(res, true);
  }

  function init() {
    populateProvinceDropdown();
    populateCityDropdown(currentProvIdx);

    // 初始化轮盘
    syncStateFromSolar();
    renderWheelPicker();

    // 轮盘各列改变事件
    const selYear = document.getElementById('bzWheelYear');
    const selMonth = document.getElementById('bzWheelMonth');
    const selDay = document.getElementById('bzWheelDay');
    const selHour = document.getElementById('bzWheelHour');

    if (selYear) {
      selYear.addEventListener('change', () => {
        const val = parseInt(selYear.value, 10);
        if (isLunarSelected) {
          pickerState.lYear = val;
          syncStateFromLunar();
        } else {
          pickerState.sYear = val;
          syncStateFromSolar();
        }
        renderWheelPicker();
      });
    }

    if (selMonth) {
      selMonth.addEventListener('change', () => {
        const val = parseInt(selMonth.value, 10);
        if (isLunarSelected) {
          pickerState.lMonth = val;
          syncStateFromLunar();
        } else {
          pickerState.sMonth = val;
          syncStateFromSolar();
        }
        renderWheelPicker();
      });
    }

    if (selDay) {
      selDay.addEventListener('change', () => {
        const val = parseInt(selDay.value, 10);
        if (isLunarSelected) {
          pickerState.lDay = val;
          syncStateFromLunar();
        } else {
          pickerState.sDay = val;
          syncStateFromSolar();
        }
        updateWheelPreviewText();
      });
    }

    if (selHour) {
      selHour.addEventListener('change', () => {
        const val = parseInt(selHour.value, 10);
        pickerState.sHour = val;
        pickerState.lHour = val;
        updateWheelPreviewText();
      });
    }

    // 省份下拉改变
    const selProv = document.getElementById('bzSolarProv');
    if (selProv) {
      selProv.addEventListener('change', () => {
        currentProvIdx = parseInt(selProv.value, 10) || 0;
        currentCityIdx = 0;
        populateCityDropdown(currentProvIdx);
      });
    }

    // 城市下拉改变
    const selCity = document.getElementById('bzSolarCity');
    if (selCity) {
      selCity.addEventListener('change', updateCitySelection);
    }

    // 城市快捷模糊搜索
    const inSearch = document.getElementById('bzCitySearch');
    if (inSearch && window.BaziCities) {
      inSearch.addEventListener('input', () => {
        const query = inSearch.value.trim();
        if (!query) return;
        const hits = window.BaziCities.searchCity(query);
        if (hits.length > 0) {
          const first = hits[0];
          currentProvIdx = first.provinceIndex;
          currentCityIdx = first.cityIndex;
          if (selProv) selProv.value = currentProvIdx;
          populateCityDropdown(currentProvIdx);
          if (selCity) selCity.value = currentCityIdx;
          updateCitySelection();
        }
      });
    }

    // GPS 定位按钮
    const btnGeo = document.getElementById('bzBtnGeo');
    if (btnGeo) {
      btnGeo.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('你的浏览器不支持定位，选个城市也一样');
          return;
        }
        btnGeo.textContent = '📍 定位中...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            btnGeo.textContent = '📍 GPS定位成功';
            setTimeout(() => { btnGeo.textContent = '📍 GPS定位'; }, 2000);
            currentLng = pos.coords.longitude;
            isCustomLng = true;
            const chkCustom = document.getElementById('bzChkCustomLng');
            const inpCustom = document.getElementById('bzInpCustomLng');
            const boxCustom = document.getElementById('bzCustomLngInputs');
            if (chkCustom) chkCustom.checked = true;
            if (boxCustom) boxCustom.style.display = 'flex';
            if (inpCustom) inpCustom.value = currentLng.toFixed(2);
            const chkSolar = document.getElementById('bzChkSolar');
            if (chkSolar) chkSolar.checked = true;
            updateSolarFeedback();
          },
          (err) => {
            btnGeo.textContent = '📍 定位失败';
            setTimeout(() => { btnGeo.textContent = '📍 GPS定位'; }, 2000);
            console.warn('GPS location error:', err);
            alert('获取当前经度失败，请手动在下拉框选择城市');
          },
          { timeout: 8000 }
        );
      });
    }

    // 自定义经度复选框
    const chkCustom = document.getElementById('bzChkCustomLng');
    const boxCustom = document.getElementById('bzCustomLngInputs');
    const inpCustom = document.getElementById('bzInpCustomLng');
    if (chkCustom) {
      chkCustom.addEventListener('change', () => {
        isCustomLng = chkCustom.checked;
        if (boxCustom) boxCustom.style.display = isCustomLng ? 'flex' : 'none';
        if (isCustomLng && inpCustom && !inpCustom.value) {
          inpCustom.value = currentLng.toFixed(2);
        }
        updateSolarFeedback();
      });
    }
    if (inpCustom) {
      inpCustom.addEventListener('input', updateSolarFeedback);
    }

    // 真太阳时开关复选框
    const chkSolar = document.getElementById('bzChkSolar');
    if (chkSolar) {
      chkSolar.addEventListener('change', updateSolarFeedback);
    }

    // 阴历阳历切换
    document.querySelectorAll('.bz-cal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const wantLunar = tab.dataset.cal === 'lunar';
        if (wantLunar === isLunarSelected) return;

        isLunarSelected = wantLunar;
        document.querySelectorAll('.bz-cal-tab').forEach(t => t.classList.toggle('active', t === tab));

        if (isLunarSelected) {
          syncStateFromSolar();
        } else {
          syncStateFromLunar();
        }
        renderWheelPicker();
      });
    });

    // 性别切换
    document.querySelectorAll('.bz-gender-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        currentGender = parseInt(btn.dataset.gender, 10);
        document.querySelectorAll('.bz-gender-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // 快捷预设按钮
    const btnRand = document.getElementById('bzPresetRand');
    const btnNow = document.getElementById('bzPresetNow');
    const btn2000 = document.getElementById('bzPreset2000');
    const btn1995 = document.getElementById('bzPreset1995');

    if (btnRand) {
      btnRand.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const randY = 1980 + Math.floor(Math.random() * 26);
        const randM = 1 + Math.floor(Math.random() * 12);
        const randD = 1 + Math.floor(Math.random() * 28);
        const hours = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
        const randH = hours[Math.floor(Math.random() * hours.length)];

        pickerState.sYear = randY;
        pickerState.sMonth = randM;
        pickerState.sDay = randD;
        pickerState.sHour = randH;
        currentGender = Math.random() > 0.5 ? 1 : 0;
        document.querySelectorAll('.bz-gender-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.gender, 10) === currentGender));

        if (isLunarSelected) {
          syncStateFromSolar();
        } else {
          syncStateFromSolar();
        }
        renderWheelPicker();
        handleCalculate();
      });
    }

    if (btnNow) {
      btnNow.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const now = new Date();
        pickerState.sYear = now.getFullYear();
        pickerState.sMonth = now.getMonth() + 1;
        pickerState.sDay = now.getDate();
        const h = now.getHours();
        const closestSlot = TIME_SLOTS.reduce((prev, curr) => Math.abs(curr.hour - h) < Math.abs(prev.hour - h) ? curr : prev);
        pickerState.sHour = closestSlot.hour;

        syncStateFromSolar();
        renderWheelPicker();
        handleCalculate();
      });
    }

    if (btn2000) {
      btn2000.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        currentGender = 0;
        document.querySelectorAll('.bz-gender-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.gender, 10) === currentGender));

        pickerState.sYear = 2000;
        pickerState.sMonth = 8;
        pickerState.sDay = 18;
        pickerState.sHour = 9;

        syncStateFromSolar();
        renderWheelPicker();
        handleCalculate();
      });
    }

    if (btn1995) {
      btn1995.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        currentGender = 1;
        document.querySelectorAll('.bz-gender-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.gender, 10) === currentGender));

        pickerState.sYear = 1995;
        pickerState.sMonth = 10;
        pickerState.sDay = 24;
        pickerState.sHour = 13;

        syncStateFromSolar();
        renderWheelPicker();
        handleCalculate();
      });
    }

    // 提交排盘
    const btnSubmit = document.getElementById('bzBtnSubmit');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => handleCalculate(true));
    }

    // 导出长图海报
    const btnPoster = document.getElementById('bzBtnPoster');
    if (btnPoster) {
      btnPoster.addEventListener('click', exportBaziPoster);
    }

    // 再次排盘
    const btnAgain = document.getElementById('bzBtnAgain');
    if (btnAgain) {
      btnAgain.addEventListener('click', () => {
        if (window.AppRouter && typeof window.AppRouter.back === 'function') {
          window.AppRouter.back(() => {
            const inpCard = document.querySelector('.bz-input-card');
            if (inpCard) inpCard.scrollIntoView({ behavior: 'smooth' });
          });
        } else {
          const inpCard = document.querySelector('.bz-input-card');
          if (inpCard) inpCard.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 初始静默计算一次（不滚动、不响铃），使用户首次切入八字模块即可见盘
    if (!currentBaziResult) {
      handleCalculate(false);
    }
  }

  window.AppBazi = {
    init,
    restore,
    restoreView: function (view, payload) {
      const stage = document.getElementById('bzResultStage');
      if (view === 'result' && payload && payload.options) {
        const res = runBazi(payload.options);
        if (res) renderResult(res, false);
        return;
      }
      /* init 已静默算好默认命盘并点亮结果屏：home 视图不要把 active 摘掉，
         否则首次进入八字模块只见输入卡、盘被藏起来 */
      if (stage && view && view !== 'home') stage.classList.remove('active');
      /* 回到首页时不能滚动：这里原本无条件 scrollIntoView 到输入卡，
         首次进入也会触发，把顶部的玄学互跳栏推出视野，和其他模块的子导航
         不在同一高度。只有确实从结果页退回（需要把输入区带回视野）才滚。 */
      if (view && view !== 'home') {
        const inpCard = document.querySelector('.bz-input-card');
        if (inpCard) inpCard.scrollIntoView({ behavior: 'auto' });
      }
    },
    runBazi,
    exportBaziPoster
  };
})();
