import { notFound } from "next/navigation";

import { Showcase } from "./showcase";

// Component reference for developers. Not available in production.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
