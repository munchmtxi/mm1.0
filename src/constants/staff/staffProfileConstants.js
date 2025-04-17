'use strict';

module.exports = {
  ACTIONS: {
    PROFILE: {
      UPDATE: 'update',
      PICTURE_UPLOAD: 'picture_upload',
      PICTURE_DELETE: 'picture_delete',
      PASSWORD_CHANGE: 'password_change',
      PERFORMANCE_UPDATE: 'performance_update',
      AVAILABILITY_UPDATE: 'availability_update',
    },
  },
  STATUSES: {
    AVAILABILITY: ['available', 'busy', 'on_break', 'offline'],
  },
};