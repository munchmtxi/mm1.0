'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Channel extends Model {
    static associate(models) {
      this.belongsTo(models.MerchantBranch, { foreignKey: 'branch_id', as: 'branch' });
      this.hasMany(models.Message, { foreignKey: 'channel_id', as: 'messages' });
    }
  }

  Channel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'merchant_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('team', 'shift', 'manager'),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      modelName: 'Channel',
      tableName: 'channels',
      underscored: true,
      indexes: [
        { fields: ['branch_id'] },
        { fields: ['type'] },
      ],
    }
  );

  return Channel;
};