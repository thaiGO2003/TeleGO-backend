const Messages = require("../models/MessageModel");
const mongoose = require("mongoose");
const { getSocketIO, getOnlineUsers } = require("../utils/socket"); // thêm dòng này ở đầu file
const groupModel = require("../models/GroupModel");
const userModel= require("../models/UserModel");

module.exports.reactToMessage = async (req, res, next) => {
  try {
    const { messageId, userId, emoji } = req.body;

    const message = await Messages.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found." });
    }

    const existingReaction = message.reactions.find(
      (r) => r.user.toString() === userId
    );

    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();

    const recipientIds = message.users.filter((u) => u.toString() !== userId);
    console.log("recipientIds", recipientIds);

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        return res.json({ msg: "Same reaction exists. No changes made." });
      } else {
        await Messages.updateOne(
          { _id: messageId, "reactions.user": userId },
          { $set: { "reactions.$.emoji": emoji } },
          { timestamps: false }
        );
        console.log("recipientIds 2:", recipientIds);

        recipientIds.forEach((recipientId) => {
          console.log("online: ", onlineUsers);
          const recipientSocket = onlineUsers.get(recipientId.toString());
          console.log("recipientSocket: ", recipientSocket);

          if (io && recipientSocket) {
            io.to(recipientSocket).emit("msg-receive", {
              type: "reaction-updated",
              _id: message._id,
              message: {
                text: "Có người thả cảm xúc vào tin nhắn các bạn",
                emoji: "",
                files: [],
              },
              createdAt: message.createdAt,
              from: userId,
            });
          }
        });

        return res.json({ msg: "Reaction updated." });
      }
    } else {
      await Messages.updateOne(
        { _id: messageId },
        { $push: { reactions: { user: userId, emoji: emoji } } },
        { timestamps: false }
      );

      recipientIds.forEach((recipientId) => {
        const recipientSocket = onlineUsers.get(recipientId.toString());
        io.to(recipientSocket).emit("msg-receive", {
          type: "reaction-updated",
          _id: message._id,
          message: {
            text: "Có người thả cảm xúc vào tin nhắn các bạn",
            emoji: "",
            files: [],
          },
          createdAt: message.createdAt,
          from: userId,
        });
      });
      return res.json({ msg: "Reaction added." });
    }
  } catch (ex) {
    next(ex);
  }
};
// module.exports.getMessages = async (req, res, next) => {
//   try {
//     const { from, to, groupId } = req.body;

//     let messages;
//     if (groupId) {
//       // Lấy tin nhắn nhóm
//       messages = await Messages.find({
//         groupId,
//         deletedFor: { $ne: from },
//       })
//         .sort({ updatedAt: 1 })
//         .populate({
//           path: "replyTo",
//           select: "message sender createdAt",
//           populate: {
//             path: "sender",
//             select: "fullName avatar",
//           },
//         });
//     } else {
//       // Lấy tin nhắn cá nhân
//       messages = await Messages.find({
//         users: { $all: [from, to] },
//         groupId: null,
//         deletedFor: { $ne: from },
//       })
//         .sort({ updatedAt: 1 })
//         .populate({
//           path: "replyTo",
//           select: "message sender createdAt",
//           populate: {
//             path: "sender",
//             select: "fullName avatar",
//           },
//         });
//     }

//     const projectedMessages = messages.map((msg) => ({
//       fromSelf: msg.sender.toString() === from,
//       message: msg.message.text,
//       fileUrls: msg.message.files.map((file) => file.url),
//       fileTypes: msg.message.files.map((file) => file.type),
//       emoji: msg.message.emoji,
//       _id: msg._id,
//       createdAt: msg.createdAt,
//       recalled: msg.recalled,
//       sender: msg.sender.toString(), // Thêm trường sender với ID của người gửi
//       reactions: msg.reactions.map((r) => ({
//         user: r.user,
//         emoji: r.emoji,
//       })),
//       replyTo: msg.replyTo
//         ? {
//             _id: msg.replyTo._id,
//             text: msg.replyTo.message.text,
//             createdAt: msg.replyTo.createdAt,
//             user: {
//               _id: msg.replyTo.sender?._id,
//               fullName: msg.replyTo.sender?.fullName,
//               avatar: msg.replyTo.sender?.avatar,
//             },
//             fileUrls: msg.replyTo.message.files.map((file) => file.url),
//             fileTypes: msg.replyTo.message.files.map((file) => file.type),
//           }
//         : null,
//     }));

//     res.json(projectedMessages);
//   } catch (ex) {
//     next(ex);
//   }
// };
module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to, groupId } = req.body;

    // Kiểm tra đầu vào
    if (!mongoose.Types.ObjectId.isValid(from)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    let messages;
    if (groupId) {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: "Invalid group ID" });
      }
      messages = await Messages.find({
        groupId,
        deletedFor: { $ne: from },
      })
        .sort({ updatedAt: 1 })
        .populate({
          path: "replyTo",
          select: "message sender createdAt",
        });
    } else {
      if (!mongoose.Types.ObjectId.isValid(to)) {
        return res.status(400).json({ msg: "Invalid recipient ID" });
      }
      messages = await Messages.find({
        users: { $all: [from, to] },
        groupId: null,
        deletedFor: { $ne: from },
      })
        .sort({ updatedAt: 1 })
        .populate({
          path: "replyTo",
          select: "message sender createdAt",
        });
    }

    const projectedMessages = messages.map((msg) => ({
      fromSelf: msg.sender ? msg.sender.toString() === from : false,
      message: msg.message.text,
      fileUrls: msg.message.files.map((file) => file.url),
      fileTypes: msg.message.files.map((file) => file.type),
      emoji: msg.message.emoji,
      _id: msg._id,
      createdAt: msg.createdAt,
      recalled: msg.recalled,
      sender: msg.sender ? msg.sender.toString() : null, // Trả về sender là chuỗi hoặc null
      reactions: msg.reactions.map((r) => ({
        user: r.user,
        emoji: r.emoji,
      })),
      replyTo: msg.replyTo
        ? {
            _id: msg.replyTo._id,
            text: msg.replyTo.message.text,
            createdAt: msg.replyTo.createdAt,
            user: msg.replyTo.sender ? msg.replyTo.sender.toString() : null,
            fileUrls: msg.replyTo.message.files.map((file) => file.url),
            fileTypes: msg.replyTo.message.files.map((file) => file.type),
          }
        : null,
      poll: msg.poll?.question
        ? {
            question: msg.poll.question,
            options: msg.poll.options,
            isActive: msg.poll.isActive,
          }
        : null,
    }));

    res.json(projectedMessages);
  } catch (ex) {
    console.error("[getMessages] Error:", ex);
    next(ex);
  }
};
// Xóa toàn bộ tin nhắn của một cuộc trò chuyện cho một người dùng
module.exports.deleteAllMessagesForMe = async (req, res, next) => {
  try {
    const { userId, toUserId, groupId } = req.body;

    // Kiểm tra tính hợp lệ của userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    let result;
    let socketEventData = {};

    if (groupId) {
      // Xóa tin nhắn nhóm cho userId
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: "Invalid group ID" });
      }

      const group = await groupModel.findById(groupId);
      if (!group) {
        return res.status(404).json({ msg: "Group not found" });
      }

      // Cập nhật tất cả tin nhắn trong nhóm, thêm userId vào deletedFor
      result = await Messages.updateMany(
        { groupId, deletedFor: { $ne: userId } },
        { $addToSet: { deletedFor: userId } }
      );

      socketEventData = { groupId };
    } else if (toUserId) {
      // Xóa tin nhắn cá nhân giữa userId và toUserId
      if (!mongoose.Types.ObjectId.isValid(toUserId)) {
        return res.status(400).json({ msg: "Invalid recipient ID" });
      }

      // Cập nhật tất cả tin nhắn cá nhân, thêm userId vào deletedFor
      result = await Messages.updateMany(
        {
          users: { $all: [userId, toUserId] },
          groupId: null,
          deletedFor: { $ne: userId },
        },
        { $addToSet: { deletedFor: userId } }
      );

      socketEventData = { userId, toUserId };
    } else {
      return res.status(400).json({ msg: "Missing toUserId or groupId" });
    }

    // Kiểm tra xem có tin nhắn nào được cập nhật không
    if (result.modifiedCount > 0) {
      // Thông báo qua socket cho người dùng
      const io = getSocketIO();
      const onlineUsers = getOnlineUsers();
      const socketId = onlineUsers.get(userId);

      if (io && socketId) {
        if (groupId) {
          io.to(socketId).emit(
            "group-conversation-deleted-for-me",
            socketEventData
          );
        } else {
          io.to(socketId).emit("conversation-deleted-for-me", socketEventData);
        }
      }

      return res.json({ msg: "Conversation deleted for user successfully." });
    } else {
      return res.status(404).json({ msg: "No messages found to delete." });
    }
  } catch (ex) {
    console.error("Error in deleteAllMessagesForMe:", ex);
    next(ex);
  }
};
// module.exports.getMessages = async (req, res, next) => {
//   try {
//     const { from, to } = req.body;

