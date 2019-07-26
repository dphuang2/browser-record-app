import Router from 'next/router';
import { verify } from 'jsonwebtoken';

export function validateToken(token, shop) {
  let tokenVerified = false;
  try {
    tokenVerified = verify(token, process.env.SHOPIFY_API_SECRET_KEY).shop === shop;
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
