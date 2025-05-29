const admin = require("firebase-admin");
const serviceAccount = require("./path-to-your-firebase-adminsdk.json"); // Tải từ Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  const message = {
    token: fcmToken,
    notification: { title, body },
    data, // optional: custom payload
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ Push sent:", response);
  } catch (err) {
    console.error("❌ Push failed:", err);
  }
};

module.exports = { sendPushNotification };
