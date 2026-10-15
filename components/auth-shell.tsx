import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import type { AccountType } from "@/lib/account";
export function AuthShell({ type, children }: { type: AccountType; children: ReactNode }) {
 const organizer = type === "organizer";
 return <main className={`auth-layout ${organizer ? "for-organizer" : "for-attendee"}`}>
  <aside className="auth-story">
   <Link href="/" aria-label="Trybe home"><BrandLogo/></Link>
   <div className="story-copy"><span className="eyebrow">{organizer ? "A PLACE FOR YOUR COMMUNITY" : "GOOD PEOPLE. SHARED POSSIBILITIES."}</span>
    <h1>{organizer ? <>Bring your people<br/>into the <em>room.</em></> : <>Your next chapter<br/>starts with <em>people.</em></>}</h1>
    <p>{organizer ? "Set the scene. Bring a community together. Give every introduction a place to grow." : "Find the people who share your curiosity. Arrive with a little more possibility."}</p>
   </div>
   <div className="connection-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-center">✳</div><span className="orbit-note note-one">{organizer ? "Your event" : "Shared interests"}<ArrowUpRight size={16}/></span><span className="orbit-note note-two"><Sparkles size={16}/>{organizer ? "Their next connection" : "A reason to connect"}</span></div>
   <p className="story-footer"><ShieldCheck size={17}/> Your connections. Your choice.</p>
  </aside>
  <section className="auth-main"><div className="auth-topline"><Link href="/" className="mobile-brand"><BrandLogo/></Link><ThemeToggle/></div>
   <div className="auth-content">{children}</div>
   <footer className="auth-footer">Connection with convenience.<span>© {new Date().getFullYear()} Trybe</span></footer>
  </section>
 </main>;
}
