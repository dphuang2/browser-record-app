/* eslint no-console: ["error", { allow: ["error"] }] */
import AWS from 'aws-sdk';

import uuid from 'uuid/v4';

const API_VERSION = '2006-03-01';
const BUCKET = 'browser-record';
const REGION = 'us-west-2';

const config = new AWS.Config({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: REGION,
});
AWS.config = config;

let cachedS3 = null;

const availableFilters = {
  durationFilterGreater: (duration) => {
    return (session) => {
      if (session.duration > duration)
        return true;
      else
        return false;
    }
  },
  durationFilterLess: (duration) => {
    return (session) => {
      if (session.duration < duration)
        return true;
      else
        return false;
    }
  }
}

function getS3() {
  if (!cachedS3)
    cachedS3 = new AWS.S3({ apiVersion: API_VERSION });
  return cachedS3;
}

function generateSessionFolderKey(shop, id) {
  return `${shop}/${id}`;
}

function generateSessionChunkFolderKey(shop, id) {
  return `${generateSessionFolderKey(shop, id)}/chunk`;
}

function generateSessionChunkKey(shop, id) {
  return `${generateSessionChunkFolderKey(shop, id)}/${uuid()}`;
}

function generateSessionKey(shop, id) {
  return `${generateSessionFolderKey(shop, id)}/combined`;
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
  } catch(error) {
    console.error(error, error.stack);
  }
}

async function getObjectFromS3(key) {
  const s3 = getS3();
  const params = {
    Bucket: BUCKET,
    Key: key,
  }
  try {
    return await s3.getObject(params).promise();
  } catch (error) {
    console.error(error, error.stack);
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
  } catch(error) {
    console.error(error, error.stack);
  }
}

async function uploadSessionChunkToS3(data, shop, id) {
  await uploadJsonToS3(data, generateSessionChunkKey(shop, id));
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
  const s3 = getS3();
  const params = {
    Bucket: BUCKET,
    Prefix: generateSessionChunkFolderKey(shop, customer.sessionId),
  }
  try {
    /**
     * lets get all of the objects
     */
    const response = await s3.listObjectsV2(params).promise();
    const contents = response.Contents;
    let objects = [];
    let promises = [];
    contents.forEach((object) => {
      const pushObjects = async () => {
        const data = await getObjectFromS3(object.Key);
        const parsedObject = JSON.parse(data.Body.toString());
        objects.push(parsedObject);
      }
      promises.push(pushObjects());
    })
    await Promise.all(promises);
    if (objects.length == 0)
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
    session.duration = (objects[objects.length - 1].timestamp - objects[0].timestamp) / 1000;
    session.timestamp = objects[0].timestamp;
    objects.forEach((chunk) => {
      Array.prototype.push.apply(session.events, chunk.events);
      session.pageLoads += chunk.pageLoads;
      session.numClicks += chunk.numClicks;
    });
    /**
     * Apply any filters
     */
    if (filters) {
      for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        if (!availableFilters[filter.key](filter.value)(session))
          return undefined;
      }
    }
    /**
     * Upload constructed and filtered session object to s3
     */
    await uploadSessionToS3(
      JSON.stringify(session),
      shop,
      customer.sessionId
    );
    return await getSignedUrlForSession(shop, customer.sessionId);
  } catch (error) {
    console.error(error, error.stack);
  }
}

export { uploadSessionChunkToS3, getSessionUrlFromS3 }
