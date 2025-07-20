'use strict';

const { Report, Staff, Wallet, Payment, Tip } = require('@models');
const staffWalletConstants = require('@constants/staff/staffWalletConstants');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Generates a summary of staff payments
 */
async function generatePaymentSummary(staffId) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  const payments = await Payment.findAll({
    where: { staff_id: staffId },
    limit: 100,
  });

  const reportData = {
    total_salary: payments
      .filter(p => p.type === 'salary_payment')
      .reduce((sum, p) => sum + p.amount, 0),
    total_bonus: payments
      .filter(p => p.type === 'bonus_payment')
      .reduce((sum, p) => sum + p.amount, 0),
    total_withdrawals: payments
      .filter(p => p.type === 'withdrawal')
      .reduce((sum, p) => sum + p.amount, 0),
    transactions: payments.map(p => ({
      id: p.id,
      amount: p.amount,
      type: p.type,
      created_at: p.created_at,
    })),
  };

  const report = await Report.create({
    report_type: 'payment_summary',
    data: reportData,
    generated_by: staffId,
  });

  return report;
}

/**
 * Analyzes earning patterns based on tips and payments
 */
async function analyzeEarningsPatterns(staffId) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  const payments = await Payment.findAll({
    where: { staff_id: staffId },
  });

  const tips = await Tip.findAll({
    where: { recipient_id: staffId },
  });

  const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0) +
                        tips.reduce((sum, t) => sum + t.amount, 0);

  const avgDailyEarnings = totalEarnings / (payments.length + tips.length || 1);

  const report = {
    total_earnings: totalEarnings,
    average_daily_earnings: avgDailyEarnings,
    top_earning_day: '', // placeholder for future logic
    peak_hours: [], // placeholder for future logic
  };

  return report;
}

/**
 * Forecast next month's earnings based on historical data
 */
async function forecastNextMonthEarnings(staffId) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  const payments = await Payment.findAll({
    where: { staff_id: staffId },
    order: [['created_at', 'ASC']],
  });

  const earningsOverTime = payments.map(p => p.amount);

  let growthRate = 0;
  if (earningsOverTime.length > 1) {
    const lastTwoAvg = (earningsOverTime.slice(-2).reduce((a, b) => a + b)) / 2;
    const prevTwoAvg = (earningsOverTime.slice(-4, -2).reduce((a, b) => a + b, 0)) / 2;
    growthRate = ((lastTwoAvg - prevTwoAvg) / prevTwoAvg) * 100;
  }

  const lastMonthTotal = payments
    .filter(p => p.created_at >= new Date(new Date() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, p) => sum + p.amount, 0);

  const forecastedEarnings = lastMonthTotal * (1 + growthRate / 100);

  return {
    last_month_total: lastMonthTotal,
    forecasted_next_month: forecastedEarnings,
    growth_rate_percent: growthRate.toFixed(2),
  };
}

module.exports = {
  generatePaymentSummary,
  analyzeEarningsPatterns,
  forecastNextMonthEarnings,
};