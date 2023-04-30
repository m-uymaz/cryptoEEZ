import mongoose from 'mongoose';
import User from './user.js';

const Schema = mongoose.Schema;

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

export default mongoose.model('Crypto', CryptoSchema);