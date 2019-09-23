/* eslint no-console: ["error", { allow: ["error"] }] */
import Cookies from 'cookies';
import Customer from './models/Customer';
import connectToDatabase from '../utils/db';
import { availableFilters, nullFilter, DEFAULT_NUM_REPLAYS_TO_SHOW } from '../utils/filter';
import { validateToken } from '../utils/auth';
import { uploadSessionChunkToS3, getSessionUrlFromS3 } from '../utils/s3';

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
  // Count the number of page loads.
  // The criteria of a page loads is as follows:
  // type: Meta (2): https://github.com/rrweb-io/rrweb/blob/master/typings/types.d.ts#L7
  let numPageLoads = 0;
  for (let i = 0; i < events.length; i += 1) {
    const { type } = events[i];
    if (type === 2) numPageLoads += 1;
  }
  return numPageLoads;
}

function filtersToMongoFilters(filters) {
  if (!filters || Object.keys(filters).length === 0)
    return nullFilter;
  let mongoDbFilters = [];
  Object.keys(filters).forEach((key) => {
    const value = filters[key];
    if (availableFilters[key] != null)
      mongoDbFilters.push(availableFilters[key]['mongodb'](value));
  })
  if (mongoDbFilters.length === 0)
    return nullFilter;
  return mongoDbFilters;
}

function generateResponse(urls, longestDuration) {
  return {
    urls,
    longestDuration
  };
}

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      /**
       * Handle new chunk
       */
      const parsed = JSON.parse(req.body);
      parsed.pageLoads = countPageLoads(parsed.events);
      parsed.numClicks = countNumClicks(parsed.events);
      let promises = [];
      promises.push(uploadSessionChunkToS3(
        JSON.stringify(parsed),
        parsed.shop,
        parsed.id,
        parsed.timestamp,
        parsed.events.length
      ));
      /**
       * Invalidate customer session data in MongoDB and update session duration
       */
      await connectToDatabase(process.env.MONGODB_URI);
      promises.push(Customer.updateOne({ sessionId: parsed.id }, {
        $set: {
          stale: true,
          sessionDuration: parsed.sessionDuration
        }
      }));
      await Promise.all(promises);
      res.status(204).send();
    } else if (req.method === 'GET') {
      if (req.query.shop) {
        const cookies = new Cookies(req, res);
        const token = cookies.get('token'); // JSON web token set in /api/callback
        const valid = await validateToken(token, req.query.shop);
        if (valid) {
          await connectToDatabase(process.env.MONGODB_URI);
          const longestDuration = await Customer.getLongestDurationByShop(req.query.shop)
          let filters;
          try {
            filters = JSON.parse(req.query.filters);
          } catch (error) {
            // no filter defined
          }
          const query = {
            $and: [
              { shop: req.query.shop },
              {
                $and: filtersToMongoFilters(filters)
              }
            ]
          };
          const numReplaysToShow = filters.numReplaysToShow != null ? filters.numReplaysToShow : DEFAULT_NUM_REPLAYS_TO_SHOW;
          const customers = await Customer.find(query).sort({ timestamp: 'desc' }).limit(numReplaysToShow).lean();
          if (customers.length === 0) {
            res.status(204).send();
            return;
          }
          let promises = [];
          let urls = [];
          customers.forEach((customer) => {
            const pushUrls = async () => {
              const url = await getSessionUrlFromS3(
                req.query.shop,
                customer,
                filters,
              );
              if (url) urls.push(url);
            }
            promises.push(
              pushUrls()
            );
          });
          await Promise.all(promises);
          res.status(200).send(generateResponse(urls, longestDuration));
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
