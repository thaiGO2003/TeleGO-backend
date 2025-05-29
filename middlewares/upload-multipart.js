// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const s3 = require("../config/s3"); // cấu hình s3 client

// const fileFilter = (req, file, cb) => {
//   // Chấp nhận mọi loại file, tuỳ bạn giới hạn thêm
//   cb(null, true);
// };

// const upload = multer({
//   storage: multerS3({
//     s3,
//     bucket: process.env.S3_BUCKET_NAME,
//     //acl: "public-read",
//     metadata: function (req, file, cb) {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: function (req, file, cb) {
//       const filename = `${Date.now()}-${file.originalname}`;
//       cb(null, filename);
//     },
//   }),
//   fileFilter,
// });

// module.exports = upload;
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../config/s3");

const fileFilter = (req, file, cb) => {
  cb(null, true); // bạn có thể lọc thêm nếu muốn
};

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    //acl: "public-read", // ✅ Cần thiết để ảnh xem được qua URL
    contentType: multerS3.AUTO_CONTENT_TYPE, // ✅ Giúp browser hiển thị đúng file
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
  fileFilter,
});

module.exports = upload;
