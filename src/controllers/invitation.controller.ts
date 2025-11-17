import { Request, Response } from 'express';
import APIResponse from '../helper/apiResponse';
import Invitation from '../models/Invitation';
import { Project } from '../models/Project';
import { ActivityLog } from '../models/ActivityLog';
import { inviteMemberEmail } from '../utils/mailer';
import { User } from '../models/User';

export const sendInvitation = async (req: Request, res: Response) => {
  try {
    const { projectId, userId } = req.body;
    // @ts-expect-error
    const invitedBy = req.user.id;

    const existing = await Invitation.findOne({
      project: projectId,
      invitedUser: userId,
      status: 'pending',
    });
    if (existing) return APIResponse(res, false, 400, 'Invitation already exists');

    const invitation = await Invitation.create({
      project: projectId,
      invitedUser: userId,
      invitedBy,
    });
    const invitedUser = await User.findById(userId);
    const inviterUser = await User.findById(invitedBy);
    const project = await Project.findById(projectId).populate('members', '_id email name');

    const inviteHtml = `
      <div style="font-family: Arial, sans-serif; line-height:1.5">
        <h2>Project Invitation - TaskFlow</h2>
        <p>Hello <strong>${invitedUser?.name}</strong>,</p>
        <p>You’ve been invited to join the project <strong>${project?.name}</strong> by <strong>${inviterUser?.name}</strong>.</p>
        <p style="margin-top:16px; color:#555">If you didn’t expect this invitation, you can ignore this email.</p>
        <hr/>
        <small>— TaskFlow Team</small>
      </div>
    `;

    await inviteMemberEmail(
      invitedUser?.email,
      `You're invited to join project "${project?.name}"`,
      inviteHtml,
    );

    return APIResponse(res, true, 200, 'Invitation sent', invitation);
  } catch (err) {
    return APIResponse(res, false, 500, 'Failed to send invitation', err);
  }
};

export const getUserInvitations = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error
    const invitations = await Invitation.find({ invitedUser: req.user.id })
      .populate('project', 'name description')
      .populate('invitedBy', 'name email');

    return APIResponse(res, true, 200, 'Invitations fetched', invitations);
  } catch (err) {
    return APIResponse(res, false, 500, 'Failed to fetch invitations', err);
  }
};

export const approveInvitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) return APIResponse(res, false, 404, 'Invitation not found');

    if (invitation.status !== 'pending') {
      return APIResponse(res, false, 400, 'Invitation already processed');
    }

    invitation.status = 'approved';
    await invitation.save();

    // Add member to project
    const project = await Project.findById(invitation.project);
    if (!project.members.includes(invitation.invitedUser)) {
      project.members.push(invitation.invitedUser);
      await project.save();
    }

    // Log activity
    await ActivityLog.create({
      project: invitation.project,
      user: invitation.invitedUser,
      action: 'invitation_approved',
    });

    return APIResponse(res, true, 200, 'Invitation approved', invitation);
  } catch (err) {
    return APIResponse(res, false, 500, 'Failed to approve invitation', err);
  }
};

export const rejectInvitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) return APIResponse(res, false, 404, 'Invitation not found');

    invitation.status = 'rejected';
    await invitation.save();

    await ActivityLog.create({
      project: invitation.project,
      user: invitation.invitedUser,
      action: 'invitation_rejected',
    });

    return APIResponse(res, true, 200, 'Invitation rejected', invitation);
  } catch (err) {
    return APIResponse(res, false, 500, 'Failed to reject invitation', err);
  }
};
