export const INITIAL_GYMS = [
  {
    id: 'g1',
    gymName: 'Iron Temple Gym',
    ownerName: 'Amit Sharma',
    phone: '+91 98765 43210',
    email: 'amit@irontemple.in',
    city: 'Indore',
    address: '24 Vijay Nagar Square, Scheme No. 54, Indore, Madhya Pradesh 452010',
    joinedDate: '24-Nov-2025',
    logoInitial: 'IT',
    saasPlan: 'PRO',
    validUntil: '24-Nov-2027',
    daysLeft: 364,
    status: 'ACTIVE'
  },
  {
    id: 'g2',
    gymName: 'Spartan Fitness Club',
    ownerName: 'Rohan Verma',
    phone: '+91 91234 56789',
    email: 'rohan@spartanfitness.in',
    city: 'Pune',
    address: '3rd Floor, FC Road Arcade, Shivajinagar, Pune, Maharashtra 411004',
    joinedDate: '10-Aug-2025',
    logoInitial: 'SF',
    saasPlan: 'BASE',
    validUntil: '28-Nov-2026',
    daysLeft: 3,
    status: 'ACTIVE'
  },
  {
    id: 'g3',
    gymName: 'FitZone Studio',
    ownerName: 'Kavita Das',
    phone: '+91 95551 23456',
    email: 'kavita@fitzonestudio.in',
    city: 'Bengaluru',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    joinedDate: '22-Oct-2025',
    logoInitial: 'FZ',
    saasPlan: 'BASE',
    validUntil: '22-Nov-2026',
    daysLeft: -3,
    status: 'BLOCKED'
  }
];

export const INITIAL_PLANS_BY_GYM = {
  g1: [
    { id: 'g1-plan-1', name: '1 Month Standard', price: 1200, durationDays: 30 },
    { id: 'g1-plan-2', name: '1 Month Cardio + Weights', price: 1500, durationDays: 30 },
    { id: 'g1-plan-3', name: '3 Months Transformation', price: 3500, durationDays: 90 },
    { id: 'g1-plan-4', name: '6 Months Pro Pack', price: 6000, durationDays: 180 },
    { id: 'g1-plan-5', name: '1 Year VIP Annual', price: 11000, durationDays: 365 }
  ],
  g2: [
    { id: 'g2-plan-1', name: 'Monthly Strength', price: 1000, durationDays: 30 },
    { id: 'g2-plan-2', name: 'Quarterly Core', price: 2700, durationDays: 90 },
    { id: 'g2-plan-3', name: 'Annual Spartan Pass', price: 9500, durationDays: 365 }
  ],
  g3: [
    { id: 'g3-plan-1', name: 'Studio Flex Monthly', price: 1800, durationDays: 30 },
    { id: 'g3-plan-2', name: 'Pilates + HIIT 3M', price: 4800, durationDays: 90 }
  ]
};

