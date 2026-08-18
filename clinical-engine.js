(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClinicalEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const defaultState = {
    age: 52,
    diagnosisAge: 45,
    bmi: 28.5,
    highRiskEthnicity: true,
    egfr: 65,
    uacr: 'normal',
    ascvd: false,
    stroke: false,
    hf: 'none',
    frailty: 'none',
    sgltFrailtyRisk: false,
    dysphagia: 'none',
    diet: 'standard',
    onSu: false,
    onInsulin: false,
    onMdi: false,
    recurrentSevereHypo: false,
    hypoUnaware: false,
    cannotSelfMonitor: false,
    needsMonitoringHelp: false,
    eightChecksDaily: false
  };

  function clampNumber(value, min, max) {
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(max, Math.max(min, parsed));
  }

  function normalizeNumber(value, min, max, step = 1) {
    const clamped = clampNumber(value, min, max);
    if (clamped === null) return null;
    const precision = (String(step).split('.')[1] || '').length;
    const snapped = min + Math.round((clamped - min) / step) * step;
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(precision));
  }

  function normalizeUiDependencies(input = {}) {
    const normalized = { ...input };
    if (normalized.frailty === 'none') normalized.sgltFrailtyRisk = false;
    if (!normalized.onInsulin) {
      normalized.onMdi = false;
      normalized.needsMonitoringHelp = false;
    }
    return normalized;
  }

  function normalizeAges(ageValue, diagnosisAgeValue) {
    const parsedAge = normalizeNumber(ageValue, 18, 100, 1);
    const age = parsedAge === null ? defaultState.age : parsedAge;
    const parsedDiagnosisAge = normalizeNumber(diagnosisAgeValue, 18, age, 1);
    const diagnosisAge = parsedDiagnosisAge === null
      ? Math.min(defaultState.diagnosisAge, age)
      : parsedDiagnosisAge;
    return { age, diagnosisAge };
  }

  function calculate(input = {}) {
    const state = { ...defaultState, ...input };
    const drugs = [];
    const warnings = [];
    const rationale = [];
    const isEarlyOnset = state.diagnosisAge < 40;
    const obesityThreshold = state.highRiskEthnicity ? 27.5 : 30;
    const isObese = state.bmi >= obesityThreshold;
    const hasHF = state.hf !== 'none';
    const hasASCVD = state.ascvd || state.stroke;
    const isFrail = state.frailty !== 'none';
    const hasDysphagia = state.dysphagia !== 'none';
    const isKeto = state.diet === 'keto';
    const egfr = state.egfr;

    if (egfr > 30) {
      if (hasDysphagia) {
        drugs.push({
          name: 'Metformin 標準速效劑型或口服液（先由藥師確認）',
          type: 'primary',
          tag: '第一線基石（速效／液體）'
        });
        warnings.push('⚠️ 吞嚥困難注意：緩釋型 Metformin XR 不可磨粉管灌；改用標準速效劑型或口服液前，須由藥師確認特定產品與管灌方式。');
      } else {
        drugs.push({
          name: 'Metformin 緩釋劑型 (Modified-Release XR)',
          type: 'primary',
          tag: '第一線基石'
        });
      }
      rationale.push('NICE NG28 1.13：無禁忌或不耐受時，初始藥物包含 modified-release metformin。');
    } else {
      warnings.push('🚨 eGFR ≤ 30 ml/min/1.73m²：初始處方不使用 Metformin。');
    }

    if (isKeto) {
      warnings.push('🚨 生酮／極低碳水飲食警告：使用 SGLT-2 抑制劑會增加正常血糖型酮酸中毒 (euDKA) 風險，調整飲食前不啟動。');
      if (egfr <= 30) {
        drugs.push({ name: 'DPP-4 抑制劑', type: 'primary', tag: '腎功能考量' });
      }
    } else if (egfr >= 20 && egfr <= 30) {
      if (state.sgltFrailtyRisk) {
        warnings.push('⚠️ 衰弱相關體液不足或低血壓風險：不自動推薦 SGLT-2 抑制劑，須個別評估。');
        drugs.push({ name: 'DPP-4 抑制劑', type: 'glp1', tag: '衰弱風險單一治療考量' });
        rationale.push('NICE NG28 1.18.2 的標準方案包含 dapagliflozin 或 empagliflozin 與 DPP-4 抑制劑；但依 1.19.2，若衰弱增加 SGLT-2 不良事件風險，考慮以 DPP-4 抑制劑單一治療。');
      } else {
        drugs.push({
          name: 'Dapagliflozin 或 Empagliflozin',
          type: 'primary',
          tag: 'eGFR 20～30 指定選項'
        });
        drugs.push({ name: 'DPP-4 抑制劑', type: 'glp1', tag: 'eGFR 20～30 合併用藥' });
        rationale.push('NICE NG28 1.18.2：eGFR 20～30（含 30）使用 dapagliflozin 或 empagliflozin，並合併 DPP-4 抑制劑。');
      }
    } else if (egfr > 30) {
      if (state.sgltFrailtyRisk) {
        warnings.push('⚠️ 衰弱相關體液不足或低血壓風險：不自動推薦 SGLT-2 抑制劑，優先個別評估。');
        rationale.push('NICE NG28 1.19.1：衰弱者提供 modified-release metformin；只有在衰弱程度不會造成體液不足或低血壓等不良事件風險時，才提供 SGLT-2 抑制劑。');
      } else {
        drugs.push({
          name: 'SGLT-2 抑制劑',
          type: 'primary',
          tag: hasHF ? '心衰竭初始用藥' : '心腎保護初始用藥'
        });
      }
    } else {
      drugs.push({ name: 'DPP-4 抑制劑', type: 'primary', tag: 'eGFR < 20 考量' });
      rationale.push('NICE NG28 1.18.3：eGFR < 20 時考慮 DPP-4 抑制劑。');
    }

    const dpp4Index = drugs.findIndex((drug) => drug.name.includes('DPP-4'));

    if (hasASCVD) {
      if (dpp4Index !== -1) {
        drugs.splice(dpp4Index, 1);
        const dpp4RationaleIndex = rationale.findIndex((item) => item.includes('DPP-4'));
        if (dpp4RationaleIndex !== -1) rationale.splice(dpp4RationaleIndex, 1);
        warnings.push('NICE NG28 1.24.6：GLP-1 RA／tirzepatide 不應與 DPP-4 抑制劑併用；此 ASCVD 路徑保留 semaglutide，腎臟用藥請由專業人員個別複核。');
        if (egfr >= 20) {
          rationale.push('NICE NG28 1.18.2、1.24.6：保留符合腎功能條件的 dapagliflozin／empagliflozin；因 ASCVD 路徑需使用 semaglutide，本摘要不併列 DPP-4 抑制劑。');
        } else {
          rationale.push('NICE NG28 1.18.3、1.24.6：eGFR < 20 的一般路徑可考慮 DPP-4 抑制劑；因 ASCVD 路徑需使用 semaglutide，本摘要不併列 DPP-4 抑制劑，其他腎臟用藥需個別複核。');
        }
      }
      drugs.push({
        name: '皮下注射 Semaglutide（Ozempic，最高 1mg/週）',
        type: 'glp1',
        tag: state.stroke ? 'ASCVD／腦血管疾病' : 'ASCVD 心血管保護'
      });
      rationale.push('NICE NG28 1.15：ASCVD 初始方案指定皮下注射 semaglutide，最高 1mg 每週一次。');
    } else if (isEarlyOnset) {
      if (dpp4Index !== -1) {
        warnings.push('NICE NG28 1.24.6：GLP-1 RA／tirzepatide 不應與 DPP-4 抑制劑併用；若要改採早發型加強治療，需由專業人員個別評估並替換用藥。');
        rationale.push('NICE NG28 1.24.6：目前腎臟路徑含 DPP-4 抑制劑，因此不併列 GLP-1 RA／tirzepatide。');
      } else {
        drugs.push({
          name: '考慮 GLP-1 RA 或 Tirzepatide',
          type: 'glp1',
          tag: '早發型（確診時 <40歲）'
        });
        rationale.push('NICE NG28 1.16：確診時未滿 40 歲者，考慮加用 GLP-1 RA 或 tirzepatide。');
      }
    }

    if (hasHF) {
      warnings.push('🚫 心臟衰竭：避免使用 TZD (Pioglitazone)，以免水分滯留加重心衰。');
    }
    if (egfr <= 30 || isFrail) {
      warnings.push('⚠️ 腎功能不全或衰弱患者使用磺醯尿素類需審慎評估低血糖與跌倒風險。');
    }

    let target = '≤ 48 mmol/mol (6.5%)';
    let targetDesc = '生活型態介入或使用不具低血糖風險的初始藥物時之一般目標，仍須與患者共同決策。';
    let targetBadge = 'badge-emerald';
    if (isFrail || state.age >= 80) {
      target = '個別化放寬（不預設固定數值）';
      targetDesc = 'NICE NG28 1.5.9：依預期效益、低血糖／跌倒風險、共病與生活品質，與患者逐案討論。';
      targetBadge = 'badge-amber';
    } else if (state.onSu || state.onInsulin) {
      target = '≤ 53 mmol/mol (7.0%)';
      targetDesc = '使用可能造成低血糖的藥物時之一般目標，仍須依個人風險調整。';
      targetBadge = 'badge-primary';
    }

    const eligibleReasons = [];
    if (state.onInsulin && state.onMdi) {
      if (state.recurrentSevereHypo) eligibleReasons.push('多次每日胰島素注射，且有反覆或嚴重低血糖');
      if (state.hypoUnaware) eligibleReasons.push('多次每日胰島素注射，且有低血糖感知受損');
      if (state.cannotSelfMonitor) eligibleReasons.push('多次每日胰島素注射，且因疾病或障礙無法自行指尖採血但可使用 CGM');
      if (state.eightChecksDaily) eligibleReasons.push('多次每日胰島素注射，否則每天需指尖採血至少 8 次');
    }
    if (state.onInsulin && state.needsMonitoringHelp) {
      eligibleReasons.push('胰島素治療，且需要照護員或醫療人員協助監測血糖');
    }

    const timeline = drugs.map((drug) => ({
      title: `啟動／評估 ${drug.name}`,
      description: `依耐受性、禁忌、腎功能與共同決策確認「${drug.tag}」，不使用固定週數取代臨床評估。`
    }));

    return {
      drugs,
      warnings,
      rationale,
      target,
      targetDesc,
      targetBadge,
      eligibleReasons,
      timeline,
      clinicalFlags: { isEarlyOnset, isObese, obesityThreshold, hasASCVD, isFrail }
    };
  }

  return {
    defaultState,
    clampNumber,
    normalizeNumber,
    normalizeAges,
    normalizeUiDependencies,
    calculate
  };
});
