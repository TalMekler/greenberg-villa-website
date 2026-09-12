import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultLocation, isValidLocation, type VillaLocation } from "../src/lib/location";

const here = dirname(fileURLToPath(import.meta.url));
const dataFile = join(here, "data", "location.json");

let cache: VillaLocation | null = null;
let writing: Promise<void> = Promise.resolve();

export async function readLocation(): Promise<VillaLocation> {
  if (cache) return cache;
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as VillaLocation;
    if (isValidLocation(parsed)) {
      cache = parsed;
      return cache;
    }
    console.warn(`${dataFile} is not a valid location — using the default.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read ${dataFile}, using the default:`, error);
    }
  }
  cache = defaultLocation;
  return cache;
}

export async function writeLocation(next: VillaLocation): Promise<VillaLocation> {
  cache = next;
  writing = writing.then(async () => {
    await mkdir(dirname(dataFile), { recursive: true });
    const temp = `${dataFile}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
    await rename(temp, dataFile);
  });
  await writing;
  return next;
}
