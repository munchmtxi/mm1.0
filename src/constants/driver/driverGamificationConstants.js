'use strict';

module.exports = {
  GAMIFICATION_ACTIONS: [
    // Mtxi (Ride Services)
    { action: 'ride_completion', name: 'Ride Completed', points: 15 },
    { action: 'shared_ride_completion', name: 'Shared Ride Completed', points: 20 },
    { action: 'timely_ride_pickup', name: 'Timely Ride Pickup', points: 10 },
    { action: 'ride_review_received', name: 'Ride Review Received', points: 5 },

    // Munch (Delivery Services)
    { action: 'delivery_completion', name: 'Delivery Completed', points: 12 },
    { action: 'batch_delivery', name: 'Batch Delivery Processed', points: 15 },
    { action: 'timely_delivery', name: 'Timely Delivery', points: 10 },
    { action: 'delivery_review_received', name: 'Delivery Review Received', points: 5 },

    // Mevents (Event Deliveries)
    { action: 'event_delivery_completion', name: 'Event Delivery Completed', points: 20 },
    { action: 'event_delivery_timely', name: 'Timely Event Delivery', points: 15 },

    // General Engagement
    { action: 'shift_commitment', name: 'Shift Commitment Met', points: 10 },
    { action: 'training_completion', name: 'Training Completed', points: 15 },
    { action: 'certification_upload', name: 'Certification Uploaded', points: 10 },
    { action: 'set_availability', name: 'Availability Set', points: 5 },
    { action: 'payout_request', name: 'Payout Requested', points: 5 },
    { action: 'location_update', name: 'Location Updated', points: 2 },
    { action: 'route_calculate', name: 'Route Calculated', points: 3 },
    { action: 'route_update', name: 'Route Updated', points: 3 },
    { action: 'eco_route_selected', name: 'Eco-Friendly Route Selected', points: 10 },
    { action: 'safety_report_submitted', name: 'Safety Report Submitted', points: 10 }
  ],
  GAMIFICATION_SETTINGS: {
    MAX_DAILY_ACTIONS: 50,
    POINTS_EXPIRY_DAYS: 365,
    LEADERBOARD_TYPES: ['global', 'regional', 'service_specific'],
    REWARD_CATEGORIES: ['cash_bonus', 'crypto_rewards', 'free_services', 'priority_tasks'],
    AI_PERSONALIZATION: true
  },
  ERROR_CODES: ['INVALID_ACTION', 'MAX_ACTIONS_EXCEEDED', 'INVALID_REWARD'],
  SUCCESS_MESSAGES: ['ACTION_RECORDED', 'POINTS_AWARDED', 'REWARD_REDEEMED']
};