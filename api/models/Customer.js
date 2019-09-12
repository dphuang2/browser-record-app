import { Schema } from 'mongoose';
import { avoidOverwriteModelError } from '../../utils/db';

const customerSchema = new Schema({
  browser: String,
  os: String,
  sessionId: String,
  region: String,
  country: String,
  shop: String,
  locationAvailable: Boolean,
  device: String,
  sessionDuration: Number,
  // Calculated at time of retrieval from S3
  pageLoads: Number,
  numClicks: Number,
  timestamp: Number,
  stale: Boolean,
});

customerSchema.statics.getLongestDurationByShop = async function (shop) {
  const docs = await this.find({ shop }).sort({ sessionDuration: -1 }).limit(1);
  if (docs.length < 1) return;
  const longestDurationCustomer = docs[0];
  return longestDurationCustomer.sessionDuration;
}

export default avoidOverwriteModelError('Customer', customerSchema);
