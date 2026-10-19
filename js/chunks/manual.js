/* === js/modules/manual-data.js === */
/* 自我说明书 — 测评内容数据
 * choice 模式:通用答题引擎渲染,compute(scores) 返回统一结果对象
 * interactive 模式:由 games.js 对应引擎接管
 */
(function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* 计算每个维度的满分上限(用于归一化维度条) */
  function dimMax(test) {
    var max = {};
    test.questions.forEach(function (q) {
      var per = {};
      q.o.forEach(function (op) {
        (op.s || []).forEach(function (p) {
          per[p[0]] = Math.max(per[p[0]] || 0, p[1]);
        });
      });
      Object.keys(per).forEach(function (k) { max[k] = (max[k] || 0) + per[k]; });
    });
    return max;
  }

  function barsOf(test, scores, highlight) {
    var max = dimMax(test);
    return test.dims.map(function (d) {
      var v = scores[d[0]] || 0;
      return {
        key: d[0],
        label: d[1],
        full: d[2] || '',
        pct: Math.round(clamp(v / (max[d[0]] || 1) * 100, 0, 100)),
        value: v,
        hi: d[0] === highlight
      };
    });
  }

  window.SM_DATA = {

    /* ============ 01 社交电池电量测试 ============ */
    'social-battery': {
      id: 'social-battery', num: '01', mode: 'choice',
      title: '社交电池电量测试', en: 'SOCIAL BATTERY',
      tagline: '你是充电宝,还是耗电怪?3 分钟见分晓',
      icon: 'battery', color: '#0E9F6E',
      meta: '12 题 · 约 3 分钟',
      intro: [
        '内向还是外向,吵了几十年。这个测试不站队——它只回答一个问题:',
        '和你相处,到底是充电,还是掉电。',
        '答完 12 道情景题,你会得到一块属于自己的电池:当前电量、耗电速率,和一份充电说明书。'
      ],
      disclaimer: '本测试仅供娱乐。电量红线的合法回复包括但不限于:已读。',
      dims: [['E', '社交充电'], ['I', '独处充电'], ['S', '社交敏感']],
      questions: [
        { q: '周五晚 6 点,同事喊聚餐,你的第一反应?', o: [
          { t: '冲!顺便问问还有谁', s: [['E', 2]] },
          { t: '看是谁组织的再决定', s: [['N', 1]] },
          { t: '内心已经开始找借口', s: [['I', 2]] },
          { t: '可以,但我 9 点必须回家', s: [['S', 1]] } ] },
        { q: '电梯里遇到点头之交的同事?', o: [
          { t: '主动聊两句天气', s: [['E', 1]] },
          { t: '摸出手机假装有消息', s: [['S', 2]] },
          { t: '微笑点头,安静站好', s: [['I', 1]] },
          { t: '盯着楼层数字,数得比谁都认真', s: [['S', 1], ['I', 1]] } ] },
        { q: '微信红点 99+?', o: [
          { t: '挨个点开看完才舒服', s: [['E', 1]] },
          { t: '置顶的看,其他的折叠', s: [['N', 1]] },
          { t: '心里咯噔一下,先深呼吸', s: [['S', 2]] },
          { t: '全部已读,等重要的来找你', s: [['I', 2]] } ] },
        { q: '一个人吃火锅?', o: [
          { t: '享受,不用迁就任何人', s: [['I', 2]] },
          { t: '干过,但有点不自在', s: [['S', 2]] },
          { t: '没干过,怕别人觉得我可怜', s: [['S', 2]] },
          { t: '没干过,下次想试试', s: [['N', 1]] } ] },
        { q: '会议室轮到自我介绍?', o: [
          { t: '脱口而出,还带梗', s: [['E', 2]] },
          { t: '提前打好腹稿', s: [['S', 1]] },
          { t: '说完名字就想坐下', s: [['S', 2]] },
          { t: '说得还行,但全程心跳加速', s: [['S', 2]] } ] },
        { q: '假期旅行你更想?', o: [
          { t: '拉一群朋友热热闹闹', s: [['E', 2]] },
          { t: '一两个人说走就走', s: [['I', 1]] },
          { t: '独自出发,谁也别找我', s: [['I', 2]] },
          { t: '跟团,省心', s: [['N', 1]] } ] },
        { q: '手机突然来电(陌生号码)?', o: [
          { t: '直接接,说不定有好事', s: [['E', 1]] },
          { t: '犹豫 3 秒再接', s: [['S', 1]] },
          { t: '挂掉,有事短信说', s: [['I', 2]] },
          { t: '让它响完,回头搜号码', s: [['S', 2]] } ] },
        { q: '聚会进行到第 2 小时?', o: [
          { t: '正嗨,怎么就散了', s: [['E', 2]] },
          { t: '体力还在,耳朵有点累', s: [['S', 1]] },
          { t: '在角落刷手机等散场', s: [['I', 2]] },
          { t: '借口接电话,下楼吹会儿风', s: [['I', 1], ['S', 1]] } ] },
        { q: '到了一个全是陌生人的场合?', o: [
          { t: '先加三个人微信', s: [['E', 2]] },
          { t: '直奔自助餐台', s: [['N', 1]] },
          { t: '选个角落观察全局', s: [['I', 2]] },
          { t: '盼着有人先来跟我说话', s: [['S', 2]] } ] },
        { q: '加班到 9 点走出公司,你最想?', o: [
          { t: '喊人撸串续摊', s: [['E', 2]] },
          { t: '直接回家', s: [['I', 1]] },
          { t: '回家,今晚谁也别发消息给我', s: [['I', 2], ['S', 1]] },
          { t: '找个熟人打电话吐槽', s: [['E', 1]] } ] },
        { q: '群里突然 @ 你?', o: [
          { t: '秒回', s: [['E', 1]] },
          { t: '回,但打字打了又删', s: [['S', 2]] },
          { t: '过一会儿,当没看见', s: [['I', 1]] },
          { t: '心跳漏一拍:我做错什么了', s: [['S', 2]] } ] },
        { q: '完美的周末是?', o: [
          { t: '局排满,一场接一场', s: [['E', 2]] },
          { t: '半天热闹半天躺平', s: [['N', 2]] },
          { t: '手机静音,剧和外卖', s: [['I', 2]] },
          { t: '有安排,但都是一个人的安排', s: [['I', 1]] } ] }
      ],
      compute: function (scores) {
        var E = scores.E || 0, I = scores.I || 0, S = scores.S || 0, N = scores.N || 0;
        var pct = clamp(50 + (E - I) * 3 + N * 2 - S * 2, 5, 99);
        var hiS = S >= 8;
        var extro = E >= I;
        var R;
        if (extro && !hiS) R = {
          icon: 'bolt', name: '超级充电站型', tag: '人群就是你的充电桩',
          text: '越聊越精神,独处反而掉电。症状:聚会散场时最精神,回家路上开始 emo“怎么就结束了”。',
          advice: '尽管去社交,但记得每周留一晚“低配人间”,给身体一个缓冲。'
        };
        else if (!extro && !hiS) R = {
          icon: 'sun', name: '光伏慢充型', tag: '不用刻意躲人群,只是独处时更亮',
          text: '一个人的周末就是满血复活,比任何聚会都管用。',
          advice: '保持你的独处节律,但每月主动约一次“高质量小聚”,光照不够时人工补光。'
        };
        else if (extro && hiS) R = {
          icon: 'plug', name: '混动节能型', tag: '你能嗨,嗨完得充',
          text: '电量够时是全场气氛组,电量红线时谁叫都不理。',
          advice: '给自己装个“油量提醒”——连嗨两天必须空一天。混合动力最怕的,是假装自己是纯电。'
        };
        else R = {
          icon: 'plane', name: '飞行模式型', tag: '社交 5G 耗电,独处涓流回血',
          text: '电量管理是你的生存技能。症状:收到“在吗”两个字,心跳先加速。',
          advice: '把“已读不回”“晚点再说”设为合法回复;重要关系挑电量充足时维护,别在低电量时硬撑。'
        };
        return {
          icon: R.icon, name: R.name, tag: R.tag, text: R.text,
          big: { label: '当前社交电量', value: pct + '%', pct: pct, battery: true },
          bars: barsOf(this, scores, extro ? 'E' : 'I'),
          blocks: [{ h: '充电建议', text: R.advice }],
          quip: this.disclaimer,
          detail: { type: R.name, pct: pct }
        };
      }
    },

    /* ============ 02 拖延症类型鉴定 ============ */
    'procrastination': {
      id: 'procrastination', num: '02', mode: 'choice',
      title: '拖延症类型鉴定', en: 'PROCRASTINATION',
      tagline: '拖延不是懒,是 5 种不同的病——先确诊,再开方',
      icon: 'hourglass', color: '#7C5CBF',
      meta: '12 题 · 约 3 分钟',
      intro: [
        '拖延不是性格缺陷,是一种“病”。而且它分型:',
        '完美主义、恐惧逃避、享乐优先、决策瘫痪、能量枯竭——五种病,五种治法。',
        '用错处方,越治越拖。先来确诊你的主类型。'
      ],
      disclaimer: '本测试仅供娱乐与自我觉察,不构成心理诊疗建议。',
      dims: [['P', '完美主义'], ['F', '恐惧逃避'], ['H', '享乐优先'], ['D', '决策瘫痪'], ['E', '能量枯竭']],
      questions: [
        { q: '新任务到手,截止还有 3 天?', o: [
          { t: '先列一份完美到分钟的计划', s: [['P', 2]] },
          { t: '想到就烦,先刷会儿手机', s: [['F', 2]] },
          { t: '“就玩最后一把”', s: [['H', 2]] },
          { t: '从哪开始?反复纠结', s: [['D', 2]] } ] },
        { q: '打开文档准备写方案?', o: [
          { t: '字体、标题、目录先调 40 分钟', s: [['P', 2]] },
          { t: '大脑一片空白,先去倒杯水', s: [['F', 2]] },
          { t: '弹出新视频提醒,顺手点了进去', s: [['H', 2]] },
          { t: '电量不足,先充会儿电再说', s: [['E', 2]] } ] },
        { q: '拖延时最常冒出的念头?', o: [
          { t: '要么不做,做就要做到最好', s: [['P', 2]] },
          { t: '反正做了也可能搞砸', s: [['F', 2]] },
          { t: '急什么,还来得及', s: [['H', 2]] },
          { t: '先做哪个?歇会儿再想', s: [['D', 2]] } ] },
        { q: '别人催你的时候?', o: [
          { t: '“别催!催我就更做不好了”', s: [['P', 2]] },
          { t: '“知道了知道了”(更焦虑了)', s: [['F', 2]] },
          { t: '“马上马上”(游戏还剩一局)', s: [['H', 2]] },
          { t: '“你先说,到底先做哪个?”', s: [['E', 2]] } ] },
        { q: '你最常在什么任务上拖延?', o: [
          { t: '重要的、代表自己的作品', s: [['P', 2]] },
          { t: '有截止日期、会被评价的', s: [['F', 2]] },
          { t: '无聊但必须做的', s: [['H', 2]] },
          { t: '选项太多的(比如选题)', s: [['D', 2]] } ] },
        { q: '深夜想起没做完的事?', o: [
          { t: '脑内已经开始重做方案', s: [['P', 2]] },
          { t: '心慌,但更不敢动了', s: [['F', 2]] },
          { t: '明天的事明天再说', s: [['E', 2]] },
          { t: '反复回想白天选错了哪一步', s: [['D', 2]] } ] },
        { q: '你的待办清单?', o: [
          { t: '排版精美,但一项没动', s: [['P', 2]] },
          { t: '列了,看到就躲', s: [['F', 2]] },
          { t: '待办?躺在收藏夹吃灰', s: [['H', 2]] },
          { t: '列了三个版本,还没定稿', s: [['D', 2]] } ] },
        { q: '终于开始做事,通常是因为?', o: [
          { t: '状态对了,感觉能做好了', s: [['P', 2]] },
          { t: 'deadline 逼到眼前', s: [['F', 2]] },
          { t: '突然心血来潮', s: [['H', 2]] },
          { t: '有人替我做了决定', s: [['E', 2]] } ] },
        { q: '做完一件大事之后你会?', o: [
          { t: '立刻开始挑毛病', s: [['P', 2]] },
          { t: '后怕:幸好交了', s: [['F', 2]] },
          { t: '犒劳自己,玩三天', s: [['H', 2]] },
          { t: '后悔:当初选另一版就好了', s: [['D', 2]] } ] },
        { q: '拖延最大的代价是?', o: [
          { t: '作品没达到它该有的水平', s: [['P', 2]] },
          { t: '每次都被最后一秒吓醒', s: [['F', 2]] },
          { t: '玩的时候也没玩爽', s: [['E', 2]] },
          { t: '时间都花在“选”上了', s: [['D', 2]] } ] },
        { q: '周末有整块时间,你的实际状态?', o: [
          { t: '躺着恢复,啥也不想干', s: [['E', 2]] },
          { t: '想做正事,一坐下就心虚刷手机', s: [['F', 2]] },
          { t: '补之前欠的剧和游戏', s: [['H', 2]] },
          { t: '想列计划,列完天就黑了', s: [['D', 2]] } ] },
        { q: '睡前最后一件事?', o: [
          { t: '明天一定按计划来(真的)', s: [['P', 2]] },
          { t: '给明天的自己道歉', s: [['F', 2]] },
          { t: '再刷十分钟(现在凌晨一点五十)', s: [['H', 2]] },
          { t: '在脑内把明天安排了八百遍', s: [['D', 2]] } ] }
      ],
      results: {
        P: {
          icon: 'mask', name: '完美主义型拖延', tag: '你交出去的不是作业,是你本人',
          text: '你拖延的每一步都写得明明白白:调字体、列计划、脑内重做——就是不动笔。因为在你心里,交出去的不是作业,是你本人。病根:把作品当成了自己。',
          rx: ['先交 60 分版本,60 分能改,0 分不能', '给第一步上闹钟 15 分钟,时间一到必须动手', '每周故意“做烂”一件小事,练脱敏']
        },
        F: {
          icon: 'ghost', name: '恐惧逃避型拖延', tag: '怕的不是任务,是任务背后的目光',
          text: '你不是不想做,是一想到“会被看、会被评、会搞砸”就想先躲进手机里喘口气。病根:怕的不是任务,是任务背后的目光。',
          rx: ['任务切成 15 分钟一段,只承诺“做 15 分钟”', '先做最丑的第一步,丑的没人批评', '把“最坏结果”写下来念一遍——它通常没有你的心跳快']
        },
        H: {
          icon: 'gamepad', name: '享乐优先型拖延', tag: '娱乐和任务的顺序装反了',
          text: '你的多巴胺账户严重透支:玩的时候惦记任务,做任务的时候惦记游戏,两头都没享受到。病根:娱乐和任务的顺序装反了。',
          rx: ['“玩前完成法”:先干 25 分钟再玩 5 分钟', '把任务绑在快乐前面——做完了才准开那部剧', '物理隔离:手机放进需要起身才能拿到的地方']
        },
        D: {
          icon: 'snowflake', name: '决策瘫痪型拖延', tag: '把决策权限开得太大',
          text: '你的时间不是没干活,是全花在“选哪个、从哪开始、要不要换”上。选项越多,启动越难。病根:把决策权限开得太大。',
          rx: ['两分钟规则:2 分钟内定不下来就用默认选项', '掷硬币,落地的瞬间你就知道想要哪面', '每天只允许自己有一个“今日必做”,其余全部降级']
        },
        E: {
          icon: 'batterylow', name: '能量枯竭型拖延', tag: '你不是懒,你是真没电了',
          text: '空空的电池被塞进“再努力一点”的口号,只能用拖延来强制断电。病根:把休息当成了奖励,而不是燃料。',
          rx: ['先睡觉,其他处方明天再看', '把待办砍掉一半,砍掉的不算失败', '区分“休”和“逃”:散步、发呆、早睡是休,刷到半夜是逃']
        }
      },
      secondLine: {
        P: '你带一点完美主义——记得先交 60 分版本。',
        F: '你带一点恐惧逃避——把任务切成 15 分钟一段,会好很多。',
        H: '你带一点享乐优先——试试“玩前完成法”。',
        D: '你带一点决策瘫痪——两分钟定不下来,就用默认选项。',
        E: '你带一点能量枯竭——先把觉睡够,其他处方明天再看。'
      },
      compute: function (scores) {
        var order = ['F', 'P', 'D', 'H', 'E'];
        var dims = ['P', 'F', 'H', 'D', 'E'];
        var sorted = dims.slice().sort(function (a, b) {
          var d = (scores[b] || 0) - (scores[a] || 0);
          if (d !== 0) return d;
          return order.indexOf(a) - order.indexOf(b);
        });
        var main = sorted[0], second = sorted[1];
        var R = this.results[main];
        return {
          icon: R.icon, name: R.name, tag: R.tag, text: R.text,
          bars: barsOf(this, scores, main),
          blocks: [
            { h: '处方', rx: R.rx },
            { h: '副类型', text: this.secondLine[second] }
          ],
          quip: this.disclaimer,
          detail: { type: R.name }
        };
      }
    },

    /* ============ 03 摸鱼段位测试 ============ */
    'slacking': {
      id: 'slacking', num: '03', mode: 'choice',
      title: '摸鱼段位测试', en: 'SLACKING RANK',
      tagline: '摸鱼是一门手艺,12 道情景题测出你的段位',
      icon: 'fish', color: '#D9A114',
      meta: '12 题 · 约 3 分钟',
      intro: [
        '摸鱼,看似人人都会,实则段位悬殊。',
        '有人切屏手抖,有人摸鱼于无形——老板还觉得他在赶工。',
        '12 道职场情景题,测出你的真实段位,并颁发对应技能认证。'
      ],
      disclaimer: '本认证仅供娱乐。摸鱼有度,认真工作才是真段位。',
      dims: [],
      questions: [
        { q: '老板从身后走过,你的第一反应?', o: [
          { t: '猛切屏幕,鼠标乱晃', s: [['v', 0]] },
          { t: 'Alt+Tab 无缝衔接', s: [['v', 2]] },
          { t: '常年双屏,左手已就位', s: [['v', 3]] },
          { t: '我不摸鱼', s: [['v', 1]] } ] },
        { q: '你的浏览器此刻开着几个标签页?', o: [
          { t: '3 个,全是工作', s: [['v', 0]] },
          { t: '5–10 个,工作生活掺半', s: [['v', 2]] },
          { t: '20+,但分窗口分得明明白白', s: [['v', 3]] },
          { t: '全关了,免得被发现', s: [['v', 1]] } ] },
        { q: '收到“在吗”的经典回复是?', o: [
          { t: '秒回“在”', s: [['v', 0]] },
          { t: '三分钟后:“刚看到”', s: [['v', 2]] },
          { t: '直接语音打过去,反客为主', s: [['v', 3]] },
          { t: '装没看见,等他再问', s: [['v', 1]] } ] },
        { q: '带薪如厕最长纪录?', o: [
          { t: '5 分钟', s: [['v', 0]] },
          { t: '15 分钟', s: [['v', 2]] },
          { t: '30 分钟起,顺便看完一份行业报告', s: [['v', 3]] },
          { t: '上厕所从不带手机', s: [['v', 1]] } ] },
        { q: '会议进行中,你在?', o: [
          { t: '认真记笔记', s: [['v', 0]] },
          { t: '记笔记,内容是购物清单', s: [['v', 2]] },
          { t: '频繁点头+“嗯嗯”,实则神游', s: [['v', 3]] },
          { t: '明目张胆玩手机', s: [['v', 1]] } ] },
        { q: '下班前 10 分钟,你在?', o: [
          { t: '收拾东西准备冲', s: [['v', 0]] },
          { t: '进行“战略性的忙碌”', s: [['v', 2]] },
          { t: '卡点发出最后一封邮件', s: [['v', 3]] },
          { t: '再加一会儿再说', s: [['v', 1]] } ] },
        { q: '工作群里有人拍了马屁?', o: [
          { t: '跟着 +1', s: [['v', 1]] },
          { t: '精准补一句更高级的', s: [['v', 3]] },
          { t: '默默看戏', s: [['v', 2]] },
          { t: '从不参与', s: [['v', 0]] } ] },
        { q: '你工位上最显眼的物品?', o: [
          { t: '全是工作资料', s: [['v', 0]] },
          { t: '一盆好养的绿植', s: [['v', 1]] },
          { t: '一件“看起来像在工作”的东西', s: [['v', 2]] },
          { t: '屏幕贴膜+励志标语,气场全靠演技', s: [['v', 3]] } ] },
        { q: '领导画饼的时候,你?', o: [
          { t: '热泪盈眶', s: [['v', 0]] },
          { t: '表面感动,内心已打卡下班', s: [['v', 2]] },
          { t: '顺着夸回去,顺便约了个调休', s: [['v', 3]] },
          { t: '面无表情继续干活', s: [['v', 1]] } ] },
        { q: '工作时段手机报告里,占比最高的 App?', o: [
          { t: '钉钉 / 企业微信', s: [['v', 0]] },
          { t: '微信', s: [['v', 1]] },
          { t: '某购物 / 视频 App', s: [['v', 2]] },
          { t: '备忘录——里面全是段子素材', s: [['v', 3]] } ] },
        { q: '会上突然被点名“你来说说看法”?', o: [
          { t: '大脑一片空白', s: [['v', 0]] },
          { t: '“我补充一下刚才张总说的”', s: [['v', 2]] },
          { t: '万能三件套:肯定+角度+落地', s: [['v', 3]] },
          { t: '“我同意大家的看法”', s: [['v', 1]] } ] },
        { q: '年会抽奖环节,你?', o: [
          { t: '没中,但表演节目很卖力', s: [['v', 1]] },
          { t: '中了个安慰奖', s: [['v', 0]] },
          { t: '靠人缘混了个组织奖', s: [['v', 3]] },
          { t: '提前溜了', s: [['v', 2]] } ] }
      ],
      ranks: [
        { min: 31, icon: 'crown', name: '王者 · 摸鱼无形', cert: '摸鱼宗师 · 荣誉认证',
          text: '大音希声,大象无形,大摸无鱼。你从不摸鱼——你只是把“看起来全情投入”做成了职业素养,真正的产出在无人知晓的领域野蛮生长。',
          note: '忠告:有这演技,干点啥不香?建议兼修正业。' },
        { min: 24, icon: 'gem', name: '钻石 · 人形已读乱回', cert: '话术三件套 · 精通',
          text: '摸鱼于无形之中,回消息像抽奖,开会像在梦游但偶尔能蹦出金句。领导画饼你还能顺着饼讨个调休,这是艺术。',
          note: '忠告:你的真实水平成谜,这本身就很值钱。' },
        { min: 17, icon: 'medal', name: '黄金 · 影分身办公', cert: '影分身 · 熟练',
          text: '普通同事一个,和资深摸鱼师之间,只隔了一块双屏和一个 Alt+Tab 的肌肉记忆。你摸鱼,但老板觉得你在赶工。',
          note: '忠告:小心被同事借钱,毕竟大家都以为你很有闲又有钱。' },
        { min: 10, icon: 'medal', name: '白银 · 带薪如厕', cert: '带薪如厕 · 初级',
          text: '你掌握了摸鱼界的第一块敲门砖:厕所隔间,工位之外最后的自留地。但技术动作还不够隐蔽,切屏时鼠标会抖。',
          note: '忠告:下一步,练“看似在忙”的走路姿态。' },
        { min: 0, icon: 'medal', name: '青铜 · 摸鱼萌新', cert: '暂无技能认证',
          text: '你的摸鱼事业还在村口徘徊:切屏手忙脚乱,“在吗”秒回,带薪如厕从不超过 5 分钟。好消息是——你大概率也是全组绩效最稳的人。',
          note: '忠告:技术不行就心态来凑,别硬学。' }
      ],
      compute: function (scores) {
        var v = scores.v || 0;
        var R = null;
        for (var i = 0; i < this.ranks.length; i++) {
          if (v >= this.ranks[i].min) { R = this.ranks[i]; break; }
        }
        return {
          icon: R.icon, name: R.name.split(' · ')[1] ? R.name : R.name, tag: '摸鱼段位认证',
          text: R.text,
          big: { label: '摸鱼段位分', value: v + ' / 36' },
          bars: [],
          blocks: [
            { h: '技能认证', cert: R.cert, full: R.name },
            { h: '', text: R.note }
          ],
          quip: this.disclaimer,
          detail: { type: R.name, score: v }
        };
      }
    },

    /* ============ 04 熬夜类型鉴定 ============ */
    'night-owl': {
      id: 'night-owl', num: '04', mode: 'choice',
      title: '熬夜类型鉴定', en: 'NIGHT OWL',
      tagline: '报复性熬夜的 5 种病,你中的是哪一种',
      icon: 'moon', color: '#4B5AC6',
      meta: '12 题 · 约 3 分钟',
      intro: [
        '你肯定试过各种早睡方法,都失败了。',
        '因为“熬夜”根本不是一种病——它是五种:补偿、失控、守护自由、天生夜型、思绪失眠。',
        '分错了型,越治越熬。来鉴定你的类型,拿对处方。'
      ],
      disclaimer: '本测试仅供娱乐,不构成睡眠医学建议;长期入睡困难请咨询专业医生。',
      dims: [['R', '报复补偿'], ['C', '失控循环'], ['F', '自由守护'], ['E', '黄金夜型'], ['A', '思绪失眠']],
      questions: [
        { q: '该睡觉的时间到了,你的身体?', o: [
          { t: '累,但脑子说:再玩会儿', s: [['R', 2]] },
          { t: '躺下了,脑子开始开大会', s: [['A', 2]] },
          { t: '说好十点半睡,现在一点半', s: [['C', 2]] },
          { t: '有点困,但好不容易是自己的时间,舍不得', s: [['F', 2]] } ] },
        { q: '凌晨一点,你通常在?', o: [
          { t: '补白天欠下的剧和视频', s: [['R', 2]] },
          { t: '“最后十分钟”的第 N 个十分钟', s: [['C', 2]] },
          { t: '越夜越精神,一点才刚刚开始', s: [['E', 2]] },
          { t: '脑内把明天预演了八百遍', s: [['A', 2]] } ] },
        { q: '白天结束后,你的感觉?', o: [
          { t: '被安排得满满当当,没有一分钟属于自己', s: [['R', 2]] },
          { t: '白天像没开机,入夜才满血复活', s: [['E', 2]] },
          { t: '想做点自己的事,晚上才腾得出手', s: [['F', 2]] },
          { t: '明明很累,躺下反而清醒', s: [['A', 2]] } ] },
        { q: '熬夜时,你干得最多的事?', o: [
          { t: '把白天缺的快乐一次性补回来', s: [['R', 2]] },
          { t: '无目的地刷手机,划走一条又一条', s: [['C', 2]] },
          { t: '安静做点自己的事:写东西、练级、拼图', s: [['F', 2]] },
          { t: '反复回想白天说错的那句话', s: [['A', 2]] } ] },
        { q: '早上闹钟响起,你的第一个念头?', o: [
          { t: '凭什么!昨晚还没玩够', s: [['R', 2]] },
          { t: '我发誓,今晚一定早睡', s: [['C', 2]] },
          { t: '撑住,入夜就满血了', s: [['E', 2]] },
          { t: '昨晚凌晨四点才睡着', s: [['A', 2]] } ] },
        { q: '哪种情况你会主动早睡?', o: [
          { t: '白天过得特别尽兴', s: [['R', 2]] },
          { t: '手机玩到自动关机', s: [['C', 2]] },
          { t: '想赶第二天的日出', s: [['F', 2]] },
          { t: '终于累到脑子没力气想事', s: [['A', 2]] } ] },
        { q: '明晚不用早睡的晚上,你会?', o: [
          { t: '照样熬——熬的是自由,不是明天', s: [['R', 2]] },
          { t: '更失控,反正明天能补觉', s: [['C', 2]] },
          { t: '安排喜欢的夜生活:宵夜、电影、散步', s: [['F', 2]] },
          { t: '越夜越有精神,不能浪费', s: [['E', 2]] } ] },
        { q: '看到“熬夜伤身”的科普,你?', o: [
          { t: '道理都懂,可白天已经那么苦了', s: [['R', 2]] },
          { t: '收藏,然后划走继续刷', s: [['C', 2]] },
          { t: '我的作息很健康,只是时区不同', s: [['E', 2]] },
          { t: '看完更焦虑,更睡不着了', s: [['A', 2]] } ] },
        { q: '凌晨三点还没睡,多半因为?', o: [
          { t: '“最后一集”骗了我三次', s: [['C', 2]] },
          { t: '夜里上分,干正事干上头了', s: [['E', 2]] },
          { t: '好不容易世界安静了,多待会儿', s: [['F', 2]] },
          { t: '心里压着事,翻来覆去', s: [['A', 2]] } ] },
        { q: '你的最晚睡眠纪录是怎么来的?', o: [
          { t: '白天被偷走太多,晚上连本带利要回来', s: [['R', 2]] },
          { t: '本来只想刷十分钟', s: [['C', 2]] },
          { t: '通宵赶的是自己真心想做的东西', s: [['E', 2]] },
          { t: '夜里才是我的黄金档', s: [['F', 2]] } ] },
        { q: '如果明天起完全自由,不用上班上学?', o: [
          { t: '还是会熬,终于能痛痛快快补自己', s: [['R', 2]] },
          { t: '没人管了,作息可能更乱', s: [['C', 2]] },
          { t: '作息会自动调好——我要的是自主,不是黑夜', s: [['F', 2]] },
          { t: '不一定睡得着,习惯性想东想西', s: [['A', 2]] } ] },
        { q: '理想的一天是?', o: [
          { t: '玩够就睡,从不恋战', s: [['C', 2]] },
          { t: '白天忙正事,深夜高效又安静', s: [['E', 2]] },
          { t: '心里踏实,沾床就着', s: [['A', 2]] },
          { t: '深夜安静,世界终于是我的', s: [['F', 2]] } ] }
      ],
      results: {
        R: {
          icon: 'moonback', name: '报复补偿型熬夜', tag: '白天是租来的,夜晚才是自己的',
          text: '你不是爱上熬夜,你是在给白天讨债。日程被排满、时间被切碎,只有深夜那段不被人打扰的时光,才感觉真正属于自己。越累越不想睡——因为睡了,就意味着明天又要交给别人。病根:把熬夜当成了唯一能自主支配的时间。',
          rx: ['在白天给自己挖两段“15 分钟自由时间”,哪怕只是下楼买杯咖啡', '把补偿从“深夜大额补偿”改成“白天小额免息”——次数多了,夜里就没那么亏', '每周留一晚“不亏不欠夜”:白天不留遗憾,晚上不欠自己'],
          quip: '熬的是夜吗?熬的是白天没能活成的那个人。'
        },
        C: {
          icon: 'spiral', name: '失控循环型熬夜', tag: '“再刷十分钟”专业户',
          text: '你不想熬夜,你是停不下来。“最后一集”“最后一局”“最后十分钟”——每一个“最后”后面,都跟着下一个。你甚至边刷边焦虑,焦虑完了,接着刷。病根:不是手机太好玩,是“停”这个动作缺少一个外部开关。',
          rx: ['给睡觉设一个和上班一样不可商量的“睡觉闹钟”——不是早上那个,是晚上那个', '手机放在必须起身才能够到的地方充电', '睡前把手机调成灰度模式——没有颜色,世界瞬间没那么好玩'],
          quip: '凌晨一点五十的“再刷十分钟”,是你本周最大的谎言。'
        },
        F: {
          icon: 'candle', name: '自由守护型熬夜', tag: '深夜是唯一不被打扰的自留地',
          text: '白天属于工作、属于别人;只有深夜,消息不响、要求不来,世界安静得刚刚好。你享受的不是黑眼圈,是那种“终于没人找我”的松弛。病根:你把自由,全押在了深夜一个时段。',
          rx: ['试着在清晨开辟“第二自留地”——早起一小时,世界同样安静', '深夜自由也要有底线:给自己设一个“蜡烛熄灭时间”,到点关灯', '把最喜欢的深夜活动挑一件,挪到周末白天做升级版,分散依赖'],
          quip: '你守住了深夜,深夜没收住你。'
        },
        E: {
          icon: 'gear', name: '黄金夜型熬夜', tag: '天生的夜间选手',
          text: '别人夜里犯困,你夜里上分:思路清晰、手感火热、灵感爆发。你的生物钟,可能真的比标准时间往后挪了几小时。早睡等于躺床上干耗,早起等于灵魂没上线。病根:作息没有对错,但要防“夜型优势”变成“社交时差”。',
          rx: ['接受自己的时区,把最难的事排进你的高效夜档,白天只做机械活', '给熬夜划一条“性价比线”:凌晨一点前收工,别把黄金档熬成垃圾时间', '如果白天必须早起,傍晚小睡 20 分钟,别硬扛'],
          quip: '你不是熬夜,你只是生活在另一个时区。'
        },
        A: {
          icon: 'cloud', name: '思绪失眠型熬夜', tag: '想睡,但脑子不同意',
          text: '身体早就想睡了,脑子还在开全体大会:白天的对话复盘、明天的日程预演、三年前说错的一句话,轮番上台。你不是在熬夜,你是被自己的大脑扣押了。病根:大脑把“躺下”误判成了“复盘时间”。',
          rx: ['睡前一小时写“卸载清单”:把担心的事全写下来,大脑就不用连夜值守', '躺下后如果又开始想,告诉自己“记下了,明天清单上见”', '白天留 15 分钟“专门焦虑时间”,集中想,晚上轮空'],
          quip: '失眠的人只是提前进入了明天的会议。'
        }
      },
      secondLine: {
        R: '你带一点“报复补偿”——白天亏得越多,夜里熬得越狠,试着在白天讨回一点时间。',
        C: '你带一点“失控循环”——需要一个说到做到的睡觉闹钟。',
        F: '你也珍惜深夜的自留地——记得给它设一条熄灯线。',
        E: '你有一点夜间选手的体质——重要的事可以放进你的夜档。',
        A: '你偶尔会被思绪扣押——试试睡前写“卸载清单”。'
      },
      compute: function (scores) {
        var order = ['R', 'C', 'F', 'E', 'A'];
        var dims = ['R', 'C', 'F', 'E', 'A'];
        var sorted = dims.slice().sort(function (a, b) {
          var d = (scores[b] || 0) - (scores[a] || 0);
          if (d !== 0) return d;
          return order.indexOf(a) - order.indexOf(b);
        });
        var main = sorted[0], second = sorted[1];
        var R = this.results[main];
        return {
          icon: R.icon, name: R.name, tag: R.tag, text: R.text,
          bars: barsOf(this, scores, main),
          blocks: [
            { h: '处方', rx: R.rx },
            { h: '副类型', text: this.secondLine[second] },
            { h: '', quip: R.quip }
          ],
          quip: this.disclaimer,
          detail: { type: R.name }
        };
      }
    },

    /* ============ 06 反应速度擂台 ============ */
    'reaction': {
      id: 'reaction', num: '06', mode: 'interactive', engine: 'reaction',
      title: '反应速度擂台', en: 'REACTION ARENA',
      tagline: '三关打完,宣判你的反应年龄',
      icon: 'bolt', color: '#E05B4E',
      meta: '3 关 · 约 2 分钟',
      intro: [
        '手速是练出来的?不,先测出来。',
        '第一关·简单反应:变红就点,五次取中位数;',
        '第二关·选择反应:红点按左,绿点按右,小心规则交换;',
        '第三关·冲动控制:绿点快按,红点——忍住。',
        '打完三关,系统将宣判:你的反应年龄。'
      ],
      disclaimer: '成绩受屏幕、手感与心情影响,仅供娱乐。',
      ranks: ['闪电侠', '电竞手', '正常人', '树懒本懒']
    },

    /* ============ 07 色彩敏锐度挑战 ============ */
    'color': {
      id: 'color', num: '07', mode: 'interactive', engine: 'color',
      title: '色彩敏锐度挑战', en: 'COLOR ACUITY',
      tagline: '色块里藏着一个叛徒,色差一级级缩小',
      icon: 'eye', color: '#D6478F',
      meta: '无限关 · 约 2 分钟',
      intro: [
        '屏幕上铺满色块,其中一块颜色不同。',
        '点中它进入下一关;点错扣一条命(共 3 条);每关限时 8 秒。',
        '色差会一级级缩小——从“色彩学徒”打到“人眼取色器”。'
      ],
      disclaimer: '屏幕色彩会影响发挥,建议调高亮度再战。',
      certs: [
        { min: 18, icon: 'eye', name: '人眼取色器', text: '你居然能看到 RGB 之外的颜色?建议去考取职业资格。' },
        { min: 12, icon: 'gem', name: '老练设计师', text: '甲方说的“五彩斑斓的黑”,你真的能调出来。' },
        { min: 6, icon: 'brush', name: '色彩达人', text: 'P 图软件的色相条,在你手里是乐器。' },
        { min: 0, icon: 'palette', name: '色彩学徒', text: '眼睛累了是正常的,建议休息一下再来,成绩不保存——这条除外。' }
      ]
    },

    /* ============ 08 数字合体 2048 ============ */
    'game-2048': {
      id: 'game-2048', num: '08', mode: 'interactive', engine: 'game2048',
      title: '数字合体 2048', en: '2048 PUZZLE',
      tagline: '滑动合体,测测你的逻辑规划与抗压上限',
      icon: 'crown', color: '#F59E0B',
      meta: '经典益智 · 约 3 分钟',
      intro: [
        '方寸棋盘，规则简单，却足够让人一遍遍重来。',
        '每次滑动，相同数字碰撞合二为一：从 2 开始逐步合成 4、8、16……直至 2048 登顶！',
        '上下左右滑动屏幕、使用键盘方向键或屏幕按键，步步为营。',
        '无路可走或随时点击【结算判词】，系统将出具属于你的《战略家与空间掌控力说明书》。'
      ],
      disclaimer: '本测试仅供娱乐，合出 2048 不代表明天不用上班，但能证明你的大局观确实超凡。',
      certs: [
        { min: 2048, icon: 'crown', name: '完美合体者', text: '居然合出了 2048！你的空间掌控力与战略前瞻性已突破天际，乱局之中总能走出神之一手。' },
        { min: 1024, icon: 'gem', name: '高维战略家', text: '突破 1024！距离终极合体仅一步之遥，你在复杂局面中寻找最优解的直觉极其敏锐。' },
        { min: 512, icon: 'bolt', name: '老练操盘手', text: '合出 512！布局有条不紊，心态极稳，遇到拥堵卡点总能通过微调化险为夷。' },
        { min: 256, icon: 'gamepad', name: '精明谋略师', text: '稳步拿下 256！思路清晰，步步为营，已经深谙单角屯兵的核心战术。' },
        { min: 128, icon: 'medal', name: '潜能进阶者', text: '打出 128！手感在线，节奏良好，再多推演几步，更大的格局就在眼前。' },
        { min: 0, icon: 'smile', name: '随性合体家', text: '佛系滑动，重在重温经典纯粹的合成乐趣。快乐摸鱼，拒绝焦虑，适度用脑就是最好状态。' }
      ]
    },

    /* ============ 09 雷区排险 · 扫雷 ============ */
    minesweeper: {
      id: 'minesweeper', num: '09', mode: 'interactive', engine: 'minesweeper',
      title: '雷区排险', en: 'MINESWEEPER',
      tagline: '在信息不全的棋盘上,判断哪一步值得冒险',
      icon: 'target', color: '#38BDF8',
      meta: '三档难度 · 约 2 分钟',
      intro: [
        '棋盘下埋着雷,数字是它周围八格的雷数。',
        '左键翻开格子,右键(或长按)插旗标记你认定的雷。',
        '翻开所有非雷格即胜利;踩到雷即结束。',
        '初级 9×9 十雷,中级 16×16 四十雷,高级 16×30 九十九雷。'
      ],
      disclaimer: '成绩按完成时间排名,难度越高越靠前。仅供参考,现实中的雷请勿用右键排查。',
      certs: [
        { min: 3, icon: 'crown', name: '拆弹专家', text: '高级棋盘也能拿下,你对风险分布的直觉已经接近统计学本身。' },
        { min: 2, icon: 'gem', name: '排雷老手', text: '中级稳过,说明你既能算概率,也懂得什么时候该赌一把。' },
        { min: 1, icon: 'bolt', name: '谨慎工兵', text: '初级通关。步子不大,但每一步都踩在确定性上。' },
        { min: 0, icon: 'smile', name: '踩雷新兵', text: '雷区无情,多试几次就熟了。至少你知道了:数字是周围八格,不是上下左右。' }
      ]
    },

    /* ============ 10 舒尔特方格 ============
       注意力测试：5×5 网格里按 1–25 顺序点击，计时。
       复用扫雷的网格样式与排行榜，游戏逻辑见 manual-games.js。 */
    schulte: {
      id: 'schulte', num: '10', mode: 'interactive', engine: 'schulte',
      title: '舒尔特方格', en: 'SCHULTE TABLE',
      tagline: '在乱序里按 1 到 25 依次点完，看看你的注意力有多稳',
      icon: 'grid', color: '#8B5CF6',
      meta: '三档难度 · 约 1 分钟',
      intro: [
        '5×5 的方格里有 1 到 25 的数字，顺序被打乱了。',
        '从 1 开始，按顺序依次点击每个数字，全部点完计时结束。',
        '点错不会中断，但会记录错误次数，最终成绩按用时排名。',
        '初级 5×5，中级 6×6（1–36），高级 7×7（1–49）。'
      ],
      disclaimer: '用时越短注意力越集中，但一次成绩说明不了什么——睡眠、心情、屏幕大小都会影响结果。仅供参考。',
      certs: [
        { min: 3, icon: 'crown', name: '鹰眼聚焦', text: '高级方格也能快速扫完，你的视觉搜索效率已经接近训练有素。' },
        { min: 2, icon: 'gem', name: '注意力稳', text: '中级通关，说明你能在干扰中维持目标，不容易被旁边的数字带跑。' },
        { min: 1, icon: 'bolt', name: '专注入门', text: '初级完成。眼睛跟得上，下一步是让注意力别在方格间乱跳。' },
        { min: 0, icon: 'smile', name: '视线游移', text: '没关系，舒尔特方格本来就可以练。每天一次，两周后会明显变快。' }
      ]
    },

    /* ============ 05 人间清醒指南 ============
       这一章不是答题引擎产物：正文由 lifeguide.js 自己渲染（体检 / 智库 / 抽卡），
       所以 mode 为 'external'，由 manual.js 转交 AppLifeguide.open()。 */
    lifeguide: {
      id: 'lifeguide', num: '05', mode: 'external',
      title: '人间清醒指南', en: 'EVIDENCE-BASED LIFE HANDBOOK',
      tagline: '低投入高回报的 16 项防线、36 条循证避坑与每日锦囊',
      icon: 'book', color: '#10B981',
      meta: '3 个子模块 · 随时可查'
    }
  };

  /* 首页章节顺序 */
  window.SM_ORDER = ['social-battery', 'procrastination', 'slacking', 'night-owl', 'lifeguide', 'reaction', 'color', 'game-2048', 'minesweeper', 'schulte'];
})();

