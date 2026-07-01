/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  RotateCcw, 
  HelpCircle, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  Shuffle, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  GraduationCap, 
  ListRestart,
  Flame,
  Award
} from 'lucide-react';
import { FlashCard, Category } from '../types';

interface StudyViewProps {
  cards: FlashCard[];
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onRecordStudy: (cardId: string, rating: 'correct' | 'incorrect', duration: number) => Promise<void>;
  streak: number;
}

export default function StudyView({
  cards,
  categories,
  isOpen,
  onClose,
  onRecordStudy,
  streak
}: StudyViewProps) {
  // Main deck states
  const [deck, setDeck] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Stats tracked during current session
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCards, setIncorrectCards] = useState<FlashCard[]>([]);
  const [timeSpent, setTimeSpent] = useState<number[]>([]); // record milliseconds per card

  const cardStartTimeRef = useRef<number>(Date.now());
  const studyContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize/Reset Deck
  useEffect(() => {
    if (isOpen && cards.length > 0) {
      setDeck([...cards]);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsFinished(false);
      setCorrectCount(0);
      setIncorrectCards([]);
      setTimeSpent([]);
      cardStartTimeRef.current = Date.now();
    }
  }, [isOpen, cards]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    if (!isOpen || isFinished || deck.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
        case ' ': // Spacebar
          e.preventDefault();
          if (isFlipped) {
            handleNext();
          } else {
            setIsFlipped(true);
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'Enter':
          setIsFlipped(prev => !prev);
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFinished, currentIndex, isFlipped, deck]);

  // Fullscreen toggle helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      studyContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      cardStartTimeRef.current = Date.now();
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      cardStartTimeRef.current = Date.now();
    }
  };

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    cardStartTimeRef.current = Date.now();
  };

  const handleRate = async (rating: 'correct' | 'incorrect') => {
    const activeCard = deck[currentIndex];
    const duration = Date.now() - cardStartTimeRef.current;
    
    // Save to statistics database
    await onRecordStudy(activeCard.id, rating, duration);

    // Track internal session scores
    if (rating === 'correct') {
      setCorrectCount(prev => prev + 1);
    } else {
      if (!incorrectCards.some(c => c.id === activeCard.id)) {
        setIncorrectCards(prev => [...prev, activeCard]);
      }
    }

    setTimeSpent(prev => [...prev, duration]);

    // Move next automatically
    handleNext();
  };

  const handleRestartIncorrect = () => {
    if (incorrectCards.length > 0) {
      setDeck([...incorrectCards]);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsFinished(false);
      setCorrectCount(0);
      setIncorrectCards([]);
      setTimeSpent([]);
      cardStartTimeRef.current = Date.now();
    }
  };

  const handleRestartAll = () => {
    setDeck([...cards]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setCorrectCount(0);
    setIncorrectCards([]);
    setTimeSpent([]);
    cardStartTimeRef.current = Date.now();
  };

  if (!isOpen) return null;

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-50 text-white">
        <GraduationCap className="w-16 h-16 text-indigo-400 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold mb-2">No Cards to Study</h2>
        <p className="text-slate-400 text-xs max-w-sm text-center mb-6 leading-relaxed">
          Add some active flash cards to your deck first before launching study mode!
        </p>
        <button onClick={onClose} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition">
          Go Back
        </button>
      </div>
    );
  }

  const currentCard = deck[currentIndex];
  const progressPercent = deck.length > 0 ? Math.round(((currentIndex + (isFinished ? 1 : 0)) / deck.length) * 100) : 0;
  const cardCategory = currentCard ? categories.find(c => c.id === currentCard.categoryId) : null;

  // Average time in seconds
  const averageTime = timeSpent.length > 0 
    ? Math.round((timeSpent.reduce((a, b) => a + b, 0) / timeSpent.length) / 1000)
    : 0;

  if (!isFinished && !currentCard) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-50 text-white">
        <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/10 animate-pulse">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight">Initializing study session...</h2>
      </div>
    );
  }

  return (
    <div 
      ref={studyContainerRef}
      className="fixed inset-0 bg-slate-950 flex flex-col justify-between z-50 p-6 md:p-8 text-white selection:bg-indigo-500 selection:text-white"
      id="study-panel-root"
    >
      
      {/* HEADER ROW */}
      <div className="flex justify-between items-center shrink-0 border-b border-slate-900 pb-4" id="study-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-tight">Active Study Session</h2>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              {isFinished ? 'Finished' : `Card ${currentIndex + 1} of ${deck.length}`}
            </p>
          </div>
        </div>

        {/* Utilities */}
        <div className="flex items-center gap-3">
          {/* Streak Indicator */}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-amber-500 text-xs font-bold shadow-inner">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>{streak} Day Streak</span>
            </div>
          )}

          {/* Fullscreen Button */}
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Toggle Fullscreen"
            id="study-fullscreen-btn"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Escape */}
          <button 
            onClick={onClose}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition cursor-pointer"
            title="Exit Session (Esc)"
            id="study-exit-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN SCREEN CANVAS */}
      <div className="flex-1 flex items-center justify-center py-8" id="study-canvas-content">
        {isFinished ? (
          /* ================= FINISH SCREEN STATE ================= */
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-xl text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600"></div>

            <div className="w-12 h-12 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/10">
              <Award className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold mb-1">Study Round Complete!</h2>
            <p className="text-xs text-slate-400 mb-5 font-semibold">You reviewed {deck.length} flash cards inside this session.</p>

            {/* Scorecard grids */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Correct Rate</span>
                <span className="text-xl font-bold text-emerald-400">
                  {Math.round((correctCount / deck.length) * 100)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{correctCount} of {deck.length} cards</span>
              </div>
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Avg. Speed</span>
                <span className="text-xl font-bold text-indigo-400">
                  {averageTime}s <span className="text-xs font-normal text-slate-500">/ card</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Focus paced study</span>
              </div>
            </div>

            {/* Sub text */}
            {incorrectCards.length > 0 ? (
              <p className="text-xs text-slate-400 mb-5 leading-relaxed bg-slate-950 border border-slate-800 p-3 rounded-lg">
                You marked <strong className="text-rose-400">{incorrectCards.length} cards</strong> as incorrect. 
                Rerun them right now to lock in your memory!
              </p>
            ) : (
              <p className="text-xs text-emerald-400 mb-5 leading-relaxed bg-emerald-950/10 border border-emerald-900/20 p-3 rounded-lg flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 fill-emerald-400" />
                <span>Flawless study! You have fully mastered this round.</span>
              </p>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {incorrectCards.length > 0 && (
                <button 
                  onClick={handleRestartIncorrect}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <ListRestart className="w-4 h-4" />
                  Repeat Incorrect Only
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleRestartAll}
                  className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Restart All Cards
                </button>
                <button 
                  onClick={onClose}
                  className="py-2.5 bg-slate-850 hover:bg-slate-750 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Exit Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STUDY ACTIVE DECK CARD STATE ================= */
          <div className="max-w-xl w-full flex flex-col items-center gap-5" id="study-card-panel">
            
            {/* Card Frame 3D flips */}
            <div 
              onClick={handleFlip}
              className="w-full aspect-[16/10] md:h-80 cursor-pointer [perspective:1000px]"
            >
              <div 
                className={`w-full h-full transition-transform duration-500 [transform-style:preserve-3d] relative ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                
                {/* FRONT (QUESTION) */}
                <div 
                  className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between text-slate-800 [backface-visibility:hidden] shadow-sm"
                  style={{ borderLeft: `6px solid ${cardCategory?.color || '#3b82f6'}` }}
                >
                  <div className="flex justify-between items-center">
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5"
                      style={{ backgroundColor: `${cardCategory?.color || '#3b82f6'}15`, color: cardCategory?.color || '#3b82f6' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cardCategory?.color || '#3b82f6' }}></span>
                      {cardCategory?.name || 'Uncategorized'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Question Side</span>
                  </div>

                  <div className="my-auto text-center py-4 overflow-y-auto max-h-48">
                    <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Title: {currentCard.title}</h3>
                    <p className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed font-sans whitespace-pre-wrap">
                      {currentCard.question}
                    </p>
                  </div>

                  <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-3 shrink-0">
                    Press Space / Click Card to flip and reveal answer
                  </div>
                </div>

                {/* BACK (ANSWER) */}
                <div 
                  className="absolute inset-0 w-full h-full bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between text-white [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-md"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 shrink-0">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Answer Revealed
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">Ready to rate?</span>
                  </div>

                  <div className="my-auto text-center py-3 overflow-y-auto max-h-40">
                    <p className="text-base md:text-lg font-bold leading-relaxed whitespace-pre-wrap text-slate-100">
                      {currentCard.answer}
                    </p>
                    {currentCard.notes && (
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[11px] text-left max-w-md mx-auto">
                        <strong className="text-slate-200 block mb-0.5">Study Note:</strong>
                        <p className="italic leading-relaxed font-normal">{currentCard.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Self Assessment buttons */}
                  <div className="flex justify-center gap-2.5 border-t border-slate-800 pt-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRate('incorrect')}
                      className="px-4 py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Needs Study (Hard)
                    </button>
                    <button
                      onClick={() => handleRate('correct')}
                      className="px-4 py-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Know It (Easy)
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Manual Navigation Row */}
            <div className="flex justify-between items-center w-full max-w-xs mt-1 shrink-0" id="study-prev-next-nav">
              <button 
                onClick={handlePrev} 
                disabled={currentIndex === 0}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Previous Card (Left Arrow)"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handleShuffle}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Shuffle Cards order"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Shuffle
              </button>

              <button 
                onClick={handleNext}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Next Card (Right Arrow / Spacebar)"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PROGRESS TRACKER FOOTER */}
      <div className="w-full shrink-0 border-t border-slate-900 pt-4" id="study-footer-progress">
        <div className="flex justify-between items-center text-xs text-slate-500 font-bold mb-1.5">
          <span>Overall Completion</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

    </div>
  );
}
