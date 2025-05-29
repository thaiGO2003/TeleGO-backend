const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOTP = async (phoneNumber, otp) => {
    try {
        // Chuyển số điện thoại sang định dạng chuẩn quốc tế
        const number = phoneUtil.parse(phoneNumber, 'VN'); // 'VN' là mã quốc gia Việt Nam
        const formattedNumber = phoneUtil.format(number, require('google-libphonenumber').PhoneNumberFormat.E164);

        // Gửi OTP qua Twilio
        await client.messages.create({
            body: `Your OTP code is ${otp}`,
            to: formattedNumber,  // Sử dụng số điện thoại đã chuẩn hóa
            from: process.env.TWILIO_PHONE_NUMBER
        });
    } catch (err) {
        console.error('Error sending OTP:', err);
        throw err;
    }
};

module.exports = { sendOTP };  // Export hàm sendOTP
