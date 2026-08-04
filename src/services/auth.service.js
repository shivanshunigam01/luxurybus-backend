import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { ApiError } from '../utils/ApiError.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { toPublicUser } from '../utils/formatters.js';
import { verifyGoogleIdToken } from '../integrations/googleOAuth.js';
const assertAllowed = (user) => {
  if (user.blocked) throw new ApiError(403, 'User is blocked');
};

export const registerCustomer = async ({ email, password, name, phone }) => {
  if (await User.findOne({ email: email.toLowerCase() })) throw new ApiError(409, 'Email already registered');
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    name,
    phone,
    role: 'customer',
  });
  return {
    token: signAccessToken({ sub: String(user._id), role: user.role, vendorId: null }),
    user: toPublicUser(user),
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.passwordHash || !(await comparePassword(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  assertAllowed(user);
  return {
    token: signAccessToken({
      sub: String(user._id),
      role: user.role,
      vendorId: user.vendorId ? String(user.vendorId) : null,
      companyId: user.companyId ? String(user.companyId) : null,
    }),
    user: toPublicUser(user),
  };
};

export const registerB2B = async (payload) => {
  const B2B = await import('./b2b.service.js');
  return B2B.registerB2B(payload);
};

export const registerVendor = async (p) => {
  const { assertOtpVerified } = await import('./otp.service.js');
  const otpChannel = 'email';
  const otpTarget = p.email;
  await assertOtpVerified({ channel: otpChannel, target: otpTarget, purpose: 'vendor_register' });

  if (await User.findOne({ email: p.email.toLowerCase() })) throw new ApiError(409, 'Email already registered');
  const phoneDigits = String(p.phone || '').replace(/\D/g, '').slice(-10);
  if (phoneDigits.length === 10) {
    const phoneTaken = await User.findOne({ phone: new RegExp(`${phoneDigits}$`) });
    if (phoneTaken) throw new ApiError(409, 'Phone already registered');
  }

  const user = await User.create({
    email: p.email.toLowerCase(),
    passwordHash: await hashPassword(p.password),
    name: p.ownerName || p.name,
    phone: phoneDigits || p.phone || '',
    role: 'vendor',
  });
  const vendor = await Vendor.create({
    userId: user._id,
    companyName: p.companyName,
    ownerName: p.ownerName || p.name || '',
    businessType: p.businessType || '',
    gstNumber: p.gstNumber || '',
    panNumber: p.panNumber || '',
    address: p.address || '',
    fleetSize: p.fleetSize || 0,
    operatingCities: p.operatingCities || '',
    city: p.city || '',
    state: p.state || '',
    pin: p.pin || '',
    bankHolder: p.bankHolder || '',
    bankAccount: p.bankAccount || '',
    bankIfsc: p.bankIfsc || '',
    bankName: p.bankName || '',
    emailVerified: true,
    phoneVerified: false,
    registrationStep: 1,
    status: 'pending',
  });
  user.vendorId = vendor._id;
  await user.save();

  const { notifyVendor } = await import('./vendorPortal.service.js');
  await notifyVendor(
    vendor,
    'Welcome — complete your vendor onboarding',
    `Hi ${vendor.ownerName || vendor.companyName}, your account was created. Complete address, documents, and fleet details to get verified.`,
  );

  return {
    token: signAccessToken({ sub: String(user._id), role: user.role, vendorId: String(vendor._id) }),
    user: toPublicUser(user),
    vendor: { id: String(vendor._id), registrationStep: vendor.registrationStep, status: vendor.status },
  };
};

export const googleLogin = async ({ idToken }) => {
  const payload = await verifyGoogleIdToken(idToken);
  const email = payload.email?.toLowerCase();
  if (!email) throw new ApiError(400, 'Google account email missing');
  let user = await User.findOne({ $or: [{ email }, { googleId: payload.sub }] });
  if (!user) {
    user = await User.create({ email, name: payload.name || 'Google User', googleId: payload.sub, role: 'customer' });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }
  assertAllowed(user);
  return {
    token: signAccessToken({ sub: String(user._id), role: user.role, vendorId: user.vendorId ? String(user.vendorId) : null }),
    user: toPublicUser(user),
  };
};
export const googleRegisterVendor = async ({ idToken, companyName, phone = '', operatingCities = '', city = '' }) => {
  const payload = await verifyGoogleIdToken(idToken);
  const email = payload.email?.toLowerCase();
  if (!email) throw new ApiError(400, 'Google account email missing');
  let user = await User.findOne({ $or: [{ email }, { googleId: payload.sub }] });
  if (user) {
    if (user.role !== 'vendor') throw new ApiError(409, 'This Google account is already registered with another role');
    if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }
    let vendor = user.vendorId ? await Vendor.findById(user.vendorId) : null;
    if (!vendor) {
      vendor = await Vendor.create({ userId: user._id, companyName, operatingCities, city, status: 'pending' });
      user.vendorId = vendor._id;
      await user.save();
    }
    assertAllowed(user);
    return { token: signAccessToken({ sub: String(user._id), role: user.role, vendorId: String(user.vendorId) }), user: toPublicUser(user) };
  }
  user = await User.create({ email, name: payload.name || 'Vendor User', phone, googleId: payload.sub, role: 'vendor' });
  const vendor = await Vendor.create({ userId: user._id, companyName, operatingCities, city, status: 'pending' });
  user.vendorId = vendor._id;
  await user.save();
  return { token: signAccessToken({ sub: String(user._id), role: user.role, vendorId: String(vendor._id) }), user: toPublicUser(user) };
};
export const googleRegisterAdmin = async ({ idToken }) => {
  const payload = await verifyGoogleIdToken(idToken);
  const email = payload.email?.toLowerCase();
  if (!email) throw new ApiError(400, 'Google account email missing');
  let user = await User.findOne({ $or: [{ email }, { googleId: payload.sub }] });
  if (user) {
    if (user.role !== 'admin') throw new ApiError(409, 'This Google account is already registered with another role');
    if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }
    assertAllowed(user);
    return { token: signAccessToken({ sub: String(user._id), role: user.role, vendorId: null }), user: toPublicUser(user) };
  }
  user = await User.create({ email, name: payload.name || 'Admin User', googleId: payload.sub, role: 'admin' });
  return { token: signAccessToken({ sub: String(user._id), role: user.role, vendorId: null }), user: toPublicUser(user) };
};
export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  assertAllowed(user);
  return { user: toPublicUser(user) };
};
