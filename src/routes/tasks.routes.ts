import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { createTask, moveTask, commentTask } from '../controllers/task.controller';

const router = Router();

router.post('/', auth, createTask);
router.patch('/:id/move', auth, moveTask);
router.post('/:id/comment', auth, commentTask);

export default router;
