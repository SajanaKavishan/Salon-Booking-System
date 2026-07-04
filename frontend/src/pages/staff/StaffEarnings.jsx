import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { CalendarCheck, CheckCircle2, ChevronDown, DollarSign, Loader2, TrendingUp } from "lucide-react";
import { toast } from "react-toastify";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BACKEND_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const RANGE_OPTIONS = [
  { value: "FULL_YEAR", label: "Full year" },
  { value: "YTD", label: "Year to date" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
];
const ROLLING_RANGE_VALUES = ["LAST_30_DAYS", "LAST_7_DAYS"];
const YEAR_LISTBOX_ID = "staff-earnings-year-listbox";
const RANGE_LISTBOX_ID = "staff-earnings-range-listbox";

const tooltipStyle = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: "10px",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
};

const formatCurrency = (amount) => (
  `Rs. ${new Intl.NumberFormat("en-LK", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`
);

const formatRevenueAxis = (value) => {
  const numericValue = Number(value) || 0;
  if (numericValue >= 100000000) return `${Number((numericValue / 1000000).toFixed(1))}M`;
  if (numericValue >= 1000000) return `${Number((numericValue / 1000000).toFixed(2))}M`;
  if (numericValue >= 1000) return `${Number((numericValue / 1000).toFixed(1))}k`;
  return `${numericValue}`;
};

