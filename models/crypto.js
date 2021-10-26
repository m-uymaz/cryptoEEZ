const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = require('./user');

const CryptoSchema = new Schema({
    symbol: {
        type: String,
        required: true
    },
    boughtAt: {
        type: Number
    },
    amount: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: User
    }
});

module.exports = mongoose.model('Crypto', CryptoSchema);