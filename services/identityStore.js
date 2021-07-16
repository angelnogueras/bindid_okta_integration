const { genUsername } = require('./helpers');

module.exports = {
  getUserProfile: userId => {
    return {
      username: userId,
      userId: genUsername(userId),
      fullName: `${userId} Demo`
    };
  }
};
