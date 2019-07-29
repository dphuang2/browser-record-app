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

function getRegionAndCountry(remoteIp) {
  const location = geoip.lookup(remoteIp);
  if (location) {
    return {
      region: location.region,
      country: location.country,
      locationAvailable: true,
    };
  }
  return { region: 'N/A', country: 'N/A', locationAvailable: false };
}

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      await connectToDatabase(process.env.MONGODB_URI);
      const agentData = UAParser(req.headers['user-agent']);
      const remoteIp = getRemoteIp(req);
      const body = JSON.parse(req.body);
      const { region, country, locationAvailable } = getRegionAndCountry(remoteIp);
      const customer = {
        browser: agentData.browser.name,
        os: agentData.os.name,
        shop: body.shop,
        sessionId: body.id,
        remoteIp,
        region,
        country,
        locationAvailable,
      };
      await Customer.replaceOne({ sessionId: customer.sessionId }, customer, { upsert: true });
      res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send();
  }
};
