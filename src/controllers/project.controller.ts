import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import { Project } from '../models/Project';
import { ActivityLog } from '../models/ActivityLog';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { inviteMemberEmail, removeMemberEmail } from '../utils/mailer';
import Invitation from '../models/Invitation';

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, members } = req.body;
    // @ts-expect-error
    const owner = req.user.id;
    const p = await Project.create({
      name,
      description,
      owner,
      members: [owner, ...(members || [])],
    });
    await ActivityLog.create({
      project: p._id,
      user: owner,
      action: 'project_created',
      meta: { name },
    });
    return APIResponse(res, true, 201, 'Project created', p);
  } catch (err) {
    return APIResponse(res, false, 500, 'Create project failed', err);
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error
    const userId = req.user.id;
    const projects = await Project.find({ members: userId })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    return APIResponse(res, true, 200, 'Projects fetched', projects);
  } catch (err) {
    return APIResponse(res, false, 500, 'Fetch projects failed', err);
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updated = await Project.findByIdAndUpdate(id, req.body, { new: true });
    await ActivityLog.create({
      project: id,
      // @ts-expect-error
      user: req.user.id,
      action: 'project_updated',
      meta: req.body,
    });
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
      return APIResponse(res, false, 404, 'Project not found');
    }
    await Task.deleteMany({ project: id });
    // @ts-expect-error
    await ActivityLog.create({ project: id, user: req.user.id, action: 'project_deleted' });
    return APIResponse(res, true, 200, 'Project deleted');
  } catch (err) {
    return APIResponse(res, false, 500, 'Delete failed', err);
  }
};

export const searchUsersToInvite = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const projectId = req.params.id;
    // @ts-expect-error
    const currentUserId = req.user.id;

    const project = await Project.findById(projectId).populate('members', '_id email');
    if (!project) return APIResponse(res, false, 404, 'Project not found');

    const excludeIds = [currentUserId, ...project.members.map((m: any) => m._id)];

    const users = await User.find({
      $and: [
        { _id: { $nin: excludeIds } },
        {
          $or: [
            { name: { $regex: query || '', $options: 'i' } },
            { email: { $regex: query || '', $options: 'i' } },
          ],
        },
      ],
    }).select('name email');

    return APIResponse(res, true, 200, 'Users fetched', users);
  } catch (err) {
    return APIResponse(res, false, 500, 'Search failed', err);
  }
};

export const getProjectDetails = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate([
      { path: 'members', select: 'name email' },
      { path: 'owner', select: 'name email' },
    ]);

    if (!project) return APIResponse(res, false, 404, 'Project not found');
    return APIResponse(res, true, 200, 'Project details fetched', project);
  } catch (err) {
    return APIResponse(res, false, 500, 'Fetch project details failed', err);
  }
};

export const removeProjectMember = async (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params;

    const project = await Project.findById(id);
    if (!project) return APIResponse(res, false, 404, "Project not found");

    if (project.owner.toString() === memberId) {
      return APIResponse(res, false, 400, "Cannot remove the project owner");
    }

    project.members = project.members.filter(
      (m: any) => m.toString() !== memberId
    );
    await project.save();

    await Task.updateMany(
      { project: id, assignees: memberId }, 
      { $unset: { assignees: [] } }          
    );

    const user = await User.findById(memberId);
    if (user) {
      await removeMemberEmail(
        user.email,
        `Removed from project "${project.name}"`,
        `Hello ${user.name},\n\nYou have been removed from the project "${project.name}".`
      );
    }

    await ActivityLog.create({
      project: id,
      user: memberId,
      action: "member_removed",
      meta: { email: user?.email },
    });

    return APIResponse(res, true, 200, "Member removed and email sent");
  } catch (err) {
    return APIResponse(res, false, 500, "Failed to remove member", err);
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error
    const userId = req.user.id;

    const totalProjects = await Project.countDocuments({
      $or: [{ owner: userId }, { members: userId }],
    });

    const totalTasks = await Task.countDocuments({
      assignees: userId,
    });

    const completedTasks = await Task.countDocuments({
      assignees: userId,
      status: "done",
    });

    const completedPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalInvitations = await Invitation.countDocuments({
      invitedUser: userId,
      status: "pending",
    });

    return APIResponse(res, true, 200, "Dashboard data fetched", {
      totalProjects,
      totalTasks,
      completedTasks,
      completedPercentage,
      totalInvitations,
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return APIResponse(res, false, 500, "Error fetching dashboard data", error);
  }
};
