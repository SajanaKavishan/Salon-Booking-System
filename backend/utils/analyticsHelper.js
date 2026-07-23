const Appointment = require('../models/appointmentModel');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { getSalonDateTime } = require('./salonTime');

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const FINAL_STATUSES = ['completed', 'rejected', 'cancelled', 'no-show'];
const STATUS_LABELS = {
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  'no-show': 'No-Show',
};
const RANGE_LABELS = {
  YTD: 'Year to date',
  FULL_YEAR: 'Full year',
  LAST_7_DAYS: 'Last 7 days',
  LAST_30_DAYS: 'Last 30 days',
};
const ANALYTICS_STATUS_VALUES = [
  ...FINAL_STATUSES,
  'Completed',
  'Rejected',
  'Cancelled',
  'Canceled',
  'CANCELLED_BY_SALON',
  'Cancelled by Salon',
  'No-Show',
  'No Show',
];

const normalizeRange = (range) => {
  const normalizedRange = String(range || 'YTD')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (['FULL_YEAR', 'FULLYEAR', 'YEAR'].includes(normalizedRange)) return 'FULL_YEAR';
  if (['LAST_7_DAYS', 'LAST_7', '7_DAYS'].includes(normalizedRange)) return 'LAST_7_DAYS';
  if (['LAST_30_DAYS', 'LAST_30', '30_DAYS'].includes(normalizedRange)) return 'LAST_30_DAYS';
  return 'YTD';
};

const getRollingRangeDays = (range) => {
  if (range === 'LAST_7_DAYS') return 7;
  if (range === 'LAST_30_DAYS') return 30;
  return null;
};

