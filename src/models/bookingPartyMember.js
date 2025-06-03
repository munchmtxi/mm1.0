'use strict';

module.exports = (sequelize, DataTypes) => {
  const BookingPartyMember = sequelize.define(
    'BookingPartyMember',
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
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'invited',
        validate: { isIn: [['invited', 'accepted', 'declined', 'removed']] },
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
      tableName: 'BookingPartyMembers',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true, // Enables soft deletes
    }
  );

  BookingPartyMember.associate = models => {
    BookingPartyMember.belongsTo(models.Booking, { foreignKey: 'booking_id' });
    BookingPartyMember.belongsTo(models.Customer, { foreignKey: 'customer_id' });
  };

  return BookingPartyMember;
};