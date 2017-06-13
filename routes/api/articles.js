const router = require('express').Router();
const mongoose = require('mongoose');
const passport = require('passport');
const User = mongoose.model('User');
const Article = mongoose.model('Article');
const Comment = mongoose.model('Comment');
const auth = require('../auth');

// Preload article objects on routes with ':article'
router.param('article', function(req, res, next, slug) {
  Article.findOne({slug: slug})
    .populate('author')
    .then((article) => {
      if (!article) return res.sendStatus(404);

      req.article = article;

      return next();
    }).catch(next);
});

router.param('comment', function(req, res, next, id) {
  Comment.findById(id).then((comment) => {
      if (!comment) return res.sendStatus(404);

      req.comment = comment;

      return next();
  }).catch(next);
});

router.get('/', auth.optional, (req, res, next) => {
  var query = {};
  var limit = 20;
  var offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  if( typeof req.query.tag !== 'undefined' ){
    query.tagList = {"$in" : [req.query.tag]};
  }

  Promise.all([
    req.query.author ? User.findOne({username: req.query.author}) : null,
    req.query.favourited ? User.findOne({username: req.query.favourited}) : null,
  ]).then( ([author, favouritedBy]) => {

    if (author) {
      query.author = author._id;
    }

     if(favouritedBy){
      query._id = {$in: favouritedBy.favourites};
    } else if(req.query.favourited){
      query._id = {$in: []};
    }

    const findArticles = Article.find(query)
                          .limit(Number(limit))
                          .skip(Number(offset))
                          .sort({createdAt: 'desc'})
                          .populate('author');

    Promise.all([
      findArticles.exec(),
      req.payload ? User.findById(req.payload.id) : null
    ]).then(([articles, user]) => {

      return res.json({
        articles: articles.map(x => x.toJSONForUser(user)),
        articlesCount: articles.length
      })
    }).catch(next);
  });

});

router.get('/feed', auth.required, (req, res, next) => {
  var limit = 20;
  var offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }    

    const promise = Article.find({author: {$in: user.following}})
                  .limit(Number(limit))
                  .skip(Number(offset))
                  .sort({createdAt: 'desc'})
                  .populate('author')
                  .exec();

    return promise.then((articles) => {
      return res.json({
        articles: articles.map(x => x.toJSONForUser(user)),
        articlesCount: articles.length
      })
    }).catch(next);;

  });

});

router.get('/:article', auth.optional, (req, res, next) => {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null
  ]).then( ([user]) => {

    return res.json({article: req.article.toJSONForUser(user)});
  }).catch(next);
});

// Create new article
router.post('/', auth.required, (req, res, next) => {

  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }    

    let reqArticle = req.body.article;
    if (!reqArticle.title || !reqArticle.description || !reqArticle.body) {
      return res.status(422).json({errors: {general: "missing required fields" }})
    }

    const article = new Article();

    article.title = reqArticle.title;
    article.description = reqArticle.description;
    article.body = reqArticle.body;
    article.tagList = reqArticle.tagList;
    article.author = user;
    
    article.save().then(() => {  
      return res.json({ article: article.toJSONForUser(user) });
    }).catch(next);

  }).catch(next);
});

// Update article
router.put('/:article', auth.required, (req, res, next) => {
  User.findById(req.payload.id).then((user) => {

    if (req.article.author.id !== user.id) { return res.sendStatus(403)}

    if(typeof req.body.article.title !== 'undefined'){
      req.article.title = req.body.article.title;
    }
    
    if(typeof req.body.article.description !== 'undefined'){
      req.article.title = req.body.article.description;
    }

    if(typeof req.body.article.body !== 'undefined'){
      req.article.body = req.body.article.body;
    }
    
    if(typeof req.body.article.tagList !== 'undefined'){
      req.article.tagList = req.body.article.tagList;
    }

    req.article.save().then((article) => {
      return res.json({article: req.article.toJSONForUser(user)});
    }).catch(next);
  });
});

router.delete('/:article', auth.required, (req, res, next) => {
  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }  

    if (req.article.author.id !== user.id) { return res.sendStatus(403)}

    return req.article.remove().then(() => {
      return res.sendStatus(204);
    });
  }).catch(next);
});

// Add comment to article
router.post('/:article/comments', auth.required, (req, res, next) => {
  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }  

    const comment = new Comment(req.body.comment);

    comment.author = user;
    comment.article = req.article;

    return comment.save().then(() => {
      req.article.comments.push(comment);

      return req.article.save().then((article) => {
        res.json({comment: comment.toJSONFor(user)});        
      });
    });
  }).catch(next);
});

router.get('/:article/comments', auth.optional, (req, res, next) => {
  
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then((user) => {
    return req.article.populate({
      path: 'comments',
      populate: {
        path: 'author'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    }).execPopulate().then((article) => {
      return res.json({comments: req.article.comments.map(x => x.toJSONFor(user))});        
    });
  }).catch(next);;
});

router.delete('/:article/comments/:comment', auth.required, (req, res, next) => {
  if (req.payload.id !== req.comment.author.toString()) { return res.sendStatus(403); }  

  req.article.comments.remove(req.comment._id);

  req.article.save()
    .then(Comment.find({_id: req.comment._id}).remove().exec())
    .then(() => res.sendStatus(204))
});

router.post('/:article/favourite', auth.required, (req, res, next) => {

  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }    

    return user.favourite(req.article.id).then(() => {
      return req.article.updateFavouriteCount().then((article) => {
        return res.json({ article: article.toJSONForUser(user)});
      });
    });
  }).catch(next);
});

router.delete('/:article/favourite', auth.required, (req, res, next) => {

  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }    

    return user.unFavourite(req.article.id).then(() => {
      return req.article.updateFavouriteCount().then((article) => {
        return res.json({ article: article.toJSONForUser(user)});
      });
    });
  }).catch(next);
});

module.exports = router;