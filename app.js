(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const HEXAGRAMS = window.HEXAGRAMS || [];

  const LINE_TYPES = {
    6: { name: "老阴", bit: 0, moving: true },
    7: { name: "少阳", bit: 1, moving: false },
    8: { name: "少阴", bit: 0, moving: false },
    9: { name: "老阳", bit: 1, moving: true },
  };

  const POSITION_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
  const POSITION_HINTS = [
    "初爻：事物起步，重在根基与方向。",
    "二爻：内卦中位，宜配合守正，稳步承接。",
    "三爻：内外交处，多压力变动，宜谨慎再动。",
    "四爻：接近成局，宜审时度势，不可冒进。",
    "五爻：全卦中正，主事有成，宜把握责任。",
    "上爻：事将收束，盛极须防，宜留有余地。",
  ];
  const MOVING_HINTS = {
    6: "老阴动而变阳，阴极转生，宜顺势转化。",
    9: "老阳动而变阴，阳极当退，宜知进知退。",
  };

  const RULE_LABELS = {
    0: "六爻皆静 · 占本卦卦辞",
    1: "一爻动 · 以本卦该爻爻辞为主",
    2: "两爻动 · 以本卦两动爻爻辞为主，上爻为主",
    3: "三爻动 · 本卦、变卦卦辞合参，以本卦为主",
    4: "四爻动 · 以变卦两静爻爻辞为主，下爻为主",
    5: "五爻动 · 以变卦唯一静爻爻辞为主",
    6: "六爻皆动 · 乾坤用「用九/用六」，其余以变卦卦辞为主",
  };

  const QUESTION_TYPES = [
    { id: "career", label: "求事" },
    { id: "people", label: "求人" },
    { id: "money", label: "求财" },
    { id: "love", label: "求姻缘" },
  ];

  const state = {
    lines: [],
    casting: false,
    breathTimer: null,
    questionType: "career",
    interpretationHex: null,
    ben: null,
    bian: null,
    movingIndexes: [],
  };

  const prepare = $("#prepare");
  const casting = $("#casting");
  const result = $("#result");
  const breathText = $("#breathText");
  const castBtn = $("#castBtn");
  const coins = $$(".coin");
  const castHint = $("#castHint");
  const progressText = $("#progressText");
  const progressDots = $$(".progress-dot");
  const lineStack = $("#lineStack");
  const stackTip = $("#stackTip");

  function randomInt(max) {
    try {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] % max;
    } catch (error) {
      return Math.floor(Math.random() * max);
    }
  }

  function tossCoin() {
    return randomInt(2) === 0 ? "背" : "字";
  }

  function castThree() {
    const sides = [tossCoin(), tossCoin(), tossCoin()];
    const yangCount = sides.filter((side) => side === "背").length;
    const yinCount = sides.length - yangCount;
    return { sides, value: yangCount * 3 + yinCount * 2 };
  }

  function lineMeta(value) {
    return LINE_TYPES[value];
  }

  function findHexagram(binary) {
    return HEXAGRAMS.find((hex) => hex.binary === binary);
  }

  function showSection(name) {
    [prepare, casting, result].forEach((section) => section.classList.add("hidden"));
    $(`#${name}`).classList.remove("hidden");
  }

  function syncQuestionType() {
    $$('input[name="questionType"]').forEach((input) => {
      input.checked = input.value === state.questionType;
    });
    $$("#readingTabs .reading-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === state.questionType);
    });
    const current = QUESTION_TYPES.find((item) => item.id === state.questionType);
    $("#readingFocusLabel").textContent = "本次占问 · " + (current ? current.label : "");
  }

  function startBreathing() {
    let exhale = false;
    breathText.textContent = "吸气";
    if (state.breathTimer) {
      clearInterval(state.breathTimer);
    }
    state.breathTimer = setInterval(() => {
      exhale = !exhale;
      breathText.textContent = exhale ? "呼气" : "吸气";
    }, 4000);
  }

  function stopBreathing() {
    if (state.breathTimer) {
      clearInterval(state.breathTimer);
      state.breathTimer = null;
    }
  }

  function resetProgress() {
    progressDots.forEach((dot) => {
      dot.classList.remove("done", "current");
    });
    progressText.textContent = "0 / 6";
  }

  function renderProgress() {
    const count = state.lines.length;
    progressDots.forEach((dot, index) => {
      dot.classList.toggle("done", index < count);
      dot.classList.toggle("current", index === count && count < 6);
    });
    progressText.textContent = `${count} / 6`;
    castHint.textContent = count < 6 ? `第 ${count + 1} 爻：掷出三枚铜钱` : "六爻已成";
  }

  function renderLineStack() {
    lineStack.innerHTML = "";
    for (let index = 0; index < 6; index += 1) {
      const row = document.createElement("div");
      row.className = "line-row";
      if (index < state.lines.length) {
        const meta = lineMeta(state.lines[index].value);
        row.classList.add("cast");
        if (meta.moving) {
          row.classList.add("moving");
        }
        row.innerHTML =
          '<div class="line-figure"><span class="yao ' +
          (meta.bit === 1 ? "yang" : "yin") +
          '"></span></div>' +
          '<span class="line-label">' +
          POSITION_NAMES[index] +
          "</span>" +
          (meta.moving ? '<span class="moving-tag">动</span>' : "");
      } else {
        row.classList.add("empty");
        row.innerHTML =
          '<span class="line-placeholder"></span>' +
          '<span class="line-label">' +
          POSITION_NAMES[index] +
          "</span>";
      }
      lineStack.appendChild(row);
    }
    stackTip.textContent =
      state.lines.length < 6
        ? "每次掷钱后，爻象会从下往上长出来"
        : "六爻已齐，正在成卦";
  }

  function clearCoins() {
    coins.forEach((coin) => {
      coin.textContent = "";
      coin.classList.remove("side-yang", "side-yin");
    });
  }

  function revealCoins(sides) {
    coins.forEach((coin, index) => {
      const side = sides[index];
      coin.textContent = side;
      coin.classList.add(side === "背" ? "side-yang" : "side-yin");
    });
  }

  function castLine() {
    if (state.casting || state.lines.length >= 6) {
      return;
    }
    state.casting = true;
    castBtn.disabled = true;
    clearCoins();
    coins.forEach((coin) => coin.classList.add("tossing"));

    window.setTimeout(() => {
      const cast = castThree();
      coins.forEach((coin) => coin.classList.remove("tossing"));
      revealCoins(cast.sides);
      state.lines.push({ value: cast.value, sides: cast.sides });
      renderProgress();
      renderLineStack();
      state.casting = false;
      castBtn.disabled = false;

      if (state.lines.length >= 6) {
        window.setTimeout(finishCasting, 420);
      }
    }, 620);
  }

  function buildHexagrams(values) {
    const metas = values.map((value) => lineMeta(value));
    const benBinary = metas.map((meta) => meta.bit).join("");
    const bianBinary = metas
      .map((meta) => (meta.moving ? String(1 - meta.bit) : String(meta.bit)))
      .join("");
    return {
      ben: findHexagram(benBinary),
      bian: findHexagram(bianBinary),
      metas,
    };
  }

  function buildReading(ben, bian, movingIndexes) {
    const count = movingIndexes.length;
    const ruleLabel = RULE_LABELS[count];
    const blocks = [];
    let mainTitle = "";
    let mainText = "";

    if (count === 0) {
      mainTitle = `${ben.name}卦 · 卦辞`;
      mainText = ben.judgement;
    } else if (count === 1) {
      const line = ben.lines[movingIndexes[0]];
      mainTitle = `${ben.name}卦 · ${line.label}`;
      mainText = line.text;
      blocks.push({ title: `${ben.name}卦 · 卦辞参考`, text: ben.judgement });
    } else if (count === 2) {
      const lower = Math.min(movingIndexes[0], movingIndexes[1]);
      const upper = Math.max(movingIndexes[0], movingIndexes[1]);
      mainTitle = `${ben.name}卦 · ${ben.lines[upper].label}`;
      mainText = ben.lines[upper].text;
      blocks.push({ title: `${ben.name}卦 · 下动爻参考`, text: ben.lines[lower].text });
    } else if (count === 3) {
      mainTitle = `${ben.name}卦 · 卦辞（主）`;
      mainText = ben.judgement;
      blocks.push({ title: `${bian.name}卦 · 卦辞（辅）`, text: bian.judgement });
      blocks.push({ title: `${bian.name}卦 · 变卦参考`, text: bian.summary });
    } else if (count === 4) {
      const staticIndexes = [0, 1, 2, 3, 4, 5].filter(
        (index) => !movingIndexes.includes(index)
      );
      const lower = Math.min(staticIndexes[0], staticIndexes[1]);
      const upper = Math.max(staticIndexes[0], staticIndexes[1]);
      mainTitle = `${bian.name}卦 · ${bian.lines[lower].label}`;
      mainText = bian.lines[lower].text;
      blocks.push({
        title: `${bian.name}卦 · 上静爻参考`,
        text: bian.lines[upper].text,
      });
      blocks.push({ title: `${bian.name}卦 · 变卦参考`, text: bian.summary });
    } else if (count === 5) {
      const staticIndex = [0, 1, 2, 3, 4, 5].find(
        (index) => !movingIndexes.includes(index)
      );
      mainTitle = `${bian.name}卦 · ${bian.lines[staticIndex].label}`;
      mainText = bian.lines[staticIndex].text;
      blocks.push({ title: `${bian.name}卦 · 变卦参考`, text: bian.summary });
    } else if (count === 6) {
      if (ben.name === "乾" && ben.yong) {
        mainTitle = "乾卦 · 用九";
        mainText = ben.yong;
      } else if (ben.name === "坤" && ben.yong) {
        mainTitle = "坤卦 · 用六";
        mainText = ben.yong;
      } else {
        mainTitle = `${bian.name}卦 · 卦辞`;
        mainText = bian.judgement;
      }
      blocks.push({ title: `${bian.name}卦 · 变卦参考`, text: bian.summary });
    }

    return { count, ruleLabel, mainTitle, mainText, blocks };
  }

  function renderDiagram(el, hex, movingIndexes) {
    el.innerHTML = "";
    for (let index = 5; index >= 0; index -= 1) {
      const bit = Number(hex.binary[index]);
      const row = document.createElement("div");
      row.className = "diagram-line";
      if (movingIndexes.includes(index)) {
        row.classList.add("moving");
      }
      const bar = document.createElement("span");
      bar.className = "bar " + (bit === 1 ? "yang" : "yin");
      row.appendChild(bar);
      el.appendChild(row);
    }
  }

  function lineNote(index, meta) {
    if (meta.moving) {
      return MOVING_HINTS[meta.bit === 0 ? 6 : 9];
    }
    return POSITION_HINTS[index];
  }

  function renderLineTable(ben, metas, movingIndexes) {
    const table = $("#lineTable");
    table.innerHTML = "";
    for (let index = 5; index >= 0; index -= 1) {
      const meta = metas[index];
      const line = ben.lines[index];
      const moving = movingIndexes.includes(index);
      const row = document.createElement("div");
      row.className = "line-row-detail";
      row.innerHTML =
        '<div class="col-label">' +
        POSITION_NAMES[index] +
        "</div>" +
        '<div class="col-value">' +
        meta.name +
        "</div>" +
        '<div class="col-text">' +
        line.label +
        "：" +
        line.text +
        (moving ? '<span class="moving-badge">动</span>' : "") +
        '<div class="line-note">' +
        lineNote(index, meta) +
        "</div>" +
        "</div>";
      table.appendChild(row);
    }
  }

  function renderReading(ben, bian, movingIndexes) {
    const metas = state.lines.map((line) => lineMeta(line.value));
    const reading = buildReading(ben, bian, movingIndexes);
    $("#readingRule").textContent = `${reading.count} 个动爻 · ${reading.ruleLabel}`;
    $("#readingTitle").textContent = reading.mainTitle;
    $("#readingText").textContent = reading.mainText;
    $("#readingSummary").textContent = ben.summary;
    $("#benTuan").textContent = ben.tuan;
    $("#bianTuan").textContent = bian.tuan;

    const useBian =
      reading.count >= 4 &&
      !(reading.count === 6 && (ben.name === "乾" || ben.name === "坤"));
    state.interpretationHex = useBian ? bian : ben;
    state.ben = ben;
    state.bian = bian;
    state.movingIndexes = movingIndexes;
    renderInterpretation(state.interpretationHex, state.questionType);
    renderTransformation(ben, bian, movingIndexes, state.questionType);

    const blocks = $("#readingBlocks");
    blocks.innerHTML = "";
    reading.blocks.forEach((block) => {
      const node = document.createElement("div");
      node.className = "reading-block";
      node.innerHTML = "<h4>" + block.title + "</h4><p>" + block.text + "</p>";
      blocks.appendChild(node);
    });
  }

  function renderInterpretation(hex, type) {
    const reading =
      hex.readings && hex.readings[type] ? hex.readings[type] : hex;
    const items = [
      {
        title: "吉凶判断",
        text: reading.fortune || "吉凶需结合所问之事细看",
        tone: "fortune",
      },
      {
        title: "卦辞预示",
        text: reading.omen || hex.summary,
        tone: "omen",
      },
      {
        title: "行为建议",
        text: reading.advice || hex.summary,
        tone: "advice",
      },
    ];
    const cards = $("#readingCards");
    cards.innerHTML = "";
    items.forEach((item) => {
      const node = document.createElement("div");
      node.className = "reading-card " + item.tone;
      node.innerHTML = "<h4>" + item.title + "</h4><p>" + item.text + "</p>";
      cards.appendChild(node);
    });
  }

  function fortuneRank(hex, type) {
    const reading =
      hex.readings && hex.readings[type] ? hex.readings[type] : hex;
    const fortune = reading.fortune || "";
    const ranks = [
      ["上上", 5],
      ["中上", 4],
      ["中中", 3],
      ["中下", 2],
      ["下下", 1],
    ];
    const matched = ranks.find(([key]) => fortune.startsWith(key));
    return matched ? matched[1] : 3;
  }

  function renderTransformation(ben, bian, movingIndexes, type) {
    const benReading =
      ben.readings && ben.readings[type] ? ben.readings[type] : ben;
    const bianReading =
      bian.readings && bian.readings[type] ? bian.readings[type] : bian;
    const benLabel = (benReading.fortune || "中中卦").split(" · ")[0];
    const bianLabel = (bianReading.fortune || "中中卦").split(" · ")[0];
    const benScore = fortuneRank(ben, type);
    const bianScore = fortuneRank(bian, type);
    const delta = bianScore - benScore;
    const direction =
      delta > 0 ? "由弱转强" : delta < 0 ? "由强转弱" : "平势守成";

    $("#transformationTitle").textContent =
      `${benLabel} → ${bianLabel} · ${direction}`;

    const benFocus = benReading.omen || ben.summary;
    const bianFocus = bianReading.omen || bian.summary;
    let trendText = "";
    if (delta > 0) {
      trendText =
        "方向偏向转好，但变卦只是下一阶段的方向，需按变卦的做法落实才有机会。";
    } else if (delta < 0) {
      trendText =
        "方向偏向转弱，宜以本卦守正止损为先，不因变卦表面变化而冒进。";
    } else {
      trendText = "吉凶等级相近，重点不在结果翻转，而在做法切换。";
    }

    $("#transformationText").textContent =
      `本卦${ben.name}主「${benFocus}」；变卦${bian.name}主「${bianFocus}」。` +
      trendText;

    let linesText = "";
    if (movingIndexes.length === 0) {
      linesText = "六爻皆静，没有动爻变化，以本卦卦辞持续贯彻。";
    } else {
      const parts = movingIndexes.map((index) => {
        const from = ben.lines[index].label;
        const to = bian.lines[index].label;
        const change = ben.binary[index] === "1" ? "阳变阴" : "阴变阳";
        return `${POSITION_NAMES[index]} ${from} ${change} → ${to}`;
      });
      linesText = "动爻：" + parts.join("；") + "。";
    }
    $("#transformationLines").textContent = linesText;
  }

  function refreshReading() {
    if (!state.interpretationHex) {
      return;
    }
    renderInterpretation(state.interpretationHex, state.questionType);
    if (state.ben) {
      renderTransformation(
        state.ben,
        state.bian,
        state.movingIndexes,
        state.questionType
      );
    }
  }

  function finishCasting() {
    const values = state.lines.map((line) => line.value);
    const { ben, bian, metas } = buildHexagrams(values);
    const movingIndexes = [];
    metas.forEach((meta, index) => {
      if (meta.moving) {
        movingIndexes.push(index);
      }
    });

    $("#resultTitle").textContent = `本卦 ${ben.symbol} ${ben.name} · 变卦 ${bian.symbol} ${bian.name}`;
    $("#benName").textContent = `本卦 · ${ben.symbol} ${ben.name}`;
    $("#benMeta").textContent = `上${ben.upper.nature} ${ben.upper.name} · 下${ben.lower.nature} ${ben.lower.name} · 第 ${ben.order} 卦`;
    $("#benSymbol").textContent = ben.symbol;
    $("#bianName").textContent = `变卦 · ${bian.symbol} ${bian.name}`;
    $("#bianMeta").textContent = `上${bian.upper.nature} ${bian.upper.name} · 下${bian.lower.nature} ${bian.lower.name} · 第 ${bian.order} 卦`;
    $("#bianSymbol").textContent = bian.symbol;

    renderDiagram($("#benDiagram"), ben, movingIndexes);
    renderDiagram($("#bianDiagram"), bian, movingIndexes);
    renderLineTable(ben, metas, movingIndexes);
    renderReading(ben, bian, movingIndexes);

    showSection("result");
    window.setTimeout(() => {
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function startCasting() {
    const checked = document.querySelector('input[name="questionType"]:checked');
    state.questionType = checked ? checked.value : "career";
    syncQuestionType();
    state.lines = [];
    stopBreathing();
    clearCoins();
    resetProgress();
    renderLineStack();
    castBtn.disabled = false;
    showSection("casting");
  }

  function resetAll() {
    state.lines = [];
    state.casting = false;
    state.interpretationHex = null;
    state.ben = null;
    state.bian = null;
    state.movingIndexes = [];
    clearCoins();
    showSection("prepare");
    startBreathing();
  }

  $("#startBtn").addEventListener("click", startCasting);
  castBtn.addEventListener("click", castLine);
  $("#againBtn").addEventListener("click", resetAll);

  $$('input[name="questionType"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.questionType = input.value;
      syncQuestionType();
      refreshReading();
    });
  });

  $$("#readingTabs .reading-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.questionType = btn.dataset.type;
      syncQuestionType();
      refreshReading();
    });
  });

  syncQuestionType();
  startBreathing();
  renderLineStack();
})();
