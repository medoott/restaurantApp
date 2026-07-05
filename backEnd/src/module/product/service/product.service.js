import Product from "../../../DB/model/Product.model.js";
import { AppError } from "../../../util/error/AppError.js";
import { escapeRegExp } from "../../../util/string/escape-regexp.js";

export const listProducts = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
  const search = String(query.search || "").trim();
  const category = String(query.category || "").trim();

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { name: regex },
      { desc: regex },
      { category: regex },
    ];
  }

  if (category) {
    filter.category = category;
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ id: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const createProductService = async (payload = {}) => {
  const {
    name = "",
    category = "Misc",
    price = 0,
    desc = "",
    img = "",
  } = payload;

  const resolvedName = String(name).trim();
  const resolvedCategory = String(category || "Misc").trim() || "Misc";
  const resolvedDescription = String(desc || "").trim();
  const resolvedImage = String(img || "").trim();
  const resolvedPrice = Number(price);

  if (!resolvedName) {
    throw new AppError("Product name is required", 400);
  }

  const last = await Product.findOne().sort({ id: -1 }).lean();
  const nextId = last ? (Number(last.id) || 0) + 1 : 1;

  return Product.create({
    id: nextId,
    name: resolvedName,
    category: resolvedCategory,
    price: Number.isFinite(resolvedPrice) && resolvedPrice >= 0 ? resolvedPrice : 0,
    desc: resolvedDescription,
    img: resolvedImage,
  });
};
