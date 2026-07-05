import Joi from "joi";

const customizationOptionSchema = Joi.object({
  label: Joi.string().trim().max(100).required(),
  priceAdjustment: Joi.number().min(-9999).max(9999).default(0),
}).options({ stripUnknown: true });

const customizationSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  type: Joi.string().valid("select", "multi", "toggle", "text").required(),
  options: Joi.array().items(customizationOptionSchema).max(20).optional().default([]),
  required: Joi.boolean().optional().default(false),
  maxSelections: Joi.number().integer().min(0).max(50).optional().default(0),
}).options({ stripUnknown: true });

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  category: Joi.string().trim().max(100).optional().default("Misc"),
  price: Joi.number().min(0).max(99999).required(),
  desc: Joi.string().max(2000).optional().allow(""),
  img: Joi.string().max(500).optional().allow(""),
  allergens: Joi.array().items(Joi.string().max(50)).optional().default([]),
  ingredients: Joi.array().items(Joi.string().max(100)).optional().default([]),
  nutritionalInfo: Joi.object({
    calories: Joi.number().min(0).max(99999).optional().default(0),
    protein: Joi.string().max(50).optional().allow(""),
    carbs: Joi.string().max(50).optional().allow(""),
    fat: Joi.string().max(50).optional().allow(""),
  }).optional().default({}),
  prepTimeMinutes: Joi.number().min(0).max(999).optional().default(10),
  availability: Joi.string().valid("available", "limited", "unavailable", "seasonal").optional().default("available"),
  isPopular: Joi.boolean().optional().default(false),
  isRecommended: Joi.boolean().optional().default(false),
  isSignature: Joi.boolean().optional().default(false),
  customizationOptions: Joi.array().items(customizationSchema).max(20).optional().default([]),
  stockLevel: Joi.number().min(0).max(99999).optional().default(999),
  maxPerOrder: Joi.number().min(0).max(999).optional().default(0),
  taxCategory: Joi.string().max(50).optional().default("standard"),
  sortOrder: Joi.number().min(0).max(9999).optional().default(0),
  isActive: Joi.boolean().optional().default(true),
}).options({ stripUnknown: true });

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  category: Joi.string().trim().max(100).optional(),
  price: Joi.number().min(0).max(99999).optional(),
  desc: Joi.string().max(2000).optional().allow(""),
  img: Joi.string().max(500).optional().allow(""),
  allergens: Joi.array().items(Joi.string().max(50)).optional(),
  ingredients: Joi.array().items(Joi.string().max(100)).optional(),
  nutritionalInfo: Joi.object({
    calories: Joi.number().min(0).max(99999).optional(),
    protein: Joi.string().max(50).optional().allow(""),
    carbs: Joi.string().max(50).optional().allow(""),
    fat: Joi.string().max(50).optional().allow(""),
  }).optional(),
  prepTimeMinutes: Joi.number().min(0).max(999).optional(),
  availability: Joi.string().valid("available", "limited", "unavailable", "seasonal").optional(),
  isPopular: Joi.boolean().optional(),
  isRecommended: Joi.boolean().optional(),
  isSignature: Joi.boolean().optional(),
  customizationOptions: Joi.array().items(customizationSchema).max(20).optional(),
  stockLevel: Joi.number().min(0).max(99999).optional(),
  maxPerOrder: Joi.number().min(0).max(999).optional(),
  taxCategory: Joi.string().max(50).optional(),
  sortOrder: Joi.number().min(0).max(9999).optional(),
  isActive: Joi.boolean().optional(),
}).min(1).options({ stripUnknown: true });
