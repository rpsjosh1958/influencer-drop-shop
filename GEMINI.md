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
