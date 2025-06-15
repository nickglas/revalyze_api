import { Router, RequestHandler } from 'express';
import * as companyController from '../controllers/company.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', companyController.register as RequestHandler);
router.get('/', authenticate as RequestHandler, companyController.getCompany as RequestHandler);
router.patch('/', authenticate as RequestHandler, companyController.updateCompany as RequestHandler);
router.post('/:companyId/subscription', authenticate as RequestHandler, companyController.updateSubscription as RequestHandler);

export default router;
