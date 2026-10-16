"use client";
import { createContext, useContext } from "react";
import type { Schemas } from "@/lib/api/client";
export const EventEditorContext = createContext<{
  event: Schemas["Event"];
  save: () => Promise<boolean>;
} | null>(null);
export function useEventEditor() {
  const context = useContext(EventEditorContext);
  if (!context) throw new Error("Event editor is required.");
  return context;
}
