/* eslint no-console: ["error", { allow: ["error"] }] */
import Cookies from 'cookies';
import Customer from './models/Customer';
import connectToDatabase from '../utils/db';
import { validateToken } from '../utils/auth';
import { uploadSessionChunkToS3,  getSessionUrlFromS3 } from '../utils/s3';

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
      const parsed = JSON.parse(req.body);
      parsed.pageLoads = countPageLoads(parsed.events);
      parsed.numClicks = countNumClicks(parsed.events);
      await uploadSessionChunkToS3(
        JSON.stringify(parsed),
        parsed.shop,
        parsed.id,
      );
      res.status(204).send();
    } else if (req.method === 'GET') {
      if (req.query.shop) {
        const cookies = new Cookies(req, res);
        const token = cookies.get('token'); // JSON web token set in /api/callback
        const valid = validateToken(req.query.shop, token);
        if (valid) {
          await connectToDatabase(process.env.MONGODB_URI);
          //let filters;
          //try {
            //filters = JSON.parse(req.query.filters);
          //} catch(error) {
            //// Could not parse filters, oh well
          //}
          const customers = await Customer.find({ shop: req.query.shop }).lean();
          if (customers.length === 0) {
            res.status(404).send();
            return;
          }
          let urls = [];
          let promises = [];
          let filters;
          try {
            filters = JSON.parse(req.query.filters);
          } catch(error) {
            // no filter defined
          }
          customers.forEach((customer) => {
            const pushUrls = async () => {
              const url = await getSessionUrlFromS3(
                req.query.shop,
                customer,
                filters
              );
              if (url) urls.push(url);
            }
            promises.push(
              pushUrls()
            );
          });
          await Promise.all(promises);
          res.status(200).send(urls);
        } else {
          res.status(401).send();
        }
      }
    } else {
      res.status(418).send();
    }
  } catch (error) {
    console.error(error, error.stack);
    res.status(500).send();
  }
};
