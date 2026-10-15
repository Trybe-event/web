import Link from "next/link";
import { CalendarDays, ShieldCheck, ArrowUpRight, Users } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { SignOut } from "./sign-out";
import { workspaceAccount } from "@/lib/session";
import type { AccountType } from "@/lib/account";
export async function Workspace({type}: {type:AccountType}) {
 const state = await workspaceAccount(type);
 const organizer = type === "organizer";
 return <main className="workspace"><header className="workspace-header"><Link href="/"><BrandLogo/></Link><div><span className="workspace-badge">{organizer ? "Organizer" : "Attendee"} workspace</span><ThemeToggle/><SignOut/></div></header>
 {state.state !== "ready" ? <section className="workspace-welcome notice" role="alert"><h1>Your workspace is temporarily unavailable.</h1><p>We couldn’t confirm your account. No account details have been changed.</p><Link href={organizer ? "/organizer" : "/attendee"}>Try again</Link></section> : <>
 <section className="workspace-welcome"><span className="eyebrow">YOUR TRYBE STARTS HERE</span><h1>Welcome, {state.account.fullName.split(" ")[0]}<span className="accent-period">.</span></h1><p>{organizer ? "A good event brings people together. A great one gives them a reason to stay connected." : "Good conversations start with a little curiosity. Your next connection is ahead."}</p></section>
 <section className="workspace-grid"><div className="workspace-empty"><div className="empty-icon">{organizer ? <CalendarDays size={30}/> : <Users size={30}/>}</div><span className="eyebrow">{organizer ? "YOUR EVENTS" : "YOUR EVENT SPACE"}</span><h2>{organizer ? "The next room is yours to create." : "Your people are out there."}</h2><p>{organizer ? "Event creation and your registration dashboard are next in the build. Your organizer account is ready." : "Your attendee account is ready. Profile setup, event invitations and discovery are next in the build."}</p><span className="progress-label">Account foundation ready <ArrowUpRight size={16}/></span></div>
 <aside className="privacy-card"><ShieldCheck size={26}/><h2>Built around your choice.</h2><p>{organizer ? "This account manages your events. It stays separate from attendee accounts." : "Your contact details stay private by default. You’ll choose what to share when profiles are available."}</p><span>{state.account.onboardingComplete ? "Account setup complete" : "Profile setup comes next"}</span></aside></section></>}
 </main>;
}
