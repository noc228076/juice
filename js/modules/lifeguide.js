/* =========================================================
   自我说明书 · 第 09 章：人间清醒指南 (Evidence-Based Life Handbook)
   灵感与循证数据源：eternity4719/HowToLiveBetter (CC BY 4.0)
   功能：
   1. 🩺 高性价比漏项自查（4大维度16项核心防线 + 优先补漏处方单）
   2. 📚 循证避坑智库（36条顶刊RCT/Cochrane/现行法条硬核生存指南）
   3. 💊 每日清醒锦囊（随机抽取救命/防坑/反智商税卡片）

   本模块原先是一个独立顶层模块（#mod-lifeguide），现并入说明书，
   作为 sm-screen#scr-sm-lifeguide 存在；模块根节点改由 #mod-manual 承担，
   所以下面所有 DOM 查询都限定在 #mod-manual 里，避免与说明书其他章撞车。
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_AUDIT_KEY = 'juice_lifeguide_audit_v1';
  const STORAGE_DONE_KEY = 'juice_lifeguide_done_v1';

  /* =========================================================
     一、4大维度 16项高性价比漏项体检题库
     ========================================================= */
  const AUDIT_DIMS = [
    { key: 'health', icon: '❤️', name: '惜命保命防线', desc: '低成本挡住致命疾病与意外' },
    { key: 'wealth', icon: '💰', name: '守财反割防线', desc: '堵住隐形漏钱与伪科学智商税' },
    { key: 'career', icon: '💼', name: '职场维权防线', desc: '在职留证据、被裁拿足赔偿金' },
    { key: 'legal',  icon: '🛡️', name: '法律免死金牌', desc: '守住征信、人身自由与清白案底' }
  ];

  const AUDIT_ITEMS = [
    // 1. 惜命保命防线 (health)
    {
      id: 'au_seatbelt',
      dim: 'health',
      q: '坐网约车/出租车/私家车后排时，上车也会主动系好安全带',
      why: '不系后排安全带致死率高 3 倍，被甩出车外致死率高达 75%，还会撞死前排乘客',
      rx: '下次上车无论前排后排，2秒钟扣上安全带（钱=0，性价比=极高）',
      roi: '钱=0 · 保命极高'
    },
    {
      id: 'au_bp',
      dim: 'health',
      q: '清楚自己最近一年的真实血压数值（每年至少测过 1 次血压）',
      why: '中国成人高血压患病率 27.5% 但近半数人完全不知情；收缩压每降 10mmHg，脑卒中降 27%',
      rx: '去社区医院/药店免费量一次血压，或花 100 元买台臂式电子血压计放家里',
      roi: '钱=0~少 · 证据A级'
    },
    {
      id: 'au_meds',
      dim: 'health',
      q: '吃感冒药/退烧药会看“对乙酰氨基酚”成分不叠吃，喝酒绝不吃头孢',
      why: '中成药（如999感冒灵）与泰诺/布洛芬混吃极易致对乙酰氨基酚过量引发急性肝衰竭',
      rx: '买药永远认准包装上的【通用名】，含“对乙酰氨基酚”的药绝不同时吃两种',
      roi: '钱=0 · 防急性肝衰'
    },
    {
      id: 'au_sleep_sit',
      dim: 'health',
      q: '工作日尽量保证 7 小时睡眠，且久坐每 45~60 分钟会起身接水走动',
      why: '连续久坐使深静脉血栓风险翻倍；长期睡眠不足 6 小时显著增加全因死亡率与心血管事件',
      rx: '用工位小杯子喝水逼自己每小时起身一次；把睡前刷手机闹钟设在 23:30',
      roi: '钱=0 · 证据A级'
    },

    // 2. 守财反割防线 (wealth)
    {
      id: 'au_sub',
      dim: 'wealth',
      q: '近半年检查并清理过微信/支付宝/苹果里的“自动续费与免密支付”',
      why: '首月1元会员、网盘/视频/打车免密扣款是当代人最隐蔽的“温水煮青蛙”式失血点',
      rx: '花3分钟打开：微信[服务→钱包→支付设置→自动续费] & 支付宝[设置→支付设置→免密支付]逐一关停',
      roi: '年省数百至数千元'
    },
    {
      id: 'au_tax_gjj',
      dim: 'wealth',
      q: '每年3-6月按时办个税汇算退税，且填齐了租房/房贷/赡养老人扣除',
      why: '租房每月可扣 1500 元、独生子女赡养60岁以上父母每月可扣 3000 元，不填等于白交税',
      rx: '下载【个人所得税】App 填报专项附加扣除；租房党同步在支付宝/本地政务App办理公积金按月提取付房租',
      roi: '每年合法回血数千元'
    },
    {
      id: 'au_insurance',
      dim: 'wealth',
      q: '没停交过城乡居民/职工医保，且没买过“有病治病、没病返本”的分红重疾险',
      why: '医保是唯一无视既往症的国家兜底；返还型保险保费贵3倍且收益跑不赢通胀',
      rx: '守住国家医保底线；商业险只配高杠杆消费型【百万医疗险 + 意外险 + 定期寿险】',
      roi: '省下数万冤枉保费'
    },
    {
      id: 'au_antimyth',
      dim: 'wealth',
      q: '从不买“排毒清宿便、防辐射服、碱性水、酵素减肥、解酒护肝片”等智商税',
      why: '医学上根本不存在“宿便”；胃酸 pH 1.5 瞬间中和碱性水；解酒药不减少乙醛对肝脏的毒性',
      rx: '把买保健品和伪科学神器的钱省下来买优质肉蛋奶和新鲜果蔬',
      roi: 'Cochrane A级铁证避坑'
    },

    // 3. 职场维权防线 (career)
    {
      id: 'au_layoff',
      dim: 'career',
      q: '清楚公司劝退/裁员时绝不能手写或点击“因个人原因主动辞职”',
      why: '一旦签了“个人原因辞职”，N 或 N+1 经济补偿金直接归零，且无法申领失业保险金',
      rx: '被约谈裁员时遵循三不原则：不主动提离职、不签个人原因辞职单、不删工作权限留存证据，谈妥 N/N+1 签协商解除协议',
      roi: '保住数万至十数万赔偿'
    },
    {
      id: 'au_evidence',
      dim: 'career',
      q: '个人手机/本地妥善留存了劳动合同、近12个月工资流水与核心考勤记录',
      why: '公司一旦撕破脸，第一件事就是停掉你的企业微信/飞书/OA账号，没备份就无法举证',
      rx: '立刻将劳动合同、发薪银行流水、绩效通知和加班审批截图备份到个人设备（切勿含公司商业机密）',
      roi: '劳动仲裁胜诉关键'
    },
    {
      id: 'au_injury',
      dim: 'career',
      q: '知道上下班途中遭遇非本人主要责任交通事故（需交警责任认定书）算工伤',
      why: '《工伤保险条例》第14条明确规定：上下班必经合理路线非本人主责车祸属工伤，但必须报警拿认定书',
      rx: '通勤途中发生碰撞哪怕小擦挂受伤，第一时间打 122 报警开具《道路交通事故责任认定书》',
      roi: '法定工伤报销与伤残津贴'
    },
    {
      id: 'au_code_sec',
      dim: 'career',
      q: '从不把公司业务源码、客户数据库或内部文档同步到个人 GitHub/个人网盘',
      why: '离职前打包公司代码或同步到外网仓库，极易触发《刑法》第219条侵犯商业秘密罪（三年以下至十年有期徒刑）',
      rx: '个人技术积累只写脱敏的方法论笔记，绝不拷贝一行公司业务代码或生产数据到私人设备',
      roi: '防商业秘密刑事立案'
    },

    // 4. 法律免死金牌 (legal)
    {
      id: 'au_bankcard',
      dim: 'legal',
      q: '绝不出租、出借自己的银行卡/电话卡/微信号，也不帮网友或熟人“过账取现”',
      why: '《刑法》帮信罪（第287条之二）与《反电信网络诈骗法》高频红线：一旦涉诈走账，名下所有银行卡惩戒5年禁网银+刑事案底',
      rx: '身份证、银行卡、手机卡、收款码哪怕亲戚给好处费也绝不外借，天上掉的“跑分兼职”全是刑法陷阱',
      roi: '保住人身自由与征信'
    },
    {
      id: 'au_guarantor',
      dim: 'legal',
      q: '绝不当“挂名法定代表人/挂名股东”，也绝不在亲友借款合同的担保人栏签字',
      why: '挂名法人要替公司背负无限限高令与税务行政处罚；签字未写明“一般保证”默认承担连带清偿责任，借款人跑路直接查封你房车',
      rx: '任何人找你挂名公司法人或借钱担保，一律回绝“正在办房贷/单位有合规审查签不了”',
      roi: '防倾家荡产成失信老赖'
    },
    {
      id: 'au_fight',
      dim: 'legal',
      q: '街头遇路怒/口角坚持“好汉不吃眼前亏”，绝不先动手、不升级互殴',
      why: '打赢坐牢（轻伤二级即构成故意伤害罪判三年以下+背终生犯罪记录毁三代考公），打输住院；虽2026新治安管理处罚法保障正当防卫，但逞一时之气互殴代价极惨',
      rx: '遇醉汉或暴躁路怒立刻拉开距离到有监控处，对方动手仅做必要防卫并第一时间打 110 报警固定证据',
      roi: '防刑事案底与数十万赔偿'
    },
    {
      id: 'au_cyberlaw',
      dim: 'legal',
      q: '不写恶意爬虫突破反爬抓取公民个人信息，不用外挂/脚本攻击修改他人系统',
      why: '《刑法》第285/286条（非法获取计算机信息系统数据罪/破坏计算机信息系统罪）与第253条之一（侵犯公民个人信息罪）是技术人最易踩的牢狱红线',
      rx: '技术测试严格遵守授权边界，不碰公民隐私数据、不写破解外挂、不搞删库泄愤',
      roi: '守住程序员职业生命线'
    }
  ];

  /* =========================================================
     二、36条循证避坑智库词条 (忠实提炼自 HowToLiveBetter)
     ========================================================= */
  const HANDBOOK_ENTRIES = [
    // --- 类别 1：保命与慢病 (health) ---
    {
      id: 'hb_01',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第1节 · 不要早死',
      title: '坐车系安全带——后排也要系',
      grade: 'A',
      cost: '钱=0 · 时间=少 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '不管坐前排还是后排，上车第一件事就是扣安全带。后排不系安全带，发生车祸时不仅自己致死率飙升，还会像炮弹一样把前排系了安全带的人撞死。',
      evidence: '安全带使前排死亡风险降低 45%~50%，重伤风险降低 45%~55%。后排不系安全带致死率是系安全带的 3 倍，被甩出车外致死率高达 75%；且后排乘客不系安全带会使前排乘客死亡风险暴增 5 倍。',
      source: 'NHTSA 统计报告；Kahane CJ, 2015；WHO Global Status Report on Road Safety'
    },
    {
      id: 'hb_02',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第1节 · 不要早死',
      title: '戒烟（含远离二手烟）——什么时候戒都不晚',
      grade: 'A',
      cost: '钱=0(还省钱) · 时间=0 · 毅力=是',
      roi: '极高',
      zeroCost: true,
      plain: '吸烟平均夺走你 10 年寿命。30岁戒烟能把这10年几乎全追回来，50岁戒烟也能追回6年。靠硬扛戒烟成功率仅 3%~5%，去三甲医院“戒烟门诊”用药物辅助成功率翻倍。',
      evidence: '英国医生50年随访（n=34,439）：吸烟者平均减寿10年；30/40/50/60岁戒烟分别追回 10/9/6/3 年寿命。停止吸烟1年后冠心病风险减半，15年后接近非吸烟者。二手烟使不吸烟配偶肺癌风险增 20%~30%。',
      source: 'Doll R et al., BMJ, 2004；US Surgeon General Report, 2020'
    },
    {
      id: 'hb_03',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第1节 · 不要早死',
      title: '每年至少量一次血压（知晓即保命）',
      grade: 'A',
      cost: '钱=0~少 · 时间=少 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '中国每4个成年人就有1个高血压，但近一半人根本不知道！高血压平时不疼不痒，第一次发作往往就是脑出血或脑梗。超过 140/90 mmHg 就去心内科挂号，每天几毛钱降压药就能保命。',
      evidence: 'Lancet 荟萃分析（n=613,815，123项RCT）：收缩压每降低 10 mmHg，主要心血管事件减少 20%，脑卒中减少 27%，心力衰竭减少 28%，全因死亡降低 13%。',
      source: 'Ettehad D et al., The Lancet, 2016；《中国心血管健康与疾病报告2022》'
    },
    {
      id: 'hb_04',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第1节 · 不要早死',
      title: '接种 HPV 疫苗与每年秋季流感疫苗',
      grade: 'A',
      cost: '钱=少~中 · 时间=少 · 毅力=否',
      roi: '极高',
      zeroCost: false,
      plain: 'HPV疫苗是目前人类唯一能明确预防癌症（宫颈癌、口咽癌、肛门癌等）的疫苗，男女都能打，国产二价性价比极高。流感不是普通感冒，每年9-10月花百十块钱打一针流感疫苗是最划算的健康投资。',
      evidence: '瑞典全国队列（n=1,672,983，NEJM）：17岁前接种HPV疫苗使浸润性宫颈癌风险降低 88%，17~30岁接种降低 53%。流感疫苗使健康成人感染风险降 40%~60%，心血管患者全因死亡降 25%。',
      source: 'Lei J et al., NEJM, 2020；WHO Position Paper on Vaccines'
    },
    {
      id: 'hb_05',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第1节 · 不要早死',
      title: '40~45岁起做一次无痛肠镜（直接把肠癌掐死在息肉期）',
      grade: 'A',
      cost: '钱=少(医保可报) · 时间=少 · 毅力=否',
      roi: '极高',
      zeroCost: false,
      plain: '结直肠癌 90% 以上是从良性腺瘤性息肉一步步花 5~10 年变成癌的。做一次肠镜发现息肉顺手切掉，就能管 5~10 年平安。普通体检的“抽血查癌胚抗原CEA”发现早期肠癌基本没用！',
      evidence: 'NEJM 20年随访研究（n=2,602）：结肠镜筛查并切除腺瘤性息肉，使结直肠癌死亡率直接降低 53%。有直系亲属肠癌史者应提前至40岁或比亲属确诊年龄早10年筛查。',
      source: 'Zauber AG et al., NEJM, 2012；《中国结直肠癌筛查与早诊早治指南》'
    },
    {
      id: 'hb_06',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第2节 · 不要慢慢死',
      title: '每天睡够 7~8 小时，且久坐每 30~60 分钟起身一次',
      grade: 'A',
      cost: '钱=0 · 时间=少 · 毅力=些',
      roi: '极高',
      zeroCost: true,
      plain: '别迷信“少睡精英论”，长期睡不够6小时的人大脑β淀粉样蛋白清除受阻、胰岛素抵抗飙升。同时，哪怕你下班去健身房跑1小时，也抵消不了白天连续8小时瘫在工学椅上不动带来的血栓与代谢伤害。',
      evidence: '超100万人荟萃分析（Ann Intern Med, 2015）：排除运动量后，久坐时间最长组全因死亡风险仍增加 24%，2型糖尿病风险增 91%。睡眠<6小时人群全因死亡率显著升高（Sleep, 2010）。',
      source: 'Biswas A et al., Ann Intern Med, 2015；Cappuccio FP et al., Sleep, 2010'
    },
    {
      id: 'hb_07',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第2节 · 不要慢慢死',
      title: '每天用巴氏刷牙法 + 牙线（省下未来几万块种牙费）',
      grade: 'A',
      cost: '钱=少 · 时间=少 · 毅力=些',
      roi: '极高',
      zeroCost: false,
      plain: '牙刷毛再细也刷不到两颗牙之间的邻面（占牙面积35%），不用牙线等于只刷了一半牙。邻面龋坏一旦烂到牙髓，根管治疗+牙冠起步三五千，种一颗牙上万。牙线不会把牙缝变大，牙周炎才会！',
      evidence: 'Cochrane 系统综述（35项RCT，n=3,929）：刷牙配合牙线比单刷牙显著降低牙龈炎和邻面菌斑。严重牙周炎还会使心血管疾病风险增加 20%（Eur Heart J, 2020）。',
      source: 'Worthington HV et al., Cochrane Database Syst Rev, 2019'
    },
    {
      id: 'hb_08',
      cat: 'health',
      catName: '❤️ 保命与慢病',
      chapter: '第1节 · 不要早死',
      title: '喝酒没有“安全剂量”——红酒软化血管是彻头彻尾的谎言',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=些',
      roi: '极高',
      zeroCost: true,
      plain: 'WHO 一类致癌物清单里，酒精（乙醇）和石棉、砒霜排在一起。中国人近 40% 携带 ALDH2 基因突变（喝酒脸红），本质是体内缺乏乙醛脱氢酶，乙醛在体内蓄积致癌风险暴增数倍，练酒量等于练耐毒量。',
      evidence: 'Lancet 全球疾病负担研究（195个国家，n=2800万）：安全的饮酒剂量为 0！饮酒量与全因死亡率、癌症发病率呈严格单调递增关系。ALDH2缺陷者饮酒患食管癌风险高 6~10 倍。',
      source: 'GBD 2016 Alcohol Collaborators, The Lancet, 2018；Brooks PJ et al., PLoS Med'
    },

    // --- 类别 2：智商税粉碎机 (myth) ---
    {
      id: 'hb_09',
      cat: 'myth',
      catName: '🚫 智商税粉碎机',
      chapter: '第6节 · 反面清单',
      title: '🚫 别信“排毒养颜 / 清宿便 / 肠道SPA”',
      grade: 'MYTH',
      cost: '反面清单 · 省钱护肠',
      roi: '避坑必看',
      zeroCost: true,
      plain: '现代医学教科书里根本没有“宿便”这个词！人体的肝脏和肾脏 24 小时全自动高效解毒。市面上所有宣称“排宿便、清肠毒”的茶、果冻、酵素，核心有效成分全是泻药（大黄、番泻叶、芦荟苷）。',
      evidence: '长期服用含蒽醌类泻药（大黄、番泻叶、决明子等）会导致“结肠黑变病”，肠道神经丛不可逆受损，最终不吃药就彻底拉不出，且显著增加结直肠腺瘤风险。',
      source: 'Klein AV & Kiat H, J Hum Nutr Diet, 2015；中华医学会消化病学分会《慢性便秘诊治指南》'
    },
    {
      id: 'hb_10',
      cat: 'myth',
      catName: '🚫 智商税粉碎机',
      chapter: '第6节 · 反面清单',
      title: '🚫 别买“弱碱性水 / 富氢水 / 小分子团水”',
      grade: 'MYTH',
      cost: '反面清单 · 拒绝溢价',
      roi: '避坑必看',
      zeroCost: true,
      plain: '“酸碱体质理论”的创始人 Robert O. Young 早在 2018 年就被美国法院判赔 1.05 亿美元并承认欺诈入狱。人体血液 pH 值由肺和肾死死锁定在 7.35~7.45，喝任何水进了 pH 1.5 的强胃酸里瞬间就被中和了。',
      evidence: 'Fenton TR 等人在 BMJ Open 发表的系统综述（纳入8278篇文献筛选）明确证实：饮食或饮水的酸碱度无法改变人体血液 pH 值，对预防癌症或慢性病没有任何临床证据。烧开的自来水就是满分好水。',
      source: 'Fenton TR & Huang T, BMJ Open, 2016'
    },
    {
      id: 'hb_11',
      cat: 'myth',
      catName: '🚫 智商税粉碎机',
      chapter: '第6节 · 反面清单',
      title: '🚫 别喝“胶原蛋白饮品 / 燕窝 / 阿胶”指望补脸补血',
      grade: 'MYTH',
      cost: '反面清单 · 年省数千',
      roi: '避坑必看',
      zeroCost: true,
      plain: '大分子胶原蛋白吃进肚子，会被胃蛋白酶和胰蛋白酶拆解成最普通的氨基酸，运到全身哪里全看身体需要，根本不会定向跑到你脸上长成胶原蛋白。阿胶本质是水煮驴皮，补铁效率连5块钱一盒的红肉或琥珀酸亚铁的零头都不到。',
      evidence: '胶原蛋白属于缺乏色氨酸的“不完全蛋白”，营养价值远低于鸡蛋（生物价94）和牛奶。皮肤胶原流失70%源于紫外线光老化，涂防晒霜/撑伞的性价比是喝胶原蛋白饮的100倍。',
      source: '中国营养学会《中国居民膳食指南》；FDA Dietary Supplement Warnings'
    },
    {
      id: 'hb_12',
      cat: 'myth',
      catName: '🚫 智商税粉碎机',
      chapter: '第6节 · 反面清单',
      title: '🚫 别买“防蓝光眼镜”指望预防近视或护眼',
      grade: 'MYTH',
      cost: '反面清单 · 省几百元',
      roi: '避坑必看',
      zeroCost: true,
      plain: '手机和电脑屏幕发出的蓝光强度连户外阴天自然光的几十分之一都不到，根本达不到损伤视网膜的阈值。你看屏幕眼睛酸痛，是因为眨眼次数从每分钟 15 次骤降到 5 次导致的干眼症和睫状肌痉挛。',
      evidence: '2023年 Cochrane 权威系统综述（纳入17项RCT，619名受试者）：防蓝光镜片与普通镜片相比，在缓解视疲劳、改善睡眠质量、保护黄斑健康方面没有任何统计学差异。真正管用的是“20-20-20法则”（每20分钟看20英尺外20秒）。',
      source: 'Singh S et al., Cochrane Database Syst Rev, 2023；美国眼科学会 (AAO) 官方声明'
    },
    {
      id: 'hb_13',
      cat: 'myth',
      catName: '🚫 智商税粉碎机',
      chapter: '第6节 · 反面清单',
      title: '🚫 别买“孕妇防辐射服 / 手机防辐射贴 / 仙人掌防辐射”',
      grade: 'MYTH',
      cost: '反面清单 · 破除焦虑',
      roi: '避坑必看',
      zeroCost: true,
      plain: '自然界辐射分两种：会破坏DNA的是“电离辐射”（X光、CT、核辐射）；而手机、Wi-Fi、电脑、微波炉、基站发出的是“非电离辐射”，能量连打断一个化学键都做不到，除了微微发热没有任何致畸致癌能力。',
      evidence: 'WHO 国际电磁场项目历经20年研究确认：日常低频电磁场与射频场不会导致流产、胎儿畸形或癌症。至于在办公桌放仙人掌防辐射——仙人掌既不吸收电磁波，电磁波也是直线传播不会拐弯钻进花盆里。',
      source: 'WHO Electromagnetic Fields (EMF) Fact Sheet；ICNIRP Guidelines'
    },
    {
      id: 'hb_14',
      cat: 'myth',
      catName: '🚫 智商税粉碎机',
      chapter: '第6节 · 反面清单',
      title: '🚫 别信“解酒药 / 护肝片能让你放心喝酒”',
      grade: 'MYTH',
      cost: '反面清单 · 别拿命试',
      roi: '避坑必看',
      zeroCost: true,
      plain: '酒精在肝脏靠“乙醇脱氢酶”变成剧毒致癌物乙醛，再靠“乙醛脱氢酶”变成乙酸。这两把酶的数量完全由你的基因写死，没有任何口服药物能凭空给你变出酶来！吃解酒药只给了你“还能再喝二两”的致命错觉。',
      evidence: '市面上所谓解酒药多为维生素B族、葛根、水飞蓟或利尿成分，无法加速乙醛代谢，反而增加肝脏同时代谢酒精与药物的双重负担（药物性肝损伤）。唯一解酒护肝的方法是不喝或少喝。',
      source: 'Pittler MH et al., BMJ, 2005；《药物性肝损伤诊治指南》'
    },

    // --- 类别 3：守财与省钱 (wealth) ---
    {
      id: 'hb_15',
      cat: 'wealth',
      catName: '💰 守财与省钱',
      chapter: '第5节 · 不要浪费钱',
      title: '立刻清退所有 App 的“自动续费与免密支付”',
      grade: 'A',
      cost: '钱=0 · 时间=3分钟 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '只要你在开通会员时看到“首月 0.9 元 / 免费试用7天”，开通后的下一秒立刻去微信/支付宝/AppStore把自动续费关掉！关掉不影响当月权益，但能彻底杜绝未来一整年每月默默扣你 25~68 元。',
      evidence: '路径备忘：①微信：我→服务→钱包→底栏[支付设置]→自动续费；②支付宝：我的→右上角设置→支付设置→免密支付/自动扣款；③苹果iOS：设置→点击Apple ID头像→订阅。',
      source: '《消费者权益保护法实施条例》(2024施行) 第10条：自动展期、自动续费应当显著提醒'
    },
    {
      id: 'hb_16',
      cat: 'wealth',
      catName: '💰 守财与省钱',
      chapter: '第21节 · 五险一金与个税',
      title: '每年3-6月办个税汇算退税，填满7项专项附加扣除',
      grade: 'A',
      cost: '钱=0 · 时间=10分钟 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '国家明文给普通打工人的免税额度，不填就没人替你省！只要你在工作城市无房租房住，每月就能扣 1500 元免税额；父母满60岁且你是独生子女，每月再扣 3000 元；考下国家职业资格证书当年还能再扣 3600 元。',
      evidence: '7项法定专项附加扣除：①住房租金（800~1500元/月）；②住房贷款利息（1000元/月）；③赡养老人（独生3000元/月）；④3岁以下婴幼儿照护（2000元/月/孩）；⑤子女教育（2000元/月/孩）；⑥继续教育；⑦大病医疗。',
      source: '《国务院关于提高个人所得税有关专项附加扣除标准的通知》(国发〔2023〕13号)'
    },
    {
      id: 'hb_17',
      cat: 'wealth',
      catName: '💰 守财与省钱',
      chapter: '第21节 · 五险一金与个税',
      title: '公积金别躺在账上吃 1.5% 死息——租房也能按月提出来花',
      grade: 'A',
      cost: '钱=0 · 时间=5分钟 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '很多人以为只有买房才能动公积金。其实只要你在工作城市名下无房，打开支付宝“市民中心”或当地公积金小程序，选“租房提取”，大部分一二线城市无需房东提供发票即可零材料按月提取 1500~4000 元打进银行卡！',
      evidence: '租房提取不会影响你未来首次使用公积金贷款的资格（但若近期2年内打算申请公积金买房贷款，需先看当地是否要求账户留存一定余额作为贷款额度计算基数）。',
      source: '住建部、财政部、人民银行《关于放宽提取住房公积金支付房租条件的通知》'
    },
    {
      id: 'hb_18',
      cat: 'wealth',
      catName: '💰 守财与省钱',
      chapter: '第18节 · 保险避坑',
      title: '普通人保险极简配置：国家医保 + 百万医疗 + 意外险 + 定期寿险',
      grade: 'A',
      cost: '钱=少 · 时间=少 · 毅力=否',
      roi: '极高',
      zeroCost: false,
      plain: '千万别买“有病治病、没病返钱”的分红型/返还型保险，那是用你多交3倍的保费去买收益极低的理财。普通年轻人一年花不到 1000 元就能配齐百万医疗险（约300元）+ 综合意外险（约150元），彻底锁死因病致贫风险。',
      evidence: '保险的本质是“用极小保费撬动极高保额对冲极端灾难”。国家医保是唯一可带病投保、终身续保的基石，断缴一天都是巨亏；百万医疗险重点看“保证续保20年”与“外购抗癌药报销条款”。',
      source: '《中华人民共和国社会保险法》；银保监会人身保险产品精算规定'
    },
    {
      id: 'hb_19',
      cat: 'wealth',
      catName: '💰 守财与省钱',
      chapter: '第5节 · 不要浪费钱',
      title: '买药认准“化学通用名”与“一致性评价”——同样药效省 80% 钱',
      grade: 'A',
      cost: '钱=省大钱 · 时间=1分钟 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '药店导购最爱推销几十块一盒、包装花哨的“商品名”高毛利药。学会看药盒上字体端正的【通用名】和蓝白标志【通过仿制药一致性评价】：3块钱的布洛芬片和35块钱的止痛胶囊，里面的有效化学分子一模一样。',
      evidence: '国家药监局（NMPA）要求通过“仿制药质量和疗效一致性评价”的药品，必须在生物等效性（BE试验，血药浓度曲线AUC和Cmax在80%~125%区间）上与原研药严格一致。',
      source: '国务院办公厅《关于开展仿制药质量和疗效一致性评价的意见》(国办发〔2016〕8号)'
    },
    {
      id: 'hb_20',
      cat: 'wealth',
      catName: '💰 守财与省钱',
      chapter: '第5节 · 不要浪费钱',
      title: '守住 3~6 个月刚性开支的“保命应急金”，拒绝任何超 6% 承诺收益',
      grade: 'A',
      cost: '钱=0 · 时间=少 · 毅力=些',
      roi: '极高',
      zeroCost: true,
      plain: '在买任何股票、基金、长期理财之前，先在纯货币基金或银行活期/国债逆回购里存够 3~6 个月房租+吃饭钱。记住铁律：任何向你承诺“稳赚不赔、保本年化超过 6%”的项目，你看中它的利息，它看中你的全部本金。',
      evidence: '原银保监会主席郭树清经典风险警示：“收益率超过6%就要打问号，超过8%就很危险，10%以上就要准备损失全部本金。”充足的应急备用金也是你在职场面对PUA时随时敢掀桌子的底气。',
      source: '中国人民银行金融消费者权益保护局风险提示'
    },

    // --- 类别 4：职场与裁员 (career) ---
    {
      id: 'hb_21',
      cat: 'career',
      catName: '💼 职场与裁员',
      chapter: '第19节 · 在职离职与工伤',
      title: '被公司裁员/劝退时，打死别签“个人原因辞职申请”',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=些',
      roi: '极高',
      zeroCost: true,
      plain: 'HR说“你签主动离职背景调查更好看，公司下个月私下给你发补偿”——100%是骗局！只要你在《离职申请表》勾选了“个人原因”，法律上视同你主动放弃全部赔偿金（N或N+1），且直接丧失申领每月约 2000 元失业保险金的资格。',
      evidence: '《劳动合同法》第46、47条：用人单位提出协商解除劳动合同，应按工作年限每满一年支付一个月工资（N）；无过失性辞退未提前30天书面通知需额外支付一个月代通知金（N+1）；违法解除则需支付 2N 赔偿金。',
      source: '《中华人民共和国劳动合同法》第40、46、47、87条'
    },
    {
      id: 'hb_22',
      cat: 'career',
      catName: '💼 职场与裁员',
      chapter: '第19节 · 在职离职与工伤',
      title: '遇到恶意降薪、拖欠工资或断缴社保：可主动提“被迫解除”并拿 N 赔偿',
      grade: 'A',
      cost: '钱=0(劳动仲裁免费) · 时间=中 · 毅力=是',
      roi: '极高',
      zeroCost: true,
      plain: '公司为了逼你自己走，单方面把你降薪30%、调去外地看大门或拖欠工资？千万别赌气旷工（旷工3天公司可合法0元开除你）！正确做法是正常打卡出勤，书面发函要求限期补足，逾期直接寄送《被迫解除劳动合同通知书》申请劳动仲裁拿 N 赔偿。',
      evidence: '《劳动合同法》第38条、第46条：用人单位未及时足额支付劳动报酬、未依法缴纳社保、或未按合同约定提供劳动条件的，劳动者可以解除劳动合同，且用人单位应当支付 N 倍经济补偿金。劳动争议仲裁完全免费（0元受理费）。',
      source: '《劳动合同法》第38条；《劳动争议调解仲裁法》第53条'
    },
    {
      id: 'hb_23',
      cat: 'career',
      catName: '💼 职场与裁员',
      chapter: '第19节 · 在职离职与工伤',
      title: '离职证明上严禁写你的坏话，否则公司要赔你失业期间工资',
      grade: 'A',
      cost: '钱=0 · 时间=少 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '有些格局极小的公司会在《离职证明》上写“因能力不足辞退”“存在违纪纠纷”，导致你无法入职下家。法律明确规定离职证明只能写4项客观信息，多写一个字导致你下家offer黄了，你可以起诉前司全额赔偿你待业期间的工资损失！',
      evidence: '《劳动合同法实施条例》第24条：解除或终止劳动合同的证明，只应写明劳动合同期限、解除或终止日期、工作岗位、在本单位的工作年限四项内容。拒绝开具或记载不利内容造成劳动者无法就业的，依《劳动合同法》第89条承担赔偿责任。',
      source: '《中华人民共和国劳动合同法》第50、89条；《实施条例》第24条'
    },
    {
      id: 'hb_24',
      cat: 'career',
      catName: '💼 职场与裁员',
      chapter: '第19节 · 在职离职与工伤',
      title: '工伤黄金法则：工作突发疾病 48 小时抢救线 & 通勤车祸必报警',
      grade: 'A',
      cost: '钱=0 · 时间=少 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '两条救全家命的工伤铁律：①上下班合理路线被车撞伤，无论对方怎么私了，必须打122让交警出《事故责任认定书》（非本人主要责任即算工伤）；②公司不给报工伤，员工/家属必须在事故发生 1 年内自己去人社局申请工伤认定，过期作废！',
      evidence: '《工伤保险条例》第14条第(六)项（上下班非本人主责交通事故视同工伤）、第15条第(一)项（在工作时间和工作岗位，突发疾病死亡或者在48小时之内经抢救无效死亡的，视同工伤）、第17条（个人申请时效1年）。',
      source: '国务院《工伤保险条例》第14、15、17条'
    },

    // --- 类别 5：法律与技术红线 (legal) ---
    {
      id: 'hb_25',
      cat: 'legal',
      catName: '⚖️ 法律与技术红线',
      chapter: '第8节 · 别把自己搭进去',
      title: '银行卡、手机卡、微信号绝不外借——小心“帮信罪”让你坐牢断卡5年',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '朋友说“我银行卡限额了，借你卡收笔工程款/刷流水，给你500块红包”——千万别借！现在电诈洗钱全靠买卡借卡，只要你的卡里流过超过 20 万涉诈黑钱（或支付结算超一定标准），直接触发《刑法》帮信罪，判刑三年以下，且全国银行惩戒5年只能柜台取现！',
      evidence: '《刑法》第287条之二（帮助信息网络犯罪活动罪）已是当前全国刑事立案数量排名前三的罪名；《反电信网络诈骗法》第31、44条规定非法买卖、出租、出借电话卡、金融账户将实施5年金融信用联合惩戒。',
      source: '《中华人民共和国刑法》第287条之二；《反电信网络诈骗法》(2022) 第31条'
    },
    {
      id: 'hb_26',
      cat: 'legal',
      catName: '⚖️ 法律与技术红线',
      chapter: '第8节 · 别把自己搭进去',
      title: '不当挂名法定代表人，不在亲友借条“担保人”栏签字',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '老板或亲戚哄你：“工商登记借你身份证挂个法人代表，每个月给你补贴1000块，出事算我的”——你们私下签的“免责协议”在法院和税务局面前就是废纸！公司一旦欠债不还或虚开发票，被限制高消费（禁坐高铁飞机）、拉入失信黑名单甚至抓去审讯的第一顺位就是你。',
      evidence: '《民法典》第61条（法定代表人法律后果）及《民事诉讼法》第266条（被执行人为空壳公司时，对法定代表人采取限制高消费、限制出境措施）。《民法典》第686条：保证方式没有约定或约定不明的，按一般保证处理，但实务中格式合同均印死“连带责任保证”。',
      source: '《中华人民共和国民法典》第61、686条；《民事诉讼法》第266条'
    },
    {
      id: 'hb_27',
      cat: 'legal',
      catName: '⚖️ 法律与技术红线',
      chapter: '第9节 · 普通人容易踩的法律红线',
      title: '街头冲突绝不先动手、不互殴——记牢2026新《治安管理处罚法》正当防卫条款',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=些',
      roi: '极高',
      zeroCost: true,
      plain: '鼻梁骨打折、耳膜穿孔、掉两颗牙就够得上“轻伤二级”——这不是赔几千块医药费的事，而是直接跨入《刑法》故意伤害罪（三年以下有期徒刑），一辈子背犯罪案底，自己丢工作、子女考公政审受限！对方骂街你转身就走，对方先动手你只做制止侵害并立刻报警。',
      evidence: '2025年修订、2026年1月1日正式施行的《治安管理处罚法》第19条历史性新增治安领域的“正当防卫”免责条款：为了免受正在进行的不法侵害而采取的制止行为，不属于违反治安管理行为。但注意：互相斗殴、事后报复仍严惩！',
      source: '《治安管理处罚法》(2025修订) 第19条；《刑法》第234条；《人体损伤程度鉴定标准》'
    },
    {
      id: 'hb_28',
      cat: 'legal',
      catName: '⚖️ 法律与技术红线',
      chapter: '第11节 · 程序员和技术人红线',
      title: '程序员保命三不碰：不写突破反爬的隐私爬虫、不删库留后门、不接灰产外包',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '技术无罪是最大的误区！绕过网站验证码/加密接口抓取公民手机号、简历或订单数据超过 50~500 条即可刑事立案；离职泄愤 rm -rf 删库或注入逻辑炸弹，直接按《刑法》第286条破坏计算机信息系统罪判刑（5年以下，后果严重5年以上，缓刑极难）！',
      evidence: '《刑法》第253条之一（侵犯公民个人信息罪：非法获取行踪轨迹、通信内容、征信或财产信息50条以上即入罪）；第285条（非法侵入/获取计算机信息系统数据罪、提供侵入工具/外挂罪）；第286条（破坏计算机信息系统罪）。',
      source: '《刑法》第253条之一、285条、286条；两高《关于办理侵犯公民个人信息刑事案件适用法律若干问题的解释》'
    },
    {
      id: 'hb_29',
      cat: 'legal',
      catName: '⚖️ 法律与技术红线',
      chapter: '第8节 · 别把自己搭进去',
      title: '给别人转账借款：必须留微信聊天确认 + 身份证号 + 银行实名转账',
      grade: 'A',
      cost: '钱=0 · 时间=2分钟 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '真到万不得已借钱给朋友，绝不能给现金！必须让他先在微信发文字“今向XX借款X万元，X月X日前归还，本人身份证号XXXX”，并且你要向他收集身份证照片（没有对方18位身份证号，连去法院立案起诉的资格都没有），转账备注写明“借款”。',
      evidence: '注意3年诉讼时效（《民法典》第188条）：约定还款日到期后3年内如果不催收，法律不再保护胜诉权；只要每两年在微信发一句“上次借的X万什么时候还”且对方回复确认，3年诉讼时效就会重新刷新计算！',
      source: '《中华人民共和国民法典》第188、675条；《民事诉讼法》第122条'
    },
    {
      id: 'hb_30',
      cat: 'legal',
      catName: '⚖️ 法律与技术红线',
      chapter: '第9节 · 普通人容易踩的法律红线',
      title: '海淘/闲鱼二手绝不碰“海外处方聪明药/安眠药/减重神药”——小心走私贩毒罪',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '日本网红眼药水/止痛药、泰国减肥药、所谓的考研“聪明药”（利他林/阿莫达非尼）、日本安眠药（蓝精灵/氟硝西泮），很多在我国属于严格管制的国家一类/二类精神药品（法律上等同于毒品）！海淘代购一盒寄回国或挂闲鱼转卖多余的几粒，直接定“走私、贩卖毒品罪”。',
      evidence: '《刑法》第347条：走私、贩卖、运输、制造毒品，无论数量多少，都应当追究刑事责任，予以刑事处罚。国家药监局、公安部、海关总署《麻醉药品和精神药品目录》明确将哌醋甲酯、氟硝西泮、三唑仑等列入严管名录。',
      source: '《中华人民共和国刑法》第347、357条；最高法《审理毒品犯罪案件纪要》'
    },

    // --- 类别 6：急救与看病 (emergency) ---
    {
      id: 'hb_31',
      cat: 'emergency',
      catName: '🚑 急救与看病',
      chapter: '第13节 · 紧急情况',
      title: '脑卒中（中风）黄金 4.5 小时：背熟 BE-FAST 口诀，绝不喂药扎手指',
      grade: 'A',
      cost: '钱=0 · 时间=1分钟记牢 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '家里老人突然半边身子麻木、嘴角歪斜、说话大舌头——这就是脑卒中！脑细胞每耽误1分钟就死掉 190 万个。立刻打 120 送有“卒中中心”的医院溶栓，千万别信偏方去“针扎十指放血”或硬塞安宫牛黄丸/阿司匹林（如果是脑出血喂阿司匹林会加速致死，喂丸子极易窒息）！',
      evidence: 'BE-FAST 识别法：B(Balance平衡失调)、E(Eyes视物模糊)、F(Face口角歪斜)、A(Arm单侧手臂无力下垂)、S(Speech言语含糊)、T(Time立即拨打120记录发病精确时间)。静脉溶栓黄金时间窗为发病后 4.5 小时内。',
      source: 'AHA/ASA 急性缺血性脑卒中早期管理指南；《中国急性缺血性脑卒中诊治指南》'
    },
    {
      id: 'hb_32',
      cat: 'emergency',
      catName: '🚑 急救与看病',
      chapter: '第13节 · 紧急情况',
      title: '异物卡喉窒息：学会海姆立克急救法（鱼刺卡喉严禁吞饭团喝醋）',
      grade: 'A',
      cost: '钱=0 · 时间=3分钟学会 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '①吃果冻/汤圆/牛排完全堵死气管（双手掐脖子说不出话）：站在背后环抱肚脐上方两横指，握拳向内上方猛烈冲击（自己独处时顶住椅背猛冲）；②鱼刺卡喉咙：千万别吞饭团或喝醋！吞饭会把鱼刺从扁桃体硬生生怼穿食管扎破主动脉，一晚急诊手术费十万起步甚至致命，去耳鼻喉科花几十块夹出来最安全。',
      evidence: '完全气道异物梗阻超过 4~6 分钟即可造成不可逆脑死亡。食管第二狭窄紧贴主动脉弓，盲目吞咽饭团导致鱼刺刺穿食管引发主动脉食管瘘死亡率超过 80%。',
      source: '美国心脏协会 (AHA) CPR & ECC Guidelines；《中华耳鼻咽喉头颈外科杂志》'
    },
    {
      id: 'hb_33',
      cat: 'emergency',
      catName: '🚑 急救与看病',
      chapter: '第34节 · 家里的常备药别吃出事',
      title: '感冒药 + 退烧药叠吃 = 急性肝衰竭高危！认准“对乙酰氨基酚”上限',
      grade: 'A',
      cost: '钱=0 · 时间=1分钟看药盒 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '每年冬天都有年轻人因为发烧难受，同时吃“999感冒灵/维C银翘片” + “泰诺/白加黑” + “退烧药”，结果直接住进 ICU 换肝！因为这些药背后全含有同一个西药成分——【对乙酰氨基酚】。叠着吃极易超过每日 2000~4000mg 的肝脏代谢极限。',
      evidence: '对乙酰氨基酚过量是欧美及中国引发急性肝衰竭（ALF）的首要药物原因（Larson AM et al., Hepatology）。成人单次不超过 500mg，24小时内所有药品叠加总量严禁超过 2000mg（药典上限4000mg，饮酒者减半）。',
      source: 'Larson AM et al., Hepatology, 2005；国家药监局《对乙酰氨基酚说明书修订公告》'
    },
    {
      id: 'hb_34',
      cat: 'emergency',
      catName: '🚑 急救与看病',
      chapter: '第34节 · 家里的常备药别吃出事',
      title: '头孢/甲硝唑 + 酒 = 双硫仑样反应（停药 7 天内一滴酒都不能沾）',
      grade: 'A',
      cost: '钱=0 · 时间=0 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '吃了头孢类消炎药、甲硝唑、替硝唑（哪怕是治牙疼或外用栓剂），吃药期间以及停药后的整整 7 天内，啤酒、白酒、料酒、酒心巧克力、藿香正气水（含40%~50%酒精！）一滴都不能碰！否则乙醛在体内瞬间爆炸式堆积，引发血压骤降、休克甚至猝死。',
      evidence: '头孢菌素分子中的“甲硫四氮唑侧链”会强力抑制肝脏乙醛脱氢酶活性，使饮酒后血中乙醛浓度飙升 5~10 倍，15分钟内即可出现面部潮红、剧烈头痛、心肌梗死或呼吸抑制。',
      source: '《抗菌药物临床应用指导原则》；中华急诊医学杂志《双硫仑样反应急诊诊治专家共识》'
    },
    {
      id: 'hb_35',
      cat: 'emergency',
      catName: '🚑 急救与看病',
      chapter: '第24节 · 看病',
      title: '三甲医院看病黄金3分钟公式：如何让专家对你高看一眼',
      grade: 'B',
      cost: '钱=0 · 时间=候诊5分钟准备 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '三甲门诊一个主任上午要看60个号，平均每人只有3分钟。一进门别从“我前年去旅游着凉”开始讲故事！候诊时在手机备忘录写好5句话直接递给医生看：①最难受的症状+部位；②持续了多久+什么情况下加重；③吃过什么药+有没有用；④既往病史/过敏史；⑤今天最想解决什么问题。',
      evidence: '医患沟通研究表明，结构化的病史陈述（SITUATION-BACKGROUND）能使门诊有效诊疗时间利用率提升 60% 以上，显著降低漏诊率与重复开单检查概率。同时：千万别用百度搜病（全是莆田系广告），查医学科普认准【默沙东诊疗手册大众版】或【丁香医生/腾讯医典】。',
      source: '《临床诊断学》问诊规范；默沙东诊疗手册 (MSD Manuals)'
    },
    {
      id: 'hb_36',
      cat: 'emergency',
      catName: '🚑 急救与看病',
      chapter: '第13节 · 紧急情况',
      title: '烧烫伤急救五字诀“冲脱泡盖送”——涂牙膏/酱油/香油全是在毁容',
      grade: 'A',
      cost: '钱=0 · 时间=15~30分钟冲水 · 毅力=否',
      roi: '极高',
      zeroCost: true,
      plain: '做饭被热油溅到或被开水烫到，第一反应绝不是找牙膏、芦荟胶、酱油或冰块！唯一正确的操作是立刻拧开水龙头，用流动的常温自来水持续冲洗烫伤部位 15~30 分钟，把皮肤深层的余热带走。涂牙膏和酱油不仅毫无降温作用，去医院还得让护士拿刷子忍着剧痛给你生生刷掉！',
      evidence: '创面脱离热源后，皮下组织余热仍会继续向深层传导数十分钟（使一度烫伤恶化为二度留疤）。15~20℃流动冷水冲洗20分钟可显著减小创面深度与水泡形成率（不能用0℃冰块直接敷，会导致冻伤加重组织坏死）。',
      source: '国际烧伤学会 (ISBI) Practice Guidelines for Burn Care；中国红十字会急救指南'
    }
  ];

  /* =========================================================
     三、内部状态管理
     ========================================================= */
  let curSubMod = 'audit'; // 'audit' | 'library' | 'draw'
  let checkedAuditIds = new Set();
  let doneEntryIds = new Set();
  let curLibCat = 'all';
  let curLibQuick = 'all'; // 'all' | 'zero' | 'gradeA' | 'todo'
  let curSearchKeyword = '';
  let curDrawPool = 'all'; // 'all' | 'health' | 'myth' | 'legal'
  let curDrawnEntry = HANDBOOK_ENTRIES[0];
  let isCardFlipping = false;

  function loadStorage() {
    try {
      const rawAudit = JSON.parse(localStorage.getItem(STORAGE_AUDIT_KEY) || 'null');
      if (Array.isArray(rawAudit)) {
        checkedAuditIds = new Set(rawAudit);
      } else {
        // 默认初始化一套有代表性的打工人初始勾选（方便首次打开直接看到真实处方体验）
        checkedAuditIds = new Set(['au_meds', 'au_antimyth', 'au_bankcard', 'au_guarantor', 'au_fight', 'au_cyberlaw']);
      }
    } catch (e) {
      checkedAuditIds = new Set(['au_meds', 'au_antimyth', 'au_bankcard', 'au_guarantor', 'au_fight', 'au_cyberlaw']);
    }

    try {
      const rawDone = JSON.parse(localStorage.getItem(STORAGE_DONE_KEY) || '[]');
      if (Array.isArray(rawDone)) {
        doneEntryIds = new Set(rawDone);
      }
    } catch (e) {
      doneEntryIds = new Set();
    }
  }

  function saveAuditStorage() {
    try {
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify([...checkedAuditIds]));
    } catch (e) {}
  }

  function saveDoneStorage() {
    try {
      localStorage.setItem(STORAGE_DONE_KEY, JSON.stringify([...doneEntryIds]));
    } catch (e) {}
  }

  function getEntryMeta(entry) {
    if (!entry) {
      return {
        badge: '🅰️ 循证实操',
        stamp: '清醒\n实操',
        color: '#34D399'
      };
    }
    const isMyth = entry.grade === 'MYTH';
    const isEmergency = entry.cat === 'emergency';
    const isLegal = entry.cat === 'legal' || entry.cat === 'career';

    return {
      badge: isMyth
        ? '🚫 智商税避雷'
        : (isEmergency ? '🚨 救命硬核' : (isLegal ? '⚖️ 维权护身' : '🅰️ 循证实操')),
      stamp: isMyth ? '破妄\n避坑' : (isEmergency ? '救命\n铁律' : '清醒\n实操'),
      color: isMyth ? '#FB7185' : (isEmergency ? '#F59E0B' : '#34D399')
    };
  }

  /* =========================================================
     四、计分与段位评估引擎
     ========================================================= */
  function calcAuditResult() {
    const totalCount = AUDIT_ITEMS.length;
    const checkedCount = AUDIT_ITEMS.filter(it => checkedAuditIds.has(it.id)).length;
    const score = Math.round((checkedCount / totalCount) * 100);

    const dimStats = {};
    AUDIT_DIMS.forEach(d => {
      const items = AUDIT_ITEMS.filter(x => x.dim === d.key);
      const done = items.filter(x => checkedAuditIds.has(x.id)).length;
      dimStats[d.key] = {
        done,
        total: items.length,
        pct: Math.round((done / items.length) * 100)
      };
    });

    const missedItems = AUDIT_ITEMS.filter(it => !checkedAuditIds.has(it.id));

    let tierBadge = '🛡️ 循证生存评级';
    let tierTitle = '稳健生存派 · 局部有漏风';
    let tierDesc = '你已经避开了绝大多数致命的大坑，但在部分零成本高收益的习惯上还有漏项。照着下方处方花10分钟补齐，就能把人生防御力拉满。';
    let color = '#34D399';

    if (score >= 90) {
      tierBadge = '👑 满级防割护体 · S级';
      tierTitle = '人间清醒六边形战士';
      tierDesc = '极其罕见的清醒大脑！你不仅有极强的惜命意识与科学素养，还把个人财务、职场证据与法律护城河守得滴水不漏，智商税和镰刀见了你都得绕道走。';
      color = '#10B981';
    } else if (score >= 68) {
      tierBadge = '🛡️ 稳健清醒派 · A级';
      tierTitle = '人间清醒进阶学者';
      tierDesc = '你的大方向非常稳健，守住了核心的法律与智商税底线。不过在后排安全带、个税/公积金回血或职场留证上还有几处“零成本高回报”的盲区，顺手补上血赚不亏！';
      color = '#34D399';
    } else if (score >= 43) {
      tierBadge = '⚠️ 脆皮防线预警 · B级';
      tierTitle = '半清醒打工人';
      tierDesc = '你虽然没踩重大法律红线，但在身体健康防线、隐形扣费或职场防坑上处于“半裸奔”状态。好消息是：下面列出的补漏处方几乎全是零成本，现在改立刻止损！';
      color = '#F59E0B';
    } else {
      tierBadge = '🚨 极高危裸奔预警 · C级';
      tierTitle = '脆皮大冤种（急需抢救）';
      tierDesc = '警报拉响！你在健康保命、钱包防漏、职场裁员维权和法律底线上存在大量高危敞口。请立刻从下方第1条零成本处方开始逐项打勾补漏！';
      color = '#FB7185';
    }

    return {
      score,
      checkedCount,
      totalCount,
      dimStats,
      missedItems,
      tierBadge,
      tierTitle,
      tierDesc,
      color
    };
  }

  /* =========================================================
     五、DOM 渲染逻辑
     ========================================================= */
  function updateTopStats() {
    const res = calcAuditResult();
    const elScore = document.getElementById('lgStatScore');
    const elAuditDone = document.getElementById('lgStatAuditDone');
    const elLibDone = document.getElementById('lgStatLibDone');
    const elMythCount = document.getElementById('lgStatMythCount');

    if (elScore) elScore.textContent = `${res.score} 分`;
    if (elAuditDone) elAuditDone.textContent = `${res.checkedCount} / ${res.totalCount}`;
    if (elLibDone) elLibDone.textContent = `${doneEntryIds.size} / ${HANDBOOK_ENTRIES.length}`;
    if (elMythCount) {
      const mythTotal = HANDBOOK_ENTRIES.filter(e => e.grade === 'MYTH').length;
      elMythCount.textContent = `${mythTotal} 项已排雷`;
    }
  }

  function renderAuditView() {
    const dimsGrid = document.getElementById('lgAuditDimsGrid');
    if (!dimsGrid) return;

    const res = calcAuditResult();

    // 1. 渲染 4 大维度勾选面板
    dimsGrid.innerHTML = AUDIT_DIMS.map(d => {
      const items = AUDIT_ITEMS.filter(x => x.dim === d.key);
      const st = res.dimStats[d.key];
      const itemsHtml = items.map(it => {
        const isChecked = checkedAuditIds.has(it.id);
        return `
          <div class="lg-audit-item ${isChecked ? 'checked' : ''}" data-audit-id="${it.id}" role="checkbox" aria-checked="${isChecked}" tabindex="0">
            <div class="lg-audit-check">${isChecked ? '✓' : ''}</div>
            <div class="lg-audit-content">
              <div class="lg-audit-q">${it.q}</div>
              <div class="lg-audit-why">💡 ${it.why}</div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="lg-dim-panel">
          <div class="lg-dim-head">
            <div class="lg-dim-title">
              <span>${d.icon}</span>
              <span>${d.name}</span>
            </div>
            <span class="lg-dim-score-pill">已做到 ${st.done}/${st.total} (${st.pct}%)</span>
          </div>
          <div class="lg-audit-list">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');

    // 绑定勾选事件
    dimsGrid.querySelectorAll('.lg-audit-item').forEach(el => {
      const toggleItem = () => {
        const id = el.dataset.auditId;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (checkedAuditIds.has(id)) {
          checkedAuditIds.delete(id);
        } else {
          checkedAuditIds.add(id);
        }
        saveAuditStorage();
        renderAuditView();
        updateTopStats();
      };
      el.addEventListener('click', toggleItem);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleItem();
        }
      });
    });

    // 2. 更新下方实时体检处方单面板
    const elScoreNum = document.getElementById('lgRepScoreNum');
    const elRingBox = document.getElementById('lgRepRingBox');
    const elTierBadge = document.getElementById('lgRepTierBadge');
    const elTierTitle = document.getElementById('lgRepTierTitle');
    const elTierDesc = document.getElementById('lgRepTierDesc');
    const elBarsGrid = document.getElementById('lgRepBarsGrid');
    const elRxList = document.getElementById('lgRepRxList');
    const elRxCount = document.getElementById('lgRepRxCount');

    if (elScoreNum) elScoreNum.textContent = res.score;
    if (elRingBox) elRingBox.style.borderColor = res.color;
    if (elTierBadge) elTierBadge.textContent = res.tierBadge;
    if (elTierTitle) elTierTitle.textContent = res.tierTitle;
    if (elTierDesc) elTierDesc.textContent = res.tierDesc;

    if (elBarsGrid) {
      elBarsGrid.innerHTML = AUDIT_DIMS.map(d => {
        const st = res.dimStats[d.key];
        return `
          <div class="lg-bar-item">
            <div class="lg-bar-head">
              <span>${d.icon} ${d.name.replace('防线', '')}</span>
              <span>${st.pct}%</span>
            </div>
            <div class="lg-bar-track">
              <div class="lg-bar-fill" style="width:${st.pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (elRxCount) {
      elRxCount.textContent = res.missedItems.length > 0
        ? `发现 ${res.missedItems.length} 项零成本/高回报待补漏洞`
        : '全部 16 项核心防线均已筑牢';
    }

    if (elRxList) {
      if (res.missedItems.length === 0) {
        elRxList.innerHTML = `
          <div class="lg-rx-card perfect">
            <div class="lg-rx-title" style="justify-content:center;font-size:15px;">🎉 恭喜！16 项高性价比人生防线已全部达成满分！</div>
            <div class="lg-rx-evidence" style="margin-top:4px;">快点击下方按钮生成你的《满级人间清醒体检报告单》分享或归档留念吧～</div>
          </div>
        `;
      } else {
        elRxList.innerHTML = res.missedItems.slice(0, 8).map((item, idx) => `
          <div class="lg-rx-card">
            <div class="lg-rx-title">
              <span>处方 #${idx + 1}：${item.rx}</span>
              <span class="lg-rx-roi">${item.roi}</span>
            </div>
            <div class="lg-rx-evidence">📌 循证依据：${item.why}</div>
          </div>
        `).join('');
      }
    }
  }

  function renderLibraryView() {
    const grid = document.getElementById('lgLibraryGrid');
    const countLabel = document.getElementById('lgLibResultCount');
    if (!grid) return;

    const kw = curSearchKeyword.trim().toLowerCase();

    const filtered = HANDBOOK_ENTRIES.filter(entry => {
      if (curLibCat !== 'all' && entry.cat !== curLibCat) return false;
      if (curLibQuick === 'zero' && !entry.zeroCost) return false;
      if (curLibQuick === 'gradeA' && entry.grade !== 'A') return false;
      if (curLibQuick === 'todo' && doneEntryIds.has(entry.id)) return false;
      if (kw) {
        const hay = `${entry.title} ${entry.plain} ${entry.evidence} ${entry.source} ${entry.chapter}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });

    if (countLabel) {
      countLabel.textContent = `当前筛选共 ${filtered.length} 条硬核指南`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="lg-rx-card perfect" style="grid-column:1/-1;padding:32px 20px;">
          <div style="font-size:32px;margin-bottom:8px;">🔍</div>
          <div class="lg-rx-title" style="justify-content:center;">未找到匹配的循证词条</div>
          <div class="lg-rx-evidence">试试切换上方分类标签或清空搜索关键词</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(entry => {
      const isDone = doneEntryIds.has(entry.id);
      const isMyth = entry.grade === 'MYTH';
      const gradeLabel = isMyth
        ? '🚫 反面清单·智商税'
        : (entry.grade === 'A' ? '🅰️ 证据等级 A (顶刊/法定)' : '🅱️ 证据等级 B (指南共识)');

      return `
        <article class="lg-entry-card ${isMyth ? 'is-myth' : ''} ${isDone ? 'is-done' : ''}">
          <div class="lg-entry-meta">
            <div class="lg-entry-badges">
              <span class="lg-badge grade-${entry.grade}">${gradeLabel}</span>
              <span class="lg-badge cost-tag">${entry.cost}</span>
            </div>
            <span style="font-size:11px;color:var(--tx-faint);font-weight:700;">${entry.chapter}</span>
          </div>
          <h3 class="lg-entry-title">${entry.title}</h3>
          <div class="lg-entry-plain">
            <b>🗣️ 说人话：</b>${entry.plain}
          </div>
          <div class="lg-entry-evidence">
            <b>🔬 硬核证据与法条：</b>${entry.evidence}
          </div>
          <div class="lg-entry-foot">
            <div class="lg-entry-source">📖 来源：${entry.source}</div>
            <button type="button" class="lg-btn-done ${isDone ? 'done' : ''}" data-done-id="${entry.id}">
              ${isDone ? '✅ 已掌握/已做到' : '⭕ 标记已做到'}
            </button>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('.lg-btn-done').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.doneId;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (doneEntryIds.has(id)) {
          doneEntryIds.delete(id);
        } else {
          doneEntryIds.add(id);
        }
        saveDoneStorage();
        renderLibraryView();
        updateTopStats();
      });
    });
  }

  function renderDrawCard(forceFront = false) {
    const cardEl = document.getElementById('lgFlashcard');
    const flipper = document.getElementById('lgCardFlipper');
    if (!cardEl || !curDrawnEntry) return;

    const entry = curDrawnEntry;
    const meta = getEntryMeta(entry);
    const isDone = doneEntryIds.has(entry.id);

    cardEl.className = 'lg-card-face lg-card-front';
    cardEl.style.borderColor = meta.color;

    cardEl.innerHTML = `
      <div class="lg-fc-ribbon">
        <div class="lg-entry-badges" style="align-items:center;gap:8px;">
          <span class="lg-badge" style="background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}55;font-weight:800;">${meta.badge}</span>
          <span class="lg-badge cost-tag">${entry.catName}</span>
        </div>
        <span class="lg-fc-no">NO.${entry.id.toUpperCase()} · ${entry.chapter}</span>
      </div>
      <h2 class="lg-fc-title">${entry.title}</h2>
      <div class="lg-fc-box">
        <span class="lg-fc-box-lbl" style="color:${meta.color};">🗣️ 【说人话 · 行动处方】 (${entry.cost})</span>
        <div class="lg-fc-box-txt">${entry.plain}</div>
      </div>
      <div class="lg-fc-box">
        <span class="lg-fc-box-lbl" style="color:${meta.color};">🔬 【硬核循证收益 / 法律条文依据】</span>
        <div class="lg-fc-box-txt lg-fc-evidence-txt">${entry.evidence}</div>
      </div>
      <div class="lg-fc-source">
        📖 <b>原始文献与法条出处：</b>${entry.source}
      </div>
      <div class="lg-fc-stamp" style="border-color:${meta.color};color:${meta.color};">${meta.stamp.replace('\n', '<br>')}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:4px;position:relative;z-index:3;">
        <button type="button" class="lg-btn-done ${isDone ? 'done' : ''}" id="lgFcBtnDone">
          ${isDone ? '✅ 已收入我的清醒习惯库' : '⭕ 标记为我已掌握/已做到'}
        </button>
      </div>
    `;

    const btnDone = document.getElementById('lgFcBtnDone');
    if (btnDone) {
      btnDone.onclick = (e) => {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (doneEntryIds.has(entry.id)) {
          doneEntryIds.delete(entry.id);
        } else {
          doneEntryIds.add(entry.id);
        }
        saveDoneStorage();
        renderDrawCard(true);
        updateTopStats();
      };
    }

    if (forceFront && flipper) {
      flipper.classList.add('is-flipped');
    }
  }

  function pickRandomEntry() {
    let pool = HANDBOOK_ENTRIES;
    if (curDrawPool === 'health') {
      pool = HANDBOOK_ENTRIES.filter(e => e.cat === 'health' || e.cat === 'emergency');
    } else if (curDrawPool === 'myth') {
      pool = HANDBOOK_ENTRIES.filter(e => e.cat === 'myth');
    } else if (curDrawPool === 'legal') {
      pool = HANDBOOK_ENTRIES.filter(e => e.cat === 'legal' || e.cat === 'career' || e.cat === 'wealth');
    }
    if (pool.length === 0) pool = HANDBOOK_ENTRIES;

    let candidates = pool.filter(e => e.id !== (curDrawnEntry && curDrawnEntry.id));
    if (candidates.length === 0) candidates = pool;

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function updateDrawBtnText(isFlipped) {
    const btn = document.getElementById('lgBtnDrawNext');
    if (!btn) return;
    const txt = btn.querySelector('.draw-txt');
    if (txt) {
      txt.textContent = isFlipped ? '换一张锦囊' : '翻开今日锦囊';
    }
  }

  // 1. 手动单击卡牌：正反面翻转（在背面点击翻开新牌，在正面点击可翻回背面）
  function toggleCardFlip() {
    const flipper = document.getElementById('lgCardFlipper');
    if (!flipper || isCardFlipping) return;

    if (!curDrawnEntry) {
      curDrawnEntry = pickRandomEntry();
      renderDrawCard(false);
    }

    if (window.SFX && window.SFX.tarotFlip) {
      window.SFX.tarotFlip();
    }

    isCardFlipping = true;
    const isNowFlipped = !flipper.classList.contains('is-flipped');
    flipper.classList.toggle('is-flipped', isNowFlipped);
    updateDrawBtnText(isNowFlipped);

    setTimeout(() => {
      isCardFlipping = false;
    }, 320);
  }

  // 2. 点击“换一张锦囊”：把牌翻到背面，后台装入新牌，等待手动单击卡片翻转出现新牌
  function prepareNextCard() {
    const flipper = document.getElementById('lgCardFlipper');
    if (isCardFlipping) return;

    const next = pickRandomEntry();

    if (window.SFX && window.SFX.tarotFlip) {
      window.SFX.tarotFlip();
    }

    if (!flipper) {
      curDrawnEntry = next;
      renderDrawCard(true);
      return;
    }

    // 若当前在正面状态：把牌翻到背面，半途载入新牌，停在背面等待手动翻开
    if (flipper.classList.contains('is-flipped')) {
      isCardFlipping = true;
      flipper.classList.remove('is-flipped');
      updateDrawBtnText(false);
      setTimeout(() => {
        curDrawnEntry = next;
        renderDrawCard(false);
        isCardFlipping = false;
      }, 240);
      return;
    }

    // 若当前已经在背面：直接换入新牌，保持背面，用户随时点击翻开
    curDrawnEntry = next;
    renderDrawCard(false);
    updateDrawBtnText(false);
  }

  /* =========================================================
     六、Canvas 高清处方单 / 锦囊海报生成与历史归档
     ========================================================= */
  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 10) {
    const chars = Array.from(String(text || ''));
    let line = '';
    let lineCount = 0;
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
        lineCount++;
        if (lineCount >= maxLines) {
          ctx.fillText(line.slice(0, -1) + '…', x, y);
          return y + lineHeight;
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

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function exportAuditPoster() {
    if (window.SFX && window.SFX.done) window.SFX.done();
    const res = calcAuditResult();

    // 同步写入全所历史档案
    if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
      window.UniversalHistory.add({
        module: 'lifeguide',
        title: `${res.tierTitle} (${res.score}分)`,
        subtitle: `已筑牢 ${res.checkedCount}/${res.totalCount} 项防线 · 待补漏 ${res.missedItems.length} 项`,
        color: res.color,
        badge: '🛡️ 人间清醒',
        avatar: '🛡️',
        data: {
          mode: 'audit',
          checkedIds: [...checkedAuditIds]
        }
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1620;
    const ctx = canvas.getContext('2d');

    // 背景渐变
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1620);
    bgGrad.addColorStop(0, '#0B0F14');
    bgGrad.addColorStop(0.5, '#111822');
    bgGrad.addColorStop(1, '#0A0D12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1620);

    // 顶部光晕
    const radGrad = ctx.createRadialGradient(540, 220, 20, 540, 220, 480);
    radGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 1080, 700);

    // 外框卡片
    roundRect(ctx, 56, 56, 968, 1508, 36);
    ctx.fillStyle = 'rgba(20, 25, 35, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.38)';
    ctx.stroke();

    // 顶部标题栏
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 22px "MiSans", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('🛡️ EVIDENCE-BASED LIFE HANDBOOK · 高性价比人生体检处方单', 104, 126);

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 20px "MiSans", "PingFang SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`NO.LG-${dateStr}`, 976, 126);
    ctx.textAlign = 'left';

    // 分数大圆环与称号
    roundRect(ctx, 104, 162, 872, 240, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();

    // 分数数字
    ctx.fillStyle = res.color;
    ctx.font = '900 92px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText(`${res.score}`, 144, 295);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 22px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText('清醒指数 / 100', 140, 345);

    // 右侧段位与评语
    ctx.fillStyle = '#D6FF4B';
    ctx.font = 'bold 22px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText(res.tierBadge, 350, 220);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '900 40px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText(res.tierTitle, 350, 276);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px "MiSans", "PingFang SC", sans-serif';
    wrapCanvasText(ctx, res.tierDesc, 350, 318, 590, 32, 3);

    // 四维防御进度条
    const dimsStartY = 436;
    const boxW = 424;
    const boxH = 104;
    AUDIT_DIMS.forEach((d, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = 104 + col * (boxW + 24);
      const by = dimsStartY + row * (boxH + 20);
      const st = res.dimStats[d.key];

      roundRect(ctx, bx, by, boxW, boxH, 18);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      ctx.fillStyle = '#F1F5F9';
      ctx.font = 'bold 24px "MiSans", "PingFang SC", sans-serif';
      ctx.fillText(`${d.icon} ${d.name}`, bx + 22, by + 42);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#34D399';
      ctx.fillText(`${st.done}/${st.total} (${st.pct}%)`, bx + boxW - 22, by + 42);
      ctx.textAlign = 'left';

      // 进度条槽
      roundRect(ctx, bx + 22, by + 64, boxW - 44, 16, 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();

      const fillW = Math.max(16, ((boxW - 44) * st.pct) / 100);
      if (st.pct > 0) {
        roundRect(ctx, bx + 22, by + 64, fillW, 16, 8);
        ctx.fillStyle = '#10B981';
        ctx.fill();
      }
    });

    // 优先补漏处方区
    let curY = 716;
    ctx.fillStyle = '#D6FF4B';
    ctx.font = 'bold 26px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText('⚡ 零成本高回报 · 优先补漏处方签 (Evidence-Based Rx)', 104, curY);
    curY += 26;

    const rxItems = res.missedItems.length > 0
      ? res.missedItems.slice(0, 5)
      : AUDIT_ITEMS.slice(0, 4);

    rxItems.forEach((it, idx) => {
      roundRect(ctx, 104, curY, 872, 124, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fill();

      // 左侧高亮竖条
      roundRect(ctx, 104, curY, 8, 124, 4);
      ctx.fillStyle = res.missedItems.length > 0 ? '#F59E0B' : '#10B981';
      ctx.fill();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 23px "MiSans", "PingFang SC", sans-serif';
      const titlePrefix = res.missedItems.length > 0 ? `待补处方 #${idx + 1}：` : `已达成防线 #${idx + 1}：`;
      wrapCanvasText(ctx, titlePrefix + it.rx, 132, curY + 40, 820, 30, 2);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '20px "MiSans", "PingFang SC", sans-serif';
      wrapCanvasText(ctx, `🔬 循证依据：${it.why}`, 132, curY + 94, 820, 26, 1);

      curY += 138;
    });

    // 底部印章与来源致敬
    ctx.fillStyle = '#64748B';
    ctx.font = '20px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText('灵感人格研究所 × 《高性价比人生指南》(HowToLiveBetter · CC BY 4.0)', 104, 1510);

    triggerCanvasDownload(canvas, `人间清醒体检单_${res.score}分.png`);
  }

  function exportFlashcardPoster() {
    if (!curDrawnEntry) return;
    if (window.SFX && window.SFX.done) window.SFX.done();
    const entry = curDrawnEntry;
    const meta = getEntryMeta(entry);

    if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
      window.UniversalHistory.add({
        module: 'lifeguide',
        title: `清醒锦囊：${entry.title}`,
        subtitle: `${entry.catName} · ${entry.chapter}`,
        color: meta.color,
        badge: '💊 清醒锦囊',
        avatar: '💊',
        data: {
          mode: 'draw',
          entryId: entry.id
        }
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1480;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1480);
    bgGrad.addColorStop(0, '#0B0F14');
    bgGrad.addColorStop(1, '#131B26');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1480);

    roundRect(ctx, 64, 64, 952, 1352, 36);
    ctx.fillStyle = '#151C28';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = meta.color;
    ctx.stroke();

    ctx.fillStyle = meta.color;
    ctx.font = 'bold 24px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText(`${meta.badge}  ·  NO.${entry.id.toUpperCase()}`, 116, 142);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 22px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText(`${entry.catName}  |  ${entry.chapter}  |  ${entry.cost}`, 116, 190);

    // 标题
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '900 46px "MiSans", "PingFang SC", sans-serif';
    let nextY = wrapCanvasText(ctx, entry.title, 116, 276, 848, 62, 3);

    // 说人话框
    nextY += 24;
    roundRect(ctx, 116, nextY, 848, 340, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.fill();

    ctx.fillStyle = '#D6FF4B';
    ctx.font = 'bold 26px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText('🗣️ 【说人话 · 核心行动指南】', 152, nextY + 56);

    ctx.fillStyle = '#F1F5F9';
    ctx.font = '28px "MiSans", "PingFang SC", sans-serif';
    wrapCanvasText(ctx, entry.plain, 152, nextY + 112, 776, 44, 5);

    // 硬核证据框
    nextY += 376;
    roundRect(ctx, 116, nextY, 848, 360, 24);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.fill();

    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 26px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText('🔬 【硬核循证医学证据 / 现行法律条文】', 152, nextY + 56);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '26px "MiSans", "PingFang SC", sans-serif';
    wrapCanvasText(ctx, entry.evidence, 152, nextY + 112, 776, 42, 5);

    // 原始出处
    nextY += 400;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px "MiSans", "PingFang SC", sans-serif';
    wrapCanvasText(ctx, `📖 原始出处：${entry.source}`, 116, nextY, 848, 34, 2);

    // 右下角专属朱红/金色篆刻印章
    ctx.save();
    ctx.translate(880, 1270);
    ctx.rotate((-12 * Math.PI) / 180);
    roundRect(ctx, -52, -52, 104, 104, 12);
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    roundRect(ctx, -46, -46, 92, 92, 8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = meta.color;
    ctx.font = 'bold 22px "MiSans", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    const stampLines = meta.stamp.split('\n');
    ctx.fillText(stampLines[0] || '清醒', 0, -10);
    ctx.fillText(stampLines[1] || '实操', 0, 24);
    ctx.textAlign = 'left';
    ctx.restore();

    ctx.fillStyle = '#64748B';
    ctx.font = '20px "MiSans", "PingFang SC", sans-serif';
    ctx.fillText('灵感人格研究所 · 人间清醒指南 (基于 HowToLiveBetter CC BY 4.0)', 116, 1364);

    triggerCanvasDownload(canvas, `人间清醒锦囊_${entry.id}.png`);
  }

  function triggerCanvasDownload(canvas, filename) {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('Poster export failed:', e);
    }
  }

  /* =========================================================
     七、子模块切换与事件绑定
     ========================================================= */
  function switchSubMod(subKey) {
    curSubMod = subKey;
    document.querySelectorAll('#scr-sm-lifeguide .lg-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lgsub === subKey);
    });
    document.querySelectorAll('#scr-sm-lifeguide .lg-substage').forEach(stage => {
      stage.classList.toggle('active', stage.id === `lg-sub-${subKey}`);
    });
  }

  function restore(data) {
    if (!data) return;
    open();
    if (data.mode === 'audit' && Array.isArray(data.checkedIds)) {
      checkedAuditIds = new Set(data.checkedIds);
      saveAuditStorage();
      switchSubMod('audit');
      renderAuditView();
      updateTopStats();
    } else if (data.mode === 'draw' && data.entryId) {
      const found = HANDBOOK_ENTRIES.find(e => e.id === data.entryId);
      if (found) {
        curDrawnEntry = found;
        switchSubMod('draw');
        renderDrawCard(true);
        updateDrawBtnText(true);
      }
    }
  }

  /* 作为说明书的第 08 章打开：顶栏由说明书统一渲染，返回按钮回到目录。
     懒初始化，避免说明书一进来就把 36 条智库和体检网格全渲染一遍。 */
  let inited = false;

  function renderTopbar() {
    const top = document.getElementById('sm-lifeguide-top');
    if (!top) return;
    top.innerHTML = '<button class="mt-iconbtn" id="sm-lifeguide-back">←</button>'
      + '<div class="mt-pick-head" style="flex:1;margin-bottom:0">'
      + '<b>第 09 章 · 人间清醒指南</b><p>EVIDENCE-BASED LIFE HANDBOOK</p></div>';
    const back = top.querySelector('#sm-lifeguide-back');
    if (back) {
      back.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.AppManual) {
          window.AppManual.renderHome();
          window.AppManual.showScreen('scr-sm-home');
        }
      };
    }
  }

  function open() {
    if (!inited) {
      inited = true;
      init();
    }
    renderTopbar();
    if (window.AppManual && typeof window.AppManual.showScreen === 'function') {
      window.AppManual.showScreen('scr-sm-lifeguide');
    }
  }

  function init() {
    inited = true;
    loadStorage();

    // 子模式 Tab 切换
    document.querySelectorAll('#scr-sm-lifeguide .lg-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        switchSubMod(btn.dataset.lgsub);
      });
    });

    // 自查快捷预设按钮
    const btnTypical = document.getElementById('lgBtnPresetTypical');
    const btnAll = document.getElementById('lgBtnPresetAll');
    const btnClear = document.getElementById('lgBtnPresetClear');

    if (btnTypical) {
      btnTypical.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        checkedAuditIds = new Set(['au_meds', 'au_antimyth', 'au_bankcard', 'au_guarantor', 'au_fight', 'au_cyberlaw']);
        saveAuditStorage();
        renderAuditView();
        updateTopStats();
      });
    }
    if (btnAll) {
      btnAll.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        checkedAuditIds = new Set(AUDIT_ITEMS.map(x => x.id));
        saveAuditStorage();
        renderAuditView();
        updateTopStats();
      });
    }
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        checkedAuditIds.clear();
        saveAuditStorage();
        renderAuditView();
        updateTopStats();
      });
    }

    // 体检处方海报导出按钮
    const btnAuditPoster = document.getElementById('lgBtnAuditPoster');
    const btnJumpLib = document.getElementById('lgBtnJumpLibrary');
    if (btnAuditPoster) {
      btnAuditPoster.addEventListener('click', exportAuditPoster);
    }
    if (btnJumpLib) {
      btnJumpLib.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        switchSubMod('library');
      });
    }

    // 智库分类与搜索事件
    document.querySelectorAll('#lgCatBar .lg-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curLibCat = pill.dataset.lgcat;
        document.querySelectorAll('#lgCatBar .lg-cat-pill').forEach(p => {
          p.classList.toggle('active', p.dataset.lgcat === curLibCat);
        });
        renderLibraryView();
      });
    });

    document.querySelectorAll('#lgQuickFilters .lg-btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const qk = chip.dataset.lgquick;
        curLibQuick = (curLibQuick === qk && qk !== 'all') ? 'all' : qk;
        document.querySelectorAll('#lgQuickFilters .lg-btn-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.lgquick === curLibQuick);
        });
        renderLibraryView();
      });
    });

    const searchInp = document.getElementById('lgSearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        curSearchKeyword = searchInp.value || '';
        renderLibraryView();
      });
    }

    // 每日清醒锦囊卡池与按钮
    document.querySelectorAll('#lgDrawPools .lg-btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curDrawPool = chip.dataset.lgpool;
        document.querySelectorAll('#lgDrawPools .lg-btn-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.lgpool === curDrawPool);
        });
        prepareNextCard();
      });
    });

    const btnDrawNext = document.getElementById('lgBtnDrawNext');
    const btnDrawPoster = document.getElementById('lgBtnDrawPoster');
    const cardFlipper = document.getElementById('lgCardFlipper');

    if (btnDrawNext) {
      btnDrawNext.addEventListener('click', () => {
        const flipper = document.getElementById('lgCardFlipper');
        if (flipper && !flipper.classList.contains('is-flipped')) {
          toggleCardFlip();
        } else {
          prepareNextCard();
        }
      });
    }
    if (btnDrawPoster) {
      btnDrawPoster.addEventListener('click', exportFlashcardPoster);
    }
    if (cardFlipper) {
      cardFlipper.addEventListener('click', (e) => {
        if (e && e.target && typeof e.target.closest === 'function' && e.target.closest('#lgFcBtnDone')) return;
        toggleCardFlip();
      });
    }

    // 初始渲染
    updateTopStats();
    renderAuditView();
    renderLibraryView();
    if (!curDrawnEntry) {
      curDrawnEntry = pickRandomEntry();
    }
    renderDrawCard(false);
  }

  window.AppLifeguide = {
    init,
    open,
    restore,
    switchSubMod
  };
})();
