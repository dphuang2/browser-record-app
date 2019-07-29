import mongoose, { Schema } from 'mongoose';
import { avoidOverwriteModelError } from '../../utils/db';

mongoose.set('useCreateIndex', true);

const sessionSchema = new Schema({
  events: [{}],
  timestamp: Number,
  shop: String,
  id: String,
  numClicks: Number,
});

const aggregateSessionsById = [
  { // Make sure events are the proper order for concatenation
    $sort: {
      timestamp: 1,
    },
  }, { // Group by session id and accumulate fields
    $group: {
      _id: '$id',
      events: {
        $push: '$events',
      },
      numClicks: {
        $sum: '$numClicks',
      },
      timestamp: {
        $first: '$timestamp',
      },
    },
  }, { // Combine pushed event arrays
    $project: {
      _id: 0,
      id: '$_id',
      timestamp: 1,
      numClicks: 1,
      events: {
        $reduce: {
          input: '$events',
          initialValue: [],
          in: {
            $concatArrays: [
              '$$value', '$$this',
            ],
          },
        },
      },
    },
  }, { // Calculate session duration
    $project: {
      id: 1,
      timestamp: 1,
      events: 1,
      numClicks: 1,
      duration: {
        $divide: [
          {
            $subtract: [
              { $arrayElemAt: ['$events.timestamp', -1] },
              { $arrayElemAt: ['$events.timestamp', 0] },
            ],
          }, 1000,
        ],
      },
    },
  }, { // Combine with customers collection
    $lookup: {
      from: 'customers',
      localField: 'id',
      foreignField: 'sessionId',
      as: 'customer',
    },
  }, { // Merge lookup document
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          {
            $arrayElemAt: [
              '$customer', 0,
            ],
          }, '$$ROOT',
        ],
      },
    },
  }, { // Clean up final object
    $project: {
      remoteIp: 0, // redact IP of customer
      customer: 0,
      shop: 0, // redundant information
    },
  },
];

sessionSchema.statics.getSessionsByShop = async function gsbs(shop) {
  return this.aggregate([
    { // Query for all sessions of a shop
      $match: {
        shop,
      },
    },
  ].concat(aggregateSessionsById));
};

sessionSchema.statics.getSessionById = async function gsbi(id) {
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
