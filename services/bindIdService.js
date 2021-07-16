const crypto = require('crypto');
const axios = require('axios');
const qs = require('qs');

/**
 * Back-channel: exchange access_token and id_token by code
 * @param {String} code 
 * @param {URL} redirect_uri 
 * @returns Response object including access_token and id_token
 */
const exchangeCode = async (code, redirect_uri) => {
  // Exchange token
  const bodyData = {
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': redirect_uri,
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
  };

  let response = null;
  try {
    response = await axios.post(
      'https://signin.bindid-sandbox.io/token',
      qs.stringify(bodyData),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded'} }
    );
    // console.log(response.status);
    // console.log(response.statusText);
    // console.log(response.headers);
    return response.data;
  }
  catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
    else if (error.request) {
      // The request was made but no response was received
      console.log(error.request);
    }
    else {
      console.log(error.message);
    }
    throw error;
  }
};

/**
 * BindID /userinfo endpoint 
 * @param {String} access_token 
 * @returns userinfo
 */
const userInfo = async access_token => {
  let response = null;
  try {
    response = await axios.get(
      'https://signin.bindid-sandbox.io/userinfo',
      { headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${access_token}`
      }}
    );
    return response.data;
  }
  catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
    else if (error.request) {
      // The request was made but no response was received
      console.log(error.request);
    }
    else {
      console.log(error.message);
    }
    throw error;
  }  
};

/**
 * BindID feedback API. Used to set alias
 * @param {String} bindIdAlias 
 * @param {String} accessToken 
 */
const setBindIdAlias = async (bindIdAlias, accessToken) => {

  const bodyData = {
    "subject_session_at": accessToken,
    "reports": [{
      "type": "authentication_performed",
      "alias": bindIdAlias,
      "time": Math.floor(Date.now() / 1000), // seconds
    }]
  };

  console.log(bodyData);

  const feedbackAuthVal = crypto.createHmac('sha256', process.env.CLIENT_SECRET)
    .update(accessToken)
    .digest('base64');

  let response = null;
  try {
    response = await axios.post(
      'https://api.bindid-sandbox.io/session-feedback',
      bodyData,
      { headers: {
        'Content-Type': 'application/json',
        'Authorization': `BindIdBackend AccessToken ${accessToken}; ${feedbackAuthVal}`,
      } }
    );
    console.log(`Feedback complete: ${JSON.stringify(response.data)}`);
  }
  catch (error) {
    console.error("ERROR feedback");
    console.log(error.message);
  }
};

/**
 * BindID allows to set some data associated to an identity.
 * Simple example to set a static JSON object as data
 * @param {String} accessToken 
 */
const setUserData = async (accessToken) => {

  const bodyData = {
    "data": {
      "desc": "some user data",
      "pin": [1,2,3,4]
    }
  };
  console.log("UserData:", bodyData);

  const feedbackAuthVal = crypto.createHmac('sha256', process.env.CLIENT_SECRET)
    .update(accessToken)
    .digest('base64');

  let response = null;
  try {
    response = await axios.post(
      'https://api.bindid-sandbox.io/custom-user-data',
      bodyData,
      { headers: {
        'Content-Type': 'application/json',
        'Authorization': `BindIdBackend AccessToken ${accessToken}; ${feedbackAuthVal}`,
      } }
    );
    console.log(`UserData complete: ${JSON.stringify(response.data)}`);
  }
  catch (error) {
    console.error("ERROR userdata");
    console.log(error.message);
  }
};

/**
 * Get current identity BindID stored user data.
 * @param {String} accessToken 
 */
const getUserData = async (accessToken) => {
  const feedbackAuthVal = crypto.createHmac('sha256', process.env.CLIENT_SECRET)
    .update(accessToken)
    .digest('base64');

  let response = null;
  try {
    response = await axios.get(
      'https://api.bindid-sandbox.io/custom-user-data',
      { headers: {
        'Content-Type': 'application/json',
        'Authorization': `BindIdBackend AccessToken ${accessToken}; ${feedbackAuthVal}`,
      } }
    );
    console.log(`UserData complete: ${JSON.stringify(response.data)}`);
    return response.data;
  }
  catch (error) {
    console.error("ERROR userdata");
    console.log(error.message);
    return {error: error.message};
  }
};

module.exports = {
  exchangeCode: exchangeCode,
  userInfo: userInfo,
  setBindIdAlias: setBindIdAlias,
  setUserData: setUserData,
  getUserData: getUserData,
};