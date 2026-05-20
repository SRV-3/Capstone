import mongoose from "mongoose";

export async function connectToDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI).then(() => {
      console.log("Connected to DB");
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}
