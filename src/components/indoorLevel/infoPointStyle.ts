import ColorService from "../../services/colorService";

export interface InfoPointStyle {
  fillColor: string;
  strokeColor: string;
  textColor: string;
}

export function getInfoPointStyle(): InfoPointStyle {
  const fillColor = ColorService.getCurrentColors().roomColor;
  const textColor = getReadableTextColor(fillColor);

  return {
    fillColor,
    strokeColor: textColor,
    textColor,
  };
}

function getReadableTextColor(backgroundColor: string): string {
  const rgb = parseColor(backgroundColor);

  if (!rgb) {
    return "#000000";
  }

  const [r, g, b] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.179 ? "#000000" : "#ffffff";
}

function parseColor(color: string): [number, number, number] | undefined {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (hex) {
    const value =
      hex[1].length == 3
        ? hex[1]
            .split("")
            .map((part) => part + part)
            .join("")
        : hex[1];

    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  }

  const rgb = color.trim().match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!rgb) {
    return undefined;
  }

  return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
}
