import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import { Task } from '../models/Task';
import { ActivityLog } from '../models/ActivityLog';
import { io } from '../index';

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, project, assignees, status } = req.body;
    const task = await Task.create({ title, description, project, assignees, status });

    await task.populate([
      { path: 'comments.user', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'project', select: 'name owner' },
    ])

    await ActivityLog.create({
      project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_created',
      meta: { title },
    });
    io.emit("taskCreated", task); 
    return APIResponse(res, true, 201, 'Task created', task);
  } catch (err) {
    return APIResponse(res, false, 500, 'Create task failed', err);
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, assignees, status } = req.body;

    const task = await Task.findById(id);
    if (!task) return APIResponse(res, false, 404, 'Task not found');

    if (title) task.title = title;
    if (description) task.description = description;
    if (assignees) task.assignees = assignees;
    if (status) task.status = status;

    await task.save();

    await task.populate([
      { path: 'comments.user', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'project', select: 'name owner' },
    ])

    await ActivityLog.create({
      project: task.project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_updated',
      meta: { title: task.title },
    });
    io.emit("taskUpdated", task);
    return APIResponse(res, true, 200, 'Task updated', task);
  } catch (err) {
    return APIResponse(res, false, 500, 'Update task failed', err);
  }
};

export const moveTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await Task.findByIdAndUpdate(id, { status }, { new: true }).populate([
      { path: 'comments.user', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'project', select: 'name owner' },
    ]);

    await ActivityLog.create({
      project: updated!.project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_moved',
      meta: { status },
    });
    io.emit("taskUpdated", updated);

    return APIResponse(res, true, 200, 'Task moved', updated);
  } catch (err) {
    return APIResponse(res, false, 500, 'Move failed', err);
  }
};

export const commentTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const task = await Task.findById(id);
    if (!task) return APIResponse(res, false, 404, 'Task not found');
    // @ts-expect-error
    task.comments.push({ user: req.user.id, text });
    await task.save();

    await task.populate([
      { path: 'comments.user', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'project', select: 'name owner' },
    ]);

    await ActivityLog.create({
      project: task.project,
      // @ts-expect-error
      user: req.user.id,
      action: 'task_commented',
      meta: { text },
    });
    return APIResponse(res, true, 200, 'Comment added', task);
  } catch (err) {
    return APIResponse(res, false, 500, 'Comment failed', err);
  }
};

export const editComment = async (req: Request, res: Response) => {
  try {
    const { id, commentId } = req.params;
    const { text } = req.body;
    // @ts-expect-error
    const userId = req.user.id;

    const task = await Task.findById(id);
    if (!task) return APIResponse(res, false, 404, 'Task not found');

    const comment = task.comments.id(commentId);
    if (!comment) return APIResponse(res, false, 404, 'Comment not found');

    // Only owner can edit
    if (comment.user.toString() !== userId)
      return APIResponse(res, false, 403, 'Not authorized to edit');

    comment.text = text;
    await task.save();

    await task.populate([
      { path: 'comments.user', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'project', select: 'name owner' },
    ]);
    return APIResponse(res, true, 200, 'Comment updated', task);
  } catch (err) {
    return APIResponse(res, false, 500, 'Edit failed', err);
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id, commentId } = req.params;
    // @ts-expect-error
    const userId = req.user.id;

    const task = await Task.findById(id);
    if (!task) return APIResponse(res, false, 404, 'Task not found');

    const comment = task.comments.id(commentId);
    if (!comment) return APIResponse(res, false, 404, 'Comment not found');

    // Only owner can delete
    if (comment.user.toString() !== userId)
      return APIResponse(res, false, 403, 'Not authorized to delete');

    comment.deleteOne();
    await task.save();

    await task.populate([
      { path: 'comments.user', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'project', select: 'name owner' },
    ]);
    return APIResponse(res, true, 200, 'Comment deleted', task);
  } catch (err) {
    return APIResponse(res, false, 500, 'Delete failed', err);
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
    io.emit("taskDeleted", t._id);
    return APIResponse(res, true, 200, 'Task deleted successfully', null);
  } catch (err) {
    return APIResponse(res, false, 500, 'Delete task failed', err);
  }
};

export const listTasksByProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { search, filterStatus, filterAssignee } = req.query;
    const filter = { project: projectId };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (filterStatus && filterStatus !== "all") {
      filter.status = filterStatus;
    }

    if (filterAssignee && filterAssignee !== "all") {
      filter.assignees = filterAssignee;
    }
    const tasks = await Task.find(filter)
      .populate([
        { path: 'comments.user', select: 'name email' },
        { path: 'assignees', select: 'name email' },
        { path: 'project', select: 'name owner' },
      ])
      .sort({ createdAt: -1 });
    return APIResponse(res, true, 200, 'Tasks fetched', tasks);
  } catch (err) {
    return APIResponse(res, false, 500, 'Fetch tasks failed', err);
  }
};
