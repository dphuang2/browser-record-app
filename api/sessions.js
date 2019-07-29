/* eslint no-console: ["error", { allow: ["error"] }] */
import Session from './models/Session';
import connectToDatabase from '../utils/db';

function countNumClicks(events) {
  // Count the number of clicks. Look for
  // The criteria of a click is as follows:
  // type: IncrementalSnapshot (3): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L6
  // and
  // source: MouseInteraction (2): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L42
  // and
  // (dataType: TouchStart (7): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts
  // or
  // dataType: Click (2): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L142)
  let numClicks = 0;
  for (let i = 0; i < events.length; i += 1) {
    const { type, data } = events[i];
    const { source } = data;
    const dataType = data.type;
    if (type === 3 && source === 2 && (dataType === 2 || dataType === 7)) numClicks += 1;
  }
  return numClicks;
}

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      if (!req.body) {
        res.status(204).send();
        return;
      }

      await connectToDatabase(process.env.MONGODB_URI);

      const { events } = req.body;
      const numClicks = countNumClicks(events);
      req.body.numClicks = numClicks;

      await new Session(req.body).save();
      res.status(204).send();
    } else if (req.method === 'GET') {
      await connectToDatabase(process.env.MONGODB_URI);

      if (req.query.id) {
        const session = await Session.getSessionById(req.query.id);

        if (session.length === 0) {
          res.status(404).send();
          return;
        }

        res.status(200).json(session);
      } else if (req.query.shop) {
        const sessions = await Session.getSessionsByShop(req.query.shop);

        res.status(200).json(sessions);
      }
    } else {
      res.status(418).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send();
  }
};
