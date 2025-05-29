// socket.js
let io;
const onlineUsers = new Map();

module.exports = {
  setSocketIO: (ioInstance) => {
    io = ioInstance;
  },

  getSocketIO: () => io,

  setUserOnline: (userId, socketId) => {
    onlineUsers.set(userId, socketId);
  },

  removeUserBySocketId: (socketId) => {
    for (const [userId, sId] of onlineUsers.entries()) {
      if (sId === socketId) {
        onlineUsers.delete(userId);
        break;
      }
    }
  },

  getOnlineUsers: () => onlineUsers,
};
