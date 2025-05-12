export const formatAllUsersReputation = (
  rep: {
    userId: number | null
    username: string | null
    reputation: number | null
  }[],
) => {
  // Sort by reputation in descending order
  const sortedRep = [...rep].sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0))

  return sortedRep
    .map((r, index) => {
      let prefix = ''
      if (index === 0) prefix = '🥇 1 місце: '
      if (index === 1) prefix = '🥈 2 місце: '
      if (index === 2) prefix = '🥉 3 місце: '

      const line = index === 2 ? '\n\n' : ''
      return `${prefix}@${r.username}: ${r.reputation}${line}`
    })
    .join('\n')
}
