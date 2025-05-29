// const groupModel = require("../models/GroupModel");
// const userModel = require("../models/UserModel");

// exports.createGroup = async (req, res) => {
//   const { groupName, groupMembers, groupAdmin } = req.body;
//   try {
//     if (!groupName || groupName.trim() === "") {
//       return res.status(400).json({ message: "Group name is required" });
//     }

//     if (groupMembers.length < 2) {
//       return res
//         .status(400)
//         .json({ message: "Group member must be greater than 2" });
//     }

//     const newGroup = new groupModel({
//       groupName,
//       groupMembers,
//       groupAdmin,
//       groupDeputy: [],
//       createdAt: new Date(),
//       avatar:
//         "https://becnmnhom8.s3.ap-southeast-1.amazonaws.com/_WRtPzVMq-group.png",
//       link: "",
//     });

//     const group = await newGroup.save();
//     res.json(group);
//   } catch (err) {
//     console.error("Error creating group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.addMember = async (req, res) => {
//   const { groupId, memberIds } = req.body; // giờ là mảng memberIds

//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     if (!Array.isArray(memberIds) || memberIds.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "memberIds must be a non-empty array" });
//     }

//     const addedMembers = [];

//     memberIds.forEach((id) => {
//       if (!group.groupMembers.includes(id)) {
//         group.groupMembers.push(id);
//         addedMembers.push(id);
//       }
//     });

//     if (addedMembers.length === 0) {
//       return res.status(409).json({ message: "All members already in group" });
//     }

//     const groupData = await group.save();
//     res.json({
//       message: "Members added successfully",
//       addedMembers,
//       group: groupData,
//     });
//   } catch (err) {
//     console.error("Error adding members:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // exports.removeMember = async (req, res) => {
// //     const { groupId, memberId, requesterId } = req.body;

// //     try {
// //         const group = await groupModel.findById(groupId);
// //         if (!group) {
// //             return res.status(404).json({ message: "Group not found" });
// //         }

// //         // Chỉ cho phép trưởng nhóm thực hiện thao tác xoá
// //         if (group.groupAdmin !== requesterId) {
// //             return res.status(403).json({ message: "Only group admin can remove members" });
// //         }

// //         const memberIndex = group.groupMembers.indexOf(memberId);
// //         if (memberIndex === -1) {
// //             return res.status(402).json({ message: "Member not found in group" });
// //         }

// //         // Không cho phép admin tự xoá chính mình
// //         if (group.groupAdmin === memberId) {
// //             return res.status(401).json({ message: "Admin cannot be removed" });
// //         }

// //         // Xoá thành viên khỏi danh sách thành viên
// //         group.groupMembers.splice(memberIndex, 1);

// //         // Nếu thành viên cũng là phó nhóm thì xoá khỏi danh sách phó nhóm
// //         const deputyIndex = group.groupDeputy.indexOf(memberId);
// //         if (deputyIndex !== -1) {
// //             group.groupDeputy.splice(deputyIndex, 1);
// //         }

// //         const groupData = await group.save();
// //         res.json(groupData);
// //     } catch (err) {
// //         console.error("Error removing member:", err);
// //         res.status(500).json({ message: "Internal server error" });
// //     }
// // };

// exports.removeMember = async (req, res) => {
//   const { groupId, memberIds, requesterId } = req.body; // memberIds là mảng

//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Chỉ admin mới có quyền xoá thành viên
//     if (group.groupAdmin !== requesterId) {
//       return res
//         .status(403)
//         .json({ message: "Only group admin can remove members" });
//     }

//     if (!Array.isArray(memberIds) || memberIds.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "memberIds must be a non-empty array" });
//     }

//     const removed = [];
//     const skipped = [];

//     memberIds.forEach((memberId) => {
//       if (group.groupAdmin === memberId) {
//         skipped.push({ memberId, reason: "Cannot remove group admin" });
//         return;
//       }

//       const index = group.groupMembers.indexOf(memberId);
//       if (index === -1) {
//         skipped.push({ memberId, reason: "Not in group" });
//         return;
//       }

//       // Xoá khỏi groupMembers
//       group.groupMembers.splice(index, 1);
//       removed.push(memberId);

//       // Nếu là phó nhóm thì xoá luôn khỏi deputy
//       const deputyIndex = group.groupDeputy.indexOf(memberId);
//       if (deputyIndex !== -1) {
//         group.groupDeputy.splice(deputyIndex, 1);
//       }
//     });

