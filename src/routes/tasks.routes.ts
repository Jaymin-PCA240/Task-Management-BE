import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { createTask, moveTask, commentTask, listTasksByProject, updateTask, deleteTask } from '../controllers/task.controller';

const router = Router();

router.post('/', auth, createTask);
router.patch('/:id/move', auth, moveTask);
router.post('/:id/comment', auth, commentTask);
router.get("/project/:projectId", auth, listTasksByProject);
router.put("/:id", auth, updateTask);
router.delete("/:id", auth, deleteTask);

export default router;
