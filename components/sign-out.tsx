"use client";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
export function SignOut() { return <SignOutButton redirectUrl="/"><button className="secondary-button"><LogOut size={16}/>Sign out</button></SignOutButton>; }
