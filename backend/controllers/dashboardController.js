const Appointment = require('../models/appointmentModel');
const LeaveRequest = require('../models/LeaveRequest');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const User = require('../models/User');

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
const ANALYTICS_STATUSES = ['completed', 'rejected', 'cancelled'];
const STATUS_LABELS = {
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// @desc    Get summary metrics for the admin dashboard
// @route   GET /api/dashboard/summary
// @access  Private/Admin
const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayKey = formatDate(today);
    const todayAppointmentQuery = {
      $or: [
        { date: todayKey },
        { bookingDate: { $gte: today, $lt: tomorrow } },
      ],
    };

    const [
      todaysAppointments,
      pendingBookings,
      pendingLeaveRequests,
      todaysRevenueResult,
      totalStaff,
      approvedLeaveUserIds,
    ] = await Promise.all([
      Appointment.countDocuments(todayAppointmentQuery),
      Appointment.countDocuments({ status: { $in: ['pending', 'Pending'] } }),
      LeaveRequest.countDocuments({ status: { $in: ['Pending', 'pending'] } }),
      Appointment.aggregate([
        {
          $match: {
            status: { $in: ['completed', 'Completed'] },
            ...todayAppointmentQuery,
          },
        },
        {
          $group: {
            _id: null,
            todaysRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      Staff.countDocuments(),
      LeaveRequest.find({
        status: { $in: ['Approved', 'approved'] },
        startDate: { $lt: tomorrow },
        endDate: { $gte: today },
      }).distinct('staffId'),
    ]);

    const staffOnLeave = approvedLeaveUserIds.length > 0
      ? await Staff.countDocuments({ userId: { $in: approvedLeaveUserIds } })
      : 0;
    const pendingApprovals = pendingBookings + pendingLeaveRequests;
    const todaysRevenue = todaysRevenueResult[0]?.todaysRevenue ?? 0;
    const staffOnDuty = Math.max(totalStaff - staffOnLeave, 0);

    return res.status(200).json({
      success: true,
      data: {
        todaysAppointments,
        pendingApprovals,
        todaysRevenue,
        staffOnDuty,
      },
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch dashboard summary.',
    });
  }
};

// @desc    Get completed appointment revenue for the current week
// @route   GET /api/dashboard/weekly-analytics
// @access  Private/Admin
const getWeeklyAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const monday = new Date(now);
    const daysSinceMonday = (now.getDay() + 6) % 7;

    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - daysSinceMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDate = formatDate(monday);
    const endDate = formatDate(sunday);

    const revenueByDay = await Appointment.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'Completed'] },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $isoDayOfWeek: {
              $dateFromString: {
                dateString: '$date',
                format: '%Y-%m-%d',
              },
            },
          },
          revenue: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          isoDay: '$_id',
          revenue: 1,
        },
      },
      { $sort: { isoDay: 1 } },
    ]);

    const revenueMap = new Map(
      revenueByDay.map(({ isoDay, revenue }) => [isoDay, revenue])
    );

    const weeklyAnalytics = WEEK_DAYS.map((day, index) => ({
      day,
      revenue: revenueMap.get(index + 1) ?? 0,
    }));

    return res.status(200).json(weeklyAnalytics);
  } catch (error) {
    console.error('Weekly Analytics Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch weekly analytics.',
    });
  }
};

// @desc    Get year-to-date analytics summary and monthly revenue trends
// @route   GET /api/dashboard/analytics-summary
// @access  Private/Admin
const getAnalyticsSummary = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const requestedYear = Number(req.query.year ?? currentYear);

    if (
      !Number.isInteger(requestedYear) ||
      requestedYear < 2000 ||
      requestedYear > currentYear
    ) {
      return res.status(400).json({
        success: false,
        message: `Year must be between 2000 and ${currentYear}.`,
      });
    }

    const yearStart = `${requestedYear}-01-01`;
    const yearEnd = `${requestedYear}-12-31`;

    const [
      totalAppointments,
      newClients,
      revenueByMonth,
      completedYears,
    ] = await Promise.all([
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
                $dateFromString: {
                  dateString: '$date',
                  format: '%Y-%m-%d',
                },
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
      Appointment.aggregate([
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
      ]),
    ]);

    const revenueMap = new Map(
      revenueByMonth.map(({ monthNumber, revenue }) => [monthNumber, revenue])
    );

    const revenueTrends = MONTH_NAMES.map((month, index) => ({
      month,
      revenue: revenueMap.get(index + 1) ?? 0,
    }));

    const totalRevenueYTD = revenueTrends.reduce(
      (total, item) => total + item.revenue,
      0
    );

    const availableYears = Array.from(
      new Set([currentYear, ...completedYears.map(({ _id }) => _id)])
    ).sort((a, b) => b - a);

    return res.status(200).json({
      selectedYear: requestedYear,
      availableYears,
      totalRevenueYTD,
      totalAppointments,
      newClients,
      revenueTrends,
    });
  } catch (error) {
    console.error('Analytics Summary Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch analytics summary.',
    });
  }
};

// @desc    Get the five most booked salon services
// @route   GET /api/dashboard/top-services
// @access  Private/Admin
const getTopServices = async (req, res) => {
  try {
    const topServices = await Appointment.aggregate([
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

    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch top services analytics.',
    });
  }
};

// @desc    Get appointment totals grouped by status
// @route   GET /api/dashboard/appointment-status
// @access  Private/Admin
const getAppointmentStatus = async (req, res) => {
  try {
    const statusCounts = await Appointment.aggregate([
      {
        $match: {
          status: {
            $in: [
              ...ANALYTICS_STATUSES,
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

    const appointmentStatus = ANALYTICS_STATUSES.map((name) => ({
      name: STATUS_LABELS[name],
      value: countByStatus.get(name) ?? 0,
    }));

    return res.status(200).json(appointmentStatus);
  } catch (error) {
    console.error('Appointment Status Analytics Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch appointment status analytics.',
    });
  }
};

module.exports = {
  getDashboardSummary,
  getWeeklyAnalytics,
  getAnalyticsSummary,
  getTopServices,
  getAppointmentStatus,
};
