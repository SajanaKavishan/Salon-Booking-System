const Appointment = require('../models/appointmentModel');
const Service = require('../models/Service');
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
    const appointmentStatus = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          value: { $sum: 1 },
        },
      },
      { $sort: { value: -1, _id: 1 } },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1,
        },
      },
    ]);

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
  getTopServices,
  getAppointmentStatus,
};
