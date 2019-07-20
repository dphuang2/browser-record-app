/* eslint no-console: ["error", { allow: ["error"] }] */
import mongoose from 'mongoose';
import Session from './models/Session';

// Create cached connection variable
let cachedDb = null;

// A function for connecting to MongoDB,
// taking a single paramater of the connection string
async function connectToDatabase(uri) {
  // If the database connection is cached,
  // use it instead of creating a new connection
  if (cachedDb) {
    return cachedDb;
  }

  // If no connection is cached, create a new one
  await mongoose.connect(uri, { useNewUrlParser: true });

  const db = mongoose.connection;

  db.on('error', console.error.bind(console, 'connection error:'));

  cachedDb = db;
  return db;
}

// The main, exported, function of the endpoint,
// dealing with the request and subsequent response
export default async (req, res) => {
  try {
    if (!req.body) {
      res.status(204).send('Empty');
      return;
    }

    // Connect database, cached or otherwise
    await connectToDatabase(process.env.MONGODB_URI);

    const session = new Session(req.body);
    await Session.updateOrCreate(session);
    res.status(200).json('OK'); // OK
  } catch (error) {
    console.error(error);
    res.status(500).json({ error }); // Error
  }
};
