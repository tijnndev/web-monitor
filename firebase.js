const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const messaging = admin.messaging();

const sendPushNotification = (fcmToken, websiteName) => {
  const message = {
    notification: {
      title: `Website Down: ${websiteName}`,
      body: `${websiteName} is currently offline.`
    },
    token: fcmToken,
  };

  messaging.send(message)
    .then((response) => {
      console.log('Notification sent successfully:', response);
    })
    .catch((error) => {
      console.error('Error sending notification:', error);
    });
};

module.exports = { sendPushNotification };
