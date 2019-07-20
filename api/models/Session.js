import { Schema, model } from 'mongoose';

const sessionSchema = new Schema({
  events: [{}],
  timestamp: Number,
  shop: String,
  id: String,
});

const Session = model('Session', sessionSchema);

export default Session;
