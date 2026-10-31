import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  getAttendanceByDate,
  getAttendanceHistory,
  markAttendance,
} from '../controllers/attendanceController.js';

const attendanceRouter = express.Router();

attendanceRouter.post('/mark', verifyToken, markAttendance);
attendanceRouter.get('/', verifyToken, getAttendanceHistory);
attendanceRouter.get('/:date', verifyToken, getAttendanceByDate);

export default attendanceRouter;
