import { Router } from 'express';
import { register, login, refresh, logout, forgotPassword, verifyOtp, resetPassword, updateProfile } from '../controllers/auth.controller';
import { auth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh); // client must send cookies (credentials)
router.post('/logout', logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.put("/update-profile", auth, updateProfile);

export default router;
