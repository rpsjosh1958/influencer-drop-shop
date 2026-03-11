# Influencer Drop Project Context

## Project Architecture

Multi-repo/Monorepo structure containing mobile, web, and serverless backend components.

- **Mobile (`apps/mobile`):** Expo / React Native (TypeScript)
  - **Styling:** NativeWind (Tailwind CSS for React Native)
  - **Navigation:** Expo Router
  - **State/Context:** React Context API (Cart, Store, Auth, etc.)
- **Web (`apps/web`):** Next.js (TypeScript)
  - **Styling:** Tailwind CSS
- **Backend (`functions`):** Firebase Cloud Functions (TypeScript)
  - **Integrations:** Paystack (Payments)
  - **Database:** Firestore
  - **Auth:** Firebase Auth

## Conventions & Standards

- Use TypeScript for all new code.
- Follow existing patterns for Context providers and Hooks.
- Prefer functional components and hooks.
- Mobile styling should use NativeWind classes where possible.

## Key Files & Locations

- **Firestore Rules:** `firestore.rules`
- **Firebase Config:** `apps/mobile/lib/firebase.ts`
- **Mobile Routes:** `apps/mobile/app/`
- **Vendor Logic:** `apps/mobile/app/(vendor)/`
- **Functions Source:** `functions/src/`

## Development Workflow

### Mobile (Expo)

- **Start:** `cd apps/mobile && npm run start`
- **Debug:** Press `j` in terminal for debugger, or use `Cmd+D`/`Ctrl+M` in emulator for inspector.

### Web (Next.js)

- **Start:** `cd apps/web && npm run dev`
- **Debug:** Use Browser DevTools and terminal for SSR logs.

### Backend (Firebase Functions)

- **Start/Emulate:** `cd functions && npm run serve`
- **Local Testing:** `cd functions && npm run shell`
- **Logs:** `firebase functions:log`

## Notification Broadcast Analysis

### Mechanism

1. **Trigger:** A document is added to `notifications/` with `userId: "all"` (via Admin Modal or AI Tool).
2. **Function:** `onNotificationCreated` in `functions/src/index.ts` triggers.
3. **Broadcast:** It fetches all users from Firestore, chunks their `expoPushToken`s, and sends them via `expo-server-sdk`.
4. **App Receipt:**
   - **System Push:** Handled by OS/Expo.
   - **In-App Banner:** `NotificationProvider` (via Firestore `onSnapshot`) updates `latestNotification`, which `InAppNotificationBanner` displays.

### Potential Issues for Duplicates (FIXED)

- **Foreground Alerting:** Set `shouldShowBanner: false` in `NotificationProvider` to ensure only the custom in-app banner shows when the app is open.
- **Duplicate Tokens:** `onNotificationCreated` now de-duplicates `expoPushToken`s using a `Set` to prevent multiple system notifications if a token is linked to multiple users.
- **Listener Cleanup:** Refactored `useEffect` in `NotificationProvider` to ensure listeners are correctly removed and not duplicated.

## Image Upload Policy

- **Limit:** All storefront image uploads (Products, Services, Logo, Hero Background) are limited to **2MB** per image.
- **Indicators:** UI components include helper text ("Max 2MB per image") and validation alerts to inform users of the limit.
- **Implementation:**
  - `ImageUpload.tsx`: Default `maxSizeMB` set to 2.
  - `ProductForm.tsx`: Custom validation and indicator added for gallery uploads.

## Subscription & Plan Logic

- **New Vendors:** Automatically enrolled in a **30-Day Free Trial** of the **Growth Plan** via `onStoreCreated` Firebase Function.
- **Expiry:** `checkSubscriptionExpiry` runs every 24 hours. It downgrades stores with `planExpiresAt < now` to the `starter` plan and removes the `isVerified` status.
- **Admin UI:** The Settings > Billing tab displays the remaining days for the Growth plan.
- **Security Rules:** (TODO) Future reinforcement of `firestore.rules` to strictly block service/hybrid features for `starter` plan users.

## AI Chatbot Capabilities

The admin system includes an AI Assistant (`apps/web/src/app/api/chat/route.ts`) that can perform various tasks via natural language.

### Current Tools:

