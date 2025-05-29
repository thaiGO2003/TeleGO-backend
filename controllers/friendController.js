const FriendModel = require("../models/FriendModel");
const UserModel = require("../models/UserModel");
const { getSocketIO, getOnlineUsers } = require("../utils/socket");

exports.addFriend = async (req, res) => {
  const { idUser1, idUser2 } = req.body;
  console.log("addFriend called with:", { idUser1, idUser2 }); // Debug

  try {
    // Kiểm tra idUser1 và idUser2 có hợp lệ
    if (!idUser1 || !idUser2) {
      console.error("Missing idUser1 or idUser2");
      return res.status(400).json({ message: "Missing user IDs" });
    }

    // Kiểm tra người dùng tồn tại
    const user1 = await UserModel.findById(idUser1);
    const user2 = await UserModel.findById(idUser2);
    if (!user1 || !user2) {
      console.error("One or both users not found:", { idUser1, idUser2 });
      return res.status(404).json({ message: "User not found" });
    }

    // Kiểm tra yêu cầu trùng lặp
    const existing = await FriendModel.findOne({
      $or: [
        { idUser1, idUser2 },
        { idUser1: idUser2, idUser2: idUser1 },
      ],
    });
    if (existing) {
      console.log("Friend request already exists:", existing);
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Tạo yêu cầu kết bạn mới
    const newFriend = new FriendModel({
      idUser1,
      idUser2,
      status: 1,
      actionUserId: idUser1,
    });
    await newFriend.save();
    console.log("New friend request saved:", newFriend);

    // Phát sự kiện Socket.IO
    const io = getSocketIO();
    if (io) {
      console.log("Online users:", Array.from(getOnlineUsers().entries())); // Debug
      const sendUserSocket = getOnlineUsers().get(idUser2);
      if (sendUserSocket) {
        console.log(
          `Emitting receiveFriendRequest to socket: ${sendUserSocket}`
        );
        io.to(sendUserSocket).emit("receiveFriendRequest", {
          fromUserId: idUser1,
        });
      } else {
        console.log(`User ${idUser2} is not online`);
      }
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({ message: "Friend request sent" });
  } catch (err) {
    console.error("Error adding friend:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getFriends = async (req, res) => {
  const userId = req.params.userId;
  try {
    const friends = await FriendModel.find({
      $or: [{ idUser1: userId }, { idUser2: userId }],
      status: 2,
    });

    const friendDetails = [];
    for (const friend of friends) {
      const user1 = await UserModel.findById(friend.idUser1);
      const user2 = await UserModel.findById(friend.idUser2);
      const friendInfo = userId === friend.idUser1 ? user2 : user1;
      friendDetails.push({ friendInfo, friend });
    }
    res.json(friendDetails);
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.acceptFriend = async (req, res) => {
  const { idUser1, idUser2 } = req.body;
  try {
    const friend = await FriendModel.findOne({
      $or: [
        { idUser1, idUser2 },
        { idUser1: idUser2, idUser2: idUser1 },
      ],
      status: 1,
    });
    if (!friend) {
      console.log(`Friend request not found for idUser1: ${idUser1}, idUser2: ${idUser2}`);
      return res.status(404).json({ message: "Friend request not found" });
    }
    friend.status = 2;
    await friend.save();
    console.log(`Friend request accepted: ${friend._id}`);

    // Phát sự kiện Socket.IO
    const io = getSocketIO();
    if (io) {
      console.log("Online users:", Array.from(getOnlineUsers().entries()));
      const fromSocket = getOnlineUsers().get(idUser1);
      const toSocket = getOnlineUsers().get(idUser2);
      if (fromSocket) {
        console.log(`Emitting friendAccepted to socket: ${fromSocket} for user ${idUser1}`);
        io.to(fromSocket).emit("friendAccepted", {
          from: idUser2,
          to: idUser1,
        });
      } else {
        console.log(`User ${idUser1} is not online`);
      }
      if (toSocket) {
        console.log(`Emitting friendAccepted to socket: ${toSocket} for user ${idUser2}`);
        io.to(toSocket).emit("friendAccepted", {
          from: idUser2,
          to: idUser1,
        });
      } else {
        console.log(`User ${idUser2} is not online`);
      }
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("Error accepting friend:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// exports.rejectFriend = async (req, res) => {
//   const { idUser1, idUser2 } = req.body;
//   try {
//     const friend = await FriendModel.findOne({
//       $or: [
//         { idUser1, idUser2 },
//         { idUser1: idUser2, idUser2: idUser1 },
//       ],
//       status: 1,
//     });
//     if (!friend) {
//       return res.status(404).json({ message: "Friend request not found" });
//     }

//     await FriendModel.deleteOne({ _id: friend._id });
//     res.json({ message: "Friend request rejected" });
//   } catch (err) {
//     console.error("Error rejecting friend:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
exports.rejectFriend = async (req, res) => {
  const { idUser1, idUser2 } = req.body;
  try {
    const friend = await FriendModel.findOne({
      $or: [
        { idUser1, idUser2 },
        { idUser1: idUser2, idUser2: idUser1 },
      ],
      status: 1,
    });
    if (!friend) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    await FriendModel.deleteOne({ _id: friend._id });

    // Phát sự kiện Socket.IO
    const io = getSocketIO();
    if (io) {
      const senderSocket = getOnlineUsers().get(idUser1);
      if (senderSocket) {
        console.log(`Emitting rejectFriend to socket: ${senderSocket}`);
        io.to(senderSocket).emit("friendRejected", {
          from: idUser2,
          to: idUser1,
        });
      } else {
        console.log(`User ${idUser1} is not online`);
      }
    } else {
      console.error("Socket.IO instance not found");
    }

    res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error("Error rejecting friend:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



exports.getAddFriend = async (req, res) => {
  const userId = req.params.userId;
  try {
    // Chỉ lấy các yêu cầu mà userId là người nhận (idUser2)
    const friends = await FriendModel.find({
      idUser2: userId,
      status: 1,
    });

    const friendDetails = [];
    for (const friend of friends) {
      const user1 = await UserModel.findById(friend.idUser1); // Người gửi
      if (user1) {
        friendDetails.push({
          friendInfo: {
            _id: user1._id,
            fullName: user1.fullName,
            avatar: user1.avatar,
            phoneNumber: user1.phoneNumber,
          },
          friend,
        });
      }
    }
    console.log("getAddFriend response:", friendDetails); // Debug
    res.json(friendDetails);
  } catch (err) {
    console.error("Error get list addfriend:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.unfriend = async (req, res) => {
  const { idUser1, idUser2 } = req.body;
  try {
    // Kiểm tra đầu vào
    if (!idUser1 || !idUser2) {
      console.error("Thiếu idUser1 hoặc idUser2:", { idUser1, idUser2 });
      return res.status(400).json({ message: "Thiếu ID người dùng" });
    }

    // Xóa mối quan hệ bạn bè
    const friend = await FriendModel.findOneAndDelete({
      $or: [
        { idUser1, idUser2, status: 2 },
        { idUser1: idUser2, idUser2: idUser1, status: 2 },
      ],
    });
    if (!friend) {
      console.log("Không tìm thấy mối quan hệ bạn bè:", { idUser1, idUser2 });
      return res.status(404).json({ message: "Yêu cầu hủy kết bạn không tồn tại" });
    }

    // Phát sự kiện Socket.IO
    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();
    if (io && onlineUsers) {
      // Gửi sự kiện friendRemoved tới idUser1 (nếu trực tuyến)
      const user1Socket = onlineUsers.get(idUser1);
      if (user1Socket) {
        console.log(
          `📢 [Socket.IO] Gửi friendRemoved tới ${idUser1}, socket: ${user1Socket}`
        );
        io.to(user1Socket).emit("friendRemoved", {
          from: idUser1,
          removedUserId: idUser2,
        });
        console.log(`📢 [Socket.IO] Đã gửi friendRemoved tới ${idUser1}`);
      } else {
        console.log(
          `📢 [Socket.IO] Người dùng ${idUser1} không trực tuyến, không gửi friendRemoved`
        );
      }

      // Gửi sự kiện friendRemoved tới idUser2 (nếu trực tuyến)
      const user2Socket = onlineUsers.get(idUser2);
      if (user2Socket) {
        console.log(
          `📢 [Socket.IO] Gửi friendRemoved tới ${idUser2}, socket: ${user2Socket}`
        );
        io.to(user2Socket).emit("friendRemoved", {
          from: idUser2,
          removedUserId: idUser1,
        });
        console.log(`📢 [Socket.IO] Đã gửi friendRemoved tới ${idUser2}`);
      } else {
        console.log(
          `📢 [Socket.IO] Người dùng ${idUser2} không trực tuyến, không gửi friendRemoved`
        );
      }
    } else {
      console.error("Không tìm thấy Socket.IO hoặc onlineUsers");
    }

    res.json({ message: "Hủy kết bạn thành công" });
  } catch (err) {
    console.error("Lỗi khi hủy kết bạn:", err);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
