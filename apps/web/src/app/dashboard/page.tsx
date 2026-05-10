"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  Hospital, 
  CalendarCheck, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

const data = [
  { name: "Mon", scans: 12, revenue: 2400 },
  { name: "Tue", scans: 18, revenue: 3600 },
  { name: "Wed", scans: 15, revenue: 3000 },
  { name: "Thu", scans: 22, revenue: 4400 },
  { name: "Fri", scans: 25, revenue: 5000 },
  { name: "Sat", scans: 8, revenue: 1600 },
];

export default function DashboardOverview() {
  const stats = [
    { label: "Completed Scans", value: "1,284", icon: <CheckCircle2 className="text-emerald-500" />, trend: "+12.5%" },
    { label: "Active Clinics", value: "48", icon: <Hospital className="text-blue-500" />, trend: "+3 this month" },
    { label: "Field Team", value: "12", icon: <Users className="text-purple-500" />, trend: "92% efficiency" },
    { label: "Avg. Turnaround", value: "1.4d", icon: <Clock className="text-amber-500" />, trend: "-0.2d from last week" },
  ];

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500">Welcome back. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors">
            Download Report
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-lg shadow-primary/20">
            Create Appointment
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                {stat.icon}
              </div>
              <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                {stat.trend}
              </span>
            </div>
            <p className="text-sm text-zinc-500 font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-zinc-950 border border-zinc-900">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Operational Performance</h3>
            <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-sm text-zinc-400 focus:outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px" }}
                  itemStyle={{ color: "#3b82f6" }}
                />
                <Area type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorScans)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-900">
          <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {[
              { type: "assigned", msg: "Dr. Smith assigned to Patient Jane Doe", time: "2m ago" },
              { type: "completed", msg: "Scan completed at DentalCare Clinic", time: "15m ago" },
              { type: "delay", msg: "Traffic delay reported for Team Blue", time: "45m ago", icon: <AlertCircle className="text-amber-500" /> },
              { type: "new", msg: "New clinic 'OrthoMax' onboarded", time: "2h ago" },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0"></div>
                <div>
                  <p className="text-sm text-zinc-300 leading-tight">{activity.msg}</p>
                  <p className="text-xs text-zinc-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
