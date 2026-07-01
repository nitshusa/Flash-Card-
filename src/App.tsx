/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Layers, 
  Star, 
  LogOut, 
  GraduationCap, 
  ArrowRight,
  ChevronRight,
  BookOpen,
  X,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { 
  User, 
  Category, 
  FlashCard, 
  DashboardStats, 
  AuthState,
  FlashCardDifficulty,
  FlashCardStatus,
  StudyHistoryEntry
} from './types';

// Component imports
import AuthView from './components/AuthView';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import FlashCardItem from './components/FlashCardItem';
import FlashCardModal from './components/FlashCardModal';
import StudyView from './components/StudyView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import CategoryManager from './components/CategoryManager';

// Supabase and utilities
import { supabase } from './supabase';
import { calculateDashboardStats } from './utils/stats';

// Bridge Supabase user and Profile DB table
const getProfileAndUser = async (sbUser: any): Promise<User> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sbUser.id)
    .maybeSingle();

  if (error || !profile) {
    const fallbackProfile = {
      id: sbUser.id,
      name: sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'User',
      theme: 'light',
      accent_color: '#6366f1',
      auto_delete_trash_days: 30
    };
    // Attempt insert just in case
    try {
      await supabase.from('profiles').insert([fallbackProfile]);
    } catch (e) {
      console.warn('Profile insert fallback failed or already exists', e);
    }
    return {
      id: sbUser.id,
      email: sbUser.email || '',
      name: fallbackProfile.name,
      preferences: {
        theme: fallbackProfile.theme as 'light' | 'dark',
        accentColor: fallbackProfile.accent_color,
        autoDeleteTrashDays: fallbackProfile.auto_delete_trash_days
      },
      createdAt: sbUser.created_at || new Date().toISOString()
    };
  }

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: profile.name || sbUser.user_metadata?.name || 'User',
    preferences: {
      theme: (profile.theme || 'light') as 'light' | 'dark',
      accentColor: profile.accent_color || '#6366f1',
      autoDeleteTrashDays: profile.auto_delete_trash_days || 30
    },
    createdAt: profile.created_at || sbUser.created_at || new Date().toISOString()
  };
};

