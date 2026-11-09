/**
 * BORI & Masting Interactive Simulator Engine
 * Pure client-side Random Forest inference & ecological index calculation.
 */

// Preset scenarios
const PRESETS = {
  "2025": {
    name: "2025年（3樹種同調大凶作・過去最多出没）",
    prev_temp_m7: 28.1,
    prev_sun_m7: 78.0,
    temp_m7: 28.2,
    sun_m7: 72.0,
    ndvi_anom_m8: -0.315,
    prev_masting_beech: 2.0,
    temp_m5: 17.4,
    precip_m5: 1004.3,
    sun_m5: 70.0,
    temp_m8: 27.6,
    precip_m8: 1001.7,
    ndre_anom_m8: -0.225,
    prev_masting_oak: 3.0,
    prev_fsi: 1.0
  },
  "2024": {
    name: "2024年（豊作年・出没抑制＆個体数蓄積）",
    prev_temp_m7: 29.0,
    prev_sun_m7: 74.0,
    temp_m7: 26.9,
    sun_m7: 75.0,
    ndvi_anom_m8: -0.223,
    prev_masting_beech: 0.0,
    temp_m5: 18.6,
    precip_m5: 1005.2,
    sun_m5: 62.0,
    temp_m8: 28.1,
    precip_m8: 1000.1,
    ndre_anom_m8: -0.135,
    prev_masting_oak: 2.0,
    prev_fsi: 4.0
  },
  "2023": {
    name: "2023年（ブナ単独大凶作・中規模出没）",
    prev_temp_m7: 25.8,
    prev_sun_m7: 78.0,
    temp_m7: 27.6,
    sun_m7: 71.0,
    ndvi_anom_m8: -0.131,
    prev_masting_beech: 2.0,
    temp_m5: 17.6,
    precip_m5: 1006.2,
    sun_m5: 62.0,
    temp_m8: 29.0,
    precip_m8: 1001.8,
    ndre_anom_m8: -0.041,
    prev_masting_oak: 2.0,
    prev_fsi: 2.0
  },
  "baseline": {
    name: "平年基準（並作・安定状態）",
    prev_temp_m7: 25.0,
    prev_sun_m7: 75.0,
    temp_m7: 26.0,
    sun_m7: 75.0,
    ndvi_anom_m8: 0.0,
    prev_masting_beech: 2.0,
    temp_m5: 17.0,
    precip_m5: 1000.0,
    sun_m5: 65.0,
    temp_m8: 26.5,
    precip_m8: 1000.0,
    ndre_anom_m8: 0.0,
    prev_masting_oak: 2.0,
    prev_fsi: 2.0
  }
};

/**
 * Predict regression value using Random Forest JSON structure
 */
function predictTree(tree, features) {
  let node = 0;
  while (tree.children_left[node] !== -1) {
    const featIdx = tree.feature[node];
    const featName = tree.feature_names[featIdx];
    const threshold = tree.threshold[node];
    const val = features[featName];

    if (val <= threshold) {
      node = tree.children_left[node];
    } else {
      node = tree.children_right[node];
    }
  }
  return tree.value[node];
}

function predictForest(forest, features) {
  if (!forest || !forest.trees) return 0.0;
  let sum = 0.0;
  for (let i = 0; i < forest.trees.length; i++) {
    sum += predictTree(forest.trees[i], features);
  }
  return sum / forest.trees.length;
}

/**
 * Calculate Food Shortage Index
 * FSI = (3 - b) + (3 - o)
 */
function calculateFSI(bHat, oHat) {
  const b = Math.max(0.0, Math.min(3.0, bHat));
  const o = Math.max(0.0, Math.min(3.0, oHat));
  return (3.0 - b) + (3.0 - o);
}

/**
 * Calculate Bear Outbreak Risk Index
 * BORI = 10^3 * exp(FSI_t - 2.7890 * FSI_{t-1})
 */
function calculateBORI(fsiCur, fsiPrev) {
  const exponent = fsiCur - 2.7890 * fsiPrev;
  return 1000.0 * Math.exp(exponent);
}

