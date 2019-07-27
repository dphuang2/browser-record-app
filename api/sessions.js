/* eslint no-console: ["error", { allow: ["error"] }] */
import Session from './models/Session';
import connectToDatabase from '../utils/db';

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      if (!req.body) {
        res.status(204).send();
        return;
      }

      await connectToDatabase(process.env.MONGODB_URI);

      await new Session(req.body).save();
      res.status(204).send();
    } else if (req.method === 'GET') {
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
    res.status(500).send();
  }
};
