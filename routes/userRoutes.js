const express = require('express');
const upload = require('../middlewares/upload');
const {
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
    changePasswordByPhoneNumber,
    changePassword
} = require('../controllers/userController');

const router = express.Router();

// Lấy tất cả người dùng
router.get('/', getAllUsers);

// Tạo người dùng mới (có upload avatar)
router.post('/', createUser);

// Đăng nhập
router.post('/login', loginUser);

// Đăng xuất
router.post('/logout', logoutUser);

// Lấy thông tin người dùng theo ID
router.get('/id/:id', getUserById);

// Lấy thông tin người dùng theo số điện thoại
router.get('/phone/:phoneNumber', getUserByPhoneNumber);

// Cập nhật người dùng theo số điện thoại
router.put('/phone/:phoneNumber', upload.single('avatar'), updateUserByPhoneNumber);

// Xóa người dùng theo ID
router.delete('/id/:id', deleteUserById);

// Lấy trạng thái online/offline
router.get('/status/:userId', getUserStatus);

// Quên mật khẩu
router.post('/forgot-password', forgotPassword);

// Đổi mật khẩu
router.put('/change-password/:id', changePassword);

router.put('/change-password-phone', changePasswordByPhoneNumber);

module.exports = router;