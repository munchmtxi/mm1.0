// MerchantSettings.js
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class MerchantSettings extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
      this.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
      this.hasMany(models.MerchantBranch, { foreignKey: 'merchant_settings_id', as: 'branches', constraints: false });
    }
  }

  MerchantSettings.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      merchant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['merchant']],
          msg: 'Role must be merchant',
        },
      },
      merchant_type: {
        type: DataTypes.ENUM(
          'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery',
          'parking_lot', 'restaurant', 'accommodation_provider', 'ticket_provider'
        ),
        allowNull: false,
      },
      business_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: (instance) => {
          const type = instance.merchant_type;
          const defaults = {
            bookings: false,
            delivery: false,
            pickup: false,
            prepTimeMinutes: 0,
            ui: 'generic',
            tasks: [],
            services: [],
            ai_enabled_features: [],
            social_media_integration: ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'telegram'],
          };
          if (type === 'ticket_provider') {
            return {
              ...defaults,
              bookings: true,
              ticket_sale: true,
              prepTimeMinutes: 5,
              ui: 'ticketing',
              services: ['mtickets', 'mevents'],
              tasks: ['manage_ticket_bookings', 'process_ticket_sales', 'handle_inquiries', 'coordinate_events'],
              ai_enabled_features: ['ticket_optimization', 'price_optimization', 'event_recommendations', 'bundle_suggestions', 'attendance_prediction'],
            };
          } else if (type === 'restaurant') {
            return {
              ...defaults,
              bookings: true,
              delivery: true,
              pickup: true,
              prepTimeMinutes: 8,
              ui: 'full_service',
              services: ['mtables', 'munch', 'mevents', 'mpark'],
              tasks: ['prep_order', 'check_in', 'serve_table', 'resolve_dispute', 'customer_support', 'event_setup', 'monitor_parking'],
              ai_enabled_features: ['menu_suggestions', 'inventory_management', 'customer_support'],
              dining_experiences: ['casual', 'fine_dining', 'family', 'outdoor', 'bar', 'pop_up'],
              menu_styles: ['a_la_carte', 'prix_fixe', 'buffet', 'tasting_menu', 'family_style'],
              ambiance_types: ['romantic', 'modern', 'rustic', 'lively', 'cozy'],
            };
          } else if (type === 'parking_lot') {
            return {
              ...defaults,
              bookings: true,
              ui: 'parking_management',
              services: ['mpark'],
              tasks: ['reserve_space', 'check_in_vehicle', 'monitor_space', 'resolve_dispute', 'customer_support', 'process_payments'],
              ai_enabled_features: ['space_optimization', 'customer_support'],
              space_types: ['standard', 'accessible', 'ev_charging', 'oversized', 'premium', 'private', 'motorbike'],
              security_features: ['cctv', 'guarded', 'gated', 'lighting', 'patrolled', 'none'],
              access_types: ['keypad', 'ticket', 'app', 'manual', 'license_plate', 'nfc'],
              egress_types: ['automatic', 'manual', 'open'],
            };
          } else if (type === 'grocery') {
            return {
              ...defaults,
              delivery: true,
              pickup: true,
              prepTimeMinutes: 8,
              ui: 'pickup_delivery',
              services: ['munch', 'mpark'],
              tasks: ['stock_shelves', 'pick_order', 'update_inventory', 'customer_support', 'monitor_parking'],
              ai_enabled_features: ['product_suggestions', 'inventory_management', 'customer_support'],
              product_categories: ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'packaged', 'household', 'beverages', 'personal_care'],
            };
          } else if (type === 'dark_kitchen') {
            return {
              ...defaults,
              delivery: true,
              prepTimeMinutes: 15,
              ui: 'delivery_only',
              services: ['munch'],
              tasks: ['prep_order', 'packaging', 'customer_support'],
              ai_enabled_features: ['menu_suggestions', 'inventory_management', 'customer_support'],
              virtual_brands: { max_brands: 10, brand_types: ['single_cuisine', 'multi_cuisine'] },
              cuisine_types: ['italian', 'mexican', 'indian', 'chinese', 'african', 'brazilian', 'fusion', 'fast_food', 'american'],
            };
          } else if (type === 'caterer') {
            return {
              ...defaults,
              bookings: true,
              delivery: true,
              prepTimeMinutes: 30,
              ui: 'event_based',
              services: ['munch', 'mevents'],
              tasks: ['prep_order', 'event_setup', 'client_consultation', 'customer_support'],
              ai_enabled_features: ['menu_optimizer', 'guest_count_estimator', 'dietary_suggestions'],
              event_menu_types: ['buffet', 'plated', 'family_style', 'canape', 'food_station'],
              service_types: ['full_service', 'drop_off'],
              event_scale: ['small', 'medium', 'large'],
            };
          } else if (type === 'cafe') {
            return {
              ...defaults,
              bookings: true,
              delivery: true,
              pickup: true,
              prepTimeMinutes: 8,
              ui: 'quick_service',
              services: ['mtables', 'munch', 'mpark'],
              tasks: ['prepare_beverage', 'prepare_food', 'check_in', 'customer_support', 'monitor_parking'],
              ai_enabled_features: ['menu_suggestions', 'customer_support'],
              beverage_types: ['coffee', 'tea', 'juice', 'smoothie', 'soft_drink', 'specialty_drink'],
              food_types: ['pastry', 'sandwich', 'salad', 'snack'],
              ambiance_types: ['cozy', 'modern', 'outdoor', 'work_friendly'],
            };
          } else if (type === 'butcher') {
            return {
              ...defaults,
              pickup: true,
              prepTimeMinutes: 5,
              ui: 'pickup',
              services: ['munch'],
              tasks: ['prepare_meat', 'update_inventory', 'customize_order', 'package_order', 'customer_support'],
              ai_enabled_features: ['cut_suggestions', 'preparation_suggestions'],
              meat_types: ['beef', 'chicken', 'lamb', 'pork', 'goat', 'game'],
              preparation_types: ['raw', 'trimmed', 'marinated', 'ground', 'sausage', 'cured', 'smoked'],
              source_types: ['local', 'regional', 'imported'],
            };
          } else if (type === 'bakery') {
            return {
              ...defaults,
              delivery: true,
              pickup: true,
              prepTimeMinutes: 8,
              ui: 'pickup_delivery',
              services: ['munch'],
              tasks: ['prep_order', 'bake_product', 'package_order', 'customize_order', 'customer_support'],
              ai_enabled_features: ['menu_suggestions', 'customer_support'],
              product_types: ['bread', 'pastry', 'cake', 'cookie', 'dessert', 'savory'],
              baking_schedules: ['daily', 'pre_order', 'event_based'],
            };
          } else if (type === 'accommodation_provider') {
            return {
              ...defaults,
              bookings: true,
              prepTimeMinutes: 30,
              ui: 'generic',
              services: ['mstays'],
              tasks: ['process_check_in_out', 'clean_rooms', 'handle_inquiries', 'coordinate_services'],
              ai_enabled_features: ['recommendations', 'scheduling', 'room_optimization', 'customer_support', 'sustainability_scorer'],
              room_types: ['single', 'double', 'suite', 'deluxe', 'family', 'accessible'],
            };
          }
          return defaults;
        },
      },
      dietary_specialties: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: (instance) => {
          const type = instance.merchant_type;
          if (['restaurant', 'grocery', 'dark_kitchen', 'caterer', 'cafe', 'bakery'].includes(type)) {
            return ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'];
          } else if (type === 'butcher') {
            return ['halal', 'organic', 'grass_fed', 'free_range'];
          } else if (type === 'accommodation_provider') {
            return ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'paleo'];
          }
          return [];
        },
        validate: {
          isIn: [[
            'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher',
            'low_carb', 'organic', 'low_sugar', 'grass_fed', 'free_range', 'paleo',
          ]],
        },
      },
      wallet_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          payment_methods: ['wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'],
          payment_statuses: ['pending', 'completed', 'failed', 'refunded'],
          payout_settings: {
            min_payout_amount: 5,
            max_payout_amount: 10000,
            max_payout_frequency_days: 7,
            supported_payout_methods: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
            crypto_wallets: ['BTC', 'ETH', 'USDT'],
            payout_processing_time_hours: 24,
          },
        },
      },
      branch_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          max_branches: 100,
          max_login_sessions: 5,
          session_timeout_minutes: 60,
          two_factor_auth: { enabled: true, methods: ['sms', 'email', 'authenticator_app'] },
        },
      },
      staff_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: (instance) => {
          const type = instance.merchant_type;
          const defaults = {
            roles: [],
            permissions: [],
            task_types: [],
            shift_settings: { min_shift_hours: 2, max_shift_hours: 14, max_shifts_per_week: 7, ai_shift_scheduling: true },
          };
          if (type === 'ticket_provider') {
            return {
              ...defaults,
              roles: ['manager', 'ticket_agent', 'event_coordinator', 'customer_support'],
              permissions: ['manage_ticket_bookings', 'process_ticket_sales', 'handle_inquiries', 'coordinate_events', 'view_analytics', 'process_refunds'],
              task_types: ['process_ticket_sale', 'check_ticket', 'handle_inquiry', 'setup_event', 'coordinate_vendors', 'process_refund'],
            };
          } else if (type === 'restaurant') {
            return {
              ...defaults,
              roles: ['chef', 'server', 'manager', 'host', 'bartender', 'customer_service', 'car_park_operative', 'front_of_house'],
              permissions: ['manage_bookings', 'process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'serve_table', 'event_setup', 'process_payments', 'handle_complaints', 'monitor_parking', 'assist_parking'],
              task_types: ['prep_order', 'check_in', 'serve_table', 'event_setup', 'customer_support', 'bartending', 'parking_check_in', 'parking_assist'],
            };
          } else if (type === 'parking_lot') {
            return {
              ...defaults,
              roles: ['car_park_operative', 'manager', 'security', 'customer_service'],
              permissions: ['manage_parking_bookings', 'check_in_vehicle', 'monitor_spaces', 'process_payments', 'view_analytics', 'manage_staff', 'handle_complaints', 'assist_parking', 'report_issues'],
              task_types: ['reserve_space', 'check_in_vehicle', 'monitor_space', 'resolve_dispute', 'customer_support', 'process_payment', 'parking_assist', 'report_issue'],
            };
          } else if (type === 'grocery') {
            return {
              ...defaults,
              roles: ['stock_clerk', 'manager', 'picker', 'cashier', 'customer_service', 'car_park_operative', 'front_of_house'],
              permissions: ['process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'stock_shelves', 'pick_order', 'process_payments', 'handle_complaints', 'monitor_parking', 'assist_parking'],
              task_types: ['stock_shelves', 'pick_order', 'update_inventory', 'process_checkout', 'customer_support', 'parking_check_in', 'parking_assist'],
            };
          } else if (type === 'dark_kitchen') {
            return {
              ...defaults,
              roles: ['chef', 'manager', 'packager', 'customer_service', 'driver'],
              permissions: ['process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'process_payments', 'handle_complaints', 'process_deliveries'],
              task_types: ['prep_order', 'packaging', 'customer_support', 'delivery_handover'],
            };
          } else if (type === 'caterer') {
            return {
              ...defaults,
              roles: ['chef', 'manager', 'event_staff', 'consultant', 'customer_service', 'driver'],
              permissions: ['process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'event_setup', 'client_consultation', 'process_payments', 'handle_complaints', 'process_deliveries'],
              task_types: ['prep_order', 'event_setup', 'client_consultation', 'customer_support', 'delivery_handover'],
            };
          } else if (type === 'cafe') {
            return {
              ...defaults,
              roles: ['barista', 'manager', 'front_of_house', 'customer_service', 'car_park_operative'],
              permissions: ['manage_bookings', 'process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'prepare_beverage', 'prepare_food', 'process_payments', 'handle_complaints', 'monitor_parking', 'assist_parking'],
              task_types: ['prepare_beverage', 'prepare_food', 'check_in', 'customer_support', 'parking_check_in', 'parking_assist'],
            };
          } else if (type === 'butcher') {
            return {
              ...defaults,
              roles: ['butcher', 'manager', 'packager', 'customer_service'],
              permissions: ['process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'prepare_meat', 'customize_order', 'process_payments', 'handle_complaints'],
              task_types: ['prepare_meat', 'update_inventory', 'customize_order', 'package_order', 'customer_support'],
            };
          } else if (type === 'bakery') {
            return {
              ...defaults,
              roles: ['baker', 'manager', 'packager', 'customer_service', 'driver'],
              permissions: ['process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'bake_product', 'customize_order', 'process_payments', 'handle_complaints', 'process_deliveries'],
              task_types: ['prep_order', 'bake_product', 'package_order', 'customize_order', 'customer_support', 'delivery_handover'],
            };
          } else if (type === 'accommodation_provider') {
            return {
              ...defaults,
              roles: ['front_desk', 'housekeeping', 'concierge', 'event_staff', 'consultant', 'front_of_house', 'back_of_house', 'manager'],
              permissions: ['manage_bookings', 'process_check_in_out', 'handle_support_requests', 'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues', 'clean_rooms', 'report_maintenance', 'update_room_status', 'handle_inquiries', 'provide_recommendations', 'coordinate_services', 'event_setup', 'serve_event', 'client_consultation', 'customize_stays', 'update_room_inventory', 'manage_supplies', 'manage_staff', 'approve_withdrawals', 'audit_operations', 'train_staff'],
              task_types: ['check_in_out', 'booking_update', 'resolve_dispute', 'handle_inquiry', 'clean_room', 'report_maintenance', 'update_room_status', 'provide_recommendations', 'coordinate_services', 'event_setup', 'serve_event', 'client_consultation', 'customize_stays', 'update_room_inventory', 'maintenance_request', 'approve_withdrawal', 'manage_schedule', 'view_analytics', 'audit_operations', 'train_staff'],
            };
          }
          return defaults;
        },
      },
      analytics_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          metrics: ['order_volume', 'revenue', 'customer_retention'],
          report_formats: ['pdf', 'csv', 'json', 'dashboard'],
          data_retention_days: 730,
          recommendation_categories: [],
        },
      },
      notification_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          notification_types: ['order_confirmation', 'payment_confirmation', 'support_response', 'social_media_post'],
          delivery_methods: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
          priority_levels: ['low', 'medium', 'high', 'urgent'],
          max_notifications_per_hour: 20,
          retry_attempts: 5,
          retry_interval_seconds: 30,
        },
      },
      compliance_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: (instance) => {
          const type = instance.merchant_type;
          const defaults = {
            regulatory_requirements: ['business_license'],
            certification_statuses: ['pending', 'approved', 'rejected', 'expired'],
            data_protection_standards: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
            certification_expiry_days: 365,
            audit_frequency_days: 90,
            audit_types: [],
          };
          if (['restaurant', 'grocery', 'dark_kitchen', 'caterer', 'cafe', 'butcher', 'bakery'].includes(type)) {
            return {
              ...defaults,
              regulatory_requirements: ['food_safety', 'health_permit', 'business_license', 'halal_certification', 'kosher_certification'],
              audit_types: ['order_processed', 'inventory_updated', 'payment_processed'],
            };
          } else if (type === 'parking_lot') {
            return {
              ...defaults,
              regulatory_requirements: ['business_license', 'parking_permit', 'fire_safety'],
              audit_types: ['booking_confirmed', 'check_in_processed', 'payment_processed', 'parking_booking_confirmed'],
            };
          } else if (type === 'accommodation_provider') {
            return {
              ...defaults,
              regulatory_requirements: ['hospitality_license', 'sustainability_certification'],
              audit_types: ['booking_processed', 'check_in_out_processed', 'room_maintenance_reported', 'stay_booked', 'stay_updated', 'stay_cancelled', 'dispute_resolved', 'sustainability_audit'],
            };
          } else if (type === 'ticket_provider') {
            return {
              ...defaults,
              regulatory_requirements: ['ticket_license', 'event_safety', 'accessibility', 'data_protection'],
              audit_types: ['ticket_sold', 'payment_processed', 'ticket_cancelled', 'event_updated'],
            };
          }
          return defaults;
        },
      },
      accessibility_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          supported_accessibility_features: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands'],
          font_size_range: { min: 10, max: 28 },
        },
      },
      gamification_settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          gamification_actions: [
            { action: 'order_processed', name: 'Order Processed', points: 10 },
            { action: 'customer_review_received', name: 'Customer Review Received', points: 10 },
            { action: 'social_post_shared', name: 'Social Post Shared', points: 8 },
          ],
          gamification_settings: {
            max_daily_actions: 50,
            points_expiry_days: 365,
            leaderboard_types: ['global', 'regional', 'merchant_specific'],
            reward_categories: ['cash_bonus', 'crypto_rewards', 'free_services'],
            ai_personalization: true,
          },
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MerchantSettings',
      tableName: 'merchant_settings',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id', 'role_id', 'merchant_id'] }],
    }
  );

  return MerchantSettings;
};