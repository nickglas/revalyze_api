import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import "reflect-metadata";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  await mongoose.connect(uri, {
    dbName: "test",
  });

  await mongoose.connection.asPromise();
});

beforeEach(async () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not initialized");

  const collections = await db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});
