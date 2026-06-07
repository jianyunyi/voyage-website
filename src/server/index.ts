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
import { registerAvatarRoutes } from './avatarRoutes';
import { registerModerationRoutes } from './moderationRoutes';
import { registerSubmissionRoutes } from './submissionRoutes';
import { SmsChallengeService, hashSecurityValue } from './security/smsSecurity';

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '6mb' }));

registerGuideRoutes(app);
registerFoodRoutes(app);
registerAvatarRoutes(app);
registerModerationRoutes(app);
registerSubmissionRoutes(app);

const smsChallenges = new SmsChallengeService({
  sendLimitPerPhoneWindow: Number(process.env.SMS_PHONE_WINDOW_LIMIT) || 3,
  sendLimitPerEmailWindow: Number(process.env.SMS_EMAIL_WINDOW_LIMIT) || 3,
  globalBudgetPerHour: Number(process.env.SMS_GLOBAL_HOURLY_BUDGET) || 500,
});

function buildAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

function toPublicUser(doc: Pick<IUser, 'email' | 'name'> & { _id: { toString(): string } }) {
  const id = doc._id.toString();
  return {
    id,
    email: doc.email,
    name: doc.name,
    avatar: `/api/users/${encodeURIComponent(id)}/avatar`,
  };
}

app.post('/api/auth/login/sms/request', async (req, res) => {
  const { email, phone } = req.body as { email?: string; phone?: string };
  const result = await smsChallenges.requestChallenge({
    email: email ?? '',
    phone: phone ?? '',
    ip: req.ip,
    deviceId: req.headers['user-agent'],
  });

  if (!result.success) {
    const status = result.code === 'SMS_BUDGET_EXHAUSTED' ? 503 : result.code === 'SMS_INVALID_INPUT' ? 400 : 429;
    return res.status(status).json(result);
  }

  return res.status(202).json({
    success: true,
    challengeId: result.challengeId,
    expiresInSeconds: result.expiresInSeconds,
    retryAfterSeconds: result.retryAfterSeconds,
    debugCode: process.env.NODE_ENV === 'production' ? undefined : result.debugCode,
    message: 'If the account can receive verification, a code has been sent.',
  });
});

app.post('/api/auth/login/sms/verify', async (req, res) => {
  const { challengeId, code } = req.body as { challengeId?: string; code?: string };
  const result = await smsChallenges.verifyChallenge({
    challengeId: challengeId ?? '',
    code: code ?? '',
  });

  if (!result.success) {
    const status =
      result.code === 'SMS_CHALLENGE_EXPIRED'
        ? 410
        : result.code === 'SMS_CHALLENGE_LOCKED'
          ? 423
          : result.code === 'SMS_INVALID_CODE'
            ? 401
            : 400;
    return res.status(status).json(result);
  }

  const user = await User.findOne({ email: result.email });
  if (!user) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid verification challenge.',
    });
  }

  const phoneHash = hashSecurityValue(result.phone);
  if (user.phoneHash && user.phoneHash !== phoneHash) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid verification challenge.',
    });
  }

  user.phoneHash = phoneHash;
  user.phoneEncrypted = result.phone;
  user.phoneVerifiedAt = new Date();
  user.lastLoginAt = new Date();
  await user.save();

  return res.json({
    success: true,
    user: toPublicUser(user),
    session: {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
});

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
