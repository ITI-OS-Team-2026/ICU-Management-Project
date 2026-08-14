const Joi = require("joi");

const vitalSignBaseSchema = {
  temperature: Joi.number().min(10.0).max(50.0).optional().messages({
    "number.min": "Temperature must be at least 10.0°C",
    "number.max": "Temperature must be at most 50.0°C",
  }),
  pulse: Joi.number().integer().min(0).max(500).optional().messages({
    "number.min": "Pulse must be at least 0 bpm",
    "number.max": "Pulse must be at most 500 bpm",
  }),
  systolic_bp: Joi.number().integer().min(0).max(300).optional().messages({
    "number.min": "Systolic BP must be at least 0 mmHg",
    "number.max": "Systolic BP must be at most 300 mmHg",
  }),
  diastolic_bp: Joi.number().integer().min(0).max(200).optional().messages({
    "number.min": "Diastolic BP must be at least 0 mmHg",
    "number.max": "Diastolic BP must be at most 200 mmHg",
  }),
  respiratory_rate: Joi.number().integer().min(0).max(100).optional().messages({
    "number.min": "Respiratory rate must be at least 0 breaths/min",
    "number.max": "Respiratory rate must be at most 100 breaths/min",
  }),
  spo2: Joi.number().integer().min(0).max(100).optional().messages({
    "number.min": "SpO2 must be at least 0%",
    "number.max": "SpO2 must be at most 100%",
  }),
  is_override: Joi.boolean().default(false),
  override_reason: Joi.string().optional(),
};

// Safe physiological limits before critical override is required
// Aligned 100% with certified clinical ICU standards:
// - Temperature: <35.0 (Hypothermia) or >=40.6 (Hyperpyrexia) -> Critical Override
// - Pulse: <40 (Severe Bradycardia) or >140 (Severe Tachycardia) -> Critical Override
// - Systolic BP: <80 (Severe Shock) or >=180 (Hypertensive Crisis) -> Critical Override
// - Diastolic BP: <50 (Severe Shock) or >=110 (Crisis) -> Critical Override
// - Respiratory Rate: <8 (Severe Bradypnea) or >=25 (Severe Tachypnea) -> Critical Override
// - SpO2: <=90% (Severe Hypoxia) -> Critical Override
const NORMAL_RANGES = {
  temperature: { min: 35.0, max: 40.5 },
  pulse: { min: 40, max: 140 },
  systolic_bp: { min: 80, max: 179 },
  diastolic_bp: { min: 50, max: 109 },
  respiratory_rate: { min: 8, max: 24 },
  spo2: { min: 91, max: 100 },
};

const validateNormalRanges = (obj, helpers) => {
  const { is_override, override_reason } = obj;
  let hasCriticalValue = false;
  let criticalFields = [];

  for (const [key, range] of Object.entries(NORMAL_RANGES)) {
    if (obj[key] !== undefined && obj[key] !== null) {
      if (obj[key] < range.min || obj[key] > range.max) {
        hasCriticalValue = true;
        criticalFields.push(`${key} (${obj[key]} is outside safe limits ${range.min}–${range.max})`);
      }
    }
  }

  if (hasCriticalValue) {
    if (!is_override) {
      return helpers.message(
        `Critical abnormal values detected: ${criticalFields.join(', ')}. Please confirm by setting is_override to true and providing an override_reason.`
      );
    }
    if (!override_reason || override_reason.trim() === "") {
      return helpers.message(
        `Critical abnormal values detected: ${criticalFields.join(', ')}. override_reason is required when is_override is true.`
      );
    }
  } else {
    if (is_override && (!override_reason || override_reason.trim() === "")) {
      return helpers.message("override_reason is required when is_override is true.");
    }
  }

  return obj;
};

const createVitalSignSchema = Joi.object(vitalSignBaseSchema)
  .or("temperature", "pulse", "systolic_bp", "diastolic_bp", "respiratory_rate", "spo2")
  .custom(validateNormalRanges, "Normal ranges validation");

const updateVitalSignSchema = Joi.object(vitalSignBaseSchema).custom(validateNormalRanges, "Normal ranges validation");

module.exports = {
  createVitalSignSchema,
  updateVitalSignSchema,
  NORMAL_RANGES,
};
