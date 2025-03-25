export interface BuildingInterface {
    /**
        Array of coordinates in the order [West, South, East, North]
    */
    boundingBox: Array<number>,
    feature: GeoJSON.Feature<any, any> | null
}