- **Products:** List, update (price/stock), delete, batch update (discounts).
- **Services:** List bookable services, update price/duration/status.
- **Bookings:** View recent bookings, update booking status (confirm/cancel).
- **Categories:** Add/delete product categories.
- **Orders:** List recent orders, update order status.
- **Customers:** Search for customer details and order history.
- **Store Management:** Update store name, set store status (Live/Closed), update store schedule.
- **Broadcast:** Send push notification broadcasts to all users.
- **Support:** Get and update support tickets/complaints.
- **Insights:** Get financial analytics and top-selling product data.

## AI Assistant: Sample Commands

Use these natural language prompts to test the new chatbot capabilities:

### 💼 Services & Bookings

- "Show me all the services I offer."
- "Change the price of 'Full Set Gel Nails' to 150."
- "Disable the 'Basic Haircut' service for now."
- "Do I have any pending bookings for this week?"
- "Confirm the booking for Josh Tetteh."

### 📈 Strategy & Analytics

- "What are my top 5 selling products lately?"
- "Which items are bringing in the most revenue?"
- "Find the contact details for a customer named Sarah."
- "How much has user@example.com spent in my store so far?"

### 🕒 Store Schedule

- "Close the store on Sundays."
- "Set my Saturday hours from 10:00 to 14:00."
- "Open the store on Mondays from 08:00 to 20:00."

## 🚀 Web Admin Onboarding Tutorial Plan

### Mechanism

- **Highlighting:** Uses a dimmed SVG overlay with a cut-out "hole" around the target element.
- **Dialogue Box:** A floating `motion.div` from `framer-motion` positioned relative to the highlighted element.
- **Controls:** "Prev", "Next", and "Exit Tour" buttons to navigate steps within a category.
- **Persistence:** Uses Firestore `seenAdminTutorials` (per user doc) keyed by category string. Guides auto-fire once per category on first visit, then only via manual trigger.
- **Manual Trigger:** A `<HelpTrigger category="..." />` (`HelpCircle` icon) is placed inline in each page's `<h1>` title to replay any guide at any time.
- **Category Isolation:** Next/Prev navigation is scoped to the current category — navigating across categories is disabled.

### Pages & Guide Steps

| Page         | Category Key   | Store Type     | Steps |
| ------------ | -------------- | -------------- | ----- |
| Sidebar      | `sidebar`      | All            | 4     |
| Dashboard    | `dashboard`    | All            | 6     |
| Products     | `products`     | All            | 3     |
| Settings     | `settings`     | All            | 2     |
| Settings Pro | `settings-pro` | All            | 2     |
| Orders       | `orders`       | All            | 4     |
| Categories   | `categories`   | Product/Hybrid | 2     |
| Finance      | `finance`      | All            | 4     |
| Support      | `support`      | All            | 2     |
| Complaints   | `complaints`   | All            | 3     |
| Services     | `services`     | Service/Hybrid | 2     |
| Bookings     | `bookings`     | Service/Hybrid | 3     |
| Schedule     | `schedule`     | Service/Hybrid | 3     |

#### 1. Sidebar (`sidebar`)

- **Store Identity:** "This is your brand's identity on DROP. All your settings, products, and analytics are tied to this store profile."
- **Navigation Menu:** "The central hub for your management tools. Each menu here is designed to help you run a specific part of your business."
- **Broadcast Tool:** "Need to announce a new drop or flash sale? Send instant push notifications to all your customers directly from here."
- **Sidebar Toggle:** "Collapse the sidebar for more screen space or expand it to see full menu labels."

#### 2. Dashboard (`dashboard` — `/admin/dashboard`)

- **Store Status:** "Toggle this to open or close your store. When 'CLOSED', your store is nott visible to customers and you are allowed to edit products and services."
- **Date/Month Filter:** "Analyze your performance over specific periods. Perfect for tracking monthly growth or reviewing holiday sales spikes."
- **Revenue & Orders Overview:** "Your financial pulse. These cards show your total earnings and order volume for the selected time range."
- **Store Performance:** "Click here for 'Store Performance'—a deep dive into sales trends, top-selling items, and customer behavior."
- **Live Order Feed:** "This real-time feed displays new orders and customer activity the moment it happens."
- **Inventory Status Summary:** "Monitor your stock levels at a glance. Items with low stock are highlighted so you can restock before they sell out."

#### 3. Products (`products` — `/admin/products`)

