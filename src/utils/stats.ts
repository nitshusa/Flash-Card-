import { FlashCard, Category, StudyHistoryEntry, DashboardStats } from '../types';

export function calculateDashboardStats(
  cards: FlashCard[],
  categories: Category[],
  history: StudyHistoryEntry[]
): DashboardStats {
  const activeCards = cards.filter(f => f.status === 'active');
  const archivedCards = cards.filter(f => f.status === 'archived');
  const trashCards = cards.filter(f => f.status === 'trash');
  const favoritesCount = cards.filter(f => f.favorite && f.status === 'active').length;

  // Correct vs Incorrect rate
  const correctReviews = history.filter(h => h.rating === 'correct').length;
  const totalReviews = history.length;
  const completionRate = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

  // Today's reviews
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReviews = history.filter(h => h.timestamp.startsWith(todayStr));
  const todayCardsReviewedCount = todayReviews.length;

  // Study Streak Calculation
  const uniqueDaysStudied = Array.from(
    new Set(history.map(h => h.timestamp.split('T')[0]))
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending (newest first)

  let studyStreak = 0;
  if (uniqueDaysStudied.length > 0) {
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0];

    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().split('T')[0];

    // Streak is still active if user studied today or yesterday
    if (uniqueDaysStudied[0] === todayDateStr || uniqueDaysStudied[0] === yesterdayDateStr) {
      studyStreak = 1;
      const checkDate = new Date(uniqueDaysStudied[0]);

      for (let i = 1; i < uniqueDaysStudied.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expectedStr = checkDate.toISOString().split('T')[0];
        if (uniqueDaysStudied[i] === expectedStr) {
          studyStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Category Breakdown (Active cards only)
  const categoryBreakdown = categories.map(cat => {
    const count = activeCards.filter(f => f.categoryId === cat.id).length;
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      color: cat.color,
      count
    };
  }).sort((a, b) => b.count - a.count);

  // Add "Uncategorized" if any active cards are uncategorized
  const uncategorizedCount = activeCards.filter(f => f.categoryId === null).length;
  if (uncategorizedCount > 0) {
    categoryBreakdown.push({
      categoryId: 'uncategorized',
      categoryName: 'Uncategorized',
      color: '#9ca3af', // Gray
      count: uncategorizedCount
    });
  }

  // Difficulty Breakdown
  const difficultyBreakdown = {
    easy: activeCards.filter(f => f.difficulty === 'easy').length,
    medium: activeCards.filter(f => f.difficulty === 'medium').length,
    hard: activeCards.filter(f => f.difficulty === 'hard').length
  };

  return {
    totalCards: cards.length,
    activeCards: activeCards.length,
    archivedCards: archivedCards.length,
    trashCards: trashCards.length,
    favoritesCount,
    categoriesCount: categories.length,
    studySessionsCount: totalReviews,
    completionRate,
    studyStreak,
    todayCardsReviewedCount,
    categoryBreakdown,
    difficultyBreakdown
  };
}
