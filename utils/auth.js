import Router from 'next/router';
import { verify } from 'jsonwebtoken';
import querystring from 'querystring';
import crypto from 'crypto';

export function verifyRequestFromShopify(query) {
  const { hmac } = query;
  if (!hmac) return false;
  const map = Object.assign({}, query);
  delete map.signature;
  delete map.hmac;
  const message = querystring.stringify(map);
  const providedHmac = Buffer.from(hmac, 'utf-8');
  const generatedHash = Buffer.from(
    crypto
      .createHmac('sha256', API_SECRET_KEY)
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

  return hashEquals;
}

export function validateToken(token, shop) {
  let tokenVerified = false;
  try {
    tokenVerified = verify(token, API_SECRET_KEY).shop === shop;
  } catch (error) {
    tokenVerified = false;
  }
  return tokenVerified;
}

export function redirect(res, uri) {
  if (res) {
    res.writeHead(302, {
      Location: uri,
    });
    res.end();
  } else {
    Router.push(uri);
  }
}
