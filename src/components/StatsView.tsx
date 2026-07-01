/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  GraduationCap, 
  Flame, 
  Layers, 
  CheckCircle, 
  Calendar, 
  Percent, 
  Folder, 
  Activity, 
  Star, 
  Sparkles,
  BookOpen,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { DashboardStats, Category } from '../types';

interface StatsViewProps {
  stats: DashboardStats;
  categories: Category[];
}

export default function StatsView({ stats, categories }: StatsViewProps) {
  
  // Custom difficulty meter color map
  const difficultyConfig = {
    easy: { color: 'bg-emerald-500', text: 'text-emerald-700', label: 'Easy' },
    medium: { color: 'bg-amber-500', text: 'text-amber-700', label: 'Medium' },
    hard: { color: 'bg-rose-500', text: 'text-rose-700', label: 'Hard' }
  };

  const totalActive = stats.difficultyBreakdown.easy + stats.difficultyBreakdown.medium + stats.difficultyBreakdown.hard;
  
  const getPercentage = (count: number) => {
    if (totalActive === 0) return 0;
    return Math.round((count / totalActive) * 100);
  };

  return (
    <div className="space-y-8 animate-fade-in select-none selection:bg-indigo-500 selection:text-white" id="stats-dashboard">
      
      {/* SECTION HEADER */}
      <div id="stats-header">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Analytics & Metrics</h1>
        <p className="text-slate-500 mt-1 text-sm">Visualize your progress, metrics, and memory retention rates.</p>
      </div>

      {/* METRIC CARD BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-metrics-grid">
        
        {/* Metric 1: Total Cards */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full translate-x-8 -translate-y-8 transition-transform group-hover:scale-105" />
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Cards</span>
            <span className="text-2xl font-bold text-slate-900 leading-none mt-1 block">{stats.activeCards}</span>
            <span className="text-[10px] text-slate-500 block mt-1">{stats.archivedCards} archived ● {stats.trashCards} trash</span>
          </div>
        </div>

        {/* Metric 2: Streak */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full translate-x-8 -translate-y-8 transition-transform group-hover:scale-105" />
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Flame className="w-5.5 h-5.5 fill-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Study Streak</span>
            <span className="text-2xl font-bold text-slate-900 leading-none mt-1 block">
              {stats.studyStreak} {stats.studyStreak === 1 ? 'Day' : 'Days'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">Keep studying daily!</span>
          </div>
        </div>

        {/* Metric 3: Reviews Today */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-8 -translate-y-8 transition-transform group-hover:scale-105" />
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reviews Today</span>
            <span className="text-2xl font-bold text-slate-900 leading-none mt-1 block">{stats.todayCardsReviewedCount}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Total session completions</span>
          </div>
        </div>

        {/* Metric 4: Success Rate */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full translate-x-8 -translate-y-8 transition-transform group-hover:scale-105" />
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Percent className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correct Rate</span>
            <span className="text-2xl font-bold text-slate-900 leading-none mt-1 block">{stats.completionRate}%</span>
            <span className="text-[10px] text-slate-500 block mt-1">Across {stats.studySessionsCount} reviews</span>
          </div>
        </div>

      </div>

      {/* CORE CHARTS ANALYSIS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="stats-analysis-sections">
        
        {/* Difficulty Distribution Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800">Difficulty Distribution</h2>
          </div>

          {totalActive === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Sparkles className="w-8 h-8 mb-2 text-slate-300" />
              No active flash cards to map difficulty distributions.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Easy */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Easy (Retention Safe)</span>
                  <span>{stats.difficultyBreakdown.easy} Cards ({getPercentage(stats.difficultyBreakdown.easy)}%)</span>
                </div>
                <div className="h-3 w-full bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${getPercentage(stats.difficultyBreakdown.easy)}%` }}></div>
                </div>
              </div>

              {/* Medium */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Medium (Moderate Review)</span>
                  <span>{stats.difficultyBreakdown.medium} Cards ({getPercentage(stats.difficultyBreakdown.medium)}%)</span>
                </div>
                <div className="h-3 w-full bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${getPercentage(stats.difficultyBreakdown.medium)}%` }}></div>
                </div>
              </div>

              {/* Hard */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Hard (Focus Focus!)</span>
                  <span>{stats.difficultyBreakdown.hard} Cards ({getPercentage(stats.difficultyBreakdown.hard)}%)</span>
                </div>
                <div className="h-3 w-full bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${getPercentage(stats.difficultyBreakdown.hard)}%` }}></div>
                </div>
              </div>

              {/* Quick Summary list */}
              <div className="pt-4 border-t border-slate-50 flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>Total Active Monitored: {totalActive}</span>
                <span className="text-indigo-500">Perfect balanced distribution</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown list */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Folder className="w-5 h-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800">Category Density Breakdown</h2>
            </div>

            {stats.categoryBreakdown.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                <AlertTriangle className="w-8 h-8 mb-2 text-slate-300" />
                No active categories found to show densities.
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {stats.categoryBreakdown.map((item, index) => {
                  const maxCount = Math.max(...stats.categoryBreakdown.map(b => b.count), 1);
                  const densityPercent = Math.round((item.count / maxCount) * 100);
                  
                  return (
                    <div key={item.categoryId} className="flex items-center gap-3">
                      {/* Left category details */}
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span className="truncate">{item.categoryName}</span>
                          <span>{item.count} Cards</span>
                        </div>
                        {/* Custom density bar */}
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${densityPercent}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-50 mt-6 text-[10px] font-bold text-slate-400 uppercase flex justify-between shrink-0">
            <span>Configured Categories: {stats.categoriesCount}</span>
            <span className="text-indigo-500">Dynamic auto updates</span>
          </div>
        </div>

      </div>

      {/* QUICK STUDY METRIC ADVICE MESSAGE */}
      <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4" id="stats-study-tip">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <GraduationCap className="w-5.5 h-5.5" />
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-sm font-bold text-slate-800">Supercharge your review session using spaced repetition!</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Flash Card Studio tracks how many cards you know and how many need study. Click on <strong className="text-indigo-600">Study Deck</strong> 
            in the top bar periodically to review your decks. Studies show review within 24 hours boosts retention by up to 80%!
          </p>
        </div>
      </div>

    </div>
  );
}
