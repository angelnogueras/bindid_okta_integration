const genUsername = name => `${process.env.MAIL_USERNAME}+${name}@${process.env.MAIL_DOMAIN}`;

module.exports = {
  genUsername: genUsername,
};