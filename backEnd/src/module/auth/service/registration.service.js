import { asyncHandler } from "../../../util/error/error.js";
import { successResponse } from "../../../util/response/success.res.js";
import {
  confirmEmailService,
  loginService,
  logoutService,
  signupService,
} from "./auth.service.js";

export const signup = asyncHandler(async (req, res) => {
  const user = await signupService(req.body);
  return successResponse({
    res,
    message: "User signup successful",
    data: { user },
    status: 201,
  });
});

export const confirmEmail = asyncHandler(async (req, res) => {
  const { authorization } = req.headers;
  const user = await confirmEmailService(authorization);

  return successResponse({
    res,
    message: "Confirm Email Done",
    data: { user },
    status: 200,
  });
});

export const login = asyncHandler(async (req, res) => {
  const data = await loginService(req.body);
  return successResponse({ res, message: "Login successful", data });
});

export const logout = asyncHandler(async (req, res) => {
  const { authorization } = req.headers;
  const data = await logoutService(authorization);
  return successResponse({ res, message: "Logged out successfully", data });
});
