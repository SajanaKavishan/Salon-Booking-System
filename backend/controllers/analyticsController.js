const Appointment = require('../models/appointmentModel');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const User = require('../models/User');

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const FINAL_STATUSES = ['completed', 'rejected', 'cancelled'];
const STATUS_LABELS = {
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const RANGE_LABELS = {
  YTD: 'Year to date',
  FULL_YEAR: 'Full year',
  LAST_7_DAYS: 'Last 7 days',
  LAST_30_DAYS: 'Last 30 days',
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const endOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
};

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

const getAnalyticsDateWindow = ({ year, range, now = new Date() }) => {
  const currentYear = now.getFullYear();
  const requestedYear = Number(year ?? currentYear);

  if (
    !Number.isInteger(requestedYear) ||
    requestedYear < 2000 ||
    requestedYear > currentYear
  ) {
    const error = new Error(`Year must be between 2000 and ${currentYear}.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedRange = normalizeRange(range);
  let startDate;
  let endDate;

  const rollingRangeDays = getRollingRangeDays(normalizedRange);

  if (rollingRangeDays) {
    endDate = endOfDay(now);
    startDate = startOfDay(now);
    startDate.setDate(startDate.getDate() - (rollingRangeDays - 1));
  } else {
    startDate = startOfDay(new Date(requestedYear, 0, 1));
    endDate = endOfDay(new Date(requestedYear, 11, 31));

    if (normalizedRange === 'YTD' && requestedYear === currentYear) {
      endDate = endOfDay(now);
    }
  }

  return {
    year: requestedYear,
    range: normalizedRange,
    label: RANGE_LABELS[normalizedRange],
    startDate,
    endDate,
    startDateString: formatDate(startDate),
    endDateString: formatDate(endDate),
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
        year: {
          $toInt: { $substrBytes: ['$date', 0, 4] },
        },
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
    ? window.endDate.getMonth()
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
  const cursor = startOfDay(window.startDate);

  while (cursor <= window.endDate) {
    const dayKey = formatDate(cursor);
    trends.push({
      month: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: revenueMap.get(dayKey) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return trends;
};

const aggregateStaffPerformance = async (query = {}) => {
  const window = getAnalyticsDateWindow(query);

  return Staff.aggregate([
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
    {
      $project: {
        approvedReviews: 0,
      },
    },
    {
      $sort: {
        averageRating: -1,
        totalReviewsCount: -1,
        name: 1,
      },
    },
  ]);
};

const getAnalyticsSummary = async (req, res) => {
  try {
    const window = getAnalyticsDateWindow(req.query);
    const appointmentDateMatch = buildAppointmentDateMatch(window);
    const currentYear = new Date().getFullYear();

    const [
      totalAppointmentsResult,
      newClients,
      revenueByPeriod,
      availableYears,
    ] = await Promise.all([
      Appointment.aggregate([
        { $match: appointmentDateMatch },
        { $count: 'total' },
      ]),
      User.countDocuments({
        role: { $in: ['customer', 'user'] },
        ...buildCreatedAtMatch(window),
      }),
      Appointment.aggregate([
        {
          $match: {
            status: { $in: ['completed', 'Completed'] },
            ...appointmentDateMatch,
          },
        },
        ...(getRollingRangeDays(window.range)
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
              {
                $project: {
                  _id: 0,
                  day: '$_id',
                  revenue: 1,
                },
              },
              { $sort: { day: 1 } },
            ]
          : [
              {
                $group: {
                  _id: {
                    $month: {
                      $ifNull: [
                        '$bookingDate',
                        {
                          $dateFromString: {
                            dateString: '$date',
                            format: '%Y-%m-%d',
                          },
                        },
                      ],
                    },
                  },
                  revenue: { $sum: '$totalAmount' },
                },
              },
              {
                $project: {
                  _id: 0,
                  monthNumber: '$_id',
                  revenue: 1,
                },
              },
              { $sort: { monthNumber: 1 } },
            ]),
      ]),
      buildAvailableYears(currentYear),
    ]);

    const revenueTrends = getRollingRangeDays(window.range)
      ? buildDailyRevenueTrends(revenueByPeriod, window)
      : buildMonthlyRevenueTrends(revenueByPeriod, window);

    const totalRevenueYTD = revenueTrends.reduce(
      (total, item) => total + item.revenue,
      0
    );

    return res.status(200).json({
      selectedYear: window.year,
      selectedRange: window.range,
      rangeLabel: window.label,
      availableYears,
      totalRevenueYTD,
      totalAppointments: totalAppointmentsResult[0]?.total ?? 0,
      newClients,
      revenueTrends,
    });
  } catch (error) {
    console.error('Analytics Summary Error:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Server Error: Could not fetch analytics summary.',
    });
  }
};

const getTopServices = async (req, res) => {
  try {
    const window = getAnalyticsDateWindow(req.query);

    const topServices = await Appointment.aggregate([
      {
        $match: {
          ...buildAppointmentDateMatch(window),
          status: { $in: ['completed', 'confirmed', 'Completed', 'Confirmed'] },
        },
      },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services',
          bookings: { $sum: 1 },
        },
      },
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
      {
        $project: {
          _id: 0,
          name: '$service.name',
          bookings: 1,
        },
      },
    ]);

    return res.status(200).json(topServices);
  } catch (error) {
    console.error('Top Services Analytics Error:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Server Error: Could not fetch top services analytics.',
    });
  }
};

const getAppointmentStatus = async (req, res) => {
  try {
    const window = getAnalyticsDateWindow(req.query);
    const statusCounts = await Appointment.aggregate([
      {
        $match: {
          ...buildAppointmentDateMatch(window),
          status: {
            $in: [
              ...FINAL_STATUSES,
              'Completed',
              'Rejected',
              'Cancelled',
              'Canceled',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$status',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1,
        },
      },
    ]);

    const countByStatus = new Map();
    statusCounts.forEach(({ name, value }) => {
      const canonicalName = Appointment.normalizeStatus(name);
      countByStatus.set(canonicalName, (countByStatus.get(canonicalName) ?? 0) + value);
    });

    const appointmentStatus = FINAL_STATUSES.map((name) => ({
      name: STATUS_LABELS[name],
      value: countByStatus.get(name) ?? 0,
    }));

    return res.status(200).json(appointmentStatus);
  } catch (error) {
    console.error('Appointment Status Analytics Error:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Server Error: Could not fetch appointment status analytics.',
    });
  }
};

const getStaffPerformanceAnalytics = async (req, res) => {
  try {
    const staff = await aggregateStaffPerformance(req.query);
    return res.status(200).json(staff);
  } catch (error) {
    console.error('Get Staff Performance Error:', error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : 'Server Error: Could not fetch staff performance analytics.',
    });
  }
};

module.exports = {
  aggregateStaffPerformance,
  getAnalyticsDateWindow,
  getAnalyticsSummary,
  getAppointmentStatus,
  getStaffPerformanceAnalytics,
  getTopServices,
};
