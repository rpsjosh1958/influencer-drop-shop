"use client";

import { useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface ImageUploadProps {
  value?: string | string[]; // Single URL or array of URLs
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  label?: string;
  className?: string;
  multiple?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  disabled,
  maxSizeMB = 5,
  label = "Upload Image",
  className = "",
  multiple = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError("");
    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Validate Size
        if (file.size > maxSizeMB * 1024 * 1024) {
          throw new Error(
            `File ${file.name} is too large. Max ${maxSizeMB}MB.`
          );
        }

        // 2. Validate Type
        if (!file.type.startsWith("image/")) {
          throw new Error(`File ${file.name} is not an image.`);
        }

        // 3. Upload
        const storageRef = ref(
          storage,
          `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`
        );

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      }

      // 4. Update parent
      if (multiple) {
        const currentUrls = Array.isArray(value) ? value : value ? [value] : [];
        onChange([...currentUrls, ...newUrls]);
      } else {
        onChange(newUrls[0]); // Single mode, just take first
      }
    } catch (err: any) {
      console.error("Upload failed", err);
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const removeImage = (urlToRemove: string) => {
    if (multiple && Array.isArray(value)) {
      onChange(value.filter((url) => url !== urlToRemove));
    } else {
      onChange("");
    }
  };

  // Helper to normalize value to array for rendering
  const images = Array.isArray(value) ? value : value ? [value] : [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-zinc-900">{label}</label>
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((url, idx) => (
          <div
            key={url + idx}
            className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(url)}
              disabled={disabled}
              className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Upload Button */}
        {(!value || multiple || (!multiple && images.length === 0)) && (
          <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer text-zinc-400 hover:text-zinc-600">
            {uploading ? (
              <Loader2 className="animate-spin mb-2" />
            ) : (
              <Upload className="mb-2" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider">
              {uploading ? "Uploading..." : "Upload"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              disabled={disabled || uploading}
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-zinc-400">
        Max size: {maxSizeMB}MB.{" "}
        {multiple ? "Upload multiple images." : "Upload a single image."}
      </p>
    </div>
  );
}
