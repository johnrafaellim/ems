import User from '../models/User';
import Employee from '../models/Employee';
import bcrypt from 'bcryptjs';
import {sendOtpEmail, sendResetOtpEmail} from "../config/brevo.js";
import jwt from 'jsonwebtoken';

// to sign up an admin
export const signupAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: 'User already exist',
            })
        }

        // to hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // to generate 6 digits OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin",
            isVerified: false,
            verificationOtp: otp,
            verificationOtpExpires: otpExpires
        });

        // to send email that contains the otp
        sendOtpEmail(email, otp, name).catch((err) => console.error("Error sending admin verification OPT email: ", err));
        res.status(201).json({
            message: "Admin registered successfully. Please verify your email.",
            email: user.email
        })
    } catch (e) {
        console.error("Signup Error: ", e);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}

// to login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password",
            })
        }

        if (!user.isVerified) {
            return res.status(400).json({
                message: "Your account is not verified. Please verify your email.
                isVerified: false,
                email: user.email
            })
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(400).json({
                message: "Invalid password",
            })
        }

        // to generate token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        const employee = await Employee.findOne({
            workEmail: user.email
        })

        res.status(200).json({
            message: "Login Successfull",
            token,
            role: user.role,
            name: user.name,
            employeeId: employee ? employee.employeeId : undefined
        })
    } catch (e) {
        console.error("Login Error: ", e);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}

// to verify the otp
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required",
            })
        }

        const user = await User.findOne({ email });

        if (!user) {
            res.status(404).json({
                message: "User not found",
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: "Email is already verified",
            })
        }

        // to check if OTP matches or if otp time is expired
        if (user.verificationOtp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP code"
            })
        }

        if (new Date() > user.verificationOtpExpires) {
            return res.status(400).json({
                message: "OTP code has been expired. Please request a new one.",
            })
        }

        user.isVerified = true;
        user.verificationOtp = null;
        user.verificationOtpExpires = null;

        await user.save();

        res.status(200).json({
            message: "Email verified successfully! You can now log in."
        })
    } catch (e) {
        console.error("Verify OTP Error: ", e);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}

// to resend the otp
export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required",
            })
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password",
            })
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: "Email is already verified",
            })
        }

        // to generate 6 digits OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        user.verificationOtp = otp;
        user.verificationOtpExpires = otpExpires;

        await user.save();

        sendOtpEmail(email, otp, name).catch((err) => {
            console.error("Error resending the OTP email: ", err)
        })

        res.status(200).json({
            message: "A new OTP code has been sent to your email."
        })
    } catch (e) {
        console.error("Resend OTP Error: ", e);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}

// for forgot password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required",
            })
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password",
            })
        }

        // to generate 6 digits OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        user.resetPasswordOtp = otp;
        user.resetPasswordOtpExpires = otpExpires;

        await user.save();

        sendResetOtpEmail(email, otp, user.name).catch((err) => {
            console.error("Error resending the OTP email: ", err)
        })

        res.status(200).json({
            message: "Password reset OTP sent successfully to your email."
        });
    } catch (e) {
        console.error("Forgot Password Error: ", e);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}

// to reset the password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                message: "Email, OTP and new password are required."
            })
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password",
            })
        }

        if (user.resetPasswordOtp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP",
            })
        }

        if (new Date() > user.resetPasswordOtpExpires) {
            return res.status(400).json({
                message: "OTP code has been expired. Please request a new one.",
            })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetPasswordOtp = null;
        user.resetPasswordOtpExpires = null;

        await user.save();

        res.status(200).json({
            message: "Password reset OTP sent successfully to your email."
        })
    } catch (e) {
        console.error("Reset Password Error: ", e);
        res.status(500).json({
            message: "Internal server error",
        });
    }
}