export const INITIAL_MEMBERS_BY_GYM = {
  g1: [
    {
      id: 'g1-m1',
      rollNo: '101',
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '10-May-2025',
      shift: 'MORNING',
      shiftTime: '06:30 AM – 08:00 AM',
      planName: '3 Months Transformation',
      planPrice: 3500,
      expiryDate: '15-Dec-2026',
      daysLeft: 20,
      status: 'ACTIVE',
      rank: 1
    },
    {
      id: 'g1-m2',
      rollNo: '102',
      name: 'Vikas Verma',
      phone: '+91 91234 56789',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '20-Jan-2026',
      shift: 'MORNING',
      shiftTime: '07:15 AM – 08:45 AM',
      planName: '1 Month Standard',
      planPrice: 1200,
      expiryDate: '27-Nov-2026',
      daysLeft: 2,
      status: 'ACTIVE',
      rank: 2
    },
    {
      id: 'g1-m3',
      rollNo: '103',
      name: 'Anjali Gupta',
      phone: '+91 99887 76655',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '12-Sep-2025',
      shift: 'EVENING',
      shiftTime: '06:00 PM – 07:30 PM',
      planName: '1 Month Cardio + Weights',
      planPrice: 1500,
      expiryDate: '11-Nov-2026',
      daysLeft: -14,
      status: 'EXPIRED',
      lastInteractionDate: '18-Oct-2026',
      daysSinceInteraction: 38,
      totalCheckIns: 3,
      isLeastInteract: true,
      rank: 3
    },
    {
      id: 'g1-m4',
      rollNo: '104',
      name: 'Karan Mehra',
      phone: '+91 98220 11223',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '24-May-2026',
      shift: 'EVENING',
      shiftTime: '07:00 PM – 08:30 PM',
      planName: '6 Months Pro Pack',
      planPrice: 6000,
      expiryDate: '24-Jan-2027',
      daysLeft: 60,
      status: 'ACTIVE',
      rank: null
    },
    {
      id: 'g1-m5',
      rollNo: '105',
      name: 'Priya Nair',
      phone: '+91 97650 33445',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '10-Aug-2025',
      shift: 'MORNING',
      shiftTime: '06:00 AM – 07:30 AM',
      planName: '1 Year VIP Annual',
      planPrice: 11000,
      expiryDate: '10-Aug-2027',
      daysLeft: 258,
      status: 'ACTIVE',
      rank: null
    }
  ],
  g2: [
    {
      id: 'g2-m1',
      rollNo: '201',
      name: 'Arjun Kulkarni',
      phone: '+91 98111 22334',
      photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '19-Apr-2026',
      shift: 'MORNING',
      shiftTime: '06:30 AM – 08:00 AM',
      planName: 'Quarterly Core',
      planPrice: 2700,
      expiryDate: '19-Jan-2027',
      daysLeft: 55,
      status: 'ACTIVE',
      rank: 1
    },
    {
      id: 'g2-m2',
      rollNo: '202',
      name: 'Sneha Joshi',
      phone: '+91 98222 33445',
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '12-Sep-2025',
      shift: 'EVENING',
      shiftTime: '05:30 PM – 07:00 PM',
      planName: 'Annual Spartan Pass',
      planPrice: 9500,
      expiryDate: '12-Sep-2027',
      daysLeft: 291,
      status: 'ACTIVE',
      rank: 2
    },
    {
      id: 'g2-m3',
      rollNo: '203',
      name: 'Deepak Patil',
      phone: '+91 98333 44556',
      photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '20-Oct-2026',
      shift: 'MORNING',
      shiftTime: '07:00 AM – 08:30 AM',
      planName: 'Monthly Strength',
      planPrice: 1000,
      expiryDate: '13-Nov-2026',
      daysLeft: -12,
      status: 'EXPIRED',
      lastInteractionDate: '22-Oct-2026',
      daysSinceInteraction: 34,
      totalCheckIns: 2,
      isLeastInteract: true,
      rank: null
    }
  ],
  g3: [
    {
      id: 'g3-m1',
      rollNo: '301',
      name: 'Meera Krishnan',
      phone: '+91 99450 12312',
      photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '14-Nov-2025',
      shift: 'MORNING',
      shiftTime: '07:30 AM – 09:00 AM',
      planName: 'Studio Flex Monthly',
      planPrice: 1800,
      expiryDate: '14-Dec-2026',
      daysLeft: 19,
      status: 'ACTIVE',
      rank: 1
    },
    {
      id: 'g3-m2',
      rollNo: '302',
      name: 'Siddharth Rao',
      phone: '+91 99450 56756',
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=faces',
      admittedDate: '18-Aug-2026',
      shift: 'EVENING',
      shiftTime: '06:30 PM – 08:00 PM',
      planName: 'Pilates + HIIT 3M',
      planPrice: 4800,
      expiryDate: '10-Nov-2026',
      daysLeft: -15,
      status: 'EXPIRED',
      lastInteractionDate: '16-Oct-2026',
      daysSinceInteraction: 40,
      totalCheckIns: 4,
      isLeastInteract: true,
      rank: null
    }
  ]
};

