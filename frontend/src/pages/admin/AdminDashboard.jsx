import React, { useEffect, useState } from "react";

import axios from "axios";

import { toast } from "react-toastify";

import { useNavigate } from "react-router-dom";

import { CalendarDays, Clock, Users, DollarSign, Briefcase, XCircle } from "lucide-react";

import { GoldButton, GlassCard } from "../../components/admin/SystemUI";



function AdminDashboard() {

  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [recentAppointments, setRecentAppointments] = useState([]);

  const [recentLeaveRequests, setRecentLeaveRequests] = useState([]);

  const [conflictingAppointments, setConflictingAppointments] = useState([]);

  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const [currentLeaveRequest, setCurrentLeaveRequest] = useState(null);



  useEffect(() => {

    const fetchDashboardData = async () => {

      try {

        const token = localStorage.getItem("token");

        if (!token) {

          throw new Error("Admin authentication token is missing.");

        }

        const authHeaders = {

          headers: { Authorization: `Bearer ${token}` },

        };



        const [summaryResponse, appointmentsRes, leaveRes] = await Promise.all([

          axios.get("http://localhost:5000/api/dashboard/summary", authHeaders),

          axios.get("http://localhost:5000/api/appointments?limit=5", authHeaders),

          axios.get("http://localhost:5000/api/leaves", authHeaders), 

        ]);



        setSummaryData(summaryResponse.data.data);

        setRecentAppointments(appointmentsRes.data);

        setRecentLeaveRequests(leaveRes.data);

      } catch (error) {

        console.error("Dashboard data fetch error:", error);

        toast.error(error.response?.data?.message || error.message || "Failed to load dashboard data");

      } finally {

        setLoading(false);

      }

    };



    fetchDashboardData();

  }, []);



  const getStatusBadgeClass = (status) => {

    switch (status) {

      case "Confirmed":

        return "bg-green-500/10 text-green-400 border-green-500/50";

      case "Pending":

        return "bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/40";

      case "Cancelled":

        return "bg-red-500/15 text-red-300 border-red-500/50";

      case "Completed":

          return "bg-blue-500/20 text-blue-300 border-blue-500/50";

      default:

        return "bg-gray-500/10 text-gray-300 border-gray-500/50";

    }

  };



  const getLeaveStatusBadge = (status) => {

    switch(status) {

      case 'approved': return <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Approved</span>;

      case 'pending': return <span className="text-[10px] uppercase tracking-wider font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/20">Pending</span>;

      case 'rejected': return <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">Rejected</span>;

      default: return <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-400/10 px-2 py-0.5 rounded border border-gray-400/20">Unknown</span>;

    }

  }



  const handleApproveLeave = async (leaveRequest) => {

    setCurrentLeaveRequest(leaveRequest);

    try {

      const token = localStorage.getItem("token");

      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      const conflictsRes = await axios.get(`http://localhost:5000/api/leaves/${leaveRequest._id}/conflicts`, authHeaders);

      

      if (conflictsRes.data.length > 0) {

        setConflictingAppointments(conflictsRes.data);

        setIsConflictModalOpen(true);

      } else {

        // No conflicts, proceed with approval

        await confirmApproveLeave(leaveRequest._id);

      }

    } catch (error) {

      toast.error(error.response?.data?.message || "Failed to check for conflicts.");

      console.error("Conflict check error:", error);

    }

  };



  const confirmApproveLeave = async (leaveRequestId) => {

    try {

      if (!leaveRequestId) {

        throw new Error("Leave request is no longer available.");

      }

      const token = localStorage.getItem("token");

      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      await axios.post(`http://localhost:5000/api/leaves/${leaveRequestId}/approve`, {}, authHeaders);

      toast.success("Leave request approved!");

      setIsConflictModalOpen(false);

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

    }

  };



  const handleRejectLeave = async (leaveId) => {

    try {

      const token = localStorage.getItem("token");

      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      await axios.post(`http://localhost:5000/api/leaves/${leaveId}/reject`, {}, authHeaders);

      toast.success("Leave request rejected.");

      // Refresh leave requests

      const tokenRefresh = localStorage.getItem("token");

      const authHeadersRefresh = tokenRefresh ? { headers: { Authorization: `Bearer ${tokenRefresh}` } } : undefined;

      const leaveRes = await axios.get("http://localhost:5000/api/leaves", authHeadersRefresh); 

      setRecentLeaveRequests(leaveRes.data);



    } catch (error) {

      toast.error(error.response?.data?.message || "Failed to reject leave request.");

      console.error("Rejection error:", error);

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

          <h2 className="mb-4 text-xl font-semibold text-white">Recent Leave Requests</h2>

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

                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}

                      </td>

                      <td className="py-3 px-4">

                        {getLeaveStatusBadge(leave.status)}

                      </td>

                      <td className="py-3 px-4 text-center">

                        {leave.status === 'pending' && (

                          <div className="flex justify-center gap-2">

                            <GoldButton onClick={() => handleApproveLeave(leave)} className="px-3 py-1 text-xs">Approve</GoldButton>

                            <GoldButton onClick={() => handleRejectLeave(leave._id)} variant="outline" className="border-red-400/30 text-red-400 px-3 py-1 text-xs hover:bg-red-500/10">Reject</GoldButton>

                          </div>

                        )}

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



      {/* Conflict Warning Modal */}

      {isConflictModalOpen && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">

          <GlassCard className="mx-4 w-full max-w-lg border-t-4 border-t-red-600 bg-[#111111] p-6">

            <h4 className="mb-3 text-xl font-semibold text-white flex items-center gap-2">

              <XCircle className="text-red-400" size={24} /> Warning: Conflicts Detected

            </h4>

            <p className="mb-4 text-gray-400">

              Approving this leave will cancel {conflictingAppointments.length} appointments:

            </p>

            <ul className="list-disc list-inside mb-6 text-gray-300 max-h-60 overflow-y-auto pr-2">

              {conflictingAppointments.map((app, index) => (

                <li key={index} className="mb-2 last:mb-0 text-sm">

                  <span className="font-medium text-white">{app.customerName}</span> has a booking on <span className="font-medium text-white">{app.time}</span> for <span className="font-medium text-white">{app.service}</span>.

                </li>

              ))}

            </ul>

            <div className="flex items-center justify-end gap-3">

              <GoldButton

                type="button"

                variant="ghost"

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

                className="bg-red-600/90 px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:bg-red-700"

              >

                Confirm & Cancel Appointments

              </GoldButton>

            </div>

          </GlassCard>

        </div>

      )}

    </div>

  );

}



export default AdminDashboard;
