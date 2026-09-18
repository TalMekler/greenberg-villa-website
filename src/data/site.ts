import type { IconName } from "../assets/icons";
import { contactNumbers } from "../lib/contact";
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

const digits = (value: string) => value.replace(/\D/g, "");

/** Icons and links; the labels come from the dictionaries. */
export const contactChannels = [
  {
    icon: "messageSquare",
    href: `https://wa.me/${digits(contactNumbers.whatsapp)}`,
    value: contactNumbers.whatsapp,
  },
  { icon: "phone", href: `tel:+${digits(contactNumbers.phone)}`, value: contactNumbers.phone },
  { icon: "mail", href: "mailto:welcome@greenvilla.gr", value: "welcome@greenvilla.gr" },
] as const satisfies readonly { icon: IconName; href: string; value: string }[];
