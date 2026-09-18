import { operator as op } from "../data/operator";
import { retention } from "../lib/retention";
import type { LegalDocuments } from "./types";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/*
  English legal pages. The Hebrew and Greek files mirror this one section for
  section, with the same ids. Anything in [[DOUBLE_BRACKETS]] is a placeholder
  for the owner to fill in; operator details come from src/data/operator.ts.
*/
export const en: LegalDocuments = {
  privacy: {
    title: "Privacy Policy",
    summary:
      "What personal information Green Villa collects when you use this website or ask to book the villa, why we use it, who we share it with, and the rights you have. This policy is written to meet the EU General Data Protection Regulation (GDPR) and the Israeli Privacy Protection Law, 5741-1981, as amended (including Amendment 13).",
    sections: [
      {
        id: "who-we-are",
        heading: "Who we are",
        blocks: [
          `Green Villa is a private holiday villa in Edipsos, on the island of Evia, Greece. It is let by ${op.name} ("we", "us"). We decide how and why your personal information is used, so we are the controller under the GDPR and the party responsible for the information under Israeli law.`,
          { contact: true },
          `Our representative in the European Union under Article 27 of the GDPR: ${op.euRepresentative}.`,
        ],
      },
      {
        id: "what-we-collect",
        heading: "What we collect",
        blocks: [
          { heading: "When you send a booking request" },
          {
            list: [
              "Your first and last name",
              "Your email address",
              "Your check-in and check-out dates",
              "The number of guests",
              "Anything you write in the message field (optional)",
            ],
          },
          "The name, email address and dates are needed to answer your request. You are under no legal obligation to give them to us, but without them we cannot reply or take a booking. Please do not include sensitive information in your message (such as health details) unless you want us to know it for your stay — for example, an accessibility need.",
          { heading: "What we add" },
          "When we handle your request we record its status (pending, approved, declined or cancelled), when we decided, and the price we agreed with you.",
          "With your request we also record when you sent it and which version of this policy the form showed you, as evidence of what you were told.",
          { heading: "Collected automatically" },
          {
            list: [
              "Your IP address, when you send a booking request. It is used only to stop the form being abused, together with your email address, which limits how many confirmation emails can be sent to one address.",
              "Server logs kept by our hosting provider: your IP address, browser type, the pages requested and when.",
              "When the map on our site loads, your browser fetches the map images from OpenStreetMap, which receives your IP address.",
              "To show availability changes live, your browser connects to our database provider, Supabase, which receives your IP address. It receives no other information about you.",
            ],
          },
          { heading: "Stored on your device" },
          "Your language choice, so the site opens in the same language next time, and your cookie choices. See the cookies section below.",
          "We do not use analytics, advertising or tracking tools, and we do not build profiles of visitors.",
        ],
      },
      {
        id: "purposes",
        heading: "Why we use it, and on what legal basis",
        blocks: [
          {
            terms: [
              [
                "Answering your booking request, confirming dates and price, and managing your stay",
                "Necessary to take steps you asked for before a contract, and to perform the contract (GDPR Article 6(1)(b)).",
              ],
              [
                "Emailing you an automatic confirmation that we received your request",
                "Necessary to take steps you asked for before a contract (GDPR Article 6(1)(b)).",
              ],
              [
                "Protecting the booking form from abuse and keeping the site secure",
                "Our legitimate interest in keeping the site safe and available (GDPR Article 6(1)(f)).",
              ],
              [
                "Showing the villa on a map and showing up-to-date availability",
                "Our legitimate interest in showing where the villa is and when it is free (GDPR Article 6(1)(f)).",
              ],
              [
                "Keeping records of confirmed bookings that the law requires, such as for tax and accounting",
                "Compliance with a legal obligation (GDPR Article 6(1)(c)).",
              ],
              [
                "Remembering your language and your cookie choices",
                "Strictly necessary to provide the site in the language you chose, and to respect your cookie choices. It stays on your device.",
              ],
            ],
          },
          "We use your information only for the purposes above. We do not use it for marketing, we do not sell it, and we make no decisions about you by automated means. If we ever want to use it for a new purpose, we will tell you first and, where the law requires it, ask for your consent.",
          "Where we rely on our legitimate interests, you have the right to object — see “Your rights” below.",
        ],
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        blocks: [
          "We share your information only with the service providers that run this site for us, and only as far as each one needs:",
          {
            terms: [
              [
                "Supabase",
                "Stores the database with booking requests, and provides live updates. Data is stored in [[SUPABASE_REGION]].",
              ],
              [
                "Vercel",
                "Hosts the website and keeps server logs. Requests are processed in [[VERCEL_REGION]].",
              ],
              [
                "Resend",
                "Sends the emails about your request: the notification to us, and the confirmation to you.",
              ],
              [
                "[[HOST_EMAIL_PROVIDER]]",
                "Our email provider, where notifications of your request are received and where we correspond with you.",
              ],
              [
                "OpenStreetMap Foundation",
                "Supplies the map images and receives your IP address when the map loads. It acts under its own privacy policy.",
              ],
            ],
          },
          "We may also disclose information when the law requires it, or where it is needed to establish, exercise or defend legal claims. We do not share it with anyone else.",
        ],
      },
      {
        id: "transfers",
        heading: "International transfers",
        blocks: [
          "We manage bookings from Israel. The European Commission has recognised Israel as providing an adequate level of protection for personal data.",
          "Some of our service providers are based in, or process data in, the United States or other countries outside the European Economic Area. For those transfers we rely on [[TRANSFER_MECHANISM]]. You can ask us for more information about these safeguards.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        blocks: [
          {
            terms: [
              [
                "Booking requests that did not become a booking",
                `${count(retention.unconfirmedMonths, "month", "months")} after the requested check-out date`,
              ],
              [
                "Confirmed bookings",
                `${count(retention.confirmedYears, "year", "years")} after check-out, for tax and accounting records`,
              ],
              ["IP address and email address used to prevent abuse", `Up to ${retention.counterHours} hours`],
              ["Hosting server logs", "[[HOSTING_LOG_RETENTION]]"],
              ["Your language choice", "On your device, until you clear your browser’s site data"],
            ],
          },
          "When the period ends we delete the information, or make it anonymous so it can no longer identify you.",
        ],
      },
      {
        id: "security",
        heading: "How we protect it",
        blocks: [
          "The site uses encrypted connections (HTTPS). Booking requests can be seen only by the hosts, through password-protected accounts; passwords are stored only in hashed form, and the database cannot be read from the public internet.",
          "No system is completely secure. If a security incident puts your information at risk, we will notify you and the relevant authorities as the law requires.",
        ],
      },
      {
        id: "rights",
        heading: "Your rights",
        blocks: [
          "You can ask us, free of charge:",
          {
            list: [
              "for access to the personal information we hold about you, and a copy of it;",
              "to correct information that is wrong, incomplete, unclear or out of date;",
              "to delete your information;",
              "to restrict how we use it;",
              "to object to our use of it where we rely on our legitimate interests;",
              "to receive the information you gave us in a portable format;",
              "to withdraw any consent you have given, at any time.",
            ],
          },
          "Some of these rights come from the GDPR and some from Israeli law, and each applies where that law applies to you. Under Israeli law you have the right to inspect the information held about you and to ask for it to be corrected or deleted if it is not correct, complete, clear or up to date.",
          `To make a request, email ${op.email}. We may ask you to confirm your identity first. We will answer within one month. If we cannot do what you ask, we will explain why and tell you how you can challenge our decision.`,
          { heading: "Complaints" },
          "If you are unhappy with how we handle your information, please contact us first. You also have the right to complain to a data protection authority: in the EU, the authority in the country where you live or work, or in Greece, the Hellenic Data Protection Authority; in Israel, the Privacy Protection Authority.",
        ],
      },
      {
        id: "children",
        heading: "Children",
        blocks: [
          "This site is not aimed at children, and booking requests must be made by an adult. If you believe a child has sent us their information, contact us and we will delete it.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies and similar technologies",
        blocks: [
          "When you first visit, we ask whether we may use analytics and marketing cookies. Strictly necessary cookies and storage do not need consent; everything else stays off until you agree, and refusing is as easy as agreeing. These are all the cookies and similar technologies the site uses:",
          {
            table: {
              caption: "Cookies and similar technologies used on this site",
              head: ["Name", "Provider", "Type", "Purpose", "Category", "Duration"],
              rows: [
                [
                  "greenberg-villa:language",
                  "Green Villa",
                  "Local storage",
                  "Remembers the language you chose, so the site opens in it next time.",
                  "Strictly necessary",
                  "Until you clear your browser’s site data",
                ],
                [
                  "greenberg-villa:cookie-consent",
                  "Green Villa",
                  "Local storage",
                  "Records your cookie choices and when you made them, so we do not ask on every page.",
                  "Strictly necessary",
                  "6 months, then we ask again",
                ],
                [
                  "villa_admin_session",
                  "Green Villa",
                  "Cookie (HttpOnly)",
                  "Keeps the hosts signed in to the booking administration. It is never set for guests.",
                  "Strictly necessary",
                  "8 hours",
                ],
                [
                  "__cf_bm",
                  "Cloudflare, for Supabase (third party, supabase.co)",
                  "Cookie (HttpOnly)",
                  "Tells people apart from automated bots when your browser loads the villa’s photos or live availability updates from our database provider.",
                  "Strictly necessary",
                  "30 minutes",
                ],
              ],
            },
          },
          "Analytics and marketing: we use none at the moment. If we add any, they will not load or set cookies until you have agreed, and we will list them in this table first.",
          "The map images from OpenStreetMap and the site’s fonts (served from our own site) set no cookies. OpenStreetMap does receive your IP address when the map loads, as described above.",
          "We keep your choice for 6 months and then ask again. You can change or withdraw it at any time, as easily as you gave it:",
          { cookieSettings: true },
          "You can also use “Cookie settings” at the bottom of any page.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        blocks: [
          "We may update this policy. The date at the top of the page shows when it last changed. If we make a significant change, we will say so clearly on this page.",
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        blocks: [
          "For any question about this policy or your information:",
          { contact: true },
        ],
      },
    ],
  },

  terms: {
    title: "Terms & Booking Conditions",
    summary:
      "The conditions that apply when you book Green Villa: the full price and what it includes, payment, cancellation and refunds, arrival and departure, house rules, the security deposit, safety and liability, and the law that applies. Please read them before you confirm a booking.",
    sections: [
      {
        id: "booking",
        heading: "Making a booking",
        blocks: [
          `These conditions apply to every stay at Green Villa, Edipsos, Evia, Greece ("the villa"), booked with ${op.name} ("we", "us").`,
          "Sending a request through this website is not a booking and does not commit you or us. A booking is made only when we confirm it to you in writing and you have paid as set out under “Payment”.",
          "The person who makes the booking must be an adult, is responsible for every guest in their party, and must make sure the details they give us are correct.",
          `The villa is registered in the Greek short-term rental property registry under number (AMA) ${op.ama}.`,
        ],
      },
      {
        id: "price",
        heading: "Price, fees and taxes",
        blocks: [
          "The price we confirm to you in writing is the total price of your stay, in the currency stated in our confirmation. Before you confirm, we will tell you every amount you will have to pay.",
          {
            terms: [
              ["Included in the price", "[[PRICE_INCLUDES]]"],
              ["Charged in addition", "[[EXTRA_FEES]]"],
              ["Taxes and statutory fees", "[[TAXES_AND_FEES]]"],
            ],
          },
          "There are no other charges. The security deposit is not a charge: it is returned as described below.",
        ],
      },
      {
        id: "payment",
        heading: "Payment",
        blocks: ["[[PAYMENT_TERMS]]"],
      },
      {
        id: "cancellation",
        heading: "Cancellation and refunds",
        blocks: [
          { heading: "If you cancel" },
          "[[CANCELLATION_POLICY]]",
          `Please cancel in writing, to ${op.email}. The date we receive your message is the date of cancellation.`,
          { heading: "Refunds" },
          "Any refund due is paid to the method you paid with, within [[REFUND_TIMEFRAME]].",
          { heading: "If we cancel" },
          "If we have to cancel your booking, we will refund everything you paid, in full.",
          { heading: "Events beyond anyone’s control" },
          "If your stay is prevented by events that neither you nor we can control — such as a natural disaster, wildfire, or an official travel ban — [[FORCE_MAJEURE_POLICY]].",
          "Nothing in this section takes away a right to cancel, or to a refund, that mandatory consumer law gives you. We recommend travel insurance that covers cancellation.",
        ],
      },
      {
        id: "arrival",
        heading: "Check-in and check-out",
        blocks: [
          {
            terms: [
              ["Check-in", "From [[CHECK_IN_TIME]]"],
              ["Check-out", "By [[CHECK_OUT_TIME]]"],
            ],
          },
          "We will agree the arrangements for your arrival and the handover of keys with you before your stay. An earlier arrival or later departure is possible only if we agree it in advance.",
        ],
      },
      {
        id: "house-rules",
        heading: "House rules",
        blocks: [
          {
            terms: [
              ["Maximum number of guests", "[[MAX_OCCUPANCY]], including children. Only the guests named in the booking may stay overnight."],
              ["Smoking", "[[SMOKING_POLICY]]"],
              ["Pets", "[[PETS_POLICY]]"],
              ["Parties and events", "[[EVENTS_POLICY]]"],
              ["Quiet hours", "[[QUIET_HOURS]]"],
            ],
          },
          {
            list: [
              "Please respect the neighbours and the natural surroundings.",
              "Follow official fire-risk warnings. Use a barbecue or open flame only where one is provided, and never when it is prohibited.",
              "Tell us promptly about any damage or anything that is not working.",
              "Leave the villa in a reasonable condition when you depart.",
            ],
          },
          "[[ADDITIONAL_HOUSE_RULES]]",
        ],
      },
      {
        id: "deposit",
        heading: "Security deposit",
        blocks: [
          {
            terms: [
              ["Amount", "[[SECURITY_DEPOSIT_AMOUNT]]"],
              ["How it is paid", "[[SECURITY_DEPOSIT_METHOD]]"],
              ["When it is returned", "Within [[SECURITY_DEPOSIT_RETURN]] of check-out"],
            ],
          },
          "We may keep back from the deposit only the reasonable cost of repairing damage beyond normal wear and tear, of replacing missing items, or of cleaning beyond normal. If we do, we will send you an itemised account with evidence. If the cost is greater than the deposit, you remain responsible for the difference.",
        ],
      },
      {
        id: "safety",
        heading: "Pool, sea and safety",
        blocks: [
          { heading: "The pool" },
          {
            list: [
              "There is no lifeguard. Guests use the pool at their own risk.",
              "Children must be supervised by an adult at all times, in and around the pool.",
              "Do not use the pool after drinking alcohol, and keep glass away from the pool area.",
              "[[POOL_RULES]]",
            ],
          },
          { heading: "The sea and outdoor activities" },
          "The beaches, the sea, the thermal springs and the other places nearby are not run or supervised by us. Swimming and other activities there are at your own risk. Follow local warnings and flags, and take extra care with children.",
        ],
      },
      {
        id: "liability",
        heading: "Limitation of liability",
        blocks: [
          "We are not responsible for the loss of, theft of, or damage to guests’ personal belongings, including vehicles and their contents, unless it is caused by our negligence.",
          "We are not responsible for interruptions to water, electricity, internet or other services that are outside our control, but we will do our best to have them restored quickly.",
          "Otherwise, our total liability to you in connection with a booking is limited to [[LIABILITY_CAP]].",
          "Nothing in these conditions limits or excludes our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot be limited or excluded by law.",
          "You are responsible for damage caused by you or any member of your party.",
        ],
      },
      {
        id: "privacy",
        heading: "Your personal information",
        blocks: [
          "We handle the personal information you give us as described in our Privacy Policy.",
          { see: "privacy" },
        ],
      },
      {
        id: "law",
        heading: "Governing law and disputes",
        blocks: [
          "These conditions are governed by [[GOVERNING_LAW]]. Any dispute will be decided by the courts of [[JURISDICTION]].",
          "This does not take away any protection given to you by mandatory law that applies to you. If something goes wrong, please contact us first — most problems can be solved directly.",
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        blocks: [{ contact: true }],
      },
    ],
  },

  accessibility: {
    title: "Accessibility Statement",
    summary:
      "We want everyone to be able to find out about Green Villa and ask to book it, whatever device or assistive technology they use. This statement describes the accessibility standard this website follows, what we have done to meet it, what does not yet work as well as it should, and who to contact if something gets in your way. It covers this website only, not the villa itself.",
    sections: [
      {
        id: "standard",
        heading: "The standard we follow",
        blocks: [
          "The website has been adapted to meet Israeli Standard 5568, which adopts the Web Content Accessibility Guidelines (WCAG) 2.0 at level AA. For contrast of buttons, form fields and the keyboard focus indicator, and for use at high zoom, we also applied the stricter WCAG 2.1 criteria.",
          "The site was reviewed in English, Hebrew and Greek with automated testing (axe-core, in Google Chrome) and by hand for the things a tool cannot check, such as the order of keyboard focus and the contrast of text over photos. After the changes described below, the automated tests found no failures. Some limitations remain; they are listed further down this page.",
        ],
      },
      {
        id: "what-we-did",
        heading: "What we have made accessible",
        blocks: [
          {
            list: [
              "Keyboard: everything can be used with the keyboard alone. A \"Skip to content\" link is the first thing you reach, and every link, button and form field shows a clearly visible focus outline.",
              "Structure: each page has one main heading and an orderly heading structure, labelled navigation areas and a main content area, so screen reader users can move around the page quickly.",
              "Languages: the site is available in English, Hebrew and Greek. Each page declares its language, and Hebrew is shown right to left, including arrows, the calendar and the photo gallery. Phone numbers, the email address and coordinates are displayed in the correct order in Hebrew.",
              "Images: photos have text descriptions in all three languages; purely decorative images and icons are hidden from screen readers.",
              "Colour and contrast: text has a contrast of at least 4.5:1 with its background, and form field borders and the focus outline at least 3:1. Colour is never the only way information is shown — booked dates in the availability calendar are also struck through.",
              "Zoom: the site can be enlarged to 200% and 400% without having to scroll sideways, and the mobile menu can be scrolled when enlarged.",
              "Photo gallery: when a photo is opened, focus moves into the viewer and stays there until it is closed with Esc or the \"Close gallery\" button, and then returns to the photo you opened. The arrow keys follow the reading direction, and each new photo is announced.",
              "Booking request form: every field has a label, required fields are marked, and errors are linked to their fields. If a field is wrong, you hear a summary and focus moves to the first field that needs attention.",
              "Availability calendar: each date is read out with its status (for example, booked).",
              "Map: the map can be panned and zoomed with the keyboard, and its buttons are named in the page's language. The same information is also given as text next to it: the coordinates, a link to open the location in a maps app, and nearby places with their distances.",
              "Motion: if your device is set to reduce motion, animations and smooth scrolling are switched off.",
            ],
          },
        ],
      },
      {
        id: "limitations",
        heading: "Known limitations",
        blocks: [
          "Despite our efforts, some parts of the site are not yet fully accessible. These are the ones we know about:",
          {
            list: [
              "Photo descriptions: some of the villa photos currently have a description that belongs to a different photo (for example, a photo of the living room described as the master bedroom). Corrected descriptions have been written but not yet entered on the site. Until they are, what a screen reader reads for these photos may not match what they show.",
              "Descriptions added later: if we add a new photo, its description may be available in English only until it is translated. It is marked as English, so a screen reader reads it with an English voice.",
              "Text over the main photo: the contrast of the title and subtitle over the large photo at the top of the page was checked by calculation, because automated tools cannot measure text over images. On an unusually short, wide window, over a very bright photo, the subtitle may fall slightly below the required contrast.",
              "The map is visual by nature. Please use the text next to it, which gives the same information. The map provider's attribution line is third-party content and was not tested.",
              "In Hebrew, the quotation marks in the hosts' quote may appear in the wrong place around the year.",
              "The site has not yet been tested with a screen reader in use (such as NVDA or VoiceOver). Its structure was checked with automated tools and by inspecting the information it exposes to assistive technology.",
              "Automated testing was done in Google Chrome only. Other browsers were not tested systematically.",
              "The hosts' management area (not used by guests) is in English only, and on narrow screens its table of booking requests has to be scrolled sideways.",
            ],
          },
        ],
      },
      {
        id: "contact",
        heading: "Accessibility coordinator",
        blocks: [
          "If you have difficulty using any part of this site, find something that is not accessible, or need information in another format, please contact our accessibility coordinator. It helps to tell us which page you were on, what you were trying to do, and which browser and assistive technology (if any) you use.",
          { coordinator: true },
          "You are also welcome to contact the coordinator with questions about access to the villa itself.",
        ],
      },
    ],
  },
};
