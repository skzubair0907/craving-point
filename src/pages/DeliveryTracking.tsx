import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../lib/orderApi';
import { useDeliveryTracking } from '../hooks/useDeliveryTracking';
import { DeliveryMap } from '../components/DeliveryMap2';
import { DeliveryStatusStepper } from '../components/DeliveryStatusStepper';
import { DeliveryInfoPanel } from '../components/DeliveryInfoPanel';
import { calculateDistance } from '../lib/mapUtils';
import clsx from 'clsx';

export default function DeliveryTracking() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeParams = useParams();

  // Extract credentials from route params, hash, query string, location.state, or localStorage.
  const [credentials, setCredentials] = useState<{ orderId: string; token: string } | null>( (() => {
    const hashParams = new URLSearchParams(location.hash.slice(1));
    const queryParams = new URLSearchParams(location.search);
    const routeOrderId = routeParams.orderId || '';
    const orderId = routeOrderId || hashParams.get('order') || queryParams.get('order') || '';
    const token = hashParams.get('token') || queryParams.get('token') || '';
    if (orderId && token) {
      return { orderId, token };
    }
    try {
      const saved =
        location.state?.order ||
        JSON.parse(localStorage.getItem('craving-point-last-order') || 'null');
      return {
        orderId: (saved?.orderId ?? saved?.id ?? '') as string,
        token: (saved?.trackingToken ?? '') as string,
      };
    } catch {
      return { orderId: '', token: '' };
    }
  }) );

  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep order status in sync while the customer watches this page. The rider
  // location has its own hook below; this refresh also receives status changes.
  useEffect(() => {
    let active = true;
    let pending = false;
    if (!credentials?.orderId || !credentials?.token) {
      setLoading(false);
      setError('Invalid order credentials');
      return;
    }

    setLoading(true);
    setError(null);

    const fetchOrder = async () => {
      if (pending) return;
      pending = true;
      try {
        const data = await orderApi('orderStatus', credentials!);
        if (active) {
          setOrder(data.order);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load order details. Please check your order confirmation.'
          );
          setLoading(false);
        }
      } finally {
        pending = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchOrder();
    };
    void fetchOrder();
    const timer = window.setInterval(refreshWhenVisible, 1000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [credentials?.orderId, credentials?.token]);

  // Use delivery tracking hook for real-time rider location
  const {
    error: trackingError,
    data: riderLocation,
    lastUpdated,
  } = useDeliveryTracking(credentials?.orderId ?? '', credentials?.token ?? '');

  // Only show locations received from the delivery backend. A moving fallback
  // would misrepresent a rider's actual position to the customer.
  const effectiveRiderLocation = riderLocation;

  // Calculate ETA based on rider to customer distance
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [riderInfo, setRiderInfo] = useState<{
    name?: string;
    phone?: string;
    vehicle?: string;
  }>({});

  useEffect(() => {
    if (!order || !effectiveRiderLocation) {
      setEtaMinutes(null);
      return;
    }

    const customerLoc = order.customerLocation;

    if (
      !customerLoc ||
      typeof customerLoc.lat !== 'number' ||
      typeof customerLoc.lng !== 'number'
    ) {
      setEtaMinutes(null);
      return;
    }

    const distanceToCustomer = calculateDistance(
      effectiveRiderLocation.latitude,
      effectiveRiderLocation.longitude,
      customerLoc.lat,
      customerLoc.lng
    );

    const speedMs = (15 * 1000) / 3600;
    const etaSeconds = distanceToCustomer / speedMs;
    const etaMin = Math.max(0, Math.round(etaSeconds / 60));

    setEtaMinutes(etaMin);
  }, [order, effectiveRiderLocation]);

  const liveLastUpdated = lastUpdated ?? order?.updated_at ?? new Date().toISOString();

  // Fetch rider info (optional) - placeholder for now
  useEffect(() => {
    // In a real implementation, you would fetch rider info from an API
    // For now, we'll leave it empty or mock it
    // setRiderInfo({ name: 'John Doe', phone: '9876543210', vehicle: 'Bike' });
  }, [order?.id]);
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--brand-bg)] text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-primary focus:p-4"
        >
          Skip to content
        </a>
        {/* Reuse MainLayout structure */}
        <header className="bg-[var(--brand-bg)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="flex items-center">
                    <img
                      src="/images/logo.jpg"
                      alt="Craving Point"
                      className="h-8 w-auto"
                    />
                  </Link>
                </div>
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    <Link
                      to="/"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname === '/' ? 'border-primary' : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Home
                    </Link>
                    <Link
                      to="/menu"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname.startsWith('/menu')
                          ? 'border-primary'
                          : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Menu
                    </Link>
                    <Link
                      to="/cart"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname === '/cart'
                          ? 'border-primary'
                          : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Cart
                    </Link>
                    <Link
                      to="/order-confirmation"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname === '/order-confirmation'
                          ? 'border-primary'
                          : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Receipt
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <a
                  href="#main-content"
                  className="-mr-1 flex items-center px-1 py-2 rounded-md text-sm font-medium"
                >
                  Skip to content
                </a>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-grow">
          <div className="px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-2xl px-4">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-center mb-4">
                  Loading your order...
                </h1>
                <p className="text-accent/40">
                  Please wait while we fetch your order details.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--brand-bg)] text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-primary focus:p-4"
        >
          Skip to content
        </a>
        <header className="bg-[var(--brand-bg)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="flex items-center">
                    <img
                      src="/images/logo.jpg"
                      alt="Craving Point"
                      className="h-8 w-auto"
                    />
                  </Link>
                </div>
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    <Link
                      to="/"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname === '/' ? 'border-primary' : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Home
                    </Link>
                    <Link
                      to="/menu"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname.startsWith('/menu')
                          ? 'border-primary'
                          : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Menu
                    </Link>
                    <Link
                      to="/cart"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname === '/cart'
                          ? 'border-primary'
                          : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Cart
                    </Link>
                    <Link
                      to="/order-confirmation"
                      className={clsx(
                        'border-b-2 border-transparent text-sm font-medium',
                        location.pathname === '/order-confirmation'
                          ? 'border-primary'
                          : 'text-accent/40 hover:text-white'
                      )}
                    >
                      Receipt
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <a
                  href="#main-content"
                  className="-mr-1 flex items-center px-1 py-2 rounded-md text-sm font-medium"
                >
                  Skip to content
                </a>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-grow">
          <div className="px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-2xl px-4">
              <div className="bg-white/10 rounded-xl p-6">
                <h1 className="text-2xl font-bold mb-4">Error loading order</h1>
                <p className="mb-4">{error || 'Order details are unavailable. Please open the private tracking link from your receipt.'}</p>
                <Link
                  to="/order-confirmation"
                  className="btn-primary w-full"
                >
                  Go to order confirmation
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isValidLocation = (location?: { lat?: number; lng?: number } | null) =>
    !!location && typeof location.lat === 'number' && typeof location.lng === 'number';

  const customerLoc = isValidLocation(order.customerLocation) ? order.customerLocation : null;
  const riderAtCustomer = Boolean(
    effectiveRiderLocation &&
      customerLoc &&
      calculateDistance(
        effectiveRiderLocation.latitude,
        effectiveRiderLocation.longitude,
        customerLoc.lat,
        customerLoc.lng,
      ) <= 30,
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--brand-bg)] text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-primary focus:p-4"
      >
        Skip to content
      </a>
      <header className="bg-[var(--brand-bg)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center">
                  <img
                    src="/images/logo.jpg"
                    alt="Craving Point"
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link
                    to="/"
                    className={clsx(
                      'border-b-2 border-transparent text-sm font-medium',
                      location.pathname === '/' ? 'border-primary' : 'text-accent/40 hover:text-white'
                    )}
                  >
                    Home
                  </Link>
                  <Link
                    to="/menu"
                    className={clsx(
                      'border-b-2 border-transparent text-sm font-medium',
                      location.pathname.startsWith('/menu')
                        ? 'border-primary'
                        : 'text-accent/40 hover:text-white'
                    )}
                  >
                    Menu
                  </Link>
                  <Link
                    to="/cart"
                    className={clsx(
                      'border-b-2 border-transparent text-sm font-medium',
                      location.pathname === '/cart'
                        ? 'border-primary'
                        : 'text-accent/40 hover:text-white'
                    )}
                  >
                    Cart
                  </Link>
                  <Link
                    to="/order-confirmation"
                    className={clsx(
                      'border-b-2 border-transparent text-sm font-medium',
                      location.pathname === '/order-confirmation'
                        ? 'border-primary'
                        : 'text-accent/40 hover:text-white'
                    )}
                  >
                    Receipt
                  </Link>
                </div>
              </div>
              <div className="flex items-center">
                <a
                  href="#main-content"
                  className="-mr-1 flex items-center px-1 py-2 rounded-md text-sm font-medium"
                >
                  Skip to content
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow">
        <div className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-4xl px-4">
            <div className="space-y-8">
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">Order #{order.orderNumber || order.id}</h1>
                  <p className="mt-1 text-accent/40">
                    {order.status.replace('_', ' ').toLowerCase()}
                  </p>
                </div>
                <div className="text-sm text-accent/60">
                  Updated {new Date(liveLastUpdated).toLocaleTimeString()}
                </div>
              </div>

              {/* Main Content: Map and Info */}
              <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
                {/* Map */}
                <div className="bg-white/10 rounded-xl p-4">
                  {customerLoc ? <>
                    <DeliveryMap
                      customerLocation={customerLoc}
                      riderLocation={effectiveRiderLocation
                        ? { lat: effectiveRiderLocation.latitude, lng: effectiveRiderLocation.longitude }
                        : null}
                      height="400px"
                      width="100%"
                    />
                    {riderAtCustomer && <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-200">Your delivery rider is at your saved delivery location.</p>}
                  </> : <div className="grid min-h-[400px] place-items-center rounded-lg border border-white/10 p-6 text-center"><div><h2 className="text-lg font-bold">Exact delivery location needed</h2><p className="mt-2 text-sm text-accent/70">This order was placed without shared device location. The restaurant will use the delivery address.</p></div></div>}
                </div>

                {/* Info Panel */}
                <DeliveryInfoPanel
                  riderInfo={riderInfo}
                  etaMinutes={etaMinutes}
                  order={order}
                  lastUpdated={liveLastUpdated}
                  onCallRider={(phone) => {
                    // Implement call functionality
                    window.location.href = `tel:${phone}`;
                  }}
                  onShareLocation={() => {
                    if (!credentials?.token) {
                      alert('This order is missing a tracking token, so the live link cannot be shared.');
                      return;
                    }

                    navigator.clipboard
                      .writeText(
                        `${window.location.origin}/delivery-tracking/${encodeURIComponent(order.id)}?token=${encodeURIComponent(credentials.token)}`
                      )
                      .then(() => {
                        alert('Live tracking link copied to clipboard!');
                      })
                      .catch(() => {
                        alert('Unable to copy the tracking link. Please copy it manually from the order details.');
                      });
                  }}
                />
              </div>

              {trackingError && (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Live rider location is temporarily unavailable. Your order status will continue to update.
                </p>
              )}

              {/* Order Status Stepper */}
              <div className="bg-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Order Status</h2>
                <DeliveryStatusStepper
                  currentStatus={order.status}
                  orderType={order.orderType as 'delivery' | 'pickup'}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/"
                  className="btn-secondary w-full sm:w-auto"
                >
                  Back to home
                </Link>
                <Link
                  to="/order-confirmation"
                  className="btn-primary w-full sm:w-auto"
                >
                  View receipt
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
