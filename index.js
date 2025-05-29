const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const friendRoutes = require("./routes/friendRoutes");
const groupRoutes = require("./routes/groupRoutes");
const UserModel = require("./models/UserModel");
const MessageModel = require("./models/MessageModel");
const qrRoutes = require("./routes/qrRoutes");
const cors = require("cors");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const {
  setSocketIO,
  setUserOnline,
  removeUserBySocketId,
  getOnlineUsers,
} = require("./utils/socket");

dotenv.config();
connectDB();

const app = express();
// app.use(cors());/
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/qr", qrRoutes);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"], // Chỉnh lạ'i nếu cần (ví dụ: 'http://localhost:3000')
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});
setSocketIO(io);

// Lưu người dùng online
// global.onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("add-user", async (userId) => {
    console.log("🟢 User connected:", userId);
    try {
      await UserModel.findByIdAndUpdate(userId, { status: "online" });
      console.log(`User ${userId} is online`);
      setUserOnline(userId, socket.id);
      console.log(
        "Current online users:",
        Array.from(getOnlineUsers().entries())
      );
      io.emit("userStatusUpdate", { userId, status: "online" });
    } catch (error) {
      console.error("Error updating user status to online:", error);
    }
  });
  // socket.on("send-group-msg", async (data) => {
  //   const {
  //     groupId,
  //     from,
  //     message,
  //     createdAt,
  //     isImage,
  //     fileUrls,
  //     _id,
  //     replyTo,
  //   } = data;

  //   console.log(
  //     `📤 [Socket.IO] Received send-group-msg event - From: ${from} - GroupId: ${groupId} - Message ID: ${_id}`
  //   );

  //   try {
  //     // Find the group and its members
  //     const group = await groupModel.findById(groupId);
  //     if (!group) {
  //       console.error(`Group not found: ${groupId}`);
  //       return;
  //     }

  //     // Get sender's name for display
  //     const sender = await UserModel.findById(from);
  //     const senderName = sender ? sender.fullName : "Unknown";

  //     // Send message to all group members except the sender
  //     const onlineUsers = getOnlineUsers();
  //     group.groupMembers.forEach((memberId) => {
  //       const memberIdStr = memberId.toString();
  //       if (memberIdStr !== from) {
  //         const memberSocketId = onlineUsers.get(memberIdStr);
  //         if (memberSocketId) {
  //           console.log(
  //             `📥 [Socket.IO] Emitting group-msg-receive to member - To: ${memberIdStr} - Socket ID: ${memberSocketId}`
  //           );

  //           io.to(memberSocketId).emit("group-msg-receive", {
  //             groupId,
  //             from,
  //             senderName,
  //             message,
  //             createdAt,
  //             isImage: isImage || false,
  //             fileUrls: fileUrls || [],
  //             _id,
  //             replyTo,
  //           });
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     console.error("Error processing group message:", error);
  //   }
  // });
  // // Gửi tin nhắn realtime
  // socket.on("send-msg", async (data) => {
  //   const { from, to, message, createdAt, isImage, fileUrls, _id } = data;

  //   // Log khi nhận sự kiện send-msg, bao gồm nội dung tin nhắn
  //   console.log(
  //     `📤 [Socket.IO] Received send-msg event - From: ${from} - To: ${to} - Message ID: ${_id} - Content: ${message}`
  //   );
  //   const onlineUsers = getOnlineUsers();
  //   // console.log("Current online users:", onlineUsers);
  //   const receiverSocketId = onlineUsers.get(to);
  //   console.log("Receiver socket ID:", receiverSocketId);
  //   if (receiverSocketId) {
  //     // Log khi gửi msg-receive đến người nhận, bao gồm nội dung tin nhắn
  //     console.log(
  //       `📥 [Socket.IO] Emitting msg-receive to receiver - To: ${to} - Socket ID: ${receiverSocketId} - Content: ${message}`
  //     );
  //     socket.to(receiverSocketId).emit("msg-receive", {
  //       from,
  //       to,
  //       message,
  //       createdAt,
  //       isImage: isImage || false,
  //       fileUrls: fileUrls || [],
  //       _id,
  //     });
  //   } else {
  //     console.log(`[Socket.IO] Receiver is offline - To: ${to}`);
  //   }

  //   const senderSocketId = getOnlineUsers().get(from);
  //   if (senderSocketId) {
  //     // Log khi gửi msg-receive đến người gửi, bao gồm nội dung tin nhắn
  //     console.log(
  //       `📥 [Socket.IO] Emitting msg-receive to sender - To: ${from} - Socket ID: ${senderSocketId} - Content: ${message}`
  //     );
  //     socket.to(senderSocketId).emit("msg-receive", {
  //       from,
  //       to,
  //       message,
  //       createdAt,
  //       isImage: isImage || false,
  //       fileUrls: fileUrls || [],
  //       _id,
  //     });
  //   } else {
  //     console.log(`[Socket.IO] Sender is offline - From: ${from}`);
  //   }
  // });

  // // Gửi yêu cầu kết bạn
  // socket.on("sendFriendRequest", (data) => {
  //   const { toUserId, fromUserId } = data;
  //   const sendUserSocket = getOnlineUsers().get(toUserId);
  //   if (sendUserSocket) {
  //     socket.to(sendUserSocket).emit("receiveFriendRequest", {
  //       fromUserId,
  //     });
  //   }
  // });

  // // Xóa tin
  // socket.on("delete-msg", (data) => {
  //   io.emit("msg-delete", { messageId: data.messageId });
  // });

  // // Thu hồi tin
  // socket.on("recall-msg", (data) => {
  //   io.emit("msg-recall", { messageId: data.messageId });
  // });

  // // Chuyển tiếp tin nhắn
  // socket.on("forward-msg", (data) => {
  //   const sendUserSocket = getOnlineUsers().get(data.to);
  //   if (sendUserSocket) {
  //     socket.to(sendUserSocket).emit("msg-receive", {
  //       from: data.from,
  //       message: data.message,
  //       createdAt: new Date(),
  //     });
  //   }
  // });

  // // Xóa tin nhắn cho bản thân
  // socket.on("delete-msg-for-me", (data) => {
  //   const { messageId, userId } = data;
  //   io.to(getOnlineUsers().get(userId)).emit("msg-deleted-for-me", {
  //     messageId,
  //   });
  // });

  // Xử lý xóa lịch sử chat
  socket.on("delete-conversation", (data) => {
    const { userId1, userId2 } = data;

    // Gửi thông báo đến userId1 nếu họ đang online
    const user1Socket = getOnlineUsers().get(userId1);
    if (user1Socket) {
      socket.to(user1Socket).emit("delete-conversation", {
        userId1,
        userId2,
      });
    }

    // Gửi thông báo đến userId2 nếu họ đang online
    const user2Socket = getOnlineUsers().get(userId2);
    if (user2Socket) {
      socket.to(user2Socket).emit("delete-conversation", {
        userId1,
        userId2,
      });
    }
  });

  // Gọi điện / video call
  // Gọi điện / video call đã sửa
  socket.on("callUser", (data) => {
    const { userToCall, signalData, from, name } = data;
    const userToCallSocket = getOnlineUsers().get(userToCall);

    if (userToCallSocket) {
      // Người nhận online, gửi thông báo cuộc gọi
      io.to(userToCallSocket).emit("callUser", {
        signal: signalData,
        from,
        name,
      });

      // Thiết lập thời gian chờ (30 giây) để người nhận trả lời
      const timeout = setTimeout(() => {
        const callerSocket = getOnlineUsers().get(from);
        const receiverSocket = getOnlineUsers().get(userToCall);
        if (callerSocket) {
          io.to(callerSocket).emit("callFailed", {
            reason: "Người dùng không trả lời",
          });
        }
        if (receiverSocket) {
          io.to(receiverSocket).emit("callEnded");
        }
      }, 30000);

      // Lưu timeout vào socket để có thể hủy nếu người nhận trả lời
      socket.callTimeout = timeout;
    } else {
      // Người nhận offline, thông báo cho người gọi
      const callerSocket = getOnlineUsers().get(from);
      if (callerSocket) {
        io.to(callerSocket).emit("callFailed", {
          reason: "Người dùng đang offline",
        });
      }
    }
  });
  //đã sửa11111111
  socket.on("answerCall", (data) => {
    const { to, signal } = data;
    const callerSocket = getOnlineUsers().get(to);
    if (callerSocket) {
      io.to(callerSocket).emit("callAccepted", signal);

      // Hủy timeout nếu người nhận trả lời
      const callerSocketInstance = Array.from(io.sockets.sockets.values()).find(
        (s) => s.id === callerSocket
      );
      if (callerSocketInstance && callerSocketInstance.callTimeout) {
        clearTimeout(callerSocketInstance.callTimeout);
        callerSocketInstance.callTimeout = null;
      }
    }
  });

  //đã sửa11111111
  socket.on("rejectCall", (data) => {
    const { to } = data;
    const callerSocket = getOnlineUsers().get(to);
    if (callerSocket) {
      io.to(callerSocket).emit("callRejected", {
        reason: "Cuộc gọi bị từ chối",
      });

      // Hủy timeout nếu người nhận từ chối
      const callerSocketInstance = Array.from(io.sockets.sockets.values()).find(
        (s) => s.id === callerSocket
      );
      if (callerSocketInstance && callerSocketInstance.callTimeout) {
        clearTimeout(callerSocketInstance.callTimeout);
        callerSocketInstance.callTimeout = null;
      }
    }
  });

  // Xử lý sự kiện typing
  socket.on("typing", (data) => {
    const { to, from } = data;
    const sendUserSocket = getOnlineUsers().get(to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("typing", { from, to });
    }
  });

  // Xử lý sự kiện stop-typing
  socket.on("stop-typing", (data) => {
    const { to, from } = data;
    const sendUserSocket = getOnlineUsers().get(to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("stop-typing", { from, to });
    }
  });
  //đã sửa:
  /// Thêm sự kiện pin-message
  socket.on("pin-message", async (data) => {
    const { from, to, messageId } = data;
    try {
      // Tìm tin nhắn cần ghim
      const message = await MessageModel.findById(messageId).populate("sender");
      if (!message) {
        console.log(`Message ${messageId} not found`);
        return;
      }

      // Tìm tất cả tin nhắn đã ghim trong cuộc trò chuyện (giả sử from và to xác định cuộc trò chuyện)
      const pinnedMessages = await MessageModel.find({
        users: { $all: [from, to] },
        pinned: true,
      }).sort({ createdAt: 1 }); // Sắp xếp theo thời gian tạo, cũ nhất trước

      // Nếu đã có 2 tin nhắn ghim, bỏ ghim tin nhắn cũ nhất
      if (pinnedMessages.length >= 2) {
        const oldestPinned = pinnedMessages[0];
        await MessageModel.findByIdAndUpdate(oldestPinned._id, {
          pinned: false,
        });
        const receiverSocket = getOnlineUsers().get(to);
        if (receiverSocket) {
          socket
            .to(receiverSocket)
            .emit("unpin-message", { messageId: oldestPinned._id });
        }
      }

      // Ghim tin nhắn mới
      await MessageModel.findByIdAndUpdate(messageId, { pinned: true });

      // Lấy lại danh sách tin nhắn ghim mới
      const updatedPinnedMessages = await MessageModel.find({
        users: { $all: [from, to] },
        pinned: true,
      })
        .sort({ createdAt: -1 })
        .populate("sender");

      const pinnedMessagesData = updatedPinnedMessages.map((msg) => ({
        messageId: msg._id,
        senderName: msg.sender.username || "Unknown",
        content:
          msg.message.text || (msg.message.files.length > 0 ? "[Media]" : ""),
        isImage:
          msg.message.files.length > 0 && msg.message.files[0].type === "image",
        fileUrls:
          msg.message.files.length > 0
            ? msg.message.files.map((file) => file.url)
            : [],
      }));

      const receiverSocket = getOnlineUsers().get(to);
      if (receiverSocket) {
        socket.to(receiverSocket).emit("update-pinned-messages", {
          pinnedMessages: pinnedMessagesData,
        });
        console.log(
          `[Socket.IO] Emitted update-pinned-messages to ${to} - Messages: ${JSON.stringify(
            pinnedMessagesData
          )}`
        );
      }
    } catch (error) {
      console.error("Error in pin-message:", error);
    }
  });

  // Thêm sự kiện unpin-message
  socket.on("unpin-message", async (data) => {
    const { from, to, messageId } = data;
    try {
      // Bỏ ghim tin nhắn
      await MessageModel.findByIdAndUpdate(messageId, { pinned: false });

      // Lấy lại danh sách tin nhắn ghim mới
      const updatedPinnedMessages = await MessageModel.find({
        users: { $all: [from, to] },
        pinned: true,
      })
        .sort({ createdAt: -1 })
        .populate("sender");
      const pinnedMessagesData = updatedPinnedMessages.map((msg) => ({
        messageId: msg._id,
        senderName: msg.sender.username || "Unknown",
        content:
          msg.message.text || (msg.message.files.length > 0 ? "[Media]" : ""),
        isImage:
          msg.message.files.length > 0 && msg.message.files[0].type === "image",
        fileUrls:
          msg.message.files.length > 0
            ? msg.message.files.map((file) => file.url)
            : [],
      }));

      const receiverSocket = getOnlineUsers().get(to);
      if (receiverSocket) {
        socket.to(receiverSocket).emit("update-pinned-messages", {
          pinnedMessages: pinnedMessagesData,
        });
        console.log(
          `[Socket.IO] Emitted update-pinned-messages to ${to} - Messages: ${JSON.stringify(
            pinnedMessagesData
          )}`
        );
      }
    } catch (error) {
      console.error("Error in unpin-message:", error);
    }
  });

  // //đã sửa
  // socket.on("joinGroup", ({ groupId }) => {
  //   socket.join(groupId);
  //   console.log(`User ${socket.id} joined group ${groupId}`);
  // });

  // // Xử lý sự kiện thêm thành viên (global)
  // socket.on("addMember", ({ groupId, memberIds }) => {
  //   io.emit("memberAdded", { groupId, memberIds });
  //   console.log(
  //     `📢 [Socket.IO] Emitted global memberAdded for group ${groupId}`
  //   );
  // });

  // // Xử lý sự kiện đổi tên nhóm (global)
  // socket.on("renameGroup", ({ groupId, newName }) => {
  //   io.emit("groupRenamed", { groupId, newName });
  //   console.log(
  //     `📢 [Socket.IO] Emitted global groupRenamed for group ${groupId}`
  //   );
  // });

  // Xử lý sự kiện cập nhật avatar (global)
  // socket.on("updateGroupAvatar", ({ groupId, avatar }) => {
  //   io.emit("avatarUpdated", { groupId, avatar });
  //   console.log(
  //     `📢 [Socket.IO] Emitted global avatarUpdated for group ${groupId}`
  //   );
  // });

  // // Xử lý sự kiện rời nhóm (global)
  // socket.on("leaveGroup", ({ groupId, memberId }) => {
  //   io.emit("memberLeft", { groupId, memberId });
  //   console.log(
  //     `📢 [Socket.IO] Emitted global memberLeft for group ${groupId}`
  //   );
  // });

  // Ngắt kết nối
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    removeUserBySocketId(socket.id);
    console.log(
      "Current online users after disconnect:",
      Array.from(getOnlineUsers().entries())
    );
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server chạy trên cổng ${PORT}`)
);
