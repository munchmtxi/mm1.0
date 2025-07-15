'use strict';

const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization');
const staffConstants = require('@constants/staff/staffConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const managerConstants = require('@constants/staff/managerConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const driverConstants = require('@constants/staff/driverConstants');
const chefConstants = require('@constants/staff/chefConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const carParkOperativeConstants = require('@constants/staff/carParkOperativeConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const { Staff, Merchant, User, PerformanceMetric, Training, Shift, MerchantBranch } = require('@models');
const { Op } = require('sequelize');

// Map staff roles to their constants
const roleConstantsMap = {
  stock_clerk: stockClerkConstants,
  manager: managerConstants,
  front_of_house: frontOfHouseConstants,
  driver: driverConstants,
  chef: chefConstants,
  cashier: cashierConstants,
  car_park_operative: carParkOperativeConstants,
  butcher: butcherConstants,
  barista: baristaConstants,
  back_of_house: backOfHouseConstants,
};

async function monitorMetrics(staffId, metrics, io, auditService, socketService, pointService) {
  try {
    const { metricType, value, branchId, shiftId } = metrics;
    if (!staffId || !metricType || value == null || !branchId || !shiftId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid input');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');
    if (staff.branch_id !== branchId) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch');

    const shift = await Shift.findByPk(shiftId, { where: { staff_id: staffId, status: { [Op.in]: ['active', 'scheduled'] } } });
    if (!shift) throw new Error('Invalid or inactive shift');

    // Validate metricType against staff types
    const staffTypes = staff.staff_types || [];
    let validMetric = false;
    for (const staffType of staffTypes) {
      const roleConstants = roleConstantsMap[staffType];
      if (roleConstants && roleConstants.ANALYTICS_CONSTANTS.METRICS.includes(metricType)) {
        validMetric = true;
        break;
      }
    }
    if (!validMetric) throw new Error('Invalid metric type for staff role');

    // Validate certifications
    for (const staffType of staffTypes) {
      const requiredCerts = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staffType] || [];
      const staffCerts = staff.certifications || [];
      if (!requiredCerts.every(cert => staffCerts.includes(cert))) {
        throw new Error(staffConstants.STAFF_ERROR_CODES.includes('MISSING_CERTIFICATIONS') ? 'MISSING_CERTIFICATIONS' : 'Missing required certifications');
      }
    }

    const metric = await PerformanceMetric.create({
      staff_id: staffId,
      branch_id: branchId,
      shift_id: shiftId,
      metric_type: metricType,
      value,
      recorded_at: new Date(),
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_metric_recorded') ? 'staff_metric_recorded' : 'metric_recorded',
      details: { staffId, branchId, shiftId, metricType, value },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:metricMonitored', { staffId, branchId, shiftId, metricType, value }, `staff:${staffId}`);

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === metricType)?.points || 10;
    await pointService.awardPoints(staff.user_id, metricType, points);

    // Update staff performance_metrics
    await staff.update({
      performance_metrics: {
        ...staff.performance_metrics,
        [metricType]: (staff.performance_metrics?.[metricType] || 0) + value,
      },
    });

    return metric;
  } catch (error) {
    logger.error('Error monitoring metrics', { error: error.message });
    throw error;
  }
}

async function generatePerformanceReports(staffId, options, io, auditService, socketService, pointService) {
  try {
    const { period, format, branchId, startDate, endDate } = options;
    if (!staffId || !period || !format || !branchId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid input');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');
    if (staff.branch_id !== branchId) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch');

    if (!staffConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
      throw new Error('Invalid period');
    }
    if (!staffConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_FORMATS.includes(format)) {
      throw new Error('Invalid format');
    }

    const dateRange = {};
    if (startDate && endDate) {
      dateRange.recorded_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else {
      const now = new Date();
      if (period === 'daily') dateRange.recorded_at = { [Op.gte]: new Date(now.setDate(now.getDate() - 1)) };
      else if (period === 'weekly') dateRange.recorded_at = { [Op.gte]: new Date(now.setDate(now.getDate() - 7)) };
      else if (period === 'monthly') dateRange.recorded_at = { [Op.gte]: new Date(now.setMonth(now.getMonth() - 1)) };
    }

    const metrics = await PerformanceMetric.findAll({
      where: { staff_id: staffId, branch_id: branchId, ...dateRange },
      attributes: ['metric_type', 'value', 'recorded_at', 'shift_id'],
      order: [['recorded_at', 'DESC']],
    });

    const shifts = await Shift.findAll({
      where: { staff_id: staffId, branch_id: branchId, status: 'completed', ...dateRange },
      attributes: ['id', 'start_time', 'end_time', 'shift_type'],
    });

    const report = {
      staffId,
      branchId,
      period,
      format,
      metrics,
      shifts,
      summary: {
        totalMetrics: metrics.length,
        totalShiftHours: shifts.reduce((sum, shift) => {
          return sum + (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60);
        }, 0),
        performanceMetrics: staff.performance_metrics || {},
      },
    };

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_performance_report') ? 'staff_performance_report' : 'performance_report',
      details: { staffId, branchId, period, format },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:performanceReport', { staffId, branchId, period, format }, `staff:${staffId}`);

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'report_generation')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'report_generation', points);

    return report;
  } catch (error) {
    logger.error('Error generating performance report', { error: error.message });
    throw error;
  }
}

async function distributeTraining(staffId, training, io, auditService, socketService, notificationService, pointService) {
  try {
    const { category, content, branchId, dueDate } = training;
    if (!staffId || !category || !content || !branchId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid input');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: Merchant, as: 'merchant' },
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');
    if (staff.branch_id !== branchId) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch');

    // Validate training category against staff types
    const staffTypes = staff.staff_types || [];
    let validCategory = false;
    for (const staffType of staffTypes) {
      const roleConstants = roleConstantsMap[staffType];
      if (roleConstants && roleConstants.TRAINING_MODULES.includes(category)) {
        validCategory = true;
        break;
      }
    }
    if (!validCategory) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_CERTIFICATION') ? 'INVALID_CERTIFICATION' : 'Invalid training category');

    // Validate due date
    if (dueDate && new Date(dueDate) <= new Date()) {
      throw new Error('Due date must be in the future');
    }

    const trainingRecord = await Training.create({
      staff_id: staffId,
      branch_id: branchId,
      category,
      content,
      status: 'assigned',
      due_date: dueDate ? new Date(dueDate) : null,
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_training_assigned') ? 'staff_training_assigned' : 'training_assigned',
      details: { staffId, branchId, category, dueDate },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:trainingDistributed', { staffId, branchId, category, dueDate }, `staff:${staffId}`);

    const notificationType = staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('training_reminder') ? 'training_reminder' : 'general';
    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType,
      messageKey: 'staff.training_assigned',
      messageParams: { category, dueDate },
      role: 'staff',
      module: 'performance',
      deliveryMethod: staff.user.notification_preferences?.[notificationType] || staffConstants.STAFF_NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
      languageCode: staff.merchant?.preferred_language || staff.user.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'training_assignment')?.points || 10;
    await pointService.awardPoints(staff.user_id, 'training_assignment', points);

    return trainingRecord;
  } catch (error) {
    logger.error('Error distributing training', { error: error.message });
    throw error;
  }
}

async function getStaffPerformanceOverview(merchantId, branchId, period, io, auditService, socketService) {
  try {
    if (!merchantId || !branchId || !period) {
      throw new Error('Invalid input: merchantId, branchId, and period are required');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error('Merchant not found');

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || branch.merchant_id !== merchantId) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch');

    if (!staffConstants.STAFF_ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
      throw new Error('Invalid period');
    }

    const dateRange = {};
    const now = new Date();
    if (period === 'daily') dateRange.recorded_at = { [Op.gte]: new Date(now.setDate(now.getDate() - 1)) };
    else if (period === 'weekly') dateRange.recorded_at = { [Op.gte]: new Date(now.setDate(now.getDate() - 7)) };
    else if (period === 'monthly') dateRange.recorded_at = { [Op.gte]: new Date(now.setMonth(now.getMonth() - 1)) };

    const staff = await Staff.findAll({
      where: { merchant_id: merchantId, branch_id: branchId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'notification_preferences'] },
        { model: PerformanceMetric, as: 'performance_metrics', where: dateRange, required: false },
        { model: Shift, as: 'shifts', where: { ...dateRange, status: 'completed' }, required: false },
        { model: Training, as: 'trainings', where: { ...dateRange, status: 'completed' }, required: false },
      ],
    });

    const overview = staff.map(s => {
      const staffTypes = s.staff_types || [];
      const allowedMetrics = staffTypes.reduce((acc, type) => {
        const roleConstants = roleConstantsMap[type];
        return roleConstants ? [...acc, ...roleConstants.ANALYTICS_CONSTANTS.METRICS] : acc;
      }, []);

      return {
        staffId: s.id,
        name: s.user.getFullName(),
        staffTypes,
        metrics: s.performance_metrics?.reduce((acc, m) => {
          if (allowedMetrics.includes(m.metric_type)) {
            acc[m.metric_type] = (acc[m.metric_type] || 0) + m.value;
          }
          return acc;
        }, {}),
        totalShiftHours: s.shifts?.reduce((sum, shift) => {
          return sum + (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60);
        }, 0) || 0,
        trainingsCompleted: s.trainings?.length || 0,
      };
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_performance_overview') ? 'staff_performance_overview' : 'performance_overview',
      details: { merchantId, branchId, period },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'merchant:performanceOverview', { merchantId, branchId, period, overview }, `merchant:${merchantId}`);

    return overview;
  } catch (error) {
    logger.error('Error generating performance overview', { error: error.message });
    throw error;
  }
}

async function updateTrainingStatus(staffId, trainingId, status, io, auditService, socketService, notificationService, pointService) {
  try {
    if (!staffId || !trainingId || !status) {
      throw new Error('Invalid input: staffId, trainingId, and status are required');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [{ model: User, as: 'user' }, { model: Merchant, as: 'merchant' }],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');

    const training = await Training.findByPk(trainingId, { where: { staff_id: staffId } });
    if (!training) throw new Error('Training not found');

    if (!['in_progress', 'completed'].includes(status)) {
      throw new Error('Invalid status: must be in_progress or completed');
    }

    // Validate training category against staff types
    const staffTypes = staff.staff_types || [];
    let validCategory = false;
    for (const staffType of staffTypes) {
      const roleConstants = roleConstantsMap[staffType];
      if (roleConstants && roleConstants.TRAINING_MODULES.includes(training.category)) {
        validCategory = true;
        break;
      }
    }
    if (!validCategory) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_CERTIFICATION') ? 'INVALID_CERTIFICATION' : 'Invalid training category');

    await training.update({ status });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: 'staff_training_updated',
      details: { staffId, trainingId, status },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:trainingUpdated', { staffId, trainingId, status }, `staff:${staffId}`);

    if (status === 'completed') {
      const points = staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'training_completion')?.points || 20;
      await pointService.awardPoints(staff.user_id, 'training_completion', points);

      const notificationType = staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('training_reminder') ? 'training_reminder' : 'general';
      await notificationService.sendNotification({
        userId: staff.user_id,
        notificationType,
        messageKey: 'staff.training_completed',
        messageParams: { category: training.category },
        role: 'staff',
        module: 'performance',
        deliveryMethod: staff.user.notification_preferences?.[notificationType] || staffConstants.STAFF_NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
        languageCode: staff.merchant?.preferred_language || staff.user.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
      });
    }

    return training;
  } catch (error) {
    logger.error('Error updating training status', { error: error.message });
    throw error;
  }
}

module.exports = {
  monitorMetrics,
  generatePerformanceReports,
  distributeTraining,
  getStaffPerformanceOverview,
  updateTrainingStatus,
};