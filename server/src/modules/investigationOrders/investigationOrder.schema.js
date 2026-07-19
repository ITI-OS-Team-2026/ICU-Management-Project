const Joi = require("joi");

const createInvestigationOrderSchema = Joi.object({
  order_name: Joi.string().trim().max(255).required(),
  type: Joi.string().trim().max(50).required(),
});

const updateInvestigationOrderSchema = Joi.object({
  status: Joi.string().valid("Pending", "Completed").required(),
});

module.exports = {
  createInvestigationOrderSchema,
  updateInvestigationOrderSchema,
};
