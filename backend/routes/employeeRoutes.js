import express from 'express';
import multer from 'multer';
import { isAdmin, verifyToken } from '../middleware/authMiddleware.js';
import {
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
} from '../controllers/employeeController.js';

const employeeRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage({}),
});

employeeRouter.post(
  '/',
  verifyToken,
  isAdmin,
  upload.single('profileImage'),
  createEmployee
);

employeeRouter.get('/', verifyToken, isAdmin, getAllEmployees);
employeeRouter.get('/:id', verifyToken, isAdmin, getEmployee);

employeeRouter.put(
  '/:id',
  verifyToken,
  isAdmin,
  upload.single('profileImage'),
  updateEmployee
);

employeeRouter.delete('/:id', verifyToken, isAdmin, deleteEmployee);

export default employeeRouter;
