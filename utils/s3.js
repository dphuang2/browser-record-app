/* eslint no-console: ["error", { allow: ["error"] }] */
import AWS from 'aws-sdk';

import Customer from '../api/models/Customer';
import { availableFilters } from './filter';

const API_VERSION = '2006-03-01';
const BUCKET = 'browser-record';
const REGION = 'us-west-1';
const SESSION_COMBINED_NAME = 'combined';

let cachedS3 = null;

function getS3() {
  if (!cachedS3)
    cachedS3 = new AWS.S3({
      apiVersion: API_VERSION,
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: REGION,
    });
  return cachedS3;
}

function generateSessionFolderKey(shop, id) {
  return `${shop}/${id}`;
}

function generateSessionChunkFolderKey(shop, id) {
  return `${generateSessionFolderKey(shop, id)}/chunk`;
}

function generateSessionChunkKey(shop, id, timestamp, eventsLength) {
  return `${generateSessionChunkFolderKey(shop, id)}/${timestamp}-${eventsLength}.json`;
}

function generateSessionKey(shop, id) {
  return `${generateSessionFolderKey(shop, id)}/${SESSION_COMBINED_NAME}`;
}

async function uploadJsonToS3(data, key) {
  const s3 = getS3();
  const params = {
    Bucket: BUCKET,
    Key: key,
  }
  try {
    await s3.upload({
      ...params,
      Body: data,
      ContentType: 'application/json',
    }).promise();
  } catch (error) {
    console.error(error, error.stack);
  }
}

async function getObjectFromS3(key) {
  try {
    const s3 = getS3();
    const params = {
      Bucket: BUCKET,
      Key: key,
    }
    return await s3.getObject(params).promise();
  } catch (error) {
    throw error;
  }
}

async function getSignedUrl(key) {
  const s3 = getS3();
  const params = {
    Bucket: BUCKET,
    Key: key,
  }
  try {
    return await s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error(error, error.stack);
  }
}

async function deleteSessionChunks(objects) {
  if (objects.length === 0)
    return;
  const s3 = getS3();
  const params = {
    Bucket: BUCKET,
    Delete: {
      Objects: objects
    }
  }
  await s3.deleteObjects(params).promise();
}

async function listObjects(Prefix) {
  const s3 = getS3();
  const params = {
    Bucket: BUCKET,
    Prefix,
  }
  const response = await s3.listObjectsV2(params).promise();
  return response.Contents;
}

async function uploadSessionChunkToS3(data, shop, id, timestamp, eventsLength) {
  await uploadJsonToS3(
    data,
    generateSessionChunkKey(shop, id, timestamp, eventsLength)
  );
}

async function uploadSessionToS3(data, shop, id) {
  await uploadJsonToS3(data, generateSessionKey(shop, id));
}

async function getSignedUrlForSession(shop, id) {
  return await getSignedUrl(generateSessionKey(shop, id));
}

/** 
 * Aggregate session events from S3 and return combined object signed url
 */
async function getSessionUrlFromS3(shop, customer, filters) {
  /**
   * Get fresh session object if not stale
   */
  if (customer.stale !== undefined && !customer.stale)
    return await getSignedUrlForSession(shop, customer.sessionId);
  /**
   * lets get all of the objects
   */
  const contents = await listObjects(generateSessionFolderKey(shop, customer.sessionId));
  /**
   * This customer has no session data so return undefined
   */
  if (contents.length === 0)
    return undefined;
  let objects = [];
  let promises = [];
  let getFailed = false;
  /**
   * Define function for pushing to objects array. "content" is object with
   * "Key" field that matches a Key for an object on S3
   */
  const getAndPushObject = async (content) => {
    try {
      const data = await getObjectFromS3(content.Key);
      const parsedObject = JSON.parse(data.Body.toString());
      objects.push(parsedObject);
    } catch (error) {
      getFailed = true;
    }
  }
  contents.forEach((content) => {
    promises.push(getAndPushObject(content));
  });
  /**
   * Wait for all the getObject operations to finish
   */
  await Promise.all(promises);
  if (objects.length === 0 || getFailed)
    return undefined;
  /**
   * Now it is time to combine the objects
   */
  let session = {
    id: customer.sessionId,
    events: [],
    pageLoads: 0,
    numClicks: 0,
    duration: null,
    timestamp: null,
    ...customer,
  }
  objects.sort((a, b) => { return a.timestamp - b.timestamp; });
  session.timestamp = objects[0].timestamp;
  objects.forEach((chunk) => {
    Array.prototype.push.apply(session.events, chunk.events);
    session.pageLoads += chunk.pageLoads;
    session.numClicks += chunk.numClicks;
  });
  session.duration = (session.events[session.events.length - 1].timestamp - session.events[0].timestamp) / 1000;
  promises = [];
  /**
   * Start uploading constructed session object to s3
   */
  promises.push(uploadSessionToS3(
    JSON.stringify(session),
    shop,
    customer.sessionId
  ));
  /**
   * Start a delete operation for all the chunks we consumed
   */
  promises.push(deleteSessionChunks(contents.filter(content => {
    return !content.Key.endsWith(SESSION_COMBINED_NAME);
  }).map(content => {
    return { Key: content.Key };
  })));
  /**
   * Update MongoDB data for future filtering/caching during queries
   */
  promises.push(Customer.updateOne({ sessionId: customer.sessionId }, {
    $set: {
      pageLoads: session.pageLoads,
      numClicks: session.numClicks,
      timestamp: session.timestamp,
      duration: session.duration,
      stale: false,
    }
  }));
  await Promise.all(promises);
  /**
   * Apply any filters
   */
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value instanceof Array) {
        if (!availableFilters[key]['functional'](...value)(session))
          return undefined;
      } else {
        if (!availableFilters[key]['functional'](value)(session))
          return undefined;
      }
    }
  }

  /**
   * Get signed URL for session and return that
   */
  return await getSignedUrlForSession(shop, customer.sessionId);
}

export { uploadSessionChunkToS3, getSessionUrlFromS3 }
