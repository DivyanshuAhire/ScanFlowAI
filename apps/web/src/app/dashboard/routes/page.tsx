"use client";

import { motion } from "framer-motion";
import { MapPin, Navigation, Clock, CheckCircle2, ChevronRight, MoreVertical } from "lucide-react";

export default function RoutesPage() {
  const routes = [
    {
      id: "R-101",
      employee: "Michael Chen",
      status: "In Transit",
      stops: [
        { clinic: "City Dental", status: "completed", time: "09:00 AM" },
        { clinic: "OrthoMax", status: "current", time: "11:30 AM" },
        { clinic: "Sunrise Dental", status: "pending", time: "02:00 PM" },
        { clinic: "Family Smiles", status: "pending", time: "04:30 PM" },
      ]
    },
    {
      id: "R-102",
      employee: "Sarah Jenkins",
      status: "On Site",
      stops: [
        { clinic: "Smile Clinic", status: "completed", time: "08:30 AM" },
        { clinic: "Dental Health", status: "completed", time: "10:00 AM" },
        { clinic: "Westside Ortho", status: "current", time: "01:00 PM" },
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Route Optimization</h1>
          <p className="text-zinc-500">Live field tracking and AI-optimized routes.</p>
        </div>
        <button className="px-6 py-2 bg-primary text-white rounded-xl font-medium hover:bg-blue-600 transition-all">
          Generate New Routes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Route List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 px-2">Active Teams</h3>
          {routes.map((route, i) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-3xl bg-zinc-950 border border-zinc-900 hover:border-primary/30 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg">{route.employee}</h4>
                  <p className="text-xs text-zinc-500">Route {route.id}</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase">
                  {route.status}
                </span>
              </div>
              
              <div className="space-y-4 relative">
                {/* Connecting Line */}
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-zinc-800"></div>
                
                {route.stops.map((stop, j) => (
                  <div key={j} className="flex gap-4 relative z-10">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      stop.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 
                      stop.status === 'current' ? 'bg-primary border-primary animate-pulse' : 
                      'bg-zinc-950 border-zinc-800'
                    }`}>
                      {stop.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className={`text-sm font-medium ${stop.status === 'pending' ? 'text-zinc-500' : 'text-zinc-200'}`}>
                          {stop.clinic}
                        </span>
                        <span className="text-xs text-zinc-600">{stop.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Est. Arrival: 15 mins</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-primary transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Map Mockup */}
        <div className="lg:col-span-2 rounded-[32px] bg-zinc-900/50 border border-zinc-800 overflow-hidden relative min-h-[500px]">
          <div className="absolute inset-0 bg-[#0a0a0a]">
            {/* Grid background for map feeling */}
            <div className="absolute inset-0 opacity-20" style={{ 
              backgroundImage: "radial-gradient(#3b82f6 1px, transparent 1px)", 
              backgroundSize: "40px 40px" 
            }}></div>
            
            {/* Simulated Pins */}
            <div className="absolute top-1/4 left-1/3">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/20 rounded-full animate-ping"></div>
                <div className="w-6 h-6 bg-primary rounded-full border-4 border-zinc-950 flex items-center justify-center shadow-lg">
                  <Navigation className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2">
              <MapPin className="text-emerald-500 w-8 h-8 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="absolute bottom-1/3 right-1/4">
              <MapPin className="text-zinc-500 w-8 h-8 -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* Simulated Route Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path 
                d="M 250 150 Q 400 300 500 450 T 800 600" 
                stroke="#3b82f6" 
                strokeWidth="4" 
                fill="none" 
                strokeDasharray="8 8"
                className="opacity-50"
              />
            </svg>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-8 right-8 flex flex-col gap-2">
            <button className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white">+</button>
            <button className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white">-</button>
          </div>

          <div className="absolute top-8 left-8 p-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl max-w-xs">
            <h5 className="font-bold text-sm mb-2">Michael Chen</h5>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Navigation className="w-3 h-3" />
              <span>Moving towards OrthoMax Clinic</span>
            </div>
            <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-primary"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
