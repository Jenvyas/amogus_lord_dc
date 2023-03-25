import mongoose, { ConnectOptions } from 'mongoose';

async function connectDB() {
    const url = process.env.DATABASE_CONNECTION;
    await mongoose.connect(url , { useNewUrlParser: true, useUnifiedTopology: true } as ConnectOptions);
    console.log('Connected to MongoDB');
}

export default connectDB;
