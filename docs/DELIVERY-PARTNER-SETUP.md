# Delivery Partner Portal setup

The delivery rider uses their own phone at `/delivery-partner`. They never use the restaurant admin account.

1. In Supabase **SQL Editor**, run `supabase/delivery-partner-portal.sql` once. This links a rider account to `delivery_staff` and permits that rider to send location only for their assigned orders.
2. Ask each rider to open `/delivery-partner` on their own phone and choose **Continue with Google** once.
3. In Supabase **Authentication → Users**, copy that rider’s user ID. In Admin → Delivery, add or edit the rider and paste it in **Authentication user ID**.
4. In an order’s **Details, notes & delivery** section, select that rider and save. When the order is ready, the rider sees it in their portal.
5. The rider taps **Start delivery**, then **Share live location**. Their GPS is written to the assigned order; the customer tracking page updates automatically. The rider taps **Mark delivered** at the destination.

## Delivery OTP and rider earnings

Run `supabase/delivery-trust-and-earnings.sql` after the earlier delivery-partner migration. When a rider starts a delivery, the customer’s private tracking page displays a four-digit code. The rider asks for that code at the door and enters it before the delivery can be completed. The rider portal also shows completed deliveries, delivery-fee earnings, and cash-on-delivery collected.

The **WhatsApp customer** button prepares a status message in the rider’s WhatsApp app. Automated WhatsApp messages require a separate approved WhatsApp Business API account; this application does not send messages without that account.

Only the assigned rider can view the customer’s phone/address and publish their live location. The admin can still dispatch or correct an order when needed.
