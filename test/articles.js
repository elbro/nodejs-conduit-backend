//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const server = require('../app');
const Article = mongoose.model('Article');
const User = mongoose.model('User');

const chai = require('chai')
const should = chai.should();

chai.use(require('chai-http'));

describe('Articles', () => {
let testUser;

  before('Setup user', (done) => {
    testUser = new User();
    testUser.name = "John Doe";
    testUser.email = "john@gmail.com"; 
    testUser.username = "jd";

    testUser.save(done);
  });

  after((done) => {
    User.remove({}, done);
  });

  beforeEach((done) => {
    Article.remove({}, done);
  });

  describe('/GET articles', () => {

    it('should get all articles', () => {
      return chai.request(server)
        .get('/api/articles/')
        .then((res) => {
          res.should.have.status(200);
          res.body.should.have.property('articlesCount');
          res.body.articlesCount.should.be.eql(0);
          res.body.articles.should.be.a('array');
          res.body.articles.length.should.be.eql(0);
        });
    });
  });

  describe('/Post articles', () => {

    it('should create an article', () => {
      const article = {
        title: "test article",
        description: "test article description",
        body: "lorem ipsum blah blah",
        tagList: ["test", "blah blah"],
      }

      return chai.request(server)
        .post('/api/articles/')
        .set('authorization', `Token ${testUser.generateJWT()}` )
        .send({article: article})        
        .then((res) => {
          res.should.have.status(200);
          res.body.should.have.property('article');
          res.body.article.should.have.property('slug');
          res.body.article.should.have.property('tagList');
          res.body.article.author.username.should.eql(testUser.username);
        });
    });

  });
});
