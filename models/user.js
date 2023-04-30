import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

const User = new mongoose.Schema ({
    email: {
        type: String,
        required: true,
        unique: true
    },
    selectedCoins: []
});

User.plugin(passportLocalMongoose);

export default mongoose.model('User', User);