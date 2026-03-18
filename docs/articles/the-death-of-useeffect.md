# I Stopped Using useEffect for Data Fetching, and My React App Finally Feels "Alive"

### 🚀 The Journey of Hardening a Multi-Platform Marketplace

We’ve all been there. You start a React project, and `useEffect` feels like the Swiss Army Knife of hooks. Need to fetch data? `useEffect`. Need to sync state? `useEffect`. Need to update local storage? `useEffect`.

But as my project, **Influencer Drop**, grew across Mobile (Expo) and Web (Next.js), that Swiss Army Knife started feeling more like a ticking time bomb.

After seeing the "Don't use useEffect" movement trending on X and deep-diving into the React docs' "You Might Not Need an Effect" section, I decided to perform a radical refactor.

Here is how I deleted dozens of `useEffect` hooks and what happened to my app’s performance and stability.

---

## 1. The Problem: "Effect Hell" 🌪️

Before the refactor, my `VendorContext` and Admin pages were a mess of:
- **Manual loading states:** `const [loading, setLoading] = useState(true);`
- **Race conditions:** If a user switched tabs quickly, the wrong data might resolve.
- **Double-renders:** React 18’s Strict Mode would fire the effect twice, leading to double API calls.
- **Fragile dependency arrays:** Forgetting one variable led to stale data; adding too many led to infinite loops.

## 2. The Solution: The "Hardening" Stack 🛠️

I moved to a three-pillar architecture:
1. **TanStack Query (React Query):** For all server state (Firestore).
2. **Derived State:** Computing values inline or via `useMemo` instead of syncing state-to-state.
3. **Event-Driven Side Effects:** Moving logic (like updating LocalStorage or Firebase) directly into `onPress` or `onClick` handlers.

---

## 3. Real-World Refactors

### A. Data Fetching (Web Admin)
**Before:** Manual `onSnapshot` inside a `useEffect`. It felt "real-time" but was expensive and hard to cache.
**After:** Moved to `useQuery`. Now, when I navigate from **Products** to **Orders** and back, the data is **instantly there** from the cache. No more "Loading..." flickers.

### B. Cart Persistence (Mobile)
**Before:** A `useEffect` watched the `items` array and saved to `AsyncStorage` whenever it changed.
**After:** I moved the storage logic into the `addToCart` and `removeFromCart` functions. 
**Why?** The effect was reactive and "magical," but the event handler is **explicit and predictable**. I know exactly when the disk is being written to.

### C. Complex Forms (Product Variants)
**Before:** An effect automatically generated 20+ variants when a user typed a price. It was slow and prone to overwriting user edits.
**After:** I added a "Sync Inventory" button. 
**Lesson:** Complex synchronization should often be **user-initiated**, not automatic. It puts the user in control.

---

## 4. The Results: Optimization & DX 📈

- **Speed:** Navigation feels native. Because TanStack Query caches data, the UI responds before the network even starts.
- **Code Deletion:** I removed hundreds of lines of boilerplate (`isLoading`, `isError`, `data`, `useEffect` cleanup).
- **Stability:** Race conditions are gone. TanStack Query handles the "ignore old requests" logic out of the box.
- **Debugging:** Using the TanStack DevTools, I can see exactly what data is stale and why.

## 5. My Advice for Your Next Project 💡

If you want to optimize your app and save your sanity, follow these rules:

1. **Fetch with Query:** Never `useEffect` + `fetch`. Use TanStack Query or SWR.
2. **Don't Sync, Derive:** If you have `firstName` and `lastName`, don't use an effect to set `fullName`. Just do `const fullName = firstName + ' ' + lastName;` in the component body.
3. **Effects are for Synchronization, not Logic:** Only use `useEffect` when you need to talk to an **external system** (like a Browser API or a Map library) that isn't controlled by React.
4. **Mutate and Invalidate:** Use `useMutation` for writes, and simply call `queryClient.invalidateQueries` to refresh the UI.

---

### Final Thoughts
Killing `useEffect` isn't just about following a trend; it's about moving from **imperative "how"** to **declarative "what."** My app is faster, my tests are easier to write, and I no longer fear the dependency array.

**Stop syncing. Start deriving.**

#ReactJS #WebDev #Expo #TanStackQuery #SoftwareEngineering
