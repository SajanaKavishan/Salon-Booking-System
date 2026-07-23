const {
  aggregateStaffPerformance,
  getAnalyticsDateWindow,
  getAnalyticsSummaryData,
  getAppointmentStatusData,
  getTopServicesData,
} = require('../utils/analyticsHelper');

const getAnalyticsSummary = async (req, res) => {
  try {
    const analyticsSummary = await getAnalyticsSummaryData(req.query);
    return res.status(200).json(analyticsSummary);
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
    const topServices = await getTopServicesData({ query: req.query });
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
    const appointmentStatus = await getAppointmentStatusData({ query: req.query });
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
