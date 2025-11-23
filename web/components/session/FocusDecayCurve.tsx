'use client';

import { ActivitySegment } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AnchorCard } from '@/components/ui/AnchorCard';

interface FocusDecayCurveProps {
  segments: ActivitySegment[];
  totalDuration: number;
  sessionStart: string;
}

export function FocusDecayCurve({ segments, totalDuration, sessionStart }: FocusDecayCurveProps) {
  if (!segments || segments.length === 0) return null;

  // Transform segments into time-series data for the chart
  // We want a point every minute or so to show focus state
  // 1 = locked in, 0 = distracted/idle
  
  const startTime = new Date(sessionStart).getTime();
  const endTime = startTime + (totalDuration * 1000);
  const dataPoints = [];
  
  // Create data points every 30 seconds
  const step = 30 * 1000; 
  let currentTime = startTime;

  while (currentTime <= endTime) {
    // Find segment active at currentTime
    const activeSegment = segments.find(s => {
      const sStart = new Date(s.start).getTime();
      const sEnd = new Date(s.end).getTime();
      return currentTime >= sStart && currentTime < sEnd;
    });

    const isFocused = activeSegment?.lockedIn ? 100 : 0;
    const isIdle = activeSegment?.reason === 'idle_beyond_2m';
    
    dataPoints.push({
      time: (currentTime - startTime) / 60000, // minutes from start
      focus: isIdle ? 50 : isFocused, // 50% for idle, 0% for distraction, 100% for focus
      state: activeSegment?.lockedIn ? 'Focused' : (isIdle ? 'Idle' : 'Distracted'),
    });

    currentTime += step;
  }

  return (
    <AnchorCard title="Focus Flow" subtitle="Your depth over time">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={dataPoints}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              tickFormatter={(val) => `${Math.floor(val)}m`}
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={[0, 100]} 
              hide
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelFormatter={(val) => `${Math.floor(val)} min`}
              formatter={(value: number, name: string, props: any) => [
                props.payload.state,
                'State'
              ]}
            />
            <Area 
              type="stepAfter" 
              dataKey="focus" 
              stroke="#0d9488" 
              fillOpacity={1} 
              fill="url(#colorFocus)" 
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-teal-500 rounded-full opacity-80"></div>
          <span>Deep Work</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-teal-500 rounded-full opacity-40"></div>
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
          <span>Distracted</span>
        </div>
      </div>
    </AnchorCard>
  );
}

