const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secret = require('../config').secret;

const UserSchema = new mongoose.Schema({
  username: {type: String, lowercase: true, unique: true, required: [true, "required"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
  email: {type: String, lowercase: true, unique: true, required: [true, "required"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
  bio: String,
  image: String,
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article'}],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  hash: String,
  salt: String,
}, {timestamps: true});

UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});

UserSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validPassword = function(password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UserSchema.methods.generateJWT = function() {
  let today = new Date();
  let exp = new Date(today);
  exp.setDate(today.getDate() + 60);

  return jwt.sign({
    id: this._id,
    username: this.username,
    exp: parseInt(exp.getTime() / 1000),
  }, secret);
};

UserSchema.methods.toAuthJSON = function() {
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT()
  }
};

UserSchema.methods.toProfileJSONFor = function(user) {
  return {
    username: this.username,
    bio: this.bio,
    image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
    following: user ? user.isFollowing(this._id) : false
  };
};

UserSchema.methods.favourite = function(id) {
  if(this.favourites.indexOf(id) === -1) {
    this.favourites.push(id);
  }

  return this.save();
};

UserSchema.methods.unFavourite = function(id) {
  this.favourites.remove(id);
  return this.save();
};

UserSchema.methods.isFavourite = function(id) {
  return this.favourites.some(val => val.toString() === id.toString());
};

UserSchema.methods.follow = function(id) {
  if(this.following.indexOf(id) === -1) {
    this.following.push(id);
  }

  return this.save();
};

UserSchema.methods.unFollow = function(id) {
  this.following.remove(id);
  return this.save();
};

UserSchema.methods.isFollowing = function(id) {
  return this.following.some(val => val.toString() === id.toString());
};

mongoose.model('User', UserSchema);