/* eslint no-console: ["error", { allow: ["error"] }] */
import mongoose from 'mongoose';

// Create cached connection variable
let cachedDb = null;

// A function for connecting to MongoDB,
// taking a single paramater of the connection string
async function connectToDatabase(uri) {
  // If the database connection is cached,
  // use it instead of creating a new connection
  if (cachedDb) {
    return cachedDb;
  }

  // If no connection is cached, create a new one
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
