import { el } from "./el";
import { en } from "./en";
import { he } from "./he";
import type { Dictionary, Language } from "./types";

export const dictionaries: Record<Language, Dictionary> = { en, he, el };
