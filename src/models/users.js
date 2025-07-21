'use strict';
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      this.hasOne(models.Wallet, { foreignKey: 'user_id', as: 'wallet' });
      this.belongsTo(models.User, { as: 'managed_by', foreignKey: 'manager_id' });
      this.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
      this.hasMany(models.PasswordHistory, { foreignKey: 'user_id', as: 'password_history' });
      this.hasMany(models.Session, { foreignKey: 'user_id', as: 'sessions' });
      this.hasMany(models.AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
      this.hasMany(models.mfaTokens, { foreignKey: 'user_id', as: 'mfaTokens' });
      this.hasMany(models.GamificationPoints, { foreignKey: 'user_id', as: 'gamificationPoints' });
      this.hasMany(models.Verification, { foreignKey: 'user_id', as: 'verifications' });
      this.hasMany(models.Tip, { foreignKey: 'recipient_id', as: 'tips_received' });
      this.hasMany(models.Address, { foreignKey: 'user_id', as: 'addresses' });
      this.belongsTo(models.Address, { foreignKey: 'address_id', as: 'default_address' }); // Added
      this.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' }); // Added
      this.hasMany(models.UserReward, { foreignKey: 'user_id', as: 'userRewards' });
      this.hasMany(models.UserBadge, { foreignKey: 'user_id', as: 'userBadges' });
      this.belongsToMany(models.Role, { through: 'UserRole', foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
      this.hasMany(models.OfflineCache, { foreignKey: 'user_id', as: 'offlineCaches' });
      this.hasOne(models.Merchant, { foreignKey: 'user_id', as: 'merchant' }); // Added
      this.hasOne(models.Customer, { foreignKey: 'user_id', as: 'customer' }); // Added
      this.hasOne(models.Driver, { foreignKey: 'user_id', as: 'driver' }); // Added
      this.hasOne(models.Admin, { foreignKey: 'user_id', as: 'admin' }); // Added
    }

    getFullName() {
      return `${this.first_name} ${this.last_name}`;
    }

    valid_password(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  User.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      first_name: { type: DataTypes.STRING, allowNull: false },
      last_name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      password: { type: DataTypes.STRING, allowNull: false },
      phone_number: { type: DataTypes.STRING, allowNull: true },
      role: {
        type: DataTypes.ENUM('admin', 'customer', 'merchant', 'staff', 'driver'),
        allowNull: false,
        defaultValue: 'customer',
        comment: 'Primary role for permissions and gamification',
      },
      address_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'addresses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      country_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'countries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      total_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Tracks total accumulated points for gamification',
      },
      opt_in_gamification: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'User opt-in status for gamification participation',
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: ['password', 'two_factor_secret', 'mfa_backup_codes', 'password_reset_token', 'password_reset_expires'],
        },
      },
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
            user.last_password_change = new Date();
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            if (!user.password.match(/^\$2[aby]\$/)) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
              user.last_password_change = new Date();
            }
          }
        },
      },
    }
  );

  return User;
};