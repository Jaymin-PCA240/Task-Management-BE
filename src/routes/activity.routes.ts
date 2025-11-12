import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { getProjectActivities } from '../controllers/activity.controller';

const router = Router();

router.get("/get-project-activity/:projectId", auth, getProjectActivities);

export default router;