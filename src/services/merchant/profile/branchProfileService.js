'use strict';

const { MerchantBranch, Merchant, Address, sequelize } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mapService = require('@services/common/mapService');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5-minute cache

module.exports = {
  async createBranchProfile(merchantId, branchData, files = {}) {
    const transaction = await sequelize.transaction();
    try {
      // Validate input
      if (!merchantId || isNaN(merchantId)) {
        throw new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID');
      }
      if (!branchData || typeof branchData !== 'object') {
        throw new AppError('Invalid branch data', 400, 'INVALID_BRANCH_DATA');
      }
      if (!branchData.name || typeof branchData.name !== 'string') {
        throw new AppError('Branch name is required', 400, 'MISSING_BRANCH_NAME');
      }

      const merchant = await Merchant.findByPk(merchantId, { transaction });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const resolvedLocation = await mapService.resolveLocation({
        placeId: branchData.placeId,
        address: branchData.address,
        coordinates: branchData.coordinates,
      });

      let address = await Address.findOne({
        where: { placeId: resolvedLocation.placeId, user_id: merchant.user_id },
        transaction
      });

      if (!address) {
        address = await Address.create({
          user_id: merchant.user_id,
          formattedAddress: resolvedLocation.formattedAddress,
          placeId: resolvedLocation.placeId,
          latitude: resolvedLocation.latitude,
          longitude: resolvedLocation.longitude,
          components: resolvedLocation.components,
          countryCode: resolvedLocation.countryCode,
          validationStatus: 'VALID',
          validatedAt: new Date(),
        }, { transaction });
      }

      const operatingHours = branchData.operating_hours || {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;
      for (const day of days) {
        if (operatingHours[day]) {
          if (!timeFormat.test(operatingHours[day].open) || !timeFormat.test(operatingHours[day].close)) {
            throw new AppError(`Invalid time format for ${day}`, 400, 'INVALID_OPERATING_HOURS');
          }
        }
      }

      const media = { logo: null, banner: null, gallery: [] };
      if (files.logo) {
        media.logo = await imageService.uploadImage(merchantId, files.logo, 'logo');
      }
      if (files.banner) {
        media.banner = await imageService.uploadBannerImage(merchantId, files.banner, 'banner');
      }

      const branch = await MerchantBranch.create({
        merchant_id: merchantId,
        address_id: address.id,
        name: branchData.name,
        branch_code: `BR-${uuidv4().slice(0, 8)}`,
        contact_email: branchData.contact_email,
        contact_phone: branchData.contact_phone,
        address: resolvedLocation.formattedAddress,
        location: { type: 'Point', coordinates: [resolvedLocation.longitude, resolvedLocation.latitude] },
        operating_hours: operatingHours,
        delivery_radius: branchData.delivery_radius,
        payment_methods: branchData.payment_methods || [],
        media,
      }, { transaction });

      // Invalidate cache
      cache.del(`branch_list_${merchantId}`);
      
      await transaction.commit();
      logger.logApiEvent('Branch profile created', { merchantId, branchId: branch.id });
      return branch;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to create branch profile', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to create branch', 500, 'BRANCH_CREATION_FAILED');
    }
  },

  async getBranchProfile(branchId) {
    try {
      // Validate input
      if (!branchId || isNaN(branchId)) {
        throw new AppError('Invalid branch ID', 400, 'INVALID_BRANCH_ID');
      }

      // Check cache
      const cacheKey = `branch_profile_${branchId}`;
      const cachedBranch = cache.get(cacheKey);
      if (cachedBranch) {
        logger.info('Returning cached branch profile', { branchId });
        return cachedBranch;
      }

      const branch = await MerchantBranch.findByPk(branchId, {
        include: [
          { model: Merchant, as: 'merchant', attributes: ['id', 'business_name'] },
          { 
            model: Address, 
            as: 'addressRecord', 
            attributes: ['id', 'formattedAddress', 'latitude', 'longitude'] 
          },
        ],
      });

      if (!branch) {
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      const result = branch.toJSON();
      cache.set(cacheKey, result);

      logger.logApiEvent('Branch profile retrieved', { branchId });
      return result;
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve branch profile', { error: error.message, branchId });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve branch', 500, 'BRANCH_RETRIEVAL_FAILED');
    }
  },

  async updateBranchProfile(branchId, branchData, files = {}) {
    const transaction = await sequelize.transaction();
    try {
      // Validate input
      if (!branchId || isNaN(branchId)) {
        throw new AppError('Invalid branch ID', 400, 'INVALID_BRANCH_ID');
      }
      if (!branchData || typeof branchData !== 'object') {
        throw new AppError('Invalid branch data', 400, 'INVALID_BRANCH_DATA');
      }

      const branch = await MerchantBranch.findByPk(branchId, { transaction });
      if (!branch) {
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      let resolvedLocation;
      if (branchData.address || branchData.placeId || branchData.coordinates) {
        resolvedLocation = await mapService.resolveLocation({
          placeId: branchData.placeId,
          address: branchData.address,
          coordinates: branchData.coordinates,
        });
        branchData.address = resolvedLocation.formattedAddress;
        branchData.location = { type: 'Point', coordinates: [resolvedLocation.longitude, resolvedLocation.latitude] };

        const merchant = await Merchant.findByPk(branch.merchant_id, { transaction });
        let address = await Address.findOne({
          where: { placeId: resolvedLocation.placeId, user_id: merchant.user_id },
          transaction
        });

        if (!address) {
          address = await Address.create({
            user_id: merchant.user_id,
            formattedAddress: resolvedLocation.formattedAddress,
            placeId: resolvedLocation.placeId,
            latitude: resolvedLocation.latitude,
            longitude: resolvedLocation.longitude,
            components: resolvedLocation.components,
            countryCode: resolvedLocation.countryCode,
            validationStatus: 'VALID',
            validatedAt: new Date(),
          }, { transaction });
        }
        branchData.address_id = address.id;
      }

      if (branchData.operating_hours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;
        for (const day of days) {
          if (branchData.operating_hours[day]) {
            if (!timeFormat.test(branchData.operating_hours[day].open) || !timeFormat.test(branchData.operating_hours[day].close)) {
              throw new AppError(`Invalid time format for ${day}`, 400, 'INVALID_OPERATING_HOURS');
            }
          }
        }
      }

      const media = branch.media;
      if (files.logo) {
        if (media.logo) await imageService.deleteImage(branch.merchant_id, 'logo');
        media.logo = await imageService.uploadImage(branch.merchant_id, files.logo, 'logo');
      }
      if (files.banner) {
        if (media.banner) await imageService.deleteBannerImage(media.banner);
        media.banner = await imageService.uploadBannerImage(branch.merchant_id, files.banner, 'banner');
      }
      branchData.media = media;

      await branch.update(branchData, { transaction });

      // Invalidate cache
      cache.del(`branch_profile_${branchId}`);
      cache.del(`branch_list_${branch.merchant_id}`);

      await transaction.commit();
      logger.logApiEvent('Branch profile updated', { branchId, updatedFields: Object.keys(branchData) });
      return branch;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to update branch profile', { error: error.message, branchId });
      throw error instanceof AppError ? error : new AppError('Failed to update branch', 500, 'BRANCH_UPDATE_FAILED');
    }
  },

  async deleteBranchProfile(branchId) {
    const transaction = await sequelize.transaction();
    try {
      // Validate input
      if (!branchId || isNaN(branchId)) {
        throw new AppError('Invalid branch ID', 400, 'INVALID_BRANCH_ID');
      }

      const branch = await MerchantBranch.findByPk(branchId, { transaction });
      if (!branch) {
        throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
      }

      if (branch.media.logo) await imageService.deleteImage(branch.merchant_id, 'logo');
      if (branch.media.banner) await imageService.deleteBannerImage(branch.media.banner);

      await branch.destroy({ transaction });

      // Invalidate cache
      cache.del(`branch_profile_${branchId}`);
      cache.del(`branch_list_${branch.merchant_id}`);

      await transaction.commit();
      logger.logApiEvent('Branch profile deleted', { branchId });
      return true;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to delete branch profile', { error: error.message, branchId });
      throw error instanceof AppError ? error : new AppError('Failed to delete branch', 500, 'BRANCH_DELETION_FAILED');
    }
  },

  async listBranchProfiles(merchantId) {
    try {
      logger.info('Listing branch profiles', { merchantId, type: 'api' });

      const branches = await MerchantBranch.findAll({
        where: { merchant_id: merchantId },
        attributes: ['id', 'name', 'address', 'contact_email', 'contact_phone', 'is_active'],
        include: [
          {
            model: Address,
            as: 'addressRecord',
            attributes: ['id', 'formattedAddress', 'latitude', 'longitude'],
          },
        ],
      });

      // Convert to plain objects to avoid cloning issues
      const plainBranches = branches.map(branch => branch.get({ plain: true }));

      logger.logApiEvent('Branch profiles listed', { merchantId, count: plainBranches.length });
      return plainBranches;
    } catch (error) {
      logger.logErrorEvent('Failed to list branch profiles', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to list branches', 500, 'BRANCH_LIST_FAILED');
    }
  },

  async bulkUpdateBranches(merchantId, updateData) {
    const transaction = await sequelize.transaction();
    try {
      // Validate input
      if (!merchantId || isNaN(merchantId)) {
        throw new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID');
      }
      if (!Array.isArray(updateData) || updateData.length === 0) {
        throw new AppError('Invalid update data', 400, 'INVALID_UPDATE_DATA');
      }

      const merchant = await Merchant.findByPk(merchantId, { transaction });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const allowedFields = ['operating_hours', 'payment_methods', 'delivery_radius', 'is_active'];
      const updatedBranches = [];

      for (const update of updateData) {
        const { branchId, ...data } = update;
        if (!branchId || isNaN(branchId)) {
          throw new AppError('Invalid branch ID', 400, 'INVALID_BRANCH_ID');
        }

        const branch = await MerchantBranch.findByPk(branchId, { transaction });
        if (!branch || branch.merchant_id !== merchantId) {
          throw new AppError(`Invalid branch ID: ${branchId}`, 400, 'INVALID_BRANCH');
        }

        const filteredData = {};
        for (const [key, value] of Object.entries(data)) {
          if (allowedFields.includes(key)) {
            filteredData[key] = value;
          }
        }

        if (filteredData.operating_hours) {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;
          for (const day of days) {
            if (filteredData.operating_hours[day]) {
              if (!timeFormat.test(filteredData.operating_hours[day].open) || !timeFormat.test(filteredData.operating_hours[day].close)) {
                throw new AppError(`Invalid time format for ${day} in branch ${branchId}`, 400, 'INVALID_OPERATING_HOURS');
              }
            }
          }
        }

        await branch.update(filteredData, { transaction });
        updatedBranches.push(branch);

        // Invalidate cache for individual branch
        cache.del(`branch_profile_${branchId}`);
      }

      // Invalidate cache for branch list
      cache.del(`branch_list_${merchantId}`);

      await transaction.commit();
      logger.logApiEvent('Branches bulk updated', { merchantId, count: updatedBranches.length });
      return updatedBranches;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to bulk update branches', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to bulk update branches', 500, 'BRANCH_BULK_UPDATE_FAILED');
    }
  },
};