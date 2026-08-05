/* 罗盘 · 九宫飞星解读工具 —— 本地数据
 * 二十四山、九星、山向组合解读、三元龙、流年紫白。
 * 数据与算法为传统风水术数常见公开知识整理，供参考交流，不构成任何决策建议。
 */
(function () {
  "use strict";

  // ---- 二十四山（按顺时针从正北 0° 起）----
  // palace: 后天八卦宫；element: 五行；type: 阳干/阴干/地支/四维
  // yuan: 三元龙（天/人/地）；yinyang: 三元龙之阴阳（飞星顺逆用）
  const MOUNTAINS = [
    { name: "子", center: 0,   lo: 352.5, hi: 7.5,    palace: "坎", palaceName: "正北", element: "水", type: "地支", zodiac: "鼠", yuan: "天", yinyang: "阴" },
    { name: "癸", center: 15,  lo: 7.5,   hi: 22.5,   palace: "坎", palaceName: "正北", element: "水", type: "阴干", zodiac: "",     yuan: "人", yinyang: "阳" },
    { name: "丑", center: 30,  lo: 22.5,  hi: 37.5,   palace: "艮", palaceName: "东北", element: "土", type: "地支", zodiac: "牛", yuan: "地", yinyang: "阴" },
    { name: "艮", center: 45,  lo: 37.5,  hi: 52.5,   palace: "艮", palaceName: "东北", element: "土", type: "四维", zodiac: "",     yuan: "天", yinyang: "阳" },
    { name: "寅", center: 60,  lo: 52.5,  hi: 67.5,   palace: "艮", palaceName: "东北", element: "土", type: "地支", zodiac: "虎", yuan: "人", yinyang: "阴" },
    { name: "甲", center: 75,  lo: 67.5,  hi: 82.5,   palace: "震", palaceName: "正东", element: "木", type: "阳干", zodiac: "",     yuan: "地", yinyang: "阳" },
    { name: "卯", center: 90,  lo: 82.5,  hi: 97.5,   palace: "震", palaceName: "正东", element: "木", type: "地支", zodiac: "兔", yuan: "天", yinyang: "阴" },
    { name: "乙", center: 105, lo: 97.5,  hi: 112.5,  palace: "震", palaceName: "正东", element: "木", type: "阴干", zodiac: "",     yuan: "人", yinyang: "阳" },
    { name: "辰", center: 120, lo: 112.5, hi: 127.5,  palace: "巽", palaceName: "东南", element: "木", type: "地支", zodiac: "龙", yuan: "地", yinyang: "阴" },
    { name: "巽", center: 135, lo: 127.5, hi: 142.5,  palace: "巽", palaceName: "东南", element: "木", type: "四维", zodiac: "",     yuan: "天", yinyang: "阳" },
    { name: "巳", center: 150, lo: 142.5, hi: 157.5,  palace: "巽", palaceName: "东南", element: "木", type: "地支", zodiac: "蛇", yuan: "人", yinyang: "阴" },
    { name: "丙", center: 165, lo: 157.5, hi: 172.5,  palace: "离", palaceName: "正南", element: "火", type: "阳干", zodiac: "",     yuan: "地", yinyang: "阳" },
    { name: "午", center: 180, lo: 172.5, hi: 187.5,  palace: "离", palaceName: "正南", element: "火", type: "地支", zodiac: "马", yuan: "天", yinyang: "阴" },
    { name: "丁", center: 195, lo: 187.5, hi: 202.5,  palace: "离", palaceName: "正南", element: "火", type: "阴干", zodiac: "",     yuan: "人", yinyang: "阳" },
    { name: "未", center: 210, lo: 202.5, hi: 217.5,  palace: "坤", palaceName: "西南", element: "土", type: "地支", zodiac: "羊", yuan: "地", yinyang: "阴" },
    { name: "坤", center: 225, lo: 217.5, hi: 232.5,  palace: "坤", palaceName: "西南", element: "土", type: "四维", zodiac: "",     yuan: "天", yinyang: "阳" },
    { name: "申", center: 240, lo: 232.5, hi: 247.5,  palace: "坤", palaceName: "西南", element: "土", type: "地支", zodiac: "猴", yuan: "人", yinyang: "阴" },
    { name: "庚", center: 255, lo: 247.5, hi: 262.5,  palace: "兑", palaceName: "正西", element: "金", type: "阳干", zodiac: "",     yuan: "地", yinyang: "阳" },
    { name: "酉", center: 270, lo: 262.5, hi: 277.5,  palace: "兑", palaceName: "正西", element: "金", type: "地支", zodiac: "鸡", yuan: "天", yinyang: "阴" },
    { name: "辛", center: 285, lo: 277.5, hi: 292.5,  palace: "兑", palaceName: "正西", element: "金", type: "阴干", zodiac: "",     yuan: "人", yinyang: "阳" },
    { name: "戌", center: 300, lo: 292.5, hi: 307.5,  palace: "乾", palaceName: "西北", element: "金", type: "地支", zodiac: "狗", yuan: "地", yinyang: "阴" },
    { name: "乾", center: 315, lo: 307.5, hi: 322.5,  palace: "乾", palaceName: "西北", element: "金", type: "四维", zodiac: "",     yuan: "天", yinyang: "阳" },
    { name: "亥", center: 330, lo: 322.5, hi: 337.5,  palace: "乾", palaceName: "西北", element: "金", type: "地支", zodiac: "猪", yuan: "人", yinyang: "阴" },
    { name: "壬", center: 345, lo: 337.5, hi: 352.5,  palace: "坎", palaceName: "正北", element: "水", type: "阳干", zodiac: "",     yuan: "地", yinyang: "阳" },
  ];

  // ---- 九星 ----
  const STARS = {
    1: { num: 1, name: "一白", alias: "贪狼", element: "水", palace: "坎", nature: "吉",
         note: "文昌星，主智慧、学业、人缘、桃花、偏财。" },
    2: { num: 2, name: "二黑", alias: "巨门", element: "土", palace: "坤", nature: "凶",
         note: "病符星，主疾病、抑郁、暗昧是非。" },
    3: { num: 3, name: "三碧", alias: "禄存", element: "木", palace: "震", nature: "凶",
         note: "蚩尤星，主口舌是非、官非、争斗。" },
    4: { num: 4, name: "四绿", alias: "文曲", element: "木", palace: "巽", nature: "吉",
         note: "文昌星，主学业、功名、文采、艺术。" },
    5: { num: 5, name: "五黄", alias: "廉贞", element: "土", palace: "中", nature: "凶",
         note: "五黄煞，主灾祸、意外、病痛、破财，忌动土。" },
    6: { num: 6, name: "六白", alias: "武曲", element: "金", palace: "乾", nature: "吉",
         note: "武曲星，主权力、官运、贵人、威望。" },
    7: { num: 7, name: "七赤", alias: "破军", element: "金", palace: "兑", nature: "凶",
         note: "破军星，主破财、盗贼、口舌、损失。" },
    8: { num: 8, name: "八白", alias: "左辅", element: "土", palace: "艮", nature: "吉",
         note: "当运财星，主财运、置业、喜庆、健康。" },
    9: { num: 9, name: "九紫", alias: "右弼", element: "火", palace: "离", nature: "吉",
         note: "喜星，主喜庆、姻缘、桃花、名声。" },
  };

  // ---- 三元龙阴阳（飞星顺逆用）----
  // 天元龙：乾坤艮巽（阳）、子午卯酉（阴）
  // 人元龙：乙辛丁癸（阳）、寅申巳亥（阴）
  // 地元龙：甲庚丙壬（阳）、辰戌丑未（阴）
  // ---- 元旦盘（九星本位图）：星数所在宫位及其管辖三山 ----
  const YUANDAN = {
    1: ["壬", "子", "癸"],
    2: ["未", "坤", "申"],
    3: ["甲", "卯", "乙"],
    4: ["辰", "巽", "巳"],
    5: [],
    6: ["戌", "乾", "亥"],
    7: ["庚", "酉", "辛"],
    8: ["丑", "艮", "寅"],
    9: ["丙", "午", "丁"],
  };

  // ---- 飞星轨迹（顺飞路径）：中 → 乾 → 兑 → 艮 → 离 → 坎 → 坤 → 震 → 巽 ----
  const FLY_PATH = ["中", "乾", "兑", "艮", "离", "坎", "坤", "震", "巽"];

  // ---- 山向组合解读（key 为两星数字小大排序，如 "16"）----
  const COMBOS = {
    "11": { grade: "吉", name: "双一白", text: "双一白同宫，水气旺盛，主聪明智慧、人缘桃花、偏财运；但水旺亦防泛滥漂泊、心思不定。" },
    "12": { grade: "凶", name: "二黑克一白", text: "二黑病符土克一白水，主健康受损、忧郁多思、泌尿肾脏之疾，宜多静养、保持明亮。" },
    "13": { grade: "中", name: "水生木", text: "一白水生三碧木，是非星得生而旺，主口舌是非增多、因言招祸，但亦有灵感与行动力。" },
    "14": { grade: "吉", name: "一四同宫", text: "一四同宫、水木相生，文昌发科之象，主学业进步、考试功名、文思泉涌，利读书创作。" },
    "15": { grade: "凶", name: "五黄克一白", text: "五黄土克一白水，主病灾血光、肾脏泌尿之疾，此宫宜静不宜动，忌装修动土。" },
    "16": { grade: "吉", name: "一六共宗", text: "一六共宗、金水相生（河图生成之数），主聪明才智、财禄官贵，利求财与名望。" },
    "17": { grade: "中", name: "金生水", text: "七赤金生一白水，主口舌与人缘并存，利交际应酬，但防因言惹祸。" },
    "18": { grade: "中", name: "八白制一白", text: "八白土克一白水，当运财星压制文星，主财运尚可而文思受阻，宜财文分置。" },
    "19": { grade: "吉", name: "一九合十", text: "一九合十、水火既济，主名声智慧双收、贵人暗助，但水火相射亦防心血之疾。" },
    "22": { grade: "大凶", name: "双二黑", text: "双二黑病符重叠，主久病暗疾、情绪抑郁、家宅阴滞，此宫宜暗宜静，忌强光与动土。" },
    "23": { grade: "凶", name: "二三斗牛煞", text: "二三斗牛煞（木克土），三碧克二黑，主口舌官非、是非争斗、肠胃之疾，忌放尖锐物品。" },
    "24": { grade: "中", name: "木克土", text: "四绿木克二黑土，文昌制病符，主以文养身、利读书静养，但防文书口舌与腹疾。" },
    "25": { grade: "大凶", name: "二五交加", text: "二五交加，病符遇五黄煞，土气极重，主久病难愈、灾祸暗伏，此宫宜静宜空，忌动土。" },
    "26": { grade: "中", name: "土生金", text: "二黑土生六白金，病符化官贵，主劳而有成、辛苦得贵，但防操劳过度伤身。" },
    "27": { grade: "凶", name: "土生金", text: "二黑土生七赤金，病符生破军，主因财致病、病中破财，防口舌与损耗。" },
    "28": { grade: "中", name: "土土比和", text: "二黑八白同宫，当运财星制病符，主财来防病、进财亦耗，宜以洁净明亮化解。" },
    "29": { grade: "凶", name: "火生土", text: "九紫火生二黑土，病符得生更旺，主久病缠绵、血光火土之疾，忌在此宫用火。" },
    "33": { grade: "凶", name: "双三碧", text: "双三碧蚩尤重叠，主是非官非、争斗破财、盗贼口舌，此宫忌动土与争吵。" },
    "34": { grade: "中", name: "木木比和", text: "三四木气比和，文曲禄存同宫，主才艺与口舌并存，宜以文会友、化是非为文采。" },
    "35": { grade: "凶", name: "木克土", text: "三碧木克五黄土，主破财官非、意外灾祸，是非星触五黄煞，此宫宜静忌动。" },
    "36": { grade: "中", name: "金克木", text: "六白金克三碧木，武曲制是非，主官非得贵人化解、是非渐息，防筋骨损伤。" },
    "37": { grade: "凶", name: "金克木", text: "七赤金克三碧木，破军克是非，主因财起争、口舌官非、盗贼之患，忌放金属利器。" },
    "38": { grade: "凶", name: "木克土", text: "三碧木克八白土，是非克当运财星，主破财阻财、是非缠身，宜以静制动。" },
    "39": { grade: "吉", name: "木火通明", text: "三九木火通明，主聪明发越、名望提升，利开创与表现，但火旺亦防急躁口舌。" },
    "44": { grade: "吉", name: "双四绿", text: "双四绿文昌重叠，主大旺文才科甲、学业艺术，文曲之气极盛，利读书创作考试。" },
    "45": { grade: "中", name: "木克土", text: "四绿木克五黄土，文昌制煞，主以文化解灾厄、利读书避祸，但防文书之灾。" },
    "46": { grade: "中", name: "金克木", text: "六白金克四绿木，武曲压文昌，主因公务阻碍文事、文书官非，利武不利文。" },
    "47": { grade: "凶", name: "金克木", text: "七赤金克四绿木，破军克文曲，主因色惹祸、桃花劫、口舌损才，防名誉受损。" },
    "48": { grade: "中", name: "木克土", text: "四绿木克八白土，文昌制财星，主利名声不利财，读书人吉、经商者需注意。" },
    "49": { grade: "吉", name: "四九为友", text: "四九为友、木火通明（河图生成之数），主大旺文才功名、喜庆临门，利考试升迁。" },
    "55": { grade: "大凶", name: "双五黄", text: "双五黄伏吟，五黄煞气重叠，主灾祸连绵、大病血光、破财连连，此宫宜空宜静，万不可动土。" },
    "56": { grade: "中", name: "土生金", text: "五黄土生六白金，煞气化官贵，主因险得权、危机转机，但过程辛苦，防旧患复发。" },
    "57": { grade: "凶", name: "土生金", text: "五黄土生七赤金，煞生破军，主破财盗贼、血光口舌，此宫忌金属利器与动土。" },
    "58": { grade: "中", name: "土土比和", text: "五黄八白同宫，当运财星制五黄，主财来防灾，宜以静制动、以洁化煞。" },
    "59": { grade: "大凶", name: "火生土", text: "九紫火生五黄土，五黄得生大旺，主火灾血光之象，此宫忌火忌动。" },
    "66": { grade: "吉", name: "双六白", text: "双六白武曲重叠，主权势官运亨通、贵人相助，利事业权威，但金多亦防刚愎。" },
    "67": { grade: "凶", name: "六七交剑煞", text: "六七交剑煞，双金相斗，主争斗损伤、破财官非、刀剑之伤，此宫忌放金属尖锐物。" },
    "68": { grade: "吉", name: "土生金", text: "八白土生六白金，财星生官星，主置业发财、官财两旺，利经商与求官。" },
    "69": { grade: "凶", name: "火克金", text: "九紫火克六白金，主因火损财、官非缠身，防心血之疾，此宫忌火。" },
    "77": { grade: "凶", name: "双七赤", text: "双七赤破军重叠，主破财盗贼、口舌桃色、损失连连，此宫忌杂乱与金属。" },
    "78": { grade: "中", name: "土生金", text: "八白土生七赤金，当运财星生破军，主先得财后破财、因色损财，宜守不宜攻。" },
    "79": { grade: "凶", name: "火克金", text: "九紫火克七赤金，主血光火灾、破财口舌、桃色纠纷，此宫忌火与金属。" },
    "88": { grade: "大吉", name: "双八白", text: "双八白财星重叠，主旺财置业、喜庆连连，宜聚财纳气、保持明亮。" },
    "89": { grade: "大吉", name: "火生土", text: "九紫火生八白土，财星得生，主财喜临门、姻缘喜庆、贵人财帛俱旺，大吉之局。" },
    "99": { grade: "吉", name: "双九紫", text: "双九紫火旺，主大旺喜庆姻缘、名声远扬，利喜事与财名（九运为当运旺星）。" },
  };

  // ---- 流年紫白：2024 年三碧入中，之后每年入中星减一（1↔9 循环）----
  function yearCenterStar(year) {
    const offset = (year - 2024) % 9;
    const v = 3 - offset;
    return ((v - 1) % 9 + 9) % 9 + 1;
  }

  // ---- 元运 ----
  const PERIODS = [
    { num: 7, label: "七运", years: "1984–2003" },
    { num: 8, label: "八运", years: "2004–2023" },
    { num: 9, label: "九运", years: "2024–2043" },
  ];

  // ---- 宫位方位（盘面布局与名称）----
  const PALACE_NAMES = {
    "坎": "正北", "艮": "东北", "震": "正东", "巽": "东南",
    "离": "正南", "坤": "西南", "兑": "正西", "乾": "西北", "中": "中宫",
  };

  // ---- 地支六冲与三合 ----
  const LIUCHONG = { "子": "午", "丑": "未", "寅": "申", "卯": "酉", "辰": "戌", "巳": "亥" };
  const SANHE = {
    "申子辰": "水局", "寅午戌": "火局", "巳酉丑": "金局", "亥卯未": "木局",
  };

  // ---- 对宫（二十四山两两对冲）----
  function oppositeCenter(deg) {
    return (deg + 180) % 360;
  }

  window.FENGSHUI_DATA = {
    MOUNTAINS, STARS, YUANDAN, FLY_PATH, COMBOS, PERIODS, PALACE_NAMES,
    LIUCHONG, SANHE, yearCenterStar, oppositeCenter,
  };
})();
