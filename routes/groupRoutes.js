const express = require("express");
const {
  createGroup,
  addMember,
  removeMember,
  setDeputy,
  removeDeputy,
  changeAdmin,
  renameGroup,
  deleteGroup,
  leaveGroup,
  getGroupById,
  getGroupsByMemberId,
  getAllGroups,
  getMembersInGroup,
  updateAvatar, joinGroup
} = require("../controllers/groupController");
const upload = require("../middlewares/upload-multipart"); // Import middleware upload
const router = express.Router();

// Tạo nhóm
router.post("/create-group", upload.single('avatar'), createGroup);
// Thêm thành viên vào nhóm
router.post("/add-member", addMember);

// Xóa thành viên khỏi nhóm
router.post("/remove-member", removeMember);

// Thiết lập phó nhóm
router.post("/set-deputy", setDeputy);

// Xóa phó nhóm
router.post("/remove-deputy", removeDeputy);

// Đổi quản trị viên nhóm
router.post("/change-admin", changeAdmin);

// Đổi tên nhóm
router.post("/rename-group", renameGroup);

// Xóa nhóm
router.delete("/delete-group", deleteGroup);

// Thành viên rời nhóm
router.post("/leave-group", leaveGroup);

// Lấy thông tin nhóm theo ID
router.get("/id/:id", getGroupById);

// Lấy tất cả nhóm của một thành viên
router.get("/member/:id", getGroupsByMemberId);

// Lấy tất cả nhóm
router.get("/all", getAllGroups);

// Lấy tất cả thành viên trong nhóm
router.get("/get-member/:groupId", getMembersInGroup);

// Cập nhật avatar nhóm
router.put("/update-avatar", upload.single("avatar"), updateAvatar);
router.post("/join-group", joinGroup);


module.exports = router;
