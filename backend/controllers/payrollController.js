import Payroll from '../models/Payroll.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

/**
 * @description Creates a new payroll record for an employee (admin-only).
 *
 * This controller performs the following operations:
 * 1. Extracts payroll information from the request body.
 * 2. Validates that all required payroll fields are provided.
 * 3. Checks for existing yearly payroll records to prevent duplicate
 *    payslips within the same calendar year.
 * 4. Checks for existing payroll records for the same employee and salary period.
 * 5. Generates a unique payroll ID using the format "PAY-XXXX".
 * 6. Verifies that the generated payroll ID does not already exist.
 * 7. Assigns default values of 0 for bonus, overtime, and deductions.
 * 8. Sets the payroll status to "Paid" if no status is provided.
 * 9. Associates the payroll record with the authenticated user who created it.
 * 10. Saves the new payroll record in the Payroll collection.
 *
 * @access Admin (authorization must be enforced by route middleware)
 * @param {Object} req - Express request containing payroll information and authenticated user data.
 * @param {Object} res - Express response containing the operation result.
 * @returns {Promise<void>} Handles payroll creation and HTTP responses.
 *
 * @note The controller currently references an undefined "employee" variable
 * when checking the salary period. It also needs a success response and
 * proper error handling in the catch block.
 */

export const createPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      empId,
      name,
      role,
      department,
      payDate,
      salaryPeriod,
      month,
      baseSalary,
      bonus,
      overtime,
      deduction,
      netSalary,
      status,
    } = req.body;

    if (
      !employeeId ||
      !empId ||
      !name ||
      !role ||
      !department ||
      !payDate ||
      !salaryPeriod ||
      !month ||
      baseSalary === undefined ||
      netSalary === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'All required payroll fields must be provided.',
      });
    }

    // to find employee
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Employee does not exist',
      });
    }

    if (employee.salaryPeriod === 'year') {
      const yearPart = salaryPeriod.substring(0, 4);
      const existingYearly = await Payroll.findOne({
        employeeId,
        salaryPeriod: { $regex: `^${yearPart}-` },
      });
      if (existingYearly) {
        return res.status(400).json({
          success: false,
          message:
            'Payslip already generated for this employee in this calendar year.',
        });
      }
    } else {
      const existing = await Payroll.findOne({ employeeId, salaryPeriod });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Payslip already generated for this employee and period.',
        });
      }
    }

    // to generate unique Payroll ID
    let payrollId = '';
    let unique = false;

    while (!unique) {
      const num = Math.floor(1000 + Math.random() * 9000);
      payrollId = `PAY-${num}`;
      const check = await Payroll.findOne({ payrollId });
      if (!check) {
        unique = true;
      }
    }

    const record = await Payroll.create({
      payrollId,
      employeeId,
      empId,
      name,
      role,
      department,
      payDate,
      salaryPeriod,
      month,
      baseSalary,
      bonus: bonus || 0,
      overtime: overtime || 0,
      deduction: deduction || 0,
      netSalary,
      status: status || 'Paid',
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Payslip generated successfully.',
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};

// to get payroll records(admin can fetch all, while employee see their own)
export const getPayroll = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let query = {};

    if (user.role !== 'admin') {
      const employee = await Employee.findOne({
        workEmail: user.email.toLowerCase(),
      });

      if (!employee) {
        return res.status(200).json({
          success: true,
          records: [],
        }); // for no matching doc for this employee
      }

      query = { employeeId: employee._id };
    }

    const records = await Payroll.find(query)
      .populate('employeeId')
      .sort({ payDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      records,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};
