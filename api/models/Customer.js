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
  lastTotalCartPrice: Number,
  lastItemCount: Number,
  maxTotalCartPrice: Number,
  maxItemCount: Number,
});

customerSchema.statics.getLongestDurationByShop = async function (shop) {
  const docs = await this.find({ shop }).sort({ sessionDuration: -1 }).limit(1);
  if (docs.length < 1) return;
  const longestDurationCustomer = docs[0];
  return longestDurationCustomer.sessionDuration;
}

customerSchema.statics.getMaxTotalCartPriceByShop = async function (shop) {
  const docs = await this.find({ shop }).sort({ lastTotalCartPrice: -1 }).limit(1);
  if (docs.length < 1) return;
  const theCustomer = docs[0];
  return theCustomer.lastTotalCartPrice;
}

customerSchema.statics.getMaxItemCountByShop = async function (shop) {
  const docs = await this.find({ shop }).sort({ lastItemCount: -1 }).limit(1);
  if (docs.length < 1) return;
  const theCustomer = docs[0];
  return theCustomer.lastItemCount;
}

export default avoidOverwriteModelError('Customer', customerSchema);
