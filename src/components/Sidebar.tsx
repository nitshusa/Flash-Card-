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
  LogOut, 
  ChevronLeft, 
  Menu 
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
  user,
  collapsed,
  setCollapsed
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'all_cards', label: 'All Flash Cards', icon: BookOpen, badge: stats.activeCards },
    { id: 'categories', label: 'Categories', icon: FolderHeart, badge: null },
    { id: 'favorites', label: 'Favorites', icon: Star, badge: stats.favoritesCount > 0 ? stats.favoritesCount : null },
    { id: 'recently_edited', label: 'Recently Edited', icon: History, badge: null },
    { id: 'trash', label: 'Trash', icon: Trash2, badge: stats.trashCards > 0 ? stats.trashCards : null, badgeColor: 'bg-rose-100 text-rose-700' },
    { id: 'settings', label: 'Settings & Profile', icon: Settings, badge: null },
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-30 pt-16 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      id="sidebar-container"
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 right-[-14px] w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition shadow-sm z-50 cursor-pointer"
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        id="sidebar-toggle-button"
      >
        <ChevronLeft className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* User Info (when expanded) */}
      {!collapsed && user && (
        <div className="px-6 py-5 border-b border-slate-200 shrink-0" id="sidebar-user-section">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 font-medium flex items-center justify-center text-sm uppercase">
              {user.name.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900 truncate leading-tight">{user.name}</h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" id="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={collapsed ? item.label : undefined}
              id={`sidebar-tab-${item.id}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {!collapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {!collapsed && item.badge !== null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  item.badgeColor || (isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-slate-200 shrink-0" id="sidebar-footer">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          title={collapsed ? "Logout" : undefined}
          id="sidebar-logout-button"
        >
          <LogOut className="w-5 h-5 shrink-0 text-rose-500" />
          {!collapsed && <span className="text-left font-semibold">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