//     // Log khi nhận yêu cầu lấy tin nhắn
//     console.log(
//       `📥 [getMessages] Fetching messages - From: ${from} - To: ${to}`
//     );

//     const messages = await Messages.find({
//       users: { $all: [from, to] },
//       deletedFor: { $ne: from },
//     }).sort({ updatedAt: 1 });

//     const projectedMessages = messages.map((msg) => {
//       // Log thông tin sender và nội dung của từng tin nhắn
//       console.log(
//         `[getMessages] Message ID: ${
//           msg._id
//         } - Sender: ${msg.sender.toString()} - Content: ${
//           msg.message.text || "No text"
//         }`
//       );
//       return {
//         fromSelf: msg.sender.toString() === from,
//         message: msg.message.text,
//         fileUrls: msg.message.files.map((file) => file.url),
//         fileTypes: msg.message.files.map((file) => file.type),
//         emoji: msg.message.emoji,
//         _id: msg._id,
//         createdAt: msg.createdAt,
//         recalled: msg.recalled,
//         sender: msg.sender.toString(),
//         reactions: msg.reactions,
//         pinned: msg.pinned, // Thêm trường pinned
//       };
//     });

//     res.json(projectedMessages);
//   } catch (ex) {
//     console.error("[getMessages] Error:", ex);
//     next(ex);
//   }
// };

// module.exports.addMessage = async (req, res, next) => {
//   try {
//     const { from, to, message } = req.body;
//     const data = await Messages.create({
//       message: { text: message },
//       users: [from, to],
//       sender: from,
//     });

//     if (data) return res.json({ msg: "Message added to the database" });
//     else return res.json({ msg: "Failed to add message to the database" });
//   } catch (ex) {
//     next(ex);
//   }
// };
module.exports.addMessage = async (req, res, next) => {
  try {
    if (!req.body) {
      console.error("[addMessage] req.body is undefined");
      return res.status(400).json({ msg: "Request body is missing" });
    }

    const { from, to, groupId, message, files, isGif, replyTo } = req.body;

    // Log khi nhận yêu cầu gửi tin nhắn
    console.log(
      `📤 [addMessage] Sending message - From: ${from} - To: ${to} - GroupId: ${groupId} - Content: ${message} - IsGIF: ${isGif}`
    );

    if (!mongoose.Types.ObjectId.isValid(from)) {
      console.error("[addMessage] Invalid user ID:", { from });
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    const newMsg = {
      sender: from,
      message: {
        text: message || "",
        files: files
          ? files.map((file) => ({
              url: file.location,
              type: file.mimetype,
            }))
          : isGif
          ? [{ url: message, type: "image/gif" }]
          : [],
      },
    };

    if (groupId) {
      // Tin nhắn nhóm
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        console.error("[addMessage] Invalid group ID:", { groupId });
        return res.status(400).json({ msg: "Invalid group ID" });
      }
      newMsg.groupId = groupId;
      newMsg.users = [];
    } else {
      // Tin nhắn cá nhân
      if (!mongoose.Types.ObjectId.isValid(to)) {
        console.error("[addMessage] Invalid recipient ID:", { to });
        return res.status(400).json({ msg: "Invalid recipient ID" });
      }
      newMsg.users = [from, to];
    }

    let repliedToMessage = null;
    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      newMsg.replyTo = replyTo;
      repliedToMessage = await Messages.findById(replyTo).populate(
        "sender",
        "fullName avatar"
      );
    }

    console.log("[addMessage] Saving message to DB:", newMsg);
    const savedMessage = await Messages.create(newMsg);

    // Log khi tin nhắn được lưu thành công
    console.log(
      `✅ [addMessage] Message saved - From: ${from} - To: ${to} - GroupId: ${groupId} - Message ID: ${savedMessage._id} - Content: ${savedMessage.message.text}`
    );

    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();

    if (groupId) {
      // Gửi tin nhắn nhóm qua socket
      const group = await groupModel.findById(groupId);
      if (!group) {
        return res.status(404).json({ msg: "Group not found" });
      }
      group.groupMembers.forEach((memberId) => {
        // Xử lý memberId là String hoặc ObjectId
        const memberIdStr = memberId.toString ? memberId.toString() : memberId;
        const memberSocket = onlineUsers.get(memberIdStr);
        if (memberSocket && memberIdStr !== from) {
          io.to(memberSocket).emit("group-msg-receive", {
            groupId,
            from,
            message: savedMessage.message.text,
            fileUrls: savedMessage.message.files.map((f) => f.url),
            fileTypes: savedMessage.message.files.map((f) => f.type),
            isImage: savedMessage.message.files.some((f) =>
              f.type.startsWith("image/")
            ),
            createdAt: savedMessage.createdAt,
            _id: savedMessage._id,
            replyTo: repliedToMessage
              ? {
                  _id: repliedToMessage._id.toString(),
                  message: repliedToMessage.message.text,
                  senderId: repliedToMessage.sender._id.toString(),
                  sender: {
                    _id: repliedToMessage.sender._id.toString(),
                    fullName: repliedToMessage.sender.fullName,
                    avatar: repliedToMessage.sender.avatar,
                  },
                  createdAt: repliedToMessage.createdAt,
                  fileUrls: repliedToMessage.message.files.map((f) => f.url),
                  fileTypes: repliedToMessage.message.files.map((f) => f.type),
                }
              : null,
          });
        }
      });
    } else {
      // Gửi tin nhắn cá nhân qua socket
      const recipientSocket = onlineUsers.get(to);
      if (io && recipientSocket) {
        io.to(recipientSocket).emit("msg-receive", {
          from: savedMessage.sender.toString(),
          to,
          message: savedMessage.message.text,
          fileUrls: savedMessage.message.files.map((f) => f.url),
          fileTypes: savedMessage.message.files.map((f) => f.type),
          isImage: savedMessage.message.files.some((f) =>
            f.type.startsWith("image/")
          ),
          createdAt: savedMessage.createdAt,
          _id: savedMessage._id,
          replyTo: repliedToMessage
            ? {
                _id: repliedToMessage._id.toString(),
                message: repliedToMessage.message.text,
                senderId: repliedToMessage.sender._id.toString(),
                sender: {
                  _id: repliedToMessage.sender._id.toString(),
                  fullName: repliedToMessage.sender.fullName,
                  avatar: repliedToMessage.sender.avatar,
                },
                createdAt: repliedToMessage.createdAt,
                fileUrls: repliedToMessage.message.files.map((f) => f.url),
                fileTypes: repliedToMessage.message.files.map((f) => f.type),
              }
            : null,
        });
      }
    }

    return res.json({
      msg: "Message added to the database",
      message: {
        _id: savedMessage._id,
        message: savedMessage.message.text,
        fileUrls: savedMessage.message.files.map((file) => file.url),
        fileTypes: savedMessage.message.files.map((file) => file.type),
        createdAt: savedMessage.createdAt,
        from: savedMessage.sender,
        to: groupId ? null : to,
        groupId: groupId || null,
        replyTo: repliedToMessage
          ? {
              _id: repliedToMessage._id.toString(),
              message: repliedToMessage.message.text,
              senderId: repliedToMessage.sender._id.toString(),
              sender: {
                _id: repliedToMessage.sender._id.toString(),
                fullName: repliedToMessage.sender.fullName,
                avatar: repliedToMessage.sender.avatar,
              },
              createdAt: repliedToMessage.createdAt,
              fileUrls: repliedToMessage.message.files.map((f) => f.url),
              fileTypes: repliedToMessage.message.files.map((f) => f.type),
            }
          : null,
      },
    });
  } catch (ex) {
    console.error("[addMessage] Error:", ex.stack);
    res.status(500).json({ msg: "Internal Server Error", error: ex.message });
    next(ex);
  }
};
module.exports.deleteMessageById = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const result = await Messages.deleteOne({ _id: messageId });

    if (result.deletedCount > 0) {
      return res.json({ msg: "Message deleted successfully." });
    } else {
      return res.status(404).json({ msg: "Message not found." });
    }
  } catch (ex) {
    next(ex);
  }
};

