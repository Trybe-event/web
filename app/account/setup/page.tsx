import Link from "next/link";
import { redirect } from "next/navigation";
import { accountState } from "@/lib/session";
import { workspacePath } from "@/lib/account";
import { BrandLogo } from "@/components/brand-logo";
import { SignOut } from "@/components/sign-out";
export default async function Page() {
 const state = await accountState();
 if (state.state === "ready") redirect(workspacePath(state.account.accountType));
 if (state.state === "signed_out" || state.state === "unconfigured") redirect("/");
 return <main className="entry-layout"><header><BrandLogo/><SignOut/></header><div className="entry-heading"><span className="eyebrow">FINISH YOUR INTRODUCTION</span><h1>{state.state === "setup_required" ? "How are you joining Trybe?" : "We couldn’t reach your account."}</h1><p>{state.state === "setup_required" ? "Your email is signed in. Choose and confirm one permanent account type." : "Please try again shortly. No account type has been assigned."}</p></div>{state.state === "setup_required" && <div className="entry-cards"><Link href="/attendee/complete"><h2>As an attendee</h2><p>Join events and meet your people.</p></Link><Link href="/organizer/complete"><h2>As an organizer</h2><p>Create events and bring people together.</p></Link></div>}</main>;
}
