"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { workspacePath, type AccountType } from "@/lib/account";
import { SignOut } from "./sign-out";
export function CompleteAccount({type}: {type:AccountType}) {
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault(); setBusy(true); setError("");
  const form = new FormData(event.currentTarget);
  try {
   const response = await fetch(`/api/v1/accounts/${type}`,{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName:form.get("fullName"),organization:form.get("organization") ?? ""}) });
   const result = await response.json();
   if (!response.ok) { setError(result.message ?? "We couldn’t finish setup. Please try again."); return; }
   window.location.assign(workspacePath(type));
  } catch { setError("We couldn’t connect. Check your connection and try again."); }
  finally { setBusy(false); }
 }
 return <form className="complete-form" onSubmit={submit}>
  <label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={100} disabled={busy}/>
  {type === "organizer" && <><label htmlFor="organization">Organization <span>(optional)</span></label><input id="organization" name="organization" autoComplete="organization" maxLength={150} disabled={busy}/></>}
  <div className="binding-notice"><LockKeyhole size={18}/><p>You’re creating an <strong>{type}</strong> account. This choice is permanent. This identity and email cannot also create the other account type.</p></div>
  <label className="confirm-choice"><input type="checkbox" required disabled={busy}/>I understand and want an {type} account.</label>
  {error && <p className="form-error" role="alert">{error}</p>}
  <button className="primary-button" disabled={busy}>{busy ? "Saving your account…" : `Create my ${type} account`}<ArrowRight size={17}/></button>
  <SignOut/>
 </form>;
}
