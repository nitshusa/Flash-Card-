/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, AlertCircle, Save, Calendar, Sparkle } from 'lucide-react';
import { FlashCard, Category, FlashCardDifficulty } from '../types';

interface FlashCardModalProps {
  card: FlashCard | null; // Null means create mode, otherwise edit mode
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: any) => Promise<void>;
}

const CUSTOM_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#fef2f2', label: 'Soft Red' },
  { value: '#fffbeb', label: 'Soft Amber' },
  { value: '#f0fdf4', label: 'Soft Green' },
  { value: '#f0f9ff', label: 'Soft Blue' },
  { value: '#faf5ff', label: 'Soft Purple' }
];

export default function FlashCardModal({
  card,
  categories,
  isOpen,
  onClose,
  onSave
}: FlashCardModalProps) {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<FlashCardDifficulty>('medium');
  const [color, setColor] = useState('#ffffff');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Autosave timer ref
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset fields or load existing card
  useEffect(() => {
    if (isOpen) {
      if (card) {
        setTitle(card.title);
        setQuestion(card.question);
        setAnswer(card.answer);
        setCategoryId(card.categoryId || '');
        setDifficulty(card.difficulty);
        setColor(card.color || '#ffffff');
        setNotes(card.notes || '');
        setTags(card.tags || []);
        setTagInput('');
        setDraftRestored(false);
      } else {
        // Create Mode - Try loading autosaved draft first!
        const savedDraft = localStorage.getItem('fc_create_draft');
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setTitle(draft.title || '');
            setQuestion(draft.question || '');
            setAnswer(draft.answer || '');
            setCategoryId(draft.categoryId || '');
            setDifficulty(draft.difficulty || 'medium');
            setColor(draft.color || '#ffffff');
            setNotes(draft.notes || '');
            setTags(draft.tags || []);
            setDraftRestored(true);
          } catch (e) {
            clearDraft();
          }
        } else {
          resetFields();
        }
      }
      setError(null);
    }
  }, [isOpen, card]);

  // AUTOSAVE TRIGGER (Only in Create Mode)
  useEffect(() => {
    if (isOpen && !card) {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }

      autosaveTimer.current = setTimeout(() => {
        const draft = { title, question, answer, categoryId, difficulty, color, notes, tags };
        // Only save if there's actual typed content to avoid blank saves
        if (title || question || answer || notes) {
          localStorage.setItem('fc_create_draft', JSON.stringify(draft));
        }
      }, 1000); // Debounce autosave to 1 second
    }

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [title, question, answer, categoryId, difficulty, color, notes, tags, isOpen, card]);

  const resetFields = () => {
    setTitle('');
    setQuestion('');
    setAnswer('');
    setCategoryId('');
    setDifficulty('medium');
    setColor('#ffffff');
    setNotes('');
    setTags([]);
    setTagInput('');
    setDraftRestored(false);
  };

  const clearDraft = () => {
    localStorage.removeItem('fc_create_draft');
    setDraftRestored(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/#/g, '');
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !question.trim() || !answer.trim()) {
      setError('Title, Question, and Answer are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        question: question.trim(),
        answer: answer.trim(),
        categoryId: categoryId || null,
        difficulty,
        color,
        notes: notes.trim(),
        tags
      });

      // Successful save - clear local drafts!
      if (!card) {
        clearDraft();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto selection:bg-indigo-500 selection:text-white" id="modal-backdrop">
      <div 
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full p-8 relative flex flex-col my-8"
        style={{ backgroundColor: color }}
        id="modal-card"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-500/10 hover:text-slate-700 transition cursor-pointer"
          id="modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="mb-6 flex items-center gap-2.5" id="modal-header">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Sparkle className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {card ? 'Edit Flash Card' : 'Create Flash Card'}
            </h2>
            {!card && draftRestored && (
              <span className="text-[10px] font-bold text-indigo-500 mt-1 block">
                ● Restored unfinished draft 
                <button onClick={() => { resetFields(); clearDraft(); }} className="underline ml-1 font-bold cursor-pointer">Discard draft</button>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-2.5" id="modal-error">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="modal-form">
          {/* Card Title */}
          <div className="space-y-1.5" id="form-title-group">
            <label className="text-xs font-semibold text-slate-600">Card Title</label>
            <input 
              type="text"
              required
              placeholder="e.g., Photosynthesis Phase 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Question TextArea */}
          <div className="space-y-1.5" id="form-question-group">
            <label className="text-xs font-semibold text-slate-600">Question</label>
            <textarea 
              rows={3}
              required
              placeholder="Write the front-side flash card question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all resize-none font-medium"
            />
          </div>

          {/* Answer TextArea */}
          <div className="space-y-1.5" id="form-answer-group">
            <label className="text-xs font-semibold text-slate-600">Answer</label>
            <textarea 
              rows={3}
              required
              placeholder="Write the back-side flash card answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all resize-none font-medium"
            />
          </div>

          {/* Category, Difficulty Row */}
          <div className="grid grid-cols-2 gap-4" id="form-meta-row">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-700 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Difficulty</label>
              <div className="flex bg-slate-50/70 border border-slate-100 p-0.5 rounded-xl">
                {(['easy', 'medium', 'hard'] as FlashCardDifficulty[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase transition cursor-pointer ${
                      difficulty === level 
                        ? level === 'easy' ? 'bg-emerald-500 text-white shadow-sm' :
                          level === 'medium' ? 'bg-amber-500 text-white shadow-sm' :
                          'bg-rose-505 bg-rose-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Study Notes */}
          <div className="space-y-1.5" id="form-notes-group">
            <label className="text-xs font-semibold text-slate-600">Extra Study Notes (Optional)</label>
            <input 
              type="text"
              placeholder="e.g., Focus on equations"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Tag Box */}
          <div className="space-y-1.5" id="form-tags-group">
            <label className="text-xs font-semibold text-slate-600">Tags</label>
            <input 
              type="text"
              placeholder="Type tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-4 py-2 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none transition-all"
            />
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map((t, i) => (
                  <span 
                    key={i} 
                    className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg flex items-center gap-1"
                  >
                    #{t}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTag(i)} 
                      className="text-indigo-400 hover:text-indigo-600 cursor-pointer text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Color Picker Row */}
          <div className="space-y-1.5" id="form-color-group">
            <label className="text-xs font-semibold text-slate-600">Theme Card Background Color</label>
            <div className="flex gap-2">
              {CUSTOM_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full border cursor-pointer transition ${
                    color === c.value ? 'ring-2 ring-indigo-500 ring-offset-2 border-slate-400' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="pt-4 border-t border-slate-100/50 flex justify-end gap-3" id="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Card'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
