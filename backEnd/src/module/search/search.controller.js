import * as globalSearchService from "./service/global.search.service.js";
import { asyncHandler } from "../../util/error/error.js";
import { successResponse } from "../../util/response/success.res.js";

export const globalSearch = asyncHandler(async (req, res) => {
  const result = await globalSearchService.globalSearch(req.query);
  res.json({ message: "Done", data: result });
});
