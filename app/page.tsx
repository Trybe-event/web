import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { accountState } from "@/lib/session";
import { workspacePath } from "@/lib/account";
export default async function Home() {
 const state = await accountState();
 if (state.state === "ready") redirect(workspacePath(state.account.accountType));
 if (state.state === "setup_required") redirect("/account/setup");
 return <main className="entry-layout"><header><BrandLogo/><ThemeToggle/></header>
  <div className="entry-heading"><span className="eyebrow">CONNECTION WITH CONVENIENCE</span><h1>Find your people.<br/><em>Make it happen.</em></h1><p>A room full of possibilities starts with a good introduction.<br/>Choose how you’re joining Trybe.</p></div>
  <div className="entry-cards"><Link href="/attendee/sign-in"><Users size={27}/><span className="eyebrow">FOR ATTENDEES</span><h2>Your next connection.</h2><p>Bring your interests. Meet people worth knowing.</p><span className="entry-link">Join as an attendee <ArrowUpRight size={19}/></span></Link>
   <Link href="/organizer/sign-in"><CalendarDays size={27}/><span className="eyebrow">FOR ORGANIZERS</span><h2>Your community, together.</h2><p>Give your event a place for introductions to grow.</p><span className="entry-link">Continue as an organizer <ArrowUpRight size={19}/></span></Link></div>
  <p className="account-note">Two separate workspaces. One clear choice. Account types cannot be switched.</p>
 </main>;
}
