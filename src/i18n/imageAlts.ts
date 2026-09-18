import type { Language } from "./types";

/*
  Alt text for the site photos is stored by the API as a single English string
  per image — the admin is English-only. The photos the site ships with have
  known descriptions, so those are translated here, keyed by the exact English
  text. An alt the admin has since written is not in this table, and is shown
  as-is and marked `lang="en"`, so a screen reader reading a Hebrew or Greek
  page switches voice for it rather than mispronouncing it.

  Keep the keys in step with the seed descriptions in the API's media module.
*/
const translations: Record<string, { he: string; el: string }> = {
  "Green Villa seen from the garden, with the bay behind it": {
    he: "וילה גרין במבט מהגינה, ומאחוריה המפרץ",
    el: "Η Green Villa από τον κήπο, με τον κόλπο πίσω της",
  },
  "Sun-drenched bedroom opening onto the villa's sea-facing terrace": {
    he: "חדר שינה מואר בשמש הנפתח אל המרפסת הפונה לים",
    el: "Ηλιόλουστο υπνοδωμάτιο που ανοίγει στη βεράντα με θέα στη θάλασσα",
  },
  "Infinity pool overlooking the Aegean at sunset": {
    he: "בריכת אינסוף המשקיפה אל הים האגאי בשקיעה",
    el: "Πισίνα υπερχείλισης με θέα στο Αιγαίο στο ηλιοβασίλεμα",
  },
  "Master bedroom with linen bedding and sea view": {
    he: "חדר השינה הראשי עם מצעי פשתן ונוף לים",
    el: "Κύριο υπνοδωμάτιο με λινά σεντόνια και θέα στη θάλασσα",
  },
  "Open-plan living room in Mediterranean minimalist style": {
    he: "סלון פתוח בסגנון ים־תיכוני מינימליסטי",
    el: "Ενιαίο σαλόνι σε μεσογειακό μινιμαλιστικό ύφος",
  },
  "Stone terrace with lounge seating above the cliffs": {
    he: "מרפסת אבן עם פינת ישיבה מעל הצוקים",
    el: "Πέτρινη βεράντα με καθιστικό πάνω από τα βράχια",
  },
  "Poolside sun deck framed by olive trees": {
    he: "סיפון שיזוף לצד הבריכה, מוקף עצי זית",
    el: "Χώρος ηλιοθεραπείας δίπλα στην πισίνα, ανάμεσα σε ελιές",
  },
  "Sunset over the bay seen from the villa": {
    he: "שקיעה מעל המפרץ, במבט מהווילה",
    el: "Ηλιοβασίλεμα πάνω από τον κόλπο, όπως φαίνεται από τη βίλα",
  },
  "Al fresco dining terrace lit for the evening": {
    he: "מרפסת אוכל פתוחה מוארת לקראת הערב",
    el: "Υπαίθρια βεράντα φαγητού φωτισμένη για το βράδυ",
  },
  "Thermal water steaming off the rocks into the sea at Loutra Gialtron": {
    he: "מים תרמיים מהבילים זורמים מהסלעים אל הים בלוטרה יאלטרון",
    el: "Ιαματικά νερά αχνίζουν από τα βράχια προς τη θάλασσα στα Λουτρά Γιάλτρων",
  },
  "A taverna table laid under an old plane tree above the sea": {
    he: "שולחן טברנה ערוך מתחת לעץ דולב עתיק מעל הים",
    el: "Τραπέζι ταβέρνας στρωμένο κάτω από έναν γέρικο πλάτανο πάνω από τη θάλασσα",
  },
  "A dirt track winding through the wooded hills behind the bay": {
    he: "דרך עפר מתפתלת בין הגבעות המיוערות שמאחורי המפרץ",
    el: "Χωματόδρομος που ελίσσεται στους δασωμένους λόφους πίσω από τον κόλπο",
  },
  "The sheltered turquoise bay at Gregolimano, enclosed by headlands": {
    he: "המפרץ המוגן בגוון טורקיז בגרגולימנו, תחום בין לשונות יבשה",
    el: "Ο προστατευμένος τιρκουάζ κόλπος του Γρεγολίμανου, ανάμεσα σε ακρωτήρια",
  },
  "The waterfront of Loutra Edipsou, lined with houses and fishing boats": {
    he: "טיילת החוף של לוטרה אדיפסו, לאורכה בתים וסירות דיג",
    el: "Η παραλία των Λουτρών Αιδηψού, με σπίτια και ψαροκάικα",
  },
  "The Drymona waterfalls dropping into a green forest pool": {
    he: "מפלי דרימונה נשפכים אל בריכה ירוקה ביער",
    el: "Οι καταρράκτες της Δρυμώνας πέφτουν σε μια πράσινη λίμνη μέσα στο δάσος",
  },

  /*
    Corrected descriptions. Most of the seed alts above describe a different
    photo from the one they ship with (the "master bedroom" is the living room,
    the "dining terrace" is the beach jetty). These describe the seed photos as
    they actually are; once the admin pastes them into each photo's
    Description, the translations below take over. See
    docs/accessibility-audit.md for which text goes with which photo.
  */
  "Green Villa's white two-storey façade with blue shutters, seen across the lawn": {
    he: "החזית הלבנה בת שתי הקומות של וילה גרין, עם תריסים כחולים, במבט מעבר למדשאה",
    el: "Η λευκή διώροφη πρόσοψη της Green Villa με μπλε παντζούρια, πέρα από το γκαζόν",
  },
  "Balcony table and two wooden chairs looking out over the garden to the sea": {
    he: "שולחן ושני כיסאות עץ במרפסת, הצופים מעל הגינה אל הים",
    el: "Τραπέζι και δύο ξύλινες καρέκλες στο μπαλκόνι, με θέα πάνω από τον κήπο στη θάλασσα",
  },
  "Raised plunge pool under white shade sails in the garden, with the sea beyond": {
    he: "בריכה מוגבהת תחת מפרשי צל לבנים בגינה, והים ברקע",
    el: "Υπερυψωμένη πισίνα κάτω από λευκά πανιά σκίασης στον κήπο, με τη θάλασσα πιο πέρα",
  },
  "Living room with two grey sofas, glass coffee tables and a jute rug": {
    he: "סלון עם שתי ספות אפורות, שולחנות קפה מזכוכית ושטיח יוטה",
    el: "Σαλόνι με δύο γκρι καναπέδες, γυάλινα τραπεζάκια και χαλί από γιούτα",
  },
  "Dining table set with flowers in the open-plan living area, glass doors open to the garden": {
    he: "שולחן אוכל ועליו פרחים בחלל הפתוח, ודלתות זכוכית פתוחות אל הגינה",
    el: "Τραπεζαρία με λουλούδια στον ενιαίο χώρο, με τις τζαμόπορτες ανοιχτές προς τον κήπο",
  },
  "Double bedroom with white linen, a ceiling fan and French windows onto a balcony": {
    he: "חדר שינה זוגי עם מצעים לבנים, מאוורר תקרה ודלתות צרפתיות אל מרפסת",
    el: "Δίκλινο υπνοδωμάτιο με λευκά σεντόνια, ανεμιστήρα οροφής και μπαλκονόπορτες",
  },
  "Balcony with a small table and two director's chairs overlooking the sea": {
    he: "מרפסת עם שולחן קטן ושני כיסאות במאי, הצופה אל הים",
    el: "Μπαλκόνι με τραπεζάκι και δύο καρέκλες σκηνοθέτη, με θέα στη θάλασσα",
  },
  "Covered outdoor dining area with a long table, white chairs and a built-in barbecue": {
    he: "פינת אוכל מקורה בחוץ עם שולחן ארוך, כיסאות לבנים ומנגל בנוי",
    el: "Σκεπαστή υπαίθρια τραπεζαρία με μακρύ τραπέζι, λευκές καρέκλες και χτιστή ψησταριά",
  },
  "Wooden jetty on the pebble beach with striped loungers and towels": {
    he: "מזח עץ בחוף החלוקים עם כיסאות נוח ומגבות מפוספסים",
    el: "Ξύλινη προβλήτα στην παραλία με βότσαλα, με ριγέ ξαπλώστρες και πετσέτες",
  },
};

export interface LocalizedAlt {
  alt: string;
  /** Set when the text is not in the page's language. */
  lang?: Language;
}

/**
 * The alt text for a stored photo, in the visitor's language where a
 * translation exists. `fallback` stands in when the admin left the alt empty,
 * so a photo that carries content is never silently made decorative.
 */
export function localizeAlt(alt: string, language: Language, fallback = ""): LocalizedAlt {
  const text = alt.trim();
  if (!text) return { alt: fallback };
  if (language === "en") return { alt: text };

  const translated = translations[text]?.[language];
  return translated ? { alt: translated } : { alt: text, lang: "en" };
}
