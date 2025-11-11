import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import { Project } from '../models/Project';
import { ActivityLog } from '../models/ActivityLog';

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, members } = req.body;
    // @ts-expect-error
    const owner = req.user.id;
    const p = await Project.create({ name, description, owner, members: [owner, ...(members||[])] });
    await ActivityLog.create({ project: p._id, user: owner, action: 'project_created', meta: { name } });
    return APIResponse(res, true, 201, 'Project created', p);
  } catch (err) {
    return APIResponse(res, false, 500, 'Create project failed', err);
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error
    const userId = req.user.id;
    const projects = await Project.find({ members: userId }).populate('owner', 'name email');
    return APIResponse(res, true, 200, 'Projects fetched', projects);
  } catch (err) {
    return APIResponse(res, false, 500, 'Fetch projects failed', err);
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updated = await Project.findByIdAndUpdate(id, req.body, { new: true });
    // @ts-expect-error
    await ActivityLog.create({ project: id, user: req.user.id, action: 'project_updated', meta: req.body });
    return APIResponse(res, true, 200, 'Project updated', updated);
  } catch (err) {
    return APIResponse(res, false, 500, 'Update failed', err);
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await Project.findByIdAndDelete(id);
    // @ts-expect-error
    await ActivityLog.create({ project: id, user: req.user.id, action: 'project_deleted' });
    return APIResponse(res, true, 200, 'Project deleted');
  } catch (err) {
    return APIResponse(res, false, 500, 'Delete failed', err);
  }
};