;
/* === js/modules/manual-report.js === */
/* 自我说明书 — SVG 图标库 + 报告页渲染 + Canvas 报告卡 */
(function () {
  'use strict';

  /* ============ 24×24 线性图标(stroke 风格) ============ */
  var ICONS = {
    battery: '<rect x="2.5" y="7.5" width="16" height="9" rx="2.5"/><path d="M21.5 10.5v3"/><path d="M11.5 9.5 9 12.2h3l-2.4 2.6"/>',
    bolt: '<path d="M13 2.5 4.8 13.4h6L9.6 21.5l8.7-11.4h-6.1L13 2.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.2a5.5 5.5 0 0 1-11 0V8ZM12 16.7V21"/>',
    plane: '<path d="M21.5 2.5 11 13M21.5 2.5l-6.8 19-3.7-8.5L2.5 9.3l19-6.8Z"/>',
    hourglass: '<path d="M6.5 3h11M6.5 21h11M7.5 3v2.4l4.5 6-4.5 6V21M16.5 3v2.4l-4.5 6 4.5 6V21"/>',
    mask: '<path d="M12 3.2c3.4 0 6.4.7 7.9 1.4-.3 6-2 13.6-7.9 16-5.9-2.4-7.6-10-7.9-16C5.6 3.9 8.6 3.2 12 3.2Z"/><path d="M8.6 9.3c.8-.8 2-.8 2.8 0M12.6 9.3c.8-.8 2-.8 2.8 0M9 13.4c1.8 1.8 4.2 1.8 6 0"/>',
    ghost: '<path d="M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.2-1.8-2.1 1.8-2.2-1.8-2.2 1.8-2.1-1.8-2.2 1.8Z"/><path d="M10 10.5v1.4M14 10.5v1.4"/>',
    gamepad: '<path d="M7 8.5h10c2.8 0 4.5 2.4 4.5 5.2 0 2.5-1.5 4.3-3.6 4.3-1.4 0-2.2-.8-2.9-2h-6c-.7 1.2-1.5 2-2.9 2-2.1 0-3.6-1.8-3.6-4.3C2.5 10.9 4.2 8.5 7 8.5Z"/><path d="M8 11v3.4M6.3 12.7h3.4"/><circle cx="15.6" cy="11.6" r=".9"/><circle cx="18" cy="13.6" r=".9"/>',
    snowflake: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8"/>',
    batterylow: '<rect x="2.5" y="7.5" width="16" height="9" rx="2.5"/><path d="M21.5 10.5v3"/><rect x="5.2" y="10.3" width="3.2" height="3.4" rx="1"/>',
    fish: '<path d="M6.8 12c2.4-3.8 5.8-5.8 9.2-5.8 2.6 0 4.6 2.4 5.2 5.8-.6 3.4-2.6 5.8-5.2 5.8-3.4 0-6.8-2-9.2-5.8Z"/><path d="M6.8 12 2.2 8.8v6.4L6.8 12Z"/><circle cx="17.6" cy="10.6" r=".7"/>',
    medal: '<circle cx="12" cy="9" r="5.2"/><path d="m9.2 13.4-2 7.1 4.8-2.4 4.8 2.4-2-7.1M12 6.8l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3.9-1.8Z"/>',
    gem: '<path d="M7 3.5h10l4 5.5-9 11.5L3 9l4-5.5ZM3 9h18M12 20.5 8.2 9M12 20.5 15.8 9"/>',
    crown: '<path d="m3.5 8 4.4 3.8L12 5l4.1 6.8L20.5 8l-1.7 10.5H5.2L3.5 8Z"/>',
    moon: '<path d="M20 14.2A8.6 8.6 0 1 1 9.8 4 6.8 6.8 0 0 0 20 14.2Z"/>',
    moonback: '<path d="M19.5 13.7A8.3 8.3 0 1 1 9.8 4.2 6.6 6.6 0 0 0 19.5 13.7Z"/><path d="M14 17.5h6M17.5 15l2.5 2.5-2.5 2.5"/>',
    spiral: '<path d="M12 12a2.2 2.2 0 0 1 4.4 0 4.8 4.8 0 0 1-9.6 0A7.2 7.2 0 0 1 21 12a9.6 9.6 0 0 1-19.2 0"/>',
    candle: '<path d="M12 2.5c1.3 1.5 2 2.6 2 3.6a2 2 0 1 1-4 0c0-1 .7-2.1 2-3.6Z"/><rect x="8.5" y="9" width="7" height="12" rx="1.5"/><path d="M6 21h12"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
    cloud: '<path d="M7 18.5a4.6 4.6 0 1 1 .9-9.1 6 6 0 0 1 11.5 1.8 3.8 3.8 0 0 1-1.4 7.3H7Z"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.9"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.7a2.1 2.1 0 0 0 1.5-3.6c-.9-1-.1-2.2 1.1-2.2h1.9a3 3 0 0 0 2.8-3.1C20.7 7 16.7 3 12 3Z"/><circle cx="7.5" cy="10.5" r=".9"/><circle cx="11" cy="7" r=".9"/><circle cx="15.5" cy="7.8" r=".9"/>',
    brush: '<path d="m20.6 3.4c1 1 1 2.5 0 3.5l-8 8-3.5-3.5 8-8c1-1 2.5-1 3.5 0Z"/><path d="M9.1 11.4 12.6 14.9c-1.4 2.8-4 4.3-8.6 4.6.3-4.5 1.9-6.7 5.1-8.1Z"/>',
    book: '<path d="M4.5 5A2.5 2.5 0 0 1 7 2.5h12.5v16H7a2.5 2.5 0 0 0-2.5 2.5V5Z"/><path d="M4.5 21A2.5 2.5 0 0 1 7 18.5h12.5"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    retry: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 3.5v3.8h-3.8"/>',
    save: '<path d="M12 3.5v11M7.5 10.5l4.5 4 4.5-4M4.5 20.5h15"/>',
    heart: '<path d="M12 20.5C6.4 16 3.5 12.7 3.5 9.2 3.5 6.6 5.5 4.7 8 4.7c1.6 0 3.1.8 4 2.2.9-1.4 2.4-2.2 4-2.2 2.5 0 4.5 1.9 4.5 4.5 0 3.5-2.9 6.8-8.5 11.3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.4l3.4 2"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    swap: '<path d="M4 8h13.5M14 4.5 17.5 8 14 11.5M20 16H6.5M10 12.5 6.5 16l3.5 3.5"/>',
    sleepy: '<path d="M5 9.5h6l-6 5.5h6M14.5 4h4.7l-4.7 4.7h4.7"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    zap: '<path d="M13 2.5 4.8 13.4h6L9.6 21.5l8.7-11.4h-6.1L13 2.5Z"/>'
  };

  window.icon = function (name, cls) {
    var solid = { heart: 1 };
    var svg = '<svg viewBox="0 0 24 24" fill="' + (solid[name] ? 'currentColor' : 'none')
      + '" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '
      + (cls ? 'class="' + cls + '"' : '') + ' aria-hidden="true">' + (ICONS[name] || ICONS.star || '') + '</svg>';
    return svg;
  };
  // star 兜底
  ICONS.star = '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>';

  window.sealHTML = function (cls) {
    var small = (cls || '').indexOf('sm') > -1;
    return '<div class="seal ' + (cls || '') + '"><span class="s1">' + (small ? '我' : '自我说明书') + '</span><span class="s2">' + (small ? '正版' : 'AUTHENTIC') + '</span></div>';
  };

  /* ============ 报告页渲染 ============ */
  function fmtDate(t) {
    var d = new Date(t);
    return d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2);
  }

  window.renderReport = function (root, test, res, extra) {
    var ac = test.color;
    var html = '';

    html += '<div class="topbar"><button class="backbtn" id="rback">' + icon('back') + '</button>'
      + '<div class="tt"><div class="t1">第 ' + test.num + ' 章 · ' + test.title + '</div>'
      + '<div class="t2">' + test.en + ' · REPORT</div></div></div>';

    html += '<div class="report rise">';
    html += '<div class="rbrand"><div class="bl"><b>自我说明书</b> · SELF MANUAL<br>第 ' + test.num + ' 章 ' + test.title + '</div>' + sealHTML('sm') + '</div>';

    html += '<div class="rhero">'
      + '<div class="bigicon" style="background:' + hexSoft(ac, 0.1) + ';color:' + ac + '">' + icon(res.icon) + '</div>'
      + '<div class="rname">' + res.name + '</div>'
      + '<div class="rtag">' + res.tag + '</div>'
      + (res.cert ? '<div class="rcert">已认证 · ' + res.cert + '</div>' : '')
      + '</div>';

    if (res.big) {
      html += '<div class="bigmetric"><div class="bm-label">' + res.big.label + '</div>'
        + '<div class="bm-val">' + res.big.value + '</div></div>';
      if (res.big.battery) {
        html += '<div class="battery"><div class="bshell"><div class="bfill" id="bfill" style="background:' + batteryColor(res.big.pct) + '"></div></div>'
          + '<div class="blabel">剩余电量 · 会随社交波动,仅供参考</div></div>';
      }
    }

    html += '<div class="rtext">' + res.text + '</div>';

    if (res.bars && res.bars.length) {
      html += '<div class="bars">';
      res.bars.forEach(function (b) {
        html += '<div class="bar' + (b.hi ? ' hi' : '') + '"><div class="bl"><b>' + b.label + '</b><span>' + b.pct + '%</span></div>'
          + '<div class="btrack"><div class="bfill" data-w="' + b.pct + '" style="background:' + (b.hi ? ac : '#B9B09C') + '"></div></div></div>';
      });
      html += '</div>';
    }

    (res.blocks || []).forEach(function (bk) {
      if (!bk.h && !bk.text && !bk.rx && !bk.cert && !bk.quip) return;
      html += '<div class="block">';
      if (bk.h) html += '<div class="bh">' + bk.h + '</div>';
      if (bk.cert) html += '<div class="certline">「 ' + bk.cert + ' 」</div>';
      if (bk.full && bk.full.indexOf(' · ') > -1) html += '<div class="btext" style="margin-top:4px">' + bk.full + '</div>';
      if (bk.rx) html += '<ol>' + bk.rx.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ol>';
      if (bk.text) html += '<div class="btext">' + bk.text + '</div>';
      if (bk.quip) html += '<div class="quip">『 ' + bk.quip + ' 』</div>';
      html += '</div>';
    });

    html += '<div class="rfoot"><div class="rmeta">报告编号 <b>' + (extra && extra.no || '—') + '</b><br>'
      + fmtDate(extra && extra.t || Date.now()) + ' · 本报告仅代表此刻的你</div>'
      + sealHTML('stamp') + '</div>';

    html += '</div>';

    if (extra && extra.histText) html += '<div class="hist-strip rise">' + extra.histText + '</div>';

    html += '<div class="racts">'
      + '<button class="btn accent" id="rsave">' + icon('save') + '保存报告卡到相册</button>'
      + '<div class="half">'
      + '<button class="btn ghostbtn" id="rretry">' + icon('retry') + '再测一次</button>'
      + '<button class="btn ghostbtn" id="rhome">' + icon('book') + '回大厅</button>'
      + '</div></div>';

    root.innerHTML = html;

    // 入场动画:条形与电池
    requestAnimationFrame(function () {
      setTimeout(function () {
        var bf = root.querySelector('#bfill');
        if (bf && res.big && res.big.pct != null) bf.style.width = res.big.pct + '%';
        root.querySelectorAll('.bfill[data-w]').forEach(function (el) {
          el.style.width = el.getAttribute('data-w') + '%';
        });
      }, 120);
    });

    return {
      back: root.querySelector('#rback'),
      save: root.querySelector('#rsave'),
      retry: root.querySelector('#rretry'),
      home: root.querySelector('#rhome')
    };
  };

  function hexSoft(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function batteryColor(pct) {
    if (pct >= 60) return '#0E9F6E';
    if (pct >= 25) return '#D9A114';
    return '#C43C33';
  }

  /* ============ Canvas 报告卡文本与大指标绘制 ============ */
  function cleanText(s) {
    if (s == null) return '';
    return String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  }

  function wrapText(c, rawText, x, y, maxW, lh, maxLines) {
    var text = cleanText(rawText);
    var paragraphs = text.split('\n');
    var lines = [];
    for (var p = 0; p < paragraphs.length; p++) {
      var curPara = paragraphs[p];
      var cur = '';
      for (var i = 0; i < curPara.length; i++) {
        var ch = curPara[i];
        if (c.measureText(cur + ch).width > maxW) {
          lines.push(cur); cur = ch;
          if (lines.length >= maxLines) break;
        } else cur += ch;
      }
      if (cur) lines.push(cur);
      if (lines.length >= maxLines) break;
    }
    if (lines.length > maxLines) lines = lines.slice(0, maxLines);
    if (lines.length === maxLines && text.length > lines.join('').length) {
      var last = lines[maxLines - 1];
      lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + '…';
    }
    lines.forEach(function (ln, k) { c.fillText(ln, x, y + k * lh); });
    return y + lines.length * lh;
  }

  window.buildShareCard = function (test, res, extra) {
    var W = 750;
    // 有维度条且无大指标的卡(如拖延/熬夜)需要更高的画布
    var H = (res.big || !(res.bars && res.bars.length)) ? 1160 : 1380;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var ac = test.color;

    // 纸底 + 纹理
    c.fillStyle = '#F5F1E8'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(120,100,60,0.03)';
    for (var y = 0; y < H; y += 6) c.fillRect(0, y, W, 1);

    var M = 54;
    // 顶部章条
    c.fillStyle = ac; c.fillRect(0, 0, W, 10);

    // 品牌行
    c.fillStyle = '#C43C33';
    rr(c, M, 62, 62, 62, 14); c.fill();
    c.fillStyle = '#FFFCF6';
    c.font = '700 36px Georgia, "Noto Serif SC", serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('我', M + 31, 96);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#26231D';
    c.font = '700 34px Georgia, "Noto Serif SC", serif';
    c.fillText('自我说明书', M + 82, 92);
    c.fillStyle = '#8A8172';
    c.font = '400 15px Georgia, serif';
    c.fillText('S E L F · M A N U A L', M + 84, 116);
    // 右上:第 XX 章
    c.textAlign = 'right';
    c.fillStyle = '#B08A3E';
    c.font = 'italic 700 26px Georgia, serif';
    c.fillText('第 ' + test.num + ' 章', W - M, 92);
    c.textAlign = 'left';

    // 分隔虚线
    dash(c, M, 156, W - M * 2);

    // 章名
    c.fillStyle = '#26231D';
    c.font = '700 40px Georgia, "Noto Serif SC", serif';
    c.fillText(test.title, M, 212);
    c.fillStyle = '#8A8172';
    c.font = '400 15px Georgia, serif';
    c.fillText(test.en, M, 238);

    // 结果图标
    var cx = W / 2, cy = 330;
    c.beginPath(); c.arc(cx, cy, 62, 0, Math.PI * 2);
    c.fillStyle = hexSoft(ac, 0.12); c.fill();
    c.strokeStyle = hexSoft(ac, 0.35); c.lineWidth = 2; c.stroke();
    drawPathIcon(c, res.icon, cx - 30, cy - 30, 60, ac);

    // 类型名
    c.textAlign = 'center';
    c.fillStyle = '#26231D';
    c.font = '700 52px Georgia, "Noto Serif SC", serif';
    var nm = cleanText(res.name);
    if (c.measureText(nm).width > W - M * 2) c.font = '700 42px Georgia, "Noto Serif SC", serif';
    c.fillText(nm, cx, 452);
    c.fillStyle = ac;
    c.font = '600 24px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
    c.fillText(cleanText(res.tag), cx, 492);
    if (res.cert) {
      c.strokeStyle = 'rgba(176,138,62,.6)'; c.lineWidth = 1.5;
      var certClean = cleanText(res.cert);
      var cw = c.measureText('已认证 · ' + certClean).width + 44;
      rr(c, cx - cw / 2, 516, cw, 40, 20); c.stroke();
      c.fillStyle = '#B08A3E';
      c.font = '700 18px -apple-system, "PingFang SC", sans-serif';
      c.fillText('已认证 · ' + certClean, cx, 542);
    }
    c.textAlign = 'left';

    var yy = res.cert ? 602 : 572;

    // 大指标 (解析数字与单位，彻底根除 <small> 标签与压字重叠)
    if (res.big) {
      c.textAlign = 'center';
      c.fillStyle = '#8A8172';
      c.font = '400 18px -apple-system, "PingFang SC", sans-serif';
      c.fillText(cleanText(res.big.label), cx, yy);

      var rawVal = String(res.big.value || '');
      var numPart = '', unitPart = '';
      var mSmall = rawVal.match(/^(.*?)<small>(.*?)<\/small>(.*)$/i);
      if (mSmall) {
        numPart = (mSmall[1] + mSmall[3]).replace(/<[^>]+>/g, '').trim();
        unitPart = mSmall[2].replace(/<[^>]+>/g, '').trim();
      } else {
        var mUnits = rawVal.match(/^([\d\.\-]+)\s*([^\d\.\s]+)$/);
        if (mUnits) {
          numPart = mUnits[1].trim();
          unitPart = mUnits[2].trim();
        } else {
          numPart = rawVal.replace(/<[^>]+>/g, '').trim();
        }
      }

      var valY = yy + 68;
      if (unitPart) {
        c.font = '800 60px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans SC", sans-serif';
        var numW = c.measureText(numPart).width;
        c.font = '600 24px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
        var unitW = c.measureText(unitPart).width;
        var totalW = numW + 8 + unitW;
        var startX = cx - totalW / 2;

        c.textAlign = 'left';
        c.fillStyle = '#26231D';
        c.font = '800 60px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans SC", sans-serif';
        c.fillText(numPart, startX, valY);

        c.fillStyle = '#8A8172';
        c.font = '600 24px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
        c.fillText(unitPart, startX + numW + 8, valY - 6);
      } else {
        c.textAlign = 'center';
        c.fillStyle = '#26231D';
        c.font = '800 60px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans SC", sans-serif';
        c.fillText(numPart, cx, valY);
      }

      if (res.big.battery) {
        // 电池条
        var bw = 380, bx = cx - bw / 2, by = valY + 36;
        c.strokeStyle = '#26231D'; c.lineWidth = 3;
        rr(c, bx, by, bw, 36, 10); c.stroke();
        rr(c, bx + bw + 6, by + 10, 6, 16, 3); c.fillStyle = '#26231D'; c.fill();
        var fw = (bw - 8) * res.big.pct / 100;
        c.fillStyle = res.big.pct >= 60 ? '#0E9F6E' : (res.big.pct >= 25 ? '#D9A114' : '#C43C33');
        if (fw > 4) { rr(c, bx + 4, by + 4, fw, 28, 6); c.fill(); }
        yy = by + 68;
      } else {
        yy = valY + 52; // 留出呼吸空间，彻底解决与下方主文本贴脸叠字
      }
      c.textAlign = 'left';
    }

    // 主文本
    c.fillStyle = '#57503F';
    c.font = '400 23px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
    yy = wrapText(c, res.text, M, yy, W - M * 2, 38, 5) + 18;

    // 维度条(大指标为空时展示,排在文本块之前)
    if (!res.big && res.bars && res.bars.length) {
      res.bars.slice(0, 5).forEach(function (b) {
        c.fillStyle = '#57503F';
        c.font = '400 19px -apple-system, "PingFang SC", sans-serif';
        c.fillText(b.label, M, yy + 14);
        c.fillStyle = '#D8CFB9';
        rr(c, M, yy + 24, W - M * 2, 10, 5); c.fill();
        c.fillStyle = b.hi ? ac : '#B9B09C';
        rr(c, M, yy + 24, Math.max(6, (W - M * 2) * b.pct / 100), 10, 5); c.fill();
        yy += 52;
      });
      yy += 10;
    }

    // 处方 / 带标题的文本块
    (res.blocks || []).forEach(function (bk) {
      if (yy >= H - 210) return;
      if (bk.rx) {
        c.fillStyle = ac;
        c.font = '700 20px -apple-system, "PingFang SC", sans-serif';
        c.fillText(bk.h || '处方', M, yy); yy += 40;
        c.fillStyle = '#57503F';
        c.font = '400 21px -apple-system, "PingFang SC", sans-serif';
        var marks = ['① ', '② ', '③ '];
        bk.rx.forEach(function (r, i) {
          if (i > 2) return;
          yy = wrapText(c, marks[i] + r, M, yy, W - M * 2, 32, 2) + 6;
        });
        yy += 8;
      } else if (bk.h && bk.text) {
        c.fillStyle = ac;
        c.font = '700 20px -apple-system, "PingFang SC", sans-serif';
        c.fillText(bk.h, M, yy); yy += 34;
        c.fillStyle = '#57503F';
        c.font = '400 21px -apple-system, "PingFang SC", sans-serif';
        yy = wrapText(c, bk.text, M, yy, W - M * 2, 32, 3) + 12;
      }
    });

    // 底部:编号日期 + 印章
    c.fillStyle = '#8A8172';
    c.font = '400 17px Georgia, serif';
    c.fillText('报告编号 ' + (extra && extra.no || ''), M, H - 128);
    c.fillText(fmtDate(extra && extra.t || Date.now()) + ' · 仅代表此刻的你', M, H - 100);

    drawSeal(c, W - 92 - 52, H - 210, 104);

    // 页脚
    dash(c, M, H - 66, W - M * 2);
    c.textAlign = 'center';
    c.fillStyle = '#8A8172';
    c.font = '400 16px Georgia, serif';
    c.fillText('自我说明书 · 本报告仅供娱乐', cx, H - 36);
    c.textAlign = 'left';

    return cv.toDataURL('image/png');
  };

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function dash(c, x, y, w) {
    c.save();
    c.strokeStyle = 'rgba(138,129,114,.5)'; c.lineWidth = 1;
    c.setLineDash([6, 6]);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
    c.restore();
  }
  function drawSeal(c, x, y, r) {
    c.save();
    c.translate(x + r / 2, y + r / 2);
    c.rotate(-8 * Math.PI / 180);
    c.strokeStyle = '#C43C33'; c.fillStyle = '#C43C33';
    c.globalAlpha = 0.88;
    c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, r / 2 - 2, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, r / 2 - 10, 0, Math.PI * 2); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 22px Georgia, "Noto Serif SC", serif';
    c.fillText('自我说明书', 0, -9);
    c.font = '400 10px Georgia, serif';
    c.fillText('A U T H E N T I C', 0, 13);
    c.restore();
  }
  /* 在 canvas 上同步画线性图标(解析 SVG 标记为 Path2D) */
  function drawPathIcon(c, name, x, y, size, color) {
    var markup = ICONS[name] || ICONS.star;
    c.save();
    c.translate(x, y);
    c.scale(size / 24, size / 24);
    c.strokeStyle = color;
    c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round';
    var re = /<(path|rect|circle)\b([^>]*)\/?>/g, m;
    while ((m = re.exec(markup))) {
      var attrs = m[2];
      var get = function (n) {
        var r = new RegExp(n + '="([^"]*)"').exec(attrs);
        return r ? r[1] : null;
      };
      var p = new Path2D();
      if (m[1] === 'path') p = new Path2D(get('d'));
      else if (m[1] === 'rect') p.rect(parseFloat(get('x')), parseFloat(get('y')), parseFloat(get('width')), parseFloat(get('height')));
      else if (m[1] === 'circle') { p.arc(parseFloat(get('cx')), parseFloat(get('cy')), parseFloat(get('r')), 0, Math.PI * 2); }
      c.stroke(p);
      if (get('fill') === 'currentColor') { c.fillStyle = color; c.fill(p); }
    }
    c.restore();
  }
})();

