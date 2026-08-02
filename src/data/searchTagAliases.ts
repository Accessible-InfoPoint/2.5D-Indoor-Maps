interface SearchTagAliasEntry {
  tag: string;
  value: string;
  aliases: string[];
}

interface SearchTagAliasGroup {
  /**
   * Human-readable group label for keeping public-building room aliases tidy.
   */
  group: string;
  entries: SearchTagAliasEntry[];
}

/**
 * Application search aliases for OSM tag values.
 *
 * The room and amenity values are based on public-building-relevant OSM wiki
 * values. Aliases include English and German terms that users might type even
 * when the OSM value itself stays language-neutral.
 */
export const searchTagAliasGroups: SearchTagAliasGroup[] = [
  {
    group: "circulation",
    entries: [
      roomAliases("entrance", ["lobby", "foyer", "entrance hall", "eingang", "foyer"]),
      roomAliases("corridor", ["hallway", "hall", "passage", "flur", "gang", "korridor"]),
      roomAliases("hall", ["entrance hall", "main hall", "halle", "eingangshalle"]),
      roomAliases("stairs", ["staircase", "steps", "stairs", "treppe", "treppenhaus"]),
      roomAliases("elevator", ["lift", "elevator", "aufzug", "fahrstuhl"]),
      roomAliases("escalator", ["moving stairs", "escalator", "rolltreppe"]),
    ],
  },
  {
    group: "education and university",
    entries: [
      roomAliases("classroom", [
        "seminar room",
        "seminar",
        "teaching room",
        "class",
        "classroom",
        "seminarraum",
        "unterrichtsraum",
        "klassenraum",
      ]),
      roomAliases("lecture", [
        "lecture hall",
        "lecture room",
        "auditorium",
        "hoersaal",
        "hörsaal",
        "vorlesungssaal",
      ]),
      roomAliases("auditorium", ["auditorium", "aula", "hoersaal", "hörsaal"]),
      roomAliases("laboratory", ["lab", "laboratory", "lab room", "labor", "laborraum"]),
      roomAliases("computer", [
        "computer room",
        "computer lab",
        "pc pool",
        "rechnerraum",
        "computerraum",
      ]),
      roomAliases("media", ["media room", "medienraum", "multimedia room"]),
      roomAliases("library", ["library", "reading room", "bibliothek", "lesesaal"]),
      roomAliases("carrel", [
        "study room",
        "study booth",
        "study carrel",
        "lernraum",
        "arbeitskabine",
      ]),
      roomAliases("refectory", ["canteen", "dining hall", "mensa", "kantine", "speisesaal"]),
    ],
  },
  {
    group: "work and administration",
    entries: [
      roomAliases("office", ["office", "bureau", "büro", "buero", "sprechzimmer"]),
      roomAliases("conference", [
        "meeting room",
        "conference room",
        "meeting",
        "konferenzraum",
        "besprechungsraum",
        "sitzungsraum",
        "sitzungssaal",
        "tagungsraum",
      ]),
      roomAliases("administration", [
        "administration",
        "admin office",
        "verwaltung",
        "verwaltungsraum",
      ]),
      roomAliases("reception", ["reception", "front desk", "service desk", "empfang", "rezeption"]),
      roomAliases("information", [
        "information",
        "info desk",
        "information desk",
        "auskunft",
        "infopunkt",
      ]),
      roomAliases("staff", ["staff room", "personalraum", "mitarbeiterraum"]),
      roomAliases("break", ["break room", "pausenraum", "aufenthaltsraum"]),
      roomAliases("common", [
        "common room",
        "community room",
        "gemeinschaftsraum",
        "aufenthaltsraum",
      ]),
      roomAliases("lounge", ["lounge", "waiting lounge", "aufenthaltsraum", "wartebereich"]),
      roomAliases("archive", ["archive", "records room", "archiv", "aktenraum"]),
      roomAliases("copier", [
        "copy room",
        "copier room",
        "printer room",
        "kopierraum",
        "druckerraum",
      ]),
      roomAliases("printer", ["printer room", "print room", "druckerraum", "kopierraum"]),
    ],
  },
  {
    group: "public services",
    entries: [
      roomAliases("toilet", ["toilet", "restroom", "bathroom", "wc", "toilette"]),
      roomAliases("washroom", ["washroom", "bathroom", "wc", "waschraum"]),
      roomAliases("showers", ["showers", "shower room", "dusche", "duschen"]),
      roomAliases("waiting", ["waiting room", "waiting area", "warteraum", "wartebereich"]),
      roomAliases("cash point", ["cash machine", "atm", "geldautomat", "automat"]),
      roomAliases("kiosk", ["kiosk", "stand", "verkaufskiosk"]),
    ],
  },
  {
    group: "transport",
    entries: [
      roomAliases("station concourse", [
        "concourse",
        "station hall",
        "main hall",
        "bahnhofshalle",
        "empfangshalle",
      ]),
      roomAliases("platform", ["platform", "track platform", "bahnsteig", "gleis"]),
      roomAliases("waiting", ["waiting room", "waiting area", "wartehalle", "warteraum"]),
      roomAliases("departure terminal", ["terminal", "departure hall", "abflughalle", "terminal"]),
      roomAliases("check-in counter", [
        "check in",
        "check-in",
        "check-in desk",
        "check-in schalter",
      ]),
      roomAliases("security check", ["security", "security checkpoint", "sicherheitskontrolle"]),
      roomAliases("baggage carousel", [
        "baggage claim",
        "luggage belt",
        "gepäckband",
        "gepaeckband",
      ]),
      roomAliases("cash point", [
        "ticket machine",
        "ticket office",
        "fahrkartenautomat",
        "fahrkartenschalter",
      ]),
    ],
  },
  {
    group: "public amenities",
    entries: [
      roomAliases("canteen", ["canteen", "cafeteria", "mensa", "kantine"]),
      roomAliases("dining", ["dining room", "dining hall", "speisesaal", "essensraum"]),
      roomAliases("restaurant", ["restaurant", "gaststätte", "gaststaette"]),
      roomAliases("bar", ["bar"]),
      roomAliases("gallery", ["gallery", "exhibition room", "galerie", "ausstellung"]),
      roomAliases("auditorium", ["auditorium", "aula", "veranstaltungssaal"]),
      roomAliases("function", ["event room", "function room", "veranstaltungsraum", "saal"]),
      roomAliases("sport", ["sports room", "gym", "sports hall", "sportraum", "turnhalle"]),
      roomAliases("fitness", ["fitness room", "gym", "fitnessraum"]),
    ],
  },
  {
    group: "building operations",
    entries: [
      roomAliases("storage", ["storage room", "storeroom", "lager", "lagerraum", "abstellraum"]),
      roomAliases("utility", [
        "utility room",
        "service room",
        "technikraum",
        "hauswirtschaftsraum",
      ]),
      roomAliases("heating", ["heating room", "boiler room", "heizraum"]),
      roomAliases("heating system", ["heating room", "boiler room", "heizungsraum", "heizraum"]),
      roomAliases("workshop", ["workshop", "werkstatt"]),
      roomAliases("equipment", [
        "equipment room",
        "equipment storage",
        "geräteraum",
        "geraeteraum",
      ]),
      roomAliases("communication", [
        "communication room",
        "server room",
        "technikraum",
        "serverraum",
      ]),
      roomAliases("signal", ["signal room", "signal box", "stellwerk", "signalraum"]),
    ],
  },
  {
    group: "amenity sustenance",
    entries: [
      amenityAliases("cafe", ["coffee", "coffee shop", "kaffee", "café", "cafe"]),
      amenityAliases("restaurant", ["restaurant", "food", "essen", "gaststätte", "gaststaette"]),
      amenityAliases("fast_food", ["fast food", "snack", "imbiss", "schnellrestaurant"]),
      amenityAliases("food_court", ["food court", "food hall", "essensbereich", "foodcourt"]),
      amenityAliases("bar", ["bar"]),
      amenityAliases("pub", ["pub", "kneipe"]),
      amenityAliases("biergarten", ["beer garden", "biergarten"]),
      amenityAliases("ice_cream", ["ice cream", "eis", "eisdiele"]),
    ],
  },
  {
    group: "amenity education and research",
    entries: [
      amenityAliases("university", ["university", "campus", "universität", "universitaet", "uni"]),
      amenityAliases("college", ["college", "hochschule"]),
      amenityAliases("school", ["school", "schule"]),
      amenityAliases("library", ["library", "bibliothek"]),
      amenityAliases("research_institute", [
        "research institute",
        "research",
        "forschungsinstitut",
        "forschung",
      ]),
      amenityAliases("training", ["training", "training centre", "schulung", "schulungszentrum"]),
      amenityAliases("language_school", ["language school", "sprachschule"]),
      amenityAliases("music_school", ["music school", "musikschule"]),
    ],
  },
  {
    group: "amenity transport",
    entries: [
      amenityAliases("bicycle_parking", [
        "bicycle parking",
        "bike parking",
        "fahrradparken",
        "fahrradstellplatz",
        "fahrradständer",
        "fahrradstaender",
      ]),
      amenityAliases("bicycle_repair_station", [
        "bicycle repair",
        "bike repair",
        "fahrradreparatur",
        "reparaturstation",
      ]),
      amenityAliases("bicycle_rental", ["bicycle rental", "bike rental", "fahrradverleih"]),
      amenityAliases("bus_station", ["bus station", "busbahnhof", "bus station"]),
      amenityAliases("taxi", ["taxi", "taxistand"]),
      amenityAliases("ferry_terminal", ["ferry terminal", "ferry", "fähre", "faehre"]),
      amenityAliases("parking", ["parking", "car park", "parkplatz", "parken"]),
      amenityAliases("parking_entrance", ["parking entrance", "parkhauseinfahrt", "einfahrt"]),
      amenityAliases("parking_space", ["parking space", "stellplatz", "parkplatz"]),
      amenityAliases("charging_station", [
        "charging station",
        "ev charging",
        "ladestation",
        "ladesäule",
        "ladesaeule",
      ]),
      amenityAliases("vehicle_inspection", ["vehicle inspection", "tüv", "tuev", "prüfstelle"]),
    ],
  },
  {
    group: "amenity financial services",
    entries: [
      amenityAliases("atm", ["atm", "cash machine", "cashpoint", "geldautomat"]),
      amenityAliases("bank", ["bank"]),
      amenityAliases("bureau_de_change", [
        "currency exchange",
        "exchange",
        "wechselstube",
        "geldwechsel",
      ]),
      amenityAliases("payment_terminal", ["payment terminal", "pay machine", "bezahlautomat"]),
      amenityAliases("payment_centre", ["payment centre", "payment center", "zahlstelle"]),
      amenityAliases("money_transfer", ["money transfer", "geldtransfer"]),
    ],
  },
  {
    group: "amenity healthcare",
    entries: [
      amenityAliases("clinic", ["clinic", "health centre", "klinik", "ambulanz"]),
      amenityAliases("doctors", ["doctor", "doctors", "arzt", "arztpraxis"]),
      amenityAliases("dentist", ["dentist", "zahnarzt", "zahnarztpraxis"]),
      amenityAliases("hospital", ["hospital", "krankenhaus"]),
      amenityAliases("pharmacy", ["pharmacy", "chemist", "apotheke"]),
      amenityAliases("social_facility", ["social facility", "sozialstation", "sozialeinrichtung"]),
    ],
  },
  {
    group: "amenity culture and events",
    entries: [
      amenityAliases("arts_centre", [
        "arts centre",
        "arts center",
        "kunstzentrum",
        "kulturzentrum",
      ]),
      amenityAliases("cinema", ["cinema", "movie theater", "kino"]),
      amenityAliases("community_centre", [
        "community centre",
        "community center",
        "gemeindezentrum",
        "gemeinschaftszentrum",
      ]),
      amenityAliases("conference_centre", [
        "conference centre",
        "conference center",
        "kongresszentrum",
        "konferenzzentrum",
      ]),
      amenityAliases("events_venue", ["event venue", "venue", "veranstaltungsort"]),
      amenityAliases("exhibition_centre", [
        "exhibition centre",
        "exhibition center",
        "messe",
        "ausstellungszentrum",
      ]),
      amenityAliases("theatre", ["theatre", "theater"]),
      amenityAliases("planetarium", ["planetarium"]),
      amenityAliases("public_bookcase", ["public bookcase", "book exchange", "bücherschrank"]),
      amenityAliases("stage", ["stage", "bühne", "buehne"]),
    ],
  },
  {
    group: "amenity public service",
    entries: [
      amenityAliases("courthouse", ["courthouse", "court", "gericht", "amtsgericht"]),
      amenityAliases("fire_station", ["fire station", "fire brigade", "feuerwehr"]),
      amenityAliases("police", ["police", "police station", "polizei", "polizeiwache"]),
      amenityAliases("post_box", ["post box", "mailbox", "briefkasten"]),
      amenityAliases("post_office", ["post office", "post", "postfiliale"]),
      amenityAliases("post_depot", ["post depot", "mail depot", "postdepot", "paketzentrum"]),
      amenityAliases("townhall", ["town hall", "city hall", "rathaus", "verwaltung"]),
      amenityAliases("ranger_station", ["ranger station", "visitor centre", "besucherzentrum"]),
    ],
  },
  {
    group: "amenity facilities",
    entries: [
      amenityAliases("check_in", ["check in", "check-in", "check-in counter", "check-in schalter"]),
      amenityAliases("drinking_water", [
        "drinking water",
        "water fountain",
        "trinkwasser",
        "wasserspender",
      ]),
      amenityAliases("dressing_room", [
        "dressing room",
        "changing room",
        "umkleide",
        "umkleideraum",
      ]),
      amenityAliases("lounge", ["lounge", "waiting lounge", "wartebereich", "lounge"]),
      amenityAliases("mailroom", ["mailroom", "poststelle", "postraum"]),
      amenityAliases("parcel_locker", ["parcel locker", "packstation", "paketstation"]),
      amenityAliases("shelter", ["shelter", "unterstand", "schutzraum"]),
      amenityAliases("shower", ["shower", "showers", "dusche", "duschen"]),
      amenityAliases("telephone", ["telephone", "phone", "telefon"]),
      amenityAliases("toilets", ["toilet", "toilets", "restroom", "bathroom", "wc", "toilette"]),
      amenityAliases("vending_machine", ["vending machine", "automat", "verkaufsautomat"]),
      amenityAliases("photo_booth", ["photo booth", "passport photo", "fotoautomat"]),
      amenityAliases("recycling", ["recycling", "recycling point", "wertstoff", "recycling"]),
    ],
  },
];

export const searchTagAliases: Record<string, Record<string, string[]>> = buildSearchTagAliases(
  searchTagAliasGroups,
);

function roomAliases(value: string, aliases: string[]): SearchTagAliasEntry {
  return { tag: "room", value, aliases };
}

function amenityAliases(value: string, aliases: string[]): SearchTagAliasEntry {
  return { tag: "amenity", value, aliases };
}

function buildSearchTagAliases(
  groups: SearchTagAliasGroup[],
): Record<string, Record<string, string[]>> {
  const aliasesByTag: Record<string, Record<string, string[]>> = {};

  groups
    .flatMap((group) => group.entries)
    .forEach((entry) => {
      aliasesByTag[entry.tag] ??= {};
      const normalizedValue = entry.value.toLowerCase();
      const existingAliases = aliasesByTag[entry.tag][normalizedValue] ?? [];
      aliasesByTag[entry.tag][normalizedValue] = deduplicateAliases([
        ...existingAliases,
        ...entry.aliases,
      ]);
    });

  return aliasesByTag;
}

function deduplicateAliases(aliases: string[]): string[] {
  return Array.from(new Set(aliases.map((alias) => alias.toLowerCase())));
}
