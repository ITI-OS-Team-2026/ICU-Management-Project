const Joi = require("joi");

const vitalSignBaseSchema = {
  temperature: Joi.number().min(35.0).max(45.0).optional().messages({
    "number.min": "Temperature must be at least 35.0",
    "number.max": "Temperature must be at most 45.0",
  }),
  pulse: Joi.number().integer().min(20).max(300).optional(),
  systolic_bp: Joi.number().integer().min(40).max(300).optional(),
  diastolic_bp: Joi.number().integer().min(20).max(200).optional(),
  respiratory_rate: Joi.number().integer().min(0).max(100).optional(),
  spo2: Joi.number().integer().min(0).max(100).optional(),
  is_override: Joi.boolean().default(false),
  override_reason: Joi.string().optional(),
};

// Normal ranges for critical flagging
const NORMAL_RANGES = {
  temperature: { min: 36.0, max: 38.5 },
  pulse: { min: 40, max: 140 },
  systolic_bp: { min: 80, max: 180 },
  diastolic_bp: { min: 50, max: 110 },
  respiratory_rate: { min: 8, max: 30 },
  spo2: { min: 85, max: 100 },
};

const validateNormalRanges = (obj, helpers) => {
  const { is_override, override_reason } = obj;
  let hasCriticalValue = false;
  let criticalFields = [];

  for (const [key, range] of Object.entries(NORMAL_RANGES)) {
    if (obj[key] !== undefined && obj[key] !== null) {
      if (obj[key] < range.min || obj[key] > range.max) {
        hasCriticalValue = true;
        criticalFields.push(`${key} (${obj[key]} is outside normal ${range.min}-${range.max})`);
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
    // If override is provided but no critical values exist, it's unnecessary but acceptable.
    // However, if override is true, we still enforce override_reason.
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
};