;
/* === js/modules/manual-games.js === */
/* 自我说明书 — 互动测评引擎
 * startReaction(root, onFinish) / startColor(root, onFinish)
 * 返回 destroy():清理计时器,退出时必须调用。
 */
(function () {
  'use strict';

  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
  }
  function stdev(arr) {
    if (arr.length < 2) return 0;
    var mean = arr.reduce(function (s, v) { return s + v; }, 0) / arr.length;
    var v = arr.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / (arr.length - 1);
    return Math.sqrt(v);
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function makeRoot(root) {
    root.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'stage';
    root.appendChild(el);
    return el;
  }

  function hud(extraLeft, extraRight) {
    return '<div class="hud"><div>' + (extraLeft || '') + '</div><div>' + (extraRight || '') + '</div></div>';
  }
  function heartsHTML(left, total) {
    var s = '';
    for (var i = 0; i < total; i++) {
      s += '<span class="' + (i < left ? '' : 'off') + '" style="color:#E05B4E;display:inline-flex">' + window.icon('heart') + '</span>';
    }
    return '<span class="hearts">' + s + '</span>';
  }

  /* ==================================================================
   * 05 反应速度擂台
   * ================================================================== */
  window.startReaction = function (root, onFinish) {
    var el = makeRoot(root);
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var S1 = [], S2 = { correct: 0, rts: [], traps: 0 }, S3 = { goRts: [], falseHit: 0, trials: [] };

    /* ---------------- 排行榜 ----------------
       反应速度按「简单反应中位数」排名，毫秒越小越好（higher:false）。
       全服榜显示毫秒与准度，本机战绩显示三关的关键数字。
       ------------------------------------------ */
    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'reaction',
      storeKey: 'sm_reaction_runs',
      higher: false,
      idPrefix: 'lbreact',
      formatScore: function (v) { return v + ' ms'; },
      describe: function (run) {
        return { score: run.ms, extra: { acc: run.acc, age: run.age } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '<small> ms</small></span>',
          '<span class="lb-tile">' + (r.acc || 0) + '/20</span>',
          '<span class="lb-meta">' + (r.age || '-') + ' 岁</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> ms</small></span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.acc) || 0) + '/20</span>'
        ];
      }
    }) : null;

    function mountLbHost() {
      if (!lbPanel) return;
      var layout = root.querySelector('.sm-game-layout');
      if (!layout) {
        layout = document.createElement('div');
        layout.className = 'sm-game-layout';
        root.appendChild(layout);
      }
      if (el.parentNode !== layout) layout.appendChild(el);
      var host = layout.querySelector('.lb-host');
      if (!host) {
        host = document.createElement('div');
        host.className = 'lb-host';
        layout.appendChild(host);
      }
      lbPanel.mount(host);
    }

    /* ---------- 关卡说明 ---------- */
    function stageIntro(n) {
      clearTimers();
      var info = {
        1: { t: '第一关 · 简单反应', d: '屏幕变红的一瞬间，立即点击！<br>共 5 次，取中位数。抢跑会重新测试。', b: '开始第一关' },
        2: { t: '第二关 · 选择反应', d: '红点出现 → 按左半区；绿点出现 → 按右半区。<br>共 20 次，途中可能有规则交换。', b: '开始第二关' },
        3: { t: '第三关 · 冲动控制', d: '绿点出现 → 越快点越好；<br>红点出现 → 忍住，什么都别碰。共 20 次。', b: '开始第三关' }
      }[n];
      el.innerHTML = hud('<b>反应速度擂台</b>', '第 ' + n + '/3 关') +
        '<div class="rz-stage"><div class="rz-big" style="font-size:30px">' + info.t + '</div>' +
        '<div class="rz-sub">' + info.d + '</div>' +
        '<button class="btn accent" id="rzgo" style="margin-top:26px;width:auto;padding:12px 38px">' + info.b + '</button></div>';
      var btnGo = el.querySelector('#rzgo');
      if (btnGo) {
        btnGo.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          if (n === 1) run1(); else if (n === 2) run2(); else run3();
        };
      }
    }

    /* ---------- 第一关:简单反应 ---------- */
    function run1() {
      var valid = [], fouls = 0, shown = 0, t0 = 0, armed = false, locked = false, waitId = 0;
      var stageStartTime = performance.now();
      function paint(k) {
        stageStartTime = performance.now();
        locked = false;
        el.innerHTML = hud('<b>第一关 · 简单反应（变红即点）</b>', '有效 ' + valid.length + '/5') +
          '<div class="rz-stage rz-pure-wait" id="rz"><div class="rz-count">' + (valid.length ? '上次 ' + valid[valid.length - 1] + ' ms' : '&nbsp;') + '</div>' +
          '<div class="rz-big" id="big"></div>' +
          '<div class="rz-sub" id="sub"></div></div>';
        var st = el.querySelector('#rz');
        if (st) st.addEventListener('pointerdown', onTap);
        arm();
      }
      function arm() {
        armed = false;
        locked = false;
        var big = el.querySelector('#big'), sub = el.querySelector('#sub'), st = el.querySelector('#rz');
        if (big) big.textContent = '';
        if (sub) { sub.className = 'rz-sub'; sub.textContent = ''; }
        if (st) { st.classList.remove('gorun'); st.classList.add('rz-pure-wait'); }
        waitId = later(function () {
          if (destroyed) return;
          armed = true; t0 = performance.now();
          var s = el.querySelector('#rz');
          if (s) { s.classList.remove('rz-pure-wait'); s.classList.add('gorun'); }
          if (window.SFX && window.SFX.go) window.SFX.go();
        }, 1200 + Math.random() * 2200);
      }
      function onTap(e) {
        if (locked) return;
        if (performance.now() - stageStartTime < 280) return; // 280ms 手势防抖保护
        locked = true;
        if (!armed) {   // 抢跑
          clearTimeout(waitId);
          fouls++;
          if (window.SFX && window.SFX.foul) window.SFX.foul();
          var u = el.querySelector('#sub');
          if (u) { u.className = 'rz-sub'; u.innerHTML = '<span class="rz-warn" style="color:#f87171;font-weight:700">抢跑！等背景变红再点</span>'; }
          if (fouls >= 2) {
            valid = []; shown = 0; fouls = 0;
            if (u) u.innerHTML = '<span class="rz-warn" style="color:#f87171;font-weight:700">连续抢跑，本关重测！</span>';
          }
          later(function () { if (valid.length < 5) { shown = valid.length; paint(); } }, 900);
          return;
        }
        armed = false;
        var dt = Math.round(performance.now() - t0);
        valid.push(dt); fouls = 0;
        if (window.SFX && window.SFX.select) window.SFX.select();
        var b = el.querySelector('#big');
        if (b) b.textContent = dt + ' ms';
        later(function () {
          if (valid.length >= 5) { S1 = valid; stageSummary(1); }
          else paint();
        }, 700);
      }
      paint();
    }

    /* ---------- 第二关:选择反应 ---------- */
    function run2() {
      var N = 20;
      var traps = {};
      var tp = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]).slice(0, 4);
      tp.forEach(function (i) { traps[i] = true; });
      var i = 0, t0 = 0, answered = true, toId = 0;
      function paint() {
        answered = true;
        el.innerHTML = hud('<b>第二关 · 选择反应（红左·绿右）</b>', (i + 1) + '/' + N) +
          '<div class="rz-stage" style="padding:20px 14px"><div class="rz-banner" id="ban">⚠️ 规则反转：红右 · 绿左</div>' +
          '<div class="rz-cue-slot" id="cue"><span class="dot" style="width:64px;height:64px;display:inline-block;border-radius:50%;background:#2E2A3B;"></span></div>' +
          '<div class="rz-halves">' +
          '<div class="rz-half" id="L"><span>左半区</span></div>' +
          '<div class="rz-half" id="R"><span>右半区</span></div>' +
          '</div></div>';
        el.querySelector('#L').addEventListener('pointerdown', function () { answer('L'); });
        el.querySelector('#R').addEventListener('pointerdown', function () { answer('R'); });
        later(show, 600 + Math.random() * 900);
      }
      function show() {
        if (destroyed) return;
        var isRed = Math.random() < 0.5;
        var trap = !!traps[i];
        var need = isRed ? (trap ? 'R' : 'L') : (trap ? 'L' : 'R');
        var cue = el.querySelector('#cue');
        if (cue) cue.innerHTML = '<span class="dot ' + (isRed ? 'red' : 'green') + '" style="width:64px;height:64px;display:inline-block;border-radius:50%;background:' + (isRed ? '#E23B2E' : '#2FBF6B') + ';box-shadow:0 0 24px ' + (isRed ? 'rgba(226,59,46,0.55)' : 'rgba(47,191,107,0.5)') + ';"></span>';
        var ban = el.querySelector('#ban');
        if (trap && ban) ban.classList.add('show');
        t0 = performance.now(); answered = false;
        if (window.SFX && window.SFX.tick) window.SFX.tick();
        el._need = need;
        toId = later(function () { if (!answered) judge(null); }, 1500);
      }
      function answer(side) {
        if (answered) return;
        judge(side);
      }
      function judge(side) {
        answered = true; clearTimeout(toId);
        var need = el._need;
        var ok = side === need;
        if (ok) {
          S2.correct++;
          if (traps[i]) S2.traps++;
          var dt = Math.round(performance.now() - t0);
          if (dt >= 0 && dt < 1500) S2.rts.push(dt);
          if (window.SFX && window.SFX.select) window.SFX.select();
        } else {
          if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        }
        var half = el.querySelector(side === 'L' ? '#L' : (side === 'R' ? '#R' : (need === 'L' ? '#L' : '#R')));
        if (half) {
          // 颜色交给 .hit.ok / .hit.ng 的 CSS，别在这里写内联样式——
          // 内联 borderColor 会盖掉样式表，改配色时两边要同时改。
          half.classList.add('hit');
          half.classList.add(ok ? 'ok' : 'ng');
        }
        i++;
        later(function () {
          if (i >= N) stageSummary(2); else paint();
        }, 420);
      }
      paint();
    }

    /* ---------- 第三关:Go / No-Go ---------- */
    function run3() {
      var N = 20;
      var seq = [];
      for (var k = 0; k < N; k++) seq.push(k < 16 ? 'go' : 'nogo');
      shuffle(seq);
      if (seq[0] === 'nogo') { var f = seq.indexOf('go'); seq[f] = 'nogo'; seq[0] = 'go'; }
      var i = 0, t0 = 0, answered = true, toId = 0;
      function paint() {
        answered = true;
        el.innerHTML = hud('<b>第三关 · 冲动控制（绿按·红忍）</b>', (i + 1) + '/' + N) +
          '<div class="rz-stage rz-pure-wait" id="st"><div class="rz-count">Go ' + S3.goRts.length + '</div>' +
          '<div class="rz-big" id="big"></div><div class="rz-sub" id="sub"></div></div>';
        el.querySelector('#st').addEventListener('pointerdown', onTap);
        later(show, 700 + Math.random() * 900);
      }
      function show() {
        if (destroyed) return;
        var g = seq[i] === 'go';
        var st = el.querySelector('#st');
        if (st) {
          st.classList.remove('rz-pure-wait');
          st.classList.add(g ? 'gozone' : 'gorun');
        }
        t0 = performance.now(); answered = false;
        if (window.SFX && window.SFX.tick) window.SFX.tick();
        toId = later(function () {
          if (answered) return;
          answered = true;
          if (!g) { S3.trials.push('ok'); if (window.SFX && window.SFX.stage) window.SFX.stage(); }   // 成功忍住
          later(next, 350);
        }, g ? 1200 : 1100);
      }
      function onTap() {
        if (answered) return;
        answered = true; clearTimeout(toId);
        var g = seq[i] === 'go';
        if (g) {
          var dt = Math.round(performance.now() - t0);
          S3.goRts.push(dt); if (window.SFX && window.SFX.select) window.SFX.select();
          var b = el.querySelector('#big'); if (b) b.textContent = dt + ' ms';
        } else {
          S3.falseHit++; if (window.SFX && window.SFX.foul) window.SFX.foul();
          var u2 = el.querySelector('#sub'); if (u2) u2.innerHTML = '<span class="rz-warn" style="color:#fff;font-weight:800;font-size:20px;">没忍住！红屏不能点</span>';
        }
        later(next, 550);
      }
      function next() { i++; if (i >= N) stageSummary(3); else paint(); }
      paint();
    }

    /* ---------- 关卡小结 ---------- */
    function stageSummary(n) {
      clearTimers();
      if (window.SFX && window.SFX.stage) window.SFX.stage();
      var body = '';
      if (n === 1) {
        var m = median(S1);
        body = '<div class="rz-big" style="font-size:52px">' + m + ' <span style="font-size:22px">ms</span></div>' +
          '<div class="rz-sub">简单反应中位数 · 5 次平均发挥</div>';
      } else if (n === 2) {
        var mean = S2.rts.length ? Math.round(S2.rts.reduce(function (s, v) { return s + v; }, 0) / S2.rts.length) : 1500;
        body = '<div class="rz-big" style="font-size:52px">' + S2.correct + '<span style="font-size:22px">/20</span></div>' +
          '<div class="rz-sub">正确次数 · 平均 ' + mean + ' ms' + (S2.traps ? '<br>规则交换识别 ' + S2.traps + '/4' : '') + '</div>';
      } else {
        var gm = median(S3.goRts);
        body = '<div class="rz-big" style="font-size:52px">' + S3.falseHit + '<span style="font-size:22px">/4</span></div>' +
          '<div class="rz-sub">红点误按次数(冲动指数)· Go 中位数 ' + gm + ' ms</div>';
      }
      el.innerHTML = hud('<b>反应速度擂台</b>', '第 ' + n + '/3 关') +
        '<div class="rz-stage">' + body +
        '<button class="btn accent" id="rznext" style="margin-top:26px;width:auto;padding:12px 38px">' +
        (n < 3 ? '进入下一关' : '查看判词') + '</button></div>';
      var btnNext = el.querySelector('#rznext');
      if (btnNext) {
        btnNext.addEventListener('click', function () {
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          if (n < 3) stageIntro(n + 1); else finish();
        });
      }
    }

    /* ---------- 总判定 ---------- */
    function finish() {
      var m1 = median(S1);
      var acc = S2.correct / 20;
      var mean2 = S2.rts.length ? S2.rts.reduce(function (s, v) { return s + v; }, 0) / S2.rts.length : 1500;
      var cv = S2.rts.length > 1 ? stdev(S2.rts) / mean2 : 0.5;
      var impulse = S3.falseHit / 4;

      var age = m1 < 220 ? 16 : m1 < 280 ? 22 : m1 < 350 ? 30 : m1 < 450 ? 45 : 60;
      var speed = m1 < 220 ? 100 : m1 < 280 ? 88 : m1 < 350 ? 72 : m1 < 450 ? 52 : 35;
      var accPct = Math.round(acc * 100);
      var stab = cv < 0.15 ? 95 : cv < 0.25 ? 80 : cv < 0.35 ? 62 : 45;

      var rank, ricon;
      if (m1 < 260 && acc >= 0.85) { rank = '闪电侠'; ricon = 'bolt'; }
      else if (m1 < 330 && acc >= 0.70) { rank = '电竞手'; ricon = 'gamepad'; }
      else if (m1 < 430) { rank = '正常人'; ricon = 'smile'; }
      else { rank = '树懒本懒'; ricon = 'sleepy'; }

      var quip = impulse < 0.10
        ? '泰山崩于前而面不改色,期货市场失去了一位天才。'
        : impulse > 0.40
          ? '红色对你来说只是个建议。'
          : '刹车片状态良好,日常够用。';

      if (lbPanel) lbPanel.submit({ ms: m1, acc: S2.correct, age: age });

      onFinish({
        icon: ricon, name: rank, tag: '反应年龄 ' + age + ' 岁 · 三关综合判定',
        text: '简单反应中位数 ' + m1 + ' ms' + (age === 45 ? ',带着一点疲劳的痕迹——该睡个好觉了。' : age === 60 ? ',急事先预约,从容不是罪。' : ',手速在线。') +
          '选择反应正确率 ' + accPct + '%,成绩波动' + (stab >= 80 ? '很小,发挥稳如老狗。' : stab >= 62 ? '中等,状态有起伏。' : '偏大,可能手滑也可能心滑。'),
        big: { label: '简单反应中位数', value: m1 + ' <small>ms</small>' },
        bars: [
          { label: '速度', pct: speed }, { label: '准度', pct: accPct }, { label: '稳定性', pct: stab }
        ],
        blocks: [{ h: '冲动指数', text: '红点误按 ' + S3.falseHit + '/4(' + Math.round(impulse * 100) + '%)。' + quip }],
        quip: window.SM_DATA.reaction.disclaimer,
        cert: rank + ' · 认证',
        detail: { type: rank, age: age, ms: m1 }
      });
    }

    stageIntro(1);
    mountLbHost();
    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 06 色彩敏锐度挑战
   * ================================================================== */
  window.startColor = function (root, onFinish) {
    var el = makeRoot(root);
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var LIVES = 3, LIMIT = 8000;
    var lives, lv, rafId, tStart, dying = false;

    /* ---------------- 排行榜 ----------------
       色彩按「通过关卡数」排名，越多越好（higher:true）。
       ------------------------------------------ */
    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'color',
      storeKey: 'sm_color_runs',
      higher: true,
      idPrefix: 'lbcolor',
      formatScore: function (v) { return v + ' 关'; },
      describe: function (run) {
        return { score: run.level, extra: {} };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '<small> 关</small></span>',
          '<span class="lb-tile">' + (r.gridN || 2) + '×' + (r.gridN || 2) + '</span>',
          '<span class="lb-meta">' + (r.left || 0) + ' 命</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> 关</small></span>',
          '<span class="lb-tile">' + (r.at ? window.AppLbPanel.fmtDay(r.at) : '--') + '</span>'
        ];
      }
    }) : null;

    function mountLbHost() {
      if (!lbPanel) return;
      var layout = root.querySelector('.sm-game-layout');
      if (!layout) {
        layout = document.createElement('div');
        layout.className = 'sm-game-layout';
        root.appendChild(layout);
      }
      if (el.parentNode !== layout) layout.appendChild(el);
      var host = layout.querySelector('.lb-host');
      if (!host) {
        host = document.createElement('div');
        host.className = 'lb-host';
        layout.appendChild(host);
      }
      lbPanel.mount(host);
    }

    function gridN(l) { return Math.min(7, 2 + Math.floor((l - 1) / 4)); }
    /* 色差曲线:奇数关动色相,偶数关动明度 */
    function deltaFor(l) {
      function seg(v, a, b, c, d) { // v: 1..: (a@1 → b@4 → c@8 → d@12 → e@16 → f@20)
        if (v <= 4) return lerp(v, 1, 4, a, b);
        if (v <= 8) return lerp(v, 4, 8, b, c);
        if (v <= 12) return lerp(v, 8, 12, c, d);
        if (v <= 16) return lerp(v, 12, 16, d, d - 2);
        return Math.max(2.2, (d - 2) - (v - 16) * 0.16);
      }
      function lerp(x, x0, x1, y0, y1) { return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
      return seg(l, 30, 22, 15, 10);
    }

    function paintHUD() {
      el.innerHTML = hud('<b>第 <span id="lvn">' + lv + '</span> 关</b>', heartsHTML(lives, LIVES)) +
        '<div class="timerbar"><i id="tt"></i></div>' +
        '<div id="gridbox" style="display:flex;justify-content:center"></div>' +
        '<div class="rz-sub" style="margin-top:12px">找出颜色不同的那一块</div>';
    }

    function clearFloatMsgs() {
      document.querySelectorAll('.floatmsg').forEach(function (n) {
        if (n && n.parentNode) n.remove();
      });
    }

    /* 开始页：进来先停在说明页，玩家可以先看右边的榜单再开始。
       此前一进章节就立刻起计时，想看榜反而会白白掉命。 */
    function intro() {
      clearTimers();
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      el.innerHTML = hud('<b>色彩敏锐度挑战</b>', '共 3 条命') +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">找出颜色不同的那一块</div>' +
        '<div class="rz-sub">每关限时 8 秒，答错或超时扣 1 条命。<br>' +
        '关卡越深，格子越多、色差越小。3 条命用完即结算。</div>' +
        '<button class="btn accent" id="clgo" style="margin-top:26px;width:auto;padding:12px 38px">开始挑战</button>' +
        '</div>';
      var btn = el.querySelector('#clgo');
      if (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          lives = LIVES; lv = 1;
          startLevel();
        };
      }
    }

    function startLevel() {
      if (destroyed || dying) return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      paintHUD();
      var n = gridN(lv);
      var d = deltaFor(lv);
      var odd = lv % 2 === 1;
      var hue = [8, 25, 45, 95, 150, 190, 230, 275, 320][Math.floor(Math.random() * 9)];
      var sat = 62;
      var li = 52;
      var base, odd1;
      if (odd) {
        var dir = Math.random() < 0.5 ? 1 : -1;
        base = 'hsl(' + hue + ',' + sat + '%,' + li + '%)';
        odd1 = 'hsl(' + ((hue + dir * d + 360) % 360) + ',' + sat + '%,' + li + '%)';
      } else {
        var dirL = Math.random() < 0.5 ? 1 : -1;
        base = 'hsl(' + hue + ',' + sat + '%,' + li + '%)';
        odd1 = 'hsl(' + hue + ',' + sat + '%,' + (li + dirL * d) + '%)';
      }
      var oddIdx = Math.floor(Math.random() * n * n);

      var box = el.querySelector('#gridbox');
      var grid = document.createElement('div');
      grid.className = 'cl-grid';
      grid.style.gridTemplateColumns = 'repeat(' + n + ', minmax(0, 1fr))';
      for (var i = 0; i < n * n; i++) {
        (function (idx) {
          var cellEl = document.createElement('div');
          cellEl.className = 'cl-cell';
          cellEl.style.background = idx === oddIdx ? odd1 : base;
          cellEl.addEventListener('pointerdown', function () { pick(idx === oddIdx, cellEl); });
          grid.appendChild(cellEl);
        })(i);
      }
      box.appendChild(grid);

      // 倒计时
      tStart = performance.now();
      var bar = el.querySelector('#tt');
      var lastTick = 9;
      (function tickFrame() {
        if (destroyed || dying) return;
        var left = LIMIT - (performance.now() - tStart);
        if (bar) bar.style.width = Math.max(0, left / LIMIT * 100) + '%';
        var sec = Math.ceil(left / 1000);
        if (sec <= 3 && sec < lastTick) { if (window.SFX && window.SFX.tick) window.SFX.tick(); }
        lastTick = sec;
        if (left <= 0) { timeout(); return; }
        rafId = requestAnimationFrame(tickFrame);
      })();
    }

    function pick(ok, cellEl) {
      if (dying || destroyed) return;
      if (ok) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        if (window.SFX && window.SFX.stage) window.SFX.stage();
        lv++;
        startLevel();
      } else {
        if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        lives--;
        if (cellEl) { cellEl.classList.add('cl-wrong'); cellEl.style.outline = '3px solid #E23B2E'; }
        var h = el.querySelector('.hearts');
        if (h) h.outerHTML = heartsHTML(lives, LIVES);
        floatMsg(lives > 0 ? '答错！还剩 ' + lives + ' 条命' : '命尽……');
        if (lives <= 0) {
          dying = true;
          if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
          later(end, 700);
        }
      }
    }
    function timeout() {
      if (dying || destroyed) return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      lives--;
      var h = el.querySelector('.hearts');
      if (h) h.outerHTML = heartsHTML(lives, LIVES);
      floatMsg(lives > 0 ? '超时！还剩 ' + lives + ' 条命' : '超时！命尽……');
      if (lives <= 0) {
        dying = true;
        later(end, 700);
      } else {
        startLevel();
      }
    }

    function end() {
      clearTimers();
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      clearFloatMsgs();
      var passed = lv - 1; // 完成关数
      var certs = window.SM_DATA.color.certs;
      var cert = certs[0];
      for (var i = 0; i < certs.length; i++) { if (passed >= certs[i].min) { cert = certs[i]; break; } }
      var best = 0;
      try { best = parseInt(localStorage.getItem('sm_color_best') || '0', 10) || 0; } catch (e) {}
      if (passed > best) { best = passed; try { localStorage.setItem('sm_color_best', String(best)); } catch (e) {} }

      // 一关没过就别上榜：挂机超时也会走到这里，0 关记录对谁都没意义
      if (lbPanel && passed > 0) {
        lbPanel.submit({ level: passed, gridN: gridN(Math.max(1, passed)), left: Math.max(0, lives) });
      }

      onFinish({
        icon: cert.icon, name: cert.name, tag: '通过 ' + passed + ' 关' + (passed >= best && passed > 0 ? ' · 新纪录' : ''),
        text: cert.text,
        big: { label: '通过关卡', value: passed + ' <small>关</small>' },
        bars: [],
        blocks: best > 0 ? [{ h: '本机纪录', text: '历史最佳:通过 ' + best + ' 关。' }] : [],
        quip: window.SM_DATA.color.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, lv: passed, best: best }
      });
    }

    function floatMsg(txt) {
      clearFloatMsgs();
      var m = document.createElement('div');
      m.className = 'floatmsg';
      m.textContent = txt;
      el.appendChild(m);
      setTimeout(function () {
        if (m && m.parentNode) m.remove();
      }, 650);
    }

    lives = LIVES; lv = 1;
    intro();          // 先停在开始页，点「开始挑战」才起计时
    mountLbHost();
    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        clearFloatMsgs();
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 07 数字合体 2048 (2048 PUZZLE)
   * ================================================================== */
  window.startGame2048 = function (root, onFinish) {
    var el = makeRoot(root);
    var destroyed = false;
    var timers = [];
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var score = 0;
    var moves = 0;
    var merges = 0;
    var maxTile = 2;
    var undosLeft = 3;
    var history = [];
    var hasWon = false;
    var isOver = false;

    var bestScore = 0;
    try { bestScore = parseInt(localStorage.getItem('sm_2048_best') || '0', 10) || 0; } catch (e) {}

    /* ---------------- 战绩记录 ----------------
       本机战绩存 localStorage（断网可用、最多 12 条），
       同时把「个人最高分」提交到全服排行榜（api/leaderboard.js）。
       后端不可用时榜单自动退回本机数据，不会报错打断游戏。
       榜单的 DOM 与拉取逻辑在 lb-panel.js 里，三个游戏共用。
       ------------------------------------------------ */
    var runRecorded = false;

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: '2048',
      storeKey: 'sm_2048_runs',
      higher: true,
      idPrefix: 'lb2048',
      formatScore: function (v) { return v + ' 分'; },
      describe: function (run) {
        return { score: run.score, extra: { maxTile: run.maxTile, moves: run.moves, merges: run.merges } };
      },
      // 本机战绩：分数 / 最高方块 / 步数 / 日期
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + (r.maxTile || 0) + '</span>',
          '<span class="lb-meta">' + (r.moves || 0) + ' 步</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
        ];
      },
      // 全服榜：头像 / 昵称 / 分数 / 最高方块
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.maxTile) || 0) + '</span>'
        ];
      }
    }) : null;

    // 每局只记一次：游戏结束和主动结算都调用，靠 runRecorded 去重
    // 返回本局在本机战绩中的名次（1 起）；被去重时返回 0
    function recordRun() {
      if (runRecorded) return 0;
      runRecorded = true;
      if (!lbPanel) return 0;
      return lbPanel.submit({ score: score, maxTile: maxTile, moves: moves, merges: merges });
    }

    // 方块只显示数字本身。此前给每级方块配了「起步/转正/经理/总监」这类
    // 职场头衔，既和 2048 无关，也让游戏显得廉价——已全部移除。

    function spawnTile() {
      var empty = [];
      for (var i = 0; i < 16; i++) {
        if (board[i] === 0) empty.push(i);
      }
      if (!empty.length) return false;
      var spot = empty[Math.floor(Math.random() * empty.length)];
      var val = Math.random() < 0.9 ? 2 : 4;
      board[spot] = val;
      return true;
    }

    function checkMax() {
      for (var i = 0; i < 16; i++) {
        if (board[i] > maxTile) maxTile = board[i];
      }
    }

    function canMove() {
      for (var i = 0; i < 16; i++) {
        if (board[i] === 0) return true;
      }
      // 检查横向与纵向相邻相等
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          var idx = r * 4 + c;
          if (c < 3 && board[idx] === board[idx + 1]) return true;
          if (r < 3 && board[idx] === board[idx + 4]) return true;
        }
      }
      return false;
    }

    /* 滑动核心算法: 单行 4 元素向左靠拢并合并 */
    function slideRow(row) {
      var filtered = row.filter(function (x) { return x !== 0; });
      var newRow = [0, 0, 0, 0];
      var gained = 0;
      var merged = 0;
      var outIdx = 0;
      for (var i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          var val = filtered[i] * 2;
          newRow[outIdx++] = val;
          gained += val;
          merged++;
          i++; // 跳过下一个已合并的元素
        } else {
          newRow[outIdx++] = filtered[i];
        }
      }
      return { row: newRow, gained: gained, merged: merged };
    }

    function move(dir) {
      if (destroyed || isOver) return false;
      var oldBoard = board.slice();
      var totalGained = 0;
      var totalMerged = 0;

      if (dir === 'left') {
        for (var r = 0; r < 4; r++) {
          var row = [board[r * 4], board[r * 4 + 1], board[r * 4 + 2], board[r * 4 + 3]];
          var res = slideRow(row);
          board[r * 4] = res.row[0];
          board[r * 4 + 1] = res.row[1];
          board[r * 4 + 2] = res.row[2];
          board[r * 4 + 3] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      } else if (dir === 'right') {
        for (var r = 0; r < 4; r++) {
          var row = [board[r * 4 + 3], board[r * 4 + 2], board[r * 4 + 1], board[r * 4]];
          var res = slideRow(row);
          board[r * 4 + 3] = res.row[0];
          board[r * 4 + 2] = res.row[1];
          board[r * 4 + 1] = res.row[2];
          board[r * 4] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      } else if (dir === 'up') {
        for (var c = 0; c < 4; c++) {
          var col = [board[c], board[c + 4], board[c + 8], board[c + 12]];
          var res = slideRow(col);
          board[c] = res.row[0];
          board[c + 4] = res.row[1];
          board[c + 8] = res.row[2];
          board[c + 12] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      } else if (dir === 'down') {
        for (var c = 0; c < 4; c++) {
          var col = [board[c + 12], board[c + 8], board[c + 4], board[c]];
          var res = slideRow(col);
          board[c + 12] = res.row[0];
          board[c + 8] = res.row[1];
          board[c + 4] = res.row[2];
          board[c] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      }

      var changed = false;
      for (var i = 0; i < 16; i++) {
        if (board[i] !== oldBoard[i]) { changed = true; break; }
      }

      if (changed) {
        history.push({ board: oldBoard, score: score, maxTile: maxTile, moves: moves });
        if (history.length > 3) history.shift();

        score += totalGained;
        moves++;
        merges += totalMerged;
        if (score > bestScore) {
          bestScore = score;
          try { localStorage.setItem('sm_2048_best', String(bestScore)); } catch (e) {}
        }
        checkMax();
        spawnTile();

        if (window.SFX && window.SFX.tap) window.SFX.tap();

        if (maxTile >= 2048 && !hasWon) {
          hasWon = true;
          if (window.SFX && window.SFX.stage) window.SFX.stage();
          showFloatTip('🎉 达成 2048 登顶成就！');
        }

        if (!canMove()) {
          isOver = true;
          recordRun();
          if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        }

        renderUI();
        return true;
      }
      return false;
    }

    function undo() {
      if (destroyed || !history.length || undosLeft <= 0) return;
      var last = history.pop();
      board = last.board;
      score = last.score;
      maxTile = last.maxTile;
      moves = last.moves;
      undosLeft--;
      isOver = false;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      renderUI();
    }

    function resetGame() {
      board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      score = 0;
      moves = 0;
      merges = 0;
      maxTile = 2;
      history = [];
      undosLeft = 3;
      hasWon = false;
      isOver = false;
      runRecorded = false;   // 新一局，允许再次记录
      spawnTile();
      spawnTile();
      checkMax();
      renderUI();
    }

    function showFloatTip(txt) {
      var m = document.createElement('div');
      m.className = 'g2048-float-tip';
      m.textContent = txt;
      el.appendChild(m);
      setTimeout(function () { if (m && m.parentNode) m.remove(); }, 1200);
    }

    function finish() {
      clearTimers();
      var myRank = recordRun();   // 主动结算也算本局结束
      var certs = window.SM_DATA['game-2048'].certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (maxTile >= certs[i].min) { cert = certs[i]; break; }
      }

      var planningPct = maxTile >= 2048 ? 100 : maxTile >= 1024 ? 92 : maxTile >= 512 ? 82 : maxTile >= 256 ? 70 : maxTile >= 128 ? 58 : 42;
      var decisionPct = Math.min(98, Math.max(45, Math.round((score / Math.max(1, moves * 12)) * 80)));
      var resiliencePct = isOver ? 72 : 90;

      onFinish({
        icon: cert.icon,
        name: cert.name,
        tag: '最高合成 ' + maxTile + ' · 终局得分 ' + score + ' 分',
        text: cert.text + ' 本局历经 ' + moves + ' 步推演与 ' + merges + ' 次合体，无论顺境还是逆风，你在方寸之间的运筹帷幄都令人叹服。',
        big: { label: '最高合成数字', value: maxTile + ' <small>分 ' + score + '</small>' },
        bars: [
          { label: '空间掌控力', pct: planningPct, hi: true },
          { label: '决策果断度', pct: decisionPct },
          { label: '逆境容错率', pct: resiliencePct }
        ],
        blocks: [
          { h: '本局段位', cert: '【' + cert.name + '】' },
          { h: '对局复盘', text: '本局总步数 ' + moves + ' 步，合成总分 ' + score + ' 分，历史最佳分 ' + bestScore + ' 分。' + (myRank ? '本局在离线战绩榜上排名第 ' + myRank + '。' : '') },
          { h: '战略建议', text: '2048 的底层法则永远是“守住一个角落，大小有序排列”。现实亦如此，守好自己的基本盘，步步为营方能化险为夷。' }
        ],
        quip: window.SM_DATA['game-2048'].disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, maxTile: maxTile, score: score, moves: moves }
      });
    }

    function renderUI() {
      var boardCellsHTML = '';
      for (var i = 0; i < 16; i++) {
        var v = board[i];
        if (v === 0) {
          boardCellsHTML += '<div class="g2048-cell empty"></div>';
        } else {
          var cls = 'g2048-tile t' + (v <= 2048 ? v : 'super');
          boardCellsHTML += '<div class="g2048-cell"><div class="' + cls + '"><span class="g2048-num">' + v + '</span></div></div>';
        }
      }

      var overOverlayHTML = isOver ? (
        '<div class="g2048-overlay">' +
        '<div class="g2048-ov-title">无路可走 · 棋逢对手</div>' +
        '<div class="g2048-ov-sub">最高合成 <b>' + maxTile + '</b> · 本局得分 ' + score + '</div>' +
        '<div class="g2048-ov-btns">' +
        '<button class="g2048-btn accent" id="btn2048Cert">📜 查看说明书认证判词</button>' +
        '<button class="g2048-btn" id="btn2048Restart">🔄 再战一局</button>' +
        '</div></div>'
      ) : '';

      el.innerHTML =
        '<div class="g2048-container">' +
        '<div class="g2048-hud">' +
        '<div class="g2048-score-card">' +
        '<div class="g2048-sc-lbl">得分 SCORE</div>' +
        '<div class="g2048-sc-val">' + score + '</div>' +
        '</div>' +
        '<div class="g2048-score-card">' +
        '<div class="g2048-sc-lbl">最高分 BEST</div>' +
        '<div class="g2048-sc-val">' + bestScore + '</div>' +
        '</div>' +
        '<div class="g2048-score-card highlight">' +
        '<div class="g2048-sc-lbl">最高 MAX</div>' +
        '<div class="g2048-sc-val">' + maxTile + '</div>' +
        '</div>' +
        '</div>' +

        '<div class="g2048-tools">' +
        '<button class="g2048-tool-btn" id="btn2048Undo" ' + (undosLeft <= 0 || !history.length ? 'disabled' : '') + '>↩ 撤销 (' + undosLeft + ')</button>' +
        '<button class="g2048-tool-btn" id="btn2048Reset">🔄 重来</button>' +
        '<button class="g2048-tool-btn finish" id="btn2048Finish">📜 结算判词</button>' +
        '</div>' +

        '<div class="g2048-board-wrap" id="g2048Board">' +
        '<div class="g2048-grid">' + boardCellsHTML + '</div>' +
        overOverlayHTML +
        '</div>' +

        '<div class="g2048-controls">' +
        '<div class="g2048-dpad">' +
        '<button class="g2048-pad-btn up" data-dir="up" aria-label="向上">▲</button>' +
        '<div class="g2048-pad-mid">' +
        '<button class="g2048-pad-btn left" data-dir="left" aria-label="向左">◀</button>' +
        '<button class="g2048-pad-btn down" data-dir="down" aria-label="向下">▼</button>' +
        '<button class="g2048-pad-btn right" data-dir="right" aria-label="向右">▶</button>' +
        '</div>' +
        '</div>' +
        '<div class="g2048-hint">支持屏幕滑动、方向键 ↑ ↓ ← → 或轻点上方方向键</div>' +
        '</div>' +
        '</div>';

      // 排行榜移出 .stage（深色游戏壳），作为兄弟节点放进
      // .sm-game-layout 这个双栏 wrapper：桌面并排，窄屏堆叠。
      // 两套视觉体系——深色棋盘区 / 浅色战绩区。
      var layout = root.querySelector('.sm-game-layout');
      if (!layout) {
        layout = document.createElement('div');
        layout.className = 'sm-game-layout';
        root.appendChild(layout);
      }
      if (el.parentNode !== layout) layout.appendChild(el);
      var lbHost = layout.querySelector('.lb-host');
      if (!lbHost) {
        lbHost = document.createElement('div');
        lbHost.className = 'lb-host';
        layout.appendChild(lbHost);
      }
      if (lbPanel) lbPanel.mount(lbHost);

      // 绑定按钮事件
      var undoBtn = el.querySelector('#btn2048Undo');
      if (undoBtn) undoBtn.onclick = undo;
      var resetBtn = el.querySelector('#btn2048Reset');
      if (resetBtn) resetBtn.onclick = resetGame;
      var finishBtn = el.querySelector('#btn2048Finish');
      if (finishBtn) finishBtn.onclick = finish;

      var certBtn = el.querySelector('#btn2048Cert');
      if (certBtn) certBtn.onclick = finish;
      var restartBtn = el.querySelector('#btn2048Restart');
      if (restartBtn) restartBtn.onclick = resetGame;

      // D-Pad 按键
      el.querySelectorAll('.g2048-pad-btn').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          move(btn.dataset.dir);
        };
      });

      bindTouch();
    }

    // 触摸滑动
    var touchStartX = 0, touchStartY = 0;
    function bindTouch() {
      var boardEl = el.querySelector('#g2048Board');
      if (!boardEl) return;

      boardEl.addEventListener('touchstart', function (e) {
        if (!e.touches.length) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      boardEl.addEventListener('touchmove', function (e) {
        // 防止滑动棋盘时意外触发整个页面上下晃动
        if (e.cancelable) e.preventDefault();
      }, { passive: false });

      boardEl.addEventListener('touchend', function (e) {
        if (!e.changedTouches.length) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        var absX = Math.abs(dx);
        var absY = Math.abs(dy);

        if (Math.max(absX, absY) > 28) {
          if (absX > absY) {
            move(dx > 0 ? 'right' : 'left');
          } else {
            move(dy > 0 ? 'down' : 'up');
          }
        }
      }, { passive: true });
    }

    // 键盘监听
    function onKeyDown(e) {
      if (destroyed || isOver) return;
      var key = e.key;
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault(); move('up');
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault(); move('down');
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        e.preventDefault(); move('left');
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        e.preventDefault(); move('right');
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // 启动初始棋盘
    spawnTile();
    spawnTile();
    checkMax();
    renderUI();

    return {
      // 2048 没有计时器，切走不需要做什么；实例保留，切回来重绘即可
      pause: function () {},
      // 切走再回来只重绘，棋盘/得分/撤销次数全部保留
      repaint: function () {
        if (destroyed) return;
        renderUI();
      },
      destroy: function () {
        destroyed = true;
        clearTimers();
        window.removeEventListener('keydown', onKeyDown);
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 08 雷区排险 (MINESWEEPER)
   * ================================================================== */
  window.startMinesweeper = function (root, onFinish) {
    var el = makeRoot(root);
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    /* 三档难度。三档各有一个独立榜单，排名就是通关用时（秒），
       所以这里不再需要跨难度折算的权重。 */
    var LEVELS = {
      easy:   { key: 'easy',   name: '初级', cols: 9,  rows: 9,  mines: 10 },
      medium: { key: 'medium', name: '中级', cols: 16, rows: 16, mines: 40 },
      hard:   { key: 'hard',   name: '高级', cols: 30, rows: 16, mines: 99 }
    };
    var level = LEVELS.easy;

    var cells = [];       // { mine, open, flag, near }
    var started = false;  // 第一次点击后才布雷，保证首击必空
    var over = false;
    var won = false;
    var flags = 0;
    var openedCount = 0;
    var t0 = 0;
    var elapsed = 0;
    var timerId = 0;
    var longPressId = 0;
    var sized = false;      // 首帧宽度确定后是否已重排过
    var onResize = null;

    /* ---------------- 排行榜 ----------------
       三档难度各排各的：跨难度比时间没有意义，初级 30 秒和
       高级 300 秒不是同一种成绩。榜单跟着当前难度切换（setGame）。
       本机战绩按难度分文件存，切档时不会看到别的档的成绩。 */
    function storeKeyFor(lv) { return 'sm_minesweeper_runs_' + lv; }

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'mine_easy',
      storeKey: storeKeyFor('easy'),
      higher: false,
      idPrefix: 'lbmine',
      formatScore: function (v) { return v + ' 秒'; },
      describe: function (run) {
        return { score: run.sec, extra: { sec: run.sec, lv: run.lv } };
      },
      localCols: function (r) {
        // 从旧版合并榜迁移过来的记录没有 mines 字段，按难度补上
        var mines = r.mines || (LEVELS[r.lv] ? LEVELS[r.lv].mines : 0);
        return [
          '<span class="lb-score">' + (r.sec || 0) + '<small> 秒</small></span>',
          '<span class="lb-meta">' + mines + ' 雷</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + ((r.extra && r.extra.sec) || 0) + '<small> 秒</small></span>'
        ];
      }
    }) : null;

    // 难度切换时同步榜单归属与本机战绩文件
    function syncLbLevel() {
      if (!lbPanel) return;
      lbPanel.setGame('mine_' + level.key, storeKeyFor(level.key));
    }

    function levelName(key) {
      for (var k in LEVELS) {
        if (LEVELS.hasOwnProperty(k) && LEVELS[k].key === key) return LEVELS[k].name;
      }
      return '初级';
    }

    function mountLbHost() {
      if (!lbPanel) return;
      var layout = root.querySelector('.sm-game-layout');
      if (!layout) {
        layout = document.createElement('div');
        layout.className = 'sm-game-layout';
        root.appendChild(layout);
      }
      if (el.parentNode !== layout) layout.appendChild(el);
      var host = layout.querySelector('.lb-host');
      if (!host) {
        host = document.createElement('div');
        host.className = 'lb-host';
        layout.appendChild(host);
      }
      lbPanel.mount(host);
    }

    /* ---------------- 棋盘 ---------------- */

    function idx(x, y) { return y * level.cols + x; }

    function neighbors(i) {
      var x = i % level.cols, y = Math.floor(i / level.cols);
      var out = [];
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) continue;
          out.push(idx(nx, ny));
        }
      }
      return out;
    }

    function reset(newLevel) {
      if (newLevel) level = LEVELS[newLevel];
      cells = [];
      for (var i = 0; i < level.cols * level.rows; i++) {
        cells.push({ mine: false, open: false, flag: false, near: 0 });
      }
      started = false; over = false; won = false;
      flags = 0; openedCount = 0; elapsed = 0;
      if (timerId) { clearInterval(timerId); timerId = 0; }
      // 上一局结算时排了个延时 finish()，重开必须掐掉。
      // 否则它会在新一局中途弹结算，还会把新实例 destroy 掉。
      clearTimers();
    }

    // 首击之后才布雷：第一下点到的格子及其周围八格都不放雷，
    // 保证开局不会一上来就踩雷，也让第一次点击能翻开一片。
    function placeMines(safeIdx) {
      var safe = {};
      safe[safeIdx] = true;
      neighbors(safeIdx).forEach(function (n) { safe[n] = true; });

      var pool = [];
      for (var i = 0; i < cells.length; i++) if (!safe[i]) pool.push(i);
      shuffle(pool);
      for (var m = 0; m < level.mines && m < pool.length; m++) cells[pool[m]].mine = true;

      for (var j = 0; j < cells.length; j++) {
        if (cells[j].mine) continue;
        var cnt = 0;
        neighbors(j).forEach(function (n) { if (cells[n].mine) cnt++; });
        cells[j].near = cnt;
      }
    }

    function startTimer() {
      if (timerId) return;
      t0 = performance.now() - elapsed * 1000;
      timerId = setInterval(function () {
        if (destroyed || over) return;
        elapsed = Math.floor((performance.now() - t0) / 1000);
        var t = el.querySelector('#msTime');
        if (t) t.textContent = elapsed;
      }, 250);
    }

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = 0; }
      if (started) elapsed = Math.floor((performance.now() - t0) / 1000);
    }

    /* 翻开一格；遇到 0 自动扩散。用栈而不是递归，高级棋盘也不会爆栈。 */
    function reveal(start) {
      var stack = [start];
      while (stack.length) {
        var i = stack.pop();
        var c = cells[i];
        if (!c || c.open || c.flag) continue;
        c.open = true;
        openedCount++;
        if (c.mine) { over = true; won = false; return; }
        if (c.near === 0) neighbors(i).forEach(function (n) {
          if (!cells[n].open && !cells[n].flag) stack.push(n);
        });
      }
    }

    function checkWin() {
      if (openedCount === cells.length - level.mines) {
        over = true; won = true;
      }
    }

    /* ---------------- 交互 ---------------- */

    function onOpen(i) {
      if (over || destroyed) return;
      var c = cells[i];
      if (!c || c.flag || c.open) return;

      if (!started) {
        started = true;
        placeMines(i);
        startTimer();
      }
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      reveal(i);
      // reveal() 踩到雷时已经把 over 置位了，这时不能再判胜：
      // 最后一格恰好是雷的话，会被误判成通关。
      if (!over) checkWin();
      paint();
      if (over) settle();
    }

    function onFlag(i) {
      if (over || destroyed) return;
      var c = cells[i];
      if (!c || c.open) return;
      c.flag = !c.flag;
      flags += c.flag ? 1 : -1;
      if (window.SFX && window.SFX.tick) window.SFX.tick();
      paint();
    }

    function settle() {
      stopTimer();
      if (won && window.SFX && window.SFX.win) window.SFX.win();
      else if (window.SFX && window.SFX.wrong) window.SFX.wrong();

      if (won) {
        // 用时下限 1 秒：服务端也是这个下限，否则秒通关会被判成不合法成绩
        var sec = Math.max(1, elapsed);
        if (lbPanel) {
          lbPanel.submit({
            sec: sec, lv: level.key,
            mines: level.mines, rows: level.rows, cols: level.cols
          });
        }
      }
      paint();

      // 给玩家看一眼完整的雷区再结算
      later(function () {
        if (!destroyed) finish();
      }, won ? 900 : 1400);
    }

    /* ---------------- 结算 ---------------- */

    function finish() {
      var certs = window.SM_DATA.minesweeper.certs;
      var cert = certs[certs.length - 1];
      if (won) {
        // 只有通关才可能拿到「谨慎工兵」以上
        for (var i = 0; i < certs.length; i++) {
          // 精确匹配：certs 是 min 降序排列，用 >= 会在第一次迭代
          // 就命中最高档，初级通关也会拿到高级证书。
          if (level.key === 'hard' && certs[i].min === 3) { cert = certs[i]; break; }
          if (level.key === 'medium' && certs[i].min === 2) { cert = certs[i]; break; }
          if (level.key === 'easy' && certs[i].min === 1) { cert = certs[i]; break; }
        }
      }

      var cleared = 0;
      for (var j = 0; j < cells.length; j++) if (cells[j].open && !cells[j].mine) cleared++;
      var progress = Math.round(cleared / Math.max(1, cells.length - level.mines) * 100);

      onFinish({
        icon: cert.icon,
        name: cert.name,
        tag: won
          ? level.name + ' · ' + level.cols + '×' + level.rows + ' · ' + elapsed + ' 秒通关'
          : level.name + ' · 踩雷阵亡 · 翻开 ' + progress + '%',
        text: cert.text,
        big: {
          label: won ? '通关用时' : '排雷进度',
          value: won ? (elapsed + ' <small>秒</small>') : (progress + ' <small>%</small>')
        },
        bars: [
          { label: '排雷进度', pct: progress, hi: true },
          { label: '旗帜准确率', pct: flags ? Math.min(100, Math.round(level.mines / Math.max(flags, level.mines) * 100)) : 0 }
        ],
        blocks: [
          { h: '本局战报', text: '难度 ' + level.name + '（' + level.cols + '×' + level.rows + '，' + level.mines + ' 雷），翻开 ' + cleared + ' 格，插旗 ' + flags + ' 面，用时 ' + elapsed + ' 秒。' },
          { h: '风险提示', text: '扫雷的核心从来不是运气，而是把「确定」和「猜测」分开：能推导的先推完，剩下的才交给概率。' }
        ],
        quip: window.SM_DATA.minesweeper.disclaimer,
        cert: cert.name + ' · 认证',
        detail: {
          type: cert.name, won: won, level: level.key,
          sec: elapsed, cleared: cleared, mines: level.mines
        }
      });
    }

    /* ---------------- 渲染 ---------------- */

    function numClass(n) {
      return 'n' + Math.min(n, 8);
    }

    /* 格子尺寸跟着可用空间走：初级 9 列本来就该铺满，
       以前写死 24px，桌面上只剩巴掌大一块。

       宽和高都要算：只按宽度算，2560 屏上高级 30×16 会撑到 940px 高，
       直接溢出视口还得滚动。取两者较小值，棋盘才能整块落在可视区内。
       上下限保证高级不会挤成一团、初级也不会大到离谱。 */
    function cellSize() {
      // 用 el 的宽度而不是 .ms-board-wrap：paint() 每次重建 DOM，
      // 旧 wrap 可能已经不在文档里，clientWidth 会读到 0。
      // clientWidth 含 padding，.stage 左右各 16px 要扣掉
      var style = window.getComputedStyle(el);
      var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      // 左列是 minmax(0,1fr)，宽度由容器决定、不依赖棋盘；
      // .stage 是 max-content，读它会形成收缩循环。所以读左列。
      var availW = 0;
      var layoutEl = el.closest('.sm-game-layout');
      if (layoutEl) {
        var cols = window.getComputedStyle(layoutEl).gridTemplateColumns.split(' ')
          .map(parseFloat).filter(function (v) { return !isNaN(v); });
        if (cols.length) availW = cols[0] - padX;
      }
      if (availW <= 0) availW = (el.parentNode && el.parentNode.clientWidth) || 0;
      if (availW <= 0) return 24;        // 还没进 DOM，用默认值，下一帧会重算

      var gap = 2, pad = 6 * 2;          // .ms-grid 自身内边距
      var byW = Math.floor((availW - pad - gap * (level.cols - 1)) / level.cols);
      var size = byW;

      // 只有「榜单在右侧」的双栏布局才需要限制棋盘高度：
      // 那种布局下棋盘必须和榜单挤在同一屏里，太高就得整页滚动。
      // 单栏（窄屏 / 手机）时榜单本来就在棋盘下方，页面注定要滚动，
      // 再按高度压格子只会把棋盘缩得更小，反而更糟。
      var layout = el.closest('.sm-game-layout');
      var twoCol = layout && window.getComputedStyle(layout).gridTemplateColumns.indexOf(' ') > 0;
      if (twoCol) {
        // 不能用 .app-module 的 clientHeight：棋盘变高会把它撑高，
        // 高度约束永远不触发（反馈循环）。改用视口高度。
        // 预留 250px：顶栏 + 章节标题 + HUD + 难度条 + 棋盘下提示行 + 底部留白。
        // 之前按 190 算，中级 16 行会超出视口底部被截断。
        var viewH = window.innerHeight || 900;
        var byH = Math.floor((viewH - 240 - pad - gap * (level.rows - 1)) / level.rows);
        if (byH > 0) size = Math.min(size, byH);
      }

      // 上限 72px：再大棋盘会撑出视口，初级 9 行就会超过一屏高度。
      return Math.max(16, Math.min(72, size));
    }

    function boardHTML() {
      var cs = cellSize();
      var html = '<div class="ms-grid" id="msGrid" style="grid-template-columns:repeat(' + level.cols + ',' + cs + 'px);gap:2px;padding:6px">';
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var cls = 'ms-cell';
        var inner = '';
        if (c.open) {
          cls += ' open';
          if (c.mine) { cls += ' boom'; inner = '💥'; }
          else if (c.near > 0) { cls += ' ' + numClass(c.near); inner = String(c.near); }
        } else if (c.flag) {
          cls += ' flag';
          inner = '🚩';
        }
        // 输了以后把没插旗的雷也亮出来，方便复盘
        if (over && !won && !c.open && c.mine && !c.flag) {
          cls += ' open mine';
          inner = '💣';
        }
        html += '<button type="button" class="' + cls + '" data-i="' + i + '"' +
          ' style="width:' + cs + 'px;height:' + cs + 'px;font-size:' + Math.round(cs * 0.55) + 'px">' +
          inner + '</button>';
      }
      return html + '</div>';
    }

    function paint() {
      var left = level.mines - flags;
      el.innerHTML = hud(
        '<b>雷区排险 · ' + level.name + '</b>',
        '<span class="ms-stat">💣 ' + left + '</span> <span class="ms-stat">⏱ <span id="msTime">' + elapsed + '</span>s</span>'
      ) +
        '<div class="ms-toolbar">' +
        '<div class="ms-levels">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (level.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '</button>';
        }).join('') +
        '</div>' +
        '<button type="button" class="ms-reset" id="msReset">↻ 重开</button>' +
        '</div>' +
        '<div class="ms-board-wrap">' + boardHTML() + '</div>' +
        '<div class="rz-sub" style="margin-top:10px">左键翻开 · 右键或长按插旗</div>';

      bindBoard();

      // 首次 paint 时 .ms-board-wrap 刚进 DOM，clientWidth 可能还是 0，
      // 上面算出来的是默认值。等一帧后宽度确定了再排一次。
      if (!sized) {
        sized = true;
        requestAnimationFrame(function () {
          if (!destroyed && el.querySelector('.ms-board-wrap')) paint();
        });
      }

    }

    function bindBoard() {
      var grid = el.querySelector('#msGrid');
      if (!grid) return;

      grid.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      grid.querySelectorAll('.ms-cell').forEach(function (btn) {
        var i = parseInt(btn.getAttribute('data-i'), 10);

        btn.addEventListener('click', function () { onOpen(i); });

        btn.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          onFlag(i);
        });

        // 移动端没有右键：按住 380ms 插旗
        btn.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse') return;
          longPressId = setTimeout(function () {
            longPressId = 0;
            onFlag(i);
            btn.dataset.longPressed = '1';
          }, 380);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
          btn.addEventListener(evt, function () {
            if (longPressId) { clearTimeout(longPressId); longPressId = 0; }
          });
        });
        btn.addEventListener('click', function (e) {
          // 长按已经插过旗了，别再当成一次翻开
          if (btn.dataset.longPressed) {
            delete btn.dataset.longPressed;
            e.stopPropagation();
          }
        }, true);
      });

      var resetBtn = el.querySelector('#msReset');
      if (resetBtn) resetBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        reset(level.key);
        paint();
      };

      el.querySelectorAll('[data-lv]').forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-lv');
          if (k === level.key && !over && !started) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          reset(k);
          syncLbLevel();     // 换难度 = 换榜单，否则会看到另一档的成绩
          paint();
        };
      });
    }

    /* 老版本把三档混存在 sm_minesweeper_runs 里。
       分榜后按 lv 拆到各自的文件，拆完删掉旧键，避免重复迁移。 */
    function migrateLocal() {
      var OLD = 'sm_minesweeper_runs';
      var raw = null;
      try { raw = localStorage.getItem(OLD); } catch (e) { return; }
      if (!raw) return;
      var list = [];
      try { list = JSON.parse(raw) || []; } catch (e) { list = []; }
      if (Array.isArray(list)) {
        list.forEach(function (r) {
          if (!r || !r.lv || ['easy', 'medium', 'hard'].indexOf(r.lv) < 0) return;
          var key = storeKeyFor(r.lv);
          var bucket = [];
          try { bucket = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) { bucket = []; }
          bucket.push(r);
          try { localStorage.setItem(key, JSON.stringify(bucket.slice(0, 12))); } catch (e) {}
        });
      }
      try { localStorage.removeItem(OLD); } catch (e) {}
    }

    /* ---------------- 启动 ---------------- */

    migrateLocal();
    reset('easy');
    syncLbLevel();
    paint();
    mountLbHost();

    // 窗口变宽变窄时重排棋盘（侧栏折叠、旋转屏幕都会触发）
    onResize = function () {
      if (destroyed) return;
      if (!el.querySelector('.ms-board-wrap')) return;
      paint();
    };
    window.addEventListener('resize', onResize);

    return {
      // 离开模块：停表但保留棋盘与已翻开状态
      pause: function () {
        if (destroyed || over) return;
        stopTimer();
      },
      // 回到模块：恢复计时并重绘
      repaint: function () {
        if (destroyed) return;
        if (started && !over) startTimer();
        paint();
      },
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
        if (timerId) { clearInterval(timerId); timerId = 0; }
        if (longPressId) { clearTimeout(longPressId); longPressId = 0; }
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 09 舒尔特方格 (Schulte Table)
   * 乱序网格里按 1..N 顺序点击，全部点完计时结束。
   * 网格样式复用扫雷那套 .ms-grid / .ms-cell。
   * ================================================================== */
  window.startSchulte = function (root, onFinish) {
    var el = makeRoot(root);
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    /* 三档难度。排名就是总用时（秒），越小越好。
       格子数越多越难，所以三档各排各的榜。 */
    var LEVELS = {
      easy:   { key: 'easy',   name: '初级', n: 5, weight: 0 },
      medium: { key: 'medium', name: '中级', n: 6, weight: 180 },
      hard:   { key: 'hard',   name: '高级', n: 7, weight: 420 }
    };
    var level = LEVELS.easy;

    var order = [];       // 每个格子里放哪个数字
    var next = 1;         // 下一个该点的数字
    var errors = 0;       // 点错次数
    var started = false;
    var over = false;
    var t0 = 0;
    var elapsed = 0;
    var timerId = 0;
    var sized = false;
    var onResize = null;
    var flashTimer = 0;

    function storeKeyFor(lv) { return 'sm_schulte_runs_' + lv; }

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'schulte_easy',
      storeKey: storeKeyFor('easy'),
      higher: false,
      idPrefix: 'lbsch',
      formatScore: function (v) { return v + ' 秒'; },
      describe: function (run) {
        return { score: run.sec, extra: { sec: run.sec, lv: run.lv, err: run.err } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.sec || 0) + '<small> 秒</small></span>',
          '<span class="lb-tile">' + levelName(r.lv) + '</span>',
          '<span class="lb-meta">' + (r.err || 0) + ' 次错</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + ((r.extra && r.extra.sec) || 0) + '<small> 秒</small></span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.err) || 0) + ' 错</span>'
        ];
      }
    }) : null;

    function levelName(key) {
      for (var k in LEVELS) {
        if (LEVELS.hasOwnProperty(k) && LEVELS[k].key === key) return LEVELS[k].name;
      }
      return '初级';
    }

    function syncLbLevel() {
      if (!lbPanel) return;
      lbPanel.setGame('schulte_' + level.key, storeKeyFor(level.key));
    }

    function mountLbHost() {
      if (!lbPanel) return;
      var layout = root.querySelector('.sm-game-layout');
      if (!layout) {
        layout = document.createElement('div');
        layout.className = 'sm-game-layout';
        root.appendChild(layout);
      }
      if (el.parentNode !== layout) layout.appendChild(el);
      var host = layout.querySelector('.lb-host');
      if (!host) {
        host = document.createElement('div');
        host.className = 'lb-host';
        layout.appendChild(host);
      }
      lbPanel.mount(host);
    }

    /* ---------------- 棋盘 ---------------- */

    function reset(newLevel) {
      if (newLevel) level = LEVELS[newLevel];
      var total = level.n * level.n;
      order = [];
      for (var i = 1; i <= total; i++) order.push(i);
      shuffle(order);
      next = 1;
      errors = 0;
      started = false;
      over = false;
      elapsed = 0;
      if (timerId) { clearInterval(timerId); timerId = 0; }
      if (flashTimer) { clearTimeout(flashTimer); flashTimer = 0; }
      clearTimers();
    }

    function startTimer() {
      if (timerId) return;
      t0 = performance.now() - elapsed * 1000;
      timerId = setInterval(function () {
        if (destroyed || over) return;
        elapsed = Math.floor((performance.now() - t0) / 1000);
        var t = el.querySelector('#schTime');
        if (t) t.textContent = elapsed;
      }, 250);
    }

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = 0; }
      if (started) elapsed = Math.floor((performance.now() - t0) / 1000);
    }

    /* 开始页：点「开始挑战」才生成数字并起计时。
       此前一进章节就直接铺好棋盘，玩家可以先盯着慢慢找，
       而计时又要等第一次点对才开始 —— 相当于开局白送思考时间。
       现在难度选择和开始按钮都在开始页，棋盘不出现在屏幕上。 */
    function intro() {
      clearTimers();
      if (timerId) { clearInterval(timerId); timerId = 0; }
      var n = level.n * level.n;
      el.innerHTML = hud('<b>舒尔特方格</b>', level.name + ' · ' + level.n + '×' + level.n) +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">按顺序找出 1 到 ' + n + '</div>' +
        '<div class="rz-sub">点「开始挑战」后棋盘才会出现，计时同时开始。<br>' +
        '点错只记录次数、不中断计时。三档难度各排各的榜。</div>' +
        '<div class="ms-levels" style="margin-top:22px;justify-content:center">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (level.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '</button>';
        }).join('') +
        '</div>' +
        '<button class="btn accent" id="schgo" style="margin-top:22px;width:auto;padding:12px 38px">开始挑战</button>' +
        '</div>';
      el.querySelectorAll('[data-lv]').forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-lv');
          if (k === level.key) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          level = LEVELS[k];
          syncLbLevel();     // 换难度 = 换榜单
          intro();
        };
      });
      var btn = el.querySelector('#schgo');
      if (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          reset(level.key);
          started = true;
          startTimer();      // 计时与棋盘同时开始
          paint();
        };
      }

    }

    function onPick(idx) {
      if (over || destroyed) return;
      if (order[idx] !== next) {
        // 点错不中断，只记一次并闪一下红
        errors++;
        var bad = el.querySelector('#schGrid .ms-cell[data-i="' + idx + '"]');
        if (bad) {
          bad.classList.add('sch-wrong');
          if (flashTimer) clearTimeout(flashTimer);
          flashTimer = later(function () {
            var b = el.querySelector('#schGrid .ms-cell[data-i="' + idx + '"]');
            if (b) b.classList.remove('sch-wrong');
            flashTimer = 0;
          }, 260);
        }
        if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        return;
      }

      if (window.SFX && window.SFX.tap) window.SFX.tap();

      var btn = el.querySelector('#schGrid .ms-cell[data-i="' + idx + '"]');
      if (btn) btn.classList.add('open');

      next++;
      var total = level.n * level.n;
      if (next > total) {
        over = true;
        stopTimer();
        if (window.SFX && window.SFX.win) window.SFX.win();
        settle();
      }
    }

    function settle() {
      if (lbPanel) {
        // 用时下限 1 秒，和服务端一致
        lbPanel.submit({
          sec: Math.max(1, elapsed),
          lv: level.key,
          err: errors
        });
      }
      later(finish, 700);
    }

    /* ---------------- 结算 ---------------- */

    function finish() {
      var certs = window.SM_DATA.schulte.certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        // 精确匹配：certs 是 min 降序排列，用 >= 会在第一次迭代
        // 就命中最高档，初级通关也会拿到高级证书。
        if (level.key === 'hard' && certs[i].min === 3) { cert = certs[i]; break; }
        if (level.key === 'medium' && certs[i].min === 2) { cert = certs[i]; break; }
        if (level.key === 'easy' && certs[i].min === 1) { cert = certs[i]; break; }
      }

      var total = level.n * level.n;
      // 正确率：点错不扣分，但会影响这条
      var acc = Math.round(total / Math.max(total, total + errors) * 100);
      // 平均每格用时
      var per = elapsed > 0 ? (elapsed / total).toFixed(2) : '0.00';

      onFinish({
        icon: cert.icon,
        name: cert.name,
        tag: level.name + ' · ' + level.n + '×' + level.n + ' · ' + elapsed + ' 秒',
        text: cert.text,
        big: { label: '总用时', value: elapsed + ' <small>秒</small>' },
        bars: [
          { label: '正确率', pct: acc, hi: true },
          { label: '平均每格', pct: Math.min(100, Math.round(Number(per) / 3 * 100)) }
        ],
        blocks: [
          { h: '本局战报', text: '难度 ' + level.name + '（' + level.n + '×' + level.n + '，' + total + ' 格），用时 ' + elapsed + ' 秒，点错 ' + errors + ' 次，平均每格 ' + per + ' 秒。' },
          { h: '怎么练', text: '舒尔特方格的关键是「视线不动、余光搜索」：把视线固定在中心，用余光去找下一个数字，而不是让眼球满屏扫。每天一次，两周后速度会明显提升。' }
        ],
        quip: window.SM_DATA.schulte.disclaimer,
        cert: cert.name + ' · 认证',
        detail: {
          type: cert.name, level: level.key, sec: elapsed,
          errors: errors, cells: total
        }
      });
    }

    /* ---------------- 渲染 ---------------- */

    /* 和扫雷同一套算法：按可用宽度算格子大小 */
    function cellSize() {
      var style = window.getComputedStyle(el);
      var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      var avail = (el.clientWidth || 0) - padX;
      if (avail <= 0) return 48;
      var gap = 2, pad = 6 * 2;
      var size = Math.floor((avail - pad - gap * (level.n - 1)) / level.n);
      // 舒尔特格子少，上限放宽到 96px，数字才看得清
      return Math.max(34, Math.min(96, size));
    }

    function boardHTML() {
      var cs = cellSize();
      var html = '<div class="ms-grid sch-grid" id="schGrid" style="grid-template-columns:repeat(' +
        level.n + ',' + cs + 'px);gap:2px;padding:6px">';
      for (var i = 0; i < order.length; i++) {
        html += '<button type="button" class="ms-cell sch-cell" data-i="' + i + '"' +
          ' style="width:' + cs + 'px;height:' + cs + 'px;font-size:' + Math.round(cs * 0.42) + 'px">' +
          order[i] + '</button>';
      }
      return html + '</div>';
    }

    function paint() {
      el.innerHTML = hud(
        '<b>舒尔特方格 · ' + level.name + '</b>',
        '<span class="ms-stat">✅ ' + (next - 1) + '/' + (level.n * level.n) + '</span> ' +
        '<span class="ms-stat">⏱ <span id="schTime">' + elapsed + '</span>s</span>'
      ) +
        '<div class="ms-toolbar">' +
        '<div class="ms-levels">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (level.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '</button>';
        }).join('') +
        '</div>' +
        '<button type="button" class="ms-reset" id="schReset">↻ 重开</button>' +
        '</div>' +
        '<div class="ms-board-wrap">' + boardHTML() + '</div>' +
        '<div class="rz-sub" style="margin-top:10px">按 1 到 ' + (level.n * level.n) + ' 的顺序依次点击</div>';

      bindBoard();

      if (!sized) {
        sized = true;
        requestAnimationFrame(function () {
          if (!destroyed && el.querySelector('.ms-board-wrap')) paint();
        });
      }

    }

    function bindBoard() {
      var grid = el.querySelector('#schGrid');
      if (!grid) return;

      grid.querySelectorAll('.ms-cell').forEach(function (btn) {
        var i = parseInt(btn.getAttribute('data-i'), 10);
        btn.addEventListener('click', function () { onPick(i); });
      });

      // 重开 = 回开始页：重新洗牌、重新计时，玩家点「开始挑战」才看到新棋盘
      var resetBtn = el.querySelector('#schReset');
      if (resetBtn) resetBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        reset(level.key);
        intro();
      };
    }

    /* ---------------- 启动 ---------------- */

    reset('easy');
    syncLbLevel();
    intro();          // 先停在开始页，点「开始挑战」才生成数字并计时
    mountLbHost();

    onResize = function () {
      if (destroyed) return;
      if (!el.querySelector('.ms-board-wrap')) return;
      paint();
    };
    window.addEventListener('resize', onResize);

    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
        if (timerId) { clearInterval(timerId); timerId = 0; }
        if (flashTimer) { clearTimeout(flashTimer); flashTimer = 0; }
        if (lbPanel) lbPanel.destroy();
      }
    };
  };
})();


