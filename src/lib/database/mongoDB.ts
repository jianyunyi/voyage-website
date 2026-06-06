import mongoose from 'mongoose';

let isConnected = false;

export const connectToDB = async (): Promise<boolean> => {
  mongoose.set('strictQuery', true);

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined');
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败', error);
    return false;
  }
};