import { query, queryOne } from "./db";
import { defaultLocation, isValidLocation, type VillaLocation } from "../src/lib/location";

/** The map pin, held in a single row so an update can never fork it. */

export async function readLocation(): Promise<VillaLocation> {
  const row = await queryOne<VillaLocation>(
    `SELECT latitude, longitude, zoom FROM location WHERE id = 1`,
  );
  if (!row) return defaultLocation;
  if (!isValidLocation(row)) {
    console.warn("The stored location is not valid — using the default.");
    return defaultLocation;
  }
  return row;
}

export async function writeLocation(next: VillaLocation): Promise<VillaLocation> {
  await query(
    `INSERT INTO location (id, latitude, longitude, zoom) VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO UPDATE
        SET latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            zoom = EXCLUDED.zoom`,
    [next.latitude, next.longitude, next.zoom],
  );
  return next;
}