- **Add Product Button:** "Ready for a new drop? Click here to create a new product listing with images, pricing, and stock details."
- **Bulk Actions:** "Select multiple products to perform batch updates, delete items, or generate promotional images for your entire collection."
- **Inventory Table:** "Manage your items here. Toggle visibility (Live/Hidden), edit details, and track real-time stock levels."

#### 4. Settings (`settings` + `settings-pro` — `/admin/settings`)

- **Settings Tabs:** "Navigate between General details, Style preferences, Billing, and Payout settings to fully customize your store."
- **Store Type Configuration:** "Tell us what you sell. Choose 'Products' for physical goods, 'Services' for appointments, or 'Hybrid' for both."
- **Billing & Growth Plan:** (settings-pro) "Manage your subscription. Upgrade to the 'Growth' plan for a Verified Badge, lower transaction fees, and advanced styling options."
- **Payout Settings:** (settings-pro) "Crucial Step: Link your Mobile Money account (MTN, Telecel, AirtelTigo) here to receive your earnings automatically."

#### 5. Orders (`orders` — `/admin/orders`)

- **Order Management:** "This is your orders command center. Use the search, status filters, and date range to quickly find any transaction."
- **Status Filters:** "Filter orders by their fulfilment stage — from Open/Paid all the way to Delivered. Stay on top of every shipment."
- **Export PDF:** "Download paginated, filtered, or all orders as a PDF report — perfect for your accounting records."
- **Order Feed:** "Click any order row to open a detailed view, update its status, or view customer shipping information."

#### 6. Categories (`categories` — `/admin/categories`)

- **Add Category:** "Create product categories like 'Streetwear' or 'Accessories' to help customers browse your store more easily."
- **Your Categories:** "All your store's categories live here. Hover over one to reveal the delete button. Categories are used to filter products in your shop."

#### 7. Finance (`finance` — `/admin/finance`)

- **Withdraw Funds:** "Cash out your available balance directly to your linked Mobile Money account. Minimum withdrawal is GHS 10."
- **Monthly Statements:** "Download PDF or Excel reports for any month. Great for bookkeeping and tax records."
- **Your Wallet:** "Three key numbers: Available Balance (withdrawable now), Pending (clearing in 48h on Starter plan), and Total Earned all time. If you see two don't fret, the Pending is for the Free plan."
- **Transaction History:** "Every order credit and withdrawal appears here so you always know exactly where your money came from."

#### 8. Support (`support` — `/admin/support`)

- **New Support Ticket:** "Experiencing an issue? Submit a support ticket to the DROP platform team. Include as much detail as possible for a faster resolution."
- **Your Tickets:** "All your open and resolved tickets live here. The platform team will respond via email. Check back for status updates."

#### 9. Complaints (`complaints` — `/admin/complaints`)

- **Complaint Filters:** "Filter your inbox by Unread, In Progress, or Resolved to focus on what needs your attention most."
- **Complaint Inbox:** "Customer complaints appear here in real time. Click any complaint to read the full message and take action."
- **Reply & Resolve:** "Use 'Reply via Email' to respond directly to the customer, then mark the complaint as Resolved to close the ticket."

#### 10. Services (`services` — `/admin/services` — Service/Hybrid only)

- **Add Service:** "Create a new bookable service with a name, description, duration, price, and a cover image."
- **Your Services:** "Each card shows the service's status. Toggle Active/Inactive to instantly enable or disable booking availability for your customers."

#### 11. Bookings (`bookings` — `/admin/bookings` — Service/Hybrid only)

- **Calendar vs List View:** "Switch between a calendar to see your week at a glance, or a list view to manage all bookings in a sortable table."
- **Booking Calendar:** "Days with bookings show blue dots. Click any date to see all scheduled appointments and their current status."
- **Day Detail Panel:** "Appointments for the selected date appear here. Click any booking to confirm, complete, cancel, or mark a no-show."

#### 12. Schedule (`schedule` — `/admin/schedule` — Service/Hybrid only)

- **Working Hours:** "Toggle each day on or off, then define one or more time slots. This sets when customers can book your services."
- **Blocked Dates:** "Select specific dates you're unavailable — holidays, vacations, or personal days. Customers won't be able to book on blocked dates."
- **Cancellation Window:** "Set how many hours before an appointment customers can cancel. This protects your business from last-minute no-shows."
