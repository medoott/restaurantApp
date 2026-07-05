import * as recipeService from "./service/recipe.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const listRecipes = asyncHandler(async (req, res) => {
  const result = await recipeService.listRecipes(req.query);
  successResponse({ res, data: result, status: 200 });
});

export const getRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.getRecipeById(req.params.id);
  successResponse({ res, data: recipe, status: 200 });
});

export const getRecipesByProduct = asyncHandler(async (req, res) => {
  const recipes = await recipeService.getRecipesByProduct(req.params.productId);
  successResponse({ res, data: recipes, status: 200 });
});

export const createRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.createRecipe({ ...req.body, userId: req.user?._id });
  successResponse({ res, data: recipe, status: 201 });
});

export const updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.updateRecipe(req.params.id, req.body);
  successResponse({ res, data: recipe, status: 200 });
});

export const deleteRecipe = asyncHandler(async (req, res) => {
  await recipeService.deleteRecipe(req.params.id);
  successResponse({ res, message: "Recipe deleted.", status: 200 });
});

export const getRecipeCostAnalysis = asyncHandler(async (req, res) => {
  const analysis = await recipeService.getRecipeCostAnalysis(req.params.id);
  successResponse({ res, data: analysis, status: 200 });
});
