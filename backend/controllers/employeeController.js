import Employee from '../models/Employee.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * @description Creates a new employee and their associated user login account.
 *
 * This controller performs the following operations:
 * 1. Validates that a profile image has been uploaded.
 * 2. Extracts employee information from the request body.
 * 3. Checks for duplicate employee IDs, personal emails, and work emails.
 * 4. Verifies whether the work email is already registered in the User collection.
 * 5. Removes an existing non-admin user account without a matching employee record.
 * 6. Hashes the employee's work password using bcrypt.
 * 7. Uploads the employee's profile image to ImageKit.
 * 8. Creates the employee record in the Employee collection.
 * 9. Creates the employee's login credentials in the User collection.
 * 10. Attempts to roll back created resources if database operations fail.
 * 11. Returns a success response with the newly created employee.
 *
 * @route POST /api/employees
 * @param {Object} req - Express request containing employee data and uploaded image.
 * @param {Object} res - Express response containing the operation result.
 * @returns {Promise<void>} Sends an HTTP JSON response.
 */

export const createEmployee = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile image is required.',
      });
    }

    const {
      employeeId,
      name,
      email,
      workEmail,
      workPassword,
      phone,
      gender,
      department,
      designation,
      salary,
      salaryPeriod,
      joiningDate,
      bankName,
      accountNumber,
      ifscCode,
      accountStatus,
    } = req.body;

    const existingEmployee = await Employee.findOne({
      $or: [{ employeeId }, { email }, { workEmail }],
    });

    if (existingEmployee) {
      if (existingEmployee.employeeId === employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists',
        });
      }

      if (existingEmployee.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Personal email already exists',
        });
      }

      if (existingEmployee.workEmail === workEmail) {
        return res.status(400).json({
          success: false,
          message: 'Work email already exists',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Employee already exists',
      });
    }

    const existingUser = await User.findOne({
      email: workEmail,
    });

    if (existingUser) {
      const correspondingEmployee = await Employee.findOne({ workEmail });

      if (!correspondingEmployee && existingUser.role !== 'admin') {
        await User.deleteOne({
          _id: existingUser._id,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'User account with this work email already exists',
        });
      }
    }

    const hashedPassword = await bcrypt.hash(workPassword, 10);

    let profileImageUrl = '';

    if (req.file) {
      try {
        const fileName = `emp_profile_${employeeId}_${Date.now()}_${req.file.originalname}`;
        const uploadResult = await uploadToImageKit(req.file.buffer, fileName);
        profileImageUrl = uploadResult.url;
      } catch (uploadErr) {
        return res.status(500).json({
          success: false,
          message: uploadErr.message,
        });
      }
    }

    let employee;

    try {
      employee = await Employee.create({
        employeeId,
        name,
        email,
        workEmail,
        workPassword,
        phone,
        gender,
        department,
        designation,
        salary,
        salaryPeriod,
        joiningDate,
        bankName,
        accountNumber,
        ifscCode,
        accountStatus,
        profileImage: profileImageUrl,
      });
    } catch (dbErr) {
      if (profileImageUrl) {
        await deleteFromImageKit(profileImageUrl).catch((err) =>
          console.error('ImageKit rollback failed:', err)
        );
      }

      return res.status(500).json({
        success: false,
        message: dbErr.message,
      });
    }

    try {
      await User.create({
        name,
        email: workEmail,
        password: hashedPassword,
        role: 'user',
        isVerified: true,
      });
    } catch (userErr) {
      await Employee.findByIdAndDelete(employee._id);

      if (profileImageUrl) {
        await deleteFromImageKit(profileImageUrl).catch((err) =>
          console.error('ImageKit rollback failed:', err)
        );
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create user login credentials: ' + userErr.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee,
    });
  } catch (e) {}
};
