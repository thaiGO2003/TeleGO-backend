const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    password: { type: String, required: true},
    fullName: { type: String, required: false, min: 1, max: 60 },
    birthDate: { 
        type: String,
        required: false,
        // validate: {
        //     validator: (v) => {
        //         // Kiểm tra định dạng YYYY-MM-DD với regex
        //         const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        //         if (!dateRegex.test(v)) return false;

        //         // Tách năm, tháng, ngày
        //         const [year, month, day] = v.split('-').map(Number);

        //         // Kiểm tra tháng có hợp lệ hay không (1-12)
        //         if (month < 1 || month > 12) return false;

        //         // Kiểm tra ngày có hợp lệ không (tính theo tháng và năm)
        //         const date = new Date(year, month - 1, day);
        //         if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
        //             return false;
        //         }

        //         return true;
        //     },
        //     message: props => `${props.value} không phải là ngày sinh hợp lệ! (Định dạng: YYYY-MM-DD)`
        // }
    },
    email: { 
        type: String, 
        required: false, 
        unique: false, // Không cần unique nữa
        validate: {
            validator: (v) => v ? /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(v) : true, // Kiểm tra email chỉ khi có giá trị
            message: props => `${props.value} không phải là email hợp lệ!`
        }
    },
    avatar: { type: String },
    phoneNumber: { 
        type: String, 
        required: true, 
        unique: true,
        validate: {
            validator: (v) => /\d{10}/.test(v),
            message: props => `${props.value} không phải số điện thoại hợp lệ!`
        }
    },
    gender: { 
        type: String,
        enum: ['male', 'female', 'other'], // bạn có thể sửa lại nếu muốn giá trị khác
        required: false
    },
    status: { type: String, default: 'offline' },
    otp: String,
    otpExpires: Date,
     qrImageUrl: {
    type: String,
    default: null,
  },
}, { collection: 'user' });

module.exports = mongoose.model('User', UserSchema);
