import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Activity, Clock, Flame, Radio, Calendar, Sparkles, TrendingUp, Disc } from 'lucide-react';
import { DailyActivityStat } from '../types';
import { storageService } from '../services/storageService';

export const ListeningHabitsSection: React.FC = () => {
  const [stats, setStats] = useState<DailyActivityStat[]>([]);
  const [activeMetric, setActiveMetric] = useState<'minutes' | 'stationCount'>('minutes');
  const [genreData, setGenreData] = useState<Array<{ name: string; value: number; color: string; count: number }>>([]);
  const [weeklySummary, setWeeklySummary] = useState(() => storageService.getWeeklyHabitSummary());

  useEffect(() => {
    setStats(storageService.getDailyListeningStats(30));
    setGenreData(storageService.getGenreAffinityData());
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

      {/* Weekly Listening Habit Card with Progress Ring */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Weekly Listening Habit
            </h4>
            <p className="text-[11px] text-[var(--text-muted)]">
              Track your weekly active listening streak, consecutive app usage, and goal progress
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 items-center">
          {/* Progress Ring Column */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-700/50 fill-none"
                  strokeWidth="8"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-indigo-500 transition-all duration-1000 ease-out fill-none"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * weeklySummary.weeklyGoalMetPercentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner Label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Goal</span>
                <span className="text-lg font-black text-white">{weeklySummary.weeklyGoalMetPercentage}%</span>
              </div>
            </div>
            <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded-full">
              5hr Weekly Target
            </span>
          </div>

          {/* Detailed Summary Stats Column */}
          <div className="sm:col-span-2 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">Consecutive Days</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{weeklySummary.consecutiveDays}</span>
                <span className="text-xs font-bold text-amber-400">days 🔥</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">Daily app engagement streak</p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">Weekly Hours</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{weeklySummary.totalListeningHours}</span>
                <span className="text-xs font-bold text-emerald-400">hours 🎧</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">Total play time this week</p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">Active Days</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{weeklySummary.daysActiveCount}</span>
                <span className="text-xs font-bold text-indigo-400">/ 7 days 📅</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">Days with active listening</p>
            </div>

            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex flex-col justify-between">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-300 animate-pulse" />
                <span className="text-[9px] font-black text-indigo-200 uppercase tracking-wider">Status Badge</span>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {weeklySummary.weeklyGoalMetPercentage >= 100 
                    ? '🏆 Goal Achieved!' 
                    : weeklySummary.weeklyGoalMetPercentage >= 50 
                    ? '⚡ Almost There!' 
                    : '🌱 Audio Explorer'}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">Keep the rhythm alive!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Genre Affinity Donut Chart Section (Recharts) */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Disc className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Genre Affinity Distribution
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Radio listening time broken down by genre, updated dynamically from station history
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Recharts Donut Chart
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="h-48 w-full min-h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {genreData.map((entry, index) => (
                    <Cell key={`genre-cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val}% (${item.payload.count || 0} sessions)`,
                    item.payload.name
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {genreData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-white">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[var(--text-muted)]">{item.count} sessions</span>
                  <span className="font-bold text-emerald-400">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
