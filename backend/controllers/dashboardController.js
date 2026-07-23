const Appointment = require('../models/appointmentModel');
const LeaveRequest = require('../models/LeaveRequest');
const Staff = require('../models/Staff');
const {
  getAppointmentStatusData,
  getLegacyAnalyticsSummaryData,
  getTopServicesData,
} = require('../utils/analyticsHelper');
const { getSalonDateTime } = require('../utils/salonTime');

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// @desc    Get summary metrics for the admin dashboard
// @route   GET /api/dashboard/summary
// @access  Private/Admin
const getDashboardSummary = async (req, res) => {
  try {
    const salonToday = getSalonDateTime().startOf('day');
    const salonTomorrow = salonToday.plus({ days: 1 });
    const today = salonToday.toUTC().toJSDate();
    const tomorrow = salonTomorrow.toUTC().toJSDate();
    const todayKey = salonToday.toISODate();
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
      Staff.countDocuments({
        isActive: { $ne: false },
        isDeleted: { $ne: true },
      }),
      LeaveRequest.find({
        status: { $in: ['Approved', 'approved'] },
        startDate: { $lt: tomorrow },
        endDate: { $gte: today },
      }).distinct('staffId'),
    ]);

    const staffOnLeave = approvedLeaveUserIds.length > 0
      ? await Staff.countDocuments({
          userId: { $in: approvedLeaveUserIds },
          isActive: { $ne: false },
          isDeleted: { $ne: true },
        })
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
    const salonNow = getSalonDateTime();
    const monday = salonNow.startOf('week').startOf('day');
    const sunday = monday.plus({ days: 6 }).endOf('day');
    const startDate = monday.toISODate();
    const endDate = sunday.toISODate();

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

// Legacy exports retained for direct consumers. Dashboard routes use the richer
// range-aware handlers from analyticsController, while both implementations now
// share the same aggregation helper module.
const getAnalyticsSummary = async (req, res) => {
  try {
    const currentYear = getSalonDateTime().year;
    const requestedYear = Number(req.query.year ?? currentYear);

    if (
      !Number.isInteger(requestedYear)
      || requestedYear < 2000
      || requestedYear > currentYear
    ) {
      return res.status(400).json({
        success: false,
        message: `Year must be between 2000 and ${currentYear}.`,
      });
    }

    const summary = await getLegacyAnalyticsSummaryData({ requestedYear, currentYear });
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Analytics Summary Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch analytics summary.',
    });
  }
};

const getTopServices = async (_req, res) => {
  try {
    const topServices = await getTopServicesData({ applyDateWindow: false });
    return res.status(200).json(topServices);
  } catch (error) {
    console.error('Top Services Analytics Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch top services analytics.',
    });
  }
};

const getAppointmentStatus = async (_req, res) => {
  try {
    const appointmentStatus = await getAppointmentStatusData({ applyDateWindow: false });
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
