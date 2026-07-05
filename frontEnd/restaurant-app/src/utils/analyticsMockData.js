const menuItems = [
  { name: 'Espresso', category: 'Coffee', price: 3.5, rating: 4.6 },
  { name: 'Latte', category: 'Coffee', price: 5.0, rating: 4.8 },
  { name: 'Cappuccino', category: 'Coffee', price: 5.5, rating: 4.7 },
  { name: 'Mocha', category: 'Coffee', price: 6.0, rating: 4.5 },
  { name: 'Americano', category: 'Coffee', price: 4.0, rating: 4.3 },
  { name: 'Flat White', category: 'Coffee', price: 5.5, rating: 4.6 },
  { name: 'Macchiato', category: 'Coffee', price: 4.5, rating: 4.4 },
  { name: 'Iced Latte', category: 'Coffee', price: 5.5, rating: 4.5 },
  { name: 'Croissant', category: 'Pastry', price: 4.0, rating: 4.2 },
  { name: 'Bagel', category: 'Pastry', price: 3.5, rating: 4.0 },
  { name: 'Muffin', category: 'Pastry', price: 3.5, rating: 4.1 },
  { name: 'Scone', category: 'Pastry', price: 3.0, rating: 3.9 },
  { name: 'Cinnamon Roll', category: 'Pastry', price: 4.5, rating: 4.7 },
  { name: 'Club Sandwich', category: 'Lunch', price: 9.5, rating: 4.4 },
  { name: 'Panini', category: 'Lunch', price: 8.5, rating: 4.3 },
  { name: 'Wrap', category: 'Lunch', price: 7.5, rating: 4.1 },
  { name: 'Salad Bowl', category: 'Lunch', price: 8.0, rating: 4.2 },
  { name: 'Soup', category: 'Lunch', price: 5.5, rating: 3.8 },
  { name: 'Cheesecake', category: 'Dessert', price: 6.5, rating: 4.8 },
  { name: 'Brownie', category: 'Dessert', price: 4.5, rating: 4.5 },
  { name: 'Cookie', category: 'Dessert', price: 2.5, rating: 4.0 },
  { name: 'Tiramisu', category: 'Dessert', price: 7.0, rating: 4.9 },
  { name: 'Crème Brûlée', category: 'Dessert', price: 7.5, rating: 4.7 },
  { name: 'Cold Brew', category: 'Beverage', price: 4.5, rating: 4.3 },
  { name: 'Affogato', category: 'Dessert', price: 6.0, rating: 4.6 },
  { name: 'Hot Chocolate', category: 'Beverage', price: 4.5, rating: 4.4 },
  { name: 'Tea', category: 'Beverage', price: 3.0, rating: 4.0 },
  { name: 'Smoothie', category: 'Beverage', price: 6.5, rating: 4.2 },
];

