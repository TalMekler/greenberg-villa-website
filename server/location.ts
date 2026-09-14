import { db } from "./db";
import { defaultLocation, isValidLocation, type VillaLocation } from "../src/lib/location";

/** The map pin, held in a single row so an update can never fork it. */
const selectPin = db.prepare(`SELECT latitude, longitude, zoom FROM location WHERE id = 1`);
const upsertPin = db.prepare(`
  INSERT INTO location (id, latitude, longitude, zoom) VALUES (1, @latitude, @longitude, @zoom)
  ON CONFLICT (id) DO UPDATE SET latitude = @latitude, longitude = @longitude, zoom = @zoom
`);

export async function readLocation(): Promise<VillaLocation> {
  const row = selectPin.get() as VillaLocation | undefined;
  if (!row) return defaultLocation;
  if (!isValidLocation(row)) {
    console.warn("The stored location is not valid — using the default.");
    return defaultLocation;
  }
  return row;
}

export async function writeLocation(next: VillaLocation): Promise<VillaLocation> {
  upsertPin.run(next);
  return next;
}
