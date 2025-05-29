const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    avatar: String,
    groupName: String,
    groupMembers: Array,
    groupAdmin: String,
    groupDeputy: Array,
    createdAt: Date,
    link: String,
}, {
    timestamps: true,
});
const Group = mongoose.model('group', GroupSchema);
module.exports = Group;