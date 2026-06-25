import React, { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import { toast } from "react-toastify";

import { AnimatePresence, motion } from "framer-motion";

import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";

import { AlertTriangle, CalendarDays, Clock, DollarSign, Loader2, RotateCw, Users, X, XCircle } from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { GoldButton, GlassCard } from "../../components/admin/SystemUI";



const formatYAxis = (value) => {
  if (value >= 1000) return `Rs. ${value / 1000}k`;
  return `Rs. ${value}`;
};

const getLocalDateKey = (date = new Date()) => {
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getAppointmentDateKey = (appointment) => {
  const rawDate = appointment?.date || appointment?.bookingDate;
  if (!rawDate) return "";
  return String(rawDate).slice(0, 10);
};

const formatDisplayDate = (dateValue) => {
  if (!dateValue) return "Not set";

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "Not set";

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatLeaveDateRange = (startDate, endDate) => {
  const formattedStart = formatDisplayDate(startDate);
  const formattedEnd = formatDisplayDate(endDate || startDate);
  return formattedStart === formattedEnd ? formattedStart : `${formattedStart} - ${formattedEnd}`;
};

const timeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") return 0;

  const [rawTime, rawModifier = ""] = timeValue.trim().split(/\s+/);
  const [rawHours, rawMinutes] = rawTime.split(":");
  let hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const modifier = rawModifier.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const getStylistId = (appointment) => {
  const stylist = appointment?.stylist || appointment?.staffId;
  return typeof stylist === "object" ? stylist?._id : stylist;
};

const getStylistName = (appointment) => {
  const stylist = appointment?.stylist || appointment?.staffId;
  if (typeof stylist === "object" && stylist?.name) return stylist.name;
  return appointment?.stylistName || "Unassigned Stylist";
};

const isOpenAppointmentStatus = (status) => (
  ["pending", "approved", "confirmed"].includes(String(status || "").trim().toLowerCase())
);



function AdminDashboard() {

  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [chartData, setChartData] = useState([]);

  const [recentAppointments, setRecentAppointments] = useState([]);

  const [allAppointments, setAllAppointments] = useState([]);

  const [recentLeaveRequests, setRecentLeaveRequests] = useState([]);

  const [conflictingAppointments, setConflictingAppointments] = useState([]);

  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const [currentLeaveRequest, setCurrentLeaveRequest] = useState(null);

  const [reviewLeaveRequest, setReviewLeaveRequest] = useState(null);

  const [isLeaveActionLoading, setIsLeaveActionLoading] = useState(false);
  const [leaveActionType, setLeaveActionType] = useState(null);

  const [shiftTarget, setShiftTarget] = useState(null);

  const [isShiftLoading, setIsShiftLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {

      try {

        const token = localStorage.getItem("token");

        if (!token) {

          throw new Error("Admin authentication token is missing.");

        }

        const authHeaders = {

          headers: { Authorization: `Bearer ${token}` },

        };



        const [summaryResponse, analyticsResponse, appointmentsRes, leaveRes] = await Promise.all([

          axios.get("http://localhost:5000/api/dashboard/summary", authHeaders),

          axios.get("http://localhost:5000/api/dashboard/weekly-analytics", authHeaders),

          axios.get("http://localhost:5000/api/appointments/all", authHeaders),

          axios.get("http://localhost:5000/api/leaves", authHeaders), 

        ]);



        setSummaryData(summaryResponse.data.data);

        const weeklyAnalytics = Array.isArray(analyticsResponse.data)
          ? analyticsResponse.data
          : analyticsResponse.data?.data;

        setChartData(Array.isArray(weeklyAnalytics) ? weeklyAnalytics : []);

        const fetchedAppointments = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];

        setAllAppointments(fetchedAppointments);

        setRecentAppointments(fetchedAppointments.slice(0, 5));

        setRecentLeaveRequests(leaveRes.data);

      } catch (error) {

        console.error("Dashboard data fetch error:", error);

        toast.error(error.response?.data?.message || error.message || "Failed to load dashboard data");

      } finally {

        setLoading(false);

      }

  }, []);


  useEffect(() => {

    fetchDashboardData();

  }, [fetchDashboardData]);



  const getStatusBadgeClass = (status) => {

    switch (String(status || "").trim().toLowerCase()) {

      case "confirmed":
      case "approved":

        return "bg-green-500/10 text-green-400 border-green-500/50";

      case "pending":

        return "bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/40";

      case "cancelled":
      case "canceled":
      case "rejected":
      case "no-show":

        return "bg-red-500/15 text-red-300 border-red-500/50";

      case "completed":

          return "bg-blue-500/20 text-blue-300 border-blue-500/50";

      default:

        return "bg-gray-500/10 text-gray-300 border-gray-500/50";

    }

  };



  const getLeaveStatusBadge = (status) => {

    switch(status?.toLowerCase()) {

      case 'approved': return <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Approved</span>;

      case 'pending': return <span className="text-[10px] uppercase tracking-wider font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/20">Pending</span>;

      case 'rejected': return <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">Rejected</span>;

      default: return <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-400/10 px-2 py-0.5 rounded border border-gray-400/20">Unknown</span>;

    }

  }

  const todayDateKey = useMemo(() => getLocalDateKey(), []);

  const todaysRosterGroups = useMemo(() => {
    const groups = new Map();

    allAppointments
      .filter((appointment) => (
        getAppointmentDateKey(appointment) === todayDateKey
        && isOpenAppointmentStatus(appointment.status)
      ))
      .sort((first, second) => timeToMinutes(first.startTime) - timeToMinutes(second.startTime))
      .forEach((appointment) => {
        const stylistId = getStylistId(appointment);
        const stylistName = getStylistName(appointment);
        const groupKey = stylistId || "unassigned";

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            stylistId,
            stylistName,
            appointments: [],
          });
        }

        groups.get(groupKey).appointments.push(appointment);
      });

    return Array.from(groups.values());
  }, [allAppointments, todayDateKey]);

  const handleConfirmShiftSlots = async () => {
    if (!shiftTarget?.stylistId || isShiftLoading) return;

    setIsShiftLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Admin authentication token is missing.");
      }

      const response = await axios.post(
        "http://localhost:5000/api/appointments/shift-slots",
        {
          stylistId: shiftTarget.stylistId,
          date: todayDateKey,
          shiftMinutes: 15,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`Shifted ${response.data?.count || 0} appointment slots by 15 minutes.`);
      setShiftTarget(null);
      await fetchDashboardData();
    } catch (error) {
      console.error("Shift Slots Error:", error);
      toast.error(error.response?.data?.message || error.message || "Could not shift the remaining slots.");
    } finally {
      setIsShiftLoading(false);
    }
  };



  const handleApproveLeave = async (leaveRequest) => {

    if (isLeaveActionLoading) return;

    setCurrentLeaveRequest(leaveRequest);
    setLeaveActionType("approve");
    setIsLeaveActionLoading(true);

    try {

      const token = localStorage.getItem("token");

      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      const conflictsRes = await axios.get(`http://localhost:5000/api/leaves/${leaveRequest._id}/conflicts`, authHeaders);

      

      if (conflictsRes.data.length > 0) {

        setConflictingAppointments(conflictsRes.data);

        setIsConflictModalOpen(true);
        setReviewLeaveRequest(null);
        setIsLeaveActionLoading(false);
        setLeaveActionType(null);

      } else {

        // No conflicts, proceed with approval

        await confirmApproveLeave(leaveRequest._id);

      }

    } catch (error) {

      toast.error(error.response?.data?.message || "Failed to check for conflicts.");

      console.error("Conflict check error:", error);
      setCurrentLeaveRequest(null);
      setIsLeaveActionLoading(false);
      setLeaveActionType(null);

    }

  };



  const confirmApproveLeave = async (leaveRequestId) => {

    try {

      setIsLeaveActionLoading(true);
      setLeaveActionType("approve");

      if (!leaveRequestId) {

        throw new Error("Leave request is no longer available.");

      }

      const token = localStorage.getItem("token");

      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      await axios.post(`http://localhost:5000/api/leaves/${leaveRequestId}/approve`, {}, authHeaders);

      toast.success("Leave request approved!");

      setIsConflictModalOpen(false);

      setReviewLeaveRequest(null);

      setConflictingAppointments([]);

      setCurrentLeaveRequest(null);

      // Refresh leave requests

      const tokenRefresh = localStorage.getItem("token");

      const authHeadersRefresh = tokenRefresh ? { headers: { Authorization: `Bearer ${tokenRefresh}` } } : undefined;

      const leaveRes = await axios.get("http://localhost:5000/api/leaves", authHeadersRefresh); 

      setRecentLeaveRequests(leaveRes.data);



    } catch (error) {

      toast.error(error.response?.data?.message || "Failed to approve leave request.");

      console.error("Approval error:", error);

    } finally {

      setIsLeaveActionLoading(false);
      setLeaveActionType(null);

    }

  };



  const handleRejectLeave = async (leaveRequest) => {

    if (isLeaveActionLoading) return;

    try {

      const leaveId = typeof leaveRequest === "object" ? leaveRequest?._id : leaveRequest;

      if (!leaveId) {

        throw new Error("Leave request is no longer available.");

      }

      setCurrentLeaveRequest(typeof leaveRequest === "object" ? leaveRequest : null);

      setIsLeaveActionLoading(true);
      setLeaveActionType("reject");

      const token = localStorage.getItem("token");

      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      await axios.post(`http://localhost:5000/api/leaves/${leaveId}/reject`, {}, authHeaders);

      toast.success("Leave request rejected.");

      setReviewLeaveRequest(null);

      setCurrentLeaveRequest(null);

      // Refresh leave requests

      const tokenRefresh = localStorage.getItem("token");

      const authHeadersRefresh = tokenRefresh ? { headers: { Authorization: `Bearer ${tokenRefresh}` } } : undefined;

      const leaveRes = await axios.get("http://localhost:5000/api/leaves", authHeadersRefresh); 

      setRecentLeaveRequests(leaveRes.data);



    } catch (error) {

      toast.error(error.response?.data?.message || "Failed to reject leave request.");

      console.error("Rejection error:", error);

    } finally {

      setIsLeaveActionLoading(false);
      setLeaveActionType(null);

    }

  };



  return (

    <div className="space-y-8">

      <header className="mb-8">

        <h1 className="text-4xl font-serif font-bold tracking-tight text-white">Admin Dashboard</h1>

        <p className="mt-3 text-base text-gray-400">

          Overview of your salon operations, recent activities, and key metrics.

        </p>

      </header>



      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">

        <GlassCard className="flex items-center justify-between p-6">

          <div>

            <p className="text-sm font-medium text-gray-400">Total Appointments</p>

            <p className="text-3xl font-bold text-white">

              {loading ? "..." : summaryData?.totalAppointments || 0}

            </p>

          </div>

          <CalendarDays className="h-8 w-8 text-[#d4af37]" />

        </GlassCard>

        <GlassCard className="flex items-center justify-between p-6">

          <div>

            <p className="text-sm font-medium text-gray-400">Pending Appointments</p>

            <p className="text-3xl font-bold text-white">

              {loading ? "..." : summaryData?.pendingAppointments || 0}

            </p>

          </div>

          <Clock className="h-8 w-8 text-[#d4af37]" />

        </GlassCard>

        <GlassCard className="flex items-center justify-between p-6">

          <div>

            <p className="text-sm font-medium text-gray-400">Total Revenue</p>

            <p className="text-3xl font-bold text-white">

              {loading

                ? "..."

                : `Rs. ${(summaryData?.totalRevenue || 0).toLocaleString()}`}

            </p>

          </div>

          <DollarSign className="h-8 w-8 text-[#d4af37]" />

        </GlassCard>

        <GlassCard className="flex items-center justify-between p-6">

          <div>

            <p className="text-sm font-medium text-gray-400">Total Staff</p>

            <p className="text-3xl font-bold text-white">

              {loading ? "..." : summaryData?.totalStaff || 0}

            </p>

          </div>

          <Users className="h-8 w-8 text-[#d4af37]" />

        </GlassCard>

      </section>

      <div className="group lux-card backdrop-blur-xl bg-card/40 border border-white/[0.04] p-4 sm:p-6 rounded-2xl shadow-2xl mt-8">
        <div className="mb-6">
          <h3 className="text-xl font-brand font-semibold text-white">Weekly Revenue Analytics</h3>
          <p className="text-neutral-500 text-xs mt-1">Completed appointment revenue from Monday to Sunday</p>
        </div>

        <div className="h-[250px] w-full min-w-0 sm:h-[300px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            minHeight={250}
            initialDimension={{ width: 1, height: 250 }}
          >
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 5, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="day" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, "auto"]} tickFormatter={formatYAxis} />
              <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px' }} itemStyle={{ color: '#d4af37' }} formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">Live Operations</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Today's Roster</h2>
            <p className="mt-1 text-sm text-gray-400">Monitor late arrivals and cascade each stylist's remaining schedule when needed.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-400">
            {todayDateKey}
          </div>
        </div>

        {todaysRosterGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center">
            <p className="text-sm font-semibold text-white">No pending or confirmed appointments remaining today.</p>
            <p className="mt-2 text-xs text-gray-500">Late alerts and cascade controls appear here when today's roster is active.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {todaysRosterGroups.map((group) => (
              (() => {
                const stylistAppointments = group.appointments;
                const hasUpcoming = stylistAppointments.some((app) => {
                  const status = String(app.status || "").trim().toLowerCase();
                  return status === "pending" || status === "confirmed" || status === "approved";
                });

                return (
                  <div key={group.stylistId || group.stylistName} className="rounded-2xl border border-white/10 bg-[#0a0a0a]/55 p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white">{group.stylistName}</h3>
                        <p className="mt-1 text-xs text-gray-500">{group.appointments.length} active appointment{group.appointments.length === 1 ? "" : "s"}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShiftTarget(group)}
                        disabled={!hasUpcoming}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          hasUpcoming
                            ? "border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            : "border border-zinc-800 text-zinc-600 bg-zinc-900/50 cursor-not-allowed"
                        }`}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Shift Remaining Slots (+15m)
                      </button>
                    </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-gray-500">
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.appointments.map((appointment) => {
                        const isLate = appointment.isLate === true;
                        const clientName = appointment.user?.name || "Unknown customer";
                        const services = Array.isArray(appointment.services)
                          ? appointment.services.map((service) => service?.name || service).join(", ")
                          : appointment.service || "Service pending";

                        return (
                          <tr
                            key={appointment._id}
                            className={`border-b border-white/5 transition last:border-b-0 hover:bg-white/5 ${
                              isLate ? "bg-amber-500/5 border-l-4 border-l-amber-500 animate-pulse" : ""
                            }`}
                          >
                            <td className="px-4 py-3 align-top">
                              {isLate ? (
                                <div>
                                  <p className="text-xs font-medium line-through text-zinc-500">
                                    {appointment.startTime || "Time pending"}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-amber-400">
                                    Adjusted end: {appointment.adjustedEndTime || appointment.endTime || "Pending"}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-semibold text-gray-200">{appointment.startTime || "Time pending"}</p>
                                  {appointment.endTime && <p className="mt-1 text-xs text-gray-500">Ends {appointment.endTime}</p>}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-wrap items-center gap-y-1">
                                <span className="font-semibold text-white">{clientName}</span>
                                {isLate && (
                                  <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-md ml-2 font-medium">
                                    ⚠️ Late {appointment.lateMinutes || 0}m
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-gray-500">{appointment.user?.phone || appointment.user?.email || "No contact details"}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-gray-300">{services}</td>
                            <td className="px-4 py-3 align-top">
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(appointment.status)}`}>
                                {appointment.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </GlassCard>



      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

        {/* Recent Appointments */}

        <GlassCard className="p-6">

          <h2 className="mb-4 text-xl font-semibold text-white">Recent Appointments</h2>

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead>

                <tr className="border-b border-white/10 text-gray-400">

                  <th className="py-2 px-4">Customer</th>

                  <th className="py-2 px-4">Stylist</th>

                  <th className="py-2 px-4">Date & Time</th>

                  <th className="py-2 px-4">Status</th>

                </tr>

              </thead>

              <tbody>

                {recentAppointments.length > 0 ? (

                  recentAppointments.map((appointment) => (

                    <tr key={appointment._id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5">

                      <td className="py-3 px-4 text-white">

                        {appointment.user?.name || "Unknown customer"}

                      </td>

                      <td className="py-3 px-4 text-gray-300">

                        {appointment.stylist?.name || "Unassigned"}

                      </td>

                      <td className="py-3 px-4 text-gray-300">

                        {new Date(appointment.date).toLocaleDateString()} at {appointment.startTime}

                      </td>

                      <td className="py-3 px-4">

                        <span

                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(appointment.status)}`}

                        >

                          {appointment.status}

                        </span>

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td colSpan="4" className="py-4 text-center text-gray-500">

                      No recent appointments.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </GlassCard>



        {/* Recent Leave Requests */}

        <GlassCard className="p-6">

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <h2 className="text-xl font-semibold text-white">Recent Leave Requests</h2>

            <button
              type="button"
              onClick={() => navigate("/admin/staff")}
              className="w-fit text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37] transition hover:text-[#f4d77d]"
            >
              View All →
            </button>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead>

                <tr className="border-b border-white/10 text-gray-400">

                  <th className="py-2 px-4">Staff</th>

                  <th className="py-2 px-4">Type</th>

                  <th className="py-2 px-4">Dates</th>

                  <th className="py-2 px-4">Status</th>

                  <th className="py-2 px-4 text-center">Actions</th>

                </tr>

              </thead>

              <tbody>

                {recentLeaveRequests.length > 0 ? (

                  recentLeaveRequests.map((leave) => (

                    <tr key={leave._id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5">

                      <td className="py-3 px-4 flex items-center gap-3">

                        {leave.staffId?.imageUrl ? (

                          <img

                            src={leave.staffId.imageUrl}

                            alt={leave.staffId.name || "Staff member"}

                            className="h-8 w-8 rounded-full object-cover"

                          />

                        ) : (

                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-gray-300">

                            {leave.staffId?.name?.charAt(0).toUpperCase() || "?"}

                          </div>

                        )}

                        <span className="font-medium text-white">

                          {leave.staffId?.name || "Former staff member"}

                        </span>

                      </td>

                      <td className="py-3 px-4 text-gray-300">{leave.leaveType}</td>

                      <td className="py-3 px-4 text-gray-300">

                        {formatLeaveDateRange(leave.startDate, leave.endDate)}

                      </td>

                      <td className="py-3 px-4">

                        {getLeaveStatusBadge(leave.status)}

                      </td>

                      <td className="py-3 px-4 text-center">

                        <GoldButton
                          type="button"
                          onClick={() => setReviewLeaveRequest(leave)}
                          disabled={isLeaveActionLoading}
                          className="px-4 py-1.5 text-xs shadow-[0_0_18px_rgba(212,175,55,0.16)]"
                        >
                          Review
                        </GoldButton>

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td colSpan="5" className="py-4 text-center text-gray-500">

                      No recent leave requests.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </GlassCard>

      </div>

      {typeof document !== "undefined" && createPortal((

      <AnimatePresence>

        {reviewLeaveRequest && (

          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/95 px-4 py-8 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isLeaveActionLoading) {
                setReviewLeaveRequest(null);
              }
            }}
          >

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="leave-review-title"
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#050505]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.75)] sm:p-7"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >

              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#d4af37]/10 blur-3xl" />

              <div className="relative flex items-start justify-between gap-4">

                <div>

                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
                    Leave Request Review
                  </p>

                  <h3 id="leave-review-title" className="mt-3 font-serif text-3xl font-semibold text-white">
                    {reviewLeaveRequest.staffId?.name || "Former staff member"}
                  </h3>

                </div>

                <button
                  type="button"
                  onClick={() => setReviewLeaveRequest(null)}
                  disabled={isLeaveActionLoading}
                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-zinc-400 transition hover:border-[#d4af37]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close leave review"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <div className="relative mt-7 grid gap-3 sm:grid-cols-2">

                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Staff Name</p>
                  <p className="mt-2 text-sm font-semibold text-white">{reviewLeaveRequest.staffId?.name || "Former staff member"}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Leave Type</p>
                  <p className="mt-2 text-sm font-semibold text-white">{reviewLeaveRequest.leaveType || "Not specified"}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Dates</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatLeaveDateRange(reviewLeaveRequest.startDate, reviewLeaveRequest.endDate)}
                  </p>
                </div>

              </div>

              <div className="relative mt-3 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.045] p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">Description / Reason</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-200">
                  {reviewLeaveRequest.reason || "No reason was provided for this leave request."}
                </p>
              </div>

              <div className="relative mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-end">

                {reviewLeaveRequest.status?.toLowerCase() === "pending" ? (

                  <>

                    <GoldButton
                      type="button"
                      onClick={() => handleApproveLeave(reviewLeaveRequest)}
                      disabled={isLeaveActionLoading}
                      className="px-5 py-2 shadow-[0_0_24px_rgba(212,175,55,0.2)]"
                    >
                      {isLeaveActionLoading && leaveActionType === "approve" && currentLeaveRequest?._id === reviewLeaveRequest._id ? "Checking..." : "Approve"}
                    </GoldButton>

                    <GoldButton
                      type="button"
                      variant="outline"
                      onClick={() => handleRejectLeave(reviewLeaveRequest)}
                      disabled={isLeaveActionLoading}
                      className="border-red-400/35 px-5 py-2 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    >
                      {isLeaveActionLoading && leaveActionType === "reject" && currentLeaveRequest?._id === reviewLeaveRequest._id ? "Rejecting..." : "Reject"}
                    </GoldButton>

                  </>

                ) : (

                  <GoldButton
                    type="button"
                    variant="ghost"
                    onClick={() => setReviewLeaveRequest(null)}
                    className="border border-white/10 px-5 py-2 text-white hover:bg-white/10"
                  >
                    Close
                  </GoldButton>

                )}

              </div>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

      ), document.body)}



      {/* Conflict Warning Modal */}

      {shiftTarget && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">

          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">

              <AlertTriangle className="h-5 w-5" />

            </div>

            <h4 className="mt-5 text-xl font-semibold text-white">Confirm Schedule Cascade Shift?</h4>

            <p className="mt-3 text-sm leading-6 text-zinc-400">

              This action will push all remaining pending/confirmed appointments for this stylist today forward by 15 minutes and log the updates. Are you sure you want to proceed?

            </p>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">

              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Stylist</p>

              <p className="mt-2 text-sm font-semibold text-white">{shiftTarget.stylistName}</p>

            </div>

            <div className="mt-7 flex items-center justify-end gap-3">

              <button
                type="button"
                onClick={() => setShiftTarget(null)}
                disabled={isShiftLoading}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >

                Cancel

              </button>

              <button
                type="button"
                onClick={handleConfirmShiftSlots}
                disabled={isShiftLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {isShiftLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}

                {isShiftLoading ? "Shifting..." : "Confirm & Shift"}

              </button>

            </div>

          </div>

        </div>

      )}

      {typeof document !== "undefined" && createPortal((

      <AnimatePresence>

      {isConflictModalOpen && (

        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 px-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >

          <GlassCard className="mx-4 w-full max-w-lg border-t-4 border-t-red-600 bg-[#111111] p-6">

            <h4 className="mb-3 text-xl font-semibold text-white flex items-center gap-2">

              <XCircle className="text-red-400" size={24} /> Warning: Conflicts Detected

            </h4>

            <p className="mb-4 text-gray-300">

              Warning: Approving this leave will cancel the following {conflictingAppointments.length} appointments.

            </p>

            <ul className="mb-6 max-h-72 space-y-2 overflow-y-auto pr-2 text-gray-300">

              {conflictingAppointments.map((app) => (

                <li
                  key={app.appointmentId}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
                >

                  <p className="font-semibold text-white">{app.customerName}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {app.date ? new Date(`${app.date}T00:00:00`).toLocaleDateString() : "Leave date"} at {app.time}
                  </p>
                  <p className="mt-1 text-xs text-gray-300">{app.service}</p>

                </li>

              ))}

            </ul>

            <div className="flex items-center justify-end gap-3">

              <GoldButton

                type="button"

                variant="ghost"
                disabled={isLeaveActionLoading}

                onClick={() => {

                  setIsConflictModalOpen(false);

                  setConflictingAppointments([]);

                  setCurrentLeaveRequest(null);

                }}

                className="border border-white/20 bg-transparent px-4 py-2 text-white hover:bg-white/10 hover:text-white"

              >

                Cancel

              </GoldButton>

              <GoldButton

                type="button"

                onClick={() => confirmApproveLeave(currentLeaveRequest?._id)}
                disabled={isLeaveActionLoading}

                className="bg-red-600/90 px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:bg-red-700"

              >

                {isLeaveActionLoading ? "Approving..." : "Confirm & Cancel Appointments"}

              </GoldButton>

            </div>

          </GlassCard>

        </motion.div>

      )}

      </AnimatePresence>

      ), document.body)}

    </div>

  );

}



export default AdminDashboard;
