/* eslint no-console: ["error", { allow: ["error"] }] */
import Session from './models/Session';
import connectToDatabase from './utils/db';

// The main, exported, function of the endpoint,
// dealing with the request and subsequent response
export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      if (!req.body) {
        res.status(204).send('Empty');
        return;
      }

      // Connect database, cached or otherwise
      await connectToDatabase(process.env.MONGODB_URI);

      await new Session(req.body).save();
    } else if (req.method === 'GET') {
      await connectToDatabase(process.env.MONGODB_URI);

      await Session.aggregateSessions();
    }
    res.status(200).send('OK'); // OK
  } catch (error) {
    console.error(error);
    res.status(500).send({ error }); // Error
  }
};
