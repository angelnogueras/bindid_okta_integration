const axios = require('axios');
const helpers = require('./helpers');

const OKTA_REQ_HEADERS = {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `SSWS ${process.env.OKTA_API_TOKEN}`,
  }
};


const createUserInGroupWithBindId = async (username, bindid_alias, password=process.env.OKTA_DEFAULT_PASSWD) => {

  const login_email = helpers.genUsername(username);

  const userData = {
    "profile": {
      "firstName": username,
      "lastName": "ApiTest",
      "email": login_email,
      "login": login_email,
      "mobilePhone": "555-415-1337",
      "bindid_alias": bindid_alias
    },
    "credentials": {
      "password": {
          "value": password
      }
    },
    "groupIds": [
      process.env.OKTA_GROUP_BIND
    ]
  };

  let response = null;
  try {
    response = await axios.post(
      `https://${process.env.OKTA_DOMAIN}/api/v1/users?activate=true`,
      userData,
      OKTA_REQ_HEADERS
    );
    console.log(`User created successfully at Okta: ${JSON.stringify(response.data)}`);
    return response.data;
  }
  catch (error) {
    console.error("ERROR creating user in group with BindId");
    console.log(error.message);
    throw error;
  }
};

const createUser = async (username, password=process.env.OKTA_DEFAULT_PASSWD) => {
  const login_email = helpers.genUsername(username);

  const userData = {
    "profile": {
      "firstName": username,
      "lastName": "ApiTest",
      "email": login_email,
      "login": login_email,
      "mobilePhone": "555-415-1337"
    },
    "credentials": {
      "password" : { "value": password }
    }
  };
  //console.log(userData);

  let response = null;
  try {
    response = await axios.post(
      `https://${process.env.OKTA_DOMAIN}/api/v1/users?activate=true`,
      userData,
      OKTA_REQ_HEADERS
    );
    console.log(`User created successfully at Okta: ${JSON.stringify(response.data)}`);
    return response.data;
  }
  catch (error) {
    console.error("ERROR creating user");
    console.log(error.message);
    throw error;
  }
};

const updateUserAndGroup = async (user_id, bindid_alias, okta_group=process.env.OKTA_GROUP_BIND) => {
  const userData = {
    "profile": {
      "bindid_alias": bindid_alias
    }
  };
  //console.log(userData);
  //console.log(`UserID: ${user_id}`);

  let response = null;
  try {
    // Set bindid_alias
    response = await axios.post(
      `https://${process.env.OKTA_DOMAIN}/api/v1/users/${user_id}`,
      userData,
      OKTA_REQ_HEADERS
    );
    console.log(`Bindid_alias updated: ${JSON.stringify(response.data)}`);

    // Add user to group
    response = await axios.put(
      `https://${process.env.OKTA_DOMAIN}/api/v1/groups/${okta_group}/users/${user_id}`,
      {},
      OKTA_REQ_HEADERS
    );
    console.log(`User added to BindId Okta group: ${response.status}`);
  }
  catch (error) {
    console.error("ERROR feedback");
    console.log(error.message);
    throw error;
  }
  
};

module.exports = {
  createUser: createUser,
  createUserInGroupWithBindId: createUserInGroupWithBindId,
  updateUserAndGroup: updateUserAndGroup,
};