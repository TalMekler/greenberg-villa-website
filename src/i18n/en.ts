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
    eyebrow: "The Setting",
    title: "Where the sea meets the forest",
    intro: [
      "Green Villa stands right on the shoreline of the quiet bay of Edipsos, at the point where the sea and the forest meet in a dance of colour.",
      "On one side the deep blues of clear water stretch away; on the other, a rich green carpet of trees and foliage climbs the slope.",
      "The flowering orchard invites slow walks between fruit trees and soft scent, while the vegetable garden gives fresh, flavourful produce straight from the soil.",
      "This rare combination of sea, forest, orchard and garden turns every stay at the villa into something calm and restorative.",
      "Green Villa is not simply a place to sleep — it is a harmonious meeting of nature at its best with the quiet of a real home.",
    ],
    houseTitle: "The house and the grounds",
    house: [
      "Green Villa has three separate apartments and two further bedrooms, alongside a generous shared space on the ground floor.",
      "That shared space holds a living room, a dining area and a kitchen — all equipped to a five-star standard and finished in blues, whites and greens that together create a particular sense of calm.",
      "The garden wrapping the house offers a rich and varied experience: a stone terrace under a pergola, with a built stone barbecue kitchen and a handmade wooden table, set among the vegetable garden and the fruit orchard that invite picking straight from the branch.",
      "The raised pool area sits on a broad lawn, with sun loungers and comfortable armchairs.",
      "Beside the pool are further seating corners, offering a more secluded and intimate space to enjoy the quiet and the view.",
    ],
    cta: "Explore the Villa",
    stats: [
      { title: "5 Units", detail: "3 apartments & 2 bedrooms" },
      { title: "12 Guests", detail: "Across five private units" },
      { title: "Sea & Forest", detail: "Right on the shoreline" },
      { title: "Pool & Garden", detail: "Orchard, kitchen garden, BBQ" },
    ],
  },
  gallery: {
    eyebrow: "Visual Journey",
    title: "The Green Villa Gallery",
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
      "Thermal springs a few minutes down the coast road, sheltered bays, hillside villages and forest waterfalls — the north-west corner of Evia, starting at your doorstep.",
    cards: [
      {
        title: "Gialtron Thermal Springs",
        distance: "3 min drive",
        description:
          "Warm mineral water runs off the rocks straight into the sea at the edge of the village. Open air, no ticket, best an hour before sunset.",
      },
      {
        title: "Gialtra Village",
        distance: "5 min drive",
        description:
          "The old village on the slope above the bay, where the ouzeri and the cafes around the square stay busy long after dark.",
      },
      {
        title: "The Hills Above the Bay",
        distance: "From the doorstep",
        description:
          "Dirt tracks climb from the coast road into the ridge behind the villa, topping out near 700m with the whole gulf laid out below.",
      },
      {
        title: "Gregolimano Bay",
        distance: "10 min drive",
        description:
          "A sheltered bay on the south shore of the peninsula, closed in by pine-covered slopes and calm on days when the open coast is not.",
      },
      {
        title: "Loutra Edipsou",
        distance: "30 min drive",
        description:
          "Greece's best-known spa town since antiquity: thermal baths, a long seafront of tavernas, and the ferry across to the mainland.",
      },
      {
        title: "Drymona Waterfalls",
        distance: "1 hr 15 drive",
        description:
          "Worth the drive east across the island: chestnut forest, a shaded footpath, and falls dropping into a cold green pool.",
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
    title: "How to get to Green Villa",
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
    rights: "© 2025 Green Villa. All rights reserved.",
    designed: "Designed in Greece",
    instagram: "Green Villa on Instagram",
    facebook: "Green Villa on Facebook",
  },
  units: { night: "night", nights: "nights", guest: "guest", guests: "guests" },
};
