const express = require('express');
const session = require('express-session');
const fs = require('fs');
const https = require('https');
const jwt_decode = require('jwt-decode');
const app = express();
require('dotenv').config();

const identityStore = require('./services/identityStore');
const bindIdService = require('./services/bindIdService');
const oktaService = require('./services/oktaServices');

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Session
app.use(session({
  secret: 'keyboard cat is too simple',
  saveUninitialized: false,
  resave: false,
  rolling: false,  // "true" sends cookie every response -> expiration is reset
  cookie: {
    //domain: `${process.env.HOSTNAME}`,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000, // 5 minutes
    secure: true,
  },
}));


/*
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
*/

app.set('view engine', 'ejs');

const index = (req, res) => {
  res.render('pages/index', {
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URL,
  });
};
app.get('/', index);
app.get('/index.html', index);

app.get('/redirect.html', (req, res) => {
  res.render('pages/redirect', {
    client_id: process.env.CLIENT_ID,
  });
});

app.get('/index2.html', (req, res) => {
  res.render('pages/index2', {
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URL2,
  });
});

app.get('/redirect2.html', (req, res) => {
  res.render('pages/redirect2', {
    client_id: process.env.CLIENT_ID,
  });
});

app.get('/token_info', async (req, res) => {
  console.log(req.session);
  const id_token = req.session.id_token;
  const access_token = req.session.access_token;

  let dataUI = null;
  try {
    dataUI = await bindIdService.userInfo(access_token);
  }
  catch (error) {
    return res.send({"message": "error retrieving userInfo"});
  }


  /////////////// User Data
  //await bindIdService.setUserData(access_token);
  ///////////////
  let userData = await bindIdService.getUserData(access_token);

  try {
    res.send({
      //"message": "authentication ok",
      //"bindid_passport": id_token,
      "userinfo": dataUI,
      "user_data": userData,
    });
  }
  catch (err) {
    // InvalidTokenError
    console.error(err);
    res.send({
      "message": "ups, this is embarrasing",
      "error": err
    });
  }

});

app.get('/token_exchange_page', async (req, res) => {
  // Get token
  const code = req.query.code;

  let data = null;
  try {
    console.log(`About to exchange code for token:`);
    data = await bindIdService.exchangeCode(code, process.env.REDIRECT_URL);
  }
  catch (error) {
    return res.send({"message": "error retrieving token"});
  }

  console.log(data);
  const id_token = data.id_token;
  console.log(jwt_decode(id_token));
  const access_token = data.access_token;

  // Store info in session
  req.session.access_token = access_token;

  try {
    const decodedHeader = jwt_decode(id_token, {header: true});
    const decodedBody = jwt_decode(id_token);
    // Store info in session
    req.session.id_token = decodedBody;

    const bindIdAlias = decodedBody.bindid_alias;
    console.log(`BindIdAlias: ${bindIdAlias}`);

    if (!bindIdAlias) {
      // New User
      return res.redirect('/passwordLogin.html');
    }
    else {
      // Show info, user should be fully registered
      return res.redirect('/showInfo.html');
    }
  }
  catch (err) {
    // InvalidTokenError
    console.error(err);
    res.send({
      "message": "ups, this is embarrasing",
      "error": err
    });
  }

});

app.get('/create_user_okta', async (req, res) => {
  const name = req.query.username;
  console.log("Username: " + name);
  if (name == null || name.length == 0) {
    return res.status(500).send({
      status: 'ko',
      error: 'username must be a valid string'
    });
  }

  try {
    const oktaUser = await oktaService.createUser(name);
    console.log(oktaUser);
    req.session.oktaUser = oktaUser;
    return res.send({
      status: 'ok',
      user_id: oktaUser.id,
      user_login: oktaUser.profile.login,
    });
  }
  catch (error) {
    console.error("Error creating user in Okta");
    console.error(error);
    return res.status(500).send({
      status: 'ko',
      error: 'error creating user'
    });
  }
});

app.get('/token_exchange_page2', async (req, res) => {
  // Get token
  const code = req.query.code;

  let data = null;
  try {
    console.log(`About to exchange code for token:`);
    data = await bindIdService.exchangeCode(code, process.env.REDIRECT_URL2);
  }
  catch (error) {
    return res.send({"message": "error retrieving token"});
  }

  console.log(data);
  const id_token = data.id_token;
  console.log(jwt_decode(id_token));
  const access_token = data.access_token;

  // Store info in session
  req.session.access_token = access_token;

  try {
    const decodedHeader = jwt_decode(id_token, {header: true});
    const decodedBody = jwt_decode(id_token);
    // Store info in session
    req.session.id_token = decodedBody;

    let bindIdAlias = decodedBody.bindid_alias;
    console.log(`BindIdAlias: ${bindIdAlias}`);
    if (!bindIdAlias) {
      // Set bindid_alias
      bindIdAlias = req.session.oktaUser.profile.login;
      console.log(`Setting alias in BindID: ${bindIdAlias}`);
      await bindIdService.setBindIdAlias(bindIdAlias, access_token);
    }

    //const userProfile = JSON.stringify(identityStore.getUserProfile(bindIdAlias));
    await oktaService.updateUserAndGroup(req.session.oktaUser.id, bindIdAlias);
    return res.redirect('/showInfo.html');
  }
  catch (err) {
    // InvalidTokenError
    console.error(err);
    res.send({
      "message": "ups, this is embarrasing",
      "error": err
    });
  }

});


app.post('/authenticate', async (req, res) => {
  const userProfile = identityStore.getUserProfile(req.body.username, req.body.password);
  if (userProfile) {
    // Feedback bindIdAlias
    const bindIdAlias = userProfile.userId;

    // TODO: Add error handling if you don't want server to crash
    await bindIdService.setBindIdAlias(bindIdAlias, req.session.access_token);
    await oktaService.createUserInGroupWithBindId(userProfile.username, bindIdAlias);

    res.redirect('/showInfo.html');
  }
  else {
    //TODO: user not found ==> invalid credentials
  }
});


https.createServer(
  {
    key: fs.readFileSync('./keys/server.key'),
    cert: fs.readFileSync('./keys/server.cert'),
  },
  app
).listen(PORT, _ => console.log(`Server running on https://localhost:${PORT}`));
