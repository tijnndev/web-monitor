const fs = require('fs');
const fcmTokensFile = './fcmTokens.json';  // File to store FCM tokens

const readFcmTokens = () => {
  try {
    const data = fs.readFileSync(fcmTokensFile, 'utf8');
    return JSON.parse(data);  // Parse and return the tokens as an array
  } catch (err) {
    return [];  // If the file doesn't exist, return an empty array
  }
};

const writeFcmTokens = (tokens) => {
  fs.writeFileSync(fcmTokensFile, JSON.stringify(tokens, null, 2));  // Write tokens back to file
};

module.exports = { readFcmTokens, writeFcmTokens };
