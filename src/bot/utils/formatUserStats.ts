export function formatUserStats(stats: {
  total: { actionType: 'shit' | 'fart' | 'piss' | null; count: number }[]
  todayStats: { actionType: 'shit' | 'fart' | 'piss' | null; count: number }[]
}): string {
  const getCount = (type: 'shit' | 'fart' | 'piss', isToday: boolean) => {
    const array = isToday ? stats.todayStats : stats.total;
    const item = array.find((searchItem) => searchItem.actionType === type);
    return item ? item.count : 0;
  };

  const shitMessage = `💩 Сьогодні срав: ${getCount('shit', true)} раз\nВсього срав: ${getCount('shit', false)}`;
  const fartMessage = `💨 Сьогодні пердів: ${getCount('fart', true)} раз\nВсього пердів: ${getCount('fart', false)}`;
  const pissMessage = `💦 Сьогодні пісяв: ${getCount('piss', true)} раз\nВсього пісяв: ${getCount('piss', false)}`;

  return `Статистика\n\n${shitMessage}\n\n${fartMessage}\n\n${pissMessage}`;
}
