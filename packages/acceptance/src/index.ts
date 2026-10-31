/**
 * The framework-independent half of every adapter's browser acceptance tests
 * (issue #4): the PreferenceCard and ID card definitions, and the checks that
 * every slot lands where the design says, in every combination of the
 * designs' optional areas, on a narrow and a wide card.
 *
 * An adapter's package supplies only its mounting: a function that renders
 * the design with its framework and resolves to the design's outermost
 * element. From a browser spec:
 *
 *   describePreferenceCard((present, width) => mountPreferenceCard(present, width));
 *   describeIdCard((present, width) => mountIdCard(present, width));
 *
 * Each `describe…` function documents the markup its design must render.
 */
import { describe, expect, it } from "vitest";

export { idCardGrid, preferenceCardGrid, preferenceContentGrid } from "./designs.ts";

/** The optional areas of the PreferenceCard: the outer grid's input, and the content grid's others. */
export type PreferenceCardOptional = "input" | "icon" | "cardTag" | "children";

/** The optional areas of the ID card. */
export type IdCardOptional = "logo" | "qr" | "badge";

/**
 * Renders a design, with only the given optional areas present, into a
 * wrapper `width` px wide (`<div style="width: …px">`), and resolves to the
 * design's outermost element: the grid, or its size container when the grid
 * has breakpoints. It may live in a shadow root.
 */
export type MountDesign<TOptional extends string> = (
  present: ReadonlyArray<TOptional>,
  width: number,
) => Promise<HTMLElement>;

export type Rect = { x: number; y: number; width: number; height: number };

export interface MeasuredDesign {
  /**
   * The element filling an area, found by its path of area names from the
   * outermost grid: `slot("content", "icon")` is the `icon` slot of the grid
   * nested into `content`. For a nested grid with breakpoints this is its
   * size container, the element that fills the outer area.
   */
  slot: (...path: [string, ...string[]]) => HTMLElement;
  /** An element's bounding rect, relative to the design's top-left corner. */
  rect: (element: Element) => Rect;
  /** The design's own bounding rect (at 0, 0). */
  bounds: () => Rect;
}

/** Where the browser laid out a rendered design's slots, from its outermost element. */
export function measureDesign(root: HTMLElement): MeasuredDesign {
  /** The grid an element renders: itself, or the grid inside its size container. */
  const gridOf = (element: HTMLElement): HTMLElement => {
    const grid = element.matches("[data-grid-id]")
      ? element
      : element.querySelector<HTMLElement>(":scope > [data-grid-id]");
    if (grid === null) {
      throw new Error("measureDesign: expected a grid");
    }
    return grid;
  };

  const slot = (...path: [string, ...string[]]): HTMLElement => {
    let element = root;
    for (const area of path) {
      const found = gridOf(element).querySelector<HTMLElement>(`:scope > [data-area=${area}]`);
      if (found === null) {
        throw new Error(`measureDesign: slot "${path.join(".")}" was not rendered`);
      }
      element = found;
    }
    return element;
  };

  const rect = (element: Element): Rect => {
    const origin = root.getBoundingClientRect();
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x: x - origin.x, y: y - origin.y, width, height };
  };

  return { slot, rect, bounds: () => rect(root) };
}

/** The narrow and the wide card width the designs are checked at, in px. */
export const NARROW = 300;
export const WIDE = 560;

const right = (rect: Rect) => rect.x + rect.width;
const bottom = (rect: Rect) => rect.y + rect.height;

/** Every subset of `items`, smallest first. */
function combinations<T>(items: ReadonlyArray<T>): Array<Array<T>> {
  const result: Array<Array<T>> = [[]];
  for (const item of items) {
    result.push(...result.map(combination => [...combination, item]));
  }
  return result;
}

const label = (present: ReadonlyArray<string>) =>
  present.length === 0 ? "nothing optional" : present.join(", ");

/**
 * Asserts that named slots sit in the given rows: each row below the one
 * before it, its slots left to right on a shared top edge, and together
 * spanning the full width the slots take up.
 */
