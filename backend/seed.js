const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./src/config/db');
const Gym = require('./src/models/Gym');
const GymPlan = require('./src/models/GymPlan');
const Member = require('./src/models/Member');
const Payment = require('./src/models/Payment');
const SaasPayment = require('./src/models/SaasPayment');
const GymLedgerEntry = require('./src/models/GymLedgerEntry');
const { getEndOfMonthDate } = require('./src/services/cleanupService');

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const seedData = async () => {
  try {
    await connectDB();
    console.log('[MongoDB Connected for Seeding]');

    await Promise.all([
      Gym.deleteMany({}),
      GymPlan.deleteMany({}),
      Member.deleteMany({}),
      Payment.deleteMany({}),
      SaasPayment.deleteMany({}),
      GymLedgerEntry.deleteMany({})
    ]);

    const g1 = await Gym.create({
      gymName: 'Iron Temple Gym',
      ownerName: 'Amit Sharma',
      phone: '+91 98765 43210',
      email: 'amit@irontemple.in',
      city: 'Indore',
      address: '24 Vijay Nagar Square, Scheme No. 54, Indore, Madhya Pradesh 452010',
      joinedDate: new Date('2025-11-24'),
      password: 'admin123',
      saasPlan: 'PRO',
      status: 'ACTIVE',
      validUntil: daysFromNow(364)
    });

    const g2 = await Gym.create({
      gymName: 'Spartan Fitness Club',
      ownerName: 'Rohan Verma',
      phone: '+91 91234 56789',
      email: 'rohan@spartanfitness.in',
      city: 'Pune',
      address: '3rd Floor, FC Road Arcade, Shivajinagar, Pune, Maharashtra 411004',
      joinedDate: new Date('2025-08-10'),
      password: 'admin123',
      saasPlan: 'BASE',
      status: 'ACTIVE',
      validUntil: daysFromNow(3)
    });

    const g3 = await Gym.create({
      gymName: 'FitZone Studio',
      ownerName: 'Kavita Das',
      phone: '+91 95551 23456',
      email: 'kavita@fitzonestudio.in',
      city: 'Bengaluru',
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
      joinedDate: new Date('2025-10-22'),
      password: 'admin123',
      saasPlan: 'BASE',
      status: 'BLOCKED',
      validUntil: daysFromNow(-3)
    });

    await GymPlan.create([
      { gymId: g1._id, name: '1 Month Standard', price: 1200, durationDays: 30 },
      { gymId: g1._id, name: '1 Month Cardio + Weights', price: 1500, durationDays: 30 },
      { gymId: g1._id, name: '3 Months Transformation', price: 3500, durationDays: 90 },
      { gymId: g1._id, name: '6 Months Pro Pack', price: 6000, durationDays: 180 },
      { gymId: g1._id, name: '1 Year VIP Annual', price: 11000, durationDays: 365 },

      { gymId: g2._id, name: 'Monthly Strength', price: 1000, durationDays: 30 },
      { gymId: g2._id, name: 'Quarterly Core', price: 2700, durationDays: 90 },
      { gymId: g2._id, name: 'Annual Spartan Pass', price: 9500, durationDays: 365 },

      { gymId: g3._id, name: 'Studio Flex Monthly', price: 1800, durationDays: 30 },
      { gymId: g3._id, name: 'Pilates + HIIT 3M', price: 4800, durationDays: 90 }
    ]);

    const [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10] = await Member.create([
      {
        gymId: g1._id,
        rollNo: '101',
        name: 'Rahul Sharma',
        phone: '+91 98765 43210',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2025-05-10'),
        shift: 'MORNING',
        shiftTime: '06:30 AM – 08:00 AM',
        planName: '3 Months Transformation',
        planPrice: 3500,
        expiryDate: daysFromNow(20),
        status: 'ACTIVE',
        lastInteractionDate: daysFromNow(-1),
        totalCheckIns: 24,
        rank: 1,
        uniqueQrCode: 'GYM-IT-101'
      },
      {
        gymId: g1._id,
        rollNo: '102',
        name: 'Vikas Verma',
        phone: '+91 91234 56789',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2026-01-20'),
        shift: 'MORNING',
        shiftTime: '07:15 AM – 08:45 AM',
        planName: '1 Month Standard',
        planPrice: 1200,
        expiryDate: daysFromNow(2),
        status: 'ACTIVE',
        lastInteractionDate: daysFromNow(-2),
        totalCheckIns: 18,
        rank: 2,
        uniqueQrCode: 'GYM-IT-102'
      },
      {
        gymId: g1._id,
        rollNo: '103',
        name: 'Anjali Gupta',
        phone: '+91 99887 76655',
        photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2025-09-12'),
        shift: 'EVENING',
        shiftTime: '06:00 PM – 07:30 PM',
        planName: '1 Month Cardio + Weights',
        planPrice: 1500,
        expiryDate: daysFromNow(-14),
        status: 'EXPIRED',
        lastInteractionDate: daysFromNow(-38),
        totalCheckIns: 3,
        rank: 3,
        uniqueQrCode: 'GYM-IT-103'
      },
      {
        gymId: g1._id,
        rollNo: '104',
        name: 'Karan Mehra',
        phone: '+91 98220 11223',
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2026-05-24'),
        shift: 'EVENING',
        shiftTime: '07:00 PM – 08:30 PM',
        planName: '6 Months Pro Pack',
        planPrice: 6000,
        expiryDate: daysFromNow(60),
        status: 'ACTIVE',
        lastInteractionDate: daysFromNow(0),
        totalCheckIns: 21,
        uniqueQrCode: 'GYM-IT-104'
      },
      {
        gymId: g1._id,
        rollNo: '105',
        name: 'Priya Nair',
        phone: '+91 97650 33445',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2025-08-10'),
        shift: 'MORNING',
        shiftTime: '06:00 AM – 07:30 AM',
        planName: '1 Year VIP Annual',
        planPrice: 11000,
        expiryDate: daysFromNow(258),
        status: 'ACTIVE',
        lastInteractionDate: daysFromNow(-1),
        totalCheckIns: 22,
        uniqueQrCode: 'GYM-IT-105'
      },
      {
        gymId: g2._id,
        rollNo: '201',
        name: 'Arjun Kulkarni',
        phone: '+91 98111 22334',
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2026-04-19'),
        shift: 'MORNING',
        shiftTime: '06:30 AM – 08:00 AM',
        planName: 'Quarterly Core',
        planPrice: 2700,
        expiryDate: daysFromNow(55),
        status: 'ACTIVE',
        lastInteractionDate: daysFromNow(-1),
        totalCheckIns: 19,
        rank: 1,
        uniqueQrCode: 'GYM-SF-201'
      },
      {
        gymId: g2._id,
        rollNo: '202',
        name: 'Sneha Joshi',
        phone: '+91 98222 33445',
        photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2025-09-12'),
        shift: 'EVENING',
        shiftTime: '05:30 PM – 07:00 PM',
        planName: 'Annual Spartan Pass',
        planPrice: 9500,
        expiryDate: daysFromNow(291),
        status: 'ACTIVE',
        lastInteractionDate: daysFromNow(-2),
        totalCheckIns: 16,
        rank: 2,
        uniqueQrCode: 'GYM-SF-202'
      },
      {
        gymId: g2._id,
        rollNo: '203',
        name: 'Deepak Patil',
        phone: '+91 98333 44556',
        photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2026-10-20'),
        shift: 'MORNING',
        shiftTime: '07:00 AM – 08:30 AM',
        planName: 'Monthly Strength',
        planPrice: 1000,
        expiryDate: daysFromNow(-12),
        status: 'EXPIRED',
        lastInteractionDate: daysFromNow(-34),
        totalCheckIns: 2,
        uniqueQrCode: 'GYM-SF-203'
      },
      {
        gymId: g3._id,
        rollNo: '301',
        name: 'Meera Krishnan',
        phone: '+91 99450 12312',
        photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2025-11-14'),
        shift: 'MORNING',
        shiftTime: '07:30 AM – 09:00 AM',
        planName: 'Studio Flex Monthly',
        planPrice: 1800,
        expiryDate: daysFromNow(19),
        status: 'ACTIVE',
        lastInteractionDate: daysFromNow(-1),
        totalCheckIns: 15,
        rank: 1,
        uniqueQrCode: 'GYM-FZ-301'
      },
      {
        gymId: g3._id,
        rollNo: '302',
        name: 'Siddharth Rao',
        phone: '+91 99450 56756',
        photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=faces',
        admittedDate: new Date('2026-08-18'),
        shift: 'EVENING',
        shiftTime: '06:30 PM – 08:00 PM',
        planName: 'Pilates + HIIT 3M',
        planPrice: 4800,
        expiryDate: daysFromNow(-15),
        status: 'EXPIRED',
        lastInteractionDate: daysFromNow(-40),
        totalCheckIns: 4,
        uniqueQrCode: 'GYM-FZ-302'
      }
    ]);

    // 4. Member Payments (1-Year Retention)
    const memberPaymentsData = [
      { gymId: g1._id, memberId: m1._id, receiptNo: 'RCP-1011', memberName: m1.name, rollNo: m1.rollNo, planName: m1.planName, amount: 3500, mode: 'UPI', paymentDate: daysFromNow(-10) },
      { gymId: g1._id, memberId: m1._id, receiptNo: 'RCP-1010', memberName: m1.name, rollNo: m1.rollNo, planName: m1.planName, amount: 3500, mode: 'CASH', paymentDate: daysFromNow(-105) },
      { gymId: g1._id, memberId: m2._id, receiptNo: 'RCP-1021', memberName: m2.name, rollNo: m2.rollNo, planName: m2.planName, amount: 1200, mode: 'CASH', paymentDate: daysFromNow(-5) },
      { gymId: g1._id, memberId: m3._id, receiptNo: 'RCP-1031', memberName: m3.name, rollNo: m3.rollNo, planName: m3.planName, amount: 1500, mode: 'UPI', paymentDate: daysFromNow(-34) },
      { gymId: g1._id, memberId: m4._id, receiptNo: 'RCP-1041', memberName: m4.name, rollNo: m4.rollNo, planName: m4.planName, amount: 6000, mode: 'UPI', paymentDate: daysFromNow(-1) },
      { gymId: g1._id, memberId: m5._id, receiptNo: 'RCP-1051', memberName: m5.name, rollNo: m5.rollNo, planName: m5.planName, amount: 11000, mode: 'UPI', paymentDate: daysFromNow(-106) },
      { gymId: g2._id, memberId: m6._id, receiptNo: 'RCP-2011', memberName: m6.name, rollNo: m6.rollNo, planName: m6.planName, amount: 2700, mode: 'UPI', paymentDate: daysFromNow(-36) },
      { gymId: g2._id, memberId: m7._id, receiptNo: 'RCP-2021', memberName: m7.name, rollNo: m7.rollNo, planName: m7.planName, amount: 9500, mode: 'CASH', paymentDate: daysFromNow(-74) },
      { gymId: g2._id, memberId: m8._id, receiptNo: 'RCP-2031', memberName: m8.name, rollNo: m8.rollNo, planName: m8.planName, amount: 1000, mode: 'CASH', paymentDate: daysFromNow(-35) },
      { gymId: g3._id, memberId: m9._id, receiptNo: 'RCP-3011', memberName: m9.name, rollNo: m9.rollNo, planName: m9.planName, amount: 1800, mode: 'UPI', paymentDate: daysFromNow(-11) },
      { gymId: g3._id, memberId: m10._id, receiptNo: 'RCP-3021', memberName: m10.name, rollNo: m10.rollNo, planName: m10.planName, amount: 4800, mode: 'UPI', paymentDate: daysFromNow(-99) }
    ];
    await Payment.create(memberPaymentsData);

    // 5. Gym Monthly Ledger (Current Month Only)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = getEndOfMonthDate(now);
    const currentMonthLedgerEntries = memberPaymentsData
      .filter((p) => p.paymentDate >= startOfMonth)
      .map((p) => ({ ...p, expiresAt: endOfMonth }));
    if (currentMonthLedgerEntries.length > 0) {
      await GymLedgerEntry.create(currentMonthLedgerEntries);
    }

    // 6. Super Admin SaaS Payments (1-Year Retention)
    await SaasPayment.create([
      {
        gymId: g1._id,
        gymName: g1.gymName,
        ownerName: g1.ownerName,
        invoiceNo: 'INV-4821',
        amount: 35000,
        mode: 'UPI',
        notes: '1 Year PRO Plan Renewal',
        paymentDate: daysFromNow(-1)
      },
      {
        gymId: g2._id,
        gymName: g2.gymName,
        ownerName: g2.ownerName,
        invoiceNo: 'INV-4790',
        amount: 8000,
        mode: 'UPI',
        notes: '3 Months BASE Plan Renewal',
        paymentDate: daysFromNow(-15)
      },
      {
        gymId: g3._id,
        gymName: g3.gymName,
        ownerName: g3.ownerName,
        invoiceNo: 'INV-4712',
        amount: 3000,
        mode: 'CASH',
        notes: '1 Month BASE Plan',
        paymentDate: daysFromNow(-34)
      }
    ]);

    console.log('✅ Seeded 3 Gyms, 10 Plans, 10 Members, 1-Year Payments, Current-Month Ledger, and SaaS Payments!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