function getRiskCategory(bori) {
  if (bori >= 15.0) {
    return {
      level: "特別警戒 (Severe Alert)",
      badgeClass: "badge-critical",
      color: "#ef4444",
      desc: "3樹種同調大凶作と前年個体数増が重なり、記録的な大量出没・人里侵入リスクが極めて高い状態です。"
    };
  } else if (bori >= 7.0) {
    return {
      level: "警戒 (Alert)",
      badgeClass: "badge-high",
      color: "#f97316",
      desc: "主要堅果類が凶作であり、山間部から集落周辺へのエサ探索行動が活発化するリスクがあります。"
    };
  } else if (bori >= 2.0) {
    return {
      level: "注意 (Advisory)",
      badgeClass: "badge-moderate",
      color: "#eab308",
      desc: "局所的なエサ不足により、生ごみや果樹などへの誘引出没が発生しやすい状態です。"
    };
  } else {
    return {
      level: "正常・低リスク (Normal / Low)",
      badgeClass: "badge-low",
      color: "#22c55e",
      desc: "山林内の堅果類が維持されており、人里への出没圧力は平年以下にとどまります。"
    };
  }
}

function getMastingCategory(val) {
  if (val >= 2.5) return { text: "豊作 (丰)", color: "#38bdf8" };
  if (val >= 1.5) return { text: "並作 (并)", color: "#4ade80" };
  if (val >= 0.7) return { text: "凶作 (凶)", color: "#fb923c" };
  return { text: "大凶作 (无)", color: "#f87171" };
}

// UI Binding
function getInputValues() {
  return {
    prev_temp_m7: parseFloat(document.getElementById("prev_temp_m7").value),
    prev_sun_m7: parseFloat(document.getElementById("prev_sun_m7").value),
    temp_m7: parseFloat(document.getElementById("temp_m7").value),
    sun_m7: parseFloat(document.getElementById("sun_m7").value),
    ndvi_anom_m8: parseFloat(document.getElementById("ndvi_anom_m8").value),
    prev_masting_beech: parseFloat(document.getElementById("prev_masting_beech").value),

    temp_m5: parseFloat(document.getElementById("temp_m5").value),
    precip_m5: parseFloat(document.getElementById("precip_m5").value),
    sun_m5: parseFloat(document.getElementById("sun_m5").value),
    temp_m8: parseFloat(document.getElementById("temp_m8").value),
    precip_m8: parseFloat(document.getElementById("precip_m8").value),
    ndre_anom_m8: parseFloat(document.getElementById("ndre_anom_m8").value),
    prev_masting_oak: parseFloat(document.getElementById("prev_masting_oak").value),

    prev_fsi: parseFloat(document.getElementById("prev_fsi").value)
  };
}

function updateDisplays(vals) {
  // Sync slider label outputs
  document.getElementById("val_prev_temp_m7").innerText = vals.prev_temp_m7.toFixed(1) + " ℃";
  document.getElementById("val_prev_sun_m7").innerText = vals.prev_sun_m7.toFixed(0) + " %";
  document.getElementById("val_temp_m7").innerText = vals.temp_m7.toFixed(1) + " ℃";
  document.getElementById("val_sun_m7").innerText = vals.sun_m7.toFixed(0) + " %";
  document.getElementById("val_ndvi_anom_m8").innerText = (vals.ndvi_anom_m8 > 0 ? "+" : "") + vals.ndvi_anom_m8.toFixed(3);

  document.getElementById("val_temp_m5").innerText = vals.temp_m5.toFixed(1) + " ℃";
  document.getElementById("val_precip_m5").innerText = vals.precip_m5.toFixed(1) + " mm";
  document.getElementById("val_sun_m5").innerText = vals.sun_m5.toFixed(0) + " %";
  document.getElementById("val_temp_m8").innerText = vals.temp_m8.toFixed(1) + " ℃";
  document.getElementById("val_precip_m8").innerText = vals.precip_m8.toFixed(1) + " mm";
  document.getElementById("val_ndre_anom_m8").innerText = (vals.ndre_anom_m8 > 0 ? "+" : "") + vals.ndre_anom_m8.toFixed(3);

  document.getElementById("val_prev_fsi").innerText = vals.prev_fsi.toFixed(1) + " 点";
}

