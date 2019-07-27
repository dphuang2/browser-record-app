/* eslint no-console: ["error", { allow: ["error"] }] */
import UAParser from 'ua-parser-js';
import geoip from 'geoip-lite';
import Customer from './models/Customer';
import connectToDatabase from '../utils/db';

function getRemoteIp(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress
    || req.socket.remoteAddress || (req.connection.socket
    ? req.connection.socket.remoteAddress : null);
}

function constructLocationString(geo) {
  if (geo) return `${geo.region}, ${geo.country}`;
  return 'N/A';
}

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      await connectToDatabase(process.env.MONGODB_URI);
      const agentData = UAParser(req.headers['user-agent']);
      const remoteIp = getRemoteIp(req);
      const body = JSON.parse(req.body);
      const customer = {
        browser: agentData.browser.name,
        os: agentData.os.name,
        shop: body.shop,
        sessionId: body.id,
        remoteIp,
        location: constructLocationString(geoip.lookup(remoteIp)),
      };
      await Customer.updateOne({ sessionId: customer.sessionId }, customer, { upsert: true });
      res.status(204).send();
    } else if (req.method === 'GET') {
      await connectToDatabase(process.env.MONGODB_URI);
      const { shop } = req.query;
      const customers = await Customer.find({ shop });
      res.status(200).json(customers);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send();
  }
};
