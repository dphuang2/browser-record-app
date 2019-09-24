import Router from 'next/router';
import { verify } from 'jsonwebtoken';
import axios from 'axios';
import { GraphQLClient } from 'graphql-request';
import { TEST_SHOP_DOMAIN } from './constants';

const SCRIPT_TAG = 'https://cdn.jsdelivr.net/npm/browser-record/dist/br.min.js';
const RECURRING_CHARGE_NAME = 'Rewind Recurring Plan';
export const MONTHLY_CHARGE_AMOUNT = 10.0;
export const TRIAL_DAYS = 7;
export const ACTIVATED_STATUS = 'ACTIVE';

async function validateAccessToken(shop, accessToken) {
  const shopRequestUrl = `https://${shop}/admin/api/2019-07/shop.json`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
  };
  const response = await axios.get(shopRequestUrl, { headers });
  if (response.status === 401) return false;
  return true;
}

export function decodeToken(token) {
  return verify(token, process.env.SHOPIFY_API_SECRET_KEY);
}

export async function validateToken(token, shop) {
  let tokenVerified = false;
  try {
    const decoded = decodeToken(token);
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

export function createTokenObject(shop, accessToken, recurringChargeActivated, redirectedFromBilling) {
  return {
    shop,
    accessToken,
    recurringChargeActivated,
    redirectedFromBilling
  }
}

function getGraphQLClient(shop, accessToken) {
  return new GraphQLClient(`https://${shop}/admin/api/2019-07/graphql.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  });
}

export async function getRecurringChargeObject(shop, accessToken, gid) {
  const client = getGraphQLClient(shop, accessToken);
  const query = `query {
    node(id: "${gid}") {
      ...on AppSubscription {
        status
      }
    }
  }`;
  return await client.request(query);
}

export async function isSubscriptionActive(shop, accessToken) {
  const client = getGraphQLClient(shop, accessToken);
  const query = `query {
    currentAppInstallation {
      activeSubscriptions {
        name
        status
      }
    }
  }`;
  const response = await client.request(query);
  for (let subscription of response.currentAppInstallation.activeSubscriptions) {
    if (subscription.name === RECURRING_CHARGE_NAME &&
      subscription.status === ACTIVATED_STATUS)
      return true;
  }
  return false;
}

export async function getAppSubscriptionConfirmationUrl(shop, accessToken, returnUrl, amount, trialDays) {
  const client = getGraphQLClient(shop, accessToken);
  const mutation = `mutation {
    appSubscriptionCreate(
      name: "${RECURRING_CHARGE_NAME}"
      trialDays: ${trialDays}
      returnUrl: "${returnUrl}"
      test: ${process.env.MODE !== 'prod' || shop === TEST_SHOP_DOMAIN ? true : false}
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
              price: { amount: ${amount}, currencyCode: USD }
          }
        }
      }]
    ) {
      userErrors {
        field
        message
      }
      confirmationUrl
      appSubscription {
        id
      }
    }
  }`;
  const response = await client.request(mutation);
  return response.appSubscriptionCreate.confirmationUrl;
}

export async function installScriptTag(shop, accessToken) {
  const client = getGraphQLClient(shop, accessToken);

  // Check if there is already a script tag installed
  const query = `query {
    scriptTags (first: 1, src: "${SCRIPT_TAG}") {
      edges {
        node {
          id
        }
      }
    }
  }`;

  const response = await client.request(query);
  if (response.scriptTags.edges.length === 0) {
    // since no script tag was installed, install one.
    const mutation = `mutation {
                        scriptTagCreate(input: {
                          src: "${SCRIPT_TAG}"
                          displayScope:ALL
                        }) {
                          scriptTag {
                            id
                          }
                        }
                      }`;
    await client.request(mutation);
  }
}
