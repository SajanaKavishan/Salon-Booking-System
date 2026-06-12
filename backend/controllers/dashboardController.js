const Appointment = require('../models/appointmentModel');
const Staff = require('../models/Staff');

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    const [
      totalAppointments,
      pendingAppointments,
      revenueResult,
      totalStaff,
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'Pending' }),
      Appointment.aggregate([
        { $match: { status: 'Completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      Staff.countDocuments(),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue ?? 0;

    return res.status(200).json({
      success: true,
      data: {
        totalAppointments,
        pendingAppointments,
        totalRevenue,
        totalStaff,
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
          status: 'Completed',
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

module.exports = {
  getDashboardSummary,
  getWeeklyAnalytics,
};