;
/* === js/modules/manual.js === */
/* =========================================================
   模块 3：自我说明书 (Self Manual Module) 控制中枢
   10 章打工人说明书：4 个问答 + 人间清醒 + 5 个交互小游戏
   ========================================================= */

(function () {
  'use strict';

  var DATA = window.SM_DATA, ORDER = window.SM_ORDER;
  var root = null;
  function $(s) {
    if (root) {
      var el = root.querySelector(s);
      if (el) return el;
    }
    return document.querySelector(s);
  }
  function $$(s) {
    var list = root ? root.querySelectorAll(s) : document.querySelectorAll(s);
    return Array.prototype.slice.call(list);
  }

  var state = {
    mode: 'home',
    test: null,
    qIdx: 0,
    scores: {},
    answers: [],
    result: null,
    reportExtra: null,
    gameCtl: null,
    gameId: null
  };

  function store() {
    try { return JSON.parse(localStorage.getItem('sm_history_v1') || '{}'); }
    catch (e) { return {}; }
  }
  function saveStore(s) {
    try { localStorage.setItem('sm_history_v1', JSON.stringify(s)); } catch (e) {}
  }
  // 人间清醒（第 05 章）不出分数报告，存档在它自己的 key 里，
  // 所以「是否已测」要单独判定，否则目录永远少点亮一个点。
  function chapterDone(id, s) {
    if (id === 'lifeguide') {
      try {
        var audit = JSON.parse(localStorage.getItem('juice_lifeguide_audit_v1') || '[]');
        return !!(audit && audit.length);
      } catch (e) { return false; }
    }
    return !!(s[id] && s[id].length);
  }

  function pushHistory(testId, res) {
    var s = store();
    s[testId] = s[testId] || [];
    s[testId].push({ t: Date.now(), name: res.name, type: (res.detail && res.detail.type) || res.name });
    if (s[testId].length > 12) s[testId] = s[testId].slice(-12);
    saveStore(s);
  }

  function hexSoft(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function reportNo() {
    var d = new Date();
    var ymd = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    return 'SM-' + ymd + '-' + ('000' + Math.floor(Math.random() * 1000)).slice(-3);
  }

  function showScreen(id) {
    if (!root) root = document.getElementById('mod-manual');
    var screens = root ? root.querySelectorAll('.sm-screen') : document.querySelectorAll('#mod-manual .sm-screen');
    screens.forEach(function (s) { s.classList.remove('active'); });
    var sc = document.getElementById(id);
    if (sc) {
      sc.classList.add('active');
      if (root) root.scrollTop = 0;   // .app-module 带 overflow-y:auto，滚动容器就是它
    }
    syncRail();   // 所有跳转都经由这里，侧栏高亮不会漏
  }

  function renderHome() {
    state.mode = 'home';
    state.test = null;   // 回到目录时侧栏不该还高亮某一章
    // 扫雷 / 2048 的实例是暂停态，回目录不销毁——否则切回来进度就没了。
    // 只跳过销毁，侧栏渲染照常往下走。
    if (!(state.gameCtl && typeof state.gameCtl.pause === 'function')) {
      if (state.gameCtl && state.gameCtl.destroy) {
        state.gameCtl.destroy();
        state.gameCtl = null;
        state.gameId = null;
      }
    }
    var DATA = window.SM_DATA || {};
    var ORDER = window.SM_ORDER || ['social-battery', 'procrastination', 'slacking', 'night-owl', 'lifeguide', 'reaction', 'color', 'game-2048', 'minesweeper', 'schulte'];
    var s = store();
    var done = ORDER.filter(function (id) { return chapterDone(id, s); }).length;
    // 存档份数只统计答题/游戏章：人间清醒没有分数报告，计入会虚高
    var total = ORDER.reduce(function (n, id) {
      return n + (DATA[id] && DATA[id].mode === 'external' ? 0 : (s[id] ? s[id].length : 0));
    }, 0);

    var html = '';
    html += '<div class="home-head"><div class="brandmark">我</div><div>'
      + '<div class="home-title">自我说明书</div><div class="home-sub">SELF MANUAL · 十份关于你的出厂说明书</div></div></div>';
    html += '<div class="home-desc">你是哪种拖延病患者？社交电量还剩多少？反应能力几岁？2048能合出多大？还有一份人间清醒防坑指南。挑一章，把自己拆开看看。</div>';

    html += '<div class="stat-strip"><div style="display:flex;gap:5px">'
      + ORDER.map(function (id) {
        var t = DATA[id];
        var c = t ? t.color : '#38BDF8';
        var on = chapterDone(id, s);
        return '<span class="dot' + (on ? ' done' : '') + '" style="' + (on ? 'background:' + c : '') + '"></span>';
      }).join('')
      + '</div><div style="flex:1"></div><div>已测 <b>' + done + '</b>/' + ORDER.length + ' 章 · 存档 <b>' + total + '</b> 份</div></div>';

    html += '<div class="manual-grid">';
    ORDER.forEach(function (id, i) {
      var t = DATA[id];
      if (!t) return;
      var last = s[id] && s[id].length ? s[id][s[id].length - 1] : null;
      var chip = '';
      if (last) {
        var txt = last.type;
        chip = '<span style="font-size:11px;color:' + t.color + ';background:' + hexSoft(t.color, 0.12) + ';padding:2px 8px;border-radius:999px;font-weight:700;">' + txt + '</span>';
      }
      var iconSvg = (typeof window.icon === 'function') ? window.icon(t.icon) : '📖';
      html += '<div class="tile" data-test="' + id + '">'
        + '<span class="t-num">' + t.num + '</span>'
        + '<span class="t-ico" style="background:' + hexSoft(t.color, 0.1) + ';color:' + t.color + '">' + iconSvg + '</span>'
        + '<div class="t-info">'
        + '<div style="display:flex;align-items:center;gap:6px;"><span class="t-title">' + t.title + '</span>' + chip + '</div>'
        + '<div class="t-meta">' + t.tagline + '</div>'
        + '</div>'
        + '<span class="t-arrow">→</span>'
        + '</div>';
    });
    html += '</div>';

    var homeBodyEl = document.getElementById('sm-homebody');
    if (homeBodyEl) {
      homeBodyEl.innerHTML = html;
      homeBodyEl.querySelectorAll('.tile').forEach(function (c) {
        c.addEventListener('click', function () {
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          openTest(c.getAttribute('data-test'));
        });
      });
    }
  }

  function openTest(id, options) {
    options = options || {};
    var dataMap = window.SM_DATA || {};
    var t = dataMap[id];
    if (!t) return;
    if (!options.silent && window.AppRouter && typeof window.AppRouter.pushView === 'function') {
      if (t.mode === 'external') {
        window.AppRouter.pushView('lifeguide');
        return;
      }
      window.AppRouter.pushView(t.mode === 'interactive' ? 'game' : 'chapter', { testId: id });
    }
    state.test = t;
    if (t.mode === 'interactive') {
      openGame(t, options);
      return;
    }
    // 外部章节：正文由自己的模块渲染（目前只有第 05 章人间清醒）
    if (t.mode === 'external') {
      if (window.AppLifeguide && typeof window.AppLifeguide.open === 'function') {
        window.AppLifeguide.open({ fromRouter: !!options.silent });
      }
      return;
    }
    openCover(t, options);
  }

  function topbarHTML(t) {
    return '<div class="mt-topbar" style="margin-bottom:12px;"><button class="mt-iconbtn" id="sm-tback">←</button>'
      + '<div class="mt-pick-head" style="flex:1;margin-bottom:0"><b>第 ' + t.num + ' 章 · ' + t.title + '</b><p>' + t.en + '</p></div></div>';
  }

  function openCover(t, options) {
    options = options || {};
    state.mode = 'cover';
    var topEl = document.getElementById('sm-quiztop');
    if (topEl) {
      topEl.innerHTML = topbarHTML(t);
    }
    var icoHtml = (typeof window.icon === 'function') ? window.icon(t.icon) : '📖';
    var boltIco = (typeof window.icon === 'function') ? window.icon('bolt') : '⚡';
    var html = '<div class="fs-card" style="text-align:center;padding:28px 20px;">'
      + '<div style="width:72px;height:72px;border-radius:20px;margin:0 auto 14px;background:' + hexSoft(t.color, 0.12) + ';color:' + t.color + ';display:grid;place-items:center;font-size:36px;">' + icoHtml + '</div>'
      + '<h2 style="font-size:24px;margin-bottom:4px;">' + t.title + '</h2>'
      + '<div style="font-size:12px;color:var(--tx-dim);letter-spacing:2px;margin-bottom:16px;">' + t.en + '</div>'
      + '<div style="font-size:13.5px;color:var(--tx-dim);line-height:1.8;text-align:left;background:var(--card);padding:14px 16px;border-radius:var(--r-md);margin-bottom:20px;">'
      + (t.intro || []).map(function (p) { return '<p style="margin-bottom:6px;">' + p + '</p>'; }).join('')
      + '</div>'
      + '<button class="mt-btn" id="sm-startbtn" style="width:100%;">' + boltIco + ' 翻开这一章</button>'
      + '</div>';
    var bodyEl = document.getElementById('sm-quizbody');
    if (bodyEl) {
      bodyEl.innerHTML = html;
    }
    showScreen('scr-sm-quiz');
    var backBtn = topEl ? topEl.querySelector('.mt-iconbtn') : null;
    if (backBtn) {
      backBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () {
          renderHome();
          showScreen('scr-sm-home');
        });
        else {
          renderHome();
          showScreen('scr-sm-home');
        }
      };
    }
    var startBtn = document.getElementById('sm-startbtn');
    if (startBtn) {
      startBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startQuiz(t);
      };
    }
  }

  function startQuiz(t) {
    state.mode = 'quiz';
    state.qIdx = 0;
    state.scores = {};
    state.answers = [];
    renderQuestion(t);
  }

  function renderQuestion(t) {
    var q = t.questions[state.qIdx];
    var pct = (state.qIdx + 1) / t.questions.length * 100;
    var keys = ['A', 'B', 'C', 'D', 'E'];
    var html = '<div class="q-wrap">'
      + '<div class="q-head"><span>第 ' + (state.qIdx + 1) + ' / ' + t.questions.length + ' 题</span><span>' + t.title + '</span></div>'
      + '<div class="q-bar"><i style="width:' + pct + '%"></i></div>'
      + '<div class="q-box">'
      + '<h3>' + q.q + '</h3>'
      + '<div class="opts">';
    q.o.forEach(function (op, i) {
      html += '<button class="q-opt" data-i="' + i + '">'
        + '<span class="tag">' + keys[i] + '</span><span>' + op.t + '</span></button>';
    });
    html += '</div></div></div>';
    var bodyEl = document.getElementById('sm-quizbody');
    if (bodyEl) {
      bodyEl.innerHTML = html;
      bodyEl.querySelectorAll('.q-opt').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = parseInt(b.getAttribute('data-i'), 10);
          pickOption(t, i, b);
        });
      });
    }
  }

  function pickOption(t, i, btn) {
    btn.classList.add('sel');
    if (window.SFX && window.SFX.tap) window.SFX.tap();
    var op = t.questions[state.qIdx].o[i];
    (op.s || []).forEach(function (p) { state.scores[p[0]] = (state.scores[p[0]] || 0) + p[1]; });
    state.answers.push(i);
    setTimeout(function () {
      if (state.qIdx + 1 >= t.questions.length) {
        showComputing(t);
      } else {
        state.qIdx++;
        renderQuestion(t);
      }
    }, 280);
  }

  function showComputing(t) {
    var bodyEl = document.getElementById('sm-quizbody');
    if (bodyEl) {
      bodyEl.innerHTML = '<div style="text-align:center;padding:60px 20px;">'
        + window.sealHTML()
        + '<h3 style="margin-top:20px;font-size:20px;">正在质检盖章…</h3>'
        + '<p style="font-size:13px;color:var(--tx-dim);margin-top:8px;">盖上官方检验印章，马上出具说明书</p></div>';
    }
    setTimeout(function () {
      var res = t.compute.call(t, state.scores);
      showResult(t, res);
    }, 600);
  }

  function showResult(t, res) {
    if (state.gameCtl && state.gameCtl.destroy) {
      state.gameCtl.destroy();
      state.gameCtl = null;
      state.gameId = null;
    }
    state.mode = 'result';
    state.result = res;
    var extra = { no: reportNo(), t: Date.now() };
    pushHistory(t.id, res);

    if (window.UniversalHistory) {
      window.UniversalHistory.add({
        module: 'manual',
        title: `说明书 · ${t.title}：${res.name}`,
        subtitle: `${res.tag} · ${res.text ? res.text.slice(0, 40) + '…' : ''}`,
        color: t.color,
        badge: '📖 说明书',
        avatar: '📖',
        data: { test: t, res: res, extra: extra }
      });
    }

    var resultBody = document.getElementById('sm-resultbody');
    if (resultBody && window.renderReport) {
      window.renderReport(resultBody, t, res, extra);
    }
    showScreen('scr-sm-result');

    if (window.AppRouter && typeof window.AppRouter.replaceView === 'function') {
      window.AppRouter.replaceView('result', { testId: t.id, test: t, result: res, extra: extra });
    }

    var rback = document.getElementById('rback');
    if (rback) rback.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rhome = document.getElementById('rhome');
    if (rhome) rhome.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rretry = document.getElementById('rretry');
    if (rretry) rretry.onclick = function () { openTest(t.id); };
    var rsave = document.getElementById('rsave');
    if (rsave) rsave.onclick = function () {
      if (window.buildShareCard) {
        var card = window.buildShareCard(t, res, extra);
        var href = (typeof card === 'string') ? card : card.toDataURL('image/png');
        var a = document.createElement('a');
        a.download = `自我说明书_${t.title}_${res.name}.png`;
        a.href = href;
        a.click();
      }
    };
  }

  // 每个交互章节一个独立屏幕，按章节 id 映射过去。
  // 提到模块作用域：openGame 的「恢复进度」分支在函数前部就要用它。
  var GAME_SCREENS = {
    'reaction': { scr: 'scr-sm-reaction', top: 'sm-reacttop', body: 'sm-reactbody', start: 'startReaction' },
    'color': { scr: 'scr-sm-color', top: 'sm-colortop', body: 'sm-colorbody', start: 'startColor' },
    'game-2048': { scr: 'scr-sm-2048', top: 'sm-2048top', body: 'sm-2048body', start: 'startGame2048' },
    'minesweeper': { scr: 'scr-sm-mine', top: 'sm-minetop', body: 'sm-minebody', start: 'startMinesweeper' },
    'schulte': { scr: 'scr-sm-schulte', top: 'sm-schultetop', body: 'sm-schultebody', start: 'startSchulte' }
  };

  function openGame(t, options) {
    options = options || {};
    // 扫雷 / 2048：同一章节已有被暂停的实例时，直接恢复进度而不是重开一局。
    // 必须同时确认「实例就是这一章的」——state.gameCtl 可能是另一个
    // 支持进度的游戏留下的（比如 2048 的实例还没销毁就去点扫雷），
    // 只看 state.test 会拿 2048 的 el 渲染扫雷的屏幕，整块变空。
    if (!options.forceNew && state.gameCtl && state.gameId === t.id
        && typeof state.gameCtl.repaint === 'function') {
      state.mode = 'game';
      state.test = t;
      var gsSame = GAME_SCREENS[t.id] || GAME_SCREENS['game-2048'];
      var topElSame = document.getElementById(gsSame.top);
      if (topElSame) topElSame.innerHTML = topbarHTML(t);
      showScreen(gsSame.scr);
      state.gameCtl.repaint();
      return;
    }
    if (state.gameCtl && state.gameCtl.destroy) {
      state.gameCtl.destroy();
      state.gameCtl = null;
      state.gameId = null;
    }
    state.mode = 'game';
    var gs = GAME_SCREENS[t.id] || GAME_SCREENS['game-2048'];
    var scrId = gs.scr;
    var topId = gs.top;
    var bodyId = gs.body;

    var topEl = document.getElementById(topId);
    if (topEl) {
      topEl.innerHTML = topbarHTML(t);
    }
    showScreen(scrId);

    var backBtn = topEl ? topEl.querySelector('.mt-iconbtn') : null;
    if (backBtn) {
      backBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (state.gameCtl && state.gameCtl.destroy) {
          state.gameCtl.destroy();
          state.gameCtl = null;
        }
        if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
        else {
          renderHome();
          showScreen('scr-sm-home');
        }
      };
    }

    var startFn = window[gs.start];
    var bodyEl = document.getElementById(bodyId);
    if (startFn && bodyEl) {
      state.gameCtl = startFn(bodyEl, function (rawRes) {
        var res = (t.compute ? t.compute.call(t, rawRes) : rawRes) || rawRes;
        showResult(t, res);
      });
      // 记住这个实例是哪一章的，恢复进度时用来比对，
      // 避免拿 2048 的实例去渲染扫雷的屏幕
      state.gameId = t.id;
    }
  }

  function restore(data) {
    if (!data || !data.test || !data.res) return;
    state.mode = 'result';
    state.result = data.res;
    var resultBody = document.getElementById('sm-resultbody');
    if (resultBody && window.renderReport) {
      window.renderReport(resultBody, data.test, data.res, data.extra || { no: reportNo(), t: Date.now() });
    }
    showScreen('scr-sm-result');

    var rback = document.getElementById('rback');
    if (rback) rback.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rhome = document.getElementById('rhome');
    if (rhome) rhome.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rretry = document.getElementById('rretry');
    if (rretry) rretry.onclick = function () { openCover(data.test); };
    var rsave = document.getElementById('rsave');
    if (rsave) rsave.onclick = function () {
      if (window.buildShareCard) {
        var card = window.buildShareCard(data.test, data.res, data.extra);
        var href = (typeof card === 'string') ? card : card.toDataURL('image/png');
        var a = document.createElement('a');
        a.download = `自我说明书_${data.test.title}_${data.res.name}.png`;
        a.href = href;
        a.click();
      }
    };
  }

  /* ============ PC 常驻章节导航（侧栏） ============
     与首页 tile 共用 openTest()，避免两套入口行为漂移。
     仅桌面显示；窄屏由 CSS 隐藏，仍走原来的「← 返回」按钮。
     ------------------------------------------------ */
  var railBuilt = false;

  function buildRail() {
    if (railBuilt) return;
    var nav = document.getElementById('sm-rail-nav');
    if (!nav) return;
    var DATA = window.SM_DATA || {};
    var ORDER = window.SM_ORDER || [];
    var html = '';
    ORDER.forEach(function (id) {
      var t = DATA[id];
      if (!t) return;
      var iconSvg = (typeof window.icon === 'function') ? window.icon(t.icon) : '📖';
      html += '<button class="sm-rail-item" data-test="' + id + '">'
        + '<span class="sm-rail-num" style="color:' + t.color + '">' + t.num + '</span>'
        + '<span class="sm-rail-ico" style="background:' + hexSoft(t.color, 0.12) + ';color:' + t.color + '">' + iconSvg + '</span>'
        + '<span class="sm-rail-info"><b>' + t.title + '</b><i>' + t.tagline + '</i></span>'
        + '<span class="sm-rail-dot" data-dot="' + id + '"></span>'
        + '</button>';
    });
    nav.innerHTML = html;
    nav.querySelectorAll('.sm-rail-item').forEach(function (c) {
      c.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        openTest(c.getAttribute('data-test'));
      });
    });
    var homeBtn = document.getElementById('sm-rail-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
        else {
          renderHome();
          showScreen('scr-sm-home');
        }
      });
    }
    railBuilt = true;
  }

  // 高亮当前章 + 同步「已测/存档」计数
  function syncRail() {
    var nav = document.getElementById('sm-rail-nav');
    if (!nav) return;
    var DATA = window.SM_DATA || {};
    var ORDER = window.SM_ORDER || [];
    var s = store();
    var cur = state.test ? state.test.id : null;

    nav.querySelectorAll('.sm-rail-item').forEach(function (c) {
      var id = c.getAttribute('data-test');
      c.classList.toggle('active', !!cur && id === cur);
      var dot = c.querySelector('.sm-rail-dot');
      if (dot) dot.classList.toggle('done', chapterDone(id, s));
    });

    var sum = document.getElementById('sm-rail-sum');
    if (sum) {
      var done = ORDER.filter(function (id) { return chapterDone(id, s); }).length;
      var total = ORDER.reduce(function (n, id) {
        return n + (DATA[id] && DATA[id].mode === 'external' ? 0 : (s[id] ? s[id].length : 0));
      }, 0);
      sum.innerHTML = '已测 <b>' + done + '</b>/' + ORDER.length + ' 章 · 存档 <b>' + total + '</b> 份';
    }
  }

  function init() {
    root = document.getElementById('mod-manual');
    if (!root) return;
    buildRail();
    renderHome();
    showScreen('scr-sm-home');
    syncRail();
  }

  function stopActiveGame() {
    document.querySelectorAll('.floatmsg').forEach(function (n) {
      if (n && n.parentNode) n.remove();
    });
    // 扫雷 / 2048 支持保留进度：只暂停不销毁，实例留在 state.gameCtl 里，
    // 下次进入同一章节时走 resumeGame() 重绘恢复。其余游戏仍按原逻辑销毁。
    if (state.gameCtl && typeof state.gameCtl.pause === 'function') {
      state.gameCtl.pause();
      return;
    }
    if (state.gameCtl && state.gameCtl.destroy) {
      state.gameCtl.destroy();
      state.gameCtl = null;
      if (state.mode === 'game') {
        renderHome();
        showScreen('scr-sm-home');
      }
    }
  }

  // 切回说明书时，如果有一个被暂停的游戏实例，重绘恢复它
  function resumeGame() {
    if (state.gameCtl && typeof state.gameCtl.repaint === 'function') {
      state.gameCtl.repaint();
      return true;
    }
    return false;
  }

  window.AppManual = {
    init,
    renderHome,
    openTest,
    showScreen,
    restore,
    restoreView: function (view, payload) {
      payload = payload || {};
      if (view === 'lifeguide') {
        openTest('lifeguide', { silent: true });
        return;
      }
      if (view === 'chapter' || view === 'game') {
        var id = payload.testId || (payload.test && payload.test.id);
        // 有被暂停的实例（扫雷 / 2048）且正是同一章节时，直接恢复进度
        if (id && state.gameCtl && state.test && state.test.id === id && resumeGame()) {
          return;
        }
        if (id) openTest(id, { silent: true });
        else { renderHome(); showScreen('scr-sm-home'); }
        return;
      }
      if (view === 'result' && payload.test && payload.result) {
        restore({ test: payload.test, res: payload.result, extra: payload.extra });
        return;
      }
      renderHome();
      showScreen('scr-sm-home');
    },
    stopActiveGame,
    resumeGame
  };
})();

