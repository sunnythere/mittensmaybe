var config = require('./config');
var client = require('twilio')(config.accountSid, config.authToken);

module.exports.sendSms = function(to, message) {
  client.messages.create({
    body: message,
    to: to,
    from: config.sendingNumber
//  mediaUrl: imageUrl
  }, function(err, data) {
    if (err) {
      console.error('Oops');
      console.error(err);
    }
  });
};
