import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { connectToDB } from '../lib/database/mongoDB';
import { seedGuidesIfEmpty } from '../lib/database/seedGuides';
import { seedFoodsIfEmpty } from '../lib/database/seedFoods';
import User, { type IUser } from '../lib/database/models/User';
import { registerGuideRoutes } from './guideRoutes';
import { registerFoodRoutes } from './foodRoutes';

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 3001;

app.use(cors());
app.use(express.json());

registerGuideRoutes(app);
registerFoodRoutes(app);

function buildAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

function toPublicUser(doc: Pick<IUser, 'email' | 'name'> & { _id: { toString(): string } }) {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    avatar: buildAvatar(doc.name),
  };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email?.trim() || !password || !name?.trim()) {
      return res.status(400).json({
        success: false,
        code: 'STORAGE_ERROR',
        message: '请填写完整的注册信息',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_TAKEN',
        message: '该邮箱已被注册',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: normalizedName,
    });

    return res.status(201).json({
      success: true,
      user: toPublicUser(newUser),
    });
  } catch (error) {
    console.error('注册失败:', error);
    return res.status(500).json({
      success: false,
      code: 'STORAGE_ERROR',
      message: '注册失败，请稍后重试',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: '未找到此用户，请先注册',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误',
      });
    }

    return res.json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({
      success: false,
      code: 'STORAGE_ERROR',
      message: '登录失败，请稍后重试',
    });
  }
});

async function startServer() {
  const connected = await connectToDB();
  if (!connected) {
    console.error('无法启动服务：数据库连接失败');
    process.exit(1);
  }

  await seedGuidesIfEmpty();
  await seedFoodsIfEmpty();

  app.listen(PORT, () => {
    console.log(`API 服务已启动: http://localhost:${PORT}`);
  });
}

startServer();