function runSimulation() {
  if (!window.RF_MODELS) {
    console.error("Models data not loaded.");
    return;
  }

  const inputs = getInputValues();
  updateDisplays(inputs);

  // 1. Beech Prediction
  const beechInputs = {
    prev_temp_m7: inputs.prev_temp_m7,
    prev_sun_m7: inputs.prev_sun_m7,
    temp_m7: inputs.temp_m7,
    sun_m7: inputs.sun_m7,
    NDVI_anom_m8: inputs.ndvi_anom_m8,
    prev_masting: inputs.prev_masting_beech
  };
  const bHat = predictForest(window.RF_MODELS.beech, beechInputs);

  // 2. Oak Prediction
  const oakInputs = {
    temp_m5: inputs.temp_m5,
    precip_m5: inputs.precip_m5,
    sun_m5: inputs.sun_m5,
    temp_m8: inputs.temp_m8,
    precip_m8: inputs.precip_m8,
    NDRE_anom_m8: inputs.ndre_anom_m8,
    prev_masting: inputs.prev_masting_oak
  };
  const oHat = predictForest(window.RF_MODELS.oak, oakInputs);

  // 3. FSI & BORI
  const fsi = calculateFSI(bHat, oHat);
  const bori = calculateBORI(fsi, inputs.prev_fsi);
  const risk = getRiskCategory(bori);

  // Render values to DOM
  const bCat = getMastingCategory(bHat);
  const oCat = getMastingCategory(oHat);

  document.getElementById("out_beech_val").innerText = bHat.toFixed(2);
  document.getElementById("out_beech_cat").innerText = bCat.text;
  document.getElementById("out_beech_cat").style.color = bCat.color;

  document.getElementById("out_oak_val").innerText = oHat.toFixed(2);
  document.getElementById("out_oak_cat").innerText = oCat.text;
  document.getElementById("out_oak_cat").style.color = oCat.color;

  document.getElementById("out_fsi_val").innerText = fsi.toFixed(2);
  document.getElementById("out_bori_val").innerText = bori.toFixed(2);

  const badgeElem = document.getElementById("out_risk_badge");
  badgeElem.className = "risk-badge " + risk.badgeClass;
  badgeElem.innerText = risk.level;

  document.getElementById("out_risk_desc").innerText = risk.desc;

  // Formula breakdown display
  document.getElementById("calc_fsi_step").innerText = 
    `FSI_t = (3 - ${bHat.toFixed(2)}) + (3 - ${oHat.toFixed(2)}) = ${(3 - bHat).toFixed(2)} + ${(3 - oHat).toFixed(2)} = ${fsi.toFixed(2)}`;

  const expPart = (fsi - 2.7890 * inputs.prev_fsi).toFixed(3);
  document.getElementById("calc_bori_step").innerText = 
    `BORI_t = 10³ × exp(${fsi.toFixed(2)} - 2.7890 × ${inputs.prev_fsi.toFixed(2)}) = 1000 × exp(${expPart}) = ${bori.toFixed(2)}`;

  // Animate Gauge Bar (0 to 25 cap)
  const barWidth = Math.min(100, Math.max(0, (bori / 20.0) * 100));
  const barElem = document.getElementById("gauge_fill");
  barElem.style.width = barWidth + "%";
  barElem.style.backgroundColor = risk.color;
}

function loadPreset(key) {
  const p = PRESETS[key];
  if (!p) return;

  for (const [id, val] of Object.entries(p)) {
    if (id === "name") continue;
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
  runSimulation();
}

window.addEventListener("DOMContentLoaded", () => {
  // Attach change listeners to all inputs
  const inputs = document.querySelectorAll("input, select");
  inputs.forEach(el => {
    el.addEventListener("input", runSimulation);
  });

  // Preset buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadPreset(btn.dataset.preset);
    });
  });

  // Initial run
  runSimulation();
});
