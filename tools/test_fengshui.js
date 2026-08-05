/* 罗盘 · 九宫飞星 core 逻辑测试（node）
 * 用法：node tools/test_fengshui.js
 * 覆盖：二十四山换算、已知标准飞星盘（八运子午/壬丙/辰戌、一运子午）、
 *       总断判定、流年紫白、组合表与数据完整性。
 */
"use strict";
const path = require("path");

global.window = {};
require(path.join(__dirname, "..", "fengshui", "data.js"));
require(path.join(__dirname, "..", "fengshui", "core.js"));
const D = window.FENGSHUI_DATA;
const C = window.FS_CORE;

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + "\n      got: " + a + "\n      exp: " + e); }
}

// 二十四山换算
eq("165°→丙", C.mountainAt(165).name, "丙");
eq("345°→壬", C.mountainAt(345).name, "壬");
eq("0°→子", C.mountainAt(0).name, "子");
eq("359.9°→子", C.mountainAt(359.9).name, "子");
eq("7.6°→癸", C.mountainAt(7.6).name, "癸");
eq("352.5°→子(边界)", C.mountainAt(352.5).name, "子");
eq("方位165=南偏东", C.directionName(165), "南偏东15°");
eq("方位345=北偏西", C.directionName(345), "北偏西15°");
eq("方位45=东北", C.directionName(45), "东北");
eq("朝向165→壬山丙向", C.seatFacingFromDegree(165, "facing"), { seat: "壬", facing: "丙", measuredName: "丙" });

// 八运子山午向（对照公开排盘：山向盘 巽34 离88 坤16/震25 中43 兑61/艮79 坎97 乾52，双星到向）
let info = C.buildChart("子", "午", 8);
const pair = {};
["巽","离","坤","震","中","兑","艮","坎","乾"].forEach((p) => { pair[p] = "" + info.chart[p].shan + info.chart[p].xiang; });
eq("八运子山午向 山向盘", pair, { 巽: "34", 离: "88", 坤: "16", 震: "25", 中: "43", 兑: "61", 艮: "79", 坎: "97", 乾: "52" });
eq("八运子山午向 运盘", info.periodChart, { 中: 8, 乾: 9, 兑: 1, 艮: 2, 离: 3, 坎: 4, 坤: 5, 震: 6, 巽: 7 });
eq("八运子山午向 总断=双星到向", C.assess(info, 8).primary, "双星到向");

// 八运壬山丙向（对照资料：双星会坐/双星到坐）
info = C.buildChart("壬", "丙", 8);
eq("八运壬山丙向 坐宫88", info.chart["坎"].shan + "" + info.chart["坎"].xiang, "88");
eq("八运壬山丙向 总断=双星到坐", C.assess(info, 8).primary, "双星到坐");

// 八运辰山戌向（对照资料：上山下水）
info = C.buildChart("辰", "戌", 8);
eq("八运辰山戌向 总断=上山下水", C.assess(info, 8).primary, "上山下水");

// 一运子山午向（经典：双星到向，向宫 11）
info = C.buildChart("子", "午", 1);
eq("一运子山午向 总断=双星到向", C.assess(info, 1).primary, "双星到向");
eq("一运子山午向 向宫11", info.chart["离"].shan + "" + info.chart["离"].xiang, "11");

// 九运子山午向（双星到坐，坐宫 99；中宫 山5向4运9 无伏吟反吟）
info = C.buildChart("子", "午", 9);
eq("九运子山午向 坐宫99", info.chart["坎"].shan + "" + info.chart["坎"].xiang, "99");
eq("九运子山午向 总断=双星到坐", C.assess(info, 9).primary, "双星到坐");
eq("九运子山午向 warns 为空", C.assess(info, 9).warns, []);

// 流年紫白
eq("2024=三碧", D.yearCenterStar(2024), 3);
eq("2025=二黑", D.yearCenterStar(2025), 2);
eq("2026=一白", D.yearCenterStar(2026), 1);
eq("2027=九紫", D.yearCenterStar(2027), 9);
eq("2028=八白", D.yearCenterStar(2028), 8);
eq("2026流年盘", C.flyChart(D.yearCenterStar(2026), 1), { 中: 1, 乾: 2, 兑: 3, 艮: 4, 离: 5, 坎: 6, 坤: 7, 震: 8, 巽: 9 });

// 数据完整性
let missing = [];
for (let a = 1; a <= 9; a++) for (let b = a; b <= 9; b++) if (!D.COMBOS["" + a + b]) missing.push("" + a + b);
eq("45 个山向组合齐全", missing, []);
eq("共24山", D.MOUNTAINS.length, 24);
eq("山名覆盖24山", D.MOUNTAINS.map((m) => m.name).join(""), "子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬");
eq("每山15°跨度", D.MOUNTAINS.every((m) => { let s = m.hi - m.lo; if (s < 0) s += 360; return Math.abs(s - 15) < 1e-6; }), true);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
