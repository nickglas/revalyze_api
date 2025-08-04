import { RequestHandler, Router } from "express";

import { getToken } from "../controllers/reset.token.controller";

const router = Router();

router.get("/:id", getToken as RequestHandler);

export default router;
