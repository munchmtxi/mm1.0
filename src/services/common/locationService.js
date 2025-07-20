'use strict';
const { Op } = require('sequelize');
const logger = require('@utils/logger');
const { googleMapsClient } = require('@config/googleMaps');
const {
  localizationServiceConstants,
  authConstants,
} = require('@constants/common');
const {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  COUNTRY_CURRENCY_MAP,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CITIES,
  DEFAULT_TIMEZONE,
  SUPPORTED_MAP_PROVIDERS,
} = require('@constants/common/localizationConstants');
const { MTABLES_CONSTANTS } = require('@constants/common/mtablesConstants');
const { MPARK_CONSTANTS } = require('@constants/common/mparkConstants');
const { MTXI_CONSTANTS } = require('@constants/common/mtxiConstants');
const { MUNCH_CONSTANTS } = require('@constants/common/munchConstants');
const {
  CUSTOMER_STATUSES,
  WALLET_CONSTANTS: CUSTOMER_WALLET_CONSTANTS,
  MTABLES_CONSTANTS: CUSTOMER_MTABLES_CONSTANTS,
  MUNCH_CONSTANTS: CUSTOMER_MUNCH_CONSTANTS,
  MTXI_CONSTANTS: CUSTOMER_MTXI_CONSTANTS,
  MPARK_CONSTANTS: CUSTOMER_MPARK_CONSTANTS,
} = require('@constants/customer/customerConstants');
const {
  DRIVER_STATUSES,
  MTXI_CONSTANTS: DRIVER_MTXI_CONSTANTS,
  MUNUCH_DELIVERY_CONSTANTS,
  WALLET_CONSTANTS: DRIVER_WALLET_CONSTANTS,
} = require('@constants/driver/driverConstants');
const {
  STAFF_STATUSES,
  STAFF_ROLES,
  STAFF_PERMISSIONS,
  STAFF_WALLET_CONSTANTS,
} = require('@constants/staff/staffConstants');
const {
  MERCHANT_TYPES,
  WALLET_CONSTANTS: MERCHANT_WALLET_CONSTANTS,
} = require('@constants/merchant/merchantConstants');
const {
  ADMIN_ROLES,
  ADMIN_STATUSES,
  WALLET_CONSTANTS: ADMIN_WALLET_CONSTANTS,
} = require('@constants/admin/adminCoreConstants');

