"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Extensive list of popular Google Fonts
const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Lato",
  "Poppins",
  "Nunito",
  "Raleway",
  "Playfair Display",
  "Rubik",
  "Merriweather",
  "Ubuntu",
  "Oswald",
  "Cabin",
  "Work Sans",
  "Mukta",
  "Quicksand",
  "Anton",
  "Fjalla One",
  "Inconsolata",
  "Barlow",
  "Titillium Web",
  "Bebas Neue",
  "Crimson Text",
  "Lora",
  "DM Sans",
  "PT Sans",
  "PT Serif",
  "Droid Serif",
  "Arvo",
  "Bitter",
  "Josefin Sans",
  "Libre Baskerville",
  "Pacifico",
  "Shadows Into Light",
  "Dancing Script",
  "Abril Fatface",
  "Unbounded",
  "Space Grotesk",
  "Syne",
  "Outfit",
  "Manrope",
  "Urbanist",
  "Courier Prime",
].sort();

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
  label?: string;
}

export function FontPicker({ value, onChange, label }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredFonts = useMemo(() => {
    if (!search) return GOOGLE_FONTS;
    return GOOGLE_FONTS.filter((font) =>
      font.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="text-sm font-bold text-zinc-900">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium hover:border-zinc-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Type size={16} className="text-zinc-400" />
            {value || "Select Font"}
          </span>
          <ChevronsUpDown size={16} className="text-zinc-400 opacity-50" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden flex flex-col"
            >
              <div className="flex items-center px-3 py-2 border-b border-zinc-100">
                <Search size={14} className="text-zinc-400 mr-2" />
                <input
                  autoFocus
                  className="bg-transparent text-sm w-full focus:outline-none placeholder:text-zinc-400"
                  placeholder="Search fonts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                {filteredFonts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400">
                    No fonts found.
                  </div>
                ) : (
                  filteredFonts.map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => {
                        onChange(font);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        value === font
                          ? "bg-black text-white"
                          : "hover:bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      <span>{font}</span>
                      {value === font && (
                        <Check size={14} className="opacity-100" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-xs text-zinc-400">
        Fonts are powered by Google Fonts.
      </p>
    </div>
  );
}
