import Joi from "joi";

export const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  username: Joi.string().trim().min(2).max(50).optional(),
  email: Joi.string().email().lowercase().trim().max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  confirmationPassword: Joi.string().valid(Joi.ref("password")).required(),
  phone: Joi.string().trim().max(20).required(),
}).unknown(false);
export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
}).unknown(false);

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
}).unknown(false);

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  token: Joi.string().hex().length(64).required(),
  password: Joi.string().min(8).required(),
}).unknown(false);
