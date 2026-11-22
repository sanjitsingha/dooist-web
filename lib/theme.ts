/** The app's look, the same three choices as the Android app, saved with the account. */
export type Appearance = "light" | "dark" | "system";

/** This browser's copy of the choice, so the right look shows before anything has loaded. */
export const APPEARANCE_KEY = "dooist.appearance";
export const THEME_ATTRIBUTE = "data-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isAppearance(value: unknown): value is Appearance {
  return value === "light" || value === "dark" || value === "system";
}

/** Runs before the first paint so the page never flashes the wrong look, and follows the device. */
export const THEME_SCRIPT = `(function(){try{var m=matchMedia(${JSON.stringify(DARK_QUERY)});function a(){var s=localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)});document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},s==="dark"||(s!=="light"&&m.matches)?"dark":"light")}a();m.addEventListener("change",a)}catch(e){}})()`;

/** Shows a look right away. */
export function applyAppearance(appearance: Appearance) {
  const dark =
    appearance === "dark" || (appearance === "system" && matchMedia(DARK_QUERY).matches);
  document.documentElement.setAttribute(THEME_ATTRIBUTE, dark ? "dark" : "light");
}
