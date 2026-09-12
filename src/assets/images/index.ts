// Only the hosts portrait is still bundled — the hero, lifestyle, gallery and
// explore photos are served by the API from `server/data/uploads`.
//
// The other .jpg files in this folder are NOT dead: the API server copies them
// once, on a first run, to seed `server/data/site-images.json`. Do not delete
// them.
import hosts from "./hosts.jpg";

export const images = { hosts };
