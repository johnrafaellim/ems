import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { applyLeave, getLeaves } from '../controllers/leaveController.js';

const leaveRouter = express.Router();

leaveRouter.post('/apply', verifyToken, applyLeave);
leaveRouter.get('/', verifyToken, getLeaves);

export default leaveRouter;