const getAnalyticsDateWindow = ({ year, range, now = new Date() } = {}) => {
  const salonNow = getSalonDateTime(now);
  const currentYear = salonNow.year;
  const requestedYear = Number(year ?? currentYear);

  if (
    !Number.isInteger(requestedYear)
    || requestedYear < 2000
    || requestedYear > currentYear
  ) {
    const error = new Error(`Year must be between 2000 and ${currentYear}.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedRange = normalizeRange(range);
  const rollingRangeDays = getRollingRangeDays(normalizedRange);
  let startDateTime;
  let endDateTime;

  if (rollingRangeDays) {
    endDateTime = salonNow.endOf('day');
    startDateTime = salonNow.startOf('day').minus({ days: rollingRangeDays - 1 });
  } else {
    startDateTime = salonNow
      .set({ year: requestedYear, month: 1, day: 1 })
      .startOf('day');
    endDateTime = salonNow
      .set({ year: requestedYear, month: 12, day: 31 })
      .endOf('day');

    if (normalizedRange === 'YTD' && requestedYear === currentYear) {
      endDateTime = salonNow.endOf('day');
    }
  }

  return {
    year: requestedYear,
    range: normalizedRange,
    label: RANGE_LABELS[normalizedRange],
    startDate: startDateTime.toUTC().toJSDate(),
    endDate: endDateTime.toUTC().toJSDate(),
    startDateString: startDateTime.toISODate(),
    endDateString: endDateTime.toISODate(),
  };
};

const buildAppointmentDateMatch = (window) => ({
  $or: [
    {
      bookingDate: {
        $gte: window.startDate,
        $lte: window.endDate,
      },
    },
    {
      date: {
        $gte: window.startDateString,
        $lte: window.endDateString,
      },
    },
  ],
});

const buildCreatedAtMatch = (window) => ({
  createdAt: {
    $gte: window.startDate,
    $lte: window.endDate,
  },
});

const buildAvailableYears = async (currentYear) => {
  const completedYears = await Appointment.aggregate([
    {
      $match: {
        status: { $in: ['completed', 'Completed'] },
        date: { $type: 'string' },
      },
    },
    {
      $project: {
        year: { $toInt: { $substrBytes: ['$date', 0, 4] } },
      },
    },
    { $group: { _id: '$year' } },
    { $sort: { _id: -1 } },
  ]);

  return Array.from(
    new Set([currentYear, ...completedYears.map(({ _id }) => _id)])
  ).sort((firstYear, secondYear) => secondYear - firstYear);
};

const buildMonthlyRevenueTrends = (revenueByMonth, window) => {
  const revenueMap = new Map(
    revenueByMonth.map(({ monthNumber, revenue }) => [monthNumber, revenue])
  );
  const endMonth = window.range === 'YTD'
    ? getSalonDateTime(window.endDate).month - 1
    : 11;

  return MONTH_NAMES.slice(0, endMonth + 1).map((month, index) => ({
    month,
    revenue: revenueMap.get(index + 1) ?? 0,
  }));
};

const buildDailyRevenueTrends = (revenueByDay, window) => {
  const revenueMap = new Map(
    revenueByDay.map(({ day, revenue }) => [day, revenue])
  );
  const trends = [];
  let cursor = getSalonDateTime(window.startDate).startOf('day');
  const endDateTime = getSalonDateTime(window.endDate).endOf('day');

  while (cursor.toMillis() <= endDateTime.toMillis()) {
    const dayKey = cursor.toISODate();
    trends.push({
      month: cursor.toFormat('MMM d'),
      revenue: revenueMap.get(dayKey) ?? 0,
    });
    cursor = cursor.plus({ days: 1 });
  }

  return trends;
};

const buildRevenueAggregationPipeline = ({ appointmentDateMatch, rollingRange }) => ([
  {
    $match: {
      status: { $in: ['completed', 'Completed'] },
      ...appointmentDateMatch,
    },
  },
  ...(rollingRange
    ? [
        {
          $group: {
            _id: {
              $ifNull: [
                '$date',
                { $dateToString: { format: '%Y-%m-%d', date: '$bookingDate' } },
              ],
            },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $project: { _id: 0, day: '$_id', revenue: 1 } },
        { $sort: { day: 1 } },
      ]
    : [
        {
          $group: {
            _id: {
              $month: {
                $ifNull: [
                  '$bookingDate',
                  { $dateFromString: { dateString: '$date', format: '%Y-%m-%d' } },
                ],
              },
            },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $project: { _id: 0, monthNumber: '$_id', revenue: 1 } },
        { $sort: { monthNumber: 1 } },
      ]),
]);

const getAnalyticsSummaryData = async (query = {}) => {
  const window = getAnalyticsDateWindow(query);
  const appointmentDateMatch = buildAppointmentDateMatch(window);
  const currentYear = getSalonDateTime().year;
  const rollingRange = Boolean(getRollingRangeDays(window.range));

  const [totalAppointmentsResult, newClients, revenueByPeriod, availableYears] = await Promise.all([
    Appointment.aggregate([
      { $match: appointmentDateMatch },
      { $count: 'total' },
    ]),
    User.countDocuments({
      role: { $in: ['customer', 'user'] },
      ...buildCreatedAtMatch(window),
    }),
    Appointment.aggregate(buildRevenueAggregationPipeline({
      appointmentDateMatch,
      rollingRange,
    })),
    buildAvailableYears(currentYear),
  ]);

  const revenueTrends = rollingRange
    ? buildDailyRevenueTrends(revenueByPeriod, window)
    : buildMonthlyRevenueTrends(revenueByPeriod, window);

  return {
    selectedYear: window.year,
    selectedRange: window.range,
    rangeLabel: window.label,
    availableYears,
    totalRevenueYTD: revenueTrends.reduce((total, item) => total + item.revenue, 0),
    totalAppointments: totalAppointmentsResult[0]?.total ?? 0,
    newClients,
    revenueTrends,
  };
};

const getLegacyAnalyticsSummaryData = async ({ requestedYear, currentYear }) => {
  const yearStart = `${requestedYear}-01-01`;
  const yearEnd = `${requestedYear}-12-31`;

  const [totalAppointments, newClients, revenueByMonth, availableYears] = await Promise.all([
    Appointment.countDocuments(),
    User.countDocuments({ role: { $in: ['customer', 'user'] } }),
    Appointment.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'Completed'] },
          date: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: {
            $month: {
              $dateFromString: { dateString: '$date', format: '%Y-%m-%d' },
            },
          },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $project: { _id: 0, monthNumber: '$_id', revenue: 1 } },
      { $sort: { monthNumber: 1 } },
    ]),
    buildAvailableYears(currentYear),
  ]);
  const revenueMap = new Map(
    revenueByMonth.map(({ monthNumber, revenue }) => [monthNumber, revenue])
  );
  const revenueTrends = MONTH_NAMES.map((month, index) => ({
    month,
    revenue: revenueMap.get(index + 1) ?? 0,
  }));

  return {
    selectedYear: requestedYear,
    availableYears,
    totalRevenueYTD: revenueTrends.reduce((total, item) => total + item.revenue, 0),
    totalAppointments,
    newClients,
    revenueTrends,
  };
};

const getTopServicesData = async ({ query = {}, applyDateWindow = true } = {}) => {
  const dateMatch = applyDateWindow
    ? buildAppointmentDateMatch(getAnalyticsDateWindow(query))
    : null;
  const pipeline = [];

  if (dateMatch) {
    pipeline.push({
      $match: {
        ...dateMatch,
        status: { $in: ['completed', 'confirmed', 'Completed', 'Confirmed'] },
      },
    });
  }

  pipeline.push(
    { $unwind: '$services' },
    { $group: { _id: '$services', bookings: { $sum: 1 } } },
    {
      $lookup: {
        from: Service.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'service',
      },
    },
    { $unwind: '$service' },
    { $sort: { bookings: -1, _id: 1 } },
    { $limit: 5 },
    { $project: { _id: 0, name: '$service.name', bookings: 1 } }
  );

  return Appointment.aggregate(pipeline);
};

const getAppointmentStatusData = async ({ query = {}, applyDateWindow = true } = {}) => {
  const dateMatch = applyDateWindow
    ? buildAppointmentDateMatch(getAnalyticsDateWindow(query))
    : {};
  const statusCounts = await Appointment.aggregate([
    {
      $match: {
        ...dateMatch,
        status: { $in: ANALYTICS_STATUS_VALUES },
      },
    },
    { $group: { _id: '$status', value: { $sum: 1 } } },
    { $project: { _id: 0, name: '$_id', value: 1 } },
  ]);
  const countByStatus = new Map();

  statusCounts.forEach(({ name, value }) => {
    const normalizedName = Appointment.normalizeStatus(name);
    const canonicalName = normalizedName === 'CANCELLED_BY_SALON'
      ? 'cancelled'
      : normalizedName === 'no show'
        ? 'no-show'
        : normalizedName;
    countByStatus.set(canonicalName, (countByStatus.get(canonicalName) ?? 0) + value);
  });

  return FINAL_STATUSES.map((name) => ({
    name: STATUS_LABELS[name],
    value: countByStatus.get(name) ?? 0,
  }));
};

const aggregateStaffPerformance = async (query = {}) => {
  const window = getAnalyticsDateWindow(query);

  return Staff.aggregate([
    { $match: { isActive: { $ne: false }, isDeleted: { $ne: true } } },
    {
      $lookup: {
        from: Appointment.collection.name,
        let: { staffId: '$_id' },
        pipeline: [
          {
            $match: {
              ...buildAppointmentDateMatch(window),
              $expr: {
                $and: [
                  { $eq: ['$isReviewApproved', true] },
                  { $ne: ['$rating', null] },
                  {
                    $or: [
                      { $eq: ['$stylist', '$$staffId'] },
                      { $eq: ['$staffId', '$$staffId'] },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: 'approvedReviews',
      },
    },
    {
      $addFields: {
        totalReviewsCount: { $size: '$approvedReviews' },
        averageRating: {
          $cond: [
            { $gt: [{ $size: '$approvedReviews' }, 0] },
            { $round: [{ $avg: '$approvedReviews.rating' }, 1] },
            0,
          ],
        },
      },
    },
    { $project: { approvedReviews: 0 } },
    { $sort: { averageRating: -1, totalReviewsCount: -1, name: 1 } },
  ]);
};

module.exports = {
  aggregateStaffPerformance,
  getAnalyticsDateWindow,
  getAnalyticsSummaryData,
  getAppointmentStatusData,
  getLegacyAnalyticsSummaryData,
  getTopServicesData,
};
