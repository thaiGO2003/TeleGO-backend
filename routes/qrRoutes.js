const QRCode = require('qrcode');
const s3 = require('../config/s3');
const shortId = require('shortid');
const express = require('express');
const router = express.Router();
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const User = require('../models/UserModel');

const generateUserQrAndUpload = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'Thiếu userId' });

    // Lấy thông tin người dùng
    const user = await User.findById(userId).select('fullName avatar qrImageUrl');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    // Nếu đã có qrImageUrl thì trả luôn, không tạo mới
    if (user.qrImageUrl) {
      return res.status(200).json({
        message: 'Lấy mã QR thành công',
        qrImageUrl: user.qrImageUrl,
        userId,
      });
    }

    // Nội dung QR là chuỗi JSON chứa userId, fullName, avatar
    const qrPayload = {
      userId,
      fullName: user.fullName,
      avatar: user.avatar,
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
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

    // Cập nhật vào user
    user.qrImageUrl = qrImageUrl;
    await user.save();

    res.status(200).json({
      message: 'Lấy mã QR thành công',
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
