import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { createTask, moveTask, commentTask, listTasksByProject, updateTask, deleteTask, editComment, deleteComment } from '../controllers/task.controller';

const router = Router();

router.post('/create-task', auth, createTask);
router.patch('/:id/move', auth, moveTask);
router.post('/:id/add-comment', auth, commentTask);
router.put("/:id/edit-comment/:commentId", auth, editComment);
router.delete("/:id/delete-comment/:commentId", auth, deleteComment);
router.get("/task-by-project/:projectId", auth, listTasksByProject);
router.put("/update-task/:id", auth, updateTask);
router.delete("/delete-task/:id", auth, deleteTask);

export default router;
