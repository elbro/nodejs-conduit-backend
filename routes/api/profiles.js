const router = require('express').Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const auth = require('../auth');

// Preload user profile on routes with ':username'
router.param('username', function(req, res, next, user) {
  User.findOne({username: user}).then( (user) => {
    if (!user) { return res.sendStatus(404); }

    req.profile = user;

    return next();
  })
  .catch(next);
});

router.get('/:username', auth.optional, function(req, res, next) {
  if (req.payload) {
    User.findById(req.payload.id).then(function(user) {
      if (!user) {
        return res.json({profile: req.profile.toProfileJSONFor(false)});
      }

      return res.json({profile: req.profile.toProfileJSONFor(user)})
    })
    .catch(next);
  } else {
    return res.json({profile: req.profile.toProfileJSONFor(false)});
  }
});

router.post('/:username/follow', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    user.follow(req.profile.id).then(() => {
      return res.json({profile: req.profile.toProfileJSONFor(user)});
    });


  }).catch(next);
});

router.delete('/:username/follow', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    user.unFollow(req.profile.id).then(() => {
      return res.json({profile: req.profile.toProfileJSONFor(user)});
    });


  }).catch(next);
});

module.exports = router;