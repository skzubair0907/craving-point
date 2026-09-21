# Order and delivery flow

Run `supabase/order-delivery-workflow.sql` after the checkout and delivery-partner scripts. It prevents an order from being sent out without an active assigned rider.

## Customer

1. Customer adds menu items and checks out with delivery or pickup.
2. The app creates an order with status `placed` after payment is accepted, or after cash-on-delivery is submitted.
3. The customer receives an order number and tracking link.
4. The tracking page shows each status update and, once a rider starts sharing GPS, the rider location.

## Restaurant admin

1. A new order appears in **Admin → Orders** and triggers the enabled order sound.
2. Admin progresses the kitchen stages: `placed` → `confirmed` → `preparing` → `ready`.
3. For a delivery, admin opens the ready order, selects **Assign rider**, chooses an active rider, and saves.
4. The system prevents `out_for_delivery` until that rider assignment exists.
5. Admin can see the rider's live location and customer tracking map after the rider starts the delivery.

## Delivery partner

1. The rider signs in at `/delivery-partner` with the Google email saved by the admin in **Delivery team**.
2. The rider sees only orders assigned to their own account.
3. The rider presses **Start delivery**. This changes the status to `out_for_delivery`.
4. The rider presses **Start live location** and allows phone GPS permission.
5. The rider marks the order `delivered` only after starting the delivery.

## Status rules

| Order type | Valid journey |
| --- | --- |
| Delivery | `placed` → `confirmed` → `preparing` → `ready` → rider assigned → `out_for_delivery` → `delivered` |
| Pickup | `placed` → `confirmed` → `preparing` → `ready` → `picked_up` |

Online-payment orders cannot advance before payment confirmation. Cancelled, delivered, and picked-up orders are closed. Each status update is added to the order history and shown in customer tracking.
# Rider lifecycle setup

Run `supabase/delivery-rider-lifecycle.sql` in the Supabase SQL Editor after
the existing checkout, delivery portal, and delivery verification scripts. It
adds the server-verified handoff: rider assigned, accepted, picked up, on the
way, arrived, then OTP-confirmed delivery.
