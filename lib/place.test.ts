import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPlace } from "./place.ts";

test("states lose the country suffix and get title case", () => {
  assert.equal(formatPlace("BAJA CALIFORNIA, MEXICO"), "Baja California");
  assert.equal(formatPlace("BAJA CALIFORNIA SUR, MEXICO"), "Baja California Sur");
  assert.equal(formatPlace("OAXACA, MEXICO"), "Oaxaca");
  assert.equal(formatPlace("CHIAPAS, MEXICO"), "Chiapas");
});

test("offshore and coast prefixes become Spanish", () => {
  assert.equal(formatPlace("OFFSHORE OAXACA, MEXICO"), "Costa afuera de Oaxaca");
  assert.equal(formatPlace("OFF COAST OF JALISCO, MEXICO"), "Costa afuera de Jalisco");
  assert.equal(formatPlace("NEAR COAST OF GUERRERO, MEXICO"), "Cerca de la costa de Guerrero");
});

test("accents, directions and gulfs", () => {
  assert.equal(formatPlace("MICHOACAN, MEXICO"), "Michoacán");
  assert.equal(formatPlace("SOUTHERN MEXICO"), "Sur de México");
  assert.equal(formatPlace("CENTRAL MEXICO"), "Centro de México");
  assert.equal(formatPlace("GULF OF CALIFORNIA"), "Golfo de California");
  assert.equal(formatPlace("MEXICO-GUATEMALA BORDER REGION"), "Frontera México-Guatemala");
  assert.equal(formatPlace("WESTERN TEXAS"), "Oeste de Texas");
});

test("unknown names fall back to title case; empty stays empty; no trailing comma part is just the country", () => {
  assert.equal(formatPlace("SOME NEW REGION"), "Some New Region");
  assert.equal(formatPlace(""), "");
  assert.ok(!formatPlace("OFFSHORE VERACRUZ, MEXICO").includes(","));
});

test("regions that are not states", () => {
  assert.equal(formatPlace("YUCATAN PENINSULA, MEXICO"), "Península de Yucatán");
  assert.equal(formatPlace("CARIBBEAN SEA"), "Mar Caribe");
  assert.equal(formatPlace("OFF COAST OF CENTRAL AMERICA"), "Costa afuera de Centroamérica");
  assert.equal(formatPlace("EASTERN PACIFIC OCEAN"), "Océano Pacífico oriental");
  assert.equal(formatPlace("NEW MEXICO"), "Nuevo México");
  assert.equal(formatPlace("OFFSHORE GUATEMALA"), "Costa afuera de Guatemala");
});
