import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invitation", invitationSchema);
