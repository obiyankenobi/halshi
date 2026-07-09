// Field limits for market creation, enforced client-side (maxLength) and
// server-side (/api/markets). Outcomes are stored on-chain in every bet
// transaction, so they get the tightest cap; question/description only live
// in the market registry.
export const LIMITS = {
  question: 120,
  description: 500,
  outcome: 40,
  maxOutcomes: 16,
} as const;
