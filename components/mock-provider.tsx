"use client";

import { useEffect, useState, type ReactNode } from "react";

const enabled = process.env.NEXT_PUBLIC_API_MOCKS === "1";

// Starts the MSW worker before rendering when NEXT_PUBLIC_API_MOCKS=1, so the first
// /api request is already answered by the contract-shaped mocks.
export function MockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    import("@/mocks/browser")
      .then(({ worker }) =>
        worker.start({ onUnhandledRequest: "bypass", quiet: true }),
      )
      .then(() => setReady(true));
  }, []);
  return ready ? children : null;
}
