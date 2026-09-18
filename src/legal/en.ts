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
          "Your language choice, so the site opens in the same language next time. See the cookies section below.",
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
                "Remembering your language",
                "Strictly necessary to provide the site in the language you chose. It stays on your device.",
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
          "We do not set any cookies for visitors, and we use no analytics or advertising cookies.",
          {
            terms: [
              [
                "Language choice (browser local storage)",
                "Remembers which language you chose. Strictly necessary, so it does not need consent. It stays on your device until you clear your browser’s site data.",
              ],
              [
                "Sign-in cookie (hosts only)",
                "Keeps the hosts signed in to the booking administration for up to 8 hours. It is never set for guests.",
              ],
            ],
          },
          "The map (OpenStreetMap) and the live availability updates (Supabase) are loaded from those providers, so they receive your IP address as described above. We do not use them to track you.",
          "Use “Cookie settings” at the bottom of any page to come back to this section.",
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
      "We want everyone to be able to use this website. Our full accessibility statement is being prepared and will be published on this page.",
    sections: [
      {
        id: "statement",
        heading: "Our commitment",
        blocks: [
          "The site is designed to meet the Web Content Accessibility Guidelines (WCAG) 2.0 at level AA, the level adopted by Israeli Standard 5568.",
          "[[ACCESSIBILITY_STATEMENT]]",
        ],
      },
      {
        id: "contact",
        heading: "Need help?",
        blocks: [
          "If you have difficulty using any part of this site, or need information in another format, contact us and we will help:",
          { contact: true },
        ],
      },
    ],
  },
};