export const INITIAL_MEMBER_PAYMENTS_BY_GYM = {
  g1: [
    { id: 'g1-p1', memberId: 'g1-m1', memberName: 'Rahul Sharma', rollNo: '101', amount: 3500, mode: 'UPI', planName: '3 Months Transformation', date: '15-Nov-2026' },
    { id: 'g1-p1b', memberId: 'g1-m1', memberName: 'Rahul Sharma', rollNo: '101', amount: 3500, mode: 'CASH', planName: '3 Months Transformation', date: '10-Aug-2026' },
    { id: 'g1-p1c', memberId: 'g1-m1', memberName: 'Rahul Sharma', rollNo: '101', amount: 3500, mode: 'UPI', planName: '3 Months Transformation', date: '05-Feb-2026' },
    { id: 'g1-p1-old', memberId: 'g1-m1', memberName: 'Rahul Sharma', rollNo: '101', amount: 1200, mode: 'CASH', planName: '1 Month Standard (Older)', date: '10-May-2025' },

    { id: 'g1-p2', memberId: 'g1-m2', memberName: 'Vikas Verma', rollNo: '102', amount: 1200, mode: 'CASH', planName: '1 Month Standard', date: '20-Nov-2026' },
    { id: 'g1-p2b', memberId: 'g1-m2', memberName: 'Vikas Verma', rollNo: '102', amount: 1200, mode: 'UPI', planName: '1 Month Standard', date: '18-Oct-2026' },

    { id: 'g1-p3a', memberId: 'g1-m3', memberName: 'Anjali Gupta', rollNo: '103', amount: 1500, mode: 'UPI', planName: '1 Month Cardio + Weights', date: '22-Oct-2026' },
    { id: 'g1-p3b', memberId: 'g1-m3', memberName: 'Anjali Gupta', rollNo: '103', amount: 1500, mode: 'CASH', planName: '1 Month Cardio + Weights', date: '18-Sep-2026' },
    { id: 'g1-p3-old', memberId: 'g1-m3', memberName: 'Anjali Gupta', rollNo: '103', amount: 1500, mode: 'CASH', planName: '1 Month Cardio + Weights', date: '12-Sep-2025' },

    { id: 'g1-p4', memberId: 'g1-m4', memberName: 'Karan Mehra', rollNo: '104', amount: 6000, mode: 'UPI', planName: '6 Months Pro Pack', date: '24-Nov-2026' },
    { id: 'g1-p4b', memberId: 'g1-m4', memberName: 'Karan Mehra', rollNo: '104', amount: 6000, mode: 'UPI', planName: '6 Months Pro Pack', date: '24-May-2026' },

    { id: 'g1-p5', memberId: 'g1-m5', memberName: 'Priya Nair', rollNo: '105', amount: 11000, mode: 'UPI', planName: '1 Year VIP Annual', date: '10-Aug-2026' },
    { id: 'g1-p5-old', memberId: 'g1-m5', memberName: 'Priya Nair', rollNo: '105', amount: 11000, mode: 'UPI', planName: '1 Year VIP Annual', date: '10-Aug-2025' }
  ],
  g2: [
    { id: 'g2-p1', memberId: 'g2-m1', memberName: 'Arjun Kulkarni', rollNo: '201', amount: 2700, mode: 'UPI', planName: 'Quarterly Core', date: '19-Oct-2026' },
    { id: 'g2-p1b', memberId: 'g2-m1', memberName: 'Arjun Kulkarni', rollNo: '201', amount: 2700, mode: 'CASH', planName: 'Quarterly Core', date: '19-Apr-2026' },
    { id: 'g2-p2', memberId: 'g2-m2', memberName: 'Sneha Joshi', rollNo: '202', amount: 9500, mode: 'CASH', planName: 'Annual Spartan Pass', date: '12-Sep-2026' },
    { id: 'g2-p2-old', memberId: 'g2-m2', memberName: 'Sneha Joshi', rollNo: '202', amount: 9500, mode: 'UPI', planName: 'Annual Spartan Pass', date: '12-Sep-2025' },
    { id: 'g2-p3', memberId: 'g2-m3', memberName: 'Deepak Patil', rollNo: '203', amount: 1000, mode: 'CASH', planName: 'Monthly Strength', date: '20-Oct-2026' }
  ],
  g3: [
    { id: 'g3-p1', memberId: 'g3-m1', memberName: 'Meera Krishnan', rollNo: '301', amount: 1800, mode: 'UPI', planName: 'Studio Flex Monthly', date: '14-Nov-2026' },
    { id: 'g3-p1-old', memberId: 'g3-m1', memberName: 'Meera Krishnan', rollNo: '301', amount: 1800, mode: 'CASH', planName: 'Studio Flex Monthly', date: '14-Nov-2025' },
    { id: 'g3-p2', memberId: 'g3-m2', memberName: 'Siddharth Rao', rollNo: '302', amount: 4800, mode: 'UPI', planName: 'Pilates + HIIT 3M', date: '18-Aug-2026' }
  ]
};

export const INITIAL_SAAS_PAYMENTS = [
  {
    id: 'tx-1',
    gymId: 'g1',
    gymName: 'Iron Temple Gym',
    ownerName: 'Amit Sharma',
    amount: 35000,
    mode: 'UPI',
    date: '24-Nov-2026',
    invoiceNo: 'INV-4821',
    notes: '1 Year PRO Plan Renewal'
  },
  {
    id: 'tx-2',
    gymId: 'g2',
    gymName: 'Spartan Fitness Club',
    ownerName: 'Rohan Verma',
    amount: 8000,
    mode: 'UPI',
    date: '10-Nov-2026',
    invoiceNo: 'INV-4790',
    notes: '3 Months BASE Plan Renewal'
  },
  {
    id: 'tx-3',
    gymId: 'g3',
    gymName: 'FitZone Studio',
    ownerName: 'Kavita Das',
    amount: 3000,
    mode: 'CASH',
    date: '22-Oct-2026',
    invoiceNo: 'INV-4712',
    notes: '1 Month BASE Plan'
  }
];
