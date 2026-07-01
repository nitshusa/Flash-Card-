/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserPreferences {
  theme: 'light' | 'dark';
  accentColor: string; // e.g. '#6366f1' (indigo), '#3b82f6' (blue), etc.
  autoDeleteTrashDays: number; // e.g. 30
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string; // Tailwind color name or hex
  icon: string;  // Lucide icon name
  createdAt: string;
}

export type FlashCardDifficulty = 'easy' | 'medium' | 'hard';
export type FlashCardStatus = 'active' | 'archived' | 'trash';

export interface FlashCard {
  id: string;
  userId: string;
  title: string;
  question: string;
  answer: string;
  categoryId: string | null;
  difficulty: FlashCardDifficulty;
  color: string; // hex or Tailwind color class for card visual styling
  notes: string;
  tags: string[];
  favorite: boolean;
  status: FlashCardStatus;
  deletedAt: string | null; // For trash auto-deletion calculations
  createdAt: string;
  updatedAt: string;
}

export interface StudyHistoryEntry {
  id: string;
  userId: string;
  cardId: string;
  timestamp: string;
  rating: 'correct' | 'incorrect';
  duration: number; // in milliseconds
}

export interface DashboardStats {
  totalCards: number;
  activeCards: number;
  archivedCards: number;
  trashCards: number;
  favoritesCount: number;
  categoriesCount: number;
  studySessionsCount: number;
  completionRate: number; // % of reviews that are "correct"
  studyStreak: number;    // consecutive days studied
  todayCardsReviewedCount: number;
  categoryBreakdown: { categoryId: string; categoryName: string; color: string; count: number }[];
  difficultyBreakdown: { easy: number; medium: number; hard: number };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}
