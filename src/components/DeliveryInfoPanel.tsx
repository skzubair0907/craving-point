import { Phone, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DeliveryInfoPanelProps {
  /** Rider information (if available) */
  riderInfo?: {
    name?: string;
    phone?: string;
    vehicle?: string;
  };
  /** Estimated time of arrival in minutes (null if not available) */
  etaMinutes: number | null;
  /** Order details for summary */
  order?: {
    items?: Array<{ name: string; quantity: number; price: number }>;
    total: number;
  };
  /** Timestamp of last location update */
  lastUpdated: string | null;
  /** Callback for calling rider */
  onCallRider?: (phone: string) => void;
  /** Callback for sharing live location */
  onShareLocation?: () => void;
}

export const DeliveryInfoPanel: React.FC<DeliveryInfoPanelProps> = ({
  riderInfo,
  etaMinutes,
  order,
  lastUpdated,
  onCallRider,
  onShareLocation,
}) => {
  // Format ETA display
  const etaDisplay =
    etaMinutes === null
      ? 'Rider location not available yet'
      : etaMinutes <= 0
      ? 'Just arrived'
      : `${etaMinutes} min`;

  // Format last updated time
  const formattedLastUpdated =
    lastUpdated
      ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '–';

  // Calculate order total if not provided
  const orderTotal =
    order?.total ??
    (order?.items
      ? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      : 0);

  return (
    <div className="space-y-6">
      {/* Rider Info */}
      <div className="border rounded-xl p-4">
        <div className="flex flex-col space-y-3">
          {riderInfo?.name && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                <div className="text-xs font-medium">{riderInfo.name.charAt(0).toUpperCase()}</div>
              </div>
              <span className="font-medium">{riderInfo.name}</span>
            </div>
          )}
          {riderInfo?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <a
                href={`tel:${riderInfo.phone}`}
                className="hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  onCallRider?.(riderInfo.phone!);
                }}
              >
                {riderInfo.phone}
              </a>
            </div>
          )}
          {riderInfo?.vehicle && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                {riderInfo.vehicle
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <span className="text-accent/60">{riderInfo.vehicle}</span>
            </div>
          )}
        </div>
      </div>

      {/* ETA & Order Summary */}
      <div className="border rounded-xl p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Estimated arrival</span>
            <span className={`${etaMinutes === null ? 'text-accent/60' : 'font-black text-primary'}`}>
              {etaDisplay}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Last update</span>
            <span className="text-accent/60">{formattedLastUpdated}</span>
          </div>
          {order && (
            <>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Order total</span>
                <span className="font-bold text-primary">₹{orderTotal.toFixed(2)}</span>
              </div>
              {order.items && order.items.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="font-medium text-sm">Items:</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} ×{item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {riderInfo?.phone && (
          <button
            className="btn-secondary gap-2 flex items-center"
            onClick={(e) => {
              e.preventDefault();
              onCallRider?.(riderInfo.phone!);
            }}
          >
            <Phone className="w-4 h-4 mr-2" />
            Call rider
          </button>
        )}
        <button
          className="btn-secondary gap-2 flex items-center"
          onClick={(e) => {
            e.preventDefault();
            onShareLocation?.();
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share live location
        </button>
        <Link
          className="btn-secondary"
          to="/order-confirmation"
        >
          Receipt / payment
        </Link>
      </div>
    </div>
  );
}
