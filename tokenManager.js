const fs = require('fs');
const fcmTokensFile = './fcmTokens.json';

const readFcmTokens = () => {
  try {
    const data = fs.readFileSync(fcmTokensFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeFcmTokens = (tokens) => {
  fs.writeFileSync(fcmTokensFile, JSON.stringify(tokens, null, 2));
};

module.exports = { readFcmTokens, writeFcmTokens };
