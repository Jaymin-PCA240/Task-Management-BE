import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import { Project } from '../models/Project';
import { ActivityLog } from '../models/ActivityLog';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { inviteMemberEmail } from '../utils/mailer';

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

export const inviteMember = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const {projectId} = req.params;
    // @ts-expect-error
    const inviterId = req.user.id;

    const project = await Project.findById(projectId).populate('members', '_id email name');
    if (!project) return APIResponse(res, false, 404, 'Project not found');

    const inviter = await User.findById(inviterId);
    const invitedUser = await User.findOne({ email });
    if (!invitedUser) return APIResponse(res, false, 404, 'User not found');

    // check if already member
    if (project.members.some((m: any) => m._id.toString() === invitedUser._id.toString())) {
      return APIResponse(res, false, 400, 'User already a member');
    }

    project.members.push(invitedUser._id);
    await project.save();

    await ActivityLog.create({
      project: projectId,
      user: inviterId,
      action: 'member_invited',
      meta: { invited: invitedUser.email },
    });

    // 📧 Send Invite Email
    const inviteHtml = `
      <div style="font-family: Arial, sans-serif; line-height:1.5">
        <h2>Project Invitation - TaskFlow</h2>
        <p>Hello <strong>${invitedUser.name}</strong>,</p>
        <p>You’ve been invited to join the project <strong>${project.name}</strong> by <strong>${inviter?.name}</strong>.</p>
        <p>Log in to your account to access the project:</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block; background-color:#2563eb; color:white; padding:10px 18px; text-decoration:none; border-radius:5px;">
          Open Project
        </a>
        <p style="margin-top:16px; color:#555">If you didn’t expect this invitation, you can ignore this email.</p>
        <hr/>
        <small>— TaskFlow Team</small>
      </div>
    `;

    await inviteMemberEmail(
      invitedUser.email,
      `You're invited to join project "${project.name}"`,
      inviteHtml,
    );

    return APIResponse(res, true, 200, 'Member invited successfully', {
      email: invitedUser.email,
    });
  } catch (err) {
    console.error(err);
    return APIResponse(res, false, 500, 'Invite failed', err);
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