//     const groupData = await group.save();

//     res.json({
//       message: "Remove members completed",
//       removed,
//       skipped,
//       group: groupData,
//     });
//   } catch (err) {
//     console.error("Error removing members:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.setDeputy = async (req, res) => {
//   const { groupId, deputyId, adminId } = req.body;
//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     } else if (group.groupDeputy.indexOf(deputyId) !== -1) {
//       return res.status(400).json({ message: "Deputy already in group" });
//     } else if (deputyId === group.groupAdmin) {
//       return res.status(401).json({ message: "Deputy cannot be the admin" });
//     } else if (group.groupAdmin !== adminId) {
//       return res
//         .status(403)
//         .json({ message: "Only the admin can set a deputy" });
//     }

//     group.groupDeputy.push(deputyId);
//     const groupData = await group.save();
//     res.json(groupData);
//   } catch (err) {
//     console.error("Error setting deputy:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.removeDeputy = async (req, res) => {
//   const { groupId, memberId, adminId } = req.body;
//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     } else if (group.groupAdmin !== adminId) {
//       return res
//         .status(403)
//         .json({ message: "Only the admin can remove a deputy" });
//     }

//     const memberIndex = group.groupDeputy.indexOf(memberId);
//     if (memberIndex === -1) {
//       return res.status(401).json({ message: "Deputy not found in group" });
//     }

//     group.groupDeputy.splice(memberIndex, 1);
//     const groupData = await group.save();
//     res.json(groupData);
//   } catch (err) {
//     console.error("Error removing deputy:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.changeAdmin = async (req, res) => {
//   const { groupId, adminId, newAdminId } = req.body;
//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }
//     if (group.groupAdmin !== adminId) {
//       return res
//         .status(403)
//         .json({ message: "You are not the admin of this group" });
//     } else if (group.groupMembers.indexOf(newAdminId) === -1) {
//       return res.status(401).json({ message: "New admin not found in group" });
//     }

//     group.groupAdmin = newAdminId;
//     const groupData = await group.save();
//     res.json(groupData);
//   } catch (err) {
//     console.error("Error changing admin:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.renameGroup = async (req, res) => {
//   const { groupId, idMember, newName } = req.body;
//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }
//     if (String(group.groupAdmin) !== String(idMember)) {
//       return res
//         .status(403)
//         .json({ message: "You are not the admin of this group" });
//     }
//     if (group.groupName === newName) {
//       return res
//         .status(401)
//         .json({ message: "New name is the same as the old name" });
//     }
//     if (!newName) {
//       return res.status(400).json({ message: "New name cannot be empty" });
//     }

//     group.groupName = newName;
//     const groupData = await group.save();
//     res.json(groupData);
//   } catch (err) {
//     console.error("Error renaming group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.deleteGroup = async (req, res) => {
//   const { groupId, memberId } = req.body;
//   try {
//     const group = await groupModel.findById(groupId);
//     console.log(1);
    
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }
//     console.log(2);
    
//     if (group.groupAdmin !== memberId) {
//       return res
//         .status(403)
//         .json({ message: "You are not the admin of this group" });
//     }

//     await groupModel.findByIdAndDelete(groupId);
//     res.json({ message: "Group deleted" });
//   } catch (err) {
//     console.error("Error deleting group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.leaveGroup = async (req, res) => {
//   const { groupId, memberId } = req.body;
//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }
//     const memberIndex = group.groupMembers.indexOf(memberId);
//     if (memberIndex === -1) {
//       return res.status(401).json({ message: "Member not found in group" });
//     } else if (group.groupAdmin === memberId) {
//       return res.status(403).json({ message: "Admin cannot leave group" });
//     }

//     group.groupMembers.splice(memberIndex, 1);
//     await group.save();
//     res.json({ message: "Member removed" });
//   } catch (err) {
//     console.error("Error leaving group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getGroupById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const group = await groupModel.findById(id);
//     res.status(200).json(group);
//   } catch (err) {
//     console.error("Error getting group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getGroupsByMemberId = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const groups = await groupModel.find({ groupMembers: id });
//     res.status(200).json(groups);
//   } catch (err) {
//     console.error("Error getting group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getAllGroups = async (req, res) => {
//   try {
//     const groups = await groupModel.find();
//     res.status(200).json(groups);
//   } catch (err) {
//     console.error("Error getting group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getMembersInGroup = async (req, res, next) => {
//   try {
//     const { groupId } = req.params;
//     const groupInfo = await groupModel.findById(groupId);
//     if (!groupInfo) {
//       return res.status(404).json({ msg: "Group not found" });
//     }

