import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  CalendarCheck,
  DollarSign,
  Scissors,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import {
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

const summaryMetrics = [
  {
    label: "Total Revenue (YTD)",
    value: "$12,450",
    detail: "Year-to-date earnings",
    icon: DollarSign,
  },
  {
    label: "Total Appointments",
    value: "342",
    detail: "Appointments completed",
    icon: CalendarCheck,
  },
  {
    label: "New Clients",
    value: "89",
    detail: "First-time clients",
    icon: UserPlus,
  },
];

// Colors for the Pie Chart matching the theme
const PIE_COLORS = ["#d4af37", "#ffffff", "#404040"];

const tooltipStyle = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: "10px",
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
};

function Analytics() {
  const [topServicesData, setTopServicesData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  const totalStatusAppointments = useMemo(
    () => statusData.reduce((total, status) => total + status.value, 0),
    [statusData]
  );

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

        const [topServicesResponse, statusResponse] = await Promise.all([
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
  }, []);

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Revenue Trends</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Monthly revenue performance overview
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-medium text-[#d4af37]">
            <TrendingUp size={14} />
            Year to date
          </div>
        </div>

        <div className="mt-6 flex h-[350px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20">
          <div className="text-center">
            <TrendingUp className="mx-auto h-9 w-9 text-[#d4af37]/60" />
            <p className="mt-3 text-sm font-medium text-neutral-400">
              Chart goes here
            </p>
          </div>
        </div>
      </GlassCard>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl">
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
            <ResponsiveContainer width="100%" height="100%">
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

        <GlassCard className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl">
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
            <ResponsiveContainer width="100%" height="100%">
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
                  {statusData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
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
            {statusData.map((status, index) => (
              <div
                key={status.name}
                className="flex items-center gap-2 text-xs text-neutral-400"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                  }}
                />
                {status.name}
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}

export default Analytics;
