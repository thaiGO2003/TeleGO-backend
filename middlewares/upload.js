const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('../config/s3');
const shortId = require('shortid');

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        // ❌ Xoá dòng này: acl: 'public-read',
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const filename = shortId.generate() + '-' + file.originalname;
            cb(null, filename);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload ảnh'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 2MB
});

module.exports = upload;
