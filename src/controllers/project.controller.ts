import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import { Project } from '../models/Project';
import { ActivityLog } from '../models/ActivityLog';
import { User } from '../models/User';
import { Task } from '../models/Task';

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
    const projects = await Project.find({ members: userId }).populate('owner', 'name email').sort({ createdAt: -1 });
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
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return APIResponse(res, false, 404, "Project not found");
    }
    await Task.deleteMany({ project: id });
    // @ts-expect-error
    await ActivityLog.create({ project: id, user: req.user.id, action: 'project_deleted' });
    return APIResponse(res, true, 200, 'Project deleted');
  } catch (err) {
    return APIResponse(res, false, 500, 'Delete failed', err);
  }
};

export const inviteMember = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return APIResponse(res, false, 404, "User not found");
    const project = await Project.findById(projectId);
    if (!project) return APIResponse(res, false, 404, "Project not found");
    if (!project.members.includes(user._id)) {
      project.members.push(user._id);
      await project.save();
      // @ts-expect-error
      await ActivityLog.create({ project: project._id, user: req.user.id, action: "member_invited", meta: { invitedUser: user._id } });
    }
    return APIResponse(res, true, 200, "Member invited", { user });
  } catch (err) {
    return APIResponse(res, false, 500, "Invite failed", err);
  }
};

export const getProjectMembers = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate("members", "name email");
    if (!project) return APIResponse(res, false, 404, "Project not found");
    return APIResponse(res, true, 200, "Project members fetched", project.members);
  } catch (err) {
    return APIResponse(res, false, 500, "Fetch project members failed", err);
  }
};
