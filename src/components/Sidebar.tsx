/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FolderHeart, 
  Star, 
  History, 
  Trash2, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  stats: {
    activeCards: number;
    favoritesCount: number;
    trashCards: number;
  };
  onLogout: () => void;
  user: {
    name: string;
    email: string;
  } | null;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  stats, 
  onLogout, 
  user
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'all_cards', label: 'All Cards', icon: BookOpen, badge: stats.activeCards },
    { id: 'categories', label: 'Categories', icon: FolderHeart, badge: null },
    { id: 'favorites', label: 'Favorites', icon: Star, badge: stats.favoritesCount > 0 ? stats.favoritesCount : null },
    { id: 'recently_edited', label: 'Recent', icon: History, badge: null },
    { id: 'trash', label: 'Trash', icon: Trash2, badge: stats.trashCards > 0 ? stats.trashCards : null, badgeColor: 'bg-rose-100 text-rose-700' },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <div 
      className="fixed top-16 left-0 right-0 h-14 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-6 md:px-8 overflow-x-auto scrollbar-none"
      id="top-navigation-bar"
    >
      <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto scrollbar-none flex-1 py-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id={`sidebar-tab-${item.id}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge !== null && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  item.badgeColor || (isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-slate-100">
        {user && (
          <div className="text-right leading-none hidden lg:block">
            <span className="text-xs font-semibold text-slate-800 block">{user.name}</span>
            <span className="text-[10px] text-slate-400 font-medium">{user.email}</span>
          </div>
        )}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          id="sidebar-logout-button"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-semibold hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}