module.exports = (sequelize) => {
  const { Address, Geofence, User, Customer, Merchant, Driver, Staff, Session, Device } = sequelize.models;

  class LocationService {
    static async resolveLocation({ coordinates, address, placeId, userId, role, merchantType }) {
      try {
        let resolvedAddress;
        const user = await User.findByPk(userId, {
          include: [
            { model: Customer, as: 'customer_profile' },
            { model: Merchant, as: 'merchant_profile' },
            { model: Driver, as: 'driver_profile' },
            { model: Staff, as: 'staff_profile' },
          ],
        });

        if (!user) throw new Error('User not found');
        if (!this.validateRoleAndMerchantType(role, merchantType, user)) throw new Error('Invalid role or merchant type');

        if (placeId) {
          resolvedAddress = await this.resolveFromPlaceId(placeId);
        } else if (coordinates) {
          resolvedAddress = await this.resolveFromCoordinates(coordinates);
        } else if (address) {
          resolvedAddress = await this.resolveFromAddress(address);
        } else {
          throw new Error('Invalid input: provide coordinates, address, or placeId');
        }

        resolvedAddress.user_id = userId;
        resolvedAddress.currency = this.resolveCurrency(resolvedAddress.countryCode);
        resolvedAddress.timezone = DEFAULT_TIMEZONE;
        resolvedAddress.city = this.resolveCity(resolvedAddress);
        return await this.validateAndStoreLocation(resolvedAddress, userId, role, merchantType);
      } catch (error) {
        logger.error('Error resolving location', { error: error.message, userId, role });
        throw error;
      }
    }

    static validateRoleAndMerchantType(role, merchantType, user) {
      if (role === ADMIN_ROLES.super_admin && user.staff_profile?.role === ADMIN_ROLES.super_admin) return true;
      if (role === 'customer' && user.customer_profile && CUSTOMER_STATUSES.includes(user.customer_profile.status)) return true;
      if (role === 'driver' && user.driver_profile && DRIVER_STATUSES.includes(user.driver_profile.status)) return true;
      if (role === 'staff' && user.staff_profile && STAFF_STATUSES.includes(user.staff_profile.status) && STAFF_ROLES[user.staff_profile.role]) return true;
      if (role === 'merchant' && user.merchant_profile && MERCHANT_TYPES.includes(merchantType) && user.merchant_profile.merchant_type === merchantType) return true;
      return false;
    }

    static resolveCurrency(countryCode) {
      return COUNTRY_CURRENCY_MAP[countryCode] || DEFAULT_CURRENCY;
    }

    static resolveCity({ latitude, longitude, countryCode }) {
      const cities = SUPPORTED_CITIES[countryCode] || [];
      return cities.length > 0 ? cities[0] : null;
    }

    static async resolveFromPlaceId(placeId) {
      const { data } = await googleMapsClient.placeDetails({ params: { place_id: placeId } });
      const result = data.result;
      const countryCode = result.address_components.find(c => c.types.includes('country'))?.short_name;
      if (!SUPPORTED_COUNTRIES.includes(countryCode)) throw new Error('Unsupported country');
      return {
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        components: result.address_components,
        countryCode,
        locationType: result.geometry.location_type,
        confidenceLevel: 'HIGH',
        mapProvider: SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps',
      };
    }

    static async resolveFromCoordinates({ latitude, longitude }) {
      const { data } = await googleMapsClient.reverseGeocode({ params: { latlng: [latitude, longitude] } });
      const result = data.results[0];
      const countryCode = result.address_components.find(c => c.types.includes('country'))?.short_name;
      if (!SUPPORTED_COUNTRIES.includes(countryCode)) throw new Error('Unsupported country');
      return {
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        latitude,
        longitude,
        components: result.address_components,
        countryCode,
        locationType: result.geometry.location_type,
        confidenceLevel: result.geometry.location_type === 'ROOFTOP' ? 'HIGH' : 'MEDIUM',
        mapProvider: SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps',
      };
    }

    static async resolveFromAddress(address) {
      const { data } = await googleMapsClient.geocode({ params: { address } });
      const result = data.results[0];
      const countryCode = result.address_components.find(c => c.types.includes('country'))?.short_name;
      if (!SUPPORTED_COUNTRIES.includes(countryCode)) throw new Error('Unsupported country');
      return {
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        components: result.address_components,
        countryCode,
        locationType: result.geometry.location_type,
        confidenceLevel: result.geometry.location_type === 'ROOFTOP' ? 'HIGH' : 'MEDIUM',
        mapProvider: SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps',
      };
    }

    static async validateAndStoreLocation(locationData, userId, role, merchantType) {
      const { formattedAddress, placeId, latitude, longitude, countryCode, city, currency } = locationData;
      let address = await Address.findOne({ where: { placeId, user_id: userId } });

      if (!address) {
        address = await Address.create({
          ...locationData,
          user_id: userId,
          validatedAt: new Date(),
          validationStatus: localizationServiceConstants.VALIDATION_STATUSES.VALID,
          currency: SUPPORTED_CURRENCIES.includes(currency) ? currency : DEFAULT_CURRENCY,
        });
      } else if (address.formattedAddress !== formattedAddress || address.currency !== currency) {
        address = await address.update({
          ...locationData,
          validatedAt: new Date(),
          currency: SUPPORTED_CURRENCIES.includes(currency) ? currency : DEFAULT_CURRENCY,
        });
      }

      await this.checkGeofence(address, role, merchantType);
      await this.updateRoleSpecificLocation(userId, address, role, merchantType);
      await this.updateSessionLocation(userId, address);
      return address;
    }

    static async checkGeofence(address, role, merchantType) {
      const geofences = await Geofence.scope('active').findAll({
        where: { merchantType: role === 'merchant' ? merchantType : null },
      });
      const point = { type: 'Point', coordinates: [address.longitude, address.latitude] };

      for (const geofence of geofences) {
        const isWithin = await this.isPointInPolygon(point, geofence.coordinates);
        if (isWithin) {
          logger.info('Location within geofence', { geofenceId: geofence.id, role, merchantType });
          return geofence;
        }
      }
      return null;
    }

    static async isPointInPolygon(point, polygon) {
      // Placeholder: Implement point-in-polygon logic with turf.js or similar
      return true;
    }

    static async updateRoleSpecificLocation(userId, address, role, merchantType) {
      const user = await User.findByPk(userId, {
        include: [
          { model: Customer, as: 'customer_profile' },
          { model: Merchant, as: 'merchant_profile' },
          { model: Driver, as: 'driver_profile' },
          { model: Staff, as: 'staff_profile' },
        ],
      });

      if (!user) throw new Error('User not found');

      if (user.customer_profile && role === 'customer') {
        if (!CUSTOMER_STATUSES.includes(user.customer_profile.status)) throw new Error('Invalid customer status');
        if (SUPPORTED_CITIES[address.countryCode]?.includes(address.city)) {
          await Customer.update(
            { default_address_id: address.id, address: address.formattedAddress, currency: address.currency },
            { where: { user_id: userId } }
          );
          if (CUSTOMER_MTABLES_CONSTANTS.SUPPORTED_MERCHANT_TYPES.includes(merchantType)) {
            if (address.latitude < -90 || address.latitude > 90 || address.longitude < -180 || address.longitude > 180) {
              throw new Error('Invalid coordinates for mtables booking');
            }
          }
        }
      }

      if (user.merchant_profile && role === 'merchant' && user.merchant_profile.merchant_type === merchantType) {
        if (!MERCHANT_TYPES.includes(merchantType)) throw new Error('Invalid merchant type');
        await Merchant.update(
          { address_id: address.id, address: address.formattedAddress, currency: address.currency },
          { where: { user_id: userId, merchant_type: merchantType } }
        );
        if (merchantType === 'parking_lot' && CUSTOMER_MPARK_CONSTANTS.PARKING_TYPES.includes('standard')) {
          if (!SUPPORTED_CITIES[address.countryCode]?.includes(address.city)) {
            throw new Error('Unsupported city for parking');
          }
        }
      }

      if (user.driver_profile && role === 'driver') {
        if (!DRIVER_STATUSES.includes(user.driver_profile.status)) throw new Error('Invalid driver status');
        if (address.city && SUPPORTED_CITIES[address.countryCode]?.includes(address.city)) {
          await Driver.update(
            {
              current_location: { type: 'Point', coordinates: [address.longitude, address.latitude] },
              currency: address.currency,
            },
            { where: { user_id: userId } }
          );
          if (DRIVER_MTXI_CONSTANTS.RIDE_TYPES.includes('standard') || MUNUCH_DELIVERY_CONSTANTS.DELIVERY_TYPES.includes('standard')) {
            if (address.latitude < -90 || address.latitude > 90 || address.longitude < -180 || address.longitude > 180) {
              throw new Error('Invalid coordinates for driver tasks');
            }
          }
        }
      }

      if (user.staff_profile && role === 'staff' && STAFF_ROLES[user.staff_profile.role]) {
        if (!STAFF_STATUSES.includes(user.staff_profile.status)) throw new Error('Invalid staff status');
        await Staff.update(
          {
            work_location: { type: 'Point', coordinates: [address.longitude, address.latitude] },
            currency: address.currency,
          },
          { where: { user_id: userId } }
        );
        if (STAFF_PERMISSIONS[user.staff_profile.role].includes('monitor_parking') && merchantType === 'parking_lot') {
          if (!SUPPORTED_CITIES[address.countryCode]?.includes(address.city)) {
            throw new Error('Unsupported city for parking operations');
          }
        }
      }

      await User.update(
        {
          google_location: { lat: address.latitude, lng: address.longitude },
          location_updated_at: new Date(),
          location_source: 'manual',
          currency: address.currency,
        },
        { where: { id: userId } }
      );
    }

    static async updateSessionLocation(userId, address) {
      await Session.update(
        {
          location: { lat: address.latitude, lng: address.longitude, currency: address.currency },
          last_active_at: new Date(),
          status: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        },
        {
          where: {
            user_id: userId,
            status: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
            expires_at: { [Op.gt]: new Date() },
          },
        }
      );
    }

    static async getNearbyAddresses({ latitude, longitude, radius = 5.0, role, merchantType }) {
      const allowedRoles = [ADMIN_ROLES.super_admin, 'customer', 'driver', 'staff', 'merchant'];
      if (!allowedRoles.includes(role)) throw new Error('Invalid role');
      if (role === 'merchant' && !MERCHANT_TYPES.includes(merchantType)) throw new Error('Invalid merchant type');

      const addresses = await Address.findAll({
        where: {
          validationStatus: localizationServiceConstants.VALIDATION_STATUSES.VALID,
          latitude: { [Op.between]: [latitude - 0.05 * (radius / 5), latitude + 0.05 * (radius / 5)] },
          longitude: { [Op.between]: [longitude - 0.05 * (radius / 5), longitude + 0.05 * (radius / 5)] },
        },
        include: [
          {
            model: User,
            as: 'user',
            include: [
              { model: Customer, as: 'customer_profile', where: role === 'customer' ? { status: CUSTOMER_STATUSES } : null },
              { model: Merchant, as: 'merchant_profile', where: role === 'merchant' ? { merchant_type: merchantType } : null },
              { model: Driver, as: 'driver_profile', where: role === 'driver' ? { status: DRIVER_STATUSES } : null },
              { model: Staff, as: 'staff_profile', where: role === 'staff' ? { status: STAFF_STATUSES } : null },
            ].filter(model => model.where !== null),
          },
        ],
      });

      return addresses.filter(address => {
        if (role === 'customer' && CUSTOMER_MTABLES_CONSTANTS.SUPPORTED_MERCHANT_TYPES.includes(merchantType)) {
          return CUSTOMER_MTABLES_CONSTANTS.BOOKING_STATUSES.includes('pending');
        }
        if (role === 'merchant' && merchantType === 'parking_lot') {
          return CUSTOMER_MPARK_CONSTANTS.PARKING_STATUSES.includes('available');
        }
        if (role === 'driver' && (DRIVER_MTXI_CONSTANTS.RIDE_STATUSES.includes('requested') || MUNUCH_DELIVERY_CONSTANTS.DELIVERY_STATUSES.includes('requested'))) {
          return true;
        }
        return true;
      });
    }
  }

  return LocationService;
};