const getRevenueXAxisTicks = (data, range, isNarrowViewport) => {
  if (!["LAST_7_DAYS", "LAST_30_DAYS"].includes(range)) return undefined;

  const labels = (Array.isArray(data) ? data : [])
    .map((item) => item.label)
    .filter(Boolean);

  if (labels.length <= 1) return labels;

  const step = range === "LAST_30_DAYS" ? (isNarrowViewport ? 7 : 5) : 2;
  const ticks = labels.filter((_, index) => index % step === 0);
  const lastLabel = labels[labels.length - 1];

  return ticks.includes(lastLabel) ? ticks : [...ticks, lastLabel];
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

function StaffEarnings() {
  const currentYear = new Date().getFullYear();
  const isNarrowViewport = useIsNarrowViewport();
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterRange, setFilterRange] = useState("YTD");
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [summary, setSummary] = useState({
    rangeLabel: "Year to date",
    totalRevenue: 0,
    completedServices: 0,
    averageServiceValue: 0,
    revenueTrends: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const yearRef = useRef(null);
  const rangeRef = useRef(null);

  const rangeLabel = useMemo(
    () => RANGE_OPTIONS.find((option) => option.value === filterRange)?.label || "Year to date",
    [filterRange]
  );
  const isRollingRange = ROLLING_RANGE_VALUES.includes(filterRange);

  const selectYear = useCallback((year) => {
    setFilterYear(String(year));
    setIsYearOpen(false);
  }, []);

  const selectRange = useCallback((range) => {
    setFilterRange(range);
    setIsRangeOpen(false);
    if (ROLLING_RANGE_VALUES.includes(range)) {
      setIsYearOpen(false);
    }
  }, []);

  const handleYearKeyDown = useCallback((event) => {
    const years = availableYears.map(String);
    if (years.length === 0 || isRollingRange) return;

    const currentIndex = Math.max(0, years.indexOf(filterYear));

    if (event.key === "Escape") {
      event.preventDefault();
      setIsYearOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsYearOpen((isOpen) => !isOpen);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectYear(years[(currentIndex + 1) % years.length]);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectYear(years[(currentIndex - 1 + years.length) % years.length]);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      selectYear(years[0]);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      selectYear(years[years.length - 1]);
    }
  }, [availableYears, filterYear, isRollingRange, selectYear]);

  const handleRangeKeyDown = useCallback((event) => {
    const currentIndex = Math.max(0, RANGE_OPTIONS.findIndex((option) => option.value === filterRange));

    if (event.key === "Escape") {
      event.preventDefault();
      setIsRangeOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsRangeOpen((isOpen) => !isOpen);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectRange(RANGE_OPTIONS[(currentIndex + 1) % RANGE_OPTIONS.length].value);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectRange(RANGE_OPTIONS[(currentIndex - 1 + RANGE_OPTIONS.length) % RANGE_OPTIONS.length].value);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      selectRange(RANGE_OPTIONS[0].value);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      selectRange(RANGE_OPTIONS[RANGE_OPTIONS.length - 1].value);
    }
  }, [filterRange, selectRange]);

  const calculateYAxisWidth = useCallback((data, formatter) => {
    if (!data || data.length === 0) return 34;

    const maxLength = data.reduce((longestLabel, item) => {
      const formattedValue = formatter ? formatter(item.revenue) : `${item.revenue}`;
      return Math.max(longestLabel, String(formattedValue).length);
    }, 0);

    return Math.ceil(Math.max(34, maxLength * 7.5 + 10));
  }, []);

  const revenueYAxisWidth = useMemo(
    () => calculateYAxisWidth(summary.revenueTrends, formatRevenueAxis),
    [calculateYAxisWidth, summary.revenueTrends]
  );

  const revenueXAxisTicks = useMemo(
    () => getRevenueXAxisTicks(summary.revenueTrends, filterRange, isNarrowViewport),
    [filterRange, isNarrowViewport, summary.revenueTrends]
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (yearRef.current && !yearRef.current.contains(event.target)) {
        setIsYearOpen(false);
      }

      if (rangeRef.current && !rangeRef.current.contains(event.target)) {
        setIsRangeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isRollingRange) {
      setIsYearOpen(false);
    }
  }, [isRollingRange]);

  useEffect(() => {
    let isMounted = true;

    const fetchEarningsSummary = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Session expired, please sign out and log back in.");
        }

        const response = await axios.get(`${BACKEND_BASE_URL}/api/appointments/staff/earnings-summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            range: filterRange,
            ...(isRollingRange ? {} : { year: filterYear }),
          },
        });

        if (isMounted) {
          setSummary({
            rangeLabel: response.data?.rangeLabel || rangeLabel,
            totalRevenue: Number(response.data?.totalRevenue) || 0,
            completedServices: Number(response.data?.completedServices) || 0,
            averageServiceValue: Number(response.data?.averageServiceValue) || 0,
            revenueTrends: Array.isArray(response.data?.revenueTrends)
              ? response.data.revenueTrends
              : [],
          });
          setAvailableYears(
            Array.isArray(response.data?.availableYears) && response.data.availableYears.length > 0
              ? response.data.availableYears
              : [currentYear]
          );
        }
      } catch (error) {
        console.error("Error fetching staff earnings:", error);
        if (isMounted) {
          toast.error(error.response?.data?.message || error.message || "Failed to load earnings summary.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchEarningsSummary();

    return () => {
      isMounted = false;
    };
  }, [currentYear, filterRange, filterYear, isRollingRange, rangeLabel]);

  const statCards = [
    {
      label: `Total Earnings (${summary.rangeLabel})`,
      value: formatCurrency(summary.totalRevenue),
      subtitle: "Completed appointment revenue",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: "Completed Appointments",
      value: summary.completedServices.toLocaleString(),
      subtitle: `Closed appointments in ${summary.rangeLabel.toLowerCase()}`,
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      label: "Average Appointment Value",
      value: formatCurrency(summary.averageServiceValue),
      subtitle: "Revenue divided by completed appointments",
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 sm:space-y-8 sm:px-6 lg:px-0">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
            Staff Analytics
          </p>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-4xl">
            Earnings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
            Track your completed appointment revenue with the same range controls as admin analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {!isRollingRange && (
            <div ref={yearRef} className="relative w-full sm:w-fit">
              <button
                type="button"
                onClick={() => setIsYearOpen((isOpen) => !isOpen)}
                onKeyDown={handleYearKeyDown}
                className={`flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full border px-4 py-2 text-sm font-semibold transition sm:w-auto ${
                  isYearOpen
                    ? "border-[#d4af37]/40 bg-[#d4af37]/10 text-white"
                    : "border-white/10 bg-white/[0.04] text-white hover:border-[#d4af37]/30"
                }`}
                aria-haspopup="listbox"
                aria-expanded={isYearOpen}
                aria-controls={YEAR_LISTBOX_ID}
              >
                <CalendarCheck size={16} className="text-[#d4af37]" />
                {filterYear}
                <ChevronDown size={16} className={`transition-transform ${isYearOpen ? "rotate-180" : ""}`} />
              </button>

              {isYearOpen && (
                <div
                  id={YEAR_LISTBOX_ID}
                  className="absolute left-0 top-full z-30 mt-2 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl sm:w-32"
                  role="listbox"
                  aria-label="Earnings year"
                >
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => selectYear(year)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectYear(year);
                          return;
                        }
                        handleYearKeyDown(event);
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
          )}

          <div ref={rangeRef} className="relative w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setIsRangeOpen((isOpen) => !isOpen)}
              onKeyDown={handleRangeKeyDown}
              className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-2 text-sm font-semibold text-[#d4af37] transition hover:border-[#d4af37]/40 hover:bg-[#d4af37]/15 sm:w-auto"
              aria-haspopup="listbox"
              aria-expanded={isRangeOpen}
              aria-controls={RANGE_LISTBOX_ID}
            >
              <TrendingUp size={16} />
              {rangeLabel}
              <ChevronDown size={16} className={`transition-transform ${isRangeOpen ? "rotate-180" : ""}`} />
            </button>

            {isRangeOpen && (
              <div
                id={RANGE_LISTBOX_ID}
                className="absolute right-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#111]/95 p-1.5 shadow-2xl backdrop-blur-xl sm:w-44"
                role="listbox"
                aria-label="Earnings range"
              >
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectRange(option.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectRange(option.value);
                        return;
                      }
                      handleRangeKeyDown(event);
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

      <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3" aria-label="Staff earnings summary">
        {statCards.map((card) => (
          <article
            key={card.label}
            className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 shadow-2xl backdrop-blur-xl sm:p-6"
          >
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#d4af37]/[0.06] blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-400">{card.label}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {isLoading ? "..." : card.value}
                </p>
                <p className="mt-2 text-xs text-neutral-500">{card.subtitle}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37] sm:h-12 sm:w-12">
                {card.icon}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">Revenue Analytics Over Time</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Completed appointment revenue for {summary.rangeLabel.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="mt-5 h-[280px] w-full min-w-0 sm:mt-6 sm:h-[350px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#d4af37]" />
            </div>
          ) : (
            <>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={isNarrowViewport ? 280 : 350}
                initialDimension={{ width: 1, height: isNarrowViewport ? 280 : 350 }}
              >
                <AreaChart
                  data={summary.revenueTrends}
                  margin={{ top: 10, right: isNarrowViewport ? 4 : 10, left: isNarrowViewport ? -8 : 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="staffRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#737373"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    minTickGap={isNarrowViewport ? 12 : 18}
                    padding={{ left: 4, right: isNarrowViewport ? 28 : 20 }}
                    tick={{ fill: "#a3a3a3", fontSize: isNarrowViewport ? 10 : 12 }}
                    tickMargin={10}
                    ticks={revenueXAxisTicks}
                  />
                  <YAxis
                    width={revenueYAxisWidth}
                    tickMargin={isNarrowViewport ? 2 : 4}
                    stroke="#737373"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a3a3a3", fontSize: isNarrowViewport ? 10 : 12 }}
                    tickFormatter={formatRevenueAxis}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#ffffff" }}
                    itemStyle={{ color: "#d4af37" }}
                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#d4af37"
                    strokeWidth={2.5}
                    fill="url(#staffRevenueGradient)"
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
              <table className="sr-only">
                <caption>Revenue trend data for {summary.rangeLabel.toLowerCase()}</caption>
                <thead>
                  <tr>
                    <th scope="col">Period</th>
                    <th scope="col">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.revenueTrends.length > 0 ? (
                    summary.revenueTrends.map((item) => (
                      <tr key={item.label}>
                        <td>{item.label}</td>
                        <td>{formatCurrency(item.revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2}>No revenue data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default StaffEarnings;
