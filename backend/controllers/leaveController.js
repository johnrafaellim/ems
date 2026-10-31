import Leave from '../models/Leave.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';

// to apply for leave
export const applyLeave = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const employee = await Employee.findOne({ workEmail: user.email });
    const employeeId = employee ? employee._id : user._id;

    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({
        message: 'All fields are invalid',
      });
    }

    // to mark present for that employee(check)
    const localDate = new Date();
    const todayUTC = new Date(
      Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate()
      )
    );

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: todayUTC,
      status: 'Present',
    });

    // to make sure if marked present then no leave
    // can be applied

    if (attendance) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      const fromUTC = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
      );
      const toUTC = new Date(
        Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
      );

      if (fromUTC <= todayUTC && toUTC >= todayUTC) {
        return res.status(400).json({
          success: false,
          message:
            'You cannot apply for leave on a day you have marked present.',
        });
      }
    }

    const leave = await Leave.create({
      employee: employeeId,
      fromDate,
      toDate,
      reason,
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Leave applied successfully!',
      leave,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

// to auto-reject expired leave
export const autoRejectExpiredLeaves = async () => {
  try {
    const localDate = new Date();
    const todayUTC = new Date(
      Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate()
      )
    );

    await Leave.updateMany(
      {
        status: 'Pending',
        toDate: { $lt: todayUTC },
      },
      {
        status: 'Rejected',
      }
    );
  } catch (e) {
    console.error('Error auto-rejecting expired leaves: ', e);
  }
};

// to get leaves
export const getLeaves = async (req, res) => {
  try {
    await autoRejectExpiredLeaves();

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const employee = await Employee.findOne({ workEmail: user.email });
    const employeeId = employee ? employee._id : user._id;

    const leaves = await Leave.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .populate('employee', 'name employeeId');

    return res.status(200).json({
      success: true,
      message: `Leave applied successfully!`,
      leaves,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};
