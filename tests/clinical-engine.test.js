const test = require('node:test');
const assert = require('node:assert/strict');

let engine;
try {
  engine = require('../clinical-engine.js');
} catch (error) {
  assert.fail(`clinical-engine.js must expose the real browser decision engine: ${error.message}`);
}

function patient(overrides = {}) {
  return {
    age: 52,
    diagnosisAge: 45,
    bmi: 26,
    highRiskEthnicity: false,
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
    eightChecksDaily: false,
    ...overrides
  };
}

function drugNames(result) {
  return result.drugs.map((drug) => drug.name).join('\n');
}

function timelineText(result) {
  return result.timeline.map((step) => `${step.title} ${step.description}`).join('\n');
}

test('eGFR 30 uses dapagliflozin or empagliflozin plus a DPP-4 inhibitor without metformin', () => {
  const result = engine.calculate(patient({ egfr: 30 }));
  const names = drugNames(result);

  assert.match(names, /Dapagliflozin|Empagliflozin/);
  assert.match(names, /DPP-4/);
  assert.doesNotMatch(names, /Metformin/);
});

test('early-onset treatment is based on age at diagnosis rather than current age', () => {
  const diagnosedYoung = drugNames(engine.calculate(patient({ age: 55, diagnosisAge: 39 })));
  const diagnosedLater = drugNames(engine.calculate(patient({ age: 55, diagnosisAge: 45 })));

  assert.match(diagnosedYoung, /GLP-1 RA|Tirzepatide/);
  assert.doesNotMatch(diagnosedLater, /GLP-1 RA|Tirzepatide/);
});

test('insulin treatment alone does not qualify for CGM', () => {
  const result = engine.calculate(patient({ onInsulin: true }));
  assert.deepEqual(result.eligibleReasons, []);
});

test('hypoglycaemia unawareness without multiple daily insulin injections does not qualify for CGM', () => {
  const result = engine.calculate(patient({ hypoUnaware: true }));
  assert.deepEqual(result.eligibleReasons, []);
});

test('stroke or dysphagia alone does not qualify for CGM', () => {
  const result = engine.calculate(patient({ stroke: true, dysphagia: 'mild' }));
  assert.deepEqual(result.eligibleReasons, []);
});

test('multiple daily insulin injections with impaired awareness qualifies for CGM', () => {
  const result = engine.calculate(patient({ onInsulin: true, onMdi: true, hypoUnaware: true }));
  assert.equal(result.eligibleReasons.length, 1);
  assert.match(result.eligibleReasons[0], /多次每日胰島素注射/);
});

test('insulin-treated patients needing help to monitor glucose qualify for CGM', () => {
  const result = engine.calculate(patient({ onInsulin: true, needsMonitoringHelp: true }));
  assert.equal(result.eligibleReasons.length, 1);
  assert.match(result.eligibleReasons[0], /協助監測血糖/);
});

test('frailty relaxes the HbA1c target without inventing a fixed numeric target', () => {
  const result = engine.calculate(patient({ frailty: 'mild' }));
  assert.match(result.target, /個別化/);
  assert.doesNotMatch(result.target, /7\.5%|8\.0%/);
});

test('frailty risk keeps metformin without adding DPP-4 when metformin remains suitable', () => {
  const result = engine.calculate(patient({ frailty: 'mild', sgltFrailtyRisk: true }));
  const names = drugNames(result);

  assert.match(names, /Metformin/);
  assert.doesNotMatch(names, /SGLT-2/);
  assert.doesNotMatch(names, /DPP-4/);
  assert.match(result.rationale.join('\n'), /1\.19\.1/);
});

test('eGFR 20 to 30 with SGLT-2 frailty risk does not claim the excluded combination is being used', () => {
  const result = engine.calculate(patient({ egfr: 25, frailty: 'mild', sgltFrailtyRisk: true }));
  const dpp4 = result.drugs.find((drug) => drug.name.includes('DPP-4'));

  assert.doesNotMatch(dpp4.tag, /合併/);
  assert.doesNotMatch(result.rationale.join('\n'), /使用 dapagliflozin 或 empagliflozin/);
  assert.match(result.rationale.join('\n'), /1\.19\.2/);
});

test('ASCVD initial treatment specifies subcutaneous semaglutide up to 1 mg weekly', () => {
  const names = drugNames(engine.calculate(patient({ ascvd: true })));
  assert.match(names, /Semaglutide.*1mg\/週/);
  assert.doesNotMatch(names, /Liraglutide|Dulaglutide/);
});

test('obesity threshold is adjusted only when a high-risk ethnicity is selected', () => {
  const general = engine.calculate(patient({ bmi: 28, highRiskEthnicity: false }));
  const adjusted = engine.calculate(patient({ bmi: 28, highRiskEthnicity: true }));

  assert.equal(general.clinicalFlags.isObese, false);
  assert.equal(adjusted.clinicalFlags.isObese, true);
});

