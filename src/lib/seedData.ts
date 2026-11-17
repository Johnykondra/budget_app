import { Category, Transaction, UserProfile } from '../types/budget';

export const DEFAULT_PROFILE_SETTINGS: Omit<UserProfile, 'userId'> = {
  currency: 'USD',
  monthlyBudgetTarget: 4200,
  seededDemoData: true,
};

export function createStarterCategories(userId: string): Category[] {
  return [
    {
      id: 'cat_housing',
      userId,
      name: 'Housing & Rent',
      kind: 'expense',
      color: '#2563EB',
      icon: 'home',
      monthlyLimit: 1850,
      isArchived: false,
    },
    {
      id: 'cat_groceries',
      userId,
      name: 'Groceries & Dining',
      kind: 'expense',
      color: '#059669',
      icon: 'utensils',
      monthlyLimit: 720,
      isArchived: false,
    },
    {
      id: 'cat_transit',
      userId,
      name: 'Transit & Fuel',
      kind: 'expense',
      color: '#D97706',
      icon: 'car',
      monthlyLimit: 320,
      isArchived: false,
    },
    {
      id: 'cat_utilities',
      userId,
      name: 'Utilities & Internet',
      kind: 'expense',
      color: '#0284C7',
      icon: 'zap',
      monthlyLimit: 240,
      isArchived: false,
    },
    {
      id: 'cat_health',
      userId,
      name: 'Health & Fitness',
      kind: 'expense',
      color: '#DC2626',
      icon: 'heart-pulse',
      monthlyLimit: 220,
      isArchived: false,
    },
    {
      id: 'cat_shopping',
      userId,
      name: 'Shopping & Gear',
      kind: 'expense',
      color: '#7C3AED',
      icon: 'shopping-bag',
      monthlyLimit: 400,
      isArchived: false,
    },
    {
      id: 'cat_leisure',
      userId,
      name: 'Media & Travel',
      kind: 'expense',
      color: '#DB2777',
      icon: 'film',
      monthlyLimit: 300,
      isArchived: false,
    },
    {
      id: 'cat_education_fees',
      userId,
      name: 'School & College Fee',
      kind: 'expense',
      color: '#4F46E5',
      icon: 'book',
      monthlyLimit: 500,
      isArchived: false,
    },
    {
      id: 'cat_salary',
      userId,
      name: 'Primary Salary',
      kind: 'income',
      color: '#0F766E',
      icon: 'briefcase',
      monthlyLimit: 0,
      isArchived: false,
    },
    {
      id: 'cat_freelance',
      userId,
      name: 'Consulting & Side Income',
      kind: 'income',
      color: '#65A30D',
      icon: 'trending-up',
      monthlyLimit: 0,
      isArchived: false,
    },
  ];
}

