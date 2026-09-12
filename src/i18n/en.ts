import type { Dictionary } from "./types";

export const en: Dictionary = {
  nav: {
    home: "Home",
    gallery: "Gallery",
    location: "Location",
    explore: "Explore Area",
    availability: "Availability",
    contact: "Contact",
    language: "Language",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
  },
  hero: {
    subtitle: "Your private Mediterranean escape on the island of Evia",
    cta: "Check Availability",
  },
  about: {
    eyebrow: "The Sanctuary",
    title: "Perched above the turquoise waters",
    bodyOne:
      "Greenberg Villa is a meticulously designed luxurious retreat perched gracefully on the rugged cliffs of Evia island. Built with local stone and pristine white-washed plaster, the estate seamlessly blends classic Cycladic architecture with modern Mediterranean minimalist luxury.",
    bodyTwo:
      "Wake up to panoramic sea views, enjoy sun-drenched afternoons by your private infinity pool, and dine al fresco on expansive terraces wrapped in serene, wild lavender gardens. Every detail is curated to provide a quiet, upscale escape where the horizon is your only boundary.",
    cta: "Explore the Villa",
    stats: [
      { title: "5 Bedrooms", detail: "3 suites & 2 double rooms" },
      { title: "12 Guests", detail: "Across five private rooms" },
      { title: "Sea View", detail: "180° panoramic vista" },
      { title: "Private Pool", detail: "Heated infinity pool" },
    ],
  },
  gallery: {
    eyebrow: "Visual Journey",
    title: "The Greenberg Gallery",
    description:
      "Explore the serene spaces, curated design elements, and stunning outdoor landscapes.",
    open: "Open image",
    close: "Close gallery",
    previous: "Previous image",
    next: "Next image",
  },
  location: {
    eyebrow: "The Island of Evia",
    title: "A wild and untouched paradise",
    description:
      "Evia is Greece's second-largest island, offering dramatic mountain peaks, ancient forests, and pristine secret beaches—all while remaining connected to the mainland.",
    mapLabel: "Evia Island Map",
    openInMaps: "Open in maps",
    highlights: [
      {
        title: "Chiliadou Beach",
        distance: "200m away",
        description:
          "A short, scenic walk down to one of Greece's most famous pristine pebble beaches.",
      },
      {
        title: "Limni Town",
        distance: "15 min drive",
        description:
          "Charming traditional seaside town with red-tiled roofs, tavernas, and quiet cafes.",
      },
      {
        title: "Athens Airport",
        distance: "2 hours away",
        description: "Easy access via highway and bridge from Athens International Airport (ATH).",
      },
    ],
  },
  explore: {
    eyebrow: "Local Secrets",
    title: "Explore the beauty of Evia",
    description:
      "Discover hidden waterfalls, authentic Greek tavernas, thermal springs, and scenic coastal hikes just a short journey from your private villa.",
    cards: [
      {
        title: "Chiliadou Beach",
        distance: "200m away",
        description:
          "Pristine pebble beach framed by dramatic rocky cliffs, famous for crystal-clear sapphire waters.",
      },
      {
        title: "Limni Village",
        distance: "15 min drive",
        description:
          "A picturesque coastal village full of red-roofed neoclassical homes, winding alleys, and cozy fish tavernas.",
      },
      {
        title: "Edipsos Hot Springs",
        distance: "40 min drive",
        description:
          "Natural hot thermal springs flowing directly from coastal rocks into the cool waters of the sea.",
      },
      {
        title: "Drymonas Waterfall",
        distance: "25 min drive",
        description:
          "A lush, hidden forest path leading to beautiful cascading mountain waterfalls and fresh natural pools.",
      },
      {
        title: "Kirinthos Gorge",
        distance: "20 min drive",
        description:
          "Scenic, breezy hiking trails crossing pristine creeks under giant plane trees and dramatic gorge walls.",
      },
      {
        title: "Taverna Platanos",
        distance: "10 min drive",
        description:
          "Enjoy slow-cooked lamb and fresh local olive oil dishes under a 200-year-old giant plane tree.",
      },
    ],
  },
  availability: {
    eyebrow: "Your Stay",
    title: "Availability Calendar",
    description:
      "Choose your perfect summer getaway. Muted terracotta colors represent dates that are already booked.",
    available: "Available",
    booked: "Booked",
    requestBooking: "Request Booking",
    selectCheckIn: "Select your check-in date",
    selectCheckOut: "Now pick your check-out date",
    loading: "Loading availability…",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    dayBooked: "booked",
    dayAvailable: "available",
    dayPast: "in the past",
  },
  transit: {
    eyebrow: "The Journey",
    title: "How to get to Greenberg Villa",
    description:
      "While Evia island feels quiet and secluded, it is easily reachable by car or a beautiful, relaxing ferry ride from the mainland.",
    steps: [
      {
        kicker: "By Plane",
        title: "Fly to Athens Airport (ATH)",
        description:
          "Arrive at Athens International Airport, pick up a rental car, and enjoy a scenic 2-hour drive through the Greek countryside to the villa.",
      },
      {
        kicker: "By Car",
        title: "Drive via Chalkida Bridge",
        description:
          "Take the primary Athens–Lamia highway north. Cross the suspension bridge at Chalkida onto Evia island—no ferries required.",
      },
      {
        kicker: "By Ferry",
        title: "Scenic crossing from Arkitsa",
        description:
          "Drive from Athens to Arkitsa port, take the beautiful 45-minute ferry crossing to Edipsos, followed by a gorgeous 30-minute mountain drive.",
      },
    ],
  },
  contact: {
    eyebrow: "Begin Your Escape",
    title: "Get in Touch",
    description:
      "Contact us directly to request bespoke stays, ask questions about travel, or plan your private event.",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
    checkIn: "Check-In Date",
    checkOut: "Check-Out Date",
    guests: "Number of Guests",
    message: "Message / Special Requests",
    send: "Send Request",
    sending: "Sending…",
    placeholders: {
      firstName: "Constantinos",
      lastName: "Pappas",
      email: "constantinos@gmail.com",
      message:
        "Hello, we would love to arrange a private chef for the evening of July 15th. Let us know if this is possible.",
    },
    errors: {
      firstName: "Please enter your first name.",
      lastName: "Please enter your last name.",
      emailRequired: "Please enter your email address.",
      emailInvalid: "That email address doesn't look right.",
      checkIn: "Choose a check-in date.",
      checkOut: "Choose a check-out date.",
      checkOutOrder: "Check-out must be after check-in.",
      fieldsHighlighted: "Please check the highlighted fields.",
      generic: "Could not send your request.",
    },
    sent: {
      title: "Request sent",
      body: "Thank you, {name}. Maria & Nikos have your request and usually reply within 24 hours.",
      dates: "Dates",
      guests: "Guests",
      replyTo: "We'll reply to",
      another: "Send another request",
    },
    hosts: {
      label: "Your Hosts",
      names: "Maria & Nikos",
      quote:
        '"We\'ve been welcoming guests to our beloved family villa on Evia island since 2015."',
    },
    channels: { whatsapp: "WhatsApp", phone: "Phone", email: "Email" },
  },
  footer: {
    rights: "© 2025 Greenberg Villa. All rights reserved.",
    designed: "Designed in Greece",
    instagram: "Greenberg Villa on Instagram",
    facebook: "Greenberg Villa on Facebook",
  },
  units: { night: "night", nights: "nights", guest: "guest", guests: "guests" },
};
