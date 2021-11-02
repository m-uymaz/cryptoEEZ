const Crypto = require('./models/crypto');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    next()
}

module.exports.isCryptoCreator = async (req, res, next) => {
    const { id } = req.params;
    const cryptoTrans = await Crypto.findById(id);
    if (!cryptoTrans.user.equals(req.user._id)) {
        console.log('ERROR');
        return res.redirect('/');
    }
    next();
}