// module.exports.recallMessageById = async (req, res, next) => {
//   try {
//     const messageId = req.params.id;
//     const result = await Messages.updateOne(
//       { _id: messageId },
//       { $set: { recalled: true, "message.text": "" } }
//     );

//     if (result.modifiedCount > 0) {
//       return res.json({ msg: "Message recalled successfully." });
//     } else {
//       return res
//         .status(404)
//         .json({ msg: "Message not found or already recalled." });
//     }
//   } catch (ex) {
//     next(ex);
//   }
// };

// module.exports.forwardMessage = async (req, res, next) => {
//   try {
//     const { from, to, messageId } = req.body;

//     const originalMsg = await Messages.findById(messageId);
//     if (!originalMsg) {
//       return res.status(404).json({ msg: "Original message not found." });
//     }

//     const newMessage = await Messages.create({
//       message: { text: originalMsg.message.text },
//       users: [from, to],
//       sender: from,
//     });

//     if (newMessage) {
//       return res.json({ msg: "Message forwarded successfully." });
//     } else {
//       return res.status(500).json({ msg: "Failed to forward message." });
//     }
//   } catch (ex) {
//     next(ex);
//   }
// };
module.exports.recallMessageById = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const result = await Messages.updateOne(
      { _id: messageId },
      { $set: { recalled: true, "message.text": "" } }
    );

    if (result.modifiedCount > 0) {
      // Lấy thông tin tin nhắn để xác định người nhận
      const message = await Messages.findById(messageId);
      if (!message) {
        return res.status(404).json({ msg: "Message not found." });
      }

      const io = getSocketIO();
      const onlineUsers = getOnlineUsers();

      if (message.groupId) {
        // Thông báo thu hồi trong nhóm
        const group = await groupModel.findById(message.groupId);
        if (!group) {
          return res.status(404).json({ msg: "Group not found." });
        }

        group.groupMembers.forEach((memberId) => {
          const memberSocket = onlineUsers.get(memberId.toString());
          if (io && memberSocket && memberId.toString() !== message.sender.toString()) {
            io.to(memberSocket).emit("group-msg-receive", {
              type: "message-recalled",
              groupId: message.groupId,
              _id: message._id,
              message: {
                text: "Tin nhắn đã được thu hồi",
                files: [],
                emoji: "",
              },
              createdAt: message.createdAt,
              from: message.sender.toString(),
            });
          }
        });
      } else {
        // Thông báo thu hồi trong cuộc trò chuyện cá nhân
        const recipientIds = message.users.filter((u) => u.toString() !== message.sender.toString());
        recipientIds.forEach((recipientId) => {
          const recipientSocket = onlineUsers.get(recipientId.toString());
          if (io && recipientSocket) {
            io.to(recipientSocket).emit("msg-receive", {
              type: "message-recalled",
              _id: message._id,
              message: {
                text: "Tin nhắn đã được thu hồi",
                files: [],
                emoji: "",
              },
              createdAt: message.createdAt,
              from: message.sender.toString(),
            });
          }
        });
      }

      return res.json({ msg: "Message recalled successfully." });
    } else {
      return res.status(404).json({ msg: "Message not found or already recalled." });
    }
  } catch (ex) {
    console.error("[recallMessageById] Error:", ex);
    next(ex);
  }
};

module.exports.forwardMessage = async (req, res, next) => {
  try {
    const { from, to, messageId } = req.body;

    const originalMsg = await Messages.findById(messageId);
    if (!originalMsg) {
      return res.status(404).json({ msg: "Original message not found." });
    }

    const newMessage = await Messages.create({
      message: { text: originalMsg.message.text, files: originalMsg.message.files },
      users: [from, to],
      sender: from,
    });

    if (newMessage) {
      // Gửi thông báo qua socket cho người nhận
      const io = getSocketIO();
      const onlineUsers = getOnlineUsers();
      const recipientSocket = onlineUsers.get(to);

      if (io && recipientSocket) {
        io.to(recipientSocket).emit("msg-receive", {
          from: newMessage.sender.toString(),
          to,
          message: newMessage.message.text,
          fileUrls: newMessage.message.files.map((f) => f.url),
          fileTypes: newMessage.message.files.map((f) => f.type),
          isImage: newMessage.message.files.some((f) => f.type.startsWith("image/")),
          createdAt: newMessage.createdAt,
          _id: newMessage._id,
          type: "message-forwarded",
        });
      }

      return res.json({ msg: "Message forwarded successfully." });
    } else {
      return res.status(500).json({ msg: "Failed to forward message." });
    }
  } catch (ex) {
    console.error("[forwardMessage] Error:", ex);
    next(ex);
  }
};

// module.exports.sendMediaMessage = async (req, res, next) => {
//   try {
//     const { from, to, emoji, text } = req.body;
//     const files = req.files;

//     const newMsg = {
//       users: [from, to],
//       sender: from,
//       message: {
//         text: text || '',
//         emoji: emoji || '',
//         files: [],
//       },
//     };

//     if (files && files.length > 0) {
//       newMsg.message.files = files.map(file => ({
//         url: file.location,
//         type: file.mimetype
//       }));
//     }

//     const message = await Messages.create(newMsg);

//     // Gửi realtime qua socket nếu cần
//     const io = getSocketIO();
//     const onlineUsers = getOnlineUsers();
//     const recipientSocket = onlineUsers.get(to);

//     if (io && recipientSocket) {
//       io.to(recipientSocket).emit("msg-receive", {
//         from,
//         message: {
//           text: message.message.text,
//           emoji: message.message.emoji,
//           files: message.message.files,
//         },
//         createdAt: message.createdAt,
//         _id: message._id,
//       });
//     }

