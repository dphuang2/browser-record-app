/* eslint no-console: ["error", { allow: ["error"] }] */
import Session from './models/Session';
import connectToDatabase from './utils/db';

// The main, exported, function of the endpoint,
// dealing with the request and subsequent response
export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      if (!req.body) {
        res.status(204).send();
        return;
      }

      // Connect database, cached or otherwise
      await connectToDatabase(process.env.MONGODB_URI);

      await new Session(req.body).save();
      res.status(201).send();
    } else if (
      req.method === 'GET' && (typeof req.query.id) !== 'undefined'
    ) {
      await connectToDatabase(process.env.MONGODB_URI);

      const session = await Session.getSessionById(req.query.id);
      if (session.length === 0) {
        res.status(404).send();
        return;
      }
      res.status(200).json(session);
    } else {
      res.status(418).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error }); // Error
  }
};
