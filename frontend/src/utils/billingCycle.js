export function parseDisplayDate(dateStr) {
  if (!dateStr) return null;
  const normalized = String(dateStr).replace(/-/g, ' ');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 1-Month Gym Fee Ledger: keeps current calendar month only
 */
export function getCurrentMonthSection(payments = [], referenceDate = new Date()) {
  const curYear = referenceDate.getFullYear();
  const curMonth = referenceDate.getMonth();

  const monthLabel = new Date(curYear, curMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
  const shortLabel = new Date(curYear, curMonth, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric'
  });

  const items = payments
    .filter((p) => {
      const d = parseDisplayDate(p.date);
      if (!d) return false;
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    })
    .sort((a, b) => {
      const da = parseDisplayDate(a.date)?.getTime() || 0;
      const db = parseDisplayDate(b.date)?.getTime() || 0;
      return db - da;
    });

  const totalAmount = items.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const cashTotal = items.filter((p) => p.mode === 'CASH').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const upiTotal = items.filter((p) => p.mode === 'UPI').reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    key: `${curYear}-${curMonth + 1}`,
    monthLabel,
    shortLabel,
    items,
    totalAmount,
    cashTotal,
    upiTotal
  };
}

/**
 * 1-Year Retention Filter (used for Super Admin SaaS history & Member payment history)
 */
export function getOneYearHistory(payments = [], referenceDate = new Date()) {
  const oneYearAgo = new Date(referenceDate);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const items = [];
  let expiredCount = 0;

  payments.forEach((p) => {
    const d = parseDisplayDate(p.date);
    if (!d || d >= oneYearAgo) {
      items.push(p);
    } else {
      expiredCount += 1;
    }
  });

  items.sort((a, b) => {
    const da = parseDisplayDate(a.date)?.getTime() || 0;
    const db = parseDisplayDate(b.date)?.getTime() || 0;
    return db - da;
  });

  const totalAmount = items.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const cashTotal = items.filter((p) => p.mode === 'CASH').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const upiTotal = items.filter((p) => p.mode === 'UPI').reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    items,
    expiredCount,
    totalAmount,
    cashTotal,
    upiTotal
  };
}
