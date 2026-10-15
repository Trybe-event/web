"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
function subscribe(callback: () => void) { window.addEventListener("trybe-theme",callback); return () => window.removeEventListener("trybe-theme",callback); }
function snapshot() { return document.documentElement.dataset.theme === "dark"; }
export function ThemeToggle() {
 const dark = useSyncExternalStore(subscribe,snapshot,()=>false);
 return <button className="theme-button" aria-label={`Switch to ${dark ? "light" : "dark"} theme`} onClick={()=>{
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  document.cookie = `trybe_theme=${dark ? "light" : "dark"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("trybe-theme"));
 }}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>;
}