;
/* === js/modules/lifeguide.js === */
/* =========================================================
   自我说明书 · 第 05 章：人间清醒指南 (Evidence-Based Life Handbook)
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
    open({ fromRouter: true });
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

  /* 作为说明书的第 05 章打开：顶栏由说明书统一渲染，返回按钮回到目录。
     懒初始化，避免说明书一进来就把 36 条智库和体检网格全渲染一遍。 */
  let inited = false;

  function renderTopbar() {
    const top = document.getElementById('sm-lifeguide-top');
    if (!top) return;
    top.innerHTML = '<button class="mt-iconbtn" id="sm-lifeguide-back">←</button>'
      + '<div class="mt-pick-head" style="flex:1;margin-bottom:0">'
      + '<b>第 05 章 · 人间清醒指南</b><p>EVIDENCE-BASED LIFE HANDBOOK</p></div>';
    const back = top.querySelector('#sm-lifeguide-back');
    if (back) {
      back.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.AppRouter && typeof window.AppRouter.back === 'function') {
          window.AppRouter.back(() => {
            if (window.AppManual) {
              window.AppManual.renderHome();
              window.AppManual.showScreen('scr-sm-home');
            }
          });
        } else if (window.AppManual) {
          window.AppManual.renderHome();
          window.AppManual.showScreen('scr-sm-home');
        }
      };
    }
  }

  function open(options) {
    options = options || {};
    if (!inited) {
      inited = true;
      init();
    }
    renderTopbar();
    if (window.AppManual && typeof window.AppManual.showScreen === 'function') {
      window.AppManual.showScreen('scr-sm-lifeguide');
    }
    if (!options.fromRouter && window.AppRouter && typeof window.AppRouter.pushView === 'function') {
      window.AppRouter.pushView('lifeguide');
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
