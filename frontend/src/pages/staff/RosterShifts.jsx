import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Calendar, Briefcase, PlusCircle, NotebookText, Loader2, Palmtree, ChevronLeft, ChevronRight, X } from "lucide-react";
import { GlassCard, GoldButton } from "../../components/admin/SystemUI";
import { format, addDays, startOfWeek, isSameDay, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from "date-fns";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const calendarDaysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

const getTimeValue = (date) => {
  const value = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const getLeaveYear = (leave) => {
  const year = new Date(leave.createdAt || leave.startDate).getFullYear();
  return Number.isNaN(year) ? "" : String(year);
};

export default function RosterShifts() {
  const [metrics, setMetrics] = useState({
    leaveBalance: 12,
  });
  const [shifts, setShifts] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [selectedDates, setSelectedDates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [currentStaffData, setCurrentStaffData] = useState(null);
  const [selectedLeaveYear, setSelectedLeaveYear] = useState(String(new Date().getFullYear()));

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
        const metricsPromise = axios.get("http://localhost:5000/api/roster/metrics", config).catch(error => {
          console.error("Error fetching staff metrics:", error);
          if (error.response?.status === 401) {
            toast.error("Session expired, please sign out and log back in.");
          } else {
            toast.error(error.response?.data?.message || "Failed to load leave balance");
          }
          return { data: { leaveBalance: 12 } };
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

        const [shiftsRes, leavesRes, staffRes, metricsRes] = await Promise.all([
          shiftsPromise,
          leavesPromise,
          staffProfilePromise,
          metricsPromise,
        ]);

        setShifts(shiftsRes.data);
        setMetrics({
          leaveBalance: Number.isFinite(Number(metricsRes.data?.leaveBalance))
            ? Number(metricsRes.data.leaveBalance)
            : 12,
        });
        
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
            createdAt: l.createdAt ? new Date(l.createdAt) : start,
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

   const getStaffOffDays = () => (
     Array.isArray(currentStaffData?.offDays)
       ? currentStaffData.offDays
       : currentStaffData?.offDays
         ? [currentStaffData.offDays]
         : []
   );

   const isStaffOffDay = (date) => {
     const dayName = format(date, 'EEEE');
     return getStaffOffDays().some(day => day.toLowerCase() === dayName.toLowerCase());
   };

   const getDayStatus = (date) => {
     const isOffDay = isStaffOffDay(date);
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
    type: "Casual",
    reason: "",
  });

  const getSelectedDateKey = (date) => format(date, "yyyy-MM-dd");

  const sortedSelectedDates = [...selectedDates].sort((first, second) => first.localeCompare(second));

  const calendarDays = (() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const leadingBlankCount = (getDay(monthStart) + 6) % 7;

    return [
      ...Array.from({ length: leadingBlankCount }, (_, index) => ({ type: "blank", id: `blank-${index}` })),
      ...eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => ({
        type: "date",
        id: getSelectedDateKey(date),
        date,
      })),
    ];
  })();

  const fullLeaveHistory = leaveHistory;

  const leaveHistoryYears = useMemo(() => {
    const years = fullLeaveHistory
      .map(getLeaveYear)
      .filter(Boolean);

    return [...new Set([String(new Date().getFullYear()), ...years])]
      .sort((first, second) => Number(second) - Number(first));
  }, [fullLeaveHistory]);

  const filteredLeaveHistory = useMemo(() => (
    [...fullLeaveHistory]
      .filter((leave) => selectedLeaveYear === "all" || getLeaveYear(leave) === selectedLeaveYear)
      .sort((first, second) => (
        getTimeValue(second.createdAt || second.startDate) - getTimeValue(first.createdAt || first.startDate)
      ))
  ), [fullLeaveHistory, selectedLeaveYear]);

  const toggleSelectedDate = (date) => {
    if (isStaffOffDay(date)) {
      toast.error("You cannot apply leave on a scheduled off day.");
      return;
    }

    const dateKey = getSelectedDateKey(date);
    setSelectedDates((prev) => (
      prev.includes(dateKey)
        ? prev.filter((selectedDate) => selectedDate !== dateKey)
        : [...prev, dateKey].filter((selectedDate) => !isStaffOffDay(new Date(`${selectedDate}T00:00:00`)))
    ));
  };

  const removeSelectedDate = (dateKey) => {
    setSelectedDates((prev) => prev.filter((selectedDate) => selectedDate !== dateKey));
  };

  const groupConsecutiveDates = (dates) => {
    const sortedDates = [...dates].sort((first, second) => first.localeCompare(second));

    return sortedDates.reduce((ranges, dateKey) => {
      const currentDate = new Date(`${dateKey}T00:00:00`);
      const previousRange = ranges[ranges.length - 1];

      if (!previousRange) {
        return [{ startDate: dateKey, endDate: dateKey }];
      }

      const previousEndDate = new Date(`${previousRange.endDate}T00:00:00`);
      const nextExpectedDate = addDays(previousEndDate, 1);

      if (getSelectedDateKey(nextExpectedDate) === getSelectedDateKey(currentDate)) {
        previousRange.endDate = dateKey;
        return ranges;
      }

      return [...ranges, { startDate: dateKey, endDate: dateKey }];
    }, []);
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingLeave) return;

    try {
      if (selectedDates.length === 0 || !leaveForm.reason) {
        toast.error("Please fill in all required fields.");
        return;
      }

      const validSelectedDates = selectedDates.filter((dateKey) => !isStaffOffDay(new Date(`${dateKey}T00:00:00`)));
      if (validSelectedDates.length !== selectedDates.length) {
        setSelectedDates(validSelectedDates);
        toast.error("Scheduled off days were removed from your leave selection.");
        return;
      }

      setIsSubmittingLeave(true);
      const token = localStorage.getItem("token");
      const leaveDateRanges = groupConsecutiveDates(validSelectedDates);
      const leaveRequests = await Promise.all(
        leaveDateRanges.map((range) => axios.post(
          "http://localhost:5000/api/roster/leaves",
          {
            ...leaveForm,
            startDate: range.startDate,
            endDate: range.endDate,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ))
      );

      const newLeaves = leaveRequests
        .map((response) => response.data.leave)
        .filter(Boolean)
        .map((newLeave) => ({
          id: newLeave._id,
          type: newLeave.leaveType,
          startDate: new Date(newLeave.startDate),
          endDate: newLeave.endDate ? new Date(newLeave.endDate) : new Date(newLeave.startDate),
          status: newLeave.status,
          reason: newLeave.reason,
          createdAt: newLeave.createdAt ? new Date(newLeave.createdAt) : new Date(),
          datesDisplay: `${format(new Date(newLeave.startDate), 'MMM dd')}${newLeave.endDate ? ` - ${format(new Date(newLeave.endDate), 'MMM dd')}` : ''}`
        }));

      setLeaveHistory(prev => [
        ...newLeaves,
        ...prev
      ]);

      toast.success(`${newLeaves.length} leave request${newLeaves.length === 1 ? "" : "s"} submitted successfully.`);
      setLeaveForm({ type: "Casual", reason: "" });
      setSelectedDates([]);
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
    <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-0">
      <header className="mb-5 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-4xl">Your Roster & Leave</h1>
        <p className="mt-2 text-sm leading-6 text-gray-400 sm:mt-3 sm:text-base">
          Manage your weekly schedule and apply for leaves.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {/* LEFT COLUMN (2/3 width) */}
        <div className="contents lg:block lg:col-span-2 lg:space-y-6">
          {/* 1. Leave Balance Card (full width of left column) */}
          <GlassCard className="order-1 flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-gray-400">Leave Balance</p>
              <p className="text-2xl font-bold text-white sm:text-3xl">{metrics.leaveBalance} Requests</p>
            </div>
            <Palmtree className="h-8 w-8 text-[#d4af37]" />
          </GlassCard>

          {/* 2. Weekly Planner (full width of left column) */}
          <GlassCard className="order-2 flex-1 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white sm:text-xl">
                <Calendar className="w-5 h-5 text-[#d4af37]" /> Weekly Planner
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <GoldButton onClick={() => setCurrentWeek(addDays(currentWeek, -7))} variant="outline" className="px-3 py-2 text-sm">Previous</GoldButton>
                <GoldButton onClick={() => setCurrentWeek(addDays(currentWeek, 7))} variant="outline" className="px-3 py-2 text-sm">Next</GoldButton>
              </div>
            </div>
            <div className="w-full overflow-x-auto scrollbar-none pb-2">
              <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-400 mb-4 min-w-[600px] lg:min-w-0">
                {daysOfWeek.map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2 min-w-[650px] lg:min-w-0">
                {getWeekDays().map((date, index) => (
                  <div key={index} className={`flex flex-col items-center justify-center rounded-lg border p-3 ${isSameDay(date, new Date())
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

          {/* 3. Leave History (full width of left column) */}
          <GlassCard className="order-4 p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <NotebookText className="w-5 h-5 text-[#d4af37]" /> Leave History
              </h2>
              <select
                value={selectedLeaveYear}
                onChange={(e) => setSelectedLeaveYear(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#07090d] px-3 py-2 text-sm font-semibold text-slate-200 outline-none transition focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] sm:w-36"
                aria-label="Filter leave history by year"
              >
                <option value="all">All</option>
                {leaveHistoryYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-[#07090d] scrollbar-thumb-slate-700 hover:scrollbar-thumb-[#d4af37]/70 sm:max-h-96 sm:pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#07090d] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-[#d4af37]/70">
              {filteredLeaveHistory.length > 0 ? (
                filteredLeaveHistory.map((leave) => (
                  <div key={leave.id} className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-[#07090d] p-3.5 transition-colors hover:border-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-slate-200">{leave.type}</span>
                      {getLeaveStatusBadge(leave.status)}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{leave.datesDisplay}</span>
                    <p className="text-xs text-slate-400 mt-1">Reason: {leave.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No leave requests found for this year.</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN (1/3 width) */}
        <div className="order-3 lg:order-none lg:col-span-1">
          {/* Apply Leave Form */}
          <GlassCard className="p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
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
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Leave Dates</label>
                  <span className="text-xs font-semibold text-[#d4af37]">Total: {selectedDates.length} Days</span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#07090d] p-2.5 sm:p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((prev) => addDays(startOfMonth(prev), -1))}
                      className="rounded-lg border border-slate-800 p-1.5 text-slate-400 transition hover:border-[#d4af37]/60 hover:text-[#d4af37]"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-semibold text-slate-100">{format(calendarMonth, "MMMM yyyy")}</p>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((prev) => addDays(endOfMonth(prev), 1))}
                      className="rounded-lg border border-slate-800 p-1.5 text-slate-400 transition hover:border-[#d4af37]/60 hover:text-[#d4af37]"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {calendarDaysOfWeek.map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {calendarDays.map((calendarDay) => {
                      if (calendarDay.type === "blank") {
                        return <div key={calendarDay.id} className="aspect-square" />;
                      }

                      const dateKey = getSelectedDateKey(calendarDay.date);
                      const isSelected = selectedDates.includes(dateKey);
                      const isToday = isSameDay(calendarDay.date, new Date());
                      const isOffDay = isStaffOffDay(calendarDay.date);

                      return (
                        <button
                          type="button"
                          key={calendarDay.id}
                          onClick={() => toggleSelectedDate(calendarDay.date)}
                          disabled={isOffDay}
                          className={`aspect-square min-h-9 rounded-lg text-xs font-semibold transition ${
                            isOffDay
                              ? "opacity-40 cursor-not-allowed pointer-events-none text-slate-600 bg-slate-900/40"
                              : isSelected
                              ? "bg-[#c5a880] text-black shadow-[0_0_16px_rgba(197,168,128,0.35)]"
                              : isToday
                                ? "border border-[#d4af37]/70 bg-[#d4af37]/10 text-[#d4af37]"
                                : isSameMonth(calendarDay.date, calendarMonth)
                                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                                  : "text-slate-700"
                          }`}
                        >
                          {format(calendarDay.date, "d")}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex max-h-24 flex-wrap items-center gap-2 overflow-y-auto pr-1">
                  {sortedSelectedDates.length > 0 ? (
                    sortedSelectedDates.map((dateKey) => (
                      <span
                        key={dateKey}
                        className="inline-flex items-center gap-1 rounded-full border border-[#c5a880]/30 bg-[#c5a880]/10 px-2.5 py-1 text-xs font-semibold text-[#f1d9ad]"
                      >
                        {format(new Date(`${dateKey}T00:00:00`), "MMM d")}
                        <button
                          type="button"
                          onClick={() => removeSelectedDate(dateKey)}
                          className="rounded-full p-0.5 text-[#f1d9ad] transition hover:bg-[#c5a880]/20 hover:text-white"
                          aria-label={`Remove ${format(new Date(`${dateKey}T00:00:00`), "MMM d")}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-600">No leave dates selected.</span>
                  )}
                </div>
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