//     res.json({ msg: "Media message sent", message });
//   } catch (ex) {
//     next(ex);
//   }
// };
module.exports.sendMediaMessage = async (req, res, next) => {
  try {
    if (!req.body) {
      console.error("req.body is undefined");
      return res.status(400).json({ msg: "Request body is missing" });
    }

    console.log("Received request body:", req.body);
    console.log("Received files:", req.files);

    const { from, to, groupId, emoji, text, replyTo } = req.body;
    const files = req.files || [];
    let messageFiles = [];

    // Xử lý tệp được tải lên (hình ảnh, tệp)
    if (files.length > 0) {
      messageFiles = files.map((file) => ({
        url: file.location,
        type: file.mimetype,
      }));
    }
    // Xử lý URL media (GIF)
    else if (req.body.mediaUrls) {
      try {
        const providedMedia = JSON.parse(req.body.mediaUrls);
        if (Array.isArray(providedMedia)) {
          messageFiles = providedMedia.map((media) => ({
            url: media.url,
            type: media.type,
          }));
        }
      } catch (error) {
        console.error("Error parsing mediaUrls:", error);
      }
    }
    if (!mongoose.Types.ObjectId.isValid(from)) {
      console.error("Invalid user ID:", { from });
      return res.status(400).json({ msg: "Invalid user ID" });
    }

    const newMsg = {
      sender: from,
      message: {
        text: text || "",
        emoji: emoji || "",
        files: messageFiles.map((file) => {
          console.log("File location:", file.url);
          return {
            url: file.url,
            type: file.type,
          };
        }),
      },
    };

    if (groupId) {
      // Tin nhắn nhóm
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        console.error("Invalid group ID:", { groupId });
        return res.status(400).json({ msg: "Invalid group ID" });
      }
      newMsg.groupId = groupId;
      newMsg.users = [];
    } else {
      // Tin nhắn cá nhân
      if (!mongoose.Types.ObjectId.isValid(to)) {
        console.error("Invalid recipient ID:", { to });
        return res.status(400).json({ msg: "Invalid recipient ID" });
      }
      newMsg.users = [from, to];
    }

    let repliedToMessage = null;
    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      newMsg.replyTo = replyTo;
      repliedToMessage = await Messages.findById(replyTo).populate(
        "sender",
        "fullName avatar"
      );
    }

    console.log("Saving message to DB:", newMsg);
    const message = await Messages.create(newMsg);
    console.log("Message saved:", message);

    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();

    if (groupId) {
      // Gửi tin nhắn nhóm qua socket
      const group = await groupModel.findById(groupId);
      if (!group) {
        return res.status(404).json({ msg: "Group not found" });
      }
      group.groupMembers.forEach((memberId) => {
        const memberSocket = onlineUsers.get(memberId.toString());
        if (memberSocket && memberId.toString() !== from) {
          io.to(memberSocket).emit("group-msg-receive", {
            groupId,
            from,
            message: message.message.text,
            fileUrls: message.message.files.map((f) => f.url),
            fileTypes: message.message.files.map((f) => f.type),
            isImage: message.message.files.some((f) =>
              f.type.startsWith("image/")
            ),
            createdAt: message.createdAt,
            _id: message._id,
            replyTo: repliedToMessage
              ? {
                  _id: repliedToMessage._id.toString(),
                  message: repliedToMessage.message.text,
                  senderId: repliedToMessage.sender._id.toString(),
                  sender: {
                    _id: repliedToMessage.sender._id.toString(),
                    fullName: repliedToMessage.sender.fullName,
                    avatar: repliedToMessage.sender.avatar,
                  },
                  createdAt: repliedToMessage.createdAt,
                  fileUrls: repliedToMessage.message.files.map((f) => f.url),
                  fileTypes: repliedToMessage.message.files.map((f) => f.type),
                }
              : null,
          });
        }
      });
    } else {
      // Gửi tin nhắn cá nhân qua socket
      const recipientSocket = onlineUsers.get(to);
      if (io && recipientSocket) {
        io.to(recipientSocket).emit("msg-receive", {
          from: message.sender.toString(),
          to,
          message: message.message.text,
          fileUrls: message.message.files.map((f) => f.url),
          fileTypes: message.message.files.map((f) => f.type),
          isImage: message.message.files.some((f) =>
            f.type.startsWith("image/")
          ),
          createdAt: message.createdAt,
          _id: message._id,
          replyTo: repliedToMessage
            ? {
                _id: repliedToMessage._id.toString(),
                message: repliedToMessage.message.text,
                senderId: repliedToMessage.sender._id.toString(),
                sender: {
                  _id: repliedToMessage.sender._id.toString(),
                  fullName: repliedToMessage.sender.fullName,
                  avatar: repliedToMessage.sender.avatar,
                },
                createdAt: repliedToMessage.createdAt,
                fileUrls: repliedToMessage.message.files.map((f) => f.url),
                fileTypes: repliedToMessage.message.files.map((f) => f.type),
              }
            : null,
        });
      }
    }
    // message.message.files.map((f) => console.log("File URL:", f.url));
    res.json({ msg: "Media message sent", message });
  } catch (ex) {
    console.error("Error in sendMediaMessage:", ex.stack);
    res.status(500).json({ msg: "Internal Server Error", error: ex.message });
  }
};

module.exports.deleteMessageForMe = async (req, res, next) => {
  try {
    const { messageId, userId } = req.body;

    const result = await Messages.updateOne(
      { _id: messageId },
      { $addToSet: { deletedFor: userId } } // tránh thêm trùng
    );

    if (result.modifiedCount > 0) {
      return res.json({ msg: "Message deleted for user." });
    } else {
      return res
        .status(404)
        .json({ msg: "Message not found or already deleted for user." });
    }
  } catch (ex) {
    next(ex);
  }
};

module.exports.getMessagesByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const messages = await Messages.find({
      users: userId,
      deletedFor: { $ne: userId },
    }).sort({ createdAt: -1 }); // hoặc updatedAt nếu muốn

    
    const projectedMessages = messages.map((msg) => ({
      fromSelf: msg.sender.toString() === userId,
      message: msg.message.text,
      fileUrls: msg.message.files.map((file) => file.url), // Lấy URL từ file
      fileTypes: msg.message.files.map((file) => file.type), // Lấy type từ file
      emoji: msg.message.emoji,
      _id: msg._id,
      users: msg.users,
      createdAt: msg.createdAt,
      recalled: msg.recalled,
    }));

    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

// Thêm controller để xóa lịch sử chat giữa hai người dùng
module.exports.deleteConversation = async (req, res, next) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({ msg: "Missing userId1 or userId2" });
    }

    // Xóa tất cả tin nhắn giữa userId1 và userId2
    const result = await Messages.deleteMany({
      users: { $all: [userId1, userId2] },
    });

    if (result.deletedCount > 0) {
      return res.json({ msg: "Conversation deleted successfully." });
    } else {
      return res.status(404).json({ msg: "No messages found to delete." });
    }
  } catch (ex) {
    next(ex);
  }
};






