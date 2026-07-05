import { AppError } from "../util/error/AppError.js";

const VALIDATORS = {
  body: { source: "body", setter: (req, val) => { req.body = val; } },
  params: { source: "params", setter: (req, val) => { req.params = val; } },
  query: { source: "query", setter: (req, val) => { req.query = val; } },
  headers: { source: "headers", setter: (req, val) => { req.headers = val; } },
};

function runValidation(schema, data, source) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
    allowUnknown: source === "headers",
  });

  if (error) {
    const messages = error.details.map((detail) => detail.message);
    throw new AppError(`Validation failed (${source})`, 400, messages);
  }

  return value;
}

export const validate = (schemas = {}) => {
  return (req, res, next) => {
    try {
      for (const [key, schema] of Object.entries(schemas)) {
        const validator = VALIDATORS[key];
        if (!validator || !schema) continue;
        const validated = runValidation(schema, req[validator.source], key);
        validator.setter(req, validated);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Backward compatibility: validate(schema) validates req.body only
export const validateBody = (schema) => validate({ body: schema });

export const validateQuery = (schema) => validate({ query: schema });

export const validateParams = (schema) => validate({ params: schema });
