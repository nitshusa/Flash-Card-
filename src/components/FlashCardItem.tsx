/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Star, 
  Trash2, 
  Edit, 
  Copy, 
  FolderInput, 
  Archive, 
  Share2, 
  RotateCcw, 
  CheckCircle, 
  Eye, 
  Calendar, 
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { FlashCard, Category, FlashCardDifficulty } from '../types';

interface FlashCardItemProps {
  key?: React.Key;
  card: FlashCard;
  category: Category | null;
  onFavoriteToggle: (id: string, current: boolean) => void;
  onStatusChange: (id: string, status: 'active' | 'archived' | 'trash') => void;
  onEdit: (card: FlashCard) => void;
  onDuplicate: (id: string) => void;
  onMoveCategory: (id: string, newCategoryId: string | null) => void;
  onDeletePermanent?: (id: string) => void;
  categories: Category[];
}

export default function FlashCardItem({
  card,
  category,
  onFavoriteToggle,
  onStatusChange,
  onEdit,
  onDuplicate,
  onMoveCategory,
  onDeletePermanent,
  categories
}: FlashCardItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle(card.id, card.favorite);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(card);
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(card.id);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = card.status === 'archived' ? 'active' : 'archived';
    onStatusChange(card.id, nextStatus);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.status === 'trash') {
      if (confirm('Are you sure you want to permanently delete this card? This action cannot be undone.')) {
        onDeletePermanent?.(card.id);
      }
    } else {
      onStatusChange(card.id, 'trash');
    }
  };

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange(card.id, 'active');
  };

  const handleMoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoveMenu(!showMoveMenu);
  };

  const handleCategorySelect = (e: React.MouseEvent, catId: string | null) => {
    e.stopPropagation();
    onMoveCategory(card.id, catId);
    setShowMoveMenu(false);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`Flashcard: ${card.title}\nQ: ${card.question}\nA: ${card.answer}`);
    setShowShareTooltip(true);
    setTimeout(() => setShowShareTooltip(false), 2000);
  };

  const difficultyColors = {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    hard: 'bg-rose-50 text-rose-700 border-rose-100'
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div 
      className="relative h-96 [perspective:1000px] cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
      id={`card-outer-${card.id}`}
    >
      {/* CARD FLIP WRAPPER */}
      <div 
        className={`w-full h-full transition-transform duration-500 [transform-style:preserve-3d] relative ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
        id={`card-inner-${card.id}`}
      >
        
        {/* ==================== FRONT SIDE (QUESTION) ==================== */}
        <div 
          className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between [backface-visibility:hidden]"
          style={{ borderLeft: `4px solid ${category?.color || '#cbd5e1'}` }}
          id={`card-front-${card.id}`}
        >
          {/* Header Row */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex flex-wrap gap-2">
              {/* Category tag */}
              <span 
                className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1.5"
                style={{ backgroundColor: `${category?.color || '#cbd5e1'}15`, color: category?.color || '#64748b' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category?.color || '#64748b' }}></span>
                {category?.name || 'Uncategorized'}
              </span>

              {/* Difficulty badge */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${difficultyColors[card.difficulty]}`}>
                {card.difficulty}
              </span>
            </div>

            {/* Favorite Star (except in trash) */}
            {card.status !== 'trash' && (
              <button 
                onClick={handleFavoriteClick}
                className={`p-1.5 rounded-xl transition hover:bg-slate-50 cursor-pointer ${
                  card.favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 hover:text-slate-400'
                }`}
                title="Favorite"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Main Title & Question */}
          <div className="flex-1 flex flex-col justify-center my-4 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Question</h3>
            <h4 className="text-base font-bold text-slate-800 line-clamp-1 mb-2">{card.title}</h4>
            <div className="text-slate-600 text-sm overflow-y-auto max-h-36 pr-1 leading-relaxed whitespace-pre-wrap font-medium">
              {card.question}
            </div>
          </div>

          {/* Footer - Tags & Date */}
          <div className="border-t border-slate-50 pt-4 mt-auto">
            {card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-12 overflow-y-auto scrollbar-none">
                {card.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-semibold bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(card.createdAt)}</span>
              </div>
              <div className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                <span>Click to reveal</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== BACK SIDE (ANSWER) ==================== */}
        <div 
          className="absolute inset-0 w-full h-full bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]"
          id={`card-back-${card.id}`}
        >
          {/* Header Row */}
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Answer Side
            </span>

            <span className="text-[10px] font-semibold text-slate-400">
              ID: {card.id.slice(0, 8)}
            </span>
          </div>

          {/* Answer Text */}
          <div className="flex-1 flex flex-col justify-center my-4 overflow-hidden">
            <div className="text-slate-800 text-sm overflow-y-auto max-h-40 pr-1 leading-relaxed whitespace-pre-wrap font-medium">
              {card.answer}
            </div>
            
            {card.notes && (
              <div className="mt-3 p-2.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs overflow-y-auto max-h-16">
                <strong className="text-slate-700 block mb-0.5">Study Notes:</strong>
                <p className="font-normal italic leading-normal">{card.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons Section */}
          <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between relative">
            <div className="flex items-center gap-1">
              {card.status === 'trash' ? (
                <>
                  <button
                    onClick={handleRestoreClick}
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                    title="Restore Card"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {/* Edit */}
                  <button
                    onClick={handleEditClick}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                    title="Edit card details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={handleDuplicateClick}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                    title="Duplicate Card"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Archive */}
                  <button
                    onClick={handleArchiveClick}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      card.status === 'archived' 
                        ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                    title={card.status === 'archived' ? 'Activate Card' : 'Archive Card'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  {/* Move Category */}
                  <div className="relative">
                    <button
                      onClick={handleMoveClick}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                      title="Move Category"
                    >
                      <FolderInput className="w-4 h-4" />
                    </button>
                    
                    {/* Floating Categories dropdown */}
                    {showMoveMenu && (
                      <div className="absolute bottom-10 left-0 w-44 bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-50 overflow-y-auto max-h-48 scrollbar-thin">
                        <button
                          onClick={(e) => handleCategorySelect(e, null)}
                          className="w-full text-left px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-50 text-slate-500 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                          None
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={(e) => handleCategorySelect(e, cat.id)}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></span>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Share Quick-Copy */}
                  <div className="relative">
                    <button
                      onClick={handleShareClick}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                      title="Copy Card details"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {showShareTooltip && (
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Copied to clipboard!
                      </div>
                    )}
                  </div>

                  {/* Trash */}
                  <button
                    onClick={handleDeleteClick}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    title="Send to Trash"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(card.updatedAt)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
