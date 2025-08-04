// src/controllers/reset.token.controller.ts
import { Request, Response, NextFunction } from "express";
import Container from "typedi";
import { ResetTokenService } from "../services/reset.token.service";

export const getToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tokenId = req.params.id;
    const tokenService = Container.get(ResetTokenService);
    const token = await tokenService.getTokenById(tokenId);

    if (!token) {
      return res.status(200).json({ valid: false });
    }

    return res.status(200).json({ valid: true });
  } catch (err) {
    next(err);
  }
};