module.exports.getLastMessagesPerUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    console.log(`Starting getLastMessagesPerUser for userId: ${userId}`);

    // Lấy tin nhắn cá nhân
    console.log('Fetching personal messages...');
    let personalMessages = await Messages.aggregate([
      {
        $match: {
          users: { $in: [userId, new mongoose.Types.ObjectId(userId)] },
          groupId: null,
          deletedFor: { $ne: new mongoose.Types.ObjectId(userId) },
          $expr: { $eq: [{ $size: "$users" }, 2] },
        },
      },
      {
        $addFields: {
          normalizedUsers: {
            $sortArray: {
              input: {
                $map: {
                  input: "$users",
                  as: "u",
                  in: { $toString: "$$u" },
                },
              },
              sortBy: 1,
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$normalizedUsers",
          message: { $first: "$message.text" }, // Changed from "$message" to "$message.text"
          sender: { $first: "$sender" },
          createdAt: { $first: "$createdAt" },
          recalled: { $first: "$recalled" },
          messageId: { $first: "$_id" },
          users: { $first: "$users" },
          fileUrls: { $first: "$fileUrls" },
          fileTypes: { $first: "$fileTypes" },
          emoji: { $first: "$emoji" },
        },
      },
      {
        $project: {
          _id: "$messageId",
          users: 1,
          fromSelf: {
            $cond: {
              if: { $eq: ["$sender", null] },
              then: false,
              else: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
            },
          },
          message: 1, // Keep as "message" in output
          fileUrls: { $ifNull: ["$fileUrls", []] },
          fileTypes: { $ifNull: ["$fileTypes", []] },
          emoji: { $ifNull: ["$emoji", ""] },
          createdAt: 1,
          recalled: 1,
        },
      },
    ]);

    // Filter personal messages by user existence
    console.log('Checking user existence for personal messages...');
    personalMessages = await Promise.all(
      personalMessages.map(async (msg) => {
        const userExists = await Promise.all(
          msg.users.map(async (uid) => {
            const user = await userModel.findById(uid);
            console.log(`Checking user ${uid}: ${user ? 'Exists' : 'Not found'}`);
            return !!user; // True if user exists, false if 404 (null)
          })
        );
        if (userExists.every((exists) => exists)) {
          return msg;
        }
        console.log(`Excluding chat with users ${msg.users} due to missing user(s)`);
        return null;
      })
    );
    personalMessages = personalMessages.filter((msg) => msg !== null);
    console.log(`Found ${personalMessages.length} personal messages after user check:`, JSON.stringify(personalMessages, null, 2));

    // Lấy tin nhắn nhóm
    console.log('Fetching group messages...');
    let groupMessages = await Messages.aggregate([
      {
        $match: {
          groupId: { $ne: null },
          deletedFor: { $ne: new mongoose.Types.ObjectId(userId) },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$groupId",
          message: { $first: "$message.text" }, // Changed from "$message" to "$message.text"
          sender: { $first: "$sender" },
          createdAt: { $first: "$createdAt" },
          recalled: { $first: "$recalled" },
          messageId: { $first: "$_id" },
          groupName: { $first: "$groupName" },
          fileUrls: { $first: "$fileUrls" },
          fileTypes: { $first: "$fileTypes" },
          emoji: { $first: "$emoji" },
        },
      },
      {
        $project: {
          _id: "$messageId",
          fromSelf: {
            $cond: {
              if: { $eq: ["$sender", null] },
              then: false,
              else: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
            },
          },
          message: 1, // Keep as "message" in output
          fileUrls: { $ifNull: ["$fileUrls", []] },
          fileTypes: { $ifNull: ["$fileTypes", []] },
          emoji: { $ifNull: ["$emoji", ""] },
          createdAt: 1,
          recalled: 1,
          groupId: "$_id",
          groupName: 1,
        },
      },
    ]);

  
     console.log('Checking group existence for group messages...');
    groupMessages = await Promise.all(
      groupMessages.map(async (msg) => {
        const group = await groupModel.findById(msg.groupId);
        console.log(`Checking group ${msg.groupId}: ${group ? 'Exists' : 'Not found'}`);
        if ((group && group.groupMembers.includes(userId)) || (group && group.groupAdmin.toString() === userId)) {
          return msg;
        }
        console.log(`Excluding group chat ${msg.groupId} due to missing group`);
        return null;
      })
    );
    groupMessages = groupMessages.filter((msg) => msg !== null);
    console.log(`Found ${groupMessages.length} group messages after group check:`, JSON.stringify(groupMessages, null, 2));

    // Gộp và sắp xếp
    console.log('Merging and sorting messages...');
    const messages = [...personalMessages, ...groupMessages].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    console.log(`Total messages after merging: ${messages.length}`, JSON.stringify(messages, null, 2));

    res.json(messages);
  } catch (ex) {
    console.error("Error in getLastMessagesPerUser:", ex);
    next(ex);
  }
};
// Thêm vào cuối file messageController.js



module.exports.pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Messages.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found." });
    }

    // Kiểm tra xem tin nhắn đã được ghim chưa
    if (message.pinned) {
      return res.status(400).json({ msg: "Message is already pinned." });
    }

    // Đặt trạng thái ghim
    message.pinned = true;
    await message.save();

    // Gửi thông báo qua socket để đồng bộ
    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();
    const recipientIds = message.users.filter((u) => u.toString() !== userId);

    recipientIds.forEach((recipientId) => {
      const recipientSocket = onlineUsers.get(recipientId.toString());
      if (io && recipientSocket) {
        io.to(recipientSocket).emit("pin-message", {
          messageId: message._id,
        });
      }
    });

    res.json({ msg: "Message pinned successfully." });
  } catch (ex) {
    console.error("[pinMessage] Error:", ex);
    next(ex);
  }
};

module.exports.unpinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Messages.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found." });
    }

    // Kiểm tra xem tin nhắn có đang được ghim không
    if (!message.pinned) {
      return res.status(400).json({ msg: "Message is not pinned." });
    }

    // Bỏ ghim
    message.pinned = false;
    await message.save();

    // Gửi thông báo qua socket để đồng bộ
    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();
    const recipientIds = message.users.filter((u) => u.toString() !== userId);

    recipientIds.forEach((recipientId) => {
      const recipientSocket = onlineUsers.get(recipientId.toString());
      if (io && recipientSocket) {
        io.to(recipientSocket).emit("unpin-message", {
          messageId: message._id,
        });
      }
    });

    res.json({ msg: "Message unpinned successfully." });
  } catch (ex) {
    console.error("[unpinMessage] Error:", ex);
    next(ex);
  }
};

module.exports.getMessageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const message = await Messages.findById(id)
      .populate({
        path: "replyTo",
        select: "message sender createdAt",
        populate: {
          path: "sender",
          select: "fullName avatar",
        },
      })
      .populate("sender", "fullName avatar");

    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    const result = {
      fromSelf: false, // Có thể thêm logic để xác định user gọi API
      message: message.message.text,
      fileUrls: message.message.files.map((f) => f.url),
      fileTypes: message.message.files.map((f) => f.type),
      emoji: message.message.emoji,
      _id: message._id,
      createdAt: message.createdAt,
      recalled: message.recalled,
      reactions: message.reactions.map((r) => ({
        user: r.user,
        emoji: r.emoji,
      })),
      sender: {
        _id: message.sender._id,
        fullName: message.sender.fullName,
        avatar: message.sender.avatar,
      },
      groupId: message.groupId || null,
      users: message.users || [],
      replyTo: message.replyTo
        ? {
            _id: message.replyTo._id,
            message: message.replyTo.message.text,
            createdAt: message.replyTo.createdAt,
            sender: {
              _id: message.replyTo.sender?._id,
              fullName: message.replyTo.sender?.fullName,
              avatar: message.replyTo.sender?.avatar,
            },
            fileUrls: message.replyTo.message.files.map((f) => f.url),
            fileTypes: message.replyTo.message.files.map((f) => f.type),
          }
        : null,
    };

    res.json(result);
  } catch (ex) {
    next(ex);
  }
};

