import Joi from "joi";

const orderItemSchema = Joi.object({
  id: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow("", null),
  name: Joi.string().trim().max(200).required(),
  qty: Joi.number().integer().min(1).max(999).required(),
  price: Joi.number().min(0).max(99999).required(),
  notes: Joi.string().max(500).optional().allow(""),
  customization: Joi.array().items(
    Joi.object({
      optionName: Joi.string().max(100).required(),
      selection: Joi.string().max(100).required(),
      priceAdjustment: Joi.number().min(-9999).max(9999).default(0),
    })
  ).optional().default([]),
  allergens: Joi.array().items(Joi.string().max(50)).optional().default([]),
  category: Joi.string().max(100).optional().allow(""),
  prepTimeMinutes: Joi.number().min(0).max(999).optional().default(0),
  originalPrice: Joi.number().min(0).max(99999).optional().default(0),
}).options({ stripUnknown: true });

export const createOrderSchema = Joi.object({
  customer: Joi.string().trim().max(200).optional().allow(""),
  code: Joi.number().min(0).max(999999).optional(),
  payment: Joi.string().valid("Cash", "Online").optional().default("Cash"),
  total: Joi.number().min(0.01).max(999999).required(),
  itemsDetail: Joi.array().items(orderItemSchema).min(1).max(100).required(),
  sessionToken: Joi.string().max(500).optional().allow(""),
  tableNumber: Joi.number().integer().min(1).max(9999).optional(),
  customerName: Joi.string().trim().max(200).optional().allow(""),
}).options({ stripUnknown: true });

export const updateOrderSchema = Joi.object({
  status: Joi.string().valid(
    "Pending", "Preparing", "Ready", "ReadyForPickup", "BeingDelivered",
    "Served", "Dining", "BillRequested", "PaymentInProgress", "Paid",
    "Cleaning", "Cancelled", "Rejected", "Reopened", "Refunded", "Modified"
  ).optional(),
  payment: Joi.string().valid("Cash", "Online").optional(),
  customer: Joi.string().trim().max(200).optional().allow(""),
  items: Joi.number().min(0).max(9999).optional(),
  code: Joi.number().min(0).max(999999).optional(),
  reason: Joi.string().max(500).optional().allow(""),
  force: Joi.boolean().optional(),
}).options({ stripUnknown: true });

export const addItemsToOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).max(50).required(),
  sessionToken: Joi.string().max(500).optional().allow(""),
}).options({ stripUnknown: true });
