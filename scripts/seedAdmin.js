import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/utils/password.js';
dotenv.config();
connectDB().then(async () => {
  const email = process.env.ADMIN_EMAIL || 'kartartravelsltd@gmail.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  if (await User.findOne({ email })) return console.log('Admin already exists:', email);
  await User.create({ email, passwordHash: await hashPassword(password), name: 'System Admin', role: 'admin' });
  console.log('Admin created:', email);
  process.exit(0);
}).catch((err) => { console.error(err); process.exit(1); });
