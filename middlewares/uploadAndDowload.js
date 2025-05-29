const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../config/s3"); // cấu hình s3 client

const fileFilter = (req, file, cb) => {
  // Chấp nhận mọi loại file, tuỳ bạn giới hạn thêm
  cb(null, true);
};

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    //acl: "public-read",
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

// module.exports = upload;
module.exports = upload.array("files", 10); // hoặc bao nhiêu file bạn muốn cho phép
