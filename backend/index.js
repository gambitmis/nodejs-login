const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('./database');
const { body, validationResult } = require('express-validator');

const app = express()
const port = 3000

app.use(express.urlencoded({ extended: false }))

app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');

app.use(cookieSession({
  name: 'session',
  keys: ['key1','key2'],
  maxAge: 3600 * 1000 //1hr  
}))

// 
const ifNotLoggedIn = (req, res, next) => {
  if(!req.session.isLoggedIn) {
    return res.render('login-register');
  }
  next();
}

app.get('/', ifNotLoggedIn,(req,res,next) => {
  dbConnection.execute("SELECT name FROM users WHERE id = ?", [req.session.userID])
  .then(([row]) => {
    res.render('home', {
      name: row[0].name
    })
  })
})

app.listen(port, () => {
  console.log(`listen on port ${port}`)
})