export function createStarterTransactions(userId: string): Transaction[] {
  const entries: Array<Omit<Transaction, 'id' | 'userId'>> = [
    // November 2026 (Current Month up to Nov 17)
    { categoryId: 'cat_salary', type: 'income', amount: 3150, merchant: 'Northstar Systems Payroll', note: 'Bi-weekly direct deposit', date: '2026-11-01', paymentMethod: 'bank' },
    { categoryId: 'cat_housing', type: 'expense', amount: 1850, merchant: 'Parkview Residences', note: 'November apartment lease', date: '2026-11-01', paymentMethod: 'bank' },
    { categoryId: 'cat_utilities', type: 'expense', amount: 89.5, merchant: 'FiberOne Broadband', note: 'Gigabit home internet', date: '2026-11-02', paymentMethod: 'card' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 134.2, merchant: 'Whole Harvest Market', note: 'Weekly pantry restock', date: '2026-11-03', paymentMethod: 'card' },
    { categoryId: 'cat_health', type: 'expense', amount: 78, merchant: 'Equinox Athletic Club', note: 'Monthly membership', date: '2026-11-04', paymentMethod: 'card' },
    { categoryId: 'cat_transit', type: 'expense', amount: 64, merchant: 'Metro Transit Pass', note: 'November commuter card reload', date: '2026-11-05', paymentMethod: 'card' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 46.8, merchant: 'Osteria Verde', note: 'Dinner with colleagues', date: '2026-11-06', paymentMethod: 'card' },
    { categoryId: 'cat_shopping', type: 'expense', amount: 189, merchant: 'Keychron Direct', note: 'Low-profile desk keyboard', date: '2026-11-07', paymentMethod: 'card' },
    { categoryId: 'cat_utilities', type: 'expense', amount: 124.4, merchant: 'City Electric & Water', note: 'Monthly utility statement', date: '2026-11-08', paymentMethod: 'bank' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 118.65, merchant: 'Trader Market Co.', note: 'Fresh produce & coffee beans', date: '2026-11-09', paymentMethod: 'card' },
    { categoryId: 'cat_leisure', type: 'expense', amount: 42, merchant: 'Alamo Cinema', note: 'Evening screening & snacks', date: '2026-11-10', paymentMethod: 'card' },
    { categoryId: 'cat_freelance', type: 'income', amount: 840, merchant: 'Studio K Architecture', note: 'Design systems advisory invoice', date: '2026-11-11', paymentMethod: 'transfer' },
    { categoryId: 'cat_transit', type: 'expense', amount: 52.3, merchant: 'Shell Station #412', note: 'Fuel refill', date: '2026-11-12', paymentMethod: 'card' },
    { categoryId: 'cat_shopping', type: 'expense', amount: 248, merchant: 'Everlane Apparel', note: 'Winter wool overshirt', date: '2026-11-13', paymentMethod: 'card' },
    { categoryId: 'cat_health', type: 'expense', amount: 68.5, merchant: 'Clearview Pharmacy', note: 'Vitamins & prescription', date: '2026-11-14', paymentMethod: 'card' },
    { categoryId: 'cat_salary', type: 'income', amount: 3150, merchant: 'Northstar Systems Payroll', note: 'Mid-month direct deposit', date: '2026-11-15', paymentMethod: 'bank' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 158.9, merchant: 'Whole Harvest Market', note: 'Weekend hosting groceries', date: '2026-11-16', paymentMethod: 'card' },
    { categoryId: 'cat_leisure', type: 'expense', amount: 19.99, merchant: 'Criterion Channel & Audio', note: 'Monthly streaming bundle', date: '2026-11-17', paymentMethod: 'card' },

    // October 2026
    { categoryId: 'cat_salary', type: 'income', amount: 6300, merchant: 'Northstar Systems Payroll', note: 'October payroll (2 cycles)', date: '2026-10-01', paymentMethod: 'bank' },
    { categoryId: 'cat_housing', type: 'expense', amount: 1850, merchant: 'Parkview Residences', note: 'October apartment lease', date: '2026-10-01', paymentMethod: 'bank' },
    { categoryId: 'cat_utilities', type: 'expense', amount: 218.2, merchant: 'City Electric & Fiber', note: 'Electric, water, and internet', date: '2026-10-05', paymentMethod: 'bank' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 684.5, merchant: 'Whole Harvest & Dining', note: 'Monthly grocery & restaurant spend', date: '2026-10-12', paymentMethod: 'card' },
    { categoryId: 'cat_transit', type: 'expense', amount: 274.8, merchant: 'Metro & Fuel Stations', note: 'October commuting & gas', date: '2026-10-15', paymentMethod: 'card' },
    { categoryId: 'cat_health', type: 'expense', amount: 195, merchant: 'Athletic Club & Dental', note: 'Routine cleaning & gym', date: '2026-10-18', paymentMethod: 'card' },
    { categoryId: 'cat_shopping', type: 'expense', amount: 342, merchant: 'Apple & Home Goods', note: 'Desk lamp & accessories', date: '2026-10-22', paymentMethod: 'card' },
    { categoryId: 'cat_leisure', type: 'expense', amount: 386, merchant: 'Amtrak & Weekend Trip', note: 'Autumn coastal rail trip', date: '2026-10-26', paymentMethod: 'card' },

    // September 2026
    { categoryId: 'cat_salary', type: 'income', amount: 6300, merchant: 'Northstar Systems Payroll', note: 'September payroll', date: '2026-09-01', paymentMethod: 'bank' },
    { categoryId: 'cat_freelance', type: 'income', amount: 1200, merchant: 'Veloce Labs', note: 'Analytics dashboard sprint', date: '2026-09-14', paymentMethod: 'transfer' },
    { categoryId: 'cat_housing', type: 'expense', amount: 1850, merchant: 'Parkview Residences', note: 'September apartment lease', date: '2026-09-01', paymentMethod: 'bank' },
    { categoryId: 'cat_utilities', type: 'expense', amount: 236, merchant: 'City Electric & Fiber', note: 'Late summer AC & internet', date: '2026-09-06', paymentMethod: 'bank' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 615, merchant: 'Whole Harvest & Local Cafes', note: 'September food & coffee', date: '2026-09-14', paymentMethod: 'card' },
    { categoryId: 'cat_transit', type: 'expense', amount: 240, merchant: 'Metro Transit & Gas', note: 'September commuting', date: '2026-09-18', paymentMethod: 'card' },
    { categoryId: 'cat_health', type: 'expense', amount: 145, merchant: 'Athletic Club & Clinic', note: 'Membership & physio', date: '2026-09-21', paymentMethod: 'card' },
    { categoryId: 'cat_shopping', type: 'expense', amount: 275, merchant: 'Bookshop & Apparel', note: 'Technical books & shoes', date: '2026-09-24', paymentMethod: 'card' },
    { categoryId: 'cat_leisure', type: 'expense', amount: 210, merchant: 'Symphony & Dining', note: 'Concert tickets', date: '2026-09-27', paymentMethod: 'card' },

    // August 2026
    { categoryId: 'cat_salary', type: 'income', amount: 6300, merchant: 'Northstar Systems Payroll', note: 'August payroll', date: '2026-08-01', paymentMethod: 'bank' },
    { categoryId: 'cat_housing', type: 'expense', amount: 1850, merchant: 'Parkview Residences', note: 'August apartment lease', date: '2026-08-01', paymentMethod: 'bank' },
    { categoryId: 'cat_utilities', type: 'expense', amount: 258, merchant: 'City Electric & Fiber', note: 'Peak August cooling', date: '2026-08-05', paymentMethod: 'bank' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 745, merchant: 'Whole Harvest & Bistro', note: 'Groceries & patio dinners', date: '2026-08-12', paymentMethod: 'card' },
    { categoryId: 'cat_transit', type: 'expense', amount: 310, merchant: 'Fuel & Airport Shuttle', note: 'August travel transit', date: '2026-08-17', paymentMethod: 'card' },
    { categoryId: 'cat_health', type: 'expense', amount: 118, merchant: 'Athletic Club', note: 'Gym & supplements', date: '2026-08-20', paymentMethod: 'card' },
    { categoryId: 'cat_shopping', type: 'expense', amount: 465, merchant: 'REI Co-op', note: 'Weekend camping gear', date: '2026-08-22', paymentMethod: 'card' },
    { categoryId: 'cat_leisure', type: 'expense', amount: 295, merchant: 'National Park Pass & Lodge', note: 'Summer getaway', date: '2026-08-25', paymentMethod: 'card' },

    // July 2026
    { categoryId: 'cat_salary', type: 'income', amount: 6150, merchant: 'Northstar Systems Payroll', note: 'July payroll', date: '2026-07-01', paymentMethod: 'bank' },
    { categoryId: 'cat_housing', type: 'expense', amount: 1850, merchant: 'Parkview Residences', note: 'July apartment lease', date: '2026-07-01', paymentMethod: 'bank' },
    { categoryId: 'cat_utilities', type: 'expense', amount: 244, merchant: 'City Electric & Fiber', note: 'July utilities', date: '2026-07-06', paymentMethod: 'bank' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 640, merchant: 'Whole Harvest Market', note: 'July groceries', date: '2026-07-15', paymentMethod: 'card' },
    { categoryId: 'cat_transit', type: 'expense', amount: 215, merchant: 'Metro & Fuel', note: 'July transit', date: '2026-07-19', paymentMethod: 'card' },
    { categoryId: 'cat_leisure', type: 'expense', amount: 260, merchant: 'Summer Festival & Dining', note: 'Weekend outings', date: '2026-07-24', paymentMethod: 'card' },

    // June 2026
    { categoryId: 'cat_salary', type: 'income', amount: 6150, merchant: 'Northstar Systems Payroll', note: 'June payroll', date: '2026-06-01', paymentMethod: 'bank' },
    { categoryId: 'cat_housing', type: 'expense', amount: 1850, merchant: 'Parkview Residences', note: 'June apartment lease', date: '2026-06-01', paymentMethod: 'bank' },
    { categoryId: 'cat_utilities', type: 'expense', amount: 205, merchant: 'City Electric & Fiber', note: 'June utilities', date: '2026-06-05', paymentMethod: 'bank' },
    { categoryId: 'cat_groceries', type: 'expense', amount: 590, merchant: 'Whole Harvest Market', note: 'June groceries', date: '2026-06-14', paymentMethod: 'card' },
    { categoryId: 'cat_shopping', type: 'expense', amount: 315, merchant: 'Home Studio Supply', note: 'Monitor arm & cables', date: '2026-06-19', paymentMethod: 'card' },
    { categoryId: 'cat_health', type: 'expense', amount: 120, merchant: 'Athletic Club', note: 'Monthly gym & wellness', date: '2026-06-22', paymentMethod: 'card' },
  ];

  return entries.map((entry, idx) => ({
    ...entry,
    id: `tx_seed_${String(idx + 1).padStart(3, '0')}`,
    userId,
  }));
}

