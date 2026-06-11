import { Badge } from './badge';
import type { PaymentStatus } from '@/types/app';

interface Props {
  status: PaymentStatus;
  overdue?: boolean;
  compact?: boolean;
}

const labelFor: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
};

export function PaymentStatusBadge({ status, overdue, compact }: Props) {
  if (overdue) {
    return <Badge label={compact ? 'Overdue' : 'Overdue'} variant="danger" dot />;
  }
  const variant = status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger';
  return <Badge label={labelFor[status]} variant={variant} />;
}
