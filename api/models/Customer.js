import { Schema } from 'mongoose';
import { avoidOverwriteModelError } from '../../utils/db';

const customerSchema = new Schema({
  browser: String,
  os: String,
  sessionId: String,
  remoteIp: String,
  region: String,
  country: String,
  shop: String,
  locationAvailable: Boolean,
});

export default avoidOverwriteModelError('Customer', customerSchema);
