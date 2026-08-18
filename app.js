// 2026 NICE NG28 Clinical Interactive Decision Support System
document.addEventListener('DOMContentLoaded', () => {
  const engine = window.ClinicalEngine;
  if (!engine) {
    throw new Error('ClinicalEngine failed to load before app.js');
  }

  // Navigation Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  function activateTab(btn, moveFocus = false) {
    const targetTab = btn.getAttribute('data-tab');
    tabButtons.forEach(b => {
      const selected = b === btn;
      b.classList.toggle('active', selected);
      b.setAttribute('aria-selected', String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    tabPanels.forEach(panel => {
      const selected = panel.id === targetTab;
      panel.classList.toggle('active', selected);
      panel.hidden = !selected;
    });
    if (moveFocus) btn.focus();
  }

  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => activateTab(btn));
    btn.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabButtons.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabButtons.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activateTab(tabButtons[nextIndex], true);
    });
  });

  // Reactive State for Patient Calculator
  const defaultState = { ...engine.defaultState };

  let state = { ...defaultState };

  // DOM Elements for Inputs
  const ageSlider = document.getElementById('calc-age');
  const ageNum = document.getElementById('num-age');
  const diagnosisAgeNum = document.getElementById('num-diagnosis-age');
  const bmiSlider = document.getElementById('calc-bmi');
  const bmiNum = document.getElementById('num-bmi');
  const highRiskEthnicityCheck = document.getElementById('calc-highrisk-ethnicity');
  const egfrSlider = document.getElementById('calc-egfr');
  const egfrNum = document.getElementById('num-egfr');
  const uacrSelect = document.getElementById('calc-uacr');
  
  const ascvdCheck = document.getElementById('calc-ascvd');
  const strokeCheck = document.getElementById('calc-stroke');
  const hfSelect = document.getElementById('calc-hf');
  const frailtySelect = document.getElementById('calc-frailty');
  const sgltFrailtyRiskCheck = document.getElementById('calc-sglt-frailty-risk');
  const dysphagiaSelect = document.getElementById('calc-dysphagia');
  const dietSelect = document.getElementById('calc-diet');

  const onSuCheck = document.getElementById('calc-onsu');
  const onInsulinCheck = document.getElementById('calc-oninsulin');
  const onMdiCheck = document.getElementById('calc-onmdi');
  const recurrentSevereHypoCheck = document.getElementById('calc-recurrenthypo');
  const hypoUnawareCheck = document.getElementById('calc-hypounaware');
  const cannotSelfMonitorCheck = document.getElementById('calc-cannotselfmonitor');
  const needsMonitoringHelpCheck = document.getElementById('calc-needsmonitoringhelp');
  const eightChecksDailyCheck = document.getElementById('calc-eightchecks');

  const resetBtn = document.getElementById('btn-reset-form');
  const numericInputError = document.getElementById('numeric-input-error');

  const numericInputs = [ageNum, diagnosisAgeNum, bmiNum, egfrNum].filter(Boolean);

  function hasInvalidNumericInput() {
    return numericInputs.some(input => input.getAttribute('aria-invalid') === 'true');
  }

  function updateReportActionAvailability() {
    const invalid = hasInvalidNumericInput();
    document.querySelectorAll('#btn-open-report, #btn-quick-copy, #btn-modal-copy, #btn-modal-download, #btn-modal-print')
      .forEach(button => { button.disabled = invalid; });
  }

  function updateNumericErrorMessage() {
    if (!numericInputError) return;
    const invalidInputs = numericInputs.filter(input => input.getAttribute('aria-invalid') === 'true');
    if (invalidInputs.length === 0) {
      numericInputError.hidden = true;
      numericInputError.textContent = '';
      return;
    }
    const names = invalidInputs.map(input => input.getAttribute('aria-label') || '數值欄位');
    numericInputError.textContent = `請修正：${names.join('、')}（請輸入範圍內且符合步進的數值）。`;
    numericInputError.hidden = false;
  }

  function setNumericValidity(input, valid) {
    input.setAttribute('aria-invalid', String(!valid));
    updateReportActionAvailability();
    updateNumericErrorMessage();
  }

  function updateNumericState(slider, num, value, stateKey) {
    slider.value = value;
    if (stateKey === 'age') {
      const ages = engine.normalizeAges(value, state.diagnosisAge);
      state.age = ages.age;
      state.diagnosisAge = ages.diagnosisAge;
      if (diagnosisAgeNum) {
        diagnosisAgeNum.value = ages.diagnosisAge;
        setNumericValidity(diagnosisAgeNum, true);
      }
    } else {
      state[stateKey] = value;
    }
    setNumericValidity(num, true);
    evaluateAll();
  }

  // Sync Slider & Number Input Helper
  function bindSliderAndNum(slider, num, min, max, step, stateKey, isFloat = false) {
    if (!slider || !num) return;

    slider.addEventListener('input', (e) => {
      const val = engine.normalizeNumber(e.target.value, min, max, step);
      if (val === null) return;
      num.value = isFloat ? val.toFixed(1) : val;
      updateNumericState(slider, num, val, stateKey);
    });

    num.addEventListener('input', (e) => {
      const rawValue = e.target.value;
      const enteredValue = Number(rawValue);
      const normalizedValue = engine.normalizeNumber(rawValue, min, max, step);
      const valid = rawValue.trim() !== ''
        && normalizedValue !== null
        && Math.abs(normalizedValue - enteredValue) < 1e-9;
      setNumericValidity(num, valid);
      if (valid) updateNumericState(slider, num, normalizedValue, stateKey);
    });

    const commitNumber = (e) => {
      let val = engine.normalizeNumber(e.target.value, min, max, step);
      if (val === null) val = state[stateKey];
      num.value = isFloat ? val.toFixed(1) : val;
      updateNumericState(slider, num, val, stateKey);
    };
    num.addEventListener('change', commitNumber);
    num.addEventListener('blur', commitNumber);
  }

  bindSliderAndNum(ageSlider, ageNum, 18, 100, 1, 'age', false);
  bindSliderAndNum(bmiSlider, bmiNum, 15.0, 50.0, 0.1, 'bmi', true);
  bindSliderAndNum(egfrSlider, egfrNum, 10, 120, 1, 'egfr', false);

  if (diagnosisAgeNum) {
    diagnosisAgeNum.addEventListener('input', (e) => {
      const rawValue = e.target.value;
      const val = Number(rawValue);
      const normalizedValue = engine.normalizeNumber(rawValue, 18, state.age, 1);
      const valid = rawValue.trim() !== ''
        && normalizedValue !== null
        && Math.abs(normalizedValue - val) < 1e-9;
      setNumericValidity(diagnosisAgeNum, valid);
      if (valid) {
        state.diagnosisAge = normalizedValue;
        evaluateAll();
      }
    });
    const commitDiagnosisAge = (e) => {
      const enteredValue = typeof e.target.value === 'string' && e.target.value.trim() === ''
        ? state.diagnosisAge
        : e.target.value;
      const ages = engine.normalizeAges(state.age, enteredValue);
      diagnosisAgeNum.value = ages.diagnosisAge;
      state.diagnosisAge = ages.diagnosisAge;
      setNumericValidity(diagnosisAgeNum, true);
      evaluateAll();
    };
    diagnosisAgeNum.addEventListener('change', commitDiagnosisAge);
    diagnosisAgeNum.addEventListener('blur', commitDiagnosisAge);
  }

  function syncDependentControls() {
    state = engine.normalizeUiDependencies(state);
    if (sgltFrailtyRiskCheck) {
      sgltFrailtyRiskCheck.disabled = state.frailty === 'none';
      sgltFrailtyRiskCheck.checked = state.sgltFrailtyRisk;
    }
    if (onMdiCheck) {
      onMdiCheck.disabled = !state.onInsulin;
      onMdiCheck.checked = state.onMdi;
    }
    if (needsMonitoringHelpCheck) {
      needsMonitoringHelpCheck.disabled = !state.onInsulin;
      needsMonitoringHelpCheck.checked = state.needsMonitoringHelp;
    }
  }

  if (uacrSelect) uacrSelect.addEventListener('change', (e) => { state.uacr = e.target.value; evaluateAll(); });
  if (highRiskEthnicityCheck) highRiskEthnicityCheck.addEventListener('change', (e) => { state.highRiskEthnicity = e.target.checked; evaluateAll(); });
  if (ascvdCheck) ascvdCheck.addEventListener('change', (e) => { state.ascvd = e.target.checked; evaluateAll(); });
  if (strokeCheck) strokeCheck.addEventListener('change', (e) => { state.stroke = e.target.checked; evaluateAll(); });
  if (hfSelect) hfSelect.addEventListener('change', (e) => { state.hf = e.target.value; evaluateAll(); });
  if (frailtySelect) frailtySelect.addEventListener('change', (e) => {
    state.frailty = e.target.value;
    syncDependentControls();
    evaluateAll();
  });
  if (sgltFrailtyRiskCheck) sgltFrailtyRiskCheck.addEventListener('change', (e) => { state.sgltFrailtyRisk = e.target.checked; evaluateAll(); });
  if (dysphagiaSelect) dysphagiaSelect.addEventListener('change', (e) => { state.dysphagia = e.target.value; evaluateAll(); });
  if (dietSelect) dietSelect.addEventListener('change', (e) => { state.diet = e.target.value; evaluateAll(); });
  
  if (onSuCheck) onSuCheck.addEventListener('change', (e) => { state.onSu = e.target.checked; evaluateAll(); });
  if (onInsulinCheck) onInsulinCheck.addEventListener('change', (e) => {
    state.onInsulin = e.target.checked;
    syncDependentControls();
    evaluateAll();
  });
  if (onMdiCheck) onMdiCheck.addEventListener('change', (e) => { state.onMdi = e.target.checked; evaluateAll(); });
  if (recurrentSevereHypoCheck) recurrentSevereHypoCheck.addEventListener('change', (e) => { state.recurrentSevereHypo = e.target.checked; evaluateAll(); });
  if (hypoUnawareCheck) hypoUnawareCheck.addEventListener('change', (e) => { state.hypoUnaware = e.target.checked; evaluateAll(); });
  if (cannotSelfMonitorCheck) cannotSelfMonitorCheck.addEventListener('change', (e) => { state.cannotSelfMonitor = e.target.checked; evaluateAll(); });
  if (needsMonitoringHelpCheck) needsMonitoringHelpCheck.addEventListener('change', (e) => { state.needsMonitoringHelp = e.target.checked; evaluateAll(); });
  if (eightChecksDailyCheck) eightChecksDailyCheck.addEventListener('change', (e) => { state.eightChecksDaily = e.target.checked; evaluateAll(); });

  // Reset Handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state = { ...defaultState };
      if (ageSlider) ageSlider.value = state.age;
      if (ageNum) ageNum.value = state.age;
      if (diagnosisAgeNum) diagnosisAgeNum.value = state.diagnosisAge;
      if (bmiSlider) bmiSlider.value = state.bmi;
      if (bmiNum) bmiNum.value = state.bmi;
      if (highRiskEthnicityCheck) highRiskEthnicityCheck.checked = state.highRiskEthnicity;
      if (egfrSlider) egfrSlider.value = state.egfr;
      if (egfrNum) egfrNum.value = state.egfr;
      if (uacrSelect) uacrSelect.value = state.uacr;
      if (ascvdCheck) ascvdCheck.checked = state.ascvd;
      if (strokeCheck) strokeCheck.checked = state.stroke;
      if (hfSelect) hfSelect.value = state.hf;
      if (frailtySelect) frailtySelect.value = state.frailty;
      if (sgltFrailtyRiskCheck) sgltFrailtyRiskCheck.checked = state.sgltFrailtyRisk;
      if (dysphagiaSelect) dysphagiaSelect.value = state.dysphagia;
      if (dietSelect) dietSelect.value = state.diet;
      if (onSuCheck) onSuCheck.checked = state.onSu;
      if (onInsulinCheck) onInsulinCheck.checked = state.onInsulin;
      if (onMdiCheck) onMdiCheck.checked = state.onMdi;
      if (recurrentSevereHypoCheck) recurrentSevereHypoCheck.checked = state.recurrentSevereHypo;
      if (hypoUnawareCheck) hypoUnawareCheck.checked = state.hypoUnaware;
      if (cannotSelfMonitorCheck) cannotSelfMonitorCheck.checked = state.cannotSelfMonitor;
      if (needsMonitoringHelpCheck) needsMonitoringHelpCheck.checked = state.needsMonitoringHelp;
      if (eightChecksDailyCheck) eightChecksDailyCheck.checked = state.eightChecksDaily;
      numericInputs.forEach(input => input.setAttribute('aria-invalid', 'false'));
      syncDependentControls();
      updateReportActionAvailability();
      updateNumericErrorMessage();

      evaluateAll();
      showToast('已重設為預設病患參數！');
    });
  }

  // Core Clinical Decision Engine
  function evaluateAll() {
    renderRecommendation();
    renderTargetsAndCgm();
    renderStagingTimeline();
    if (reportModal && reportModal.style.display === 'flex') updatePrintableReport();
  }

  function getCalculatedData() {
    return engine.calculate(state);
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
          目前輸入條件未符合 NICE NG28 1.7 的 CGM 優先推薦條件。仍可由具 CGM 專業的照護團隊進行個別評估。
        </div>
      `;
    }
  }

  function renderStagingTimeline() {
    const timelineContainer = document.getElementById('staging-timeline-box');
    if (!timelineContainer) return;

    const data = getCalculatedData();
    const stepsHtml = data.timeline.map((step, index) => `
      <div class="timeline-item">
        <div class="timeline-dot">${index + 1}</div>
        <div class="timeline-content">
          <div class="timeline-title">${step.title}</div>
          <div class="timeline-desc">${step.description}</div>
        </div>
      </div>
    `).join('');

    timelineContainer.innerHTML = `
      <div class="timeline">
        ${stepsHtml || '<div class="alert-box alert-danger">目前沒有可自動建議的初始藥物，請轉介糖尿病專科進行個別評估。</div>'}
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
    const cgmCriteriaSummary = [
      state.onInsulin && '胰島素治療',
      state.onMdi && '多次每日胰島素注射',
      state.recurrentSevereHypo && '反覆／嚴重低血糖',
      state.hypoUnaware && '低血糖感知受損',
      state.cannotSelfMonitor && '無法自行指尖採血',
      state.needsMonitoringHelp && '需要他人協助監測',
      state.eightChecksDaily && '每日至少 8 次指尖採血'
    ].filter(Boolean).join('；') || '未勾選特定條件';

    let drugsListHtml = data.drugs.map((d, i) => `<tr><td><strong>${i + 1}. ${d.name}</strong></td><td>${d.tag}</td></tr>`).join('');
    let warningsListHtml = data.warnings.map(w => `<div class="doc-alert">${w}</div>`).join('');
    let cgmHtml = data.eligibleReasons.length > 0 ? data.eligibleReasons.map(r => `<li>✓ ${r}</li>`).join('') : '<li>目前輸入條件未符合 NICE NG28 1.7 優先推薦條件，請由專業團隊個別評估。</li>';

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
            <td style="width: 25%;">目前 ${state.age} 歲；確診 ${state.diagnosisAge} 歲 ${data.clinicalFlags.isEarlyOnset ? '<strong style="color: #b91c1c;">(早發型)</strong>' : ''}</td>
            <th style="width: 25%;">身體質量指數 (BMI)</th>
            <td style="width: 25%;">${state.bmi.toFixed(1)} kg/m² ${data.clinicalFlags.isObese ? `(達肥胖門檻 ${data.clinicalFlags.obesityThreshold})` : ''}<br><small>族群相關 BMI 門檻：${state.highRiskEthnicity ? '已啟用 27.5' : '一般 30'}</small></td>
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
            <th>缺血性腦中風 / TIA 病史</th>
            <td>${state.stroke ? '✓ 確診缺血性腦中風或 TIA' : '無'}</td>
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
          <tr>
            <th>SGLT-2 衰弱風險</th>
            <td>${state.sgltFrailtyRisk ? '已勾選（體液不足／低血壓）' : '未勾選'}</td>
            <th>CGM 判定條件</th>
            <td>${cgmCriteriaSummary}</td>
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
          <span style="color: #b91c1c;">⚠️ 注意：正在施打胰島素者【絕不可自行停打基礎胰島素】！若無限水醫囑可少量頻繁補水；心衰竭或重度腎病者請依醫療團隊指示。重啟用藥時點須依病況與醫囑。</span>
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
    text += `• 目前年齡：${state.age} 歲 | 確診年齡：${state.diagnosisAge} 歲 ${data.clinicalFlags.isEarlyOnset ? '(早發型)' : ''}\n`;
    text += `• BMI：${state.bmi.toFixed(1)} kg/m² | 族群相關 BMI 門檻：${state.highRiskEthnicity ? '已啟用 27.5' : '一般 30'}\n`;
    text += `• 腎功能：eGFR ${state.egfr} ml/min | UACR：${state.uacr}\n`;
    text += `• 心血管狀況：ASCVD: ${state.ascvd ? '是' : '否'} | 缺血性腦中風/TIA: ${state.stroke ? '是' : '否'} | 心衰竭: ${state.hf}\n`;
    text += `• 衰弱症：${state.frailty} | SGLT-2 衰弱風險：${state.sgltFrailtyRisk ? '是' : '否'} | 吞嚥功能：${state.dysphagia} | 飲食：${state.diet}\n`;
    text += `• CGM 判定條件：胰島素 ${state.onInsulin ? '是' : '否'}／MDI ${state.onMdi ? '是' : '否'}／嚴重低血糖 ${state.recurrentSevereHypo ? '是' : '否'}／感知受損 ${state.hypoUnaware ? '是' : '否'}／無法自測 ${state.cannotSelfMonitor ? '是' : '否'}／需協助 ${state.needsMonitoringHelp ? '是' : '否'}／每日≥8次 ${state.eightChecksDaily ? '是' : '否'}\n\n`;
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
    } else {
      text += `• CGM 建議：目前輸入條件未符合 NICE 1.7 優先推薦條件。\n`;
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
  const modalDialog = reportModal ? reportModal.querySelector('.modal-dialog') : null;
  const modalBackground = [document.querySelector('header'), document.querySelector('main')].filter(Boolean);
  let previouslyFocusedElement = null;

  function openModal() {
    if (hasInvalidNumericInput()) {
      const firstInvalid = numericInputs.find(input => input.getAttribute('aria-invalid') === 'true');
      if (firstInvalid) firstInvalid.focus();
      showToast('請先修正超出範圍或空白的數值欄位。');
      return;
    }
    updatePrintableReport();
    previouslyFocusedElement = document.activeElement;
    if (reportModal) reportModal.style.display = 'flex';
    modalBackground.forEach(background => { background.inert = true; });
    if (closeModalBtn) closeModalBtn.focus();
    else if (modalDialog) modalDialog.focus();
  }

  function closeModal() {
    if (reportModal) reportModal.style.display = 'none';
    modalBackground.forEach(background => { background.inert = false; });
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
      previouslyFocusedElement.focus();
    }
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
    if (!reportModal || reportModal.style.display !== 'flex') return;
    if (e.key === 'Escape') return closeModal();
    if (e.key !== 'Tab') return;

    const focusable = Array.from(reportModal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    if (focusable.length === 0) {
      e.preventDefault();
      if (modalDialog) modalDialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
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
  syncDependentControls();
  evaluateAll();
});
