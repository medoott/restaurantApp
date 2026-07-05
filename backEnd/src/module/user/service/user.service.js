import { asyncHandler } from "../../../util/error/error.js";
import { successResponse } from "../../../util/response/success.res.js";
import { serializeUser } from "../../../util/user/serialize.user.js";

export const profile = asyncHandler(async (req, res) => {
  const user = serializeUser(req.user, { decryptPhone: true });

  return successResponse({
    res,
    message: "Profile fetched successfully",
    data: { user },
  });
});
