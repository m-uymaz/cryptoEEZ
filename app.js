if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const axios = require('axios');
const mongoose = require('mongoose');
const Crypto = require('./models/crypto');
const ejsmate = require('ejs-mate');

const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');

const path = require('path');
const methodOverride = require('method-override');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const { isLoggedIn, isCryptoCreator } = require('./middleware');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/crypteasy';
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

//---- SEED ---- FOR DEV ---- DELETE LATER! 
let selectedCoins = ['btc', 'eth', 'luna', 'eos', 'sol', 'trx', 'shib', 'bch', 'uni', 'ltc', 'doge',
    'xrp', 'ada', 'bnb', 'dot', 'link', 'vet', 'enj'];

app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/user');
// use static authenticate method of model in LocalStrategy
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
})

app.get('/', isLoggedIn, async (req, res) => {
    const cryptos = await Crypto.find({ user: req.user._id });
    cryptos.reverse();
    let coins = [{}];
    await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1&sparkline=false')
    .then(res => {
        coins = res.data;
    })
    .catch(err => {
        console.log("Error: ", err);
    });
    let displayCoins = [];
    for (coin of coins) {
        for (selected of selectedCoins) {
        if (selected === coin.symbol) {
            displayCoins.push(coin);
            }
        }
    }
    res.render('home', { displayCoins, cryptos });
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

app.listen(3000, () => {
    console.log('Listening on port 3000');
});