/* eslint no-console: ["error", { allow: ["error"] }] */
import Session from './models/Session';
import connectToDatabase from './utils/db';

// The main, exported, function of the endpoint,
// dealing with the request and subsequent response
export default async (req, res) => {
  try {
    await connectToDatabase(process.env.MONGODB_URI);

    const sessions = await Session.getSessionsByShop(req.query.shop);
    if (sessions.length === 0) {
      res.status(404).send();
      return;
    }
    res.status(200).json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error }); // Error
  }
};