const categories = ['Coffee', 'Pastry', 'Lunch', 'Dessert', 'Beverage'];
const paymentMethods = ['Cash', 'Card', 'Mobile Wallet', 'Voucher'];
const customerNames = [
  'Alice Johnson', 'Bob Smith', 'Carol White', 'David Brown', 'Eve Davis',
  'Frank Wilson', 'Grace Lee', 'Henry Taylor', 'Ivy Martinez', 'Jack Anderson',
  'Karen Thomas', 'Leo Garcia', 'Mona Robinson', 'Nathan Clark', 'Olivia Hall',
  'Paul Young', 'Quinn King', 'Rachel Wright', 'Sam Lopez', 'Tina Hill',
  'Uma Patel', 'Victor Chen', 'Wendy Zhao', 'Xavier Kim', 'Yara Hassan',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickNRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateHourlyData(dayMultiplier = 1) {
  const hours = [];
  for (let h = 7; h <= 22; h++) {
    const hourLabel = h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`;
    let baseOrders;
    if (h >= 8 && h <= 10) baseOrders = randomInt(8, 18);
    else if (h >= 12 && h <= 14) baseOrders = randomInt(12, 22);
    else if (h >= 17 && h <= 19) baseOrders = randomInt(10, 20);
    else baseOrders = randomInt(2, 7);

    baseOrders = Math.round(baseOrders * dayMultiplier);
    const avgTicket = randomFloat(5.5, 9.5);
    hours.push({
      hour: hourLabel,
      hourNum: h,
      orders: baseOrders,
      revenue: parseFloat((baseOrders * avgTicket).toFixed(2)),
      customers: Math.round(baseOrders * randomFloat(0.7, 1.3)),
      avgTicket,
    });
  }
  return hours;
}

function generateDailyData(days) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseRevenue = isWeekend ? randomFloat(1400, 2800) : randomFloat(900, 2200);
    const orders = Math.round(baseRevenue / randomFloat(6, 9));
    data.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayOfWeek: date.getDay(),
      revenue: baseRevenue,
      orders,
      avgOrderValue: parseFloat((baseRevenue / orders).toFixed(2)),
      customers: Math.round(orders * randomFloat(0.7, 1.1)),
      prepTime: randomFloat(7, 18),
      satisfaction: randomFloat(3.8, 5),
    });
  }
  return data;
}

function generateSalesByDay(period) {
  const data = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const day of days) {
    const isWeekend = day === 'Sun' || day === 'Sat';
    const factor = isWeekend ? randomFloat(1.1, 1.4) : randomFloat(0.9, 1.1);
    const base = period === 'week' ? randomFloat(900, 2000) : randomFloat(3800, 5200);
    data.push({
      day,
      revenue: parseFloat((base * factor).toFixed(2)),
      orders: Math.round((base * factor) / randomFloat(6.5, 8.5)),
    });
  }
  return data;
}

function generateMonthlyData(months) {
  const data = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const dailyAvg = randomFloat(900, 2000);
    const revenue = parseFloat((dailyAvg * daysInMonth * randomFloat(0.85, 1.0)).toFixed(2));
    const orders = Math.round(revenue / randomFloat(7, 9));
    data.push({
      month: monthLabel,
      monthNum: date.getMonth(),
      year: date.getFullYear(),
      revenue,
      orders,
      customers: Math.round(orders * randomFloat(0.7, 1.0)),
      avgOrderValue: parseFloat((revenue / orders).toFixed(2)),
    });
  }
  return data;
}

function generateYearlyData(years) {
  const data = [];
  const now = new Date();
  for (let i = years - 1; i >= 0; i--) {
    const year = now.getFullYear() - i;
    const monthlyAvg = randomFloat(25000, 42000);
    const revenue = parseFloat((monthlyAvg * 12 * randomFloat(0.9, 1.0)).toFixed(2));
    const orders = Math.round(revenue / randomFloat(7.5, 8.5));
    data.push({
      year: String(year),
      revenue,
      orders,
      customers: Math.round(orders * randomFloat(0.7, 0.9)),
      avgOrderValue: parseFloat((revenue / orders).toFixed(2)),
    });
  }
  return data;
}

function generateCategoryBreakdown(period) {
  const multiplier = period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1;
  return categories.map((cat) => {
    const catItems = menuItems.filter((i) => i.category === cat);
    const avgPrice = catItems.reduce((s, i) => s + i.price, 0) / (catItems.length || 1);
    const count = randomInt(Math.round(20 * multiplier), Math.round(60 * multiplier));
    return {
      name: cat,
      revenue: parseFloat((count * avgPrice * randomFloat(0.9, 1.2)).toFixed(2)),
      orders: count,
      items: catItems.length,
    };
  });
}

function generatePaymentBreakdown(period) {
  const multiplier = period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1;
  const weights = { 'Card': 0.40, 'Mobile Wallet': 0.25, 'Cash': 0.25, 'Voucher': 0.10 };
  return paymentMethods.map((method) => {
    const pct = weights[method] || 0.15;
    const totalRevenue = randomFloat(500 * multiplier, 2000 * multiplier);
    const count = Math.round(totalRevenue / randomFloat(7, 12));
    return {
      method,
      revenue: parseFloat((totalRevenue * pct * randomFloat(0.8, 1.2)).toFixed(2)),
      transactions: Math.round(count * pct),
      avgValue: randomFloat(8, 15),
    };
  });
}

function generateTopProducts(period) {
  const multiplier = period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1;
  return menuItems.map((item) => {
    const qty = randomInt(Math.round(5 * multiplier), Math.round(30 * multiplier));
    return {
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: qty,
      revenue: parseFloat((qty * item.price * randomFloat(0.95, 1.05)).toFixed(2)),
      rating: item.rating,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

function generateCustomerData(period) {
  const multiplier = period === 'year' ? 12 : period === 'month' ? 1 : period === 'week' ? 0.25 : 0.04;
  const totalCustomers = randomInt(Math.round(50 * multiplier), Math.round(200 * multiplier));
  const newCustomers = randomInt(Math.round(10 * multiplier), Math.round(50 * multiplier));
  const returningCustomers = totalCustomers - newCustomers;
  const topCustomers = pickNRandom(customerNames, 8).map((name) => ({
    name,
    visits: randomInt(Math.round(3 * multiplier), Math.round(20 * multiplier)),
    totalSpent: randomFloat(30 * multiplier, 500 * multiplier),
    avgOrderValue: randomFloat(8, 18),
    lastVisit: new Date(Date.now() - randomInt(0, 7) * 86400000).toISOString().split('T')[0],
  })).sort((a, b) => b.totalSpent - a.totalSpent);

  const acquisitionTrend = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    acquisitionTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      newCustomers: randomInt(Math.round(5 * multiplier), Math.round(30 * multiplier)),
      returningCustomers: randomInt(Math.round(15 * multiplier), Math.round(60 * multiplier)),
    });
  }

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    avgVisitsPerCustomer: randomFloat(1.5, 4.5),
    satisfaction: randomFloat(3.8, 4.9),
    topCustomers,
    acquisitionTrend,
  };
}

function generateOperationalData(period) {
  const multiplier = period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1;
  const hourlyData = generateHourlyData(multiplier > 1 ? Math.min(multiplier / 30, 1.2) : 1);

  const peakHours = hourlyData
    .filter((h) => h.orders > 12)
    .map((h) => h.hour);

  return {
    hourlyData,
    peakHours,
    avgPrepTime: randomFloat(6, 14),
    tableTurnoverRate: randomFloat(1.5, 4.0),
    avgTablesOccupied: randomInt(Math.round(5 * multiplier), Math.round(15 * multiplier)),
    totalTables: 20,
    completionRate: randomFloat(0.88, 0.98),
    cancellationRate: randomFloat(0.02, 0.08),
  };
}

let lastPeriod = null;
let cachedData = {};

export default function getAnalyticsData(period = 'today') {
  if (lastPeriod === period && cachedData[period]) {
    return cachedData[period];
  }

  const daily = generateDailyData(period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1);
  const today = daily[daily.length - 1] || daily[0];
  const yesterday = daily[daily.length - 2] || daily[0];

  const thisWeek = daily.slice(-7);
  const lastWeekDays = generateDailyData(7).map((d) => ({
    ...d,
    revenue: d.revenue * randomFloat(0.75, 0.98),
    orders: Math.round(d.orders * randomFloat(0.75, 0.98)),
  }));

  const hourly = generateHourlyData();
  const salesByDay = generateSalesByDay(period);
  const monthly = generateMonthlyData(12);
  const yearly = generateYearlyData(3);
  const categoriesBreakdown = generateCategoryBreakdown(period);
  const paymentMethodsBreakdown = generatePaymentBreakdown(period);
  const topProducts = generateTopProducts(period);
  const customerData = generateCustomerData(period);
  const operationalData = generateOperationalData(period);

  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = daily.reduce((s, d) => s + d.orders, 0);
  const totalCustomers = daily.reduce((s, d) => s + d.customers, 0);
  const avgOrderValue = totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;

  const summary = {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    totalCustomers,
    topProduct: topProducts[0]?.name || 'N/A',
    avgPrepTime: operationalData.avgPrepTime,
    completionRate: operationalData.completionRate,
    activeTables: operationalData.avgTablesOccupied,
    satisfaction: customerData.satisfaction,
    revenueChange: randomFloat(-8, 15),
    ordersChange: randomFloat(-5, 12),
    customersChange: randomFloat(-3, 10),
    todayRevenue: today?.revenue || 0,
    todayOrders: today?.orders || 0,
    yesterdayRevenue: yesterday?.revenue || 0,
  };

  const result = {
    period,
    summary,
    daily,
    hourly,
    today,
    yesterday,
    thisWeek,
    lastWeek: lastWeekDays,
    salesByDay,
    monthly,
    yearly,
    categories: categoriesBreakdown,
    paymentMethods: paymentMethodsBreakdown,
    topProducts,
    bottomProducts: [...topProducts].reverse().slice(0, 5),
    customers: customerData,
    operational: operationalData,
    peakHourLabels: operationalData.peakHours,
  };

  lastPeriod = period;
  cachedData[period] = result;
  return result;
}

export function getFilterOptions() {
  return [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];
}
