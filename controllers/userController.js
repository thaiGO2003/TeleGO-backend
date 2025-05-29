const UserModel = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const QRCode= require('qrcode');

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find({},'-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Lấy danh sách người dùng thất bại' });
    }
};

const createUser = async (req, res) => {
    try {
        const { password, phoneNumber } = req.body;

        
        const isValidPassword = (password) => {
            const passwordRegex =  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            return passwordRegex.test(password);
        };

        if (!isValidPassword(password)) {
            return res.status(400).json({
                message: 'Mật khẩu phải có ít nhất 8 ký tự, chứa ít nhất 1 số và 1 ký tự đặc biệt (!@#$%^&*)'
            });
        }
        // Kiểm tra nếu số điện thoại đã tồn tại
        const existingUser = await UserModel.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo tài khoản mới
        const newUser = await UserModel.create({
            password: hashedPassword,
            phoneNumber,
            status: 'offline', // Mặc định là offline
        });

        // Trả về thông tin người dùng mà không có mật khẩu
        const userWithoutPassword = await UserModel.findById(newUser._id).select('-password');
        res.status(201).json(userWithoutPassword);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// Get user by ID
const getUserById = async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get user by phone number
const getUserByPhoneNumber = async (req, res) => {
    try {
        const user = await UserModel.findOne({ phoneNumber: req.params.phoneNumber });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};




const updateUserByPhoneNumber = async (req, res) => {
    try {
        console.log("Request body: ", req.body);  // Log the body to see what you're sending

        let avatarUrl = req.body.avatar; // Nếu không có avatar mới, giữ nguyên giá trị cũ

        // Nếu có ảnh mới, upload lên S3 và lấy URL
        if (req.file) {
            // Giả sử bạn sử dụng upload.middleware để tải lên S3 và trả về URL
            avatarUrl = req.file.location;  // Giả sử `req.file.location` là URL của ảnh đã tải lên S3
        }

        // Cập nhật thông tin người dùng
        const user = await UserModel.findOneAndUpdate(
            { phoneNumber: req.params.phoneNumber },
            { ...req.body, avatar: avatarUrl }, // Cập nhật avatar nếu có
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        const userWithoutPassword = await UserModel.findById(user._id).select('-password');
        res.json(userWithoutPassword);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete user by ID
const deleteUserById = async (req, res) => {
    try {
        const user = await UserModel.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.status(200).json({ message: 'Xóa người dùng thành công' });
       // res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Login
const loginUser = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const user = await UserModel.findOne({ phoneNumber });
        if (!user) return res.status(404).json({ message: 'Số điện thoại không tồn tại' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Mật khẩu không đúng' });

        await UserModel.findByIdAndUpdate(user._id, { status: 'online' });
        //res.status(200).json(user);
        res.json({message: 'Đăng nhập thành công'}); 
       } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Logout
const logoutUser = async (req, res) => {
    try {
        const { userId } = req.body;
        await UserModel.findByIdAndUpdate(userId, { status: 'offline' });
        res.json({ message: 'Đăng xuất thành công' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get status by userId
const getUserStatus = async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.json({ status: user.status });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        const newPassword = Math.random().toString(36).slice(2, 10);
        const hashed = await bcrypt.hash(newPassword, 10);
        await UserModel.findByIdAndUpdate(user._id, { password: hashed });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'MẬT KHẨU MỚI',
            text: `Mật khẩu mới của bạn là: ${newPassword}. Hãy thay đổi ngay sau khi đăng nhập.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) return res.status(500).json({ message: error.message });
            res.json({ message: 'Gửi email thành công', info: info.response });
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Hàm kiểm tra mật khẩu hợp lệ (dùng chung)
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { lastpassword, newpassword } = req.body;
        const user = await UserModel.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        const isPasswordValid = await bcrypt.compare(lastpassword, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });

        if (!isValidPassword(newpassword)) {
            return res.status(400).json({
                message: 'Mật khẩu mới phải có ít nhất 8 ký tự, chứa ít nhất 1 số và 1 ký tự đặc biệt (!@#$%^&*)'
            });
        }

        const newHashed = await bcrypt.hash(newpassword, 10);
        await UserModel.findByIdAndUpdate(user._id, { password: newHashed });

        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Change password by phone number
const changePasswordByPhoneNumber = async (req, res) => {
    try {
        const { phoneNumber, newpassword } = req.body;

        const user = await UserModel.findOne({ phoneNumber });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        if (!isValidPassword(newpassword)) {
            return res.status(400).json({
                message: 'Mật khẩu mới phải có ít nhất 8 ký tự, chứa ít nhất 1 số và 1 ký tự đặc biệt (!@#$%^&*)'
            });
        }

        const newHashed = await bcrypt.hash(newpassword, 10);
        await UserModel.findByIdAndUpdate(user._id, { password: newHashed });

        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



module.exports = {
    getAllUsers,
    createUser,
    getUserById,
    getUserByPhoneNumber,
    updateUserByPhoneNumber,
    deleteUserById,
    loginUser,
    logoutUser,
    getUserStatus,
    forgotPassword,
    changePassword,
    changePasswordByPhoneNumber
};
