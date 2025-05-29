const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const upload = require('../middlewares/upload'); // bạn đã có sẵn
const s3 = require('../config/s3');
const shortId = require('shortid');
const express = require('express');
const router = express.Router();
const { PutObjectCommand } = require('@aws-sdk/client-s3');


// const generateUserQrAndUpload = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     if (!userId) return res.status(400).json({ message: 'Thiếu userId' });

//     // Tạo QR từ userId
//     const qrDataUrl = await QRCode.toDataURL(userId);

//     // Convert base64 to Buffer
//     const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
//     const buffer = Buffer.from(base64Data, 'base64');

//     const filename = `${shortId.generate()}-userQR.png`;

//     // Tạo lệnh upload
//     const putObjectParams = {
//       Bucket: process.env.S3_BUCKET_NAME,
//       Key: filename,
//       Body: buffer,
//       ContentEncoding: 'base64',
//       ContentType: 'image/png',
//     };

//     // Gửi lệnh PutObjectCommand
//     const command = new PutObjectCommand(putObjectParams);
//     await s3.send(command);

//     // Tạo URL truy cập file (tùy thuộc bucket cấu hình public/private)
//     const qrImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

//     res.status(200).json({
//       message: 'Tạo mã QR thành công',
//       qrImageUrl,
//       userId,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Lỗi tạo mã QR', error: err.message });
//   }
// };
const UserModel = require('../models/UserModel');

const generateUserQrAndUpload = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'Thiếu userId' });

    // Tìm user
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    // Nếu user đã có qrImageUrl thì trả về luôn
    if (user.qrImageUrl) {
      return res.status(200).json({
        message: 'Lấy mã QR thành công',
        qrImageUrl: user.qrImageUrl,
        userId,
      });
    }

    // Tạo QR mới
    const qrDataUrl = await QRCode.toDataURL(userId);
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${shortId.generate()}-userQR.png`;

    const putObjectParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: 'image/png',
    };

    const command = new PutObjectCommand(putObjectParams);
    await s3.send(command);

    const qrImageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

    // Lưu URL vào user
    user.qrImageUrl = qrImageUrl;
    await user.save();

    res.status(200).json({
      message: 'Tạo mã QR thành công',
      qrImageUrl,
      userId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo mã QR', error: err.message });
  }
};


router.get('/:userId', generateUserQrAndUpload);
module.exports = router;