// Lấy danh sách nhóm với tin nhắn cuối cùng
module.exports.getGroupsWithLastMessageByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    const groups = await groupModel.find({ groupMembers: userId });

    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Messages.findOne({ groupId: group._id })
          .sort({ createdAt: -1 })
          .limit(1)
          .populate("sender", "fullName avatar");

        return {
          ...group.toObject(),
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                message: lastMessage.message.text,
                fileUrls: lastMessage.message.files.map((f) => f.url),
                fileTypes: lastMessage.message.files.map((f) => f.type),
                createdAt: lastMessage.createdAt,
                sender: {
                  _id: lastMessage.sender._id,
                  fullName: lastMessage.sender.fullName,
                  avatar: lastMessage.sender.avatar,
                },
              }
            : null,
        };
      })
    );

    res.status(200).json(groupsWithLastMessage);
  } catch (err) {
    console.error("Error getting groups with last message:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Xóa reaction khỏi tin nhắn
module.exports.unreactToMessage = async (req, res, next) => {
  try {
    const { messageId, userId } = req.body;

    const message = await Messages.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found." });
    }

    const existingReaction = message.reactions.find(
      (r) => r.user.toString() === userId
    );

    if (!existingReaction) {
      return res
        .status(400)
        .json({ msg: "You haven't reacted to this message." });
    }

    await Messages.updateOne(
      { _id: messageId },
      { $pull: { reactions: { user: userId } } },
      { timestamps: false }
    );

    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();

    if (message.groupId) {
      // Xóa reaction trong nhóm
      const group = await groupModel.findById(message.groupId);
      if (!group) {
        return res.status(404).json({ msg: "Group not found." });
      }

      group.groupMembers.forEach((memberId) => {
        if (memberId.toString() !== userId) {
          const memberSocket = onlineUsers.get(memberId.toString());
          if (io && memberSocket) {
            io.to(memberSocket).emit("group-msg-receive", {
              type: "reaction-updated",
              groupId: message.groupId,
              _id: message._id,
              message: {
                text: "Có người gỡ cảm xúc khỏi tin nhắn nhóm",
                emoji: "",
                files: [],
              },
              createdAt: message.createdAt,
              from: userId,
            });
          }
        }
      });
    } else {
      // Xóa reaction trong private chat
      const recipientIds = message.users.filter((u) => u.toString() !== userId);

      recipientIds.forEach((recipientId) => {
        const recipientSocket = onlineUsers.get(recipientId.toString());
        if (io && recipientSocket) {
          io.to(recipientSocket).emit("msg-receive", {
            type: "reaction-updated",
            _id: message._id,
            message: {
              text: "Có người gỡ cảm xúc khỏi tin nhắn các bạn",
              emoji: "",
              files: [],
            },
            createdAt: message.createdAt,
            from: userId,
          });
        }
      });
    }

    return res.json({ msg: "Reaction removed." });
  } catch (ex) {
    next(ex);
  }
};

// Thêm vào cuối file messageController.js

module.exports.pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Messages.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found." });
    }

    // Kiểm tra xem tin nhắn đã được ghim chưa
    if (message.pinned) {
      return res.status(400).json({ msg: "Message is already pinned." });
    }

    // Đặt trạng thái ghim
    message.pinned = true;
    await message.save();

    // Gửi thông báo qua socket để đồng bộ
    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();
    const recipientIds = message.users.filter((u) => u.toString() !== userId);

    recipientIds.forEach((recipientId) => {
      const recipientSocket = onlineUsers.get(recipientId.toString());
      if (io && recipientSocket) {
        io.to(recipientSocket).emit("pin-message", {
          messageId: message._id,
        });
      }
    });

    res.json({ msg: "Message pinned successfully." });
  } catch (ex) {
    console.error("[pinMessage] Error:", ex);
    next(ex);
  }
};

module.exports.unpinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Messages.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found." });
    }

    // Kiểm tra xem tin nhắn có đang được ghim không
    if (!message.pinned) {
      return res.status(400).json({ msg: "Message is not pinned." });
    }

    // Bỏ ghim
    message.pinned = false;
    await message.save();

    // Gửi thông báo qua socket để đồng bộ
    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();
    const recipientIds = message.users.filter((u) => u.toString() !== userId);

    recipientIds.forEach((recipientId) => {
      const recipientSocket = onlineUsers.get(recipientId.toString());
      if (io && recipientSocket) {
        io.to(recipientSocket).emit("unpin-message", {
          messageId: message._id,
        });
      }
    });

    res.json({ msg: "Message unpinned successfully." });
  } catch (ex) {
    console.error("[unpinMessage] Error:", ex);
    next(ex);
  }
};

// thêm để lấy danh sách tin nhắn ghim:
module.exports.getPinnedMessages = async (req, res, next) => {
  try {
    const { from, to, groupId } = req.body;

    let pinnedMessages;
    if (groupId) {
      pinnedMessages = await Messages.find({
        groupId,
        pinned: true,
        deletedFor: { $ne: from },
      })
        .sort({ createdAt: 1 })
        .populate("sender", "fullName avatar") // Thêm populate
        .populate({
          path: "replyTo",
          populate: { path: "sender", select: "fullName avatar" },
        });
    } else {
      pinnedMessages = await Messages.find({
        users: { $all: [from, to] },
        groupId: null,
        pinned: true,
        deletedFor: { $ne: from },
      })
        .sort({ createdAt: 1 })
        .populate("sender", "fullName avatar") // Thêm populate
        .populate({
          path: "replyTo",
          populate: { path: "sender", select: "fullName avatar" },
        });
    }

    const projectedPinnedMessages = pinnedMessages.map((msg) => ({
      _id: msg._id,
      senderName: msg.sender?.fullName || "Unknown",
      senderAvatar: msg.sender?.avatar || "/default-avatar.png",
      content:
        msg.message.text || (msg.message.files.length > 0 ? "[Media]" : ""),
      isImage: msg.message.files.some((f) => f.type.startsWith("image/")),
      fileUrls: msg.message.files.map((f) => f.url),
      createdAt: msg.createdAt,
    }));

    res.json(projectedPinnedMessages);
  } catch (ex) {
    next(ex);
  }
};

// module.exports.createPoll = async (req, res, next) => {
//   try {
//     const { from, groupId, question, options } = req.body;

//     // Kiểm tra đầu vào
//     if (!mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(groupId)) {
//       return res.status(400).json({ msg: "Invalid user ID or group ID" });
//     }
//     if (!question || !options || !Array.isArray(options) || options.length < 2) {
//       return res.status(400).json({ msg: "Question and at least two options are required" });
//     }
//     if (options.some((opt) => !opt.text)) {
//       return res.status(400).json({ msg: "All options must have text" });
//     }

//     // Kiểm tra nhóm tồn tại và user là thành viên/admin
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ msg: "Group not found" });
//     }
//     const isMember = group.groupMembers.includes(from) || group.groupAdmin.toString() === from;
//     if (!isMember) {
//       return res.status(403).json({ msg: "You are not a member of this group" });
//     }

//     // Tạo tin nhắn khảo sát
//     const newPoll = {
//       sender: from,
//       groupId,
//       users: [],
//       message: { text: question, files: [], emoji: "" },
//       poll: {
//         question,
//         options: options.map((opt) => ({ text: opt.text, votes: [] })),
//         isActive: true,
//       },
//     };

//     const message = await Messages.create(newPoll);

//     // Gửi thông báo
//     const io = getSocketIO();
//     const onlineUsers = getOnlineUsers();
//     group.groupMembers.forEach((memberId) => {
//       const memberSocket = onlineUsers.get(memberId.toString());
//       if (io && memberSocket && memberId.toString() !== from) {
//         io.to(memberSocket).emit("group-msg-receive", {
//           type: "poll-created",
//           groupId,
//           from,
//           message: {
//             text: message.message.text,
//             files: [],
//             emoji: "",
//           },
//           poll: {
//             _id: message._id,
//             question: message.poll.question,
//             options: message.poll.options,
//             isActive: message.poll.isActive,
//           },
//           createdAt: message.createdAt,
//           _id: message._id,
//         });
//       }
//     });

