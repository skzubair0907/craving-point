export type OrderStatus =
  | 'awaiting_payment'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'rider_assigned'
  | 'rider_accepted'
  | 'picked_up'
  | 'out_for_delivery'
  | 'arrived'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | 'ready_for_pickup'
  | 'picked_up_by_customer';

export const ORDER_STATUS_ALIASES: Record<string, OrderStatus> = {
  ORDER_PLACED: 'placed',
  order_received: 'placed',
  ready_for_pickup: 'ready',
  picked_up_by_customer: 'picked_up',
  rider_assigned: 'rider_assigned',
  rider_accepted: 'rider_accepted',
  arrived: 'arrived',
};

export const ORDER_STATE_MACHINE: Record<string, { label: string; next: string[]; terminal?: boolean }> = {
  awaiting_payment: { label: 'Awaiting payment', next: ['placed'] },
  placed: { label: 'Order received', next: ['confirmed'] },
  confirmed: { label: 'Confirmed', next: ['preparing'] },
  preparing: { label: 'Preparing', next: ['ready'] },
  ready: { label: 'Ready', next: ['out_for_delivery', 'picked_up'] },
  rider_assigned: { label: 'Rider assigned', next: ['rider_accepted'] },
  rider_accepted: { label: 'Rider accepted', next: ['picked_up'] },
  picked_up: { label: 'Picked up', next: ['out_for_delivery', 'delivered'] },
  out_for_delivery: { label: 'Out for delivery', next: ['arrived', 'delivered'] },
  arrived: { label: 'Arrived', next: ['delivered'] },
  delivered: { label: 'Delivered', next: [], terminal: true },
  cancelled: { label: 'Cancelled', next: [], terminal: true },
  rejected: { label: 'Rejected', next: [], terminal: true },
};

export function normalizeOrderStatus(status: string | null | undefined): OrderStatus | null {
  if (!status) return null;
  const normalized = status.toString().trim();
  const key = normalized.toLowerCase();
  if (key in ORDER_STATUS_ALIASES) return ORDER_STATUS_ALIASES[key];
  if (key === 'awaiting_payment') return 'awaiting_payment';
  if (key === 'placed' || key === 'order_placed') return 'placed';
  if (key === 'confirmed') return 'confirmed';
  if (key === 'preparing') return 'preparing';
  if (key === 'ready') return 'ready';
  if (key === 'ready_for_pickup') return 'ready';
  if (key === 'rider_assigned') return 'rider_assigned';
  if (key === 'rider_accepted') return 'rider_accepted';
  if (key === 'picked_up' || key === 'pickedup') return 'picked_up';
  if (key === 'out_for_delivery') return 'out_for_delivery';
  if (key === 'arrived') return 'arrived';
  if (key === 'delivered') return 'delivered';
  if (key === 'cancelled' || key === 'canceled') return 'cancelled';
  if (key === 'rejected') return 'rejected';
  return null;
}

export function getOrderTrackingSteps(orderType: 'delivery' | 'pickup' = 'delivery') {
  return orderType === 'pickup'
    ? ['placed', 'confirmed', 'preparing', 'ready', 'picked_up']
    : ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
}

export function canTransitionOrderStatus(current: string | null | undefined, next: string | null | undefined): boolean {
  const from = normalizeOrderStatus(current);
  const to = normalizeOrderStatus(next);

  if (!from || !to) return false;
  if (from === to) return true;
  if (from === 'awaiting_payment' && to === 'placed') return true;

  const allowed = ORDER_STATE_MACHINE[from]?.next ?? [];
  return allowed.includes(to);
}

export function getNextOrderStatus(order: { status?: string | null; orderType?: 'delivery' | 'pickup' | string | null }): string | null {
  const status = normalizeOrderStatus(order?.status ?? null);
  if (!status) return null;
  if (status === 'awaiting_payment') return 'placed';
  if (status === 'ready') {
    return order?.orderType === 'pickup' ? 'picked_up' : 'out_for_delivery';
  }
  const allowed = ORDER_STATE_MACHINE[status]?.next ?? [];
  return allowed[0] ?? null;
}

export function getOrderStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeOrderStatus(status ?? null);
  if (!normalized) return String(status ?? 'Unknown').replace(/_/g, ' ');
  if (normalized === 'picked_up') return 'Picked up';
  if (normalized === 'out_for_delivery') return 'On the way';
  return ORDER_STATE_MACHINE[normalized]?.label ?? normalized.replace(/_/g, ' ');
}

export function getOrderStatusTone(status: string | null | undefined): string {
  const normalized = normalizeOrderStatus(status ?? null);
  if (!normalized) return 'border-slate-400/25 bg-slate-500/10 text-slate-100';
  if (['out_for_delivery', 'ready', 'confirmed', 'preparing'].includes(normalized)) {
    return 'border-orange-400/35 bg-orange-500/10 text-orange-100';
  }
  if (['delivered', 'picked_up'].includes(normalized)) {
    return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  }
  if (normalized === 'cancelled') {
    return 'border-red-400/35 bg-red-500/10 text-red-100';
  }
  if (normalized === 'awaiting_payment') {
    return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  }
  return 'border-slate-400/25 bg-slate-500/10 text-slate-100';
}
