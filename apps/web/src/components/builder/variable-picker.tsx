import { useEffect, useMemo, useRef, useState } from "react";
import { BUILDER_VARIABLES } from "./variables";
import { Input } from "@/components/ui/input";

interface VariablePickerProps {
  onSelect: (token: string) => void;
}

export function VariablePicker({ onSelect }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return BUILDER_VARIABLES;
    return BUILDER_VARIABLES.filter((item) =>
      `${item.token} ${item.label} ${item.description}`.toLowerCase().includes(lower)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-fog/70 hover:bg-white/10"
        aria-label="Insert variable"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 9h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-white/10 bg-ink/95 p-3 shadow-2xl">
          <Input
            placeholder="Search variables..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
          <div className="scroll-area mt-3 max-h-60 space-y-2 overflow-auto pr-1 text-xs text-fog/70">
            {filtered.map((item) => (
              <button
                key={item.token}
                type="button"
                className="w-full rounded-xl border border-white/5 bg-white/5 p-2 text-left hover:bg-white/10"
                onClick={() => {
                  onSelect(item.token);
                  setOpen(false);
                }}
              >
                <div className="font-medium text-fog">{item.token}</div>
                <div className="text-fog/50">{item.label}</div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-fog/50">No variables found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
