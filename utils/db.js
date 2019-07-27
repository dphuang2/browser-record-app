/* eslint no-console: ["error", { allow: ["error"] }] */
import mongoose from 'mongoose';

let cachedDb = null;

async function connectToDatabase(uri) {
  if (cachedDb) {
    return cachedDb;
  }

  await mongoose.connect(uri, { useNewUrlParser: true });

  const db = mongoose.connection;

  db.on('error', console.error.bind(console, 'connection error:'));

  cachedDb = db;
  return db;
}

export function avoidOverwriteModelError(modelName, schema) {
  let newOrExistingModel;
  try {
    newOrExistingModel = mongoose.model(modelName);
  } catch (error) {
    newOrExistingModel = mongoose.model(modelName, schema);
  }
  return newOrExistingModel;
}

export default connectToDatabase;
