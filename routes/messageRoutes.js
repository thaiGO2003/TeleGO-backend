const express = require("express");
const {
  addMessage,
  getMessages,
  deleteMessageById,
  recallMessageById,
  forwardMessage,
  sendMediaMessage,
  deleteMessageForMe,
  getMessagesByUser,
  getLastMessagesPerUser,
  deleteConversation,
  reactToMessage,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  deleteAllMessagesForMe,
  votePoll,
  createPoll,
  getPolls,
  removeVote, unreactToMessage
} = require("../controllers/messageController");
const uploadMultipart = require("../middlewares/upload-multipart");
const uploadAndDownload = require("../middlewares/uploadAndDowload");
const router = express.Router();

router.post("/addmsg", addMessage);
router.post("/getmsg", getMessages);
router.delete("/deletemsg/:id", deleteMessageById);
router.post("/recallmsg/:id", recallMessageById);
router.post("/forwardmsg", forwardMessage);
//router.post("/sendmedia", uploadMultipart.single("file"), sendMediaMessage);
router.post("/deletemsgforme", deleteMessageForMe);
router.get("/usermessages/:userId", getMessagesByUser);
router.get("/lastmessages/:userId", getLastMessagesPerUser);
router.post("/delete-conversation", deleteConversation);
router.post("/react", reactToMessage);
router.post("/unreact", unreactToMessage);
// router.post("/sendmedia", uploadAndDownload.single("file"), sendMediaMessage);
router.post("/sendmedia", uploadAndDownload, sendMediaMessage);
//đã sửa:
router.post("/pinmsg/:messageId", pinMessage); // Thêm route mới
router.post("/unpinmsg/:messageId", unpinMessage); // Thêm route mới
router.post("/getPinnedMessages", getPinnedMessages);
router.post("/delete-all-messages-for-me", deleteAllMessagesForMe);

router.post("/vote-poll", votePoll);
router.post("/create-poll", createPoll);
router.post("/get-polls", getPolls);
router.post("/remove-vote", removeVote);
module.exports = router;
