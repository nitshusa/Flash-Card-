/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Folder, 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  X, 
  Save, 
  Atom, 
  Languages, 
  BookOpen, 
  Hourglass, 
  Layers, 
  Cpu, 
  Brain,
  Sparkle
} from 'lucide-react';
import { Category, FlashCard } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  cards: FlashCard[];
  onCreateCategory: (name: string, color: string, icon: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, color: string, icon: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const CATEGORY_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b'  // Slate
];

const CATEGORY_ICONS = [
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Languages', icon: Languages },
  { name: 'Atom', icon: Atom },
  { name: 'Hourglass', icon: Hourglass },
  { name: 'Cpu', icon: Cpu },
  { name: 'Brain', icon: Brain },
  { name: 'Layers', icon: Layers }
];

export default function CategoryManager({
  categories,
  cards,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryManagerProps) {
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('BookOpen');

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const getCardCount = (catId: string) => {
    return cards.filter(c => c.categoryId === catId && c.status === 'active').length;
  };

  const handleOpenCreate = () => {
    setName('');
    setColor('#6366f1');
    setIcon('BookOpen');
    setEditingCat(null);
    setShowCreator(true);
    setError(null);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon);
    setShowCreator(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowCreator(false);
    setEditingCat(null);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setColor('#6366f1');
    setIcon('BookOpen');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingCat) {
        await onUpdateCategory(editingCat.id, name.trim(), color, icon);
      } else {
        await onCreateCategory(name.trim(), color, icon);
      }
      setShowCreator(false);
      setEditingCat(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (cat: Category) => {
    const cardCount = getCardCount(cat.id);
    const msg = cardCount > 0 
      ? `This category contains ${cardCount} active cards. Deleting the category will make these cards Uncategorized (they will NOT be deleted).\n\nDo you want to continue?`
      : 'Are you sure you want to delete this category?';

    if (confirm(msg)) {
      try {
        await onDeleteCategory(cat.id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete category');
      }
    }
  };

  const renderIconComponent = (iconName: string, iconColor: string) => {
    const found = CATEGORY_ICONS.find(i => i.name === iconName);
    const IconComp = found ? found.icon : Folder;
    return <IconComp className="w-5 h-5" style={{ color: iconColor }} />;
  };

  return (
    <div className="space-y-8 animate-fade-in select-none selection:bg-indigo-500 selection:text-white" id="category-manager-root">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center" id="category-manager-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Category Administration</h1>
          <p className="text-slate-500 mt-1 text-sm">Organize your cards into folders, assign custom colored tags, and track volumes.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          id="create-category-btn"
        >
          <Plus className="w-4.5 h-4.5" />
          Create Category
        </button>
      </div>

      {/* FLOATING CREATOR BOX OVERLAY */}
      {showCreator && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-lg relative" id="category-creator-modal">
            <button 
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Folder className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingCat ? 'Edit Folder Category' : 'Create Folder Category'}
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Biology Chemistry, Spanish Vocabulary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              {/* Icon select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Folder Icon Symbol</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ICONS.map((i) => {
                    const IconComp = i.icon;
                    const isSelected = icon === i.name;
                    return (
                      <button
                        key={i.name}
                        type="button"
                        onClick={() => setIcon(i.name)}
                        className={`p-2 border rounded-lg cursor-pointer transition hover:bg-slate-50 ${
                          isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/15' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <IconComp className="w-4.5 h-4.5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color tag select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Color Aesthetic</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border cursor-pointer transition ${
                        color === c ? 'ring-2 ring-indigo-500 ring-offset-2 border-slate-400' : 'border-slate-200'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST OF CATEGORIES GRID */}
      {categories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm max-w-md mx-auto" id="categories-empty-state">
          <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">No Custom Categories</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Categories make studying tidy. Group your history, maths, languages or sciences cards right now!
          </p>
          <button 
            onClick={handleOpenCreate} 
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition mt-4 cursor-pointer"
          >
            Create Your First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="categories-list-grid">
          {categories.map((cat) => {
            const cardCount = getCardCount(cat.id);
            return (
              <div
                key={cat.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group h-44"
                style={{ borderTop: `4px solid ${cat.color}` }}
                id={`cat-card-${cat.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {/* Icon Sphere */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${cat.color}15` }}>
                      {renderIconComponent(cat.icon, cat.color)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 truncate leading-tight max-w-[140px]">{cat.name}</h3>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-1">{cardCount} Active Cards</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer"
                      title="Rename/Edit Folder"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Aesthetic Bottom Sparkle */}
                <div className="border-t border-slate-200 pt-3 mt-auto flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Created: {new Date(cat.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    Folder Mode
                    <Sparkle className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
