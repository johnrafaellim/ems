import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectDB } from './config/db.js';
import authRouter from './routes/authRoutes.js';
import employeeRouter from './routes/employeeRoutes.js';

const PORT = 8000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// db
connectDB();

// routes
app.use('/api/auth', authRouter);
app.use('/api/employee', employeeRouter);

app.get('/', (req, res) => {
  res.send('API WORKING');
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
