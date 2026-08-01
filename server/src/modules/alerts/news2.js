/**
 * Calculates the NEWS2 score for a given set of vital signs.
 * Based on the National Early Warning Score 2 (NEWS2) system.
 */

const calculateScore = (vitals) => {
  let total = 0;
  const breakdown = {};
  
  // Respiratory Rate
  if (vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null) {
    const rr = vitals.respiratoryRate;
    let score = 0;
    if (rr <= 8) score = 3;
    else if (rr >= 9 && rr <= 11) score = 1;
    else if (rr >= 12 && rr <= 20) score = 0;
    else if (rr >= 21 && rr <= 24) score = 2;
    else if (rr >= 25) score = 3;
    
    total += score;
    if (score > 0) {
      breakdown.respiratoryRate = { value: rr, score };
    }
  }

  // SpO2
  if (vitals.spo2 !== undefined && vitals.spo2 !== null) {
    const spo2 = vitals.spo2;
    let score = 0;
    if (spo2 <= 91) score = 3;
    else if (spo2 >= 92 && spo2 <= 93) score = 2;
    else if (spo2 >= 94 && spo2 <= 95) score = 1;
    else if (spo2 >= 96) score = 0;
    
    total += score;
    if (score > 0) {
      breakdown.spo2 = { value: spo2, score };
    }
  }

  // Systolic BP
  if (vitals.systolicBp !== undefined && vitals.systolicBp !== null) {
    const sbp = vitals.systolicBp;
    let score = 0;
    if (sbp <= 90) score = 3;
    else if (sbp >= 91 && sbp <= 100) score = 2;
    else if (sbp >= 101 && sbp <= 110) score = 1;
    else if (sbp >= 111 && sbp <= 219) score = 0;
    else if (sbp >= 220) score = 3;
    
    total += score;
    if (score > 0) {
      breakdown.systolicBp = { value: sbp, score };
    }
  }

  // Heart Rate / Pulse
  if (vitals.pulse !== undefined && vitals.pulse !== null) {
    const hr = vitals.pulse;
    let score = 0;
    if (hr <= 40) score = 3;
    else if (hr >= 41 && hr <= 50) score = 1;
    else if (hr >= 51 && hr <= 90) score = 0;
    else if (hr >= 91 && hr <= 110) score = 1;
    else if (hr >= 111 && hr <= 130) score = 2;
    else if (hr >= 131) score = 3;
    
    total += score;
    if (score > 0) {
      breakdown.pulse = { value: hr, score };
    }
  }

  // Temperature
  if (vitals.temperature !== undefined && vitals.temperature !== null) {
    const temp = vitals.temperature;
    let score = 0;
    if (temp <= 35.0) score = 3;
    else if (temp >= 35.1 && temp <= 36.0) score = 1;
    else if (temp >= 36.1 && temp <= 38.0) score = 0;
    else if (temp >= 38.1 && temp <= 39.0) score = 1;
    else if (temp >= 39.1) score = 2;
    
    total += score;
    if (score > 0) {
      breakdown.temperature = { value: temp, score };
    }
  }

  // Determine Severity
  let severity = null;
  let title = null;
  
  const hasParameterScore3 = Object.values(breakdown).some(param => param.score === 3);

  if (total >= 5 || hasParameterScore3) {
    severity = 'P0';
    const worstParam = Object.keys(breakdown).find(k => breakdown[k].score === 3) || Object.keys(breakdown)[0];
    title = `Critical: Abnormal ${worstParam} — immediate review required`;
  } else if (total >= 1 && total <= 4) {
    severity = 'P1';
    const worstParam = Object.keys(breakdown)[0];
    title = `Warning: Abnormal ${worstParam}`;
  }

  return {
    total,
    severity,
    title,
    breakdown
  };
};

module.exports = {
  calculateScore
};
