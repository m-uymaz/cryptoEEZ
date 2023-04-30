import fetch from 'node-fetch';
import express from "express";
import ejsmate from 'ejs-mate';
import dotenv from 'dotenv';

import mongoose from 'mongoose';

import Crypto from './models/crypto.js';
import User from './models/user.js';

import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';

import path from 'path';
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
import methodOverride from 'method-override';

import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

import { isLoggedIn, isCryptoCreator } from './middleware.js';

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}
dotenv.config();

const app = express();

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

import MongoStore from 'connect-mongo';
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

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
})

app.get('/', isLoggedIn, async (req, res) => {
  try {
    const cryptos = await Crypto.find({ user: req.user._id });
    const selectedCoins = await User.findOne({ username: req.user.username })
      .then(data => data.selectedCoins);

    const forApi = '"' + selectedCoins.join('","') + '"';
    console.log("coatation", forApi)
    cryptos.reverse();
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
  console.log('logged in');
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
    console.log('Listening on port:', port);
});