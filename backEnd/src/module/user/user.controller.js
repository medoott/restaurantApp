import { Router } from "express";
import { profile } from "./service/user.service.js";
import { authentication } from "../../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/profile",
  authentication(),
  profile,
);

export default router;
