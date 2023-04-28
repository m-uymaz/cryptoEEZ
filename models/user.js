const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const User = new Schema ({
    email: {
        type: String,
        required: true,
        unique: true
    },
    selectedCoins: []
});

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);