//     return res.json({
//       msg: "Poll created successfully",
//       poll: {
//         _id: message._id,
//         question: "message.message.text",
//         options: message.poll.options,
//         isActive: true,
//         createdAt: message.createdAt,
//         from,
//         groupId,
//       },
//     });
//   } catch (err) {
//     console.error("Error in createPoll:", err);
//     return next(err);
//   }
// };
// module.exports.createPoll = async (req, res, next) => {
//   try {
//     const { from, groupId, question, options } = req.body;

//     // Kiểm tra đầu vào
//     if (!mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(groupId)) {
//       return res.status(400).json({ msg: "Invalid user ID or group ID" });
//     }
//     if (!question || !options || !Array.isArray(options) || options.length < 2) {
//       return res.status(400).json({ msg: "Question and at least two options are required" });
//     }
//     if (options.some((opt) => !opt.text)) {
//       return res.status(400).json({ msg: "All options must have text" });
//     }

//     // Kiểm tra nhóm tồn tại và user là thành viên/admin
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ msg: "Group not found" });
//     }
//     const isMember = group.groupMembers.includes(from) || group.groupAdmin.toString() === from;
//     if (!isMember) {
//       return res.status(403).json({ msg: "You are not a member of this group" });
//     }

//     // Tạo tin nhắn khảo sát
//     const newPoll = {
//       sender: from,
//       groupId,
//       users: [],
//       message: { text: question, files: [], emoji: "" },
//       poll: {
//         question,
//         options: options.map((opt) => ({ text: opt.text, votes: [] })),
//         isActive: true,
//       },
//     };

//     const message = await Messages.create(newPoll);

//     // Gửi thông báo
//     const io = getSocketIO();
//     const onlineUsers = getOnlineUsers();
//     group.groupMembers.forEach((memberId) => {
//       const memberSocket = onlineUsers.get(memberId.toString());
//       if (io && memberSocket && memberId.toString() !== from) {
//         io.to(memberSocket).emit("group-msg-receive", {
//           type: "poll-created",
//           groupId,
//           from,
//           message: {
//             text: message.message.text,
//             files: [],
//             emoji: "",
//           },
//           poll: {
//             _id: message._id,
//             question: message.poll.question,
//             options: message.poll.options,
//             isActive: message.poll.isActive,
//           },
//           createdAt: message.createdAt,
//           _id: message._id,
//         });
//       }
//     });

//     return res.json({
//       msg: "Poll created successfully",
//       poll: {
//         _id: message._id,
//         question: message.message.text, // Sửa lỗi
//         options: message.poll.options,
//         isActive: true,
//         createdAt: message.createdAt,
//         from,
//         groupId,
//       },
//     });
//   } catch (err) {
//     console.error("Error in createPoll:", err);
//     return next(err);
//   }
// };

module.exports.createPoll = async (req, res, next) => {
  try {
    const { from, groupId, question, options } = req.body;

    // Kiểm tra đầu vào
    if (!mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ msg: "Invalid user ID or group ID" });
    }
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ msg: "Question and at least two options are required" });
    }
    if (options.some((opt) => !opt.text)) {
      return res.status(400).json({ msg: "All options must have text" });
    }

    // Kiểm tra nhóm tồn tại và user là thành viên/admin
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }
    const isMember = group.groupMembers.includes(from) || group.groupAdmin.toString() === from;
    if (!isMember) {
      return res.status(403).json({ msg: "You are not a member of this group" });
    }

    // Tạo tin nhắn khảo sát
    const newPoll = {
      sender: from,
      groupId,
      users: [],
      message: { text: question, files: [], emoji: "" },
      poll: {
        question,
        options: options.map((opt) => ({ text: opt.text, votes: [] })),
        isActive: true,
      },
    };

    const message = await Messages.create(newPoll);

    // Gửi thông báo
    const io = getSocketIO();
const onlineUsers = getOnlineUsers();
group.groupMembers.forEach((memberId) => {
  const memberSocket = onlineUsers.get(memberId.toString());
  if (io && memberSocket) {
    io.to(memberSocket).emit("group-msg-receive", {
      type: "poll-created",
      groupId,
      from,
      message: {
        text: message.message.text,
        files: [],
        emoji: "",
      },
      poll: {
        _id: message._id,
        question: message.poll.question,
        options: message.poll.options,
        isActive: message.poll.isActive,
      },
      createdAt: message.createdAt,
      _id: message._id,
      senderName: group.groupMembers.find((m) => m.toString() === from)?.fullName || "Unknown",
    });
  }
});

    return res.json({
      msg: "Poll created successfully",
      poll: {
        _id: message._id,
        question: message.message.text, // Sửa lỗi
        options: message.poll.options,
        isActive: true,
        createdAt: message.createdAt,
        from,
        groupId,
      },
    });
  } catch (err) {
    console.error("Error in createPoll:", err);
    return next(err);
  }
};


// module.exports.votePoll = async (req, res, next) => {
//   try {
//     const { messageId, userId, optionIndex } = req.body;

//     // Kiểm tra đầu vào
//     if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ msg: "Invalid message ID or user ID" });
//     }
//     if (!Number.isInteger(optionIndex)) {
//       return res.status(400).json({ msg: "Invalid option index" });
//     }

//     // Tìm tin nhắn khảo sát
//     const message = await Messages.findById(messageId);
//     if (!message || !message.poll) {
//       return res.status(404).json({ msg: "Poll not found" });
//     }
//     if (!message.poll.isActive) {
//       return res.status(400).json({ msg: "Poll is closed" });
//     }
//     // Kiểm tra user là thành viên
//       if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
//       return res.status(400).json({ msg: "Invalid option index" });
//     }

//     // Kiểm tra user là thành viên nhóm
//     const group = await groupModel.findById(message.groupId);
//     if (!group) {
//       return res.status(404).json({ msg: "Group not found" });
//     }
//     const isMember = group.groupMembers.includes(userId) || group.groupAdmin.toString() === userId;
//     if (!isMember) {
//       return res.status(403).json({ msg: "You are not a member of this group" });
//     }

//     // Xóa phiếu bầu cũ (nếu có)
//     message.poll.options.forEach((opt) => {
//       opt.votes = opt.votes.filter((vote) => vote.toString() !== userId);
//     });

//     // Thêm phiếu mới
//     message.poll.options[optionIndex].votes.push(userId);
//     await message.save();

//     // Gửi thông báo
//     const io = getSocketIO();
//     const onlineUsers = getOnlineUsers();
//     group.groupMembers.forEach((memberId) => {
//       const memberSocket = onlineUsers.get(memberId.toString());
//       if (io && memberSocket && memberId.toString() !== userId) {
//         io.to(memberSocket).emit("group-msg-receive", {
//           type: "poll-updated",
//           groupId: message.groupId,
//           message: {
//             text: message.message.text,
//             files: [],
//             emoji: "",
//           },
//           poll: {
//             _id: message._id,
//             question: message.poll.question,
//             options: message.poll.options,
//             isActive: message.poll.isActive,
//           },
//           createdAt: message.createdAt,
//           _id: message._id,
//         });
//       }
//     });

