/* 罗盘 · 九宫飞星解读工具 —— 纯逻辑（可独立测试）
 * 排盘方法（下卦/正针）：运星入中顺飞；山星、向星取坐向所在宫运星入中，
 * 按该星在元旦盘（九星本位图）所管三山中、与坐向同三元龙之山的阴阳定顺逆（阳顺阴逆）。
 */
(function () {
  "use strict";

  const D = window.FENGSHUI_DATA;
  const { MOUNTAINS, YUANDAN, FLY_PATH } = D;

  const BY_NAME = {};
  MOUNTAINS.forEach((m) => { BY_NAME[m.name] = m; });

  function normalizeDeg(d) {
    return ((d % 360) + 360) % 360;
  }

  function wrap1to9(n) {
    return ((n - 1) % 9 + 9) % 9 + 1;
  }

  function mountainAt(deg) {
    const d = normalizeDeg(deg);
    return MOUNTAINS.find((m) => {
      if (m.lo < m.hi) return d >= m.lo && d < m.hi;
      return d >= m.lo || d < m.hi; // 跨 0° 的山（子）
    }) || MOUNTAINS[0];
  }

  function distanceToBoundary(deg) {
    const d = normalizeDeg(deg);
    let best = Infinity;
    for (const m of MOUNTAINS) {
      for (const b of [m.lo, m.hi]) {
        let diff = Math.abs(d - b);
        if (diff > 180) diff = 360 - diff;
        if (diff < best) best = diff;
      }
    }
    return best;
  }

  // 方位描述：以最近的八卦方位为基准，按顺时针/逆时针邻位给出「X偏Y°」
  function directionName(deg) {
    const CARDS = [
      { d: 0, n: "北" }, { d: 45, n: "东北" }, { d: 90, n: "东" }, { d: 135, n: "东南" },
      { d: 180, n: "南" }, { d: 225, n: "西南" }, { d: 270, n: "西" }, { d: 315, n: "西北" },
    ];
    const ORDINAL = { 0: "北", 90: "东", 180: "南", 270: "西" };
    let best = 0, bestDiff = Infinity;
    CARDS.forEach((c, i) => {
      let diff = Math.abs(deg - c.d);
      if (diff > 180) diff = 360 - diff;
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    const near = CARDS[best];
    let offset = deg - near.d;
    if (offset > 180) offset -= 360;
    if (offset < -180) offset += 360;
    if (Math.abs(offset) < 0.01) {
      return ORDINAL[near.d] ? "正" + near.n : near.n;
    }
    const towardDeg = (near.d + (offset > 0 ? 90 : -90) + 360) % 360;
    const toward = CARDS.find((c) => c.d === towardDeg).n;
    return near.n + "偏" + toward + Math.abs(Math.round(offset)) + "°";
  }

  // 飞星：centerStar 入中，dir=1 顺飞 / -1 逆飞
  function flyChart(centerStar, dir) {
    const chart = {};
    FLY_PATH.forEach((palace, i) => {
      chart[palace] = wrap1to9(centerStar + dir * i);
    });
    return chart;
  }

  // 山/向星顺逆：入中星在元旦盘所管三山中，取与坐/向同三元龙之山的阴阳（阳顺阴逆）；五黄入中直接依坐/向山自身元龙阴阳
  function flyDirection(mountain, star) {
    if (star === 5) return mountain.yinyang === "阳" ? 1 : -1;
    const trio = YUANDAN[star] || [];
    const matched = trio.find((n) => BY_NAME[n].yuan === mountain.yuan);
    return matched ? (BY_NAME[matched].yinyang === "阳" ? 1 : -1) : 1;
  }

  function buildChart(seatName, facingName, period) {
    const seat = BY_NAME[seatName];
    const facing = BY_NAME[facingName];
    const periodChart = flyChart(period, 1);
    const seatPalace = seat.palace;
    const facingPalace = facing.palace;
    const seatStar = periodChart[seatPalace];
    const facingStar = periodChart[facingPalace];
    const shanDir = flyDirection(seat, seatStar);
    const xiangDir = flyDirection(facing, facingStar);
    const shanChart = flyChart(seatStar, shanDir);
    const xiangChart = flyChart(facingStar, xiangDir);
    const chart = {};
    FLY_PATH.forEach((palace) => {
      chart[palace] = { yun: periodChart[palace], shan: shanChart[palace], xiang: xiangChart[palace] };
    });
    return { chart, periodChart, shanChart, xiangChart, seatStar, facingStar, shanDir, xiangDir, seatPalace, facingPalace };
  }

  // 总断：按当运旺星在坐/向两宫的分布判定；伏吟/反吟按中宫山向星与运星是否相同或合十
  function assess(info, period) {
    const { chart, seatPalace, facingPalace } = info;
    const zuo = chart[seatPalace];
    const xiang = chart[facingPalace];
    const zhong = chart["中"];
    const W = period;
    let primary;
    if (zuo.shan === W && xiang.xiang === W) primary = "旺山旺向";
    else if (zuo.shan === W && zuo.xiang === W) primary = "双星到坐";
    else if (xiang.shan === W && xiang.xiang === W) primary = "双星到向";
    else if (zuo.xiang === W && xiang.shan === W) primary = "上山下水";
    else primary = "平局";
    const warns = [];
    if (zhong.shan === zhong.yun) warns.push("山星伏吟");
    if (zhong.xiang === zhong.yun) warns.push("向星伏吟");
    if (zhong.shan + zhong.yun === 10) warns.push("山星反吟");
    if (zhong.xiang + zhong.yun === 10) warns.push("向星反吟");
    return { primary, warns };
  }

  // 坐向互为对宫（正针下卦）
  function seatFacingFromDegree(deg, mode) {
    const measured = mountainAt(deg);
    if (mode === "seat") {
      const facing = mountainAt(D.oppositeCenter(measured.center));
      return { seat: measured.name, facing: facing.name, measuredName: measured.name };
    }
    const facingDeg = measured.center;
    const seatDeg = D.oppositeCenter(facingDeg);
    const seat = mountainAt(seatDeg);
    return { seat: seat.name, facing: measured.name, measuredName: measured.name };
  }

  window.FS_CORE = {
    normalizeDeg, wrap1to9, mountainAt, distanceToBoundary, directionName,
    flyChart, flyDirection, buildChart, assess, seatFacingFromDegree,
    mountainByName: (n) => BY_NAME[n],
  };
})();
