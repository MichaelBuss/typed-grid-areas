/**
 * `typed-grid-areas/adapter`: what every framework adapter builds on to render
 * a definition, free of any framework.
 */
export {
  gridMarkup,
  type GridElements,
  type GridMarkup,
  type SizeContainerMarkup,
  type SizeContainerStyle,
} from "./gridMarkup.ts";
export { createSlotCheck, type SlotCheckOptions } from "./slotCheck.ts";
export { GRID_STYLE_ATTRIBUTE, gridStyleTags, insertGridStyle } from "./gridStyles.ts";
export { isDevelopment } from "../isDevelopment.ts";
