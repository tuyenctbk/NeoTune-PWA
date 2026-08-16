import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Activity, Clock, Flame, Radio, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { DailyActivityStat } from '../types';
import { storageService } from '../services/storageService';

export const ListeningHabitsSection: React.FC = () => {
  const [stats, setStats] = useState<DailyActivityStat[]>([]);
  const [activeMetric, setActiveMetric] = useState<'minutes' | 'stationCount'>('minutes');

  useEffect(() => {
    setStats(storageService.getDailyListeningStats(30));
  }, []);

  // Compute summary totals
  const totalMinutes = stats.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
  const totalSessions = stats.reduce((acc, curr) => acc + (curr.stationCount || 0), 0);
  const activeDays = stats.filter(s => s.minutes > 0).length;
  const currentStreak = stats
    .slice()
    .reverse()
    .reduce((streak, day, idx) => {
      if (idx === 0 && day.minutes === 0) return 0;
      if (day.minutes > 0) return streak + 1;
      return streak;
    }, 0);

  // Formatter for chart data
  const chartData = stats.map((s) => ({
    date: s.date,
    displayDate: s.displayDate,
    dayOfWeek: s.dayOfWeek,
    minutes: s.minutes,
    stationCount: s.stationCount,
  }));

  // Calculate intensity color for heatmap block
  const getHeatmapColor = (minutes: number) => {
    if (minutes === 0) return 'bg-white/5 border-white/5';
    if (minutes < 15) return 'bg-emerald-500/30 border-emerald-500/40 text-emerald-300';
    if (minutes < 45) return 'bg-emerald-500/55 border-emerald-400/60 text-emerald-200';
    if (minutes < 90) return 'bg-emerald-500/80 border-emerald-300 text-white';
    return 'bg-emerald-400 border-emerald-200 text-black font-bold shadow-sm shadow-emerald-400/30';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-md text-xs space-y-1">
          <div className="font-bold text-white flex items-center justify-between gap-4">
            <span>{data.displayDate} ({data.dayOfWeek})</span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {data.minutes} mins
            </span>
          </div>
          <div className="text-slate-300 text-[11px]">
            Active Station Sessions: <span className="font-semibold text-white">{data.stationCount}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-main)]/60 backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/20 space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Listening Habits & 30-Day Activity
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Heatmap & Analytics
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Visualizes daily broadcast playtime, streaks, and active station sessions
            </p>
          </div>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveMetric('minutes')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMetric === 'minutes'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Minutes
          </button>
          <button
            onClick={() => setActiveMetric('stationCount')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMetric === 'stationCount'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Sessions
          </button>
        </div>
      </div>

      {/* Quick Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>30-Day Playtime</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>Total Sessions</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {totalSessions}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>Active Days</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {activeDays} / 30
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily Streak</span>
          </div>
          <div className="text-lg font-bold text-amber-300 mt-1">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* Recharts Bar/Area Visualizer */}
      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="displayDate"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar
              dataKey={activeMetric}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.minutes > 60
                      ? '#34d399'
                      : entry.minutes > 20
                      ? '#10b981'
                      : entry.minutes > 0
                      ? '#059669'
                      : 'rgba(255,255,255,0.08)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 30-Day Activity Calendar Heatmap Grid */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-white/80">30-Day Activity Heatmap Grid</span>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span>Less</span>
            <span className="w-2.5 h-2.5 rounded bg-white/5 border border-white/10" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/40" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/55 border border-emerald-400/60" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/80 border border-emerald-300" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-400 border border-emerald-200" />
            <span>More</span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5">
          {stats.map((s) => {
            return (
              <div
                key={s.date}
                className={`group relative p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${getHeatmapColor(
                  s.minutes
                )}`}
                title={`${s.date} (${s.dayOfWeek}): ${s.minutes} mins (${s.stationCount} sessions)`}
              >
                <span className="text-[10px] font-mono opacity-80">{s.displayDate.split(' ')[1]}</span>
                {s.minutes > 0 && (
                  <span className="text-[8px] font-bold leading-none mt-0.5">
                    {s.minutes}m
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
