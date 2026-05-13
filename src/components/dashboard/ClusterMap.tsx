'use client';

import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ClusterMap = () => {
  // This is a visual representation of clusters and their relationships
  const nodes = [
    { id: '1', name: 'HQ', type: 'HQ', x: 200, y: 150 },
    { id: '2', name: 'Andheri', type: 'CLUSTER', x: 100, y: 50, clinics: 5 },
    { id: '3', name: 'Powai', type: 'CLUSTER', x: 300, y: 80, clinics: 3 },
    { id: '4', name: 'Bandra', type: 'CLUSTER', x: 80, y: 250, clinics: 8 },
    { id: '5', name: 'Malad', type: 'CLUSTER', x: 320, y: 280, clinics: 4 },
  ];

  const connections = [
    { from: '1', to: '2' },
    { from: '1', to: '3' },
    { from: '1', to: '4' },
    { from: '1', to: '5' },
    { from: '2', to: '3' },
  ];

  return (
    <div className="card-premium relative overflow-hidden bg-slate-50 min-h-[500px]">
      <div className="absolute top-6 left-6 z-10">
        <h3 className="text-lg font-bold text-slate-900">Cluster Visualization</h3>
        <p className="text-sm text-slate-500">Interactive map of diagnostic clusters.</p>
      </div>

      <div className="relative w-full h-[400px] mt-12">
        {/* SVG Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, i) => {
            const from = nodes.find(n => n.id === conn.from)!;
            const to = nodes.find(n => n.id === conn.to)!;
            return (
              <line 
                key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y} 
                stroke="#cbd5e1" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div 
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ left: node.x, top: node.y }}
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110",
              node.type === 'HQ' ? "bg-slate-900 text-white" : "bg-white text-blue-600 border-2 border-blue-100"
            )}>
              <MapPin className="w-5 h-5" />
            </div>
            
            <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs font-bold text-slate-900">{node.name}</p>
              {node.clinics && <p className="text-[10px] text-slate-500 font-medium">{node.clinics} Clinics</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between bg-white/80 backdrop-blur px-4 py-3 rounded-xl border border-white/40">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
            <span className="text-xs font-medium text-slate-600">Company HQ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-xs font-medium text-slate-600">Cluster Node</span>
          </div>
        </div>
        <button className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
          Manage Clusters <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
