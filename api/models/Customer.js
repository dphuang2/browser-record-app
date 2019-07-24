import { Schema, model } from 'mongoose';

const customerSchema = new Schema({
  browser: String,
  os: String,
  sessionId: String,
  remoteIp: String,
  location: String,
});

const Customer = model('Customer', customerSchema);

export default Customer;