function expectRows(rects: Record<string, Rect>, rows: ReadonlyArray<ReadonlyArray<string>>) {
  const all = rows.flat().map(name => rects[name]!);
  const left = Math.min(...all.map(rect => rect.x));
  const rightEdge = Math.max(...all.map(right));

  rows.forEach((row, index) => {
    const slots = row.map(name => rects[name]!);
    const first = slots[0]!;
    const last = slots[slots.length - 1]!;
    expect(first.x, `${row.join(" ")} starts at the left edge`).toBeCloseTo(left, 1);
    expect(right(last), `${row.join(" ")} ends at the right edge`).toBeCloseTo(rightEdge, 1);
    slots.forEach((slot, i) => {
      expect(slot.y, `${row[i]} is level with ${row[0]}`).toBeCloseTo(first.y, 1);
      if (i > 0) {
        expect(slot.x, `${row[i]} is right of ${row[i - 1]}`).toBeGreaterThanOrEqual(
          right(slots[i - 1]!),
        );
      }
    });
    const next = rows[index + 1];
    if (next !== undefined) {
      const rowBottom = Math.max(...slots.map(bottom));
      for (const name of next) {
        expect(rects[name]!.y, `${name} is below ${row.join(" ")}`).toBeGreaterThanOrEqual(
          rowBottom,
        );
      }
    }
  });
}

/**
 * The PreferenceCard's checks. `mount` renders `preferenceCardGrid` with
 * `preferenceContentGrid` nested into its `content` area, as the React
 * adapter's acceptance spec does:
 *
 * - `input` (when present): your own `<label>` as the slot, styled
 *   `display: flex; align-items: center; padding: 16px`, holding a checkbox.
 * - `content`, styled `gap: 8px; padding: 16px`, with these slots:
 *   - `icon` (when present): a 24×24 `<svg>`.
 *   - `information`, styled `display: flex; flex-direction: column; gap: 4px`,
 *     holding a row (`display: flex; align-items: center; gap: 8px`) of
 *     `<strong data-part="title">Weekly digest</strong>` and
 *     `<span data-part="titleTag">New</span>`, then
 *     `<p data-part="description" style="margin: 0">` with a sentence of text.
 *   - `cardTag` (when present): a `<span>Recommended</span>`.
 *   - `children` (when present): a `<button>Choose a day</button>`.
 */
export function describePreferenceCard(mount: MountDesign<PreferenceCardOptional>): void {
  /** The rows of the content grid the ticket specifies, top to bottom. */
  function contentRows(
    has: (area: PreferenceCardOptional) => boolean,
    width: number,
  ): Array<Array<string>> {
    const rows: Array<Array<string>> =
      has("icon") && has("cardTag")
        ? width === WIDE
          ? [["icon", "information", "cardTag"]]
          : [["icon", "cardTag"], ["information"]]
        : has("icon")
          ? [["icon", "information"]]
          : has("cardTag")
            ? [["information", "cardTag"]]
            : [["information"]];
    return has("children") ? [...rows, ["children"]] : rows;
  }

  describe("PreferenceCard", () => {
    describe.each(
      combinations<PreferenceCardOptional>(["input", "icon", "cardTag", "children"]).map(
        present => [label(present), present] as const,
      ),
    )("with %s", (_, present) => {
      const has = (area: PreferenceCardOptional) => present.includes(area);

      it.each([NARROW, WIDE])("places every slot at %ipx", async width => {
        const card = measureDesign(await mount(present, width));
        const bounds = card.bounds();
        const content = card.rect(card.slot("content"));

        // The input is a left column spanning the full height; content takes the rest.
        if (has("input")) {
          const input = card.rect(card.slot("input"));
          expect(input).toMatchObject({ x: 0, y: 0, height: bounds.height });
          expect(content.x).toBeGreaterThanOrEqual(right(input));
        } else {
          expect(content.x).toBe(0);
        }
        expect(content.y).toBe(0);
        expect(right(content)).toBe(width);
        expect(bottom(content)).toBe(bounds.height);

        const rows = contentRows(has, width);
        const rects = Object.fromEntries(
          rows.flat().map(area => [area, card.rect(card.slot("content", area))]),
        );
        expectRows(rects, rows);

        // The title row and the description stay inside the information, as plain flex.
        const information = card.slot("content", "information");
        const part = (name: string) => card.rect(information.querySelector(`[data-part=${name}]`)!);
        const title = part("title");
        const titleTag = part("titleTag");
        const description = part("description");
        const box = rects.information!;
        for (const inner of [title, titleTag, description]) {
          expect(inner.x).toBeGreaterThanOrEqual(box.x);
          expect(inner.y).toBeGreaterThanOrEqual(box.y);
          expect(right(inner)).toBeLessThanOrEqual(right(box) + 0.5);
          expect(bottom(inner)).toBeLessThanOrEqual(bottom(box) + 0.5);
        }
        expect(titleTag.x).toBeGreaterThanOrEqual(right(title));
        expect(titleTag.y).toBeLessThan(bottom(title));
        expect(description.y).toBeGreaterThanOrEqual(Math.max(bottom(title), bottom(titleTag)));
      });
    });
  });
}

