import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import { Task } from '../models/Task';
import { ActivityLog } from '../models/ActivityLog';

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, project, assignees } = req.body;
    const t = await Task.create({ title, description, project, assignees, status: 'todo' });
    
    await ActivityLog.create({
      project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_created',
      meta: { title },
    });
    return APIResponse(res, true, 201, 'Task created', t);
  } catch (err) {
    return APIResponse(res, false, 500, 'Create task failed', err);
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, assignees, status } = req.body;

    const t = await Task.findById(id);
    if (!t) return APIResponse(res, false, 404, 'Task not found');

    if (title) t.title = title;
    if (description) t.description = description;
    if (assignees) t.assignees = assignees;
    if (status) t.status = status;

    await t.save();

    await ActivityLog.create({
      project: t.project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_updated',
      meta: { title: t.title },
    });

    return APIResponse(res, true, 200, 'Task updated', t);
  } catch (err) {
    return APIResponse(res, false, 500, 'Update task failed', err);
  }
};

export const moveTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Task.findByIdAndUpdate(id, { status }, { new: true });
    
    await ActivityLog.create({
      project: updated!.project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_moved',
      meta: { status },
    });
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
    
    await ActivityLog.create({
      project: t.project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_commented',
      meta: { text },
    });
    return APIResponse(res, true, 200, 'Comment added', t);
  } catch (err) {
    return APIResponse(res, false, 500, 'Comment failed', err);
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const t = await Task.findById(id);
    if (!t) return APIResponse(res, false, 404, 'Task not found');

    await t.deleteOne();

    await ActivityLog.create({
      project: t.project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_deleted',
      meta: { title: t.title },
    });

    return APIResponse(res, true, 200, 'Task deleted successfully', null);
  } catch (err) {
    return APIResponse(res, false, 500, 'Delete task failed', err);
  }
};

export const listTasksByProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const tasks = await Task.find({ project: projectId }).populate("assignees", "name email").sort({ createdAt: -1 });
    return APIResponse(res, true, 200, "Tasks fetched", tasks);
  } catch (err) {
    return APIResponse(res, false, 500, "Fetch tasks failed", err);
  }
};
