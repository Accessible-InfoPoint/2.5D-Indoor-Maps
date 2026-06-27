import maplibregl from "maplibre-gl";
import * as THREE from "three";

type MarkerRenderMode =
  | "map-facing"
  | "screen-billboard"
  | "three-sprite-doc-example"
  | "three-sprite-texture";

interface MarkerOptions {
  label: string;
  fillColor: string;
  origin: maplibregl.MercatorCoordinate;
  anisotropy: number;
}

// Three.Sprite renders inside MapLibre's custom layer, but its built-in
// billboard math cannot see MapLibre's camera because the map transform is
// passed through projectionMatrix. Keep the sprite modes as diagnostics.
const MARKER_RENDER_MODE: MarkerRenderMode = "screen-billboard";
const MARKER_BASE_ELEVATION_METERS = 0.3;
const MARKER_WIDTH_METERS = 2.4;
const MARKER_HEIGHT_METERS = 3;
const MARKER_SCREEN_WIDTH_PIXELS = 44;
const MARKER_SCREEN_HEIGHT_PIXELS = 44;
const MARKER_TEXTURE_WIDTH = 512;
const MARKER_TEXTURE_HEIGHT = 512;
const MARKER_TEXTURE_RADIUS = 224;
const MARKER_TEXTURE_LINE_WIDTH = 20;
const MARKER_TEXTURE_FONT_SIZE = 184;

const SCREEN_BILLBOARD_VERTEX_SHADER = `
varying vec2 vUv;
uniform vec2 markerSize;
uniform vec2 viewportSize;

void main() {
  vUv = uv;
  vec4 center = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 offset = position.xy * markerSize / viewportSize * 2.0 * center.w;
  gl_Position = center + vec4(offset, 0.0, 0.0);
}
`;
const SCREEN_BILLBOARD_FRAGMENT_SHADER = `
varying vec2 vUv;
uniform sampler2D markerTexture;
uniform float opacity;

void main() {
  vec4 color = texture2D(markerTexture, vUv);

  if (color.a < 0.01) {
    discard;
  }

  gl_FragColor = vec4(color.rgb, color.a * opacity);
}
`;

export const MAPLIBRE_THREE_INFO_POINT_FILL = "rgb(255, 195, 195)";
export const MAPLIBRE_THREE_SELECTED_POSITION_FILL = "rgb(195, 255, 195)";

export function getMapLibreThreeMarkerElevationMeters(): number {
  switch (MARKER_RENDER_MODE) {
    case "three-sprite-doc-example":
    case "three-sprite-texture":
      return MARKER_BASE_ELEVATION_METERS + MARKER_HEIGHT_METERS / 2;
    case "screen-billboard":
    case "map-facing":
      return MARKER_BASE_ELEVATION_METERS;
  }
}

export function createMapLibreThreeMarker(options: MarkerOptions): THREE.Object3D {
  const createTexture = () =>
    createMarkerTexture(options.label, options.fillColor, options.anisotropy);

  switch (MARKER_RENDER_MODE) {
    case "three-sprite-doc-example":
      return createThreeSpriteDocsExampleMarker(options.origin);
    case "three-sprite-texture":
      return createSpriteTextureMarker(createTexture(), options.origin);
    case "screen-billboard":
      return createScreenBillboardMarker(createTexture());
    case "map-facing":
      return createMapFacingMarker(createTexture(), options.origin);
  }
}

export function updateMapLibreThreeMarkerViewport(
  group: THREE.Group,
  canvas: HTMLCanvasElement
): void {
  const pixelRatio = canvas.clientWidth > 0
    ? canvas.width / canvas.clientWidth
    : 1;
  const viewportSize = new THREE.Vector2(canvas.width, canvas.height);
  const markerSize = new THREE.Vector2(
    MARKER_SCREEN_WIDTH_PIXELS * pixelRatio,
    MARKER_SCREEN_HEIGHT_PIXELS * pixelRatio
  );

  group.traverse((child) => {
    const material = (child as THREE.Mesh).material;

    if (
      material instanceof THREE.ShaderMaterial &&
      material.userData.isScreenBillboard === true
    ) {
      material.uniforms.viewportSize.value.copy(viewportSize);
      material.uniforms.markerSize.value.copy(markerSize);
    }
  });
}

