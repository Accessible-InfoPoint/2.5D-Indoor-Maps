import {
  getCachedOverpassPathsForBuilding,
  getOverpassResourcesForBuilding,
} from "../../server/buildingSources";

describe("buildingSources", () => {
  it("resolves source-specific cache paths for official buildings", () => {
    expect(getCachedOverpassPathsForBuilding("apb")).toEqual({
      buildingsDataPath: "public/overpass/dresden_sit/buildings.json",
      indoorDataPath: "public/overpass/dresden_sit/indoor.json",
    });

    expect(getCachedOverpassPathsForBuilding("berlin_hbf")).toEqual({
      buildingsDataPath: "public/overpass/berlin_hbf/buildings.json",
      indoorDataPath: "public/overpass/berlin_hbf/indoor.json",
    });
  });

  it("generates area-based Overpass resources for shared SIT sources", () => {
    const resources = getOverpassResourcesForBuilding("apb");

    expect(resources.map((resource) => resource.dest)).toEqual([
      "public/overpass/dresden_sit/buildings.json",
      "public/overpass/dresden_sit/indoor.json",
    ]);
    expect(resources[0].query).toContain('area["name"="Dresden"]->.searchArea;');
    expect(resources[0].query).toContain('nwr["building"]["min_level"](area.searchArea)');
    expect(resources[1].query).toContain('nwr["indoor"](area.searchArea)');
    expect(resources[1].query).toContain('-nwr["building"][!"min_level"](area.searchArea)');
    expect(resources[1].query).not.toContain('nwr["level"]');
    expect(resources[0].queryHash).toHaveLength(64);
  });

  it("generates bbox-based Overpass resources for explicit regions", () => {
    const resources = getOverpassResourcesForBuilding("berlin_hbf");

    expect(resources[0].query).toContain(
      'nwr["building"]["min_level"](52.522,13.365,52.528,13.374)',
    );
    expect(resources[1].query).toContain('nwr["indoor"](52.522,13.365,52.528,13.374)');
    expect(resources[1].query).toContain(
      '-nwr["building"][!"min_level"](52.522,13.365,52.528,13.374)',
    );
    expect(resources[1].query).not.toContain('nwr["level"]');
  });

  it("fails clearly for buildings without a source entry", () => {
    expect(() => getOverpassResourcesForBuilding("unknown")).toThrow(
      'Building "unknown" has no Overpass source configuration.',
    );
  });
});
