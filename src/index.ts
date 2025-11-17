import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import projectsRoutes from './routes/projects.routes';
import tasksRoutes from './routes/tasks.routes';
import invitationRoutes from './routes/invitation.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { log } from './utils/logger';
import activityRoutes from './routes/activity.routes';
import http from "http";                  
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

// Allow credentials for refresh cookie
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

// health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/invitations", invitationRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);      

const io = new Server(server, {           
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

export { io };

// start
const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => log.info(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    log.error('Failed to start', err);
    process.exit(1);
  }
};

start();
