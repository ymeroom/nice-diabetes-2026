// 2026 NICE NG28 Clinical Interactive Decision Support System
document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePanel = document.getElementById(targetTab);
      if (activePanel) activePanel.classList.add('active');
    });
  });

  // Reactive State for Patient Calculator
  const state = {
    age: 52,
    bmi: 28.5,
    egfr: 65,
    uacr: 'normal', // normal, micro, macro
    ascvd: false,
    stroke: false,
    hf: 'none', // none, hfref, hfpef
    frailty: 'none', // none, mild, moderate_severe
    dysphagia: 'none', // none, mild, ng_tube
    diet: 'standard', // standard, keto
    onSu: false,
    onInsulin: false,
    hypoUnaware: false,
    hasCarer: false
  };

  // DOM Elements for Inputs
  const ageInput = document.getElementById('calc-age');
  const ageVal = document.getElementById('val-age');
  const bmiInput = document.getElementById('calc-bmi');
  const bmiVal = document.getElementById('val-bmi');
  const egfrInput = document.getElementById('calc-egfr');
  const egfrVal = document.getElementById('val-egfr');
  const uacrSelect = document.getElementById('calc-uacr');
  
  const ascvdCheck = document.getElementById('calc-ascvd');
  const strokeCheck = document.getElementById('calc-stroke');
  const hfSelect = document.getElementById('calc-hf');
  const frailtySelect = document.getElementById('calc-frailty');
  const dysphagiaSelect = document.getElementById('calc-dysphagia');
  const dietSelect = document.getElementById('calc-diet');

  const onSuCheck = document.getElementById('calc-onsu');
  const onInsulinCheck = document.getElementById('calc-oninsulin');
  const hypoUnawareCheck = document.getElementById('calc-hypounaware');
  const hasCarerCheck = document.getElementById('calc-hascarer');

  // Input Listeners
  if (ageInput) {
    ageInput.addEventListener('input', (e) => {
      state.age = parseInt(e.target.value);
      if (ageVal) ageVal.textContent = `${state.age} 歲`;
      evaluateAll();
    });
  }

  if (bmiInput) {
    bmiInput.addEventListener('input', (e) => {
      state.bmi = parseFloat(e.target.value);
      if (bmiVal) bmiVal.textContent = `${state.bmi.toFixed(1)} kg/m²`;
      evaluateAll();
    });
  }

  if (egfrInput) {
    egfrInput.addEventListener('input', (e) => {
      state.egfr = parseInt(e.target.value);
      if (egfrVal) egfrVal.textContent = `${state.egfr} ml/min`;
      evaluateAll();
    });
  }

  if (uacrSelect) uacrSelect.addEventListener('change', (e) => { state.uacr = e.target.value; evaluateAll(); });
  if (ascvdCheck) ascvdCheck.addEventListener('change', (e) => { state.ascvd = e.target.checked; evaluateAll(); });
  if (strokeCheck) strokeCheck.addEventListener('change', (e) => { state.stroke = e.target.checked; evaluateAll(); });
  if (hfSelect) hfSelect.addEventListener('change', (e) => { state.hf = e.target.value; evaluateAll(); });
  if (frailtySelect) frailtySelect.addEventListener('change', (e) => { state.frailty = e.target.value; evaluateAll(); });
  if (dysphagiaSelect) dysphagiaSelect.addEventListener('change', (e) => { state.dysphagia = e.target.value; evaluateAll(); });
  if (dietSelect) dietSelect.addEventListener('change', (e) => { state.diet = e.target.value; evaluateAll(); });
  
  if (onSuCheck) onSuCheck.addEventListener('change', (e) => { state.onSu = e.target.checked; evaluateAll(); });
  if (onInsulinCheck) onInsulinCheck.addEventListener('change', (e) => { state.onInsulin = e.target.checked; evaluateAll(); });
  if (hypoUnawareCheck) hypoUnawareCheck.addEventListener('change', (e) => { state.hypoUnaware = e.target.checked; evaluateAll(); });
  if (hasCarerCheck) hasCarerCheck.addEventListener('change', (e) => { state.hasCarer = e.target.checked; evaluateAll(); });

  // Core Clinical Decision Engine
  function evaluateAll() {
    renderRecommendation();
    renderTargetsAndCgm();
    renderStagingTimeline();
    renderClinicalAlerts();
  }

  function renderRecommendation() {
    const rxContainer = document.getElementById('rx-result-container');
    if (!rxContainer) return;

    let drugs = [];
    let warnings = [];
    let rationale = [];

    const isEarlyOnset = state.age < 40;
    const isObese = state.bmi >= 27.5; // Asian/Taiwan obesity cutoff
    const hasHF = state.hf !== 'none';
    const hasASCVD = state.ascvd || state.stroke;
    const isFrail = state.frailty !== 'none';
    const hasDysphagia = state.dysphagia !== 'none';
    const isKeto = state.diet === 'keto';
    const egfr = state.egfr;

    // Metformin logic
    if (egfr >= 30) {
      if (hasDysphagia) {
        drugs.push({
          name: "Metformin 標準速效錠 (可磨粉) 或 水劑",
          type: "primary",
          tag: "第一線基石 (速效/液體)"
        });
        warnings.push("⚠️ 吞嚥困難注意：緩釋型 Metformin XR 嚴禁磨粉管灌！已自動為您切換為標準速效錠 (Standard-Release) 或口服懸液劑。");
      } else {
        drugs.push({
          name: "Metformin 緩釋劑型 (Modified-Release XR)",
          type: "primary",
          tag: "2026 首選基石"
        });
      }
      rationale.push("Metformin 緩釋錠 (XR) 可顯著減少腸胃不適，提升長期順從性。");
    } else {
      warnings.push("🚨 eGFR < 30 ml/min：Metformin 禁用（蓄積乳酸中毒風險），處方中已自動排除。");
    }

    // SGLT-2i logic
    if (isKeto) {
      warnings.push("🚨 生酮/極低碳水飲食警告：SGLT-2 抑制劑併用生酮極易誘發【正常血糖型酮酸中毒 (euDKA)】！在調整飲食前禁止啟動排糖藥。");
    } else if (egfr >= 20) {
      if (isFrail && state.frailty === 'moderate_severe') {
        warnings.push("⚠️ 重度衰弱評估：患者體液不足或低血壓風險高，慎用 SGLT-2 抑制劑，建議以 DPP-4 抑制劑為優先。");
        drugs.push({ name: "DPP-4 抑制劑 (安全首選)", type: "glp1", tag: "衰弱安全首選" });
      } else {
        drugs.push({
          name: "SGLT-2 抑制劑 (Dapa / Empa)",
          type: "primary",
          tag: hasHF ? "心衰竭首選" : (egfr < 30 ? "腎臟保護基石" : "心腎保護基石")
        });
        if (egfr < 30 && egfr >= 20) {
          rationale.push("2026 重大更新：eGFR 20～30 ml/min 仍可啟動/續用 SGLT-2i (Dapagliflozin/Empagliflozin) 延緩洗腎！");
          drugs.push({ name: "DPP-4 抑制劑 (補足降糖)", type: "glp1", tag: "輔助降糖" });
        }
      }
    } else {
      // eGFR < 20
      drugs.push({ name: "DPP-4 抑制劑 (Linagliptin 等)", type: "primary", tag: "末期腎病首選" });
      rationale.push("eGFR < 20 ml/min：SGLT-2 抑制劑停用，首選安全性高之 DPP-4 抑制劑。");
    }

    // GLP-1 RA / Tirzepatide logic
    if (hasASCVD || state.stroke) {
      drugs.push({
        name: "GLP-1 受體促效劑 (Semaglutide 1mg/週 / Liraglutide / Dulaglutide)",
        type: "glp1",
        tag: state.stroke ? "腦血管保護/降中風" : "ASCVD 心血管保護"
      });
      rationale.push("腦血管/ASCVD 實證：GLP-1 RA 顯著降低非致死性中風 (Non-fatal Stroke) 24%～39% 與 3-item MACE！");
    } else if (isEarlyOnset) {
      drugs.push({
        name: "GLP-1 RA 或 Tirzepatide (猛健樂)",
        type: "glp1",
        tag: "早發型 (<40歲) 積極三聯"
      });
      rationale.push("1.16 節早發型亮點：<40歲發病者累積心腎風險極高，強烈建議早期併用 GLP-1 RA 或 Tirzepatide 強化治療！");
    } else if (isObese && egfr >= 30) {
      drugs.push({
        name: "GLP-1 RA 或 Tirzepatide (減重導向)",
        type: "glp1",
        tag: "肥胖代謝合併"
      });
      rationale.push("肥胖合併第 2 型糖尿病：優先選用具備減重 5%～15%+ 效益之腸泌素針劑。");
    }

    // Warnings on SU & TZD
    if (hasHF) {
      warnings.push("🚫 心臟衰竭禁忌：嚴禁使用 TZD (Pioglitazone 吡格列酮)，防範水分滯留加重心衰！");
    }
    if (egfr < 30 || isFrail) {
      warnings.push("⚠️ 避免使用磺醯尿素類 (SU 類)：腎功能不全或衰弱患者代謝變慢，極易引發致命低血糖與跌倒！");
    }

    // Render HTML
    let drugPillsHtml = drugs.map(d => `
      <div class="drug-pill ${d.type === 'primary' ? 'primary-drug' : 'glp1-drug'}">
        <span>💊</span>
        <div>
          <strong>${d.name}</strong>
          <small style="opacity: 0.85; margin-left: 4px; font-size: 0.75rem;">[${d.tag}]</small>
        </div>
      </div>
    `).join('');

    let warningsHtml = warnings.map(w => `
      <div class="alert-box alert-danger" style="margin-top: 0.6rem;">
        <div>${w}</div>
      </div>
    `).join('');

    let rationaleHtml = rationale.map(r => `
      <li style="margin-bottom: 0.35rem; color: var(--slate-700); font-size: 0.88rem;">✓ ${r}</li>
    `).join('');

    rxContainer.innerHTML = `
      <div class="rx-banner">
        <div class="rx-headline">
          <span>📋</span> 2026 NICE 推薦處方方案
        </div>
        <div style="font-size: 0.9rem; opacity: 0.9;">根據病患心血管、腎功能、年齡與衰弱分期即時計算</div>
        <div class="rx-drugs-list">
          ${drugPillsHtml}
        </div>
      </div>
      ${warningsHtml}
      <div class="card" style="margin-top: 1rem;">
        <div class="card-title" style="font-size: 1rem; margin-bottom: 0.6rem;">🔍 臨床決策實證依據 (Clinical Rationale)</div>
        <ul style="padding-left: 1.2rem; list-style: none;">
          ${rationaleHtml}
        </ul>
      </div>
    `;
  }

  function renderTargetsAndCgm() {
    const targetBox = document.getElementById('target-calc-result');
    const cgmBox = document.getElementById('cgm-calc-result');
    if (!targetBox || !cgmBox) return;

    // HbA1c Target
    let target = "≤ 48 mmol/mol (6.5%)";
    let targetDesc = "生活型態介入 或 使用不具低血糖風險藥物（如 Metformin + SGLT-2i）時的標準目標。在無低血糖負擔下追求最大器官保護。";
    let targetBadge = "badge-emerald";

    if (state.frailty !== 'none' || state.age >= 80) {
      target = "7.5% ～ 8.0%+ (58～64 mmol/mol)";
      targetDesc = "高齡衰弱長者：以生活品質、防跌倒與避免低血糖昏迷為首要，目標彈性放寬。";
      targetBadge = "badge-amber";
    } else if (state.onSu || state.onInsulin) {
      target = "≤ 53 mmol/mol (7.0%)";
      targetDesc = "處方中包含具低血糖風險藥物（磺醯尿素類 SU 或胰島素），需平衡血管保護與防範低血糖。";
      targetBadge = "badge-primary";
    }

    targetBox.innerHTML = `
      <div style="display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.5rem;">
        <span style="font-size: 1.6rem; font-weight: 800; color: var(--primary);">${target}</span>
        <span class="badge ${targetBadge}">個別化目標</span>
      </div>
      <p style="font-size: 0.88rem; color: var(--slate-600);">${targetDesc}</p>
    `;

    // CGM Eligibility
    let eligibleReasons = [];
    if (state.onInsulin) {
      eligibleReasons.push("正在接受胰島素治療（isCGM 具高度成本效益）");
    }
    if (state.hypoUnaware) {
      eligibleReasons.push("伴隨低血糖無自覺症狀 (Hypo-unawareness)，需 CGM 高低警報防昏迷");
    }
    if (state.hasCarer && state.onInsulin) {
      eligibleReasons.push("需照護員協助注射胰島素，CGM 可快速掃描避免訪視間隔低血糖");
    }
    if (state.stroke || state.dysphagia !== 'none') {
      eligibleReasons.push("偏癱或失能長者無法自行採指尖血，CGM 提供免扎針獨立性");
    }

    if (eligibleReasons.length > 0) {
      cgmBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span class="badge badge-emerald" style="font-size: 0.85rem;">✅ 符合 NICE 優先推薦條件</span>
        </div>
        <ul style="font-size: 0.85rem; color: var(--slate-700); padding-left: 1.2rem;">
          ${eligibleReasons.map(r => `<li>✓ ${r}</li>`).join('')}
        </ul>
      `;
    } else {
      cgmBox.innerHTML = `
        <div style="font-size: 0.88rem; color: var(--slate-600);">
          目前未符合胰島素/嚴重低血糖之公費推薦標準。若有血糖劇烈波動疑慮，可自費短期配戴 2～4 週以利評估 TIR 與飲食回饋。
        </div>
      `;
    }
  }

  function renderStagingTimeline() {
    const timelineContainer = document.getElementById('staging-timeline-box');
    if (!timelineContainer) return;

    timelineContainer.innerHTML = `
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-dot">1</div>
          <div class="timeline-content">
            <div class="timeline-title">第 0 週：啟動 Metformin 緩釋錠 (XR)</div>
            <div class="timeline-desc">從 500mg QD 隨餐起步，評估腸胃耐受性，每 1～2 週逐步滴定至最大耐受劑量 (1000mg～2000mg/day)。</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot">2</div>
          <div class="timeline-content">
            <div class="timeline-title">第 2～4 週：毫不延遲加上 SGLT-2 抑制劑</div>
            <div class="timeline-desc">確認 Metformin 耐受後，立即加入 Dapagliflozin 10mg 或 Empagliflozin 10mg；衛教多喝水與生病停藥守則 (Sick Day Rules)。</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot">3</div>
          <div class="timeline-content">
            <div class="timeline-title">第 8～12 週：評估接續加藥 (GLP-1 RA / Tirzepatide)</div>
            <div class="timeline-desc">若為 ASCVD、早發型 (<40歲) 或未達 HbA1c 目標，依序加入週效型 GLP-1 RA (Semaglutide 0.25mg 起) 或 Tirzepatide。</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderClinicalAlerts() {
    // updates reactive widgets if needed
  }

  // Initial Run
  evaluateAll();

  // Print Report Handler
  const printBtn = document.getElementById('btn-print-report');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
});