export function getMapLibreThreeMaterialTexture(
  material: THREE.Material
): unknown {
  if (material instanceof THREE.ShaderMaterial) {
    return material.uniforms.markerTexture?.value;
  }

  if ("map" in material) {
    return material.map;
  }

  return undefined;
}

function createThreeSpriteDocsExampleMarker(
  origin: maplibregl.MercatorCoordinate
): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    color: 0xff00ff,
    side: THREE.DoubleSide,
  });
  const sprite = new THREE.Sprite(material);
  const scale = origin.meterInMercatorCoordinateUnits();

  material.userData.baseOpacity = 1;
  material.userData.disposeWithObject = true;
  sprite.renderOrder = 1000;
  sprite.scale.set(MARKER_WIDTH_METERS * scale, MARKER_WIDTH_METERS * scale, 1);

  return sprite;
}

function createSpriteTextureMarker(
  texture: THREE.Texture,
  origin: maplibregl.MercatorCoordinate
): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: false,
    depthTest: false,
    alphaTest: 0.01,
  });
  const marker = new THREE.Sprite(material);
  const scale = origin.meterInMercatorCoordinateUnits();

  material.userData.baseOpacity = 1;
  material.userData.disposeWithObject = true;
  marker.renderOrder = 1000;
  marker.scale.set(MARKER_WIDTH_METERS * scale, MARKER_HEIGHT_METERS * scale, 1);

  return marker;
}

function createScreenBillboardMarker(texture: THREE.Texture): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      markerTexture: { value: texture },
      markerSize: {
        value: new THREE.Vector2(
          MARKER_SCREEN_WIDTH_PIXELS,
          MARKER_SCREEN_HEIGHT_PIXELS
        ),
      },
      viewportSize: { value: new THREE.Vector2(1, 1) },
      opacity: { value: 1 },
    },
    vertexShader: SCREEN_BILLBOARD_VERTEX_SHADER,
    fragmentShader: SCREEN_BILLBOARD_FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
  });
  const marker = new THREE.Mesh(createScreenBillboardGeometry(), material);

  material.userData.baseOpacity = 1;
  material.userData.alwaysTransparent = true;
  material.userData.disposeWithObject = true;
  material.userData.isScreenBillboard = true;
  marker.renderOrder = 1000;

  return marker;
}

function createScreenBillboardGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.5, 0, 0,
        0.5, 0, 0,
        0.5, 1, 0,
        -0.5, 1, 0,
      ],
      3
    )
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      [
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ],
      2
    )
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  return geometry;
}

function createMapFacingMarker(
  texture: THREE.Texture,
  origin: maplibregl.MercatorCoordinate
): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
    alphaTest: 0.01,
  });
  const scale = origin.meterInMercatorCoordinateUnits();
  const geometry = new THREE.PlaneGeometry(
    MARKER_WIDTH_METERS * scale,
    MARKER_HEIGHT_METERS * scale
  );
  const marker = new THREE.Mesh(geometry, material);

  material.userData.baseOpacity = 1;
  material.userData.alwaysTransparent = true;
  material.userData.disposeWithObject = true;
  marker.renderOrder = 1000;

  return marker;
}

function createMarkerTexture(
  label: string,
  fillColor: string,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = MARKER_TEXTURE_WIDTH;
  canvas.height = MARKER_TEXTURE_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = fillColor;
  context.strokeStyle = "#000000";
  context.lineWidth = MARKER_TEXTURE_LINE_WIDTH;
  drawCircle(context, canvas.width / 2, canvas.height / 2, MARKER_TEXTURE_RADIUS);
  context.fill();
  context.stroke();

  context.fillStyle = "#000000";
  context.font = `bold ${MARKER_TEXTURE_FONT_SIZE}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = anisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.closePath();
}
