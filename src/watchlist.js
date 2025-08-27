// Watchlist simples em memória (para produção: persistir por usuário autenticado)
const userLists = new Map(); // userId -> Set(ids)

export function addToWatchlist(userId, id) {
  if (!userLists.has(userId)) userLists.set(userId, new Set());
  userLists.get(userId).add(id);
}

export function removeFromWatchlist(userId, id) {
  if (!userLists.has(userId)) return;
  userLists.get(userId).delete(id);
}

export function getWatchlist(userId) {
  return Array.from(userLists.get(userId) || []);
}
