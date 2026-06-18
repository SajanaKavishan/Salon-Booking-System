import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  CalendarCheck,
  ChevronDown,
  Scissors,
  TrendingUp,
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
import MoneyBundleIcon from "../../components/common/MoneyBundleIcon";

const STATUS_COLORS = {
  Approved: "#d4af37",
  Pending: "#ffffff",
  Cancelled: "#525252",
  Rejected: "#ef4444",
};

const DEFAULT_STATUS_COLOR = "#737373";

const tooltipStyle = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: "10px",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
};

function Analytics() {
  const currentYear = new Date().getFullYear();
  const [summary, setSummary] = useState({
    revenue: 0,
    appointments: 0,
    clients: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [topServicesData, setTopServicesData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [revenueRange, setRevenueRange] = useState("ytd");
  const [isRevenueRangeOpen, setIsRevenueRangeOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const revenueRangeRef = useRef(null);
  const yearRef = useRef(null);

  const summaryMetrics = [
    {
      label:
        selectedYear === currentYear
          ? "Total Revenue (YTD)"
          : `Total Revenue (${selectedYear})`,
      value: `Rs. ${summary.revenue.toLocaleString()}`,
      detail: "Completed appointment revenue",
      icon: MoneyBundleIcon,
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

  const displayedTrendData = useMemo(() => {
    if (selectedYear !== currentYear || revenueRange === "full-year") {
      return trendData;
    }

    return trendData.slice(0, new Date().getMonth() + 1);
  }, [currentYear, revenueRange, selectedYear, trendData]);

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
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Admin authentication token is missing.");
        }

        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };

        const [
          summaryResponse,
          topServicesResponse,
          statusResponse,
        ] = await Promise.all([
          axios.get(
            "http://localhost:5000/api/dashboard/analytics-summary",
            {
              ...config,
              params: { year: selectedYear },
            }
          ),
          axios.get(
            "http://localhost:5000/api/dashboard/top-services",
            config
          ),
          axios.get(
            "http://localhost:5000/api/dashboard/appointment-status",
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
            Array.isArray(statusResponse.data) ? statusResponse.data : []
          );
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
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [currentYear, selectedYear]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 sm:space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
          Performance Overview
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Comprehensive Analytics
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
          In-depth insights into salon performance and revenue
        </p>
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
                  {value}
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

      <GlassCard className="border border-white/[0.05] bg-white/[0.02] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Revenue Trends</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {selectedYear === currentYear && revenueRange === "ytd"
                ? "Monthly revenue from January through the current month"
                : `Monthly revenue across ${selectedYear}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div ref={yearRef} className="relative w-fit">
              <button
                type="button"
                onClick={() => setIsYearOpen((isOpen) => !isOpen)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-[#d4af37]/30 hover:text-white"
                aria-haspopup="listbox"
                aria-expanded={isYearOpen}
              >
                <CalendarCheck size={14} className="text-[#d4af37]" />
                {selectedYear}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    isYearOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isYearOpen && (
                <div
                  className="absolute right-0 top-full z-30 mt-2 max-h-52 w-28 overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1 shadow-2xl backdrop-blur-xl"
                  role="listbox"
                  aria-label="Revenue chart year"
                >
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setSelectedYear(year);
                        setRevenueRange(
                          year === currentYear ? "ytd" : "full-year"
                        );
                        setIsYearOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                        selectedYear === year
                          ? "bg-[#d4af37]/10 text-[#d4af37]"
                          : "text-neutral-400 hover:bg-white/5 hover:text-white"
                      }`}
                      role="option"
                      aria-selected={selectedYear === year}
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
                className="flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-medium text-[#d4af37] transition hover:border-[#d4af37]/40 hover:bg-[#d4af37]/15"
                aria-haspopup="listbox"
                aria-expanded={isRevenueRangeOpen}
              >
                <TrendingUp size={14} />
                {selectedYear === currentYear && revenueRange === "ytd"
                  ? "Year to date"
                  : "Full year"}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    isRevenueRangeOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isRevenueRangeOpen && (
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-white/10 bg-[#111]/95 p-1 shadow-2xl backdrop-blur-xl"
                  role="listbox"
                  aria-label="Revenue chart range"
                >
                  {[
                    ...(selectedYear === currentYear
                      ? [{ value: "ytd", label: "Year to date" }]
                      : []),
                    { value: "full-year", label: "Full year" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setRevenueRange(option.value);
                        setIsRevenueRangeOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                        revenueRange === option.value
                          ? "bg-[#d4af37]/10 text-[#d4af37]"
                          : "text-neutral-400 hover:bg-white/5 hover:text-white"
                      }`}
                      role="option"
                      aria-selected={revenueRange === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              data={displayedTrendData}
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
        <GlassCard className="min-w-0 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
              <Scissors size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Top 5 Booked Services
              </h2>
              <p className="text-xs text-neutral-500">
                Most frequently requested salon services
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
                margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
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
                  tick={{ fill: "#a3a3a3", fontSize: 12 }}
                  interval={0}
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

        <GlassCard className="min-w-0 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
              <CalendarCheck size={19} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Appointment Status
              </h2>
              <p className="text-xs text-neutral-500">
                Distribution across all appointments
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
    </div>
  );
}

export default Analytics;
