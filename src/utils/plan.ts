export const compareTiers = (currentTier: string, newTier: string): 'upgrade' | 'downgrade' | 'same' => {
  const current = Number(currentTier);
  const next = Number(newTier);

  if (isNaN(current) || isNaN(next)) {
    throw new Error('Invalid tier metadata');
  }

  if (next > current) return 'upgrade';
  if (next < current) return 'downgrade';
  return 'same';
}