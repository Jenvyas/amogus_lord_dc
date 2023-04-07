import mongoose, { ConnectOptions } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config()
const url = process.env.DATABASE_CONNECTION;

async function connectDB() {
    await mongoose.connect(url , { useNewUrlParser: true, useUnifiedTopology: true } as ConnectOptions);
    console.log('Connected to MongoDB');
}

export default connectDB;
