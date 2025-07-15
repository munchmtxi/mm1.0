'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('@models');
const { InDiningOrder, Booking, Customer, MenuInventory, OrderItems, MerchantBranch, Merchant, Table, ProductModifier, ProductDiscount, ProductAttribute } = sequelize.models;
const mTablesConstants = require('@constants/common/mTablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

async function createPreOrder(data) {
  const { bookingId, customerId, branchId, items, staffId, ipAddress } = data;
  const transaction = await sequelize.transaction();

  try {
    // Validate booking with constants
    const booking = await Booking.findByPk(bookingId, {
      where: {
        customer_id: customerId,
        branch_id: branchId,
        status: mTablesConstants.BOOKING_STATUSES.filter(s => ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(s)),
        booking_type: mTablesConstants.BOOKING_TYPES.find(t => t === 'TABLE'),
      },
      include: [
        { 
          model: Table, 
          as: 'table', 
          where: { status: mTablesConstants.TABLE_STATUSES.find(s => s === 'AVAILABLE') } 
        },
        { 
          model: MerchantBranch, 
          as: 'branch', 
          include: [{ model: Merchant, as: 'merchant' }] 
        },
        { model: Customer, as: 'customer' },
      ],
      transaction,
    });
    if (!booking) {
      throw new AppError('Booking not found', 404, mTablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);
    }

    // Validate booking timing
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    if ((bookingDateTime - new Date()) / (1000 * 60) < mTablesConstants.ORDER_SETTINGS.MIN_PRE_ORDER_LEAD_TIME_MINUTES) {
      throw new AppError('Invalid booking time for pre-order', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Verify customer
    const customer = await Customer.findByPk(customerId, {
      include: [{ model: sequelize.models.User, as: 'user' }],
      transaction,
    });
    if (!customer) {
      throw new AppError('Invalid customer ID', 404, customerConstants.ERROR_CODES.INVALID_CUSTOMER);
    }

    // Check active bookings limit
    const activeBookings = await Booking.count({
      where: { 
        customer_id: customerId, 
        status: mTablesConstants.BOOKING_STATUSES.filter(s => ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(s)) 
      },
      transaction,
    });
    if (activeBookings >= customerConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_BOOKINGS) {
      throw new AppError('Max active bookings exceeded', 400, mTablesConstants.ERROR_TYPES.MAX_BOOKINGS_EXCEEDED);
    }

    // Verify branch and merchant
    const branch = await MerchantBranch.findByPk(branchId, {
      include: [
        { model: Merchant, as: 'merchant' },
        { model: sequelize.models.Address, as: 'addressRecord' },
      ],
      transaction,
    });
    if (!branch || branch.merchant_id !== booking.merchant_id || !merchantConstants.MERCHANT_TYPES.includes(branch.merchant.business_type)) {
      throw new AppError('Invalid branch or merchant', 404, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Verify staff if provided
    const staff = staffId
      ? await sequelize.models.Staff.findOne({
          where: { 
            id: staffId, 
            branch_id: branchId, 
            availability_status: mTablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.find(s => s === 'AVAILABLE'),
            staff_type: staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.find(t => ['server', 'host', 'manager'].includes(t)),
          },
          transaction,
        })
      : null;
    if (staffId && !staff) {
      throw new AppError('Invalid staff ID', 400, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    // Validate items
    if (!items?.length || items.length > mTablesConstants.CART_SETTINGS.MAX_ITEMS_PER_CART) {
      throw new AppError('Invalid number of items', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }
    for (const item of items) {
      if (item.quantity < mTablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || 
          item.quantity > mTablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
        throw new AppError('Invalid item quantity', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
      }
    }

    // Fetch menu items
    const menuItems = await MenuInventory.findAll({
      where: {
        id: items.map(item => item.menu_item_id),
        availability_status: mTablesConstants.ORDER_STATUSES.find(s => s === 'PENDING') ? 'in-stock' : 'in-stock',
        branch_id: branchId,
        is_published: true,
      },
      include: [
        {
          model: ProductDiscount,
          as: 'discounts',
          where: { is_active: true, start_date: { [Op.lte]: new Date() }, end_date: { [Op.gte]: new Date() } },
          required: false,
        },
        { model: ProductModifier, as: 'modifiers' },
        { model: ProductAttribute, as: 'attributes' },
        { model: sequelize.models.ProductCategory, as: 'category' },
      ],
      transaction,
    });
    if (menuItems.length !== items.length) {
      throw new AppError('Invalid menu items', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Calculate total amount and validate items
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);

      // Check dietary preferences
      if (customer.preferences?.dietary && menuItem.attributes?.length) {
        const dietaryConflicts = menuItem.attributes.some(attr => 
          customerConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(attr.type) && 
          customer.preferences.dietary.includes(attr.type) && !attr.value
        );
        if (dietaryConflicts) {
          throw new AppError(`Item ${menuItem.name} conflicts with dietary preferences`, 400, customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
        }
      }

      // Validate customizations
      if (item.customization) {
        const modifierIds = item.customization.map(c => c.modifier_id);
        const modifiers = await ProductModifier.findAll({
          where: { 
            id: modifierIds, 
            menu_item_id: item.menu_item_id,
            type: mTablesConstants.MODIFIER_TYPES,
          },
          transaction,
        });
        if (modifiers.length !== modifierIds.length) {
          throw new AppError('Invalid item customizations', 400, mTablesConstants.ERROR_TYPES.INVALID_MODIFIER);
        }
      }

      // Calculate price
      let price = menuItem.calculateFinalPrice();
      if (item.customization) {
        item.customization.forEach(c => {
          const modifier = menuItem.modifiers.find(m => m.id === c.modifier_id);
          if (modifier) {
            price += modifier.price_adjustment;
          }
        });
      }
      totalAmount += price * item.quantity;
      orderItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        customization: item.customization || null,
      });
    }

    // Validate total amount
    if (totalAmount < mTablesConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT) {
      throw new AppError('Order amount too low', 400, mTablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    }

    // Generate order number
    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate estimated completion time
    const estimatedCompletionTime = new Date(
      Date.now() + Math.max(...menuItems.map(mi => mi.preparation_time_minutes || merchantConstants.BUSINESS_SETTINGS.DEFAULT_PREP_TIME_MINUTES)) * 60 * 1000
    );

    // Create pre-order
    const order = await InDiningOrder.create({
      customer_id: customerId,
      branch_id: branchId,
      table_id: booking.table_id,
      staff_id: staff?.id || booking.staff_id,
      order_number: orderNumber,
      status: mTablesConstants.ORDER_STATUSES.find(s => s === 'PENDING'),
      preparation_status: mTablesConstants.IN_DINING_STATUSES.find(s => s === 'PREPARING'),
      total_amount: totalAmount,
      currency: branch.merchant.currency || customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CURRENCIES.find(c => c === 'MWK'),
      notes: customer.preferences?.dietary ? `Dietary: ${customer.preferences.dietary.join(', ')}` : null,
      is_pre_order: true,
      estimated_completion_time: estimatedCompletionTime,
    }, { transaction });

    // Create order items
    await OrderItems.bulkCreate(
      orderItems.map(item => ({
        order_id: order.id,
        ...item,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      { transaction }
    );

    // Update booking
    await booking.update(
      {
        selected_items: items,
        status: mTablesConstants.BOOKING_STATUSES.find(s => s === 'CHECKED_IN'),
      },
      { transaction }
    );

    // Log audit
    await sequelize.models.AuditLog.create({
      type: mTablesConstants.AUDIT_TYPES.PRE_ORDER_CREATED,
      entity_id: order.id,
      entity_type: 'in_dining_order',
      details: { customerId, bookingId, branchId, totalAmount },
    }, { transaction });

    await transaction.commit();
    logger.info('Pre-order created', { orderId: order.id, customerId, bookingId });
    return order;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating pre-order', { error: error.message });
    throw error;
  }
}

module.exports = { createPreOrder };