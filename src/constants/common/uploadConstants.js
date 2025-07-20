// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\constants\common\uploadConstants.js
'use strict';

module.exports = {
  ROLES: {
    CUSTOMER: 'customer',
    DRIVER: 'driver',
    STAFF: 'staff',
    MERCHANT: 'merchant',
    ADMIN: 'admin',
  },
  MERCHANT_TYPES: {
    TICKET_PROVIDER: 'ticket_provider',
    ACCOMMODATION_PROVIDER: 'accommodation_provider',
    PARKING_LOT: 'parking_lot',
    GENERAL: 'general',
  },
  UPLOAD_TYPES: {
    AVATAR: 'avatar', // User.avatar_url (customer, staff, admin); Driver.profile_picture_url
    LOGO: 'logo', // Merchant.logo_url
    BANNER: 'banner', // Merchant.banner_url
    PROMO_VIDEO: 'promo_video', // Merchant (assumed custom field)
    DRIVER_LICENSE: 'driver_license', // Driver.license_picture_url
    DOCUMENTS: 'documents', // Compliance/certifications for merchant, driver, customer, staff, admin
    REVIEW_PHOTOS: 'review_photos', // Review photos (per reviewConstants.js)
    REVIEW_VIDEOS: 'review_videos', // Review videos (per reviewConstants.js)
    DISPUTE_DOCUMENTS: 'dispute_documents', // Dispute evidence (per disputeConstants.js)
    MENU_PHOTOS: 'menu_photos', // Dining merchants (per reviewConstants.js)
  },
  ALLOWED_EXTENSIONS: {
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif'],
    VIDEOS: ['.mp4', '.mov'],
    DOCUMENTS: ['.pdf', '.doc', '.docx'],
  },
  MIME_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif'],
    VIDEOS: ['video/mp4', 'video/quicktime'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES_PER_REVIEW: 10, // From reviewConstants.js
    MAX_VIDEO_DURATION_SECONDS: 30, // From reviewConstants.js
    MAX_FILES: {
      avatar: 1,
      logo: 1,
      banner: 1,
      promo_video: 1,
      driver_license: 1,
      documents: 5,
      review_photos: 10,
      review_videos: 2,
      dispute_documents: 5,
      menu_photos: 10,
    },
  },
  UPLOAD_PATHS: {
    customer: {
      avatar: 'customer/avatars',
      documents: 'customer/documents',
      review_photos: 'customer/reviews',
      review_videos: 'customer/reviews',
      dispute_documents: 'customer/disputes',
    },
    driver: {
      avatar: 'driver/avatars', // Maps to profile_picture_url
      driver_license: 'driver/licenses',
      documents: 'driver/documents',
      review_photos: 'driver/reviews',
      review_videos: 'driver/reviews',
      dispute_documents: 'driver/disputes',
    },
    staff: {
      avatar: 'staff/avatars',
      documents: 'staff/documents',
      review_photos: 'staff/reviews',
      review_videos: 'staff/reviews',
      dispute_documents: 'staff/disputes',
    },
    merchant: {
      logo: 'merchant/{merchantType}/logos',
      banner: 'merchant/{merchantType}/banners',
      promo_video: 'merchant/{merchantType}/promo_videos',
      documents: 'merchant/{merchantType}/documents',
      review_photos: 'merchant/{merchantType}/reviews',
      review_videos: 'merchant/{merchantType}/reviews',
      dispute_documents: 'merchant/{merchantType}/disputes',
      menu_photos: 'menu_photos',
    },
    admin: {
      avatar: 'admin/avatars',
      documents: 'admin/documents',
      dispute_documents: 'admin/disputes',
    },
  },
  ERROR_CODES: {
    INVALID_FILE_DATA: 'INVALID_FILE_DATA',
    UNSUPPORTED_FILE_FORMAT: 'UNSUPPORTED_FILE_FORMAT',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_READ_FAILED: 'FILE_READ_FAILED',
    FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
    BANNER_UPLOAD_FAILED: 'BANNER_UPLOAD_FAILED',
    BANNER_DELETE_FAILED: 'BANNER_DELETE_FAILED',
    FILE_DELETE_FAILED: 'FILE_DELETE_FAILED',
    INVALID_VIDEO_DURATION: 'INVALID_VIDEO_DURATION',
    VIDEO_VALIDATION_FAILED: 'VIDEO_VALIDATION_FAILED',
    MAX_FILES_EXCEEDED: 'MAX_FILES_EXCEEDED',
  },
  SUCCESS_MESSAGES: {
    FILE_UPLOADED: 'File uploaded successfully.',
    FILE_DELETED: 'File deleted successfully.',
  },
};