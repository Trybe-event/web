import type { Schemas } from "@/lib/api/client";

export const LINK_LABELS: Record<Schemas["LinkKind"], string> = {
  linkedin: "LinkedIn",
  portfolio: "Portfolio or website",
  x: "X",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
  other: "Other link",
};

export const VISIBILITY_LABELS: Record<Schemas["Visibility"], string> = {
  hidden: "Only me",
  connections: "My connections",
  event_members: "People at my events",
};

export const VISIBILITY_HINTS: Record<Schemas["Visibility"], string> = {
  hidden: "Nobody else sees this.",
  connections: "Only people who accepted a connection with you.",
  event_members: "Attendees who share an event with you, and your connections.",
};
