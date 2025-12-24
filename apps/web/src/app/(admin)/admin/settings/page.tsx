"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import {
  Loader2,
  Save,
  Store,
  Type,
  LayoutTemplate,
  Palette,
  Image as ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/admin/image-upload";
import { FontPicker } from "@/components/admin/font-picker";

const TABS = [
  { id: "general", label: "General", icon: Store },
  { id: "style", label: "Style", icon: Palette },
  { id: "hero", label: "Hero Section", icon: LayoutTemplate },
  { id: "footer", label: "Footer", icon: LinkIcon },
];

export default function StoreSettingsPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  // State
  const [config, setConfig] = useState<any>({
    name: "",
    status: "maintenance",
    logo: "",
    theme: {
      // Style
      backgroundColor: "#ffffff",
      primaryColor: "#000000",
      fontFamily: "Inter",
      cardSize: "medium",

      // Hero
      hero: {
        enabled: true,
        layout: "center", // center, left, right
        headline: "",
        subheadline: "",
        headlineColor: "#000000",
        headlineFont: "Inter",
        subheadlineFont: "Inter",
        backgroundType: "color", // color, image
        backgroundColor: "#f4f4f5",
        backgroundImages: [], // array of strings
        overlayOpacity: 0,
      },

      // Footer
      footer: {
        enabled: true,
        text: "",
        socials: {
          instagram: "",
          twitter: "",
          tiktok: "",
        },
        contact: {
          email: "",
          address: "",
        },
      },
    },
  });

  useEffect(() => {
    if (!storeId) return;
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "stores", storeId));
        if (snap.exists()) {
          const data = snap.data();
          // Merge with defaults
          setConfig((prev: any) => ({
            ...prev,
            ...data,
            theme: {
              ...prev.theme,
              ...data.theme,
              hero: { ...prev.theme.hero, ...data.theme?.hero },
              footer: { ...prev.theme.footer, ...data.theme?.footer },
            },
          }));
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, [storeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);
    setSuccess("");

    try {
      await updateDoc(doc(db, "stores", storeId), config);
      setSuccess("Settings saved successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle nested updates
  const setNested = (path: string[], value: any) => {
    setConfig((prev: any) => {
      const deepCopy = JSON.parse(JSON.stringify(prev));
      let current = deepCopy;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return deepCopy;
    });
  };

  if (storeLoading || fetching)
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-zinc-500">Manage your store's brand and layout.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-black text-white shadow-lg"
                  : "bg-white text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <form onSubmit={handleSave} className="space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "general" && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <h2 className="text-xl font-bold mb-6 text-zinc-900">
                    General Details
                  </h2>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setNested(["name"], e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <ImageUpload
                      label="Store Logo"
                      value={config.logo}
                      onChange={(val) => setNested(["logo"], val)}
                      maxSizeMB={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Store Status
                    </label>
                    <select
                      value={config.status}
                      onChange={(e) => setNested(["status"], e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                    >
                      <option value="live">Live (Open)</option>
                      <option value="maintenance">Maintenance (Closed)</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {activeTab === "style" && (
                <motion.div
                  key="style"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <h2 className="text-xl font-bold mb-6 text-zinc-900">
                    Global Style
                  </h2>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">
                        Background Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={config.theme.backgroundColor}
                          onChange={(e) =>
                            setNested(
                              ["theme", "backgroundColor"],
                              e.target.value
                            )
                          }
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer"
                        />
                        <code className="bg-zinc-100 px-2 py-1 rounded text-sm text-zinc-900">
                          {config.theme.backgroundColor}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">
                        Primary Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={config.theme.primaryColor}
                          onChange={(e) =>
                            setNested(["theme", "primaryColor"], e.target.value)
                          }
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer"
                        />
                        <code className="bg-zinc-100 px-2 py-1 rounded text-sm text-zinc-900">
                          {config.theme.primaryColor}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FontPicker
                      label="Primary Font Family"
                      value={config.theme.fontFamily}
                      onChange={(val) =>
                        setNested(["theme", "fontFamily"], val)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Product Card Size
                    </label>
                    <div className="flex gap-4">
                      {(["small", "medium", "large"] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setNested(["theme", "cardSize"], size)}
                          className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold capitalize ${
                            config.theme.cardSize === size
                              ? "bg-black text-white border-black"
                              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "hero" && (
                <motion.div
                  key="hero"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-zinc-900">
                      Hero Section
                    </h2>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-900">
                      <span className="text-sm font-medium">Enable Hero</span>
                      <input
                        type="checkbox"
                        checked={config.theme.hero.enabled}
                        onChange={(e) =>
                          setNested(
                            ["theme", "hero", "enabled"],
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-black"
                      />
                    </label>
                  </div>

                  {config.theme.hero.enabled && (
                    <>
                      <div className="space-y-4 border-b border-zinc-100 pb-6">
                        <label className="text-sm font-bold text-zinc-900">
                          Text Content
                        </label>
                        <input
                          type="text"
                          placeholder="Headline (e.g. SECURE THE BAG)"
                          value={config.theme.hero.headline}
                          onChange={(e) =>
                            setNested(
                              ["theme", "hero", "headline"],
                              e.target.value
                            )
                          }
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black uppercase tracking-tighter text-zinc-900"
                        />
                        <input
                          type="text"
                          placeholder="Subheadline (e.g. Limited drops only.)"
                          value={config.theme.hero.subheadline}
                          onChange={(e) =>
                            setNested(
                              ["theme", "hero", "subheadline"],
                              e.target.value
                            )
                          }
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                        />
                      </div>

                      <div className="space-y-4 border-b border-zinc-100 pb-6">
                        <label className="text-sm font-bold text-zinc-900">
                          Layout & Color
                        </label>
                        <div className="flex gap-4">
                          {[
                            { val: "left", icon: AlignLeft },
                            { val: "center", icon: AlignCenter },
                            { val: "right", icon: AlignRight },
                          ].map(({ val, icon: Icon }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                setNested(["theme", "hero", "layout"], val)
                              }
                              className={`p-3 rounded-lg border ${
                                config.theme.hero.layout === val
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-zinc-400 border-zinc-200"
                              }`}
                            >
                              <Icon size={20} />
                            </button>
                          ))}
                          <div className="flex gap-2 items-center ml-auto">
                            <span className="text-xs font-bold text-zinc-500">
                              Text Color
                            </span>
                            <input
                              type="color"
                              value={config.theme.hero.headlineColor}
                              onChange={(e) =>
                                setNested(
                                  ["theme", "hero", "headlineColor"],
                                  e.target.value
                                )
                              }
                              className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <FontPicker
                            label="Headline Font"
                            value={config.theme.hero.headlineFont}
                            onChange={(val) =>
                              setNested(["theme", "hero", "headlineFont"], val)
                            }
                          />
                          <FontPicker
                            label="Subheadline Font"
                            value={config.theme.hero.subheadlineFont}
                            onChange={(val) =>
                              setNested(
                                ["theme", "hero", "subheadlineFont"],
                                val
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <ImageUpload
                          label="Background Images"
                          value={config.theme.hero.backgroundImages || []}
                          onChange={(val) =>
                            setNested(
                              ["theme", "hero", "backgroundImages"],
                              val
                            )
                          }
                          multiple={true}
                          maxSizeMB={5}
                        />
                        <div className="flex items-center gap-4">
                          <label className="text-sm font-bold flex-shrink-0 text-zinc-900">
                            Overlay Opacity: {config.theme.hero.overlayOpacity}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.theme.hero.overlayOpacity}
                            onChange={(e) =>
                              setNested(
                                ["theme", "hero", "overlayOpacity"],
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full accent-black"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "footer" && (
                <motion.div
                  key="footer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-zinc-900">Footer</h2>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-900">
                      <span className="text-sm font-medium">Enable Footer</span>
                      <input
                        type="checkbox"
                        checked={config.theme.footer.enabled}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "enabled"],
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-black"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={config.theme.footer.text}
                      onChange={(e) =>
                        setNested(["theme", "footer", "text"], e.target.value)
                      }
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      placeholder="© 2025 My Store."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-zinc-500 uppercase">
                        Contact
                      </h3>
                      <input
                        type="email"
                        placeholder="Contact Email"
                        value={config.theme.footer.contact.email}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "contact", "email"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                      <input
                        type="text"
                        placeholder="Store Address / Location"
                        value={config.theme.footer.contact.address}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "contact", "address"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-zinc-500 uppercase">
                        Social Media
                      </h3>
                      <input
                        type="text"
                        placeholder="Instagram (@username)"
                        value={config.theme.footer.socials.instagram}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "socials", "instagram"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                      <input
                        type="text"
                        placeholder="Twitter (@username)"
                        value={config.theme.footer.socials.twitter}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "socials", "twitter"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sticky bottom-6 flex justify-end">
              <div className="bg-white/80 backdrop-blur p-2 rounded-2xl shadow-xl border border-zinc-200">
                {success && (
                  <span className="text-green-600 font-bold text-sm mr-4">
                    {success}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Save size={18} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
