/* eslint no-console: ["error", { allow: ["error"] }] */
import Cookies from 'cookies';
import Customer from './models/Customer';
import connectToDatabase from '../utils/db';
import { availableFilters, nullFilter, DEFAULT_NUM_CUSTOMERS_TO_SHOW } from '../utils/filter';
import { isTokenValid } from '../utils/auth';
import { uploadSessionChunkToS3, getSessionUrlFromS3 } from '../utils/s3';
import {
  HTTP_IM_A_TEAPOT,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
  HTTP_NO_CONTENT,
  NUM_CUSTOMERS_TO_SHOW_FILTER_KEY,
} from '../utils/constants';

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

function generateResponse(customers, longestDuration, maxTotalCartPrice, maxItemCount) {
  return {
    customers,
    longestDuration,
    maxTotalCartPrice,
    maxItemCount
  };
}

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      /**
       * Handle new chunk
       */
      const parsed = JSON.parse(req.body);
      let promises = [];
      promises.push(uploadSessionChunkToS3(
        JSON.stringify(parsed),
        parsed.shop,
        parsed.id,
        parsed.timestamp,
        parsed.events.length
      ));
      /**
       * Update customer data
       */
      await connectToDatabase(process.env.MONGODB_URL);
      promises.push(Customer.updateOne({ id: parsed.id }, {
        $set: {
          ...parsed,
        }
      }));
      await Promise.all(promises);
      res.status(HTTP_NO_CONTENT).send();
    } else if (req.method === 'GET') {
      const shop = req.query.shop;
      const cookies = new Cookies(req, res);
      const token = cookies.get('token'); // JSON web token set in /api/callback
      const { tokenVerified } = await isTokenValid(token, shop);
      if (tokenVerified) {
        await connectToDatabase(process.env.MONGODB_URL);
        const customer = req.query.customer;
        if (customer && shop) {
          const url = await getSessionUrlFromS3(shop, JSON.parse(customer));
          res.status(HTTP_OK).send(url);
          return;
        } else if (shop) {
          let longestDuration, maxTotalCartPrice, maxItemCount;
          const setLongestDuration = async () => longestDuration = await
            Customer.getLongestDurationByShop(shop);
          const setMaxTotalCartPrice = async () => maxTotalCartPrice = await
            Customer.getMaxTotalCartPriceByShop(shop);
          const setMaxItemCount = async () => maxItemCount = await
            Customer.getMaxItemCountByShop(shop);
          let promises = [];
          promises.push(setLongestDuration());
          promises.push(setMaxTotalCartPrice());
          promises.push(setMaxItemCount());
          let filters = {};
          try {
            filters = JSON.parse(req.query.filters);
          } catch (error) {
            // no filter defined
          }
          const query = {
            $and: [
              { shop },
              {
                $and: filtersToMongoFilters(filters)
              }
            ]
          };
          const numReplaysToShow = filters[NUM_CUSTOMERS_TO_SHOW_FILTER_KEY] != null ?
            filters[NUM_CUSTOMERS_TO_SHOW_FILTER_KEY] : DEFAULT_NUM_CUSTOMERS_TO_SHOW;
          const customers = await Customer.find(query).sort({
            startTime: 'desc'
          }).limit(numReplaysToShow).lean();
          await Promise.all(promises);
          if (customers.length === 0 || maxTotalCartPrice === undefined ||
            longestDuration === undefined) {
            res.status(HTTP_NO_CONTENT).send()
            return;
          }
          res.status(HTTP_OK).send(generateResponse(customers, longestDuration,
            maxTotalCartPrice, maxItemCount));
        } else {
          res.status(HTTP_UNAUTHORIZED).send();
        }
      }
    } else {
      res.status(HTTP_IM_A_TEAPOT).send();
    }
  } catch (error) {
    console.error(error, error.stack);
    res.status(HTTP_INTERNAL_SERVER_ERROR).send();
  }
};
