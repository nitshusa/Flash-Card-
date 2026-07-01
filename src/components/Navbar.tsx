/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, Sparkles, GraduationCap, X, Menu, Settings, LogOut, User } from 'lucide-react';
import { Category } from '../types';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: Category[];
  selectedCategory: string | null;
  setSelectedCategory: (catId: string | null) => void;
  onAddCard: () => void;
  onStudyLaunch: () => void;
  onMenuToggle: () => void;
  user: { name: string } | null;
  currentTab: string;
}

export default function Navbar({
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
  onAddCard,
  onStudyLaunch,
  onMenuToggle,
  user,
  currentTab
}: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 z-40 selection:bg-indigo-500 selection:text-white" id="navbar-header">
      
      {/* Brand Logo */}
      <div className="flex items-center gap-3" id="navbar-brand-section">
        <div className="flex items-center gap-2" id="navbar-logo-group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <span className="animate-fire-glow font-black text-white px-3.5 py-1 rounded-full text-xs md:text-sm tracking-wide hidden sm:inline-block shadow-md" id="navbar-brand-name">
            Nish Flash Studio
          </span>
        </div>
      </div>

      {/* Instant Search Bar */}
      {currentTab !== 'settings' && currentTab !== 'categories' && (
        <div className="flex-1 max-w-md mx-4 md:mx-8 hidden md:block" id="navbar-search-section">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              id="navbar-search-input"
              type="text" 
              placeholder="Search title, question, tags, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                id="search-clear-btn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Horizontal Quick Filters */}
      {currentTab === 'all_cards' && categories.length > 0 && (
        <div className="hidden lg:flex items-center gap-1.5 px-4 overflow-x-auto max-w-xl scrollbar-none" id="navbar-categories-strip">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition ${
              selectedCategory === null 
                ? 'bg-indigo-50 text-indigo-700 font-bold' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === cat.id 
                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></span>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5" id="navbar-actions-section">
        {/* Quick Study Mode */}
        <button
          onClick={onStudyLaunch}
          className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          title="Launch study session"
          id="navbar-study-launch-button"
        >
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Study Deck</span>
        </button>

        {/* Create Card Button */}
        <button
          onClick={onAddCard}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          title="Create a new flash card"
          id="navbar-add-card-button"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Card</span>
        </button>
      </div>
    </header>
  );
}
