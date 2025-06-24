import { Router, RequestHandler } from 'express';
import * as subscriptionController from '../controllers/admin/subscription.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate as RequestHandler, subscriptionController.createSubscription as RequestHandler);
// router.get('/', authenticate as RequestHandler, companyController.getCompany as RequestHandler);


export default router;
