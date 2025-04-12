const authRoutes = require('@routes/common/authRoutes');
const logger = require('@utils/logger');

module.exports = async (app) => {
  app.use('/api/v1/auth', authRoutes);

  app.use((req, res) => {
    logger.warn(`404: ${req.method} ${req.url}`);
    res.status(404).json({ status: 'error', message: 'Route not found' });
  });

  logger.info('Routes configured');
};