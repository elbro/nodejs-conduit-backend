const jwt = require('express-jwt');
const secret = require('../config').secret;

function getTokenFromHeader(req) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[0];
  if ( token === 'Token' || token === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }

  return null;
}

const auth = {
  required: jwt({
    secret: secret,
    userProperty: 'payload',
    getToken: getTokenFromHeader
  }),

  optional: jwt({
    secret: secret,
    userProperty: 'payload',
    credentialsRequired: false,
    getToken: getTokenFromHeader
  })
};

module.exports = auth;


