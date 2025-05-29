const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

router.get('/get-friend/:userId', friendController.getFriends);
router.post('/add-friend', friendController.addFriend);
router.post('/accept-friend', friendController.acceptFriend);
router.post('/unfriend-friend', friendController.unfriend);
router.post('/reject-friend', friendController.rejectFriend);
router.get('/get-add-friend/:userId', friendController.getAddFriend);

module.exports = router;
