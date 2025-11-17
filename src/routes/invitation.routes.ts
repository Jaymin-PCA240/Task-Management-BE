import { auth } from './../middlewares/auth.middleware';
import express from 'express';
import {
  sendInvitation,
  getUserInvitations,
  approveInvitation,
  rejectInvitation
} from "../controllers/invitation.controller";


const router = express.Router();

router.post("/send-invitation", auth, sendInvitation);
router.get("/my-invitations", auth, getUserInvitations);
router.patch("/:id/approve", auth, approveInvitation);
router.patch("/:id/reject", auth, rejectInvitation);

export default router;
