const Joi = require("joi");

const createFollowUpSchema = Joi.object({
  subjective: Joi.string().trim().allow("").allow(null),
  objective: Joi.string().trim().allow("").allow(null),
  assessment: Joi.string().trim().allow("").allow(null),
  plan: Joi.string().trim().allow("").allow(null),
});

module.exports = {
  createFollowUpSchema,
};
