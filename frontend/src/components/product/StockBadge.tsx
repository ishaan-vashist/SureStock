import Badge from '../common/Badge';

interface StockBadgeProps {
  available: number;
  threshold?: number;
}

export default function StockBadge({ available, threshold = 10 }: StockBadgeProps) {
  if (available === 0) {
    return <Badge variant="error">Out of Stock</Badge>;
  }

  if (available < threshold) {
    return <Badge variant="warning">Only {available} left</Badge>;
  }

  return null;
}
