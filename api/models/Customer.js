import { Schema } from 'mongoose';
import { avoidOverwriteModelError } from '../../utils/db';

const customerSchema = new Schema({
  browser: String,
  os: String,
  sessionId: String,
  remoteIp: String,
  location: String,
  shop: String,
});

export default avoidOverwriteModelError('Customer', customerSchema);