//     const members = await userModel.find({
//       _id: { $in: groupInfo.groupMembers },
//     });
//     const admin = await userModel.findById(groupInfo.groupAdmin);

//     return res.json({
//       admin,
//       members,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // exports.updateAvatar = async (req, res) => {
// //   const { groupId, avatar } = req.body;
// //   try {
// //     const group = await groupModel.findById(groupId);
// //     if (!group) {
// //       return res.status(404).json({ message: "Group not found" });
// //     }

// //     group.avatar = avatar;
// //     const groupData = await group.save();
// //     res.json(groupData);
// //   } catch (err) {
// //     console.error("Error updating avatar:", err);
// //     res.status(500).json({ message: "Internal server error" });
// //   }
// // };
// exports.updateAvatar = async (req, res) => {
//   const { groupId } = req.body;
//   try {
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Kiểm tra xem có file được upload không
//     if (!req.file) {
//       return res.status(400).json({ message: "No avatar file provided" });
//     }

//     // Lấy URL của file đã upload lên S3
//     const avatarUrl = req.file.location; // multer-s3 cung cấp URL trong req.file.location

//     // Cập nhật avatar của group
//     group.avatar = avatarUrl;
//     const groupData = await group.save();

//     res.json({
//       message: "Avatar updated successfully",
//       group: groupData,
//     });
//   } catch (err) {
//     console.error("Error updating avatar:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
const groupModel = require("../models/GroupModel");
const userModel = require("../models/UserModel");
const { getSocketIO, getOnlineUsers } = require("../utils/socket");
const {addMessage} = require("./messageController");
const SYSTEM_USER_ID = "68356b60184881aa5558a25a";

// exports.createGroup = async (req, res) => {
//   const { groupName, groupMembers, groupAdmin } = req.body;
//   try {
//     if (!groupName || groupName.trim() === "") {
//       return res.status(400).json({ message: "Group name is required" });
//     }

//     if (groupMembers.length < 2) {
//       return res.status(400).json({ message: "Group member must be greater than 2" });
//     }

//     const newGroup = new groupModel({
//       groupName,
//       groupMembers,
//       groupAdmin,
//       groupDeputy: [],
//       createdAt: new Date(),
//       avatar: "https://becnmnhom8.s3.ap-southeast-1.amazonaws.com/_WRtPzVMq-group.png",
//       link: "",
//     });

//     const group = await newGroup.save();

//     // Phát sự kiện Socket.IO
//     const io = getSocketIO();
//     if (io) {
//       const onlineUsers = getOnlineUsers();
//       groupMembers.forEach((memberId) => {
//         const memberSocket = onlineUsers.get(memberId.toString());
//         if (memberSocket) {
//           io.to(memberSocket).emit("groupCreated", {
//             groupId: group._id,
//             groupName: group.groupName,
//             groupAdmin: group.groupAdmin,
//             groupMembers: group.groupMembers,
//             createdAt: group.createdAt,
//           });
//           console.log(`📢 [Socket.IO] Emitted groupCreated to ${memberId}`);
//         }
//       });
//     } else {
//       console.error("Socket.IO instance not found");
//     }

//     res.json(group);
//   } catch (err) {
//     console.error("Error creating group:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
const mockRes = {
  json: (data) => data,
  status: () => ({ json: () => {} })
};

