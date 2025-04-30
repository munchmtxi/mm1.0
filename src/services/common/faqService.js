'use strict';
const logger = require('@utils/logger');

const getFAQs = async () => {
  // Mock implementation; replace with actual data source (e.g., database or static file)
  const faqs = [
    { question: 'How do I book a ride?', answer: 'Use the app to select pickup and dropoff locations.' },
    { question: 'What are the payment options?', answer: 'We accept mobile money and card payments.' },
    { question: 'Can I cancel a ride?', answer: 'Yes, you can cancel a ride before it starts, subject to our cancellation policy.' },
  ];
  logger.info('FAQs retrieved');
  return faqs;
};

module.exports = { getFAQs };