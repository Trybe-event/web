import Link from "next/link";

import { Logo, ToastProvider } from "@/components/ui";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/profile" aria-label="Trybe, your profile">
            <Logo />
          </Link>
        </div>
      </header>
      {children}
    </ToastProvider>
  );
}