const svg = (width: number, height: number, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
  )}`;

/** The ID card's images, as `src` URLs. */
export const idCardImages = {
  photo: svg(320, 240, '<rect width="320" height="240" fill="#556"/>'),
  qr: svg(60, 60, '<rect width="60" height="60" fill="#000"/>'),
};

/**
 * The ID card's checks. `mount` renders `idCardGrid`, as the React adapter's
 * acceptance spec does:
 *
 * - `photo`: your own `<img src={idCardImages.photo} alt="">` as the slot,
 *   styled `width: 100%; height: 100%; object-fit: cover`.
 * - `logo` (when present), styled `padding: 4px`: the text `ACME`.
 * - `badge` (when present), styled `padding: 4px; text-align: right`: a
 *   `<span aria-label="Verified">✓</span>`.
 * - `identity`, styled `padding: 4px`: `<strong>Ada Lovelace</strong>`.
 * - `details`, styled `padding: 4px`: the text `Analyst, Engine Division`.
 * - `qr` (when present): your own `<img src={idCardImages.qr} alt="QR code">`
 *   as the slot, styled like the photo but `object-fit: contain`.
 */
export function describeIdCard(mount: MountDesign<IdCardOptional>): void {
  describe("ID card", () => {
    describe.each(
      combinations<IdCardOptional>(["logo", "qr", "badge"]).map(
        present => [label(present), present] as const,
      ),
    )("with %s", (_, present) => {
      const has = (area: IdCardOptional) => present.includes(area);

      it("puts the logo, badge and identity in the photo's corners on a narrow card", async () => {
        const card = measureDesign(await mount(present, NARROW));
        const rect = (area: string) => card.rect(card.slot(area));
        const photo = rect("photo");
        expect(photo).toMatchObject({ x: 0, y: 0, width: NARROW });

        if (has("logo")) {
          const logo = rect("logo");
          expect(logo).toMatchObject({ x: photo.x, y: photo.y });
          expect(right(logo)).toBeLessThan(right(photo));
          expect(bottom(logo)).toBeLessThan(bottom(photo));
        }
        if (has("badge")) {
          const badge = rect("badge");
          expect(badge.y).toBe(photo.y);
          expect(right(badge)).toBe(right(photo));
          expect(badge.x).toBeGreaterThan(photo.x);
          expect(bottom(badge)).toBeLessThan(bottom(photo));
        }
        const identity = rect("identity");
        expect(identity).toMatchObject({ x: photo.x, width: photo.width });
        expect(bottom(identity)).toBe(bottom(photo));
        expect(identity.y).toBeGreaterThan(photo.y);

        const details = rect("details");
        expect(details).toMatchObject({ x: 0, y: bottom(photo) });
        if (has("qr")) {
          const qr = rect("qr");
          expect(qr.y).toBe(details.y);
          expect(qr.x).toBe(right(details));
          expect(right(qr)).toBe(NARROW);
        } else {
          expect(details.width).toBe(NARROW);
        }
      });

      it("gives the photo a column of its own on a wide card (@md)", async () => {
        const card = measureDesign(await mount(present, WIDE));
        const rect = (area: string) => card.rect(card.slot(area));
        const photo = rect("photo");
        const identity = rect("identity");
        const details = rect("details");
        expect(photo).toMatchObject({ x: 0, y: 0 });
        expect(bottom(photo)).toBe(bottom(details));

        if (has("badge")) {
          const badge = rect("badge");
          expect(badge.y).toBe(photo.y);
          expect(right(badge)).toBe(right(photo));
          expect(badge.x).toBeGreaterThan(photo.x);
          expect(bottom(badge)).toBeLessThan(bottom(photo));
        }

        expect(identity).toMatchObject({ x: right(photo), y: 0 });
        if (has("logo")) {
          const logo = rect("logo");
          expect(logo.y).toBe(0);
          expect(logo.x).toBe(right(identity));
          expect(right(logo)).toBe(WIDE);
        } else {
          expect(right(identity)).toBe(WIDE);
        }

        expect(details).toMatchObject({ x: identity.x, y: bottom(identity) });
        if (has("qr")) {
          const qr = rect("qr");
          expect(qr.x).toBe(right(details));
          expect(right(qr)).toBe(WIDE);
          expect(bottom(qr)).toBe(bottom(photo));
        } else {
          expect(right(details)).toBe(WIDE);
        }
      });
    });
  });
}
