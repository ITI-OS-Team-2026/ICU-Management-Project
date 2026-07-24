const hpp = require("hpp");

/**
 * Express 5 exposes `req.query` as a getter that re-parses the URL on each read.
 * Stock `hpp` mutates the temporary object and those changes are discarded.
 * Materialize query (and body when present) as own properties first so hpp sticks.
 */
const secureHpp = (options = {}) => {
  const hppMiddleware = hpp(options);

  return (req, res, next) => {
    if (req.query && !Object.prototype.hasOwnProperty.call(req, "query")) {
      Object.defineProperty(req, "query", {
        value: { ...req.query },
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    return hppMiddleware(req, res, next);
  };
};

module.exports = secureHpp;
