import type { Metadata } from "next";

import { NotificationCenter } from "@/components/notifications/notification-center";

export const metadata: Metadata = { title: "Notifications" };

// In-app notifications (web#16). The live stream, list and actions are a
// client concern through the same-origin /api proxy; mock mode covers them
// like the profile screens.
export default function NotificationsPage() {
  return <NotificationCenter />;
}
