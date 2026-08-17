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
  const defaultState = {
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

  let state = { ...defaultState };

  // DOM Elements for Inputs
  const ageSlider = document.getElementById('calc-age');
  const ageNum = document.getElementById('num-age');
  const bmiSlider = document.getElementById('calc-bmi');
  const bmiNum = document.getElementById('num-bmi');
  const egfrSlider = document.getElementById('calc-egfr');
  const egfrNum = document.getElementById('num-egfr');
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

  const resetBtn = document.getElementById('btn-reset-form');

  // Sync Slider & Number Input Helper
  function bindSliderAndNum(slider, num, min, max, step, stateKey, isFloat = false) {
    if (!slider || !num) return;

    slider.addEventListener('input', (e) => {
      const val = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
      num.value = isFloat ? val.toFixed(1) : val;
      state[stateKey] = val;
      evaluateAll();
    });

    num.addEventListener('input', (e) => {
      let val = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
      if (isNaN(val)) return;
      if (val < min) val = min;
      if (val > max) val = max;
      slider.value = val;
      state[stateKey] = val;
      evaluateAll();
    });
  }

  bindSliderAndNum(ageSlider, ageNum, 18, 100, 1, 'age', false);
  bindSliderAndNum(bmiSlider, bmiNum, 15.0, 50.0, 0.1, 'bmi', true);
  bindSliderAndNum(egfrSlider, egfrNum, 10, 120, 1, 'egfr', false);

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

  // Reset Handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state = { ...defaultState };
      if (ageSlider) ageSlider.value = state.age;
      if (ageNum) ageNum.value = state.age;
      if (bmiSlider) bmiSlider.value = state.bmi;
      if (bmiNum) bmiNum.value = state.bmi;
      if (egfrSlider) egfrSlider.value = state.egfr;
      if (egfrNum) egfrNum.value = state.egfr;
      if (uacrSelect) uacrSelect.value = state.uacr;
      if (ascvdCheck) ascvdCheck.checked = state.ascvd;
      if (strokeCheck) strokeCheck.checked = state.stroke;
      if (hfSelect) hfSelect.value = state.hf;
      if (frailtySelect) frailtySelect.value = state.frailty;
      if (dysphagiaSelect) dysphagiaSelect.value = state.dysphagia;
      if (dietSelect) dietSelect.value = state.diet;
      if (onSuCheck) onSuCheck.checked = state.onSu;
      if (onInsulinCheck) onInsulinCheck.checked = state.onInsulin;
      if (hypoUnawareCheck) hypoUnawareCheck.checked = state.hypoUnaware;
      if (hasCarerCheck) hasCarerCheck.checked = state.hasCarer;

      evaluateAll();
      showToast('已重設為預設病患參數！');
    });
  }

  // Core Clinical Decision Engine
  function evaluateAll() {
    renderRecommendation();
    renderTargetsAndCgm();
    renderStagingTimeline();
    updatePrintableReport();
  }

  function getCalculatedData() {
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

    // Target
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

    // CGM Eligibility
    let eligibleReasons = [];
    if (state.onInsulin) eligibleReasons.push("正在接受胰島素治療（isCGM 具高度成本效益）");
    if (state.hypoUnaware) eligibleReasons.push("伴隨低血糖無自覺症狀 (Hypo-unawareness)，需 CGM 高低警報防昏迷");
    if (state.hasCarer && state.onInsulin) eligibleReasons.push("需照護員協助注射胰島素，CGM 可快速掃描避免訪視間隔低血糖");
    if (state.stroke || state.dysphagia !== 'none') eligibleReasons.push("偏癱或失能長者無法自行採指尖血，CGM 提供免扎針獨立性");

    return {
      drugs,
      warnings,
      rationale,
      target,
      targetDesc,
      targetBadge,
      eligibleReasons
    };
  }

  function renderRecommendation() {
    const rxContainer = document.getElementById('rx-result-container');
    if (!rxContainer) return;

    const data = getCalculatedData();

    let drugPillsHtml = data.drugs.map(d => `
      <div class="drug-pill ${d.type === 'primary' ? 'primary-drug' : 'glp1-drug'}">
        <span>💊</span>
        <div>
          <strong>${d.name}</strong>
          <small style="opacity: 0.85; margin-left: 4px; font-size: 0.75rem;">[${d.tag}]</small>
        </div>
      </div>
    `).join('');

    let warningsHtml = data.warnings.map(w => `
      <div class="alert-box alert-danger" style="margin-top: 0.6rem;">
        <div>${w}</div>
      </div>
    `).join('');

    let rationaleHtml = data.rationale.map(r => `
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

    const data = getCalculatedData();

    targetBox.innerHTML = `
      <div style="display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.5rem;">
        <span style="font-size: 1.6rem; font-weight: 800; color: var(--primary);">${data.target}</span>
        <span class="badge ${data.targetBadge}">個別化目標</span>
      </div>
      <p style="font-size: 0.88rem; color: var(--slate-600);">${data.targetDesc}</p>
    `;

    if (data.eligibleReasons.length > 0) {
      cgmBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span class="badge badge-emerald" style="font-size: 0.85rem;">✅ 符合 NICE 優先推薦條件</span>
        </div>
        <ul style="font-size: 0.85rem; color: var(--slate-700); padding-left: 1.2rem;">
          ${data.eligibleReasons.map(r => `<li>✓ ${r}</li>`).join('')}
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

  // Generate Report HTML for Modal & Printing
  function updatePrintableReport() {
    const reportContainer = document.getElementById('printable-report-content');
    const timestampSpan = document.getElementById('modal-timestamp');
    if (!reportContainer) return;

    const data = getCalculatedData();
    const now = new Date();
    const dateStr = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    
    if (timestampSpan) timestampSpan.textContent = `產出時間：${dateStr}`;

    const uacrLabels = { normal: '正常 (< 3 mg/mmol)', micro: '微量白蛋白尿 (3～30 mg/mmol)', macro: '巨量白蛋白尿 (> 30 mg/mmol)' };
    const hfLabels = { none: '無', hfref: 'HFrEF (收縮分率降低)', hfpef: 'HFpEF (收縮分率保留)' };
    const frailtyLabels = { none: '正常無衰弱', mild: '輕度衰弱', moderate_severe: '中重度衰弱 (高跌倒風險)' };
    const dysphagiaLabels = { none: '正常', mild: '吞嚥困難 (需磨粉/稠化)', ng_tube: '鼻胃管 / 胃造廔管灌' };
    const dietLabels = { standard: '一般均衡原型飲食', keto: '生酮 / 極低碳水飲食' };

    let drugsListHtml = data.drugs.map((d, i) => `<tr><td><strong>${i + 1}. ${d.name}</strong></td><td>${d.tag}</td></tr>`).join('');
    let warningsListHtml = data.warnings.map(w => `<div class="doc-alert">${w}</div>`).join('');
    let cgmHtml = data.eligibleReasons.length > 0 ? data.eligibleReasons.map(r => `<li>✓ ${r}</li>`).join('') : '<li>目前未符合常規公費推薦條件，必要時可短期自費評估。</li>';

    reportContainer.innerHTML = `
      <div class="doc-header">
        <div>
          <h2>第 2 型糖尿病臨床諮詢與處方決策摘要報告</h2>
          <div style="font-size: 0.9rem; font-weight: 600; color: #475569; margin-top: 2px;">依據英國 NICE NG28 (2026 更新版)、NG128 (中風) & NG236 臨床指引</div>
        </div>
        <div class="doc-meta">
          <div><strong>報告產出日期：</strong> ${dateStr}</div>
          <div><strong>臨床決策版本：</strong> NICE NG28 2026.02</div>
        </div>
      </div>

      <!-- Section 1: Patient Profile -->
      <div class="doc-section">
        <div class="doc-section-title">一、 病患生理指標與風險分期 (Pre-treatment Staging, Section 1.11)</div>
        <table class="doc-table">
          <tr>
            <th style="width: 25%;">病患年齡</th>
            <td style="width: 25%;">${state.age} 歲 ${state.age < 40 ? '<strong style="color: #b91c1c;">(年輕早發型)</strong>' : ''}</td>
            <th style="width: 25%;">身體質量指數 (BMI)</th>
            <td style="width: 25%;">${state.bmi.toFixed(1)} kg/m² ${state.bmi >= 27.5 ? '(合併肥胖)' : ''}</td>
          </tr>
          <tr>
            <th>腎功能 (eGFR)</th>
            <td><strong>${state.egfr} ml/min</strong> ${state.egfr < 30 ? '<span style="color:#b91c1c;">(CKD Stage 4-5)</span>' : ''}</td>
            <th>尿蛋白比值 (UACR)</th>
            <td>${uacrLabels[state.uacr] || state.uacr}</td>
          </tr>
          <tr>
            <th>動脈硬化心血管 (ASCVD)</th>
            <td>${state.ascvd ? '✓ 確診心血管疾病 (MI/PAD/CAD)' : '無'}</td>
            <th>腦中風 / TIA 病史</th>
            <td>${state.stroke ? '✓ 確診腦中風或 TIA' : '無'}</td>
          </tr>
          <tr>
            <th>心臟衰竭 (Heart Failure)</th>
            <td>${hfLabels[state.hf] || state.hf}</td>
            <th>衰弱症評估 (Frailty)</th>
            <td>${frailtyLabels[state.frailty] || state.frailty}</td>
          </tr>
          <tr>
            <th>吞嚥功能 (Dysphagia)</th>
            <td>${dysphagiaLabels[state.dysphagia] || state.dysphagia}</td>
            <th>飲食型態 (Diet Type)</th>
            <td>${dietLabels[state.diet] || state.diet}</td>
          </tr>
        </table>
      </div>

      <!-- Section 2: Recommended Regimen -->
      <div class="doc-section">
        <div class="doc-section-title">二、 NICE 2026 推薦處方方案與給藥階梯 (Recommended Regimen & Staging)</div>
        <table class="doc-table">
          <thead>
            <tr>
              <th style="width: 65%;">推薦藥物與劑型</th>
              <th style="width: 35%;">臨床定位與指引實證</th>
            </tr>
          </thead>
          <tbody>
            ${drugsListHtml}
          </tbody>
        </table>
        ${warningsListHtml}
      </div>

      <!-- Section 3: Glycaemic Targets & CGM -->
      <div class="doc-section">
        <div class="doc-section-title">三、 個人化糖化血色素目標與 CGM 評估 (Glycaemic Target & CGM)</div>
        <div class="doc-grid-2">
          <div style="border: 1px solid #cbd5e1; padding: 0.75rem; border-radius: 6px;">
            <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">🎯 個人化 HbA1c 目標：${data.target}</div>
            <div style="font-size: 0.85rem; color: #475569;">${data.targetDesc}</div>
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 0.75rem; border-radius: 6px;">
            <div style="font-weight: 700; color: #0d9488; margin-bottom: 4px;">📱 連續血糖監測 (CGM) 適應症：</div>
            <ul style="font-size: 0.85rem; color: #475569; padding-left: 1.2rem; margin: 0;">
              ${cgmHtml}
            </ul>
          </div>
        </div>
      </div>

      <!-- Section 4: Sick Day Rules -->
      <div class="doc-section">
        <div class="doc-section-title">四、 生病停藥守則（Sick Day Rules - SADMANS）病患須知</div>
        <div style="font-size: 0.85rem; line-height: 1.5; background: #f8fafc; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px;">
          <strong>當發生急性發燒、持續嘔吐、嚴重腹瀉面臨脫水時，請依醫囑暫停以下藥物：</strong><br>
          • <strong>S</strong>GLT-2 抑制劑（排糖藥）｜• <strong>A</strong>CEI/ARB（降血壓藥）｜• <strong>D</strong>iuretics（利尿劑）｜• <strong>M</strong>etformin（雙胍類）｜• <strong>A/N</strong>SAIDs（消炎止痛藥）｜• <strong>S</strong>ulfonylureas（磺醯尿素促泌劑）。<br>
          <span style="color: #b91c1c;">⚠️ 注意：正在施打胰島素者【絕不可自行停打基礎胰島素】！每小時補充 100～200ml 水分，症狀緩解正常進食 24～48 小時後再重啟用藥。</span>
        </div>
      </div>

      <!-- Footer Sign-off Block -->
      <div class="doc-footer-sign">
        <div>臨床主治醫師 / 衛教師簽章：_______________________</div>
        <div>諮詢院所 / 科別：_______________________</div>
      </div>
    `;
  }

  // Generate Clean Plain Text for Clipboard EMR Paste
  function generateReportText() {
    const data = getCalculatedData();
    const now = new Date();
    const dateStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate();

    let text = `【NICE 2026 第 2 型糖尿病臨床決策與處方摘要報告】\n`;
    text += `產出日期：${dateStr}\n`;
    text += `指引依據：NICE NG28 (2026 Updated), NG128 & NG236\n\n`;
    text += `[一、病患臨床資料 (Pre-treatment Staging)]\n`;
    text += `• 年齡：${state.age} 歲 ${state.age < 40 ? '(<40歲 早發型)' : ''}\n`;
    text += `• BMI：${state.bmi.toFixed(1)} kg/m²\n`;
    text += `• 腎功能：eGFR ${state.egfr} ml/min | UACR：${state.uacr}\n`;
    text += `• 心血管狀況：ASCVD: ${state.ascvd ? '是' : '否'} | 腦中風/TIA: ${state.stroke ? '是' : '否'} | 心衰竭: ${state.hf}\n`;
    text += `• 衰弱症：${state.frailty} | 吞嚥功能：${state.dysphagia} | 飲食：${state.diet}\n\n`;
    text += `[二、2026 NICE 推薦處方方案]\n`;
    data.drugs.forEach((d, i) => {
      text += `${i + 1}. ${d.name} [${d.tag}]\n`;
    });
    if (data.warnings.length > 0) {
      text += `\n[重大用藥安全警語]\n`;
      data.warnings.forEach(w => { text += `• ${w}\n`; });
    }
    text += `\n[三、控制目標與 CGM 建議]\n`;
    text += `• 個人化 HbA1c 目標：${data.target} (${data.targetDesc})\n`;
    if (data.eligibleReasons.length > 0) {
      text += `• CGM 建議：符合 NICE 優先推薦條件 (${data.eligibleReasons.join('；')})\n`;
    }
    text += `\n[四、生病停藥守則 (Sick Day Rules)]\n`;
    text += `生病發燒/腹瀉脫水時暫停 SADMANS 藥物 (SGLT-2i, ACEI/ARB, Diuretics, Metformin, NSAIDs, SU)；打胰島素者切勿停用基礎胰島素！\n`;
    
    return text;
  }

  // Toast Notification Helper
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = `<span>✓</span> <div>${msg}</div>`;
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  // Modal & Print Actions
  const reportModal = document.getElementById('report-modal');
  const openReportBtn = document.getElementById('btn-open-report');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const modalPrintBtn = document.getElementById('btn-modal-print');
  const modalCopyBtn = document.getElementById('btn-modal-copy');
  const quickCopyBtn = document.getElementById('btn-quick-copy');
  const modalDownloadBtn = document.getElementById('btn-modal-download');

  function openModal() {
    updatePrintableReport();
    if (reportModal) reportModal.style.display = 'flex';
  }

  function closeModal() {
    if (reportModal) reportModal.style.display = 'none';
  }

  if (openReportBtn) openReportBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  // Close modal when clicking on backdrop
  if (reportModal) {
    reportModal.addEventListener('click', (e) => {
      if (e.target === reportModal) closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && reportModal && reportModal.style.display === 'flex') {
      closeModal();
    }
  });

  // Print Action
  if (modalPrintBtn) {
    modalPrintBtn.addEventListener('click', () => {
      updatePrintableReport();
      window.print();
    });
  }

  // Copy to Clipboard Action
  function copyReport() {
    const text = generateReportText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('已成功複製臨床報告文字！可直接貼入病歷或通訊軟體。');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('已成功複製臨床報告文字！');
    } catch (err) {
      alert('複製失敗，請手動複製報告內容。');
    }
    document.body.removeChild(ta);
  }

  if (modalCopyBtn) modalCopyBtn.addEventListener('click', copyReport);
  if (quickCopyBtn) quickCopyBtn.addEventListener('click', copyReport);

  // Download Report as TXT file
  if (modalDownloadBtn) {
    modalDownloadBtn.addEventListener('click', () => {
      const text = generateReportText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NICE_2026_Diabetes_Report_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('已開始下載文字報告檔案 (.txt)！');
    });
  }

  // Initial Run
  evaluateAll();
});
