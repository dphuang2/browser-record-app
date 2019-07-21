import mongoose, { Schema, model } from 'mongoose';

mongoose.set('useCreateIndex', true);


const sessionSchema = new Schema({
  events: [{}],
  timestamp: Number,
  shop: String,
  id: String,
});


sessionSchema.statics.aggregateSessions = async function aggregateSessions() {
  await this.aggregate([
    { // Sort all the documents by timestamp in ascending order
      $sort: {
        timestamp: 1,
      },
    },
    { // Accumulate events and save first timestamp
      $group: {
        _id: '$id',
        events: {
          $push: '$events',
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
        events: {
          $reduce: {
            input: '$events',
            initialValue: [],
            in: { $concatArrays: ['$$value', '$$this'] },
          },
        },
      },
    },
    { // Replace existing collection
      $out: 'sessions',
    },
  ]);
};

sessionSchema.index({ timestamp: 1 });

const Session = model('Session', sessionSchema);

export default Session;
