import { asyncHandler } from "../../util/error/error.js";
import {
  createProductService,
  listProducts,
} from "./service/product.service.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getProducts = asyncHandler(async (req, res) => {
  const products = await listProducts(req.query);
  res.json(products);
});
    
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const createProduct = asyncHandler(async (req, res) => {
  const product = await createProductService(req.body);
  res.status(201).json({ message: "Product created", product });
});
