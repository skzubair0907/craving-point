import { CheckCircle, Circle } from 'lucide-react';
import clsx from 'clsx';

interface DeliveryStatusStepperProps {
  /** Current order status string (e.g., 'placed', 'confirmed', 'out_for_delivery') */
  currentStatus: string;
  /** Order type to determine which steps to show */
  orderType: 'delivery' | 'pickup';
  /** Optional custom steps array (overrides default) */
  steps?: string[];
  /** Optional custom labels for steps (overrides default) */
  labels?: Record<string, string>;
}

const DEFAULT_LABELS: Record<string, string> = {
  placed: 'Order received',
  confirmed: 'Restaurant confirmed',
  preparing: 'Preparing your food',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  picked_up: 'Picked up',
};

const DELIVERY_STEPS = ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const PICKUP_STEPS = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up'];

export const DeliveryStatusStepper: React.FC<DeliveryStatusStepperProps> = ({
  currentStatus,
  orderType,
  steps,
  labels = DEFAULT_LABELS,
}) => {
  const stepList = steps ?? (orderType === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS);

  // Rider-only states deliberately keep the customer on a compact six-step
  // timeline. The authoritative order status remains unchanged in Supabase.
  const customerStatus = orderType === 'delivery' && ['rider_assigned', 'rider_accepted', 'picked_up'].includes(currentStatus)
    ? 'ready'
    : orderType === 'delivery' && currentStatus === 'arrived'
      ? 'out_for_delivery'
      : currentStatus;
  const currentIndex = stepList.indexOf(customerStatus);
  const isComplete = currentIndex === stepList.length - 1; // Last step reached

  return (
    <ol className="space-y-5">
      {stepList.map((step, index) => (
        <li
          key={step}
          className="flex items-center gap-4"
          aria-current={index === currentIndex ? 'step' : undefined}
        >
          {index <= currentIndex ? (
            <CheckCircle className="text-green-500 shrink-0" />
          ) : (
            <Circle className="text-accent/60 shrink-0" />
          )}
          <span
            className={clsx(
              index === currentIndex ? 'font-black text-primary' : 'text-accent/60',
              index === stepList.length - 1 && !isComplete && 'italic'
            )}
          >
            {labels[step] ?? step}
          </span>
        </li>
      ))}
    </ol>
  );
}
