
const fs = require('fs');
const readline = require('readline');
const moment = require('moment');
const axios = require('axios')
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const schedule = require('node-schedule')
const twilioClient = require('./twilioClient');
const cfg = require('./config.js');


const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'mittens-maybe.json';

schedule.scheduleJob('0 0 7 0 0', function() {
  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), lookAtToday);
  });
})





function authorize(credentials, callback) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // previously stored token?
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}


function getNewToken(oauth2Client, callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}


function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}


function lookAtToday(auth) {
  const calendar = google.calendar('v3')
  let now = moment()
  calendar.events.list({
    auth,
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: (moment(now).add(17, 'hours')).toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;

    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      //console.log('Your upcoming events:');
      //console.log('EVENTS, ', events)
      for (let i = 0; i < events.length; i++) {
        let event = events[i];
        let start = event.start.dateTime

        let regSearch = event.location ? event.location.search(/\d{5},/) : null
        let zip = event.location ? event.location.slice(regSearch, regSearch+5) : null
        //eventsArr.push([start, zip])

        //get weather
        //iterate through array
        checkWeather(start)
        .then((weather) => {
          let msg = formatMsg(weather)
          twilioClient.sendSms(cfg.num, msg)
        })

      }
    }
  });
}


// get weather info
function checkWeather(time) {
  let startH = moment(time).format('H')
  return axios.get(`http://api.apixu.com/v1/forecast.json?key=${cfg.apixu}&q=11201&hour=${startH}`)
    //res: forecase obj
    .then(res => res.data)
};



function formatMsg(weatherInfo) {

  let hourCast = weatherInfo.forecast.forecastday[0].hour[0]
      let temp = hourCast['temp_f']   //decimals
      let windchill = hourCast['windchill_f']   //decimal
      let willItRain = hourCast['will_it_rain']   //1 y, 0 n
      let precip = hourCast['precip_in']   //decimals
      let currentTime = moment().format('h:mm a')

  let msg = `${currentTime}. It's ${hourCast.condition.text} today.`
    msg += willItRain ? `  Precip level: ${precip}in.  Umbrella, maybe?` : ''
    msg += windchill < 35 ? `  Temp/Windchill is ${temp}/${windchill} F.  Mittens, maybe?` : ''

  return msg
};

