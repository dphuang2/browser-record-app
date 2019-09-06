/* eslint no-console: ["error", { allow: ["error"] }] */
import UAParser from 'ua-parser-js';
import geoip from 'geoip-lite';
import Customer from './models/Customer';
import connectToDatabase from '../utils/db';

// https://stackoverflow.com/a/19524949
function getRemoteIp(req) {
  try {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress
    || req.socket.remoteAddress || (req.connection.socket
      ? req.connection.socket.remoteAddress : null);
  } catch (error) {
    console.error(error);
    return 'N/A';
  }
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
        isMobile: (agentData.device.type ? true : false),
        shop: body.shop,
        sessionId: body.id,
        remoteIp,
        region,
        country,
        locationAvailable,
        stale: true, // We haven't processed chunks so default is true
      };
      /**
       * We want to replace the existing customer document because the data
       * could be stale and we don't want to filter in stale data
       */
      await Customer.replaceOne({ sessionId: customer.sessionId }, customer, { upsert: true });
      res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send();
  }
};
