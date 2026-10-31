import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';

// to mark the attendance
export const markAttendance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const employee = await Employee.findOne({ workEmail: user.email });
    const employeeId = employee ? employee._id : user._id;

    const localDate = new Date();
    const todayUTC = new Date(
      Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate()
      )
    );

    // check if there is an approved or pending leave covering today
    const leave = await Leave.findOne({
      employee: employeeId,
      status: {
        $ne: 'Rejected',
      },
      fromDate: { $lte: todayUTC },
      toDate: { $gte: todayUTC },
    });

    if (leave) {
      return res.status(400).json({
        message: 'Cannot mark present on a day you have applied for leave.',
      });
    }

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: todayUTC,
    });

    if (attendance) {
      return res.status(400).json({
        message: 'Attendance already marked.',
      });
    }

    const newAttendance = await Attendance.create({
      employee: employeeId,
      date: todayUTC,
      status: 'Present',
    });

    res.status(200).json({
      message: 'Attendance marked successfully!',
      attendance: newAttendance,
    });
  } catch (e) {
    console.error('Mark Attendance Error: ', e);
    res.status(500).json({
      message: 'Server Error',
    });
  }
};

// to get Attendance History
export const getAttendanceHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const employee = await Employee.findOne({ workEmail: user.email });
    const employeeId = employee ? employee._id : user._id;

    const attendance = await Attendance.find({
      employee: employeeId,
    })
      .sort({ date: -1 })
      .populate('employee', 'name employee');

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
      joiningDate: employee ? employee.joiningDate : user.createdAt,
    });
  } catch (e) {
    console.error('Get Attendance History Error: ', e);
    res.status(500).json({
      message: 'Server Error',
    });
  }
};

// to get attendance by date
export const getAttendanceByDate = async (req, res) => {
  try {
    console.log(req.params);
    const { date } = req.params;
    const queryDate = new Date(date);

    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid date format',
      });
    }

    const attendance = await Attendance.find({
      date: queryDate,
    }).populate('employee', 'name employeeId');

    res.status(200).json({
      message: 'Attendance History Fetch Successfully!',
      attendance,
    });
  } catch (e) {
    console.error('Get Attendance History By Date Error: ', e);
    res.status(500).json({
      message: 'Server Error',
    });
  }
};
