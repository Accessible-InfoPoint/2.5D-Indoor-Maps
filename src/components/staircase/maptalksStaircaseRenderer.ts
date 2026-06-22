import * as Maptalks from "maptalks";
import * as THREE from "three";
import { BaseObject, ThreeLayer } from "maptalks.three";
import { Prism } from "../threejs/prism";
import { StaircaseRenderItem } from "./staircaseRenderModel";

export interface StaircaseMaterials {
  main: THREE.MeshBasicMaterial;
  outline: THREE.MeshBasicMaterial;
}

export function renderMaptalksStaircaseItems(
  items: StaircaseRenderItem[],
  materials: StaircaseMaterials,
  layer: ThreeLayer,
  onclick: () => void
): BaseObject[] {
  return items.map((item) => {
    const material = materials[item.materialRole];
    const object =
      item.type == "prism"
        ? new Prism(
            item.coordinates,
            { height: item.height, altitude: item.altitude },
            material,
            layer
          )
        : layer.toBar(
            new Maptalks.Coordinate(item.coordinate as [number, number]),
            {
              height: item.height,
              altitude: item.altitude,
              radialSegments: item.radialSegments,
              asynchronous: true,
              radius: item.radius,
            },
            material
          );

    object.on("click", () => onclick());
    return object;
  });
}
