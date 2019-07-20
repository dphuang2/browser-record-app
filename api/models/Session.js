import { Schema, model } from 'mongoose';

const sessionSchema = new Schema({
  events: [{}],
  timestamp: Number,
  shop: String,
  id: String,
});

async function updateOrCreate(session) {
  const sessionExists = await this.exists({ id: session.id });
  if (sessionExists) {
    await this.updateOne(
      { id: session.id },
      { $push: { events: session.events } },
    );
  } else {
    await session.save();
  }
}
sessionSchema.statics.updateOrCreate = updateOrCreate;

const Session = model('Session', sessionSchema);

export default Session;
