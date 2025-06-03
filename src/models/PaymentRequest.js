'use strict';

module.exports = (sequelize, DataTypes) => {
  const PaymentRequest = sequelize.define(
    'PaymentRequest',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Bookings', key: 'id' },
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Customers', key: 'id' },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [['pending', 'accepted', 'declined', 'completed']] },
      },
      reference: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'PaymentRequests',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
    }
  );

  PaymentRequest.associate = models => {
    PaymentRequest.belongsTo(models.Booking, { foreignKey: 'booking_id' });
    PaymentRequest.belongsTo(models.Customer, { foreignKey: 'customer_id' });
  };

  return PaymentRequest;
};