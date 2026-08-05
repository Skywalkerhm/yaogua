/* 罗盘 · 九宫飞星解读工具 —— 界面与交互
 * 排盘逻辑见 core.js；数据见 data.js。全部本地运行。
 */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const D = window.FENGSHUI_DATA;
  const C = window.FS_CORE;
  const { MOUNTAINS, STARS, FLY_PATH, COMBOS, PERIODS, PALACE_NAMES } = D;

  // ---------- 状态 ----------

  const state = {
    degree: 180,        // 罗盘读数
    mode: "facing",     // facing=正对方向(朝向), seat=背后方向(坐山)
    period: 9,
    year: 2026,
    showYear: true,
    tab: "mountains",
  };

  // ---------- 元素 ----------

  const tabButtons = $$(".tab");
  const panels = { mountains: $("#tab-mountains"), flying: $("#tab-flying") };
  const compassSvg = $("#compassSvg");
  const degSlider = $("#degSlider");
  const degInput = $("#degInput");
  const modeFacing = $("#modeFacing");
  const modeSeat = $("#modeSeat");
  const seatSelect = $("#seatSelect");
  const facingChip = $("#facingChip");
  const mountainTitle = $("#mountainTitle");
  const mountainInfo = $("#mountainInfo");
  const mountainNote = $("#mountainNote");
  const zoneWarn = $("#zoneWarn");
  const flySeatSelect = $("#flySeatSelect");
  const periodSelect = $("#periodSelect");
  const yearInput = $("#yearInput");
  const showYearCheck = $("#showYearCheck");
  const zuoTitle = $("#zuoTitle");
  const yearTitle = $("#yearTitle");
  const zuomingChart = $("#zuomingChart");
  const assessCard = $("#assessCard");
  const calcDetails = $("#calcDetails");
  const yearChart = $("#yearChart");
  const yearTips = $("#yearTips");
  const palaceCards = $("#palaceCards");

  // ---------- 罗盘 SVG ----------

  const SVG_NS = "http://www.w3.org/2000/svg";
  const CX = 200, CY = 200, R_OUT = 186, R_MID = 150, R_IN = 128, R_NEEDLE = 168;

  function polar(r, deg) {
    const rad = (deg * Math.PI) / 180;
    return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
  }

  function sectorPath(rOuter, rInner, startDeg, endDeg) {
    const [x1o, y1o] = polar(rOuter, startDeg);
    const [x2o, y2o] = polar(rOuter, endDeg);
    const [x1i, y1i] = polar(rInner, startDeg);
    const [x2i, y2i] = polar(rInner, endDeg);
    const sweep = ((endDeg - startDeg) % 360 + 360) % 360;
    const large = sweep > 180 ? 1 : 0;
    return `M ${x1o.toFixed(2)} ${y1o.toFixed(2)} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o.toFixed(2)} ${y2o.toFixed(2)} L ${x2i.toFixed(2)} ${y2i.toFixed(2)} A ${rInner} ${rInner} 0 ${large} 0 ${x1i.toFixed(2)} ${y1i.toFixed(2)} Z`;
  }

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  const PALACE_TONE = {
    坎: "#dbe6f0", 艮: "#e7e0d0", 震: "#dce7da", 巽: "#d6e5d4",
    离: "#f2ddd6", 坤: "#e9dfd1", 兑: "#e5e2d5", 乾: "#e3e1ec",
  };

  function renderCompass(deg) {
    compassSvg.innerHTML = "";
    const g = el("g", {}, compassSvg);

    MOUNTAINS.forEach((m) => {
      const path = el("path", {
        d: sectorPath(R_OUT, R_MID, m.lo, m.hi),
        fill: PALACE_TONE[m.palace] || "#eee",
        stroke: "#ffffff",
        "stroke-width": 1,
        class: "mountain-sector",
        "data-deg": m.center,
      }, g);
      path.addEventListener("click", (evt) => { evt.stopPropagation(); setDegree(m.center); });
    });

    const EIGHT = [
      { palace: "坎", deg: 0 }, { palace: "艮", deg: 45 }, { palace: "震", deg: 90 },
      { palace: "巽", deg: 135 }, { palace: "离", deg: 180 }, { palace: "坤", deg: 225 },
      { palace: "兑", deg: 270 }, { palace: "乾", deg: 315 },
    ];
    EIGHT.forEach((e) => {
      const [x, y] = polar(164, e.deg);
      const t = el("text", { x, y, class: "palace-label", "text-anchor": "middle" }, g);
      t.textContent = e.palace;
    });

    MOUNTAINS.forEach((m) => {
      const [x, y] = polar(139, m.center);
      const t = el("text", { x, y, class: "mountain-label", "text-anchor": "middle" }, g);
      t.textContent = m.name;
    });

    el("circle", { cx: CX, cy: CY, r: 22, fill: "#fbfaf4", stroke: "#b08a3e", "stroke-width": 1.5 }, g);
    el("circle", { cx: CX, cy: CY, r: 4, fill: "#a4382c" }, g);

    const [nx, ny] = polar(R_NEEDLE, deg);
    const [sx, sy] = polar(-R_NEEDLE, deg);
    el("line", { x1: CX, y1: CY, x2: nx, y2: ny, stroke: "#a4382c", "stroke-width": 3.5, "stroke-linecap": "round" }, g);
    el("line", { x1: CX, y1: CY, x2: sx, y2: sy, stroke: "#d7ded9", "stroke-width": 3, "stroke-linecap": "round" }, g);

    compassSvg.addEventListener("click", (evt) => {
      const rect = compassSvg.getBoundingClientRect();
      if (!rect.width) return;
      const x = ((evt.clientX - rect.left) / rect.width) * 400;
      const y = ((evt.clientY - rect.top) / rect.height) * 400;
      const dx = x - CX, dy = CY - y;
      if (Math.hypot(dx, dy) < 40) return;
      const d = C.normalizeDeg(Math.round((Math.atan2(dx, dy) * 180) / Math.PI));
      setDegree(d);
    });
  }

  // ---------- 二十四山页 ----------

  function setDegree(deg, mode) {
    state.degree = C.normalizeDeg(Math.round(deg));
    if (mode) state.mode = mode;
    degSlider.value = state.degree;
    degInput.value = state.degree;
    modeFacing.checked = state.mode === "facing";
    modeSeat.checked = state.mode === "seat";
    renderMountain();
    renderCompass(state.degree);
    renderFlying();
  }

  function currentSeatFacing() {
    return C.seatFacingFromDegree(state.degree, state.mode);
  }

  function renderMountain() {
    const { seat, facing } = currentSeatFacing();
    const seatM = D.MOUNTAINS.find((m) => m.name === seat);
    const facingM = D.MOUNTAINS.find((m) => m.name === facing);

    seatSelect.value = seat;
    facingChip.textContent = `${facing}山`;
    mountainTitle.textContent = `${seat}山${facing}向`;

    const wrap = (d) => (d === 0 ? 360 : d);
    const rows = [
      ["坐山", `${seatM.name}（${C.directionName(seatM.center)} · ${seatM.palace}宫）`],
      ["向首", `${facingM.name}（${C.directionName(facingM.center)} · ${facingM.palace}宫）`],
      ["坐山角度", `${wrap(seatM.lo).toFixed(1)}° – ${wrap(seatM.hi).toFixed(1)}°（每山 15°）`],
      ["五行", `${seatM.element}（${seatM.palace}宫之五行）`],
      ["三元龙", `${seatM.yuan}元龙 · ${seatM.yinyang}（排盘顺逆据此元龙查元旦盘对应之山）`],
      ["干支属性", seatM.type === "地支" ? `${seatM.name}（生肖${seatM.zodiac}）` : seatM.type],
    ];
    mountainInfo.innerHTML = rows.map(([k, v]) => `<div class="info-row"><dt>${k}</dt><dd>${v}</dd></div>`).join("");

    let extra;
    if (seatM.type === "地支") {
      const chong = D.LIUCHONG[seatM.name];
      const heKey = Object.keys(D.SANHE).find((k) => k.includes(seatM.name));
      extra = `六冲：${seatM.name}${chong}${heKey ? "　三合：" + heKey + "（" + D.SANHE[heKey] + "）" : ""}`;
    } else {
      const opp = C.mountainAt(D.oppositeCenter(seatM.center)).name;
      extra = `对宫（相冲）：${seatM.name}${opp}`;
    }
    mountainNote.innerHTML =
      `<p><strong>${seatM.name}山要点：</strong>${extra}；${seatM.palace}宫五行属${seatM.element}。</p>` +
      `<p class="note-muted">排盘时，山星、向星分别以坐山、向首所在宫的运星入中，并按该星在元旦盘所管三山中、与坐/向同三元龙之山的阴阳定顺逆（阳顺阴逆）。坐向互为对宫（差 180°），正针下卦成立。详见「九宫飞星」页的排盘过程。</p>`;

    const dist = C.distanceToBoundary(state.degree);
    if (dist < 3) {
      const idx = D.MOUNTAINS.indexOf(seatM);
      const prev = D.MOUNTAINS[(idx + D.MOUNTAINS.length - 1) % D.MOUNTAINS.length];
      const next = D.MOUNTAINS[(idx + 1) % D.MOUNTAINS.length];
      zoneWarn.textContent = `读数距分界线仅 ${dist.toFixed(1)}°，落在「${prev.name}」与「${next.name}」之间（兼线/骑缝）。专业排盘需用「替卦」，本工具按就近之「${seatM.name}」以下卦解读。`;
      zoneWarn.classList.remove("hidden");
    } else {
      zoneWarn.classList.add("hidden");
    }
  }

  // ---------- 九宫飞星页 ----------

  const GRID_POS = {
    巽: [1, 1], 离: [2, 1], 坤: [3, 1],
    震: [1, 2], 中: [2, 2], 兑: [3, 2],
    艮: [1, 3], 坎: [2, 3], 乾: [3, 3],
  };

  function starColor(n) {
    return {
      1: "#9aa7a3", 2: "#3a3a3a", 3: "#3d8b5f", 4: "#2e7d4f",
      5: "#c99b2e", 6: "#b8c0bd", 7: "#c2573a", 8: "#d9b64e", 9: "#7a4d9b",
    }[n] || "#666";
  }

  function comboKey(a, b) {
    return a < b ? "" + a + b : "" + b + a;
  }

  const ASSESS_TEXT = {
    "旺山旺向": {
      good: true,
      text: "山星当运旺星到坐、向星当运旺星到向，丁财两旺之局。坐后有山（或高楼）主旺人丁，向首见水（路、广场、明堂开阔）主旺财，为最理想的格局。",
    },
    "双星到坐": {
      good: true,
      text: "当运财星（山、向双星）齐聚坐后，旺丁旺财聚于后方。宜坐后有水环抱、低处见水，前方宜静不宜动，后方宜开阔聚气。",
    },
    "双星到向": {
      good: true,
      text: "当运财星（山、向双星）齐聚向首，旺丁旺财聚于前方。宜前方明堂开阔、见水（路、广场、水池），主丁财两旺，为城市阳宅常见吉局。",
    },
    "上山下水": {
      good: false,
      text: "山星旺星到向、向星旺星到坐，山水颠倒之局。常规布局主损丁破财，须「颠山倒水」：坐后见水、向首见山，方能转凶为吉，建议谨慎对待并做化解。",
    },
    "平局": {
      good: true,
      text: "未见明显的旺衰冲合，属普通格局。吉凶主要由周围山水形势与各宫山向组合决定，宜把重要功能布置在当运旺星（财星/文昌/喜庆）所到之宫。",
    },
  };

  function renderFlying() {
    const { seat, facing } = currentSeatFacing();
    flySeatSelect.value = seat;
    periodSelect.value = String(state.period);

    const info = C.buildChart(seat, facing, state.period);
    const verdict = C.assess(info, state.period);
    const period = PERIODS.find((p) => p.num === state.period);

    zuoTitle.textContent = `${seat}山${facing}向 · ${period.label}（${STARS[state.period].name}${STARS[state.period].alias}当运）`;

    // 宅命盘
    zuomingChart.innerHTML = "";
    FLY_PATH.forEach((palace) => {
      const cell = info.chart[palace];
      const pos = GRID_POS[palace];
      const isSeat = palace === info.seatPalace;
      const isFacing = palace === info.facingPalace;
      const div = document.createElement("div");
      div.className = "palace" + (isSeat || isFacing ? " marked" : "");
      div.style.gridColumn = pos[0];
      div.style.gridRow = pos[1];
      div.innerHTML = `
        <span class="pshan" style="--sc:${starColor(cell.shan)}">${cell.shan}</span>
        <span class="pxiang" style="--sc:${starColor(cell.xiang)}">${cell.xiang}</span>
        <span class="pyun" style="--sc:${starColor(cell.yun)}">${cell.yun}</span>
        <span class="pname">${palace}${isSeat ? "·坐" : ""}${isFacing ? "·向" : ""}</span>`;
      zuomingChart.appendChild(div);
    });

    // 总断
    const a = ASSESS_TEXT[verdict.primary];
    const warnHtml = verdict.warns.length
      ? `<p class="assess-warn">另见：${verdict.warns.join("、")}。伏吟主气机阻滞、压抑反复；反吟主气机冲突、变动不安，宜以稳健化解。</p>`
      : "";
    assessCard.innerHTML = `
      <p class="kicker">总断</p>
      <h4 class="assess-title ${a.good ? "good" : "bad"}">${verdict.primary}</h4>
      <p>${a.text}</p>
      ${warnHtml}`;

    // 排盘过程
    const dirText = (d) => (d === 1 ? "顺飞" : "逆飞");
    const yuanNote = (m, star) => {
      if (star === 5) return `${m.name}为${m.yuan}元龙、${m.yinyang}，五黄居中无山可取，依坐向自身元龙阴阳${dirText(C.flyDirection(m, star))}`;
      const trio = D.YUANDAN[star];
      const matched = trio.find((n) => D.MOUNTAINS.find((mm) => mm.name === n).yuan === m.yuan);
      return `${star}在元旦盘${D.MOUNTAINS.find((mm) => mm.name === trio[0]).palace}宫（${trio.join("")}），取与${m.name}同${m.yuan}元之「${matched}」（${D.MOUNTAINS.find((mm) => mm.name === matched).yinyang}）${dirText(C.flyDirection(m, star))}`;
    };
    const listText = (obj) => FLY_PATH.map((p) => `${p}${obj[p]}`).join(" · ");
    calcDetails.innerHTML = `
      <summary>查看排盘过程</summary>
      <div class="calc-body">
        <p>运盘：${state.period}入中宫顺飞（${listText(info.periodChart)}）。</p>
        <p>山星：坐山${seat}（${info.seatPalace}宫）运盘得 ${info.seatStar} 入中。${yuanNote(C.mountainByName(seat), info.seatStar)}。山盘：${listText(info.shanChart)}。</p>
        <p>向星：向首${facing}（${info.facingPalace}宫）运盘得 ${info.facingStar} 入中。${yuanNote(C.mountainByName(facing), info.facingStar)}。向盘：${listText(info.xiangChart)}。</p>
        <p>每宫三数：运星居中、山星居左上、向星居右上。坐宫「${info.seatPalace}」、向宫「${info.facingPalace}」。</p>
      </div>`;

    // 各宫山向组合解读
    palaceCards.innerHTML = "";
    FLY_PATH.forEach((palace) => {
      const cell = info.chart[palace];
      const combo = COMBOS[comboKey(cell.shan, cell.xiang)] || { grade: "中", name: "", text: "组合无专名，按五行生克与星性综合判断。" };
      const isSeat = palace === info.seatPalace;
      const isFacing = palace === info.facingPalace;
      const card = document.createElement("article");
      card.className = "palace-card grade-" + combo.grade;
      card.innerHTML = `
        <h4>${palace}宫（${PALACE_NAMES[palace]}）${isSeat ? '<span class="tag">坐</span>' : ""}${isFacing ? '<span class="tag">向</span>' : ""}</h4>
        <p class="combo-line">山${cell.shan} · 向${cell.xiang} · 运${cell.yun} <span class="combo-name">${combo.name}</span></p>
        <p class="combo-text">${combo.text}</p>`;
      palaceCards.appendChild(card);
    });

    renderYear();
  }

  function renderYear() {
    const yc = D.yearCenterStar(state.year);
    const annual = C.flyChart(yc, 1);
    yearTitle.textContent = `${state.year}年（${STARS[yc].name}${STARS[yc].alias}入中）`;

    yearChart.innerHTML = "";
    FLY_PATH.forEach((palace) => {
      const n = annual[palace];
      const pos = GRID_POS[palace];
      const div = document.createElement("div");
      div.className = "palace year-palace";
      div.style.gridColumn = pos[0];
      div.style.gridRow = pos[1];
      div.innerHTML = `
        <span class="pyun" style="--sc:${starColor(n)}">${n}</span>
        <span class="pname">${palace} · ${STARS[n].name}</span>`;
      yearChart.appendChild(div);
    });

    const TIPS = {
      1: ["文昌 · 人缘位", "利学业、考试、社交人缘；宜放书桌、文昌塔或清水。"],
      2: ["病符位", "忌久坐久卧与动土，宜保持整洁安静、光线柔和。"],
      3: ["是非位", "忌放尖锐物品与争吵，宜静不宜动，防口舌官非。"],
      4: ["文昌位", "利读书、创作、考运；宜布置书桌、绿色植物或文房用品。"],
      5: ["五黄煞位", "大凶之位，切忌动土装修，宜静、宜空，可放铜器以金泄土气。"],
      6: ["官贵位", "利事业、权威与贵人；宜保持畅通明亮，忌堆放杂物。"],
      7: ["破财位", "防破财、盗贼与口舌；忌放金属利器，宜收纳整齐。"],
      8: ["财位", "当运大财星，宜明亮聚气，可放聚财物品、招财植物。"],
      9: ["喜庆位", "利喜事、姻缘、桃花；宜灯火明亮，可放红色饰品增旺喜气。"],
    };
    const tips = FLY_PATH.map((palace) => {
      const n = annual[palace];
      const star = STARS[n];
      const tip = TIPS[n];
      return `<div class="tip-row"><span class="tip-star" style="color:${starColor(n)}">${star.name}${star.alias}</span><strong>${PALACE_NAMES[palace]} · ${tip[0]}</strong><span>${tip[1]}</span></div>`;
    }).join("");
    yearTips.innerHTML = `<h4>${state.year}年九宫吉凶方位</h4>${tips}`;
  }

  // ---------- 事件 ----------

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
      panels.mountains.classList.toggle("hidden", btn.dataset.tab !== "mountains");
      panels.flying.classList.toggle("hidden", btn.dataset.tab !== "flying");
      state.tab = btn.dataset.tab;
    });
  });

  degSlider.addEventListener("input", () => setDegree(Number(degSlider.value)));
  degInput.addEventListener("change", () => {
    const v = Number(degInput.value);
    if (Number.isFinite(v)) setDegree(v);
  });
  modeFacing.addEventListener("change", () => setDegree(state.degree, "facing"));
  modeSeat.addEventListener("change", () => setDegree(state.degree, "seat"));

  seatSelect.addEventListener("change", () => {
    const seatM = D.MOUNTAINS.find((m) => m.name === seatSelect.value);
    setDegree(seatM.center, "seat");
  });

  flySeatSelect.addEventListener("change", () => {
    const seatM = D.MOUNTAINS.find((m) => m.name === flySeatSelect.value);
    setDegree(seatM.center, "seat");
  });

  periodSelect.addEventListener("change", () => {
    state.period = Number(periodSelect.value);
    renderFlying();
  });

  yearInput.addEventListener("change", () => {
    const y = Number(yearInput.value);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) return;
    state.year = y;
    renderYear();
  });

  showYearCheck.addEventListener("change", () => {
    state.showYear = showYearCheck.checked;
    $("#yearBlock").classList.toggle("hidden", !state.showYear);
  });

  // ---------- 初始化 ----------

  seatSelect.innerHTML = MOUNTAINS.map((m) => `<option value="${m.name}">${m.name}</option>`).join("");
  flySeatSelect.innerHTML = MOUNTAINS.map((m) => `<option value="${m.name}">${m.name}</option>`).join("");
  periodSelect.innerHTML = PERIODS.map((p) => `<option value="${p.num}">${p.label}（${p.years}）</option>`).join("");
  yearInput.value = state.year;
  showYearCheck.checked = state.showYear;
  setDegree(state.degree, state.mode);
})();
