import mongoose, { Schema } from 'mongoose';
import { avoidOverwriteModelError } from '../../utils/db';

mongoose.set('useCreateIndex', true);

const sessionSchema = new Schema({
  events: [{}],
  timestamp: Number,
  shop: String,
  id: String,
});

sessionSchema.statics.findOldest = async function findOldest(id) {
  return this.find({ id });
};

const aggregateSessionsById = [
  { // Sort all the documents by timestamp in ascending order
    $sort: {
      timestamp: 1,
    },
  },
  { // Accumulate events and save important metadata
    $group: {
      _id: '$id',
      events: {
        $push: '$events',
      },
      shop: {
        $first: '$shop',
      },
      timestamp: {
        $first: '$timestamp',
      },
    },
  },
  { // Combine the arrays and change _id to id
    $project: {
      _id: 0,
      id: '$_id',
      timestamp: 1,
      shop: 1,
      events: {
        $reduce: {
          input: '$events',
          initialValue: [],
          in: { $concatArrays: ['$$value', '$$this'] },
        },
      },
    },
  },
];

sessionSchema.statics.getSessionsByShop = async function getSessionsByShop(shop) {
  return this.aggregate([
    { // Query for all sessions of a shop
      $match: {
        shop,
      },
    },
  ].concat(aggregateSessionsById));
};

sessionSchema.statics.getSessionById = async function getSessionById(id) {
  return this.aggregate([
    { // Query for session id
      $match: {
        id,
      },
    },
  ].concat(aggregateSessionsById));
};

sessionSchema.index({ timestamp: 1 });

export default avoidOverwriteModelError('Session', sessionSchema);
