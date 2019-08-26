/* eslint no-console: ["error", { allow: ["error"] }] */
import Cookies from 'cookies';
import AWS from 'aws-sdk';
import Session from './models/Session';
import connectToDatabase from '../utils/db';
import { validateToken } from '../utils/auth';

const config = new AWS.Config({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: 'us-west-2',
});
AWS.config = config;

function countNumClicks(events) {
  // Count the number of clicks.
  // The criteria of a click is as follows:
  // type: IncrementalSnapshot (3): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L6
  // and
  // source: MouseInteraction (2): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L42
  // and
  // (dataType: TouchStart (7): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L147
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

async function uploadToS3AndPushUrl(s3, session, urls) {
  const params = {
    Bucket: 'browser-record-payloads',
    Key: session.id + '-' + session.events.length,
  };
  // Check if object exists already. If it does just serve that object
  try {
    await s3.headObject(params).promise();
    const url = await s3.getSignedUrl('getObject', params)
    urls.push(url);
    return;
  } catch (error) {
    // The object did not exist so just continue
  }

  // Upload object to s3
  try {
    await s3.upload({
      ...params,
      Body: JSON.stringify(session),
      ContentType: "application/json"},
    ).promise();
    const url = await s3.getSignedUrl('getObject', params)
    urls.push(url);
  } catch (error) {
    console.error(error);
  }
}

function countPageLoads(events) {
  // Count the number of clicks.
  // The criteria of a click is as follows:
  // type: Meta (2): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L7
  let numPageLoads = 0;
  for (let i = 0; i < events.length; i += 1) {
    const { type } = events[i];
    if (type === 2) numPageLoads += 1;
  }
  return numPageLoads;
}

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      await connectToDatabase(process.env.MONGODB_URI);
      const parsed = JSON.parse(req.body);

      const { events } = parsed;
      parsed.numClicks = countNumClicks(events);
      parsed.pageLoads = countPageLoads(events);

      await new Session(parsed).save();
      res.status(204).send();
    } else if (req.method === 'GET') {
      if (req.query.id) {
        await connectToDatabase(process.env.MONGODB_URI);
        const session = await Session.getSessionById(req.query.id);

        if (session.length === 0) {
          res.status(404).send();
          return;
        }

        res.status(200).json(session);
      } else if (req.query.shop) {
        const cookies = new Cookies(req, res);
        const token = cookies.get('token'); // JSON web token set in /api/callback
        const valid = validateToken(req.query.shop, token);
        if (valid) {
          await connectToDatabase(process.env.MONGODB_URI);
          let filters;
          try {
            filters = JSON.parse(req.query.filters);
          } catch(error) {
            // Could not parse filters, oh well
          }
          const sessions = await Session.getSessionsByShop(req.query.shop, filters);
          if (sessions.length === 0) {
            res.status(404).send();
            return;
          }

          const s3 = new AWS.S3({apiVersion: '2006-03-01'});
          let urls = [];
          let promises = [];
          for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            promises.push(uploadToS3AndPushUrl(s3, session, urls));
          }
          await Promise.all(promises);
          res.status(200).send(JSON.stringify(urls));
        } else {
          res.status(401).send();
        }
      }
    } else {
      res.status(418).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send();
  }
};
