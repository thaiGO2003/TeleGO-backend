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
      return res.status(404).json({ message: "Friend request not found" });
    }
    friend.status = 2;
    await friend.save();

    // Phát sự kiện Socket.IO
    const io = req.app.get("io");
    if (io) {
      const fromSocket = getOnlineUsers().get(idUser1);
      const toSocket = getOnlineUsers().get(idUser2);
      if (fromSocket) {
        io.to(fromSocket).emit("friendAccepted", {
          from: idUser2,
          to: idUser1,
        });
      }
      if (toSocket) {
        io.to(toSocket).emit("friendAccepted", { from: idUser2, to: idUser1 });
      }
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
    const friend = await FriendModel.findOneAndDelete({
      $or: [
        { idUser1, idUser2 },
        { idUser1: idUser2, idUser2: idUser1 },
      ],
      status: 2,
    });
    if (!friend) {
      return res.status(404).json({ message: "Unfriend request not found" });
    }
    res.json({ message: "Unfriend successful" });
  } catch (err) {
    console.error("Error unfriend:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
