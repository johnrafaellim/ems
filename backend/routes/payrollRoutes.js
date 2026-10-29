import express from 'express';
import { isAdmin, verifyToken } from '../middleware/authMiddleware.js';
import { createPayroll } from '../controllers/payrollController.js';

const payrollRouter = express.Router();

payrollRouter.post('/', verifyToken, isAdmin, createPayroll);
payrollRouter.get('/', verifyToken, isAdmin, createPayroll);

export default payrollRouter;
