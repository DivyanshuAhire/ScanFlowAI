"use client";

import { motion } from "framer-motion";
import { Activity, Calendar, MapPin, Shield, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white selection:bg-primary/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <Zap className="text-white fill-current" />
          </div>
          <span className="text-2xl font-bold tracking-tight">ScanFlow AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/login" className="px-5 py-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-blue-600/10 rounded-full blur-[120px]" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Now in Production Beta
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Dental Field Ops, <br />
            <span className="text-primary">Automated & Optimized.</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
            ScanFlow AI streamlines your dental lab operations with smart scheduling, 
            real-time routing, and automated patient communication.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 group">
              Launch Dashboard
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-zinc-900 text-white rounded-xl font-semibold border border-zinc-800 hover:bg-zinc-800 transition-all">
              Watch Demo
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full"
        >
          {[
            { icon: <Calendar />, title: "Smart Scheduling", desc: "Drag-and-drop calendar with conflict detection and auto-assignment." },
            { icon: <MapPin />, title: "Route Optimization", desc: "AI-driven route planning for scan teams using real-time traffic data." },
            { icon: <Activity />, title: "Live Tracking", desc: "Monitor field operations and scan progress in real-time." },
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="py-12 border-t border-zinc-900 mt-20">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-zinc-500 text-sm">
            © 2026 ScanFlow AI. All rights reserved.
          </div>
          <div className="flex gap-8 text-zinc-500 text-sm">
            <Link href="#" className="hover:text-white">Privacy Policy</Link>
            <Link href="#" className="hover:text-white">Terms of Service</Link>
            <Link href="#" className="hover:text-white">API Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
