if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const ejsmate = require('ejs-mate');

const mongoose = require('mongoose');
const Crypto = require('./models/crypto');

const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');

const path = require('path');
const methodOverride = require('method-override');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const { isLoggedIn, isCryptoCreator } = require('./middleware');

const dbUrl = process.env.DB_URL;
mongoose.connect(dbUrl, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => {
    console.log('Database connected')
}).catch((err) => {
    console.log('DB Connection Error:', err.message)
});

app.use(express.static(path.join(__dirname, 'public')));

app.engine('ejs', ejsmate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize());

const MongoStore = require('connect-mongo');
const secret = process.env.SESSION_SECRET;
app.use(session({
    name: 'fb_',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        maxAge: Date.now() + 3600000 * 24 * 7
    },
    store: MongoStore.create({
        mongoUrl: dbUrl,
        secret: secret,
        touchAfter: 24 * 3600
    })
}));

app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/user');

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
})

app.get('/', isLoggedIn, async (req, res) => {
  const cryptos = await Crypto.find({ user: req.user._id });
  const selectedCoins = await User.findOne({ username: req.user.username })
    .then(data => data.selectedCoins);

  const forApi = '"' + selectedCoins.join('","') + '"';
  console.log("coatation", forApi)
  cryptos.reverse();
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=[${forApi}]`)
      .then(res => res.json());

    res.render('./layouts/boilerplate', { response, cryptos });
  } catch (err) {
    console.log(err);
  }
});

app.post('/', async (req, res) => {
    const newOrder = new Crypto(req.body.order);
    newOrder.user = req.user._id;
    await newOrder.save();
    res.redirect('/');
});

app.delete('/:id', isLoggedIn, isCryptoCreator, async (req, res) => {
    const { id } = req.params;
    await Crypto.findByIdAndDelete(id);
    res.redirect('/');
});

app.get('/register', (req, res) => {
    res.render('./users/register');
});

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            res.redirect('/'); 
        })
    } catch (e) {
        res.redirect('/register');
    }
});

app.get('/login', (req, res) => {
    res.render('./users/login');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    console.log('logged in')
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
})

app.get('/logout', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    req.logout();
    res.redirect('/');
})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log('Listening on port ', port);
});