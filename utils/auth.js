import Router from 'next/router';
import { verify } from 'jsonwebtoken';
import axios from 'axios';

async function validateAccessToken(shop, accessToken) {
  const shopRequestUrl = `https://${shop}/admin/api/2019-07/shop.json`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
  };
  const response = await axios.get(shopRequestUrl, { headers });
  if (response.status === 401) return false;
  return true;
}

export async function validateToken(token, shop) {
  let tokenVerified = false;
  try {
    const decoded = verify(token, process.env.SHOPIFY_API_SECRET_KEY);
    tokenVerified = decoded.shop === shop && await validateAccessToken(shop, decoded.accessToken);
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
