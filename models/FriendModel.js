const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema({
    idUser1: String,
    idUser2: String,
    status: Number,
    actionUserId: String
}, {
    timestamps: true,
});

const Friend = mongoose.model('friend', FriendSchema);
module.exports = Friend;
