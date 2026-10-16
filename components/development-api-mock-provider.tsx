"use client";

import { useEffect, useState, type ReactNode } from "react";

const apiMocksEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_API_MOCKS === "1";

// Mock Service Worker (MSW) simulates browser API responses during development.
// Authentication and account permissions always come from the real server.
export function DevelopmentApiMockProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [apiMocksReady, setApiMocksReady] = useState(!apiMocksEnabled);
  const [apiMockFailure, setApiMockFailure] = useState(false);
  useEffect(() => {
    if (!apiMocksEnabled) return;
    let active = true;
    import("@/mocks/browser")
      .then(({ apiMockWorker }) =>
        apiMockWorker.start({ onUnhandledRequest: "bypass", quiet: true }),
      )
      .then(() => {
        if (active) setApiMocksReady(true);
      })
      .catch(() => {
        if (active) setApiMockFailure(true);
      });
    return () => {
      active = false;
    };
  }, []);
  if (apiMockFailure)
    return (
      <p role="alert">
        Development API simulation could not start. Set NEXT_PUBLIC_API_MOCKS=0
        and restart the web server to use the real API.
      </p>
    );
  return apiMocksReady ? (
    children
  ) : (
    <p role="status">Preparing development API simulation...</p>
  );
}
