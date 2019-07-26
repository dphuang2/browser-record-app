import Cookies from 'cookies';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';
import querystring from 'querystring';

const { SHOPIFY_API_SECRET_KEY } = process.env;

export default async (req, res) => {
  const {
    shop, hmac, code, state,
  } = req.query;
  const cookies = new Cookies(req, res);
  const stateCookie = cookies.get('state');

  if (state !== stateCookie) {
    res.status(403).send('Request origin cannot be verified');
    return;
  }

  if (shop && hmac && code) {
    // Validate request is from Shopify
    const map = Object.assign({}, req.query);
    delete map.signature;
    delete map.hmac;
    const message = querystring.stringify(map);
    const providedHmac = Buffer.from(hmac, 'utf-8');
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', SHOPIFY_API_SECRET_KEY)
        .update(message)
        .digest('hex'),
      'utf-8',
    );
    let hashEquals = false;

    try {
      hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
    } catch (e) {
      hashEquals = false;
    }

    if (!hashEquals) {
      res.status(400).send('HMAC validation failed');
      return;
    }

    cookies.set('token', sign({ shop }, SHOPIFY_API_SECRET_KEY));
    res.writeHead(302, {
      Location: `/?shop=${shop}`,
    });
    res.end();

    // TODO
    // Exchange temporary code for a permanent access token
    // Use access token to make API call to 'shop' endpoint
  } else {
    res.status(400).send('Required parameters missing');
  }
};
