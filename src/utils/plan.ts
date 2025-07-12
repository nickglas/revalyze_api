export function compareTiers(
  current: number,
  next: number
): "same" | "upgrade" | "downgrade" {
  if (current === next) return "same";
  return current < next ? "upgrade" : "downgrade";
}
