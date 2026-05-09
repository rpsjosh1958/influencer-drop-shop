# RN to Flutter Migration Plan: Vendor System

This document outlines the strategy for migrating the **Influencer Drop Vendor System** from React Native (Expo) to Flutter, adhering to the **Achieve Flutter Architecture** and incorporating **Provider** for UI state management.

---

## 🏗️ 1. Architecture Mapping (RN vs Flutter)

| Concept | React Native (Current) | Flutter (Achieve + Provider) |
| :--- | :--- | :--- |
| **State Manager** | React Context (VendorContext) + TanStack Query | **GetIt** (Services) + **Provider** (UI State) |
| **Data Fetching** | Firebase JS SDK + TanStack Query | `firebase_firestore` + **RepositoryMixin** (Caching) |
| **Lifecycle** | `useEffect` / `useMountEffect` | **DataPage** (`onLoad`, `onRefresh`) |
| **Navigation** | Expo Router (File-based) | **GoRouter** (Named routes, Dual routers) |
| **Styling** | NativeWind (Tailwind CSS) | Flutter Theme + Custom Design Tokens |
| **Auth** | Firebase Auth Hook | `AuthRepository` + `AppStateManager` (Provider) |

---

## 📂 2. Project Structure

```text
lib/
├── core/
│   ├── models/            # @JsonSerializable + Equatable
│   │   ├── store.dart
│   │   ├── product.dart
│   │   └── order.dart
│   ├── theme/             # Design system (colors, spacing)
│   └── constants/         # Env keys (Firebase Config)
├── services/
│   ├── injection.dart     # GetIt Setup
│   ├── firebase_service.dart
│   └── event_bus/         # PageReloaded, AppStateChanged
├── features/              # Feature-specific logic
│   ├── vendor/
│   │   ├── repositories/  # Abstract + Implementation (Mixin)
│   │   └── providers/     # ChangeNotifier for complex UI state
│   ├── products/
│   └── auth/
├── ui/
│   ├── pages/
│   │   └── vendor/        # Screens extending DataPage
│   └── widgets/           # Components listening to PageReloaded
└── router/                # Guest vs User Routers (GoRouter)
```

---

## 🔧 3. Implementation Plan

### Phase 1: Core Setup (The Foundation)
1. **Firebase Configuration**:
   - Initialize `Firebase.initializeApp()` in `main.dart`.
   - Setup `env` variables using `flutter_dotenv` or `Platform.environment` for API keys.
2. **Architecture Primitives**:
   - Implement `RepositoryMixin` for caching (Persistent, Secure, Ephemeral).
   - Setup `GetIt` (Service Locator) in `injection.dart`.
   - Implement `DataPage` and `OperationRunnerState` for standard screen behavior.
3. **Authentication Layer**:
   - Migrate `AuthRepository` (Firestore user doc + Firebase Auth).
   - Setup `AppStateManager` (using Provider) to switch between `GuestRouter` and `UserRouter`.

### Phase 2: Vendor State & Multi-Store Logic
1. **VendorRepository**:
   - Migrate logic from `vendor-context.tsx` to `VendorRepositoryImpl`.
   - Implement `switchStore(id)` using `PersistentQuery` to save the active store ID.
   - Implement "Lock Logic" for Starter plan users (preventing multi-store access).
2. **VendorProvider (ChangeNotifier)**:
   - Use Provider to hold the `activeStore` and `metrics`.
   - Repositories handle data, but Provider notifies UI of reactive changes (e.g., store status toggle).

### Phase 3: Feature Migration (Screen by Screen)
1. **Inventory Page (`inventory.tsx`)**:
   - Create `ProductRepository` and `ServiceRepository`.
   - Screen extends `DataPage<InventoryPage>`.
   - `onLoad`: `products = await productRepo.getProducts(storeId)`.
   - Implement Search/Filter in the UI layer (filtered via computed fields in Provider).
2. **Orders & Metrics**:
   - Migrate `OrderRepository`.
   - Use `DataPage` for the list and `PageReloaded` for real-time status updates.
3. **Store Management**:
   - Migrate `toggleStoreStatus` as a `runOperation` to show the `OverlayManager` spinner.

---

## 📊 4. Data Modeling & Firebase Schema

### Core Models (Dart)
| Model | Key Fields |
| :--- | :--- |
| **Store** | `id`, `name`, `plan`, `status` (live/maintenance), `ownerId`, `createdAt`, `isLocked` (computed) |
| **Product** | `id`, `name`, `price`, `stock`, `images` (List), `imageUrl`, `category`, `createdAt` |
| **Service** | `id`, `name`, `duration`, `price`, `status` (active/inactive), `createdAt` |
| **Order** | `id`, `total`, `status`, `items` (List), `createdAt`, `customerId` |

### Firestore Collection Mapping
*   **Users**: `users/{uid}` (contains `plan`, `ownedStores` list)
*   **Stores**: `stores/{storeId}`
*   **Products**: `stores/{storeId}/products/{productId}`
*   **Services**: `stores/{storeId}/services/{serviceId}`
*   **Orders**: `stores/{storeId}/orders/{orderId}`
*   **Complaints**: `stores/{storeId}/complaints/{complaintId}`

---

## 🧠 5. Logic Migration

### Multi-Store "Locking" Logic
In Flutter, the `VendorRepository` will handle this in its `fetchOwnedStores` method:
```dart
// logic to emulate from vendor-context.tsx
final stores = await firestore.getStoresByOwner(uid);
return stores.asMap().entries.map((entry) {
  final index = entry.key;
  final store = entry.value;
  return store.copyWith(
    isLocked: userPlan == 'starter' && index > 0
  );
}).toList();
```

### Metrics Calculation
The `VendorProvider` (ChangeNotifier) will derive these reactive metrics whenever orders or products update:
*   **Revenue**: Sum of `total` for orders with status: `paid`, `shipped`, `delivered`, etc.
*   **Low Stock**: Count of products where `stock > 0 && stock <= 5`.
*   **Badges**: Unread complaints, pending bookings, and "processing" orders.

---

## 🚀 6. Project Bootstrap Commands

1. **Create Directory**: `mkdir -p ~/Documents/PERSONAL\ PROJECT/commerce/influencer-drop-flutter`
2. **Initialize Flutter**: `flutter create --org com.influencerdrop.vendor drop_vendor`
3. **Add Base Dependencies**:
   ```bash
   flutter pub add firebase_core firebase_auth cloud_firestore provider get_it go_router equatable json_annotation focus_detector flutter_svg google_fonts
   flutter pub add dev:build_runner dev:json_serializable
   ```

---

## 💡 7. Reference Check: Newbie Pattern
The reference project at `/Users/joshtetteh/agent_application` uses a clean `providers/models/screens` split. We will maintain this simplicity but "harden" it with the **Achieve Architecture's** `Repository` layer. This ensures that even as a "newbie," the codebase is production-ready, testable, and handles errors gracefully without manual `try/catch` in every widget.
