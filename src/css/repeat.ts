import type { RepeatMode } from "../types.ts";
import { splitTopLevel } from "./split.ts";

/** Parse a layer's computed `background-repeat` into per-axis repeat modes. */
export function parseRepeat(value: string): { x: RepeatMode; y: RepeatMode } {
  const v = value.trim().toLowerCase();
  if (v === "repeat-x") return { x: "repeat", y: "no-repeat" };
  if (v === "repeat-y") return { x: "no-repeat", y: "repeat" };

  const tokens = splitTopLevel(v, " ");
  const x = toMode(tokens[0]);
  const y = tokens.length > 1 ? toMode(tokens[1]) : x;
  return { x, y };
}

function toMode(token: string | undefined): RepeatMode {
  switch (token) {
    case "no-repeat":
      return "no-repeat";
    case "round":
      return "round";
    case "space":
      return "space";
    case "repeat":
    default:
      return "repeat";
  }
}
