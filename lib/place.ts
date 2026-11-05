/** Spanish names for the few phrases that are not just a place name. */
const PHRASES: Record<string, string> = {
  "gulf of california": "Golfo de California",
  "gulf of mexico": "Golfo de México",
  "mexico-guatemala border region": "Frontera México-Guatemala",
  "yucatan peninsula": "Península de Yucatán",
  "caribbean sea": "Mar Caribe",
  "central america": "Centroamérica",
  "eastern pacific ocean": "Océano Pacífico oriental",
  "new mexico": "Nuevo México",
};

const WORDS: Record<string, string> = {
  mexico: "México",
  michoacan: "Michoacán",
  yucatan: "Yucatán",
  leon: "León",
  potosi: "Potosí",
  queretaro: "Querétaro",
  nuevo: "Nuevo",
};

const PREFIXES: [string, string][] = [
  ["OFFSHORE ", "Costa afuera de "],
  ["OFF COAST OF ", "Costa afuera de "],
  ["NEAR COAST OF ", "Cerca de la costa de "],
];

const DIRECTIONS: Record<string, string> = {
  NORTHERN: "Norte de ",
  SOUTHERN: "Sur de ",
  CENTRAL: "Centro de ",
  EASTERN: "Este de ",
  WESTERN: "Oeste de ",
};

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w) => WORDS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/**
 * Turns an EMSC region name ("OFFSHORE OAXACA, MEXICO") into readable Spanish ("Costa afuera de Oaxaca").
 * The country suffix is dropped so the text after the last comma is never just "México". Unknown names fall
 * back to plain title case.
 */
export function formatPlace(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/,\s*MEXICO$/, "");
  if (!s) return "";

  // Whole-name phrases first, so "EASTERN PACIFIC OCEAN" is not read as a direction plus a place.
  if (PHRASES[s.toLowerCase()]) return PHRASES[s.toLowerCase()];

  let prefix = "";
  for (const [from, to] of PREFIXES) {
    if (s.startsWith(from)) {
      prefix = to;
      s = s.slice(from.length);
      break;
    }
  }
  const dir = s.split(" ")[0];
  if (!prefix && DIRECTIONS[dir] && s.includes(" ")) {
    prefix = DIRECTIONS[dir];
    s = s.slice(dir.length + 1);
  }

  const phrase = PHRASES[s.toLowerCase()];
  return prefix + (phrase ?? titleCase(s));
}
