import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const url = "mongodb://localhost:27017/meet";
    
    const conn = await mongoose.connect(url);
    
    console.log(`Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1); // Exit with failure
  }
};

export default connectDB;