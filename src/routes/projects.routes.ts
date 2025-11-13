import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware';
import { createProject, listProjects, updateProject, deleteProject, inviteMember, getProjectDetails, searchUsersToInvite } from '../controllers/project.controller';

const router = Router();

router.get('/get-projects', auth, listProjects);
router.post('/create-project', auth, createProject);
router.patch('/update-project/:id', auth, updateProject);
router.delete('/delete-project/:id', auth, deleteProject);
router.post("/:projectId/invite", auth, inviteMember);
router.get("/:projectId/project-details", auth, getProjectDetails);
router.get("/:id/invite/search", auth, searchUsersToInvite);

export default router;
