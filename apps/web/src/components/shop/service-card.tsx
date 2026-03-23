"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Loader2, Briefcase } from "lucide-react";
import { ServiceItem } from "@/types";
import { BookingModal } from "./booking-modal";
import { formatCurrency } from "@/lib/utils";

interface ServiceCardProps {
  service: ServiceItem;
  index: number;
  storeId: string;
  initialOpen?: boolean;
}

export function ServiceCard({
  service,
  index,
  storeId,
  initialOpen = false,
}: ServiceCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(initialOpen || false);

  const image = service.images?.[0] || service.imageUrl;

  //initial open
  // useEffect(() => {
  //   if (initialOpen) setIsModalOpen(true);
  // }, [initialOpen]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        className="group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-2xl transition-all duration-500">
          {/* Loading Spinner */}
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-zinc-300" />
            </div>
          )}

          {image ? (
            <Image
              src={image}
              alt={service.name}
              fill
              priority={index < 2}
              className={`object-cover transition-all duration-700 ${
                isImageLoaded
                  ? "opacity-100 grayscale-0"
                  : "opacity-0 grayscale"
              }`}
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
              <Briefcase className="text-zinc-300" size={48} />
            </div>
          )}

          {/* Service Badge */}
          <div className="absolute top-4 right-4 backdrop-blur bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-10">
            Service
          </div>

          {/* Duration Badge */}
          <div className="absolute top-4 left-4 backdrop-blur bg-white/90 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 z-10">
            <Clock size={12} />
            {service.duration} min
          </div>

          {/* Book Now Button */}
          <div className="absolute inset-x-4 bottom-4 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="w-full py-3 rounded-xl font-bold uppercase tracking-wide text-xs shadow-lg backdrop-blur-md transition-transform active:scale-95 bg-white/90 text-black hover:bg-white"
            >
              Book Now — {formatCurrency(service.price)}
            </button>
          </div>
        </div>

        <div className="space-y-1 px-2">
          <h3 className="text-lg font-bold tracking-tight">{service.name}</h3>
          <p className="text-zinc-500 text-sm line-clamp-2">
            {service.description}
          </p>
        </div>
      </motion.div>

      <BookingModal
        service={service}
        storeId={storeId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
