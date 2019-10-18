/* eslint no-console: ["error", { allow: ["error"] }] */
import AWS from 'aws-sdk';

import LZString from 'lz-string';
import Customer from '../api/models/Customer';
import { availableFilters } from './filter';

const API_VERSION = '2006-03-01';
const BUCKET = 'rewind-app';
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
  return `${generateSessionChunkFolderKey(shop, id)}/${timestamp}-${eventsLength}`;
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
    data = LZString.compressToBase64(data);
    await s3.upload({
      ...params,
      Body: data,
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
    const object = await s3.getObject(params).promise();
    const decompressed = LZString.decompressFromBase64(object.Body.toString());
    return JSON.parse(decompressed);
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
async function getSessionUrlFromS3(shop, customer) {
  /**
   * lets get all of the objects
   */
  const contents = await listObjects(generateSessionFolderKey(shop, customer.id));
  /**
   * If our session does not actually exist on S3, return early here
   */
  if (contents.length === 0) return;
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
      const parsedObject = await getObjectFromS3(content.Key);
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
    events: [],
    ...customer,
  }
  objects.sort((a, b) => { return a.timestamp - b.timestamp; });
  session.timestamp = objects[0].timestamp;
  objects.forEach((chunk) => { Array.prototype.push.apply(session.events, chunk.events); });
  promises = [];
  /**
   * Start uploading constructed session object to s3
   */
  promises.push(uploadSessionToS3(
    JSON.stringify(session),
    shop,
    customer.id
  ));
  /**
   * Start a delete operation for all the chunks we consumed
   */
  promises.push(deleteSessionChunks(contents.filter(content => {
    return !content.Key.endsWith(SESSION_COMBINED_NAME);
  }).map(content => {
    return { Key: content.Key };
  })));
  await Promise.all(promises);
  /**
   * Get signed URL for session and return that
   */
  return await getSignedUrlForSession(shop, customer.id);
}

export { uploadSessionChunkToS3, getSessionUrlFromS3 }
