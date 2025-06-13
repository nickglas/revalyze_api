import { Router, RequestHandler } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', authController.login as RequestHandler);
router.post('/logout', authenticate as RequestHandler, authController.logout as RequestHandler);
router.get('/', authenticate as RequestHandler, authController.getProfile as RequestHandler);
router.post('/refresh', authController.refreshToken as RequestHandler);
router.post('/password-reset-request', authController.requestReset as RequestHandler);
router.post('/password-reset', authController.resetPassword as RequestHandler);

export default router;