'use strict';

module.exports = {
  GAMIFICATION_SETTINGS: {
    ENABLED: true, // Global toggle for gamification
    MAX_DAILY_ACTIONS: 100, // Max actions per day to prevent abuse
    POINTS_EXPIRY_DAYS: 365, // Points expire after 1 year
    LEADERBOARD_TYPES: ['global', 'regional', 'service_specific', 'merchant_specific', 'role_specific', 'branch_specific'], // Comprehensive scopes
    LEADERBOARD_UPDATE_FREQUENCY_HOURS: 24, // Daily updates
    REWARD_CATEGORIES: ['discounts', 'free_services', 'crypto_rewards', 'exclusive_access', 'cash_bonus', 'priority_tasks'], // Merged categories
    AI_PERSONALIZATION: true, // AI-driven reward suggestions
    SOCIAL_SHARING: ['leaderboard_rank', 'achievement_unlocked', 'reward_redeemed'], // Social sharing options
    OPT_IN_REQUIRED: true, // Users must opt in to participate
  },
  GAMIFICATION_ACTIONS: {
    // Customer Actions
    booking_created: { points: 50, description: 'Created a table booking', services: ['mtables'], roles: ['customer'] },
    booking_completed: { points: 100, description: 'Completed a table booking', services: ['mtables'], roles: ['customer'] },
    in_dining_order_placed: { points: 40, description: 'Placed an in-dining order', services: ['mtables'], roles: ['customer'] },
    in_dining_order_completed: { points: 80, description: 'Completed an in-dining order', services: ['mtables'], roles: ['customer'] },
    event_created: { points: 150, description: 'Created an event', services: ['mevents'], roles: ['customer', 'event_coordinator'] },
    event_attended: { points: 200, description: 'Attended an event', services: ['mevents'], roles: ['customer'] },
    room_booking_created: { points: 100, description: 'Booked a room', services: ['mstays'], roles: ['customer'] },
    room_booking_completed: { points: 250, description: 'Completed a room stay', services: ['mstays'], roles: ['customer'] },
    ride_requested: { points: 30, description: 'Requested a ride', services: ['mtxi'], roles: ['customer'] },
    ride_completed: { points: 70, description: 'Completed a ride', services: ['mtxi'], roles: ['customer'] },
    parking_booking_created: { points: 40, description: 'Booked a parking space', services: ['mpark'], roles: ['customer'] },
    parking_booking_completed: { points: 80, description: 'Completed a parking booking', services: ['mpark'], roles: ['customer'] },
    order_placed: { points: 30, description: 'Placed a delivery order', services: ['munch'], roles: ['customer'] },
    order_delivered: { points: 60, description: 'Order delivered', services: ['munch'], roles: ['customer'] },
    ticket_booked: { points: 50, description: 'Booked a ticket', services: ['mtickets'], roles: ['customer'] },
    ticket_used: { points: 100, description: 'Used a ticket', services: ['mtickets'], roles: ['customer'] },
    profile_updated: { points: 10, description: 'Updated profile', services: ['all'], roles: ['customer', 'admin', 'merchant', 'staff', 'driver', 'server', 'chef', 'manager', 'barista', 'housekeeping', 'event_coordinator'] },
    friend_invited: { points: 50, description: 'Invited a friend', services: ['social'], roles: ['customer'] },
    bill_split_completed: { points: 30, description: 'Completed a bill split', services: ['social'], roles: ['customer'] },
    social_post_shared: { points: 20, description: 'Shared a social post', services: ['social'], roles: ['customer'] },
    review_submitted: { points: 25, description: 'Submitted a review', services: ['all'], roles: ['customer'] },
    // Merchant Actions
    booking_confirmed: { points: 20, description: 'Confirmed a booking', services: ['mtables'], roles: ['merchant', 'restaurant', 'cafe', 'manager'] },
    event_approved: { points: 50, description: 'Approved an event', services: ['mevents'], roles: ['merchant', 'event_coordinator', 'ticket_provider'] },
    promotion_created: { points: 30, description: 'Created a promotion', services: ['all'], roles: ['merchant', 'restaurant', 'cafe', 'grocery', 'manager'] },
    // Staff Actions
    serve_table: { points: 30, description: 'Served a table', services: ['mtables'], roles: ['server', 'front_of_house'] },
    booking_assisted: { points: 20, description: 'Assisted a booking check-in', services: ['mtables'], roles: ['host', 'front_of_house'] },
    prepare_food: { points: 35, description: 'Prepared food', services: ['mtables', 'munch'], roles: ['chef', 'back_of_house'] },
    prepare_beverage: { points: 25, description: 'Prepared a beverage', services: ['mtables', 'munch'], roles: ['barista'] },
    clean_rooms: { points: 40, description: 'Cleaned a room', services: ['mstays'], roles: ['housekeeping'] },
    process_check_in_out: { points: 30, description: 'Processed check-in/out', services: ['mstays'], roles: ['front_desk', 'concierge'] },
    assist_parking: { points: 20, description: 'Assisted parking', services: ['mpark'], roles: ['car_park_operative'] },
    event_setup: { points: 50, description: 'Set up an event', services: ['mevents'], roles: ['event_staff', 'event_coordinator'] },
    // Driver Actions
    ride_accepted: { points: 20, description: 'Accepted a ride', services: ['mtxi'], roles: ['driver'] },
    ride_completed_driver: { points: 50, description: 'Completed a ride', services: ['mtxi'], roles: ['driver'] },
    order_delivered_driver: { points: 40, description: 'Delivered an order', services: ['munch'], roles: ['driver'] },
    // Admin Actions
    manage_users: { points: 30, description: 'Managed users', services: ['all'], roles: ['admin'] },
    event_moderated: { points: 40, description: 'Moderated an event', services: ['mevents'], roles: ['admin'] },
    configure_system: { points: 50, description: 'Configured system settings', services: ['all'], roles: ['admin'] },
  },
  BADGE_CRITERIA: {
    // Customer Badges
    table_explorer: { action: 'booking_created', count: 1, points: 50, level: 'Explorer', description: 'Made first table booking', services: ['mtables'], roles: ['customer'] },
    table_trailblazer: { action: 'booking_completed', count: 10, points: 1000, level: 'Trailblazer', description: 'Completed 10 table bookings', services: ['mtables'], roles: ['customer'] },
    dining_connoisseur: { action: 'in_dining_order_completed', count: 15, points: 1200, level: 'Master', description: 'Completed 15 in-dining orders', services: ['mtables'], roles: ['customer'] },
    event_maestro: { action: 'event_attended', count: 5, points: 1000, level: 'Master', description: 'Attended 5 events', services: ['mevents'], roles: ['customer'] },
    stay_nomad: { action: 'room_booking_created', count: 1, points: 100, level: 'Explorer', description: 'Booked first stay', services: ['mstays'], roles: ['customer'] },
    stay_voyager: { action: 'room_booking_completed', count: 5, points: 1250, level: 'Trailblazer', description: 'Completed 5 stays', services: ['mstays'], roles: ['customer'] },
    ride_navigator: { action: 'ride_completed', count: 10, points: 700, level: 'Trailblazer', description: 'Completed 10 rides', services: ['mtxi'], roles: ['customer'] },
    parking_pioneer: { action: 'parking_booking_completed', count: 10, points: 800, level: 'Trailblazer', description: 'Completed 10 parking bookings', services: ['mpark'], roles: ['customer'] },
    taste_trailblazer: { action: 'order_placed', count: 20, points: 600, level: 'Trailblazer', description: 'Placed 20 delivery orders', services: ['munch'], roles: ['customer'] },
    ticket_collector: { action: 'ticket_used', count: 10, points: 1000, level: 'Master', description: 'Used 10 tickets', services: ['mtickets'], roles: ['customer'] },
    social_influencer: { action: 'social_post_shared', count: 10, points: 200, level: 'Explorer', description: 'Shared 10 social posts', services: ['social'], roles: ['customer'] },
    community_leader: { action: 'friend_invited', count: 5, points: 250, level: 'Master', description: 'Invited 5 friends', services: ['social'], roles: ['customer'] },
    platform_legend: { action: 'all', points: 5000, level: 'Legend', description: 'Earned 5000 points across all actions', services: ['all'], roles: ['customer'] },
    // Merchant Badges
    booking_manager: { action: 'booking_confirmed', count: 20, points: 400, level: 'Trailblazer', description: 'Confirmed 20 bookings', services: ['mtables'], roles: ['merchant', 'restaurant', 'cafe', 'manager'] },
    event_host: { action: 'event_approved', count: 10, points: 500, level: 'Master', description: 'Approved 10 events', services: ['mevents'], roles: ['merchant', 'event_coordinator', 'ticket_provider'] },
    promo_creator: { action: 'promotion_created', count: 5, points: 150, level: 'Explorer', description: 'Created 5 promotions', services: ['all'], roles: ['merchant', 'restaurant', 'cafe', 'grocery', 'manager'] },
    // Staff Badges
    service_star: { action: 'serve_table', count: 20, points: 600, level: 'Trailblazer', description: 'Served 20 tables', services: ['mtables'], roles: ['server', 'front_of_house'] },
    kitchen_master: { action: 'prepare_food', count: 20, points: 700, level: 'Master', description: 'Prepared 20 food items', services: ['mtables', 'munch'], roles: ['chef', 'back_of_house'] },
    beverage_pro: { action: 'prepare_beverage', count: 15, points: 375, level: 'Explorer', description: 'Prepared 15 beverages', services: ['mtables', 'munch'], roles: ['barista'] },
    hospitality_hero: { action: 'clean_rooms', count: 10, points: 400, level: 'Trailblazer', description: 'Cleaned 10 rooms', services: ['mstays'], roles: ['housekeeping'] },
    checkin_pro: { action: 'process_check_in_out', count: 15, points: 450, level: 'Explorer', description: 'Processed 15 check-ins/outs', services: ['mstays'], roles: ['front_desk', 'concierge'] },
    parking_pro: { action: 'assist_parking', count: 15, points: 300, level: 'Explorer', description: 'Assisted 15 parking bookings', services: ['mpark'], roles: ['car_park_operative'] },
    event_setup_star: { action: 'event_setup', count: 5, points: 250, level: 'Trailblazer', description: 'Set up 5 events', services: ['mevents'], roles: ['event_staff', 'event_coordinator'] },
    // Driver Badges
    road_warrior: { action: 'ride_completed_driver', count: 20, points: 1000, level: 'Trailblazer', description: 'Completed 20 rides', services: ['mtxi'], roles: ['driver'] },
    delivery_expert: { action: 'order_delivered_driver', count: 15, points: 600, level: 'Trailblazer', description: 'Delivered 15 orders', services: ['munch'], roles: ['driver'] },
    // Admin Badges
    platform_guardian: { action: 'manage_users', count: 20, points: 600, level: 'Trailblazer', description: 'Managed 20 users', services: ['all'], roles: ['admin'] },
    event_overseer: { action: 'event_moderated', count: 10, points: 400, level: 'Master', description: 'Moderated 10 events', services: ['mevents'], roles: ['admin'] },
    system_master: { action: 'configure_system', count: 5, points: 250, level: 'Master', description: 'Configured system 5 times', services: ['all'], roles: ['admin'] },
  },
  REWARD_TIERS: {
    explorer: { min_points: 0, rewards: ['discounts', 'free_services'], roles: ['customer', 'merchant', 'staff', 'driver', 'admin', 'server', 'chef', 'manager', 'barista', 'housekeeping', 'event_coordinator', 'front_desk', 'car_park_operative'] },
    trailblazer: { min_points: 1000, rewards: ['discounts', 'free_services', 'cash_bonus'], roles: ['customer', 'merchant', 'staff', 'driver', 'admin', 'server', 'chef', 'manager', 'barista', 'housekeeping', 'event_coordinator', 'front_desk', 'car_park_operative'] },
    master: { min_points: 3000, rewards: ['discounts', 'free_services', 'cash_bonus', 'crypto_rewards', 'exclusive_access'], roles: ['customer', 'merchant', 'staff', 'driver', 'admin', 'server', 'chef', 'manager', 'barista', 'housekeeping', 'event_coordinator', 'front_desk', 'car_park_operative'] },
    legend: { min_points: 10000, rewards: ['discounts', 'free_services', 'cash_bonus', 'crypto_rewards', 'exclusive_access', 'priority_tasks'], roles: ['customer', 'merchant', 'staff', 'driver', 'admin', 'server', 'chef', 'manager', 'barista', 'housekeeping', 'event_coordinator', 'front_desk', 'car_park_operative'] },
  },
};