/* eslint no-console: ["error", { allow: ["error"] }] */
import UAParser from 'ua-parser-js';
import geoip from 'geoip-lite';
import Customer from './models/Customer';
import connectToDatabase from './utils/db';

function getRemoteIp(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress
    || req.socket.remoteAddress || (req.connection.socket
    ? req.connection.socket.remoteAddress : null);
}

function constructLocationString(geo) {
  if (geo) return `${geo.region}, ${geo.country}`;
  return 'N/A';
}

// The main, exported, function of the endpoint,
// dealing with the request and subsequent response
export default async (req, res) => {
  try {
    await connectToDatabase(process.env.MONGODB_URI);
    const data = UAParser(req.headers['user-agent']);
    const remoteIp = getRemoteIp(req);
    const customer = {
      browser: data.browser.name,
      os: data.os.name,
      sessionId: req.body,
      remoteIp,
      location: constructLocationString(geoip.lookup(remoteIp)),
    };
    await Customer.updateOne({ sessionId: customer.sessionId }, customer, { upsert: true });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send({ error }); // Error
  }
};
