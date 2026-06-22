import * as _default from "../../public/strings/colorProfiles/default.json";
import * as black_white from "../../public/strings/colorProfiles/black_white.json";
import * as red_green from "../../public/strings/colorProfiles/red_green.json";
import * as blue_yellow from "../../public/strings/colorProfiles/blue_yellow.json";
import { lang } from "../services/languageService";

type ColorProfile = typeof _default;

const profileKey = "colorProfile";
const opacityKey = "environmentOpacity";
const strengthKey = "colorStrength";
const thicknessKey = "lineThickness";

function getCurrentProfile(): string {
  return localStorage.getItem(profileKey) ?? "none";
}

function setCurrentProfile(profile: string): void {
  localStorage.setItem(profileKey, profile);
}

function getCurrentColors(): ColorProfile {
  const profile = getCurrentProfile();

  switch (profile) {
    case "none":
      return _default;
    case "black_white":
      return black_white;
    case "red_green":
      return red_green;
    case "blue_yellow":
      return blue_yellow;
    default:
      return _default;
  }
}

function getCurrentColorTranslation(profile: string): string{
  switch (profile) {
    case "none":
      return lang.colorProfile_none;
    case "black_white":
      return lang.colorProfile_black_white;
    case "red_green":
      return lang.colorProfile_red_green;
    case "blue_yellow":
      return lang.colorProfile_blue_yellow;
    default:
      return lang.colorProfile_none;
  }
}

function setEnvOpacity(opacity: number): void {
  localStorage.setItem(opacityKey, opacity.toString());
}

function getEnvOpacity(): number {
  const opacity = localStorage.getItem(opacityKey);

  return opacity
    ? +opacity
    : 100;
}

function setColorStrength(strength: number): void {
  localStorage.setItem(strengthKey, strength.toString());
}

function getColorStrength(): number {
  const strength = localStorage.getItem(strengthKey);

  return strength
    ? +strength
    : 50;
}

function setLineThickness(thickness: number): void {
  localStorage.setItem(thicknessKey, thickness.toString());
}

function getLineThickness(): number {
  const thickness = localStorage.getItem(thicknessKey);

  return thickness
    ? +thickness
    : 50;
}

export default {
  getCurrentProfile,
  setCurrentProfile,
  getCurrentColorTranslation,
  getEnvOpacity,
  setEnvOpacity,
  getColorStrength,
  setColorStrength,
  getLineThickness,
  setLineThickness,
};

export const colors = getCurrentColors();
