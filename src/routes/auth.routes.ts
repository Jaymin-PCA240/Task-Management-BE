import { Router } from 'express';
import { register, login, refresh, logout, forgotPassword, verifyOtp, resetPassword } from '../controllers/auth.controller';
// import { auth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh); // client must send cookies (credentials)
router.post('/logout', logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// // protected example: get current user info
// router.get('/me', auth, async (req, res) => {
//   // req.user set by auth middleware
//   res.json({ user: { id: req.user?.id, role: req.user?.role } });
// });

export default router;
