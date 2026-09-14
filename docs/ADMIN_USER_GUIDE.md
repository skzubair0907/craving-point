# Craving Point Admin User Guide

## Purpose

Use the admin portal to receive customer orders, keep customers updated, manage the menu, and run day-to-day restaurant operations.

## Sign in

1. Open `https://cravingpoint.netlify.app/admin/login`.
2. Enter the staff email and password created in Supabase Authentication.
3. Select **Sign in**.

Only approved staff accounts can access the admin portal. Do not share passwords or leave an admin session open on a shared device.

## Order workflow

Open **Orders** after signing in. Each order should move through this workflow:

```text
Placed → Confirmed → Preparing → Ready → Out for delivery → Delivered
```

For pickup orders, use **Picked up** after the customer collects the food.

### How to process an order

1. Open the new order and check the items, quantity, address, phone number, payment method, and notes.
2. Confirm the order only when the kitchen can accept it.
3. Change the status to **Preparing** when cooking begins.
4. Change it to **Ready** when packing is complete.
5. For delivery, assign/notify the rider and change it to **Out for delivery**.
6. Mark it **Delivered** only after the customer receives it.

Use **Cancelled** only when the restaurant cannot fulfil the order. Add a clear reason where the portal requests one.

## Delivery dispatch

Open **Delivery dispatch** to handle delivery orders.

- Search by customer name, order number, phone number, or address.
- Use **Call customer** for delivery questions.
- Use **Open address in Maps** for navigation.
- Use **Dispatch order** only after a rider has the packed order.
- Mark the order **Delivered** after confirmation from the rider or customer.

### Live rider location

The customer tracking page can show a rider location only after an authorized staff/rider process sends coordinates through the delivery-tracking integration. Never enter a false rider location. If no coordinate is available, keep the order status updated instead.

## Menu and availability

Open **Menu** or **Catalog** to manage food items.

Before publishing a change, check:

- Item name and description
- Correct price and size variants
- Product photo
- Category
- Availability status
- Stock quantity, if the item is inventory-managed

Mark unavailable items out of stock immediately. Do not delete an item that still appears in active orders; hide or disable it instead.

## Offers and coupons

Open **Offers** or **Coupons** to create and update promotions.

For every offer, check:

- Start and expiry date
- Discount amount or percentage
- Minimum order amount
- Eligible menu items
- Coupon spelling

Test a coupon in the customer cart before announcing it publicly.

## Cash and payment checks

- For cash on delivery, collect the amount shown in the order and record cash collection when the portal provides that action.
- For online orders, do not mark an order paid manually unless the payment status confirms it.
- If a payment is uncertain, keep the order open and contact the customer or manager before preparing it.

## Reports and reviews

Use **Reports** to review sales, order totals, payment status, and operations. Use **Reviews** to approve genuine customer feedback and hide inappropriate content.

## If something goes wrong

| Problem | Action |
| --- | --- |
| Customer cannot see order status | Confirm the order number and status in Admin, then ask the customer to open their confirmation link again. |
| Order does not appear | Refresh the orders page. If it still does not appear, check Supabase connection and contact the system owner. |
| Wrong menu price | Pause the item, correct the price, publish, then contact affected customers before fulfilment. |
| Delivery address is unclear | Call the customer before dispatching. |
| Admin cannot sign in | Use **Forgot password**. If that fails, ask the Super Admin to check staff access. |
| Website cannot place orders | Do not promise a saved order. Ask the customer to call or WhatsApp the restaurant while the owner checks the system. |

## Daily checklist

1. Check new orders when the restaurant opens.
2. Verify item availability and stock.
3. Keep each order status current.
4. Review cancelled orders and customer notes.
5. Check cash collection and online payment status.
6. Sign out at the end of the shift.

## Security rules

- Never share the Supabase secret key, Netlify credentials, or staff passwords.
- Give each staff member their own account.
- Remove access immediately when a staff member leaves.
- Use a strong password of at least 12 characters.
- Keep the customer address and phone number private; use them only to fulfil the order.
