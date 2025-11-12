import { Request, Response } from 'express';
import { ActivityLog } from '../models/ActivityLog';
import APIResponse from '../helper/apiResponse';

export const getProjectActivities = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const logs = await ActivityLog.find({ project: projectId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })

    return APIResponse(res, true, 200, 'Activity logs fetched', logs);
  } catch (err) {
    return APIResponse(res, false, 500, 'Failed to fetch activity logs', err);
  }
};
