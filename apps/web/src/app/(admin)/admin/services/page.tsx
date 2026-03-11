"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { ServiceItem } from "@/types";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Clock,
  DollarSign,
  X,
  Briefcase,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/admin/image-upload";
import { Tooltip } from "@/components/ui/tooltip";
import { HelpTrigger } from "@/context/onboarding-context";

export default function ServicesPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isLive, setIsLive] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    duration: 60,
    bufferTime: 15,
    images: [] as string[],
    isActive: true,
  });

  // Fetch services
  useEffect(() => {
    if (!storeId) return;
    const q = query(
      collection(db, "stores", storeId, "services"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ServiceItem,
      );
      setServices(items);
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  // Check store status
  useEffect(() => {
    if (!storeId) return;
    const unsub = onSnapshot(doc(db, "stores", storeId), (doc) => {
      if (doc.exists()) {
        setIsLive(doc.data().status === "live");
      }
    });
    return () => unsub();
  }, [storeId]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      duration: 60,
      bufferTime: 15,
      images: [],
      isActive: true,
    });
    setEditingService(null);
  };

  const openModal = (service?: ServiceItem) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        bufferTime: service.bufferTime || 15,
        images: service.images || [],
        isActive: service.isActive,
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!storeId || !formData.name) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        storeId,
        imageUrl: formData.images[0] || "",
      };

      if (editingService) {
        await updateDoc(
          doc(db, "stores", storeId, "services", editingService.id),
          {
            ...payload,
            updatedAt: serverTimestamp(),
          },
        );
      } else {
        await addDoc(collection(db, "stores", storeId, "services"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (err) {
      console.error("Failed to save service", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!storeId || !confirm("Delete this service?")) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "stores", storeId, "services", id));
    } catch (err) {
      console.error("Failed to delete service", err);
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (service: ServiceItem) => {
    if (!storeId) return;
    try {
      await updateDoc(doc(db, "stores", storeId, "services", service.id), {
        isActive: !service.isActive,
      });
    } catch (err) {
      console.error("Failed to toggle service", err);
    }
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()),
  );

  if (storeLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Services
            <HelpTrigger category="services" />
          </h1>
          <p className="text-zinc-500">Manage your bookable services.</p>
        </div>
        <button
          data-tour="services-add"
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
        >
          <Plus size={18} />
          Add Service
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 text-black bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
        />
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center">
          <Briefcase className="mx-auto text-zinc-300 mb-4" size={48} />
          <h3 className="text-lg font-bold mb-2">No services yet</h3>
          <p className="text-zinc-500 mb-6">
            Create your first bookable service to get started.
          </p>
          <button
            onClick={() => openModal()}
            className="px-5 py-3 bg-black text-white rounded-xl font-bold"
          >
            Add Your First Service
          </button>
        </div>
      ) : (
        <div
          data-tour="services-grid"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredServices.map((service) => (
            <motion.div
              key={service.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                service.isActive
                  ? "border-zinc-200"
                  : "border-zinc-100 opacity-60"
              }`}
            >
              {/* Image */}
              <div className="aspect-[16/9] bg-zinc-100 relative">
                {service.images?.[0] ? (
                  <img
                    src={service.images[0]}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Briefcase className="text-black" size={32} />
                  </div>
                )}
                {!service.isActive && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-zinc-900/80 text-white text-xs font-bold rounded-full">
                    Inactive
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-black text-lg">
                    {service.name}
                  </h3>
                  <p className="text-sm text-zinc-500 line-clamp-2">
                    {service.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-zinc-600">
                    <span className="font-bold">GHS {service.price}</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-600">
                    <Clock size={14} />
                    <span>{service.duration} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => toggleActive(service)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      service.isActive
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </button>

                  <Tooltip
                    content={isLive ? "Cannot edit while LIVE" : "Edit Service"}
                    side="top"
                  >
                    <button
                      onClick={() => openModal(service)}
                      disabled={isLive}
                      className={`p-2 rounded-lg transition-colors ${
                        isLive
                          ? "text-zinc-300 hover:bg-transparent cursor-not-allowed"
                          : "hover:bg-zinc-100 text-black"
                      }`}
                    >
                      {isLive ? (
                        <Pencil size={16} className="opacity-50" />
                      ) : (
                        <Pencil size={16} />
                      )}
                    </button>
                  </Tooltip>

                  <Tooltip content="Delete Service" side="top">
                    <button
                      onClick={() => handleDelete(service.id)}
                      disabled={deleting === service.id}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === service.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </Tooltip>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 text-black backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl text-black font-bold">
                  {editingService ? "Edit Service" : "New Service"}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Image Upload */}
                <ImageUpload
                  label="Service Image"
                  value={formData.images[0] || ""}
                  onChange={(url) => {
                    const imageUrl = Array.isArray(url) ? url[0] : url;
                    setFormData({
                      ...formData,
                      images: imageUrl ? [imageUrl] : [],
                    });
                  }}
                  maxSizeMB={2}
                />

                {/* Name */}
                <div>
                  <label className="block text-sm text-black font-bold mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Full Set Gel Nails"
                    className="w-full p-3 border text-black border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-black font-bold mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what this service includes..."
                    rows={3}
                    className="w-full p-3 border text-black border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none resize-none"
                  />
                </div>

                {/* Price & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Price (GHS)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      onFocus={(e) =>
                        formData.price === 0 && (e.target.value = "")
                      }
                      placeholder="0"
                      className="w-full p-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration: parseInt(e.target.value) || 60,
                        })
                      }
                      className="w-full p-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                </div>

                {/* Buffer Time */}
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Buffer Time (min)
                  </label>
                  <p className="text-xs text-zinc-500 mb-2">
                    Gap between appointments for preparation.
                  </p>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={formData.bufferTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferTime: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-24 p-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between py-3 px-4 bg-zinc-50 rounded-xl">
                  <span className="font-medium">Service Active</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, isActive: !formData.isActive })
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      formData.isActive ? "bg-green-500" : "bg-zinc-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        formData.isActive ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="animate-spin" size={18} />}
                  {editingService ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
