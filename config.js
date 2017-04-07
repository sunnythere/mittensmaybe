const dotenv = require('dotenv');
const cfg = {};

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  dotenv.config({path: '.env'});
} else {
  dotenv.config({path: '.env.test', silent: true});
}

// HTTP Port
cfg.port = process.env.PORT || 3000;

// A random string that will help generate secure one-time passwords and
// HTTP sessions
cfg.secret = process.env.APP_SECRET || 'keyboard nyancat';


cfg.accountSid = process.env.TWILIO_ACCOUNT_SID;
cfg.authToken = process.env.TWILIO_AUTH_TOKEN;
cfg.sendingNumber = process.env.TWILIO_NUMBER;
cfg.apixu = process.env.apixu_key;
cfg.num = process.env.num;

var requiredConfig = [cfg.accountSid, cfg.authToken, cfg.sendingNumber, cfg.apixu, cfg.num];
var isConfigured = requiredConfig.every(function(configValue) {
  return configValue || false;
});

if (!isConfigured) {
  var errorMessage =
    'all env variables must be set.';

  throw new Error(errorMessage);
}


module.exports = cfg;
