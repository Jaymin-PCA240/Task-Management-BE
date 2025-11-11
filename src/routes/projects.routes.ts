import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { createProject, listProjects, updateProject, deleteProject } from '../controllers/project.controller';

const router = Router();

router.get('/get-projects', auth, listProjects);
router.post('/', auth, createProject);
router.patch('/:id', auth, updateProject);
router.delete('/:id', auth, deleteProject);

export default router;