export default function App() {
  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  });

  // Application data
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCards: 0,
    activeCards: 0,
    archivedCards: 0,
    trashCards: 0,
    favoritesCount: 0,
    categoriesCount: 0,
    studySessionsCount: 0,
    completionRate: 0,
    studyStreak: 0,
    todayCardsReviewedCount: 0,
    categoryBreakdown: [],
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 }
  });

  // Layout View States
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals / Overlays
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [isStudyOpen, setIsStudyOpen] = useState(false);

  // Toast notifier
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Filtering / Sorting values (All Cards Tab)
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Load Auth Session on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          setAuthState({ isAuthenticated: false, user: null, loading: false });
          return;
        }

        const mappedUser = await getProfileAndUser(session.user);
        setAuthState({ isAuthenticated: true, user: mappedUser, loading: false });
        
        // Load app data
        fetchAppData();
      } catch (e) {
        console.error('Session check failed', e);
        setAuthState({ isAuthenticated: false, user: null, loading: false });
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const mappedUser = await getProfileAndUser(session.user);
        setAuthState({ isAuthenticated: true, user: mappedUser, loading: false });
        fetchAppData();
      } else {
        setAuthState({ isAuthenticated: false, user: null, loading: false });
        setCards([]);
        setCategories([]);
        setCurrentTab('dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync theme to root HTML element
  useEffect(() => {
    if (authState.user?.preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [authState.user]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAppData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (catError) throw catError;

      // 2. Fetch flashcards
      const { data: cardsData, error: cardsError } = await supabase
        .from('flash_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;

      // 3. Fetch study history
      const { data: historyData, error: historyError } = await supabase
        .from('study_history')
        .select('*')
        .order('timestamp', { ascending: false });

      if (historyError) throw historyError;

      // Map categories
      const mappedCategories: Category[] = (categoriesData || []).map(cat => ({
        id: cat.id,
        userId: cat.user_id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        createdAt: cat.created_at
      }));

      // Map cards
      const mappedCards: FlashCard[] = (cardsData || []).map(card => ({
        id: card.id,
        userId: card.user_id,
        title: card.title,
        question: card.question,
        answer: card.answer,
        categoryId: card.category_id,
        difficulty: card.difficulty as FlashCardDifficulty,
        color: card.color,
        notes: card.notes || '',
        tags: card.tags || [],
        favorite: !!card.favorite,
        status: card.status as 'active' | 'archived' | 'trash',
        deletedAt: card.deleted_at,
        createdAt: card.created_at,
        updatedAt: card.updated_at
      }));

      // Map study history
      const mappedHistory: StudyHistoryEntry[] = (historyData || []).map(h => ({
        id: h.id,
        userId: h.user_id,
        cardId: h.card_id,
        timestamp: h.timestamp,
        rating: h.rating as 'correct' | 'incorrect',
        duration: h.duration
      }));

      setCategories(mappedCategories);
      setCards(mappedCards);

      // Compute statistics on mapped data
      const computedStats = calculateDashboardStats(mappedCards, mappedCategories, mappedHistory);
      setStats(computedStats);

    } catch (e: any) {
      console.error('Failed to load application data from Supabase', e);
    }
  };

  const handleAuthSuccess = async (token: string, user: User) => {
    setAuthState({ isAuthenticated: true, user, loading: false });
    fetchAppData();
    showToast(`Welcome back, ${user.name}!`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthState({ isAuthenticated: false, user: null, loading: false });
    setCards([]);
    setCategories([]);
    setCurrentTab('dashboard');
    showToast('Logged out successfully');
  };

  // --- FLASH CARD DATABASE CALLS ---

  const handleSaveCard = async (cardData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to save a card');

      const user_id = session.user.id;

      if (editingCard) {
        const { error } = await supabase
          .from('flash_cards')
          .update({
            title: cardData.title,
            question: cardData.question,
            answer: cardData.answer,
            category_id: cardData.categoryId || null,
            difficulty: cardData.difficulty,
            color: cardData.color,
            notes: cardData.notes || '',
            tags: cardData.tags || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCard.id);

        if (error) throw error;
        showToast('Card updated');
      } else {
        const { error } = await supabase
          .from('flash_cards')
          .insert({
            user_id,
            title: cardData.title,
            question: cardData.question,
            answer: cardData.answer,
            category_id: cardData.categoryId || null,
            difficulty: cardData.difficulty,
            color: cardData.color,
            notes: cardData.notes || '',
            tags: cardData.tags || [],
            favorite: false,
            status: 'active'
          });

        if (error) throw error;
        showToast('Card added');
      }

      fetchAppData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save card', 'error');
      throw err;
    }
  };

  const handleFavoriteToggle = async (id: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('flash_cards')
        .update({ favorite: !currentVal, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchAppData();
      showToast(!currentVal ? 'Added to Favorites' : 'Removed from Favorites', 'info');
    } catch (e: any) {
      showToast('Action failed: ' + e.message, 'error');
    }
  };

  const handleStatusChange = async (id: string, nextStatus: 'active' | 'archived' | 'trash') => {
    try {
      const { error } = await supabase
        .from('flash_cards')
        .update({
          status: nextStatus,
          deleted_at: nextStatus === 'trash' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      fetchAppData();
      const labels = { active: 'Card activated', archived: 'Card archived', trash: 'Moved to Trash' };
      showToast(labels[nextStatus], 'info');
    } catch (e: any) {
      showToast('Action failed: ' + e.message, 'error');
    }
  };

  const handleDuplicateCard = async (id: string) => {
    try {
      const source = cards.find(f => f.id === id);
      if (!source) throw new Error('Source card not found');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const { error } = await supabase
        .from('flash_cards')
        .insert({
          user_id: session.user.id,
          title: `${source.title} (Copy)`,
          question: source.question,
          answer: source.answer,
          category_id: source.categoryId,
          difficulty: source.difficulty,
          color: source.color,
          notes: source.notes,
          tags: source.tags,
          favorite: false,
          status: 'active'
        });

      if (error) throw error;
      fetchAppData();
      showToast('Card duplicated successfully');
    } catch (e: any) {
      showToast('Duplication failed: ' + e.message, 'error');
    }
  };

  const handleMoveCategory = async (id: string, newCategoryId: string | null) => {
    try {
      const { error } = await supabase
        .from('flash_cards')
        .update({ category_id: newCategoryId, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchAppData();
      showToast('Category updated');
    } catch (e: any) {
      showToast('Move failed: ' + e.message, 'error');
    }
  };

  const handleDeletePermanent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('flash_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAppData();
      showToast('Card permanently deleted');
    } catch (e: any) {
      showToast('Permanent deletion failed: ' + e.message, 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you absolutely sure you want to empty the Trash? All trashed cards will be deleted permanently.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('flash_cards')
        .delete()
        .eq('status', 'trash');

      if (error) throw error;
      fetchAppData();
      showToast('Trash completely emptied');
    } catch (e: any) {
      showToast('Emptying trash failed: ' + e.message, 'error');
    }
  };

  // --- STUDY HISTORY CALLS ---

  const handleRecordStudy = async (cardId: string, rating: 'correct' | 'incorrect', duration: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('study_history')
        .insert({
          user_id: session.user.id,
          card_id: cardId,
          rating,
          duration
        });

      if (error) throw error;
      fetchAppData();
    } catch (e: any) {
      console.error('Failed to record study entry', e);
    }
  };

  // --- CATEGORY CALLS ---

  const handleCreateCategory = async (name: string, color: string, icon: string) => {
    try {
      const duplicate = categories.some(cat => cat.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        throw new Error('A category with this name already exists');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: session.user.id,
          name,
          color,
          icon
        });

      if (error) throw error;
      fetchAppData();
      showToast('Category created');
    } catch (err: any) {
      showToast(err.message || 'Failed to create category', 'error');
      throw err;
    }
  };

  const handleUpdateCategory = async (id: string, name: string, color: string, icon: string) => {
    try {
      const duplicate = categories.some(cat => cat.id !== id && cat.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        throw new Error('A category with this name already exists');
      }

      const { error } = await supabase
        .from('categories')
        .update({
          name,
          color,
          icon
        })
        .eq('id', id);

      if (error) throw error;
      fetchAppData();
      showToast('Category renamed');
    } catch (err: any) {
      showToast(err.message || 'Failed to update category', 'error');
      throw err;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAppData();
      showToast('Category deleted');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
      throw err;
    }
  };

  // --- PROFILE PREFERENCES CALLS ---

  const handleUpdatePreferences = async (updates: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          theme: updates.theme,
          accent_color: updates.accentColor,
          auto_delete_trash_days: updates.autoDeleteTrashDays
        })
        .eq('id', session.user.id);

      if (error) throw error;

      const mappedUser = await getProfileAndUser(session.user);
      setAuthState(prev => ({ ...prev, user: mappedUser }));
      showToast('Preferences updated');
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
      throw err;
    }
  };

  const handleUpdatePassword = async (passwordData: any) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      showToast('Password changed successfully');
    } catch (err: any) {
      showToast(err.message || 'Password update failed', 'error');
      throw err;
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session.user.id);

      if (error) throw error;

      await supabase.auth.signOut();
      showToast('Account permanently deleted');
    } catch (err: any) {
      showToast(err.message || 'Deletion failed', 'error');
      throw err;
    }
  };

  const handleImportBackup = async (backupData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const userId = session.user.id;

      if (!backupData.categories || !Array.isArray(backupData.categories) ||
          !backupData.flashcards || !Array.isArray(backupData.flashcards)) {
        throw new Error('Invalid backup file format');
      }

      await supabase.from('categories').delete().eq('user_id', userId);
      await supabase.from('flash_cards').delete().eq('user_id', userId);

      const oldToNewCategoryIds = new Map<string, string>();
      for (const cat of backupData.categories) {
        const { data: newCat, error: catErr } = await supabase
          .from('categories')
          .insert({
            user_id: userId,
            name: cat.name || 'Imported Category',
            color: cat.color || '#6366f1',
            icon: cat.icon || 'BookOpen'
          })
          .select()
          .single();

        if (catErr) throw catErr;
        if (newCat) {
          oldToNewCategoryIds.set(cat.id, newCat.id);
        }
      }

      const cardsToInsert = backupData.flashcards.map((card: any) => {
        const mappedCatId = card.categoryId ? (oldToNewCategoryIds.get(card.categoryId) || null) : null;
        return {
          user_id: userId,
          title: card.title || 'Untitled Card',
          question: card.question || '',
          answer: card.answer || '',
          category_id: mappedCatId,
          difficulty: card.difficulty || 'medium',
          color: card.color || '#ffffff',
          notes: card.notes || '',
          tags: Array.isArray(card.tags) ? card.tags : [],
          favorite: !!card.favorite,
          status: card.status || 'active',
          deleted_at: card.deletedAt || null
        };
      });

      if (cardsToInsert.length > 0) {
        const { error: cardsErr } = await supabase
          .from('flash_cards')
          .insert(cardsToInsert);
        if (cardsErr) throw cardsErr;
      }

      showToast('Backup restored successfully');
      fetchAppData();
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
      throw err;
    }
  };

  // --- FILTER & SEARCH IMPLEMENTATION ---

  const getFilteredCards = () => {
    let list = [...cards];

    // Filter by Tab specific categories
    if (currentTab === 'dashboard') {
      list = list.filter(f => f.status === 'active');
    } else if (currentTab === 'all_cards') {
      list = list.filter(f => f.status === 'active');
      
      // Secondary Filters inside All Cards Tab
      if (filterDifficulty !== 'all') {
        list = list.filter(f => f.difficulty === filterDifficulty);
      }
      if (filterCategory !== 'all') {
        list = list.filter(f => f.categoryId === (filterCategory === 'uncategorized' ? null : filterCategory));
      }
    } else if (currentTab === 'favorites') {
      list = list.filter(f => f.favorite && f.status === 'active');
    } else if (currentTab === 'recently_edited') {
      list = list.filter(f => f.status === 'active');
    } else if (currentTab === 'trash') {
      list = list.filter(f => f.status === 'trash');
    }

    // Filter by Topbar Categories Stripe selection (Quick categories strip)
    if (selectedCategory && currentTab === 'all_cards') {
      list = list.filter(f => f.categoryId === selectedCategory);
    }

    // Instant Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(f => {
        const cat = categories.find(c => c.id === f.categoryId);
        return (
          f.title.toLowerCase().includes(query) ||
          f.question.toLowerCase().includes(query) ||
          f.answer.toLowerCase().includes(query) ||
          f.notes.toLowerCase().includes(query) ||
          f.tags.some(t => t.toLowerCase().includes(query)) ||
          (cat && cat.name.toLowerCase().includes(query))
        );
      });
    }

    // SORTING PROCESS
    if (currentTab === 'recently_edited') {
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a).getTime());
    } else {
      switch (sortBy) {
        case 'newest':
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a).getTime());
          break;
        case 'oldest':
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'recently_modified':
          list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a).getTime());
          break;
        case 'alphabetical':
          list.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'difficulty':
          const rank = { easy: 1, medium: 2, hard: 3 };
          list.sort((a, b) => rank[b.difficulty] - rank[a.difficulty]); // Hardest first
          break;
        default:
          break;
      }
    }

    return list;
  };

  const handleTriggerAddCard = () => {
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const handleTriggerEditCard = (card: FlashCard) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  // --- RENDER ROUTING PANELS ---

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-sm animate-bounce mb-4">
          <Sparkles className="w-6 h-6 fill-white" />
        </div>
        <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Syncing Flash Card Studio...</h2>
        <p className="text-xs text-slate-500 mt-1">Please wait while we initialize database parameters.</p>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  const visibleCards = getFilteredCards();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" id="app-root">
      
      {/* Toast Notification */}
      {toast && (
        <div 
          className="fixed bottom-6 right-6 px-4 py-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-2xl z-50 animate-slide-up select-none"
          id="global-toast"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* STICKY TOP NAVBAR */}
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onAddCard={handleTriggerAddCard}
        onStudyLaunch={() => setIsStudyOpen(true)}
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={authState.user}
        currentTab={currentTab}
      />

      {/* TOP NAVIGATION & MAIN BODY GRID */}
      <div className="pt-[120px] flex min-h-screen relative" id="layout-body">
        
        <Sidebar 
          currentTab={currentTab}
          setCurrentTab={(tab) => { setCurrentTab(tab); setSelectedCategory(null); }}
          stats={{
            activeCards: stats.activeCards,
            favoritesCount: stats.favoritesCount,
            trashCards: stats.trashCards
          }}
          onLogout={handleLogout}
          user={authState.user}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* MAIN DISPLAY CONTENT BOX */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8" id="main-display-container">
          
      {/* TAB 1: DASHBOARD VIEW */}
      {currentTab === 'dashboard' && (
        <div className="space-y-6" id="tab-dashboard">
          
          {/* Welcome board */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5" id="dashboard-welcome">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {authState.user?.name}!</h1>
              <p className="text-slate-500 mt-1 text-sm">Create flash cards, assign categories, and test your memory.</p>
            </div>
            
            {/* Streak card */}
            {stats.studyStreak > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-700 font-semibold text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>{stats.studyStreak} Day Study Streak 🔥</span>
              </div>
            )}
          </div>

          {/* Analytics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-bento">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {stats.activeCards}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Cards</span>
                <span className="font-bold text-slate-700 block mt-0.5">{stats.activeCards} cards</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                {stats.favoritesCount}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starred Favorites</span>
                <span className="font-bold text-slate-700 block mt-0.5">{stats.favoritesCount} starred</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                {stats.completionRate}%
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correct Rate</span>
                <span className="font-bold text-slate-700 block mt-0.5">{stats.completionRate}% positive</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm">
                {stats.todayCardsReviewedCount}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reviewed Today</span>
                <span className="font-bold text-slate-700 block mt-0.5">{stats.todayCardsReviewedCount} reviews</span>
              </div>
            </div>
          </div>

          {/* Call to study block */}
          {stats.activeCards > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm" id="dashboard-study-promo">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <GraduationCap className="w-5.5 h-5.5" />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-sm font-bold text-slate-800">Launch Your Spaced Repetition Study Session!</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Test your recall of all {stats.activeCards} active cards right now.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsStudyOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
              >
                <span>Begin Study Round</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Recent Active Cards List */}
          <div className="space-y-4" id="dashboard-cards-section">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Recent Active Cards</h2>
              <button 
                onClick={() => setCurrentTab('all_cards')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View all cards</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {visibleCards.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm max-w-sm mx-auto">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No Cards Available</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Create some active flash cards using the "+ Add Card" button to populate your dashboard!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCards.slice(0, 6).map((card) => (
                  <FlashCardItem 
                    key={card.id}
                    card={card}
                    category={categories.find(c => c.id === card.categoryId) || null}
                    onFavoriteToggle={handleFavoriteToggle}
                    onStatusChange={handleStatusChange}
                    onEdit={handleTriggerEditCard}
                    onDuplicate={handleDuplicateCard}
                    onMoveCategory={handleMoveCategory}
                    categories={categories}
                  />
                ))}
              </div>
            )}
          </div>

            </div>
          )}

          {/* TAB 2: ALL CARDS VIEW (WITH ROBUST FILTERS) */}
          {currentTab === 'all_cards' && (
            <div className="space-y-6" id="tab-all-cards">
              
              {/* Header with Search */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">Active Flash Cards</h1>
                  <p className="text-slate-400 mt-1 text-sm">Sort and search your active cards to study target fields.</p>
                </div>

                {/* Sorting controls */}
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto shrink-0 py-1">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs">
                    <ArrowUpDown className="w-4.5 h-4.5 text-slate-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-slate-600 bg-transparent outline-none cursor-pointer font-semibold text-xs"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="recently_modified">Recently Modified</option>
                      <option value="alphabetical">Alphabetical (A-Z)</option>
                      <option value="difficulty">Hardest First</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs">
                    <Filter className="w-4.5 h-4.5 text-slate-400" />
                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="text-slate-600 bg-transparent outline-none cursor-pointer font-semibold text-xs"
                    >
                      <option value="all">All Difficulties</option>
                      <option value="easy">Easy Only</option>
                      <option value="medium">Medium Only</option>
                      <option value="hard">Hard Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cards Grid list */}
              {visibleCards.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm max-w-sm mx-auto mt-8">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">No Cards Match Criteria</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Try adjusting your filters, folder selects, or search fields.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleCards.map((card) => (
                    <FlashCardItem 
                      key={card.id}
                      card={card}
                      category={categories.find(c => c.id === card.categoryId) || null}
                      onFavoriteToggle={handleFavoriteToggle}
                      onStatusChange={handleStatusChange}
                      onEdit={handleTriggerEditCard}
                      onDuplicate={handleDuplicateCard}
                      onMoveCategory={handleMoveCategory}
                      categories={categories}
                    />
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: CATEGORIES LIST */}
          {currentTab === 'categories' && (
            <CategoryManager 
              categories={categories}
              cards={cards}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {/* TAB 4: FAVORITES VIEW */}
          {currentTab === 'favorites' && (
            <div className="space-y-6" id="tab-favorites">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Favorites</h1>
                <p className="text-slate-500 mt-1 text-sm">Review cards you have marked as your favorites.</p>
              </div>

              {visibleCards.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm max-w-sm mx-auto mt-8">
                  <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">No Starred Favorites</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Favorite cards to create a custom study shortlist! Click the star icon on any card question front to add it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleCards.map((card) => (
                    <FlashCardItem 
                      key={card.id}
                      card={card}
                      category={categories.find(c => c.id === card.categoryId) || null}
                      onFavoriteToggle={handleFavoriteToggle}
                      onStatusChange={handleStatusChange}
                      onEdit={handleTriggerEditCard}
                      onDuplicate={handleDuplicateCard}
                      onMoveCategory={handleMoveCategory}
                      categories={categories}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RECENTLY EDITED */}
          {currentTab === 'recently_edited' && (
            <div className="space-y-6" id="tab-recently-edited">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recently Edited</h1>
                <p className="text-slate-500 mt-1 text-sm">Review flash cards sorted by their last modification timestamps.</p>
              </div>

              {visibleCards.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm max-w-sm mx-auto mt-8">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">No Cards Available</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleCards.map((card) => (
                    <FlashCardItem 
                      key={card.id}
                      card={card}
                      category={categories.find(c => c.id === card.categoryId) || null}
                      onFavoriteToggle={handleFavoriteToggle}
                      onStatusChange={handleStatusChange}
                      onEdit={handleTriggerEditCard}
                      onDuplicate={handleDuplicateCard}
                      onMoveCategory={handleMoveCategory}
                      categories={categories}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TRASH CAN WITH AUTO RETENTION */}
          {currentTab === 'trash' && (
            <div className="space-y-6" id="tab-trash">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trash Folder</h1>
                  <p className="text-slate-500 mt-1 text-sm">
                    Deleted cards stay here for {authState.user?.preferences.autoDeleteTrashDays || 30} days before auto deleting.
                  </p>
                </div>

                {visibleCards.length > 0 && (
                  <button
                    onClick={handleEmptyTrash}
                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    id="empty-trash-button"
                  >
                    <Trash2 className="w-4.5 h-4.5 shrink-0" />
                    Empty Trash
                  </button>
                )}
              </div>

              {visibleCards.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm max-w-sm mx-auto mt-8">
                  <Trash2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">Trash is Empty</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Cards deleted from your dashboard folders are sent here temporarily before complete disposal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleCards.map((card) => (
                    <FlashCardItem 
                      key={card.id}
                      card={card}
                      category={categories.find(c => c.id === card.categoryId) || null}
                      onFavoriteToggle={handleFavoriteToggle}
                      onStatusChange={handleStatusChange}
                      onEdit={handleTriggerEditCard}
                      onDuplicate={handleDuplicateCard}
                      onMoveCategory={handleMoveCategory}
                      onDeletePermanent={handleDeletePermanent}
                      categories={categories}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SETTINGS & BACKUPS & ANALYTICS PRESETS */}
          {currentTab === 'settings' && authState.user && (
            <div className="space-y-8" id="tab-settings">
              <SettingsView 
                user={authState.user}
                onUpdatePreferences={handleUpdatePreferences}
                onUpdatePassword={handleUpdatePassword}
                onDeleteAccount={handleDeleteAccount}
                onImportBackup={handleImportBackup}
              />
              {/* Inject Stats panel inline under settings as well so they have detailed charts */}
              <div className="pt-8 border-t border-slate-100">
                <StatsView stats={stats} categories={categories} />
              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- FLOATING DIALOG OVERLAY: CREATE/EDIT FLASHCARD --- */}
      <FlashCardModal 
        card={editingCard}
        categories={categories}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCard}
      />

      {/* --- IMMERSIVE STUDY ROUND RUNNER --- */}
      <StudyView 
        cards={cards.filter(c => c.status === 'active')}
        categories={categories}
        isOpen={isStudyOpen}
        onClose={() => setIsStudyOpen(false)}
        onRecordStudy={handleRecordStudy}
        streak={stats.studyStreak}
      />

    </div>
  );
}
