const QRCode = require('qrcode');
const shortId = require('shortid');
const express = require('express');
const router = express.Router();
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/s3');
const Group = require('../models/GroupModel');

const generateGroupQrAndUpload = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) return res.status(400).json({ message: 'Thiếu groupId' });

    // Lấy thông tin nhóm, bao gồm cả qrImageUrl
    const group = await Group.findById(groupId).select('groupName avatar qrImageUrl');
    if (!group) return res.status(404).json({ message: 'Không tìm thấy nhóm' });

    // Nếu đã có QR thì trả về luôn
    if (group.qrImageUrl) {
      return res.status(200).json({
        message: 'Lấy mã QR nhóm thành công',
        qrImageUrl: group.qrImageUrl,
        groupId,
      });
    }

    // Tạo nội dung QR
    const qrPayload = {
      groupId,
      groupName: group.groupName,
      avatar: group.avatar,
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `${shortId.generate()}-groupQR.png`;

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

    // Lưu lại vào DB
    group.qrImageUrl = qrImageUrl;
    await group.save();

    res.status(200).json({
      message: 'Lấy mã QR nhóm thành công',
      qrImageUrl,
      groupId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo mã QR nhóm', error: err.message });
  }
};

router.get('/:groupId', generateGroupQrAndUpload);
module.exports = router;
