const router = require('express').Router();
const mongoose = require('mongoose');
const Article = mongoose.model('Article');

router.get('/', function(req, res, next) {
  Article.distinct('tagList').then((tags) => {
    return res.json({tags: tags});
  }).catch(next);
});

module.exports = router;