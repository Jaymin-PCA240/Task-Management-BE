import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import { Task } from '../models/Task';
import { ActivityLog } from '../models/ActivityLog';

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, project, assignees } = req.body;
    const t = await Task.create({ title, description, project, assignees, status: 'todo' });
    // @ts-expect-error
    await ActivityLog.create({ project, user: req.user.id, action: 'task_created', meta: { title } });
    return APIResponse(res, true, 201, 'Task created', t);
  } catch (err) {
    return APIResponse(res, false, 500, 'Create task failed', err);
  }
};

export const moveTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Task.findByIdAndUpdate(id, { status }, { new: true });
    // @ts-expect-error
    await ActivityLog.create({ project: updated!.project, user: req.user.id, action: 'task_moved', meta: { status } });
    return APIResponse(res, true, 200, 'Task moved', updated);
  } catch (err) {
    return APIResponse(res, false, 500, 'Move failed', err);
  }
};

export const commentTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const t = await Task.findById(id);
    if (!t) return APIResponse(res, false, 404, 'Task not found');
    // @ts-expect-error
    t.comments.push({ user: req.user.id, text });
    await t.save();
    // @ts-expect-error
    await ActivityLog.create({ project: t.project, user: req.user.id, action: 'task_commented', meta: { text } });
    return APIResponse(res, true, 200, 'Comment added', t);
  } catch (err) {
    return APIResponse(res, false, 500, 'Comment failed', err);
  }
};
