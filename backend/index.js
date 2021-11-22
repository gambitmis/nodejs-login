const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const dbConnection = require('./database');
const { body, validationResult, Result } = require('express-validator');

const app = express()
const port = 3001

app.use(morgan('combined'));
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

const ifLoggedIn = (req, res, next) => {
  if(req.session.isLoggedIn) {
    return res.redirect('/home');
  }
  next();
}

app.get('/', ifNotLoggedIn,(req,res,next) => {
  console.log('get');
  dbConnection.execute("SELECT name FROM users WHERE id = ?", [req.session.userID])
  .then(([rows]) => {
      res.render('home', {
        name: rows[0].name
    })
  });
})

// Register Page
app.post('/reg', ifLoggedIn, [
  body('user_email', 'Invalid Email Address!').isEmail().custom((value) => {
    return dbConnection.execute('SELECT email FROM users WHERE email = ?',[value])
    .then(([rows]) => {
      if (rows.length > 0){ // Query found exiting Email
        return Promise.reject('This email already used');
      }
      return true;
    })
  }),
  body('user_name','Username is empty!').trim().not().isEmpty(),
  body('user_pass','The password must be of minimun length 6 character').trim().isLength({ min:6 })
], // end of post data validation
  (req,res,next) => {
    const validation_result = validationResult(req);
    const { user_name, user_pass, user_email } = req.body;

    if (validation_result.isEmpty()){
      bcrypt.hash(user_pass,12).then((hash_pass) => {
        dbConnection.execute("INSERT INTO users (name, email, password) VALUES(?,?,?)",[user_name,user_email,hash_pass])
        .then(result => {
          res.send(`Your Account has been Create Successfully <a href="/logout" class="btn btn-primary">login</a>`);
        }).catch(err => {
          if (err) throw err;
        })
      }).catch(err => {
        if (err) throw err;
      })
    } else {
      let allErrors = validation_result.errors.map((error) => {
        return error.msg;
      })
      res.render('login-register', {
        register_error: allErrors,
        old_data: req.body
      })
    }
  })

app.post('/', ifLoggedIn, [
    body('user_email').custom((value) => {
        return dbConnection.execute("SELECT email FROM users WHERE email = ?", [value])
        .then(([rows]) => {
          if (rows.length == 1) {
            console.log("found")
            return true;
          }
          return Promise.reject('Invalid Email Address')
        });
    }),
    body('user_pass','Password is empty').trim().not().isEmpty(),
], (req,res) => {
  const validation_result = validationResult(req);
  const { user_pass, user_email } = req.body;
  if (validation_result.isEmpty()){
    dbConnection.execute("SELECT * FROM users WHERE email = ?", [user_email])
    .then(([rows]) => {
      bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
        if (compare_result === true){
          req.session.isLoggedIn = true;
          req.session.userID = rows[0].id;
          res.redirect('/');
        }else{
          res.render('login-register', {
            login_errors: ['Invalid Password']
          })
        }
      }).catch(err => {
        if (err) throw err;
      })
    }).catch(err => {
      if (err) throw err;
    })
  } else {
    let allErrors = validation_result.errors.map((error) => {
      return error.msg;
    })
    res.render('login-register',{
      login_errors: allErrors
    })
  }
}) 

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
})

app.use('/', (req,res) => {
  res.status(404).send('<h1>404 Page not Found</h1>')
})
app.listen(port, () => {
  console.log(`listen on port ${port}`)
})