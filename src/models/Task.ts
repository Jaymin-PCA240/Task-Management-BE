import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'todo' | 'inprogress' | 'inreview' | 'done';

export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  project: mongoose.Types.ObjectId;
  assignees: mongoose.Types.ObjectId[];
  comments: { user: Schema.Types.ObjectId; text: string; createdAt: Date }[];
  createdAt: Date;
}

const commentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
  },
  { timestamps: true },
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: ['todo', 'in-progress', 'in-review', 'done'], default: 'todo' },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
  },
  { timestamps: true },
);

export const Task = mongoose.model<ITask>('Task', taskSchema);
