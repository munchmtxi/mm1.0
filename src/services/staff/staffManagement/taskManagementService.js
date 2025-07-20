'use strict';

const { Task, Staff, Shift, Merchant, ParkingBooking, Order, InDiningOrder, Booking } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const localizationConstants = require('@constants/common/localizationConstants');
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
const { isValidDate, isDateBefore } = require('@utils/dateTimeUtils');
const { handleServiceError } = require('@utils/errorHandling');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

// Map staff roles to their respective constants for task type validation
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

async function assignTask(staffId, task) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: [{ model: Merchant, as: 'merchant' }, { model: Shift, as: 'staff' }],
    });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    // Validate staff type
    const staffType = staff.staff_types[0];
    if (!staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(staffType)) {
      throw new AppError('Invalid staff type', 400, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    // Validate merchant type
    const merchantType = staff.merchant?.business_type;
    if (!merchantConstants.MERCHANT_TYPES.includes(merchantType)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    // Validate task type for staff role and merchant service
    const roleConstants = roleConstantsMap[staffType] || staffConstants;
    const validTasks = roleConstants.TASK_TYPES?.munch || roleConstants.TASK_TYPES?.mtables || roleConstants.TASK_TYPES?.mtxi || roleConstants.TASK_TYPES?.mpark || roleConstants.TASK_TYPES?.all || [];
    if (!validTasks.includes(task.taskType)) {
      throw new AppError('Invalid task type for role', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    // Validate merchant type compatibility with staff role
    const supportedMerchantTypes = roleConstants.SUPPORTED_MERCHANT_TYPES || staffConstants.STAFF_ROLES[staffType]?.supportedMerchantTypes || [];
    if (!supportedMerchantTypes.includes(merchantType)) {
      throw new AppError('Staff role not supported for merchant type', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    // Validate due date
    if (!isValidDate(task.dueDate) || isDateBefore(task.dueDate, new Date())) {
      throw new AppError('Due date must be valid and in the future', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    // Check if staff has an active shift
    const activeShift = await Shift.findOne({
      where: { staff_id: staffId, status: 'active' },
    });
    if (!activeShift) {
      throw new AppError('Staff has no active shift', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    // Validate shift duration against role-specific shift settings
    const shiftSettings = roleConstants.SHIFT_SETTINGS || staffConstants.STAFF_SHIFT_SETTINGS;
    const shiftDurationHours = (new Date(activeShift.end_time) - new Date(activeShift.start_time)) / (1000 * 60 * 60);
    if (shiftDurationHours < shiftSettings.MIN_SHIFT_HOURS || shiftDurationHours > shiftSettings.MAX_SHIFT_HOURS) {
      throw new AppError('Shift duration out of allowed range', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    // Validate certifications
    const requiredCertifications = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staffType] || roleConstants.CERTIFICATIONS?.REQUIRED || [];
    if (requiredCertifications.length && !staff.certifications?.every(cert => requiredCertifications.includes(cert))) {
      throw new AppError('Missing required certifications', 400, staffConstants.STAFF_ERROR_CODES.MISSING_CERTIFICATIONS);
    }

    // Create task
    const newTask = await Task.create({
      staff_id: staffId,
      branch_id: staff.branch_id,
      task_type: task.taskType,
      description: task.description,
      status: staffConstants.STAFF_TASK_STATUSES[0], // 'assigned'
      due_date: task.dueDate,
      order_id: task.orderId || null,
      in_dining_order_id: task.inDiningOrderId || null,
      booking_id: task.bookingId || null,
      parking_booking_id: task.parkingBookingId || null,
    });

    // Link task to relevant models
    if (task.orderId) {
      const order = await Order.findByPk(task.orderId);
      if (order) await order.update({ staff_id: staffId });
    } else if (task.inDiningOrderId) {
      const inDiningOrder = await InDiningOrder.findByPk(task.inDiningOrderId);
      if (inDiningOrder) await inDiningOrder.update({ staff_id: staffId });
    } else if (task.bookingId) {
      const booking = await Booking.findByPk(task.bookingId);
      if (booking) await booking.update({ staff_id: staffId });
    } else if (task.parkingBookingId) {
      const parkingBooking = await ParkingBooking.findByPk(task.parkingBookingId);
      if (parkingBooking) await parkingBooking.update({ staff_id: staffId });
    }

    return newTask;
  } catch (error) {
    logger.logErrorEvent('Task assignment failed', { error: error.message, staffId, taskType: task.taskType });
    throw handleServiceError('assignTask', error, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

async function trackTaskProgress(taskId) {
  try {
    const task = await Task.findByPk(taskId, {
      include: [{ model: Staff, as: 'staff', include: [{ model: Merchant, as: 'merchant' }] }],
    });
    if (!task) {
      throw new AppError('Task not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    // Validate task status
    if (!staffConstants.STAFF_TASK_STATUSES.includes(task.status)) {
      throw new AppError('Invalid task status', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    const progress = {
      taskId,
      status: task.status,
      dueDate: task.due_date,
      completedAt: task.completed_at,
    };

    // Update related models on task completion
    if (task.status === staffConstants.STAFF_TASK_STATUSES[2]) { // 'completed'
      const staffType = task.staff?.staff_types[0];
      const roleConstants = roleConstantsMap[staffType] || staffConstants;

      if (task.task_type === 'process_delivery' && task.order_id) {
        const order = await Order.findByPk(task.order_id);
        if (order) await order.update({ status: 'completed', actual_delivery_time: new Date() });
      } else if (task.task_type === 'prep_order' && task.in_dining_order_id) {
        const inDiningOrder = await InDiningOrder.findByPk(task.in_dining_order_id);
        if (inDiningOrder) await inDiningOrder.update({ preparation_status: 'completed' });
      } else if (task.task_type === 'table_assignment' && task.booking_id) {
        const booking = await Booking.findByPk(task.booking_id);
        if (booking) await booking.update({ status: 'seated', seated_at: new Date() });
      } else if (task.task_type === 'parking_check' && task.parking_booking_id) {
        const parkingBooking = await ParkingBooking.findByPk(task.parking_booking_id);
        if (parkingBooking) await parkingBooking.update({ status: 'OCCUPIED' });
      } else if (task.task_type === 'stock_shelves' && staffType === 'stock_clerk') {
        const successMessage = stockClerkConstants.SUCCESS_MESSAGES.find(msg => msg === 'inventory_updated');
        if (!successMessage) {
          throw new AppError('Invalid task completion outcome', 400, stockClerkConstants.ERROR_CODES.TASK_ASSIGNMENT_FAILED);
        }
      } else if (task.task_type === 'process_checkout' && staffType === 'cashier') {
        const successMessage = cashierConstants.SUCCESS_MESSAGES.find(msg => msg === 'checkout_processed');
        if (!successMessage) {
          throw new AppError('Invalid task completion outcome', 400, cashierConstants.ERROR_CODES.TASK_ASSIGNMENT_FAILED);
        }
      } else if (task.task_type === 'prepare_meat' && staffType === 'butcher') {
        const successMessage = butcherConstants.SUCCESS_MESSAGES.find(msg => msg === 'meat_order_prepared');
        if (!successMessage) {
          throw new AppError('Invalid task completion outcome', 400, butcherConstants.ERROR_CODES.TASK_ASSIGNMENT_FAILED);
        }
      } else if (task.task_type === 'prepare_beverage' && staffType === 'barista') {
        const successMessage = baristaConstants.SUCCESS_MESSAGES.find(msg => msg === 'beverage_prepared');
        if (!successMessage) {
          throw new AppError('Invalid task completion outcome', 400, baristaConstants.ERROR_CODES.TASK_ASSIGNMENT_FAILED);
        }
      } else if (task.task_type === 'monitor_parking' && staffType === 'car_park_operative') {
        const successMessage = carParkOperativeConstants.SUCCESS_MESSAGES.find(msg => msg === 'parking_assisted');
        if (!successMessage) {
          throw new AppError('Invalid task completion outcome', 400, carParkOperativeConstants.ERROR_CODES.TASK_ASSIGNMENT_FAILED);
        }
      } else if (task.task_type === 'resolve_dispute' && staffType === 'manager') {
        const successMessage = managerConstants.SUCCESS_MESSAGES.find(msg => msg === 'dispute_resolved');
        if (!successMessage) {
          throw new AppError('Invalid task completion outcome', 400, managerConstants.ERROR_CODES.TASK_ASSIGNMENT_FAILED);
        }
      }
    }

    return progress;
  } catch (error) {
    logger.logErrorEvent('Task progress tracking failed', { error: error.message, taskId });
    throw handleServiceError('trackTaskProgress', error, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

async function notifyTaskDelay(taskId) {
  try {
    const task = await Task.findByPk(taskId, {
      include: [{ model: Staff, as: 'staff' }],
    });
    if (!task) {
      throw new AppError('Task not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    // Validate task status for delay eligibility
    if (![staffConstants.STAFF_TASK_STATUSES[0], staffConstants.STAFF_TASK_STATUSES[1]].includes(task.status)) {
      throw new AppError('Task not eligible for delay notification', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    // Update task status to delayed
    await task.update({ status: staffConstants.STAFF_TASK_STATUSES[3] }); // 'delayed'

    return { taskId, status: task.status };
  } catch (error) {
    logger.logErrorEvent('Task delay notification failed', { error: error.message, taskId });
    throw handleServiceError('notifyTaskDelay', error, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

module.exports = {
  assignTask,
  trackTaskProgress,
  notifyTaskDelay,
};