import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { B2BCompany } from '../src/models/B2BCompany.js';
import { B2BContract } from '../src/models/B2BContract.js';
import { B2BEmployee } from '../src/models/B2BEmployee.js';
import { Offer } from '../src/models/Offer.js';
import { Setting } from '../src/models/Setting.js';
import { hashPassword } from '../src/utils/password.js';

dotenv.config();

async function upsertCompany({ email, companyName, status, contactName, ...rest }) {
  let user = await User.findOne({ email });
  let company = user?.companyId
    ? await B2BCompany.findById(user.companyId)
    : await B2BCompany.findOne({ email });
  if (!company) {
    company = await B2BCompany.create({
      companyName,
      email,
      status,
      ...rest,
    });
  } else {
    Object.assign(company, { companyName, status, ...rest });
    await company.save();
  }
  if (!user) {
    user = await User.create({
      email,
      passwordHash: await hashPassword('B2Bdemo@123'),
      name: contactName || 'B2B Admin',
      phone: rest.phone || '9876543210',
      role: 'b2b',
      companyId: company._id,
    });
  } else {
    user.role = 'b2b';
    user.companyId = company._id;
    user.passwordHash = await hashPassword('B2Bdemo@123');
    await user.save();
  }
  company.primaryUserId = user._id;
  await company.save();
  const emp = await B2BEmployee.findOne({ companyId: company._id, email });
  if (!emp) {
    await B2BEmployee.create({
      companyId: company._id,
      userId: user._id,
      name: user.name,
      email,
      phone: user.phone,
      department: 'Admin',
      status: 'active',
    });
  }
  return { user, company };
}

connectDB()
  .then(async () => {
    await Setting.findOneAndUpdate(
      {},
      {
        $set: {
          b2bDefaultDiscountPercent: 5,
          invoicePrefix: 'LBR-INV',
        },
        $setOnInsert: { invoiceCounter: 0 },
      },
      { upsert: true },
    );

    const pending = await upsertCompany({
      email: 'pending.corp@demo.local',
      companyName: 'Pending Logistics Pvt Ltd',
      status: 'pending',
      gstin: '29AABCT1332L000',
      pan: 'AABCT1332L',
      businessType: 'Logistics',
      city: 'Bengaluru',
      state: 'KA',
      phone: '9800000001',
      contactName: 'Pending Admin',
      creditLimit: 0,
    });

    const active = await upsertCompany({
      email: 'active.corp@demo.local',
      companyName: 'Active Corp Travels',
      status: 'active',
      gstin: '27AABCT1332L001',
      pan: 'AABCT1332M',
      businessType: 'Corporate',
      city: 'Mumbai',
      state: 'MH',
      phone: '9800000002',
      contactName: 'Active Admin',
      creditLimit: 500000,
      walletBalance: 25000,
      defaultDiscountPercent: 8,
      verifiedAt: new Date(),
    });

    const existingContract = await B2BContract.findOne({
      companyId: active.company._id,
      title: 'FY Corporate Fleet',
    });
    if (!existingContract) {
      await B2BContract.create({
        companyId: active.company._id,
        title: 'FY Corporate Fleet',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 86400000),
        discountPercent: 8,
        paymentTermsDays: 30,
        status: 'active',
        pricingRules: [
          { vehicleTypeSlug: 'tempo-traveller-12', ratePerKm: 28, ratePerDay: 4500 },
          { vehicleTypeSlug: 'luxury-bus-35', ratePerKm: 45, ratePerDay: 12000 },
        ],
        notes: 'Demo corporate contract',
      });
    }

    if (!(await Offer.findOne({ slug: 'welcome-b2b' }))) {
      await Offer.create({
        title: 'Welcome B2B Offer',
        slug: 'welcome-b2b',
        type: 'banner',
        description: 'Corporate travel savings this quarter',
        href: '/b2b/register',
        status: 'active',
        target: 'b2b',
        priority: 10,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 86400000),
        banner: { url: '', alt: 'B2B offer' },
      });
    }
    if (!(await Offer.findOne({ code: 'CORP10' }))) {
      await Offer.create({
        title: 'CORP10 Coupon',
        slug: 'corp10-coupon',
        type: 'coupon',
        code: 'CORP10',
        discountType: 'percent',
        discountValue: 10,
        status: 'active',
        target: 'all',
        priority: 20,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 180 * 86400000),
      });
    }

    console.log('B2B demo seed complete');
    console.log('Pending:', pending.user.email, 'Active:', active.user.email, 'password B2Bdemo@123');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