let sampleCounter = 0;

export function buildSampleTransaction(
  categories: Category[],
  monthKey: string,
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR' | 'PKR' | 'AED'
): Omit<Transaction, 'id' | 'userId'> | null {
  const activeExpense = categories.filter((c) => !c.isArchived && c.kind === 'expense');
  const activeIncome = categories.filter((c) => !c.isArchived && c.kind === 'income');

  const multiplier =
    currency === 'INR'
      ? 80
      : currency === 'PKR'
      ? 260
      : currency === 'JPY'
      ? 145
      : currency === 'AED'
      ? 3.6
      : 1;

  const presets: Array<{
    type: 'expense' | 'income';
    preferredCategoryId: string;
    baseAmount: number;
    merchant: string;
    note: string;
    paymentMethod: Transaction['paymentMethod'];
  }> = [
    {
      type: 'expense',
      preferredCategoryId: 'cat_groceries',
      baseAmount: 64.5,
      merchant: 'Green Valley Supermarket',
      note: 'Weekly groceries & produce test entry',
      paymentMethod: 'card',
    },
    {
      type: 'expense',
      preferredCategoryId: 'cat_transit',
      baseAmount: 28.0,
      merchant: 'City Metro & Ride Pass',
      note: 'Commute fare top-up',
      paymentMethod: 'card',
    },
    {
      type: 'expense',
      preferredCategoryId: 'cat_shopping',
      baseAmount: 112.0,
      merchant: 'Meridian Electronics',
      note: 'USB-C hub & desk accessories',
      paymentMethod: 'card',
    },
    {
      type: 'expense',
      preferredCategoryId: 'cat_utilities',
      baseAmount: 55.0,
      merchant: 'Metro Fiber Broadband',
      note: 'Monthly internet bill',
      paymentMethod: 'bank',
    },
    {
      type: 'income',
      preferredCategoryId: 'cat_freelance',
      baseAmount: 450.0,
      merchant: 'Client Advisory Retainer',
      note: 'Test consulting payout',
      paymentMethod: 'transfer',
    },
  ];

  const chosen = presets[sampleCounter % presets.length];
  sampleCounter += 1;

  const pool = chosen.type === 'income' ? activeIncome : activeExpense;
  const fallbackPool = pool.length > 0 ? pool : categories.filter((c) => !c.isArchived);
  if (fallbackPool.length === 0) return null;

  const matchedCat =
    fallbackPool.find((c) => c.id === chosen.preferredCategoryId) ?? fallbackPool[0];

  const scaledAmount = Math.round(chosen.baseAmount * multiplier * 100) / 100;
  const day = String(Math.min(28, 10 + (sampleCounter % 15))).padStart(2, '0');

  return {
    type: matchedCat.kind,
    categoryId: matchedCat.id,
    amount: scaledAmount,
    merchant: chosen.merchant,
    note: chosen.note,
    date: `${monthKey}-${day}`,
    paymentMethod: chosen.paymentMethod,
  };
}

