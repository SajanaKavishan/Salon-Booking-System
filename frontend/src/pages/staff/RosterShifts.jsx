import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Calendar, Briefcase, PlusCircle, NotebookText, Loader2, Palmtree } from "lucide-react";
import { GlassCard, GoldButton } from "../../components/admin/SystemUI";
import { format, addDays, startOfWeek, isSameDay, isWithinInterval } from "date-fns";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function RosterShifts() {
  const [metrics, _setMetrics] = useState({
    leaveBalance: "12 Days",
  });
  const [shifts, setShifts] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [currentStaffData, setCurrentStaffData] = useState(null);

  useEffect(() => {
    const fetchStaffData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          toast.error("Session expired, please sign out and log back in.");
          setIsLoading(false);
          return;
        }

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const shiftsPromise = axios.get("http://localhost:5000/api/roster/shifts", config).catch(error => {
          console.error("Error fetching shifts:", error);
          if (error.response?.status === 401) {
            toast.error("Session expired, please sign out and log back in.");
          } else {
            toast.error(error.response?.data?.message || "Failed to load shifts");
          }
          return { data: [] }; // Return empty array on error
        });
        const leavesPromise = axios.get("http://localhost:5000/api/leaves", config).catch(error => {
          console.error("Error fetching leaves:", error);
          if (error.response?.status === 401) {
            toast.error("Session expired, please sign out and log back in.");
          } else {
            toast.error(error.response?.data?.message || "Failed to load leave history");
          }
          return { data: [] }; // Return empty array on error
        });
        const staffProfilePromise = axios.get("http://localhost:5000/api/users/me", config).catch(error => {
          console.error("Error fetching staff profile:", error);
          if (error.response?.status === 401) {
            toast.error("Session expired, please sign out and log back in.");
          } else {
            toast.error(error.response?.data?.message || "Failed to load staff profile");
          }
          return { data: null }; // Return null on error
        });

        const [shiftsRes, leavesRes, staffRes] = await Promise.all([
          shiftsPromise,
          leavesPromise,
          staffProfilePromise,
        ]);

        setShifts(shiftsRes.data);
        
        // Securely extract offDays (checking offDays, staffProfile.offDays, or user.offDays)
        const userData = staffRes.data || {};
        const fetchedOffDays = userData.offDays || userData.staffProfile?.offDays || userData.user?.offDays || [];
        setCurrentStaffData({ ...userData, offDays: fetchedOffDays }); // Set current staff data with mapped offDays
        
        const mappedLeaves = leavesRes.data.map(l => {
          const start = new Date(l.startDate);
          const end = l.endDate ? new Date(l.endDate) : start;
          return {
            id: l._id,
            type: l.leaveType,
            startDate: start,
            endDate: end,
            status: l.status,
            reason: l.reason,
            datesDisplay: `${format(start, 'MMM dd')}${l.endDate ? ` - ${format(end, 'MMM dd')}` : ''}`
          };
        });
        setLeaveHistory(mappedLeaves);

      } catch (error) {
        toast.error(error.response?.data?.message || "An unexpected error occurred during data fetching.");
        console.error("Unhandled error in fetchStaffData:", error);
      } finally {
        setIsLoading(false);
      }
    };

     fetchStaffData();
   }, []);

   const getDayStatus = (date) => {
     const dayName = format(date, 'EEEE'); // e.g., "Monday"

     // Normalize offDays to an array comparison
     const staffOffDays = Array.isArray(currentStaffData?.offDays)
       ? currentStaffData.offDays
       : currentStaffData?.offDays
         ? [currentStaffData.offDays]
         : [];

     const isOffDay = staffOffDays.some(day => day.toLowerCase() === dayName.toLowerCase());
     const formattedDate = format(date, 'yyyy-MM-dd');
     const shift = shifts.find(s => s.date.startsWith(formattedDate));

     if (isOffDay) {
       return "OFF DAY";
     }

     if (shift) {
       return shift.shiftType;
     }

     const onLeave = leaveHistory.some(l =>
       l.status?.toLowerCase() === 'approved' && isWithinInterval(date, { start: l.startDate, end: l.endDate })
     );

     if (onLeave) {
       return "ON LEAVE";
     }

     return "WORKING";
   };

   const getDayStatusClass = (status) => {
     switch (status) {
       case "WORKING":
         return "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
       case "ON LEAVE":
         return "bg-rose-400/10 text-rose-300 border-rose-400/30";
       case "OFF DAY":
         return "bg-amber-400/10 text-amber-300 border-amber-400/30";
       default:
         return "bg-gray-700/50 text-gray-400 border-gray-600/50";
     }
   };

  const getWeekDays = () => {
    const days = [];
    let day = currentWeek;
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    type: "Casual",
    reason: "",
  });

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingLeave) return;

    try {
      if (!leaveForm.startDate || !leaveForm.reason) {
        toast.error("Please fill in all required fields.");
        return;
      }

      setIsSubmittingLeave(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/roster/leaves",
        leaveForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newLeave = res.data.leave;
      setLeaveHistory(prev => [
        {
          id: newLeave._id,
          type: newLeave.leaveType,
          startDate: new Date(newLeave.startDate),
          endDate: newLeave.endDate ? new Date(newLeave.endDate) : new Date(newLeave.startDate),
          status: newLeave.status,
          reason: newLeave.reason,
          datesDisplay: `${format(new Date(newLeave.startDate), 'MMM dd')}${newLeave.endDate ? ` - ${format(new Date(newLeave.endDate), 'MMM dd')}` : ''}`
        },
        ...prev
      ]);

      toast.success("Leave request submitted successfully.");
      setLeaveForm({ startDate: "", endDate: "", type: "Casual", reason: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit leave request.");
      console.error(error);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const getLeaveStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Approved</span>;
      case 'pending': return <span className="text-[10px] uppercase tracking-wider font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/20">Pending</span>;
      case 'rejected': return <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">Rejected</span>;
      default: return <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-400/10 px-2 py-0.5 rounded border border-gray-400/20">Unknown</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Loader2 className="h-12 w-12 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-white">Your Roster & Leave</h1>
        <p className="mt-3 text-base text-gray-400">
          Manage your weekly schedule and apply for leaves.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
        {/* LEFT COLUMN (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Leave Balance Card (full width of left column) */}
          <GlassCard className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Leave Balance</p>
              <p className="text-3xl font-bold text-white">{metrics.leaveBalance}</p>
            </div>
            <Palmtree className="h-8 w-8 text-[#d4af37]" />
          </GlassCard>

          {/* 2. Weekly Planner (full width of left column) */}
          <GlassCard className="p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#d4af37]" /> Weekly Planner
              </h2>
              <div className="flex gap-2">
                <GoldButton onClick={() => setCurrentWeek(addDays(currentWeek, -7))} variant="outline" className="px-3 py-1 text-sm">Previous</GoldButton>
                <GoldButton onClick={() => setCurrentWeek(addDays(currentWeek, 7))} variant="outline" className="px-3 py-1 text-sm">Next</GoldButton>
              </div>
            </div>
            <div className="w-full overflow-x-auto scrollbar-none pb-2">
              <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-400 mb-4 min-w-[600px] lg:min-w-0">
                {daysOfWeek.map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2 min-w-[650px] lg:min-w-0">
                {getWeekDays().map((date, index) => (
                  <div key={index} className={`flex flex-col items-center justify-center p-3 rounded-lg border ${isSameDay(date, new Date())
                      ? "border-[#d4af37] bg-[#d4af37]/10"
                      : getDayStatusClass(getDayStatus(date))
                    }`}>
                    <span className="text-xs text-gray-400">{format(date, 'MMM')}</span>
                    <span className="text-lg font-bold text-white">{format(date, 'dd')}</span>
                    <span className={`text-[9px] font-bold tracking-tight uppercase mt-1 ${isSameDay(date, new Date())
                        ? "text-white"
                        : getDayStatus(date) === 'ON LEAVE'
                          ? 'text-rose-300'
                          : getDayStatus(date) === 'OFF DAY'
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                      }`}>
                      {getDayStatus(date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* 3. Recent Leave Requests (full width of left column) */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <NotebookText className="w-5 h-5 text-[#d4af37]" /> Recent Leave Requests
            </h2>
            <div className="flex flex-col gap-3">
              {leaveHistory.length > 0 ? (
                leaveHistory.map((leave) => (
                  <div key={leave.id} className="flex flex-col gap-2 p-3.5 bg-[#07090d] border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{leave.type}</span>
                      {getLeaveStatusBadge(leave.status)}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{leave.datesDisplay}</span>
                    <p className="text-xs text-slate-400 mt-1">Reason: {leave.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent leave requests.</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN (1/3 width) */}
        <div className="lg:col-span-1">
          {/* Apply Leave Form */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#d4af37]" /> Apply for Leave
            </h2>
            <form onSubmit={handleLeaveSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave Type</label>
                <select
                  name="type"
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  className="w-full bg-[#07090d] border border-slate-800 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-colors p-3 outline-none"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Medical">Medical Leave</option>
                  <option value="Annual">Annual Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="w-full bg-[#07090d] border border-slate-800 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-colors p-3 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">End Date (Optional)</label>
                <input
                  type="date"
                  name="endDate"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="w-full bg-[#07090d] border border-slate-800 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-colors p-3 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason</label>
                <textarea
                  name="reason"
                  required
                  placeholder="Provide a brief reason..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-[#07090d] border border-slate-800 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-colors p-3 outline-none resize-none placeholder:text-slate-600"
                  rows="3"
                ></textarea>
              </div>
              <GoldButton
                type="submit"
                disabled={isSubmittingLeave}
                className="w-full rounded-lg px-5 py-3 font-bold shadow-[0_0_20px_rgba(212,175,55,0.28)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingLeave ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" /> Submit Leave Request
                  </>
                )}
              </GoldButton>
            </form>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