test('contraindicated medicines never appear in the personalised staging timeline', () => {
  const kidneyFailure = timelineText(engine.calculate(patient({ egfr: 19 })));
  const ketogenicDiet = timelineText(engine.calculate(patient({ diet: 'keto' })));

  assert.doesNotMatch(kidneyFailure, /Metformin|SGLT-2/);
  assert.doesNotMatch(ketogenicDiet, /SGLT-2/);
});

test('numeric values are clamped to the range displayed to the user', () => {
  assert.equal(engine.clampNumber(10, 18, 100), 18);
  assert.equal(engine.clampNumber(130, 10, 120), 120);
  assert.equal(engine.clampNumber(28.5, 15, 50), 28.5);
  assert.equal(engine.clampNumber('', 10, 120), null);
  assert.equal(engine.clampNumber('   ', 10, 120), null);
});

test('age normalisation never leaves diagnosis age above current age', () => {
  assert.deepEqual(engine.normalizeAges(35, 45), { age: 35, diagnosisAge: 35 });
  assert.deepEqual(engine.normalizeAges(55, 39), { age: 55, diagnosisAge: 39 });
  assert.deepEqual(engine.normalizeAges(52.9, 39.6), { age: 53, diagnosisAge: 40 });
});

test('eGFR boundaries select the intended renal pathway', () => {
  const cases = [
    { egfr: 19, has: /DPP-4/, lacks: /Metformin|SGLT-2|Dapagliflozin|Empagliflozin/ },
    { egfr: 20, has: /Dapagliflozin|Empagliflozin/, lacks: /Metformin/ },
    { egfr: 30, has: /Dapagliflozin|Empagliflozin/, lacks: /Metformin/ },
    { egfr: 31, has: /Metformin/, lacks: /eGFR < 20/ }
  ];

  for (const item of cases) {
    const names = drugNames(engine.calculate(patient({ egfr: item.egfr })));
    assert.match(names, item.has, `eGFR ${item.egfr}`);
    assert.doesNotMatch(names, item.lacks, `eGFR ${item.egfr}`);
  }
});

test('diagnosis age 39 is early onset and age 40 is not', () => {
  assert.match(drugNames(engine.calculate(patient({ diagnosisAge: 39 }))), /GLP-1 RA|Tirzepatide/);
  assert.doesNotMatch(drugNames(engine.calculate(patient({ diagnosisAge: 40 }))), /GLP-1 RA|Tirzepatide/);
});

test('timeline leaves numbering to the visual marker', () => {
  const result = engine.calculate(patient());
  for (const item of result.timeline) assert.doesNotMatch(item.title, /^\d+\./);
});

test('numeric normalisation clamps and snaps values to the configured step', () => {
  assert.equal(engine.normalizeNumber(52.9, 18, 100, 1), 53);
  assert.equal(engine.normalizeNumber(28.55, 15, 50, 0.1), 28.6);
  assert.equal(engine.normalizeNumber(9, 10, 120, 1), 10);
  assert.equal(engine.normalizeNumber(121, 10, 120, 1), 120);
  assert.equal(engine.normalizeNumber('', 10, 120, 1), null);
});

test('UI dependency normalisation removes impossible subordinate selections', () => {
  assert.deepEqual(
    engine.normalizeUiDependencies({
      frailty: 'none',
      sgltFrailtyRisk: true,
      onInsulin: false,
      onMdi: true,
      needsMonitoringHelp: true,
      hypoUnaware: true
    }),
    {
      frailty: 'none',
      sgltFrailtyRisk: false,
      onInsulin: false,
      onMdi: false,
      needsMonitoringHelp: false,
      hypoUnaware: true
    }
  );
});

test('ASCVD pathways never combine semaglutide with a DPP-4 inhibitor', () => {
  for (const egfr of [25, 19]) {
    const result = engine.calculate(patient({ egfr, ascvd: true }));
    const names = drugNames(result);
    assert.match(names, /Semaglutide/, `eGFR ${egfr}`);
    assert.doesNotMatch(names, /DPP-4/, `eGFR ${egfr}`);
    assert.match([...result.warnings, ...result.rationale].join('\n'), /1\.24\.6/, `eGFR ${egfr}`);
  }
});

test('ASCVD rationale below eGFR 20 does not claim an SGLT-2 medicine is retained', () => {
  const result = engine.calculate(patient({ egfr: 19, ascvd: true }));

  assert.doesNotMatch(result.rationale.join('\n'), /保留.*dapagliflozin.*empagliflozin/i);
  assert.match(result.rationale.join('\n'), /1\.18\.3.*1\.24\.6/);
});

test('early-onset CKD pathway does not list GLP-1 or tirzepatide beside DPP-4', () => {
  const result = engine.calculate(patient({ egfr: 25, diagnosisAge: 39 }));
  const names = drugNames(result);

  assert.match(names, /DPP-4/);
  assert.doesNotMatch(names, /GLP-1|Tirzepatide/);
  assert.match([...result.warnings, ...result.rationale].join('\n'), /1\.24\.6/);
});
