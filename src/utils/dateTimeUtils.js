// src/utils/dateTimeUtils.js
const { format, parseISO, isValid, differenceInSeconds, addDays, subDays, startOfDay, endOfDay, isBefore, isAfter } = require('date-fns');


function formatDate(date, pattern = 'yyyy-MM-dd HH:mm:ss') {
  if (typeof pattern !== 'string') {
    throw new Error('Invalid pattern: must be a string');
  }
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return format(parsedDate, pattern);
}


function isValidDate(date) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsedDate);
}

function getTimeDifference(start, end) {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return differenceInSeconds(endDate, startDate);
}


function addDaysToDate(date, days) {
  if (typeof days !== 'number' || isNaN(days)) {
    throw new Error('Invalid days: must be a number');
  }
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return addDays(parsedDate, days);
}


function subtractDaysFromDate(date, days) {
  if (typeof days !== 'number' || isNaN(days)) {
    throw new Error('Invalid days: must be a number');
  }
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return subDays(parsedDate, days);
}


function getStartOfDay(date) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return startOfDay(parsedDate);
}


function getEndOfDay(date) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date: provide a valid ISO string or Date object');
  }
  return endOfDay(parsedDate);
}


function isDateBefore(date1, date2) {
  const parsedDate1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const parsedDate2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  if (!isValid(parsedDate1) || !isValid(parsedDate2)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return isBefore(parsedDate1, parsedDate2);
}


function isDateAfter(date1, date2) {
  const parsedDate1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const parsedDate2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  if (!isValid(parsedDate1) || !isValid(parsedDate2)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return isAfter(parsedDate1, parsedDate2);
}


function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    throw new Error('Invalid seconds: must be a non-negative number');
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${secs}s`;
  return result.trim();
}


function getCurrentTimestamp() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}


function isWithinRange(date, start, end) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const parsedStart = typeof start === 'string' ? parseISO(start) : start;
  const parsedEnd = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(parsedDate) || !isValid(parsedStart) || !isValid(parsedEnd)) {
    throw new Error('Invalid dates: provide valid ISO strings or Date objects');
  }
  return !isBefore(parsedDate, parsedStart) && !isAfter(parsedDate, parsedEnd);
}

module.exports = {
  formatDate,
  isValidDate,
  getTimeDifference,
  addDaysToDate,
  subtractDaysFromDate,
  getStartOfDay,
  getEndOfDay,
  isDateBefore,
  isDateAfter,
  formatDuration,
  getCurrentTimestamp,
  isWithinRange
};