"use client";

import { useState, useRef, useEffect } from "react";
import { useAdminStore } from "./admin-store-provider";
import { 
  ChevronDown, 
  Plus, 
  Check, 
  Store, 
  Lock, 
  BadgeCheck,
  AlertCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Portal } from "@/components/ui/portal";
import { useRouter } from "next/navigation";
import { 
  doc, 
  getDoc,
  setDoc, 
  collection, 
  serverTimestamp, 
  arrayUnion, 
  updateDoc 
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export function StoreSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { 
    storeId, 
    storeName, 
    userPlan, 
    ownedStores, 
    switchStore 
  } = useAdminStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = (id: string, isLocked: boolean) => {
    // Downgrade Policy: If locked, redirect to billing
    if (isLocked) {
      setIsOpen(false);
      router.push("/admin/settings?tab=billing");
      return;
    }
    
    switchStore(id);
    setIsOpen(false);
  };

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
          <Store size={22} className="text-zinc-600 dark:text-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between h-12 px-3 rounded-2xl border transition-all duration-200",
          isOpen 
            ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-lg" 
            : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center flex-shrink-0">
            <Store size={16} className="text-white dark:text-zinc-900" />
          </div>
          <div className="text-left overflow-hidden">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold truncate">
                {storeName || "Select Store"}
              </span>
              {userPlan === "growth" && (
                <BadgeCheck size={12} className="text-blue-500 fill-blue-500/10" />
              )}
            </div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
              {userPlan === "growth" ? "Growth" : "Starter"}
            </p>
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={cn("text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute left-0 right-0 w-full z-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-2"
          >
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Your Stores</p>
              
              {ownedStores.map((item) => {
                const isSelected = item.id === storeId;
                const isLocked = item.isLocked;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSwitch(item.id, !!isLocked)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl mb-1 transition-colors group text-left",
                      isSelected 
                        ? "bg-zinc-100 dark:bg-zinc-800" 
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-zinc-900 dark:bg-white" : "bg-zinc-100 dark:bg-zinc-800"
                      )}>
                        <Store size={14} className={isSelected ? "text-white dark:text-zinc-900" : "text-zinc-500"} />
                      </div>
                      <div>
                        <span className={cn(
                          "text-sm font-bold block",
                          isLocked && "text-zinc-400"
                        )}>
                          {item.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">
                          {item.plan === "growth" ? "Growth" : "Starter"}
                        </span>
                      </div>
                    </div>
                    
                    {isLocked ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter bg-zinc-100 px-1.5 py-0.5 rounded">Locked</span>
                        <Lock size={12} className="text-zinc-400" />
                      </div>
                    ) : isSelected && (
                      <Check size={16} className="text-zinc-900 dark:text-white" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                disabled={userPlan !== "growth"}
                onClick={() => {
                  setIsOpen(false);
                  setShowAddModal(true);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                  userPlan === "growth" 
                    ? "text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-bold" 
                    : "text-zinc-400 cursor-not-allowed grayscale"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <div className="text-left">
                  <span className="text-sm">Add New Store</span>
                  {userPlan !== "growth" && (
                    <p className="text-[9px] uppercase font-black text-purple-500">Upgrade to unlock</p>
                  )}
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddStoreModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  );
}

function AddStoreModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState("");
  const [category, setCategory] = useState("Fashion");
  const [storeType, setStoreType] = useState("product");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !storeId) return;
    
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const slug = storeId.toLowerCase().trim();
      const idRef = doc(db, "stores", slug);
      const idSnap = await getDoc(idRef);
      
      if (idSnap.exists()) {
        setError("Store ID is already taken. Try another.");
        setLoading(false);
        return;
      }

      // Derive features from store type
      const features = {
        hasProducts: storeType === "product" || storeType === "hybrid",
        hasServices: storeType === "service" || storeType === "hybrid",
        hasPreorders: storeType === "hybrid",
      };

      // Create Store
      await setDoc(idRef, {
        name: storeName,
        ownerId: user.uid,
        status: "live",
        plan: "starter", // onStoreCreated will upgrade to trial/inherit user plan
        type: storeType,
        category,
        createdAt: serverTimestamp(),
        slug: slug,
        features,
        theme: {
          primaryColor: "#000000",
          heroText: `WELCOME TO ${storeName.toUpperCase()}`,
          footerText: `© 2026 ${storeName}`,
        },
      });

      // Update User
      await updateDoc(doc(db, "users", user.uid), {
        ownedStores: arrayUnion(slug)
      });

      onClose();
      // Reset form
      setStoreName("");
      setStoreId("");
      setCategory("Fashion");
      setStoreType("product");
      
      alert("Store created successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create store");
    } finally {
      setLoading(false);
    }
  };

  const labelClasses = "text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block";
  const inputClasses = "w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm font-medium";

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10"
            >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Launch New Drop</h3>
                <p className="text-xs text-zinc-500 font-medium">Create another store on your account.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClasses}>Store Name</label>
                  <input 
                    placeholder="e.g. Vintage Vault"
                    value={storeName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setStoreName(e.target.value);
                      setStoreId(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                    }}
                    required
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClasses}>Category</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputClasses}
                    >
                      <option value="Fashion">Fashion & Apparel</option>
                      <option value="Beauty">Beauty & Cosmetics</option>
                      <option value="Art">Art & Digital</option>
                      <option value="Food">Food & Beverage</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClasses}>Store Type</label>
                    <select 
                      value={storeType} 
                      onChange={(e) => setStoreType(e.target.value)}
                      className={inputClasses}
                    >
                      <option value="product">Products Only</option>
                      <option value="service">Services Only</option>
                      <option value="hybrid">Hybrid (Both)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Store URL</label>
                  <div className="relative">
                    <input 
                      placeholder="vintage-vault"
                      value={storeId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStoreId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      required
                      className={cn(inputClasses, "pr-24")}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-zinc-400">
                      .copdrop.io
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400">This will be your unique store URL.</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-3 rounded-xl flex items-center gap-3">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Launch Store"}
                </button>
              </div>
            </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
