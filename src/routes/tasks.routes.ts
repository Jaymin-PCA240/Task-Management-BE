import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { createTask, moveTask, commentTask, listTasksByProject, updateTask, deleteTask } from '../controllers/task.controller';

const router = Router();

router.post('/create-task', auth, createTask);
router.patch('/:id/move', auth, moveTask);
router.post('/:id/comment', auth, commentTask);
router.get("/task-by-project/:projectId", auth, listTasksByProject);
router.put("/update-task/:id", auth, updateTask);
router.delete("/delete-task/:id", auth, deleteTask);

export default router;
