// Icons exported from the Figma file. Each SVG carries the stroke colour it was
// designed with, so they are rendered as <img> at their designed leaf size.
import bed from "./bed.svg";
import calendar from "./calendar.svg";
import car from "./car.svg";
import chevronDown from "./chevron-down.svg";
import chevronLeft from "./chevron-left.svg";
import chevronRight from "./chevron-right.svg";
import droplet from "./droplet.svg";
import eye from "./eye.svg";
import facebook from "./facebook.svg";
import instagram from "./instagram.svg";
import mail from "./mail.svg";
import mapPin from "./map-pin.svg";
import messageSquare from "./message-square.svg";
import phone from "./phone.svg";
import plane from "./plane.svg";
import ship from "./ship.svg";
import users from "./users.svg";

export const icons = {
  bed,
  calendar,
  car,
  chevronDown,
  chevronLeft,
  chevronRight,
  droplet,
  eye,
  facebook,
  instagram,
  mail,
  mapPin,
  messageSquare,
  phone,
  plane,
  ship,
  users,
} as const;

export type IconName = keyof typeof icons;
