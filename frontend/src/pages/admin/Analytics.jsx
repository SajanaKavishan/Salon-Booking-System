import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  CalendarCheck,
  ChevronDown,
  DollarSign,
  Loader2,
  Scissors,
  Star,
  TrendingUp,
  UserRound,
  UserPlus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "../../components/admin/SystemUI";

const STATUS_COLORS = {
  Completed: "#22c55e",
  Cancelled: "#525252",
  Rejected: "#ef4444",
};

const DEFAULT_STATUS_COLOR = "#737373";
const DISPLAYED_STATUS_NAMES = ["Completed", "Rejected", "Cancelled"];
const FILTER_RANGE_OPTIONS = [
  { value: "FULL_YEAR", label: "Full year" },
  { value: "YTD", label: "Year to date" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
];

const tooltipStyle = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: "10px",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
};

const BACKEND_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const formatRating = (rating) => Number(rating || 0).toFixed(1);
const getRangeLabel = (range) =>
  FILTER_RANGE_OPTIONS.find((option) => option.value === range)?.label ||
  "Year to date";
const compactAxisLabel = (label, maxLength = 12) => {
  const text = String(label || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

const useIsNarrowViewport = () => {
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < 640
  );

  useEffect(() => {
    const handleResize = () => setIsNarrowViewport(window.innerWidth < 640);

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isNarrowViewport;
};

const normalizeAppointmentStatusData = (statuses) => {
  const statusTotals = DISPLAYED_STATUS_NAMES.reduce((totals, status) => {
    totals[status] = 0;
    return totals;
  }, {});

  (Array.isArray(statuses) ? statuses : []).forEach((status) => {
    const name = String(status?.name || "").trim().toLowerCase();
    const value = Number(status?.value) || 0;

    if (name === "completed") statusTotals.Completed += value;
    if (name === "rejected") statusTotals.Rejected += value;
    if (name === "cancelled" || name === "canceled") {
      statusTotals.Cancelled += value;
    }
  });

  return DISPLAYED_STATUS_NAMES.map((name) => ({
    name,
    value: statusTotals[name],
  }));
};

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;
  return `${BACKEND_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

function StaffAvatar({ staff, className = "" }) {
  const imageSrc = getImageUrl(staff?.imageUrl || staff?.profileImage);

  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-zinc-500 ${className}`}>
      <UserRound className="h-1/2 w-1/2" />
      {imageSrc && (
        <img
          src={imageSrc}
          alt={staff?.name || "Stylist"}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

function StylistLeaderboard({ staffPerformanceData, isLoading }) {
  const champion = staffPerformanceData[0];
  const runnersUp = staffPerformanceData.slice(1, 7);

  return (
    <GlassCard className="relative overflow-hidden border border-white/[0.05] bg-white/[0.02] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
            Stylist Leaderboard
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Top Rated Performance</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ranked by approved customer review ratings.
          </p>
        </div>
      </div>

      {isLoading && !champion ? (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
          Loading stylist leaderboard...
        </div>
      ) : !champion ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-500">
          No stylist performance data is available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="relative flex flex-col items-center rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-6 text-center">
            <span className="absolute right-4 top-4 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
              1st Rank
            </span>

            <StaffAvatar
              staff={champion}
              className="mt-8 h-28 w-28 ring-4 ring-amber-400/50 shadow-[0_0_38px_rgba(251,191,36,0.16)]"
            />

            <h3 className="mt-6 max-w-full truncate font-serif text-2xl font-semibold text-white">
              {champion.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">{champion.specialty || "Stylist"}</p>

            <div className="mt-4 flex items-center gap-2 text-3xl font-bold text-amber-400">
              <Star className="h-7 w-7 fill-amber-400" />
              {formatRating(champion.averageRating)}
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {champion.totalReviewsCount || 0} Reviews
            </p>
          </article>

          <div className="md:col-span-2">
            {runnersUp.length === 0 ? (
              <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-6 text-sm text-zinc-500">
                More ranked stylists will appear as reviews come in.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {runnersUp.map((staff, index) => {
                  const rank = index + 2;

                  return (
                    <article
                      key={staff._id || staff.id || staff.name}
                      className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 transition-all duration-200 hover:bg-zinc-900/60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <StaffAvatar staff={staff} className="h-11 w-11 border border-zinc-800" />
                        <span className="w-9 shrink-0 text-sm font-bold text-zinc-500">#{rank}</span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-white">{staff.name}</h3>
                          <p className="truncate text-xs text-zinc-500">{staff.specialty || "Stylist"}</p>
                        </div>
                      </div>

                      <div className="ml-4 flex shrink-0 items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1 text-sm font-bold text-zinc-200">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {formatRating(staff.averageRating)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function Analytics() {
  const currentYear = new Date().getFullYear();
  const isNarrowViewport = useIsNarrowViewport();
  const [filterYear, setFilterYear] = useState("2026");
  const [filterRange, setFilterRange] = useState("YTD");
  const [summary, setSummary] = useState({
    revenue: 0,
    appointments: 0,
    clients: 0,
  });
  const [staffPerformanceData, setStaffPerformanceData] = useState([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [hasLoadedAnalytics, setHasLoadedAnalytics] = useState(false);
  const [trendData, setTrendData] = useState([]);
  const [topServicesData, setTopServicesData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [isRevenueRangeOpen, setIsRevenueRangeOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const revenueRangeRef = useRef(null);
  const yearRef = useRef(null);
  const selectedYear = Number(filterYear);
  const rangeLabel = getRangeLabel(filterRange);
  const shouldShowSummaryLoader = isAnalyticsLoading;

  const summaryMetrics = [
    {
      label:
        filterRange === "LAST_7_DAYS" || filterRange === "LAST_30_DAYS"
          ? `Total Revenue (${rangeLabel})`
          : selectedYear === currentYear && filterRange === "YTD"
          ? "Total Revenue (YTD)"
          : `Total Revenue (${selectedYear})`,
      value: `Rs. ${summary.revenue.toLocaleString()}`,
      detail: "Completed appointment revenue",
      icon: DollarSign,
    },
    {
      label: "Total Appointments",
      value: summary.appointments.toLocaleString(),
      detail: "All recorded appointments",
      icon: CalendarCheck,
    },
    {
      label: "New Clients",
      value: summary.clients.toLocaleString(),
      detail: "Registered customer accounts",
      icon: UserPlus,
    },
  ];

  const totalStatusAppointments = useMemo(
    () => statusData.reduce((total, status) => total + status.value, 0),
    [statusData]
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        revenueRangeRef.current &&
        !revenueRangeRef.current.contains(event.target)
      ) {
        setIsRevenueRangeOpen(false);
      }

      if (yearRef.current && !yearRef.current.contains(event.target)) {
        setIsYearOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      try {
        setIsAnalyticsLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Admin authentication token is missing.");
        }

        const config = {
          headers: { Authorization: `Bearer ${token}` },
          params: { year: filterYear, range: filterRange },
        };

        const [
          summaryResponse,
          topServicesResponse,
          statusResponse,
          staffPerformanceResponse,
        ] = await Promise.all([
          axios.get(
            `${BACKEND_BASE_URL}/api/dashboard/analytics-summary`,
            config
          ),
          axios.get(
            `${BACKEND_BASE_URL}/api/dashboard/top-services`,
            config
          ),
          axios.get(
            `${BACKEND_BASE_URL}/api/dashboard/appointment-status`,
            config
          ),
          axios.get(
            `${BACKEND_BASE_URL}/api/staff/performance`,
            config
          ),
        ]);

        if (isMounted) {
          const analyticsSummary = summaryResponse.data || {};

          setSummary({
            revenue: Number(analyticsSummary.totalRevenueYTD) || 0,
            appointments: Number(analyticsSummary.totalAppointments) || 0,
            clients: Number(analyticsSummary.newClients) || 0,
          });
          setTrendData(
            Array.isArray(analyticsSummary.revenueTrends)
              ? analyticsSummary.revenueTrends
              : []
          );
          setAvailableYears(
            Array.isArray(analyticsSummary.availableYears) &&
              analyticsSummary.availableYears.length > 0
              ? analyticsSummary.availableYears
              : [currentYear]
          );
          setTopServicesData(
            Array.isArray(topServicesResponse.data)
              ? topServicesResponse.data
              : []
          );
          setStatusData(
            normalizeAppointmentStatusData(statusResponse.data)
          );
          setStaffPerformanceData(
            Array.isArray(staffPerformanceResponse.data)
              ? staffPerformanceResponse.data
              : []
          );
          setHasLoadedAnalytics(true);
        }
      } catch (error) {
        console.error("Analytics data fetch error:", error);

        if (isMounted) {
          toast.error(
            error.response?.data?.message ||
              error.message ||
              "Failed to load analytics data."
          );
        }
      } finally {
        if (isMounted) {
          setIsAnalyticsLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [filterRange, filterYear]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
            Performance Overview
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Comprehensive Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            In-depth insights into salon performance and revenue
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div ref={yearRef} className="relative w-fit">
            <button
              type="button"
              onClick={() => setIsYearOpen((isOpen) => !isOpen)}
              className="flex min-h-10 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-[#d4af37]/30 hover:text-white"
              aria-haspopup="listbox"
              aria-expanded={isYearOpen}
            >
              <CalendarCheck size={16} className="text-[#d4af37]" />
              {filterYear}
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isYearOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isYearOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-2 max-h-52 w-32 overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                role="listbox"
                aria-label="Analytics year"
              >
                {availableYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setFilterYear(String(year));
                      setIsYearOpen(false);
                    }}
                    className={`w-full rounded-lg px-3.5 py-2.5 text-left text-sm transition ${
                      filterYear === String(year)
                        ? "bg-[#d4af37]/10 text-[#d4af37]"
                        : "text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                    role="option"
                    aria-selected={filterYear === String(year)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={revenueRangeRef} className="relative w-fit">
            <button
              type="button"
              onClick={() => setIsRevenueRangeOpen((isOpen) => !isOpen)}
              className="flex min-h-10 items-center gap-2.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-2 text-sm font-semibold text-[#d4af37] transition hover:border-[#d4af37]/40 hover:bg-[#d4af37]/15"
              aria-haspopup="listbox"
              aria-expanded={isRevenueRangeOpen}
            >
              <TrendingUp size={16} />
              {rangeLabel}
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isRevenueRangeOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isRevenueRangeOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                role="listbox"
                aria-label="Analytics range"
              >
                {FILTER_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFilterRange(option.value);
                      setIsRevenueRangeOpen(false);
                    }}
                    className={`w-full rounded-lg px-3.5 py-2.5 text-left text-sm transition ${
                      filterRange === option.value
                        ? "bg-[#d4af37]/10 text-[#d4af37]"
                        : "text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                    role="option"
                    aria-selected={filterRange === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <section
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
        aria-label="Analytics summary"
      >
        {summaryMetrics.map(({ label, value, detail, icon: Icon }) => (
          <GlassCard
            key={label}
            className="relative overflow-hidden border border-white/[0.05] bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#d4af37]/[0.06] blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-400">{label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                  {shouldShowSummaryLoader ? "..." : value}
                </p>
                <p className="mt-2 text-xs text-neutral-500">{detail}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                <Icon size={22} strokeWidth={1.8} />
              </div>
            </div>
          </GlassCard>
        ))}
      </section>

      <GlassCard className="relative overflow-hidden border border-white/[0.05] bg-white/[0.02] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Revenue Trends</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {filterRange === "LAST_7_DAYS" || filterRange === "LAST_30_DAYS"
                ? `Daily completed appointment revenue over the ${rangeLabel.toLowerCase()}`
                : selectedYear === currentYear && filterRange === "YTD"
                ? "Monthly revenue from January through the current month"
                : `Monthly revenue across ${selectedYear}`}
            </p>
          </div>
        </div>

        <div className="mt-6 h-[350px] w-full min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            minHeight={350}
            initialDimension={{ width: 1, height: 350 }}
          >
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 10, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="analyticsRevenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="#737373"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#a3a3a3", fontSize: 12 }}
              />
              <YAxis
                stroke="#737373"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#a3a3a3", fontSize: 12 }}
                tickFormatter={(value) =>
                  value >= 1000 ? `Rs. ${value / 1000}k` : `Rs. ${value}`
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#ffffff" }}
                itemStyle={{ color: "#d4af37" }}
                formatter={(value) => [
                  `Rs. ${Number(value).toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#d4af37"
                strokeWidth={2.5}
                fill="url(#analyticsRevenueGradient)"
                fillOpacity={1}
                activeDot={{
                  r: 5,
                  fill: "#d4af37",
                  stroke: "#111",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
              <Scissors size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Top 5 Booked Services
              </h2>
              <p className="text-xs text-neutral-500">
                Most requested salon services for {rangeLabel.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-6 h-[300px] w-full min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={1}
              minHeight={300}
              initialDimension={{ width: 1, height: 300 }}
            >
              <BarChart
                data={topServicesData}
                margin={{
                  top: 12,
                  right: isNarrowViewport ? 2 : 8,
                  left: isNarrowViewport ? -28 : -18,
                  bottom: isNarrowViewport ? 16 : 0,
                }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#737373"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: isNarrowViewport ? 10 : 12,
                  }}
                  angle={isNarrowViewport ? -25 : 0}
                  textAnchor={isNarrowViewport ? "end" : "middle"}
                  height={isNarrowViewport ? 62 : 30}
                  interval={0}
                  tickFormatter={(value) =>
                    compactAxisLabel(value, isNarrowViewport ? 8 : 14)
                  }
                />
                <YAxis
                  stroke="#737373"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#a3a3a3", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(212, 175, 55, 0.05)" }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#ffffff" }}
                  itemStyle={{ color: "#d4af37" }}
                  formatter={(value) => [value, "Bookings"]}
                />
                <Bar
                  dataKey="bookings"
                  fill="#d4af37"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={64}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
              <CalendarCheck size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Appointment Status
              </h2>
              <p className="text-xs text-neutral-500">
                Final appointment outcomes for {rangeLabel.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="relative mt-6 h-[300px] w-full min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={1}
              minHeight={300}
              initialDimension={{ width: 1, height: 300 }}
            >
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  stroke="none"
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] || DEFAULT_STATUS_COLOR}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#ffffff" }}
                  itemStyle={{ color: "#d4af37" }}
                  formatter={(value) => [value, "Appointments"]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {totalStatusAppointments}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                  Total
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2">
            {statusData.map((status) => (
              <div
                key={status.name}
                className="flex items-center gap-2 text-xs text-neutral-400"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      STATUS_COLORS[status.name] || DEFAULT_STATUS_COLOR,
                  }}
                />
                <span>{status.name}</span>
                <span className="font-semibold text-neutral-200">
                  {status.value}
                </span>
                <span className="text-neutral-600">
                  (
                  {totalStatusAppointments > 0
                    ? Math.round(
                        (status.value / totalStatusAppointments) * 100
                      )
                    : 0}
                  %)
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <StylistLeaderboard
        staffPerformanceData={staffPerformanceData}
        isLoading={isAnalyticsLoading && !hasLoadedAnalytics}
      />
    </div>
  );
}

export default Analytics;
