const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const slug = require('slug');
const User = mongoose.model('User');

const ArticleSchema = new mongoose.Schema({
  slug: {type: String, lowercase: true, unique: true},
  title: String,
  description: String,
  body: String,
  tagList: [{ type: String }],
  favouritesCount: {type: Number, default: 0},
  author: {type: mongoose.SchemaTypes.ObjectId, ref: 'User'},
  comments: [{type: mongoose.SchemaTypes.ObjectId, ref: 'Comment'}]
}, {timestamps: true});

ArticleSchema.plugin(uniqueValidator, {message: 'is already taken.'});

ArticleSchema.pre('validate', function(next) {
  this.slugify();
  next();
});

ArticleSchema.methods.slugify = function() {
  this.slug = slug(this.title);
};

ArticleSchema.methods.toJSONForUser = function(user) {
  return {
    slug: this.slug,
    title: this.title,
    description: this.description,
    body: this.body,
    tagList: this.tagList,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    favourited: user ? user.isFavourite(this._id) : false,
    favouritesCount: this.favouritesCount,
    author: this.author.toProfileJSONFor(user)
  }
};

ArticleSchema.methods.updateFavouriteCount = function() {

  return User.count({favourites: {$in: [this._id]}}).then( (count) => {
    this.favouritesCount = count;
    return this.save();
  });
};

mongoose.model('Article', ArticleSchema);