exports.createGroup = async (req, res) => {
  const { groupName, groupMembers, groupAdmin } = req.body;
  try {
    if (!groupName || groupName.trim() === "") {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Parse groupMembers nếu nó là chuỗi JSON
    let parsedMembers = groupMembers;
    if (typeof groupMembers === 'string') {
      try {
        parsedMembers = JSON.parse(groupMembers);
      } catch (err) {
        return res.status(400).json({ message: "Invalid groupMembers format. Must be a valid JSON array." });
      }
    }

    // Kiểm tra parsedMembers có phải là mảng và có đủ thành viên
    if (!Array.isArray(parsedMembers) || parsedMembers.length < 2) {
      return res.status(400).json({ message: "Group members must be an array with at least 2 members" });
    }

    // Xử lý avatar của nhóm
    let avatarUrl = "https://becnmnhom8.s3.ap-southeast-1.amazonaws.com/_WRtPzVMq-group.png"; // URL mặc định
    if (req.file) {
      avatarUrl = req.file.location; // URL từ S3
    }

    const newGroup = new groupModel({
      groupName,
      groupMembers: parsedMembers, // Sử dụng parsedMembers
      groupAdmin,
      groupDeputy: [],
      createdAt: new Date(),
      avatar: avatarUrl,
      link: "",
    });

    const group = await newGroup.save();

    const welcomeMessage = {
      from: SYSTEM_USER_ID,
      groupId: group._id,
      message: `Nhóm "${groupName}" đã được tạo!`,
      files: [],
      isGif: false,
      replyTo: null,
    };

    await addMessage({ body: welcomeMessage, file: null }, mockRes);

    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      parsedMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupCreated", {
            groupId: group._id,
            groupName: group.groupName,
            groupAdmin: group.groupAdmin,
            groupMembers: group.groupMembers,
            createdAt: group.createdAt,
            avatar: group.avatar,
          });
          console.log(`📢 [Socket.IO] Emitted groupCreated to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json(group);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};





exports.addMember = async (req, res) => {
  const { groupId, memberIds } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "memberIds must be a non-empty array" });
    }

    const addedMembers = [];
    const addedMemberNames = [];

    for (const id of memberIds) {
      if (!group.groupMembers.includes(id)) {
        group.groupMembers.push(id);
        addedMembers.push(id);
        const user = await userModel.findById(id);
        if (user) addedMemberNames.push(user.fullName || "Unknown");
      }
    }

    if (addedMembers.length === 0) {
      return res.status(409).json({ message: "All members already in group" });
    }

    const groupData = await group.save();

    const notificationMessage = {
      from: SYSTEM_USER_ID,
      groupId: group._id,
      message: `${addedMemberNames.join(", ")} đã được thêm vào nhóm.`,
      files: [],
      isGif: false,
      replyTo: null,
    };

    await addMessage({ body: notificationMessage, file: null }, mockRes);

    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      addedMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupMemberAdded", {
            groupId,
            groupName: group.groupName,
            addedMemberId: memberId,
          });
          console.log(`📢 [Socket.IO] Emitted groupMemberAdded to ${memberId}`);
        }
      });
      group.groupMembers.forEach((memberId) => {
        if (!addedMembers.includes(memberId.toString()) && memberId.toString() !== group.groupAdmin) {
          const memberSocket = onlineUsers.get(memberId.toString());
          if (memberSocket) {
            io.to(memberSocket).emit("groupUpdated", {
              groupId,
              groupName: group.groupName,
              addedMembers,
            });
            console.log(`📢 [Socket.IO] Emitted groupUpdated to ${memberId}`);
          }
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({
      message: "Members added successfully",
      addedMembers,
      group: groupData,
    });
  } catch (err) {
    console.error("Error adding members:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeMember = async (req, res) => {
  const { groupId, memberIds, requesterId } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.groupAdmin !== requesterId) {
      return res.status(403).json({ message: "Only group admin can remove members" });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "memberIds must be a non-empty array" });
    }

    const removed = [];
    const skipped = [];
    const removedMemberNames = [];

    for (const memberId of memberIds) {
      if (group.groupAdmin === memberId) {
        skipped.push({ memberId, reason: "Cannot remove group admin" });
        continue;
      }

      const index = group.groupMembers.indexOf(memberId);
      if (index === -1) {
        skipped.push({ memberId, reason: "Not in group" });
        continue;
      }

      group.groupMembers.splice(index, 1);
      removed.push(memberId);
      const user = await userModel.findById(memberId);
      if (user) removedMemberNames.push(user.fullName || "Unknown");

      const deputyIndex = group.groupDeputy.indexOf(memberId);
      if (deputyIndex !== -1) {
        group.groupDeputy.splice(deputyIndex, 1);
      }
    }

    const groupData = await group.save();

    if (removed.length > 0) {
      const notificationMessage = {
        from: SYSTEM_USER_ID,
        groupId: group._id,
        message: `${removedMemberNames.join(", ")} đã bị xóa khỏi nhóm.`,
        files: [],
        isGif: false,
        replyTo: null,
      };
      await addMessage({ body: notificationMessage, file: null }, mockRes);
    }

    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      removed.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupMemberRemoved", {
            groupId,
            groupName: group.groupName,
            removedMemberId: memberId,
          });
          console.log(`📢 [Socket.IO] Emitted groupMemberRemoved to ${memberId}`);
        }
      });
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupUpdated", {
            groupId,
            groupName: group.groupName,
            removedMembers: removed,
          });
          console.log(`📢 [Socket.IO] Emitted groupUpdated to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({
      message: "Remove members completed",
      removed,
      skipped,
      group: groupData,
    });
  } catch (err) {
    console.error("Error removing members:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.setDeputy = async (req, res) => {
  const { groupId, deputyId, adminId } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    } else if (group.groupDeputy.indexOf(deputyId) !== -1) {
      return res.status(400).json({ message: "Deputy already in group" });
    } else if (deputyId === group.groupAdmin) {
      return res.status(401).json({ message: "Deputy cannot be the admin" });
    } else if (group.groupAdmin !== adminId) {
      return res.status(403).json({ message: "Only the admin can set a deputy" });
    }

    group.groupDeputy.push(deputyId);
    const groupData = await group.save();

    // Phát sự kiện Socket.IO
    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupUpdated", {
            groupId,
            groupName: group.groupName,
            newDeputyId: deputyId,
          });
          console.log(`📢 [Socket.IO] Emitted groupUpdated to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json(groupData);
  } catch (err) {
    console.error("Error setting deputy:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeDeputy = async (req, res) => {
  const { groupId, memberId, adminId } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    } else if (group.groupAdmin !== adminId) {
      return res.status(403).json({ message: "Only the admin can remove a deputy" });
    }

    const memberIndex = group.groupDeputy.indexOf(memberId);
    if (memberIndex === -1) {
      return res.status(401).json({ message: "Deputy not found in group" });
    }

    group.groupDeputy.splice(memberIndex, 1);
    const groupData = await group.save();

    // Phát sự kiện Socket.IO
    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupUpdated", {
            groupId,
            groupName: group.groupName,
            removedDeputyId: memberId,
          });
          console.log(`📢 [Socket.IO] Emitted groupUpdated to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json(groupData);
  } catch (err) {
    console.error("Error removing deputy:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.changeAdmin = async (req, res) => {
  const { groupId, adminId, newAdminId } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (group.groupAdmin !== adminId) {
      return res.status(403).json({ message: "You are not the admin of this group" });
    } else if (group.groupMembers.indexOf(newAdminId) === -1) {
      return res.status(401).json({ message: "New admin not found in group" });
    }

    group.groupAdmin = newAdminId;
    const groupData = await group.save();

    const newAdmin = await userModel.findById(newAdminId);
    const newAdminName = newAdmin ? newAdmin.fullName || "Unknown" : "Unknown";
    const notificationMessage = {
      from: SYSTEM_USER_ID,
      groupId: group._id,
      message: `${newAdminName} đã được bổ nhiệm làm quản trị viên mới của nhóm.`,
      files: [],
      isGif: false,
      replyTo: null,
    };
    await addMessage({ body: notificationMessage, file: null }, mockRes);

    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupUpdated", {
            groupId,
            groupName: group.groupName,
            newAdminId,
            message: notificationMessage.message,
          });
          console.log(`📢 [Socket.IO] Emitted groupUpdated to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json(groupData);
  } catch (err) {
    console.error("Error changing admin:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.renameGroup = async (req, res) => {
  const { groupId, idMember, newName } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (String(group.groupAdmin) !== String(idMember)) {
      return res.status(403).json({ message: "You are not the admin of this group" });
    }
    if (group.groupName === newName) {
      return res.status(401).json({ message: "New name is the same as the old name" });
    }
    if (!newName) {
      return res.status(400).json({ message: "New name cannot be empty" });
    }

    group.groupName = newName;
    const groupData = await group.save();

    const notificationMessage = {
      from: SYSTEM_USER_ID,
      groupId: group._id,
      message: `Nhóm đã được đổi tên thành "${newName}".`,
      files: [],
      isGif: false,
      replyTo: null,
    };
    await addMessage({ body: notificationMessage, file: null }, mockRes);

    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupRenamed", {
            groupId,
            newName,
            message: notificationMessage.message,
          });
          console.log(`📢 [Socket.IO] Emitted groupRenamed to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json(groupData);
  } catch (err) {
    console.error("Error renaming group:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteGroup = async (req, res) => {
  const { groupId, memberId } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (group.groupAdmin !== memberId) {
      return res.status(403).json({ message: "You are not the admin of this group" });
    }

    await groupModel.findByIdAndDelete(groupId);

    // Phát sự kiện Socket.IO
    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupDeleted", {
            groupId,
            groupName: group.groupName,
          });
          console.log(`📢 [Socket.IO] Emitted groupDeleted to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({ message: "Group deleted" });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.leaveGroup = async (req, res) => {
  const { groupId, memberId } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    const memberIndex = group.groupMembers.indexOf(memberId);
    if (memberIndex === -1) {
      return res.status(401).json({ message: "Member not found in group" });
    } else if (group.groupAdmin === memberId) {
      return res.status(403).json({ message: "Admin cannot leave group" });
    }

    group.groupMembers.splice(memberIndex, 1);
    await group.save();

    const user = await userModel.findById(memberId);
    const memberName = user ? user.fullName || "Unknown" : "Unknown";
    const notificationMessage = {
      from: SYSTEM_USER_ID,
      groupId: group._id,
      message: `${memberName} đã rời nhóm.`,
      files: [],
      isGif: false,
      replyTo: null,
    };
    await addMessage({ body: notificationMessage, file: null }, mockRes);

    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      const leaverSocket = onlineUsers.get(memberId.toString());
      if (leaverSocket) {
        io.to(leaverSocket).emit("groupMemberRemoved", {
          groupId,
          groupName: group.groupName,
          removedMemberId: memberId,
          message: notificationMessage.message,
        });
        console.log(`📢 [Socket.IO] Emitted groupMemberRemoved to ${memberId}`);
      }
      group.groupMembers.forEach((remainingMemberId) => {
        const memberSocket = onlineUsers.get(remainingMemberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("groupUpdated", {
            groupId,
            groupName: group.groupName,
            removedMembers: [memberId],
            message: notificationMessage.message,
          });
          console.log(`📢 [Socket.IO] Emitted groupUpdated to ${remainingMemberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({ message: "Member removed" });
  } catch (err) {
    console.error("Error leaving group:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateAvatar = async (req, res) => {
  const { groupId } = req.body;
  try {
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No avatar file provided" });
    }

    const avatarUrl = req.file.location;
    group.avatar = avatarUrl;
    const groupData = await group.save();

    const notificationMessage = {
      from: SYSTEM_USER_ID,
      groupId: group._id,
      message: `Ảnh đại diện nhóm đã được cập nhật.`,
      files: [{ url: avatarUrl, type: "image/jpeg" }],
      isGif: false,
      replyTo: null,
    };
    await addMessage({ body: notificationMessage, file: null }, mockRes);

    const io = getSocketIO();
    if (io) {
      const onlineUsers = getOnlineUsers();
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket) {
          io.to(memberSocket).emit("avatarUpdated", {
            groupId,
            avatar: avatarUrl,
            message: notificationMessage.message,
          });
          console.log(`📢 [Socket.IO] Emitted avatarUpdated to ${memberId}`);
        }
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({
      message: "Avatar updated successfully",
      group: groupData,
    });
  } catch (err) {
    console.error("Error updating avatar:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await groupModel.findById(id);
    res.status(200).json(group);
  } catch (err) {
    console.error("Error getting group:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getGroupsByMemberId = async (req, res) => {
  try {
    const { id } = req.params;
    const groups = await groupModel.find({ groupMembers: id });
    res.status(200).json(groups);
  } catch (err) {
    console.error("Error getting group:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllGroups = async (req, res) => {
  try {
    const groups = await groupModel.find();
    res.status(200).json(groups);
  } catch (err) {
    console.error("Error getting group:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMembersInGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const groupInfo = await groupModel.findById(groupId);
    if (!groupInfo) {
      return res.status(404).json({ msg: "Group not found" });
    }

    const members = await userModel.find({
      _id: { $in: groupInfo.groupMembers },
    });
    const admin = await userModel.findById(groupInfo.groupAdmin);

    return res.json({
      admin,
      members,
    });
  } catch (err) {
    next(err);
  }
};