//     return res.json({
//       msg: "Voted successfully",
//       poll: {
//         _id: message._id,
//         question: message.message.text,
//         options: message.poll.options,
//         isActive: message.poll.isActive,
//       },
//     });
//   } catch (err) {
//     console.error("Error in votePoll:", err);
//     return next(err);
//   }
// };
module.exports.votePoll = async (req, res, next) => {
  try {
    const { messageId, userId, optionIndex } = req.body;

    // Kiểm tra đầu vào
    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "Invalid message ID or user ID" });
    }
    if (!Number.isInteger(optionIndex)) {
      return res.status(400).json({ msg: "Invalid option index" });
    }

    // Tìm tin nhắn khảo sát
    const message = await Messages.findById(messageId);
    if (!message || !message.poll) {
      return res.status(404).json({ msg: "Poll not found" });
    }
    if (!message.poll.isActive) {
      return res.status(400).json({ msg: "Poll is closed" });
    }

    // Kiểm tra optionIndex hợp lệ
    if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
      return res.status(400).json({ msg: "Invalid option index" });
    }

    // Kiểm tra user là thành viên nhóm
    const group = await groupModel.findById(message.groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }
    const isMember = group.groupMembers.includes(userId) || group.groupAdmin.toString() === userId;
    if (!isMember) {
      return res.status(403).json({ msg: "You are not a member of this group" });
    }

    // Kiểm tra user chưa bầu cho tùy chọn này
    if (!message.poll.options[optionIndex].votes.includes(userId)) {
      message.poll.options[optionIndex].votes.push(userId);
      await message.save();
    }

    // Gửi thông báo
    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();
    group.groupMembers.forEach((memberId) => {
      const memberSocket = onlineUsers.get(memberId.toString());
      if (io && memberSocket && memberId.toString() !== userId) {
        io.to(memberSocket).emit("group-msg-receive", {
          type: "poll-updated",
          groupId: message.groupId,
          message: {
            text: message.message.text,
            files: [],
            emoji: "",
          },
          poll: {
            _id: message._id,
            question: message.poll.question,
            options: message.poll.options,
            isActive: message.poll.isActive,
          },
          createdAt: message.createdAt,
          _id: message._id,
        });
      }
    });

    return res.json({
      msg: "Voted successfully",
      poll: {
        _id: message._id,
        question: message.message.text,
        options: message.poll.options,
        isActive: message.poll.isActive,
      },
    });
  } catch (err) {
    console.error("Error in votePoll:", err);
    return next(err);
  }
};

module.exports.removeVote = async (req, res, next) => {
  try {
    const { messageId, userId, optionIndex } = req.body;

    // Kiểm tra đầu vào
    if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "Invalid message ID or user ID" });
    }
    if (!Number.isInteger(optionIndex)) {
      return res.status(400).json({ msg: "Invalid option index" });
    }

    // Tìm tin nhắn khảo sát
    const message = await Messages.findById(messageId);
    if (!message || !message.poll) {
      return res.status(404).json({ msg: "Poll not found" });
    }
    if (!message.poll.isActive) {
      return res.status(400).json({ msg: "Poll is closed" });
    }

    // Kiểm tra optionIndex hợp lệ
    if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
      return res.status(400).json({ msg: "Invalid option index" });
    }

    // Kiểm tra user là thành viên nhóm
    const group = await groupModel.findById(message.groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }
    const isMember = group.groupMembers.includes(userId) || group.groupAdmin.toString() === userId;
    if (!isMember) {
      return res.status(403).json({ msg: "You are not a member of this group" });
    }

    // Xóa phiếu bầu
    message.poll.options[optionIndex].votes = message.poll.options[optionIndex].votes.filter(
      (vote) => vote.toString() !== userId
    );
    await message.save();

    // Gửi thông báo
    const io = getSocketIO();
    const onlineUsers = getOnlineUsers();
    group.groupMembers.forEach((memberId) => {
      const memberSocket = onlineUsers.get(memberId.toString());
      if (io && memberSocket && memberId.toString() !== userId) {
        io.to(memberSocket).emit("group-msg-receive", {
          type: "poll-updated",
          groupId: message.groupId,
          message: {
            text: message.message.text,
            files: [],
            emoji: "",
          },
          poll: {
            _id: message._id,
            question: message.poll.question,
            options: message.poll.options,
            isActive: message.poll.isActive,
          },
          createdAt: message.createdAt,
          _id: message._id,
        });
      }
    });

    return res.json({
      msg: "Vote removed successfully",
      poll: {
        _id: message._id,
        question: message.message.text,
        options: message.poll.options,
        isActive: message.poll.isActive,
      },
    });
  } catch (err) {
    console.error("Error in removeVote:", err);
    return next(err);
  }
};

// module.exports.getPolls = async (req, res, next) => {
//   try {
//     const { groupId, userId } = req.body;

//     // Kiểm tra đầu vào
//     if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ msg: "Invalid group ID or user ID" });
//     }

//     // Kiểm tra nhóm
//     const group = await groupModel.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ msg: "Group not found" });
//     }
//     const isMember = group.groupMembers.includes(userId) || group.groupAdmin.toString() === userId;
//     if (!isMember) {
//       return res.status(403).json({ msg: "You are not a member of this group" });
//     }

//     // Lấy khảo sát
//     const polls = await Messages.find({
//       groupId,
//       "poll.question": { $ne: "" },
//       deletedFor: { $ne: userId },
//     })
//       .sort({ createdAt: -1 })
//       .populate("sender", "fullName avatar");

//     const projectedPolls = polls.map((poll) => ({
//       _id: poll._id,
//       question: poll.message.text,
//       options: poll.options,
//       isActive: poll.isActive,
//       sender: {
//         _id: poll.sender._id,
//         fullName: poll.sender.fullName,
//         avatar: poll.sender.avatar,
//       },
//       createdAt: poll.createdAt,
//       recreated: poll.recalled,
//       pinned: poll.pinned,
//     }));

//     return res.json(projectedPolls);
//   } catch (err) {
//     console.error("Error in getPolls:", err);
//     return next(err);
//   }
// };

module.exports.getPolls = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;

    // Kiểm tra đầu vào
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "Invalid group ID or user ID" });
    }
    if (!groupId || !userId) {
      return res.status(400).json({ msg: "groupId and userId are required" });
    }

    // Kiểm tra nhóm
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }
    const isMember = group.groupMembers.includes(userId) || group.groupAdmin.toString() === userId;
    if (!isMember) {
      return res.status(403).json({ msg: "You are not a member of this group" });
    }

    // Lấy khảo sát
    const messages = await Messages.find({
      groupId,
      "poll.question": { $exists: true, $ne: "" },
      deletedFor: { $ne: userId },
      sender: { $ne: null }, // Loại bỏ tin nhắn không có sender
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "sender",
        select: "fullName avatar",
      })
      .populate({
        path: "replyTo",
        select: "message sender createdAt",
      });

    const projectedPolls = messages.map((msg) => ({
      fromSelf: msg.sender ? msg.sender.toString() === userId : false,
      message: msg.message.text,
      fileUrls: msg.message.files.map((file) => file.url),
      fileTypes: msg.message.files.map((file) => file.type),
      emoji: msg.message.emoji || "",
      _id: msg._id,
      createdAt: msg.createdAt,
      recalled: msg.recalled || false,
      sender: msg.sender ? msg.sender.toString() : null, // Trả về sender là chuỗi
      reactions: msg.reactions.map((r) => ({
        user: r.user,
        emoji: r.emoji,
      })),
      replyTo: msg.replyTo
        ? {
            _id: msg.replyTo._id,
            text: msg.replyTo.message.text,
            createdAt: msg.replyTo.createdAt,
            user: msg.replyTo.sender ? msg.replyTo.sender.toString() : null,
            fileUrls: msg.replyTo.message.files.map((file) => file.url),
            fileTypes: msg.replyTo.message.files.map((file) => file.type),
          }
        : null,
      poll: msg.poll?.question
        ? {
            question: msg.poll.question,
            options: msg.poll.options,
            isActive: msg.poll.isActive,
          }
        : null,
    }));

    return res.json(projectedPolls);
  } catch (err) {
    console.error("Error in getPolls:", err);
    return next(err);
  }
};