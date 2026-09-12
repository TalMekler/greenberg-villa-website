import type { IconName } from "../assets/icons";
import { exploreSlugs, type ExploreSlug } from "../lib/site-images";
import type { NavLink } from "../types";

export const navLinks: NavLink[] = [
  { key: "home", href: "#home" },
  { key: "gallery", href: "#gallery" },
  { key: "location", href: "#location" },
  { key: "explore", href: "#explore" },
  { key: "availability", href: "#availability" },
  { key: "contact", href: "#contact" },
];

/** Icons only — the words live in the dictionaries, in section order. */
export const statIcons: IconName[] = ["bed", "users", "eye", "droplet"];

/** Card order, matching the dictionaries. The photo for each is keyed by slug. */
export const exploreSlugOrder: ExploreSlug[] = [...exploreSlugs];

/** Step icons, in order; the copy lives in the dictionaries. */
export const transitIcons: IconName[] = ["plane", "car", "ship"];

/** Icons and links; the labels come from the dictionaries. */
export const contactChannels = [
  { icon: "messageSquare", href: "https://wa.me/306912345678", value: "+30 691 234 5678" },
  { icon: "phone", href: "tel:+302109876543", value: "+30 210 987 6543" },
  { icon: "mail", href: "mailto:welcome@greenbergvilla.gr", value: "welcome@greenbergvilla.gr" },
] as const satisfies readonly { icon: IconName; href: string; value: string }[];
