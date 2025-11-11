import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  project: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  action: string; // e.g., "task_created", "task_moved"
  meta?: any;
  createdAt: Date;
}

const activitySchema = new Schema<IActivityLog>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activitySchema);
