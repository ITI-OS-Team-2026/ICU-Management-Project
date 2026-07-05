const APIError = require("../utils/APIError");

module.exports = (schema) => {
  return (req, res, next) => {
    for (const key in schema) {
      const { error, value } = schema[key].validate(req[key], {
        abortEarly: true,
        stripUnknown: true,
      });

      if (error) {
        return next(new APIError(error.details[0].message, 400));
      }

      req[key] = value;
    }

    next();
  };
};
