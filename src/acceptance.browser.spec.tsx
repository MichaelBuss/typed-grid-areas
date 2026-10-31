/**
 * Acceptance for issue #4: the two target designs, described with the public
 * API only and rendered with real content, place every slot correctly in
 * every combination of their optional areas, on a narrow and a wide card.
 */
import { generateCss, GridConfig } from "./index";
import { createGridComponent } from "./react";
import { idCardGrid, preferenceCardGrid, preferenceContentGrid } from "./test-utils/designs";
import { mountDesign, Rect } from "./test-utils/mountDesign";

const NARROW = 300;
const WIDE = 560;

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

describe("PreferenceCard", () => {
  const PreferenceContent = createGridComponent(preferenceContentGrid);
  const PreferenceCard = createGridComponent(preferenceCardGrid, {
    nest: { content: PreferenceContent },
  });

  type Optional = "input" | "icon" | "cardTag" | "children";

  function Preference({ present }: { present: ReadonlyArray<Optional> }) {
    const has = (area: Optional) => present.includes(area);
    return (
      <PreferenceCard>
        {has("input") && (
          <PreferenceCard.input
            asChild
            style={{ display: "flex", alignItems: "center", padding: 16 }}
          >
            <label>
              <input type="checkbox" aria-label="Weekly digest" />
            </label>
          </PreferenceCard.input>
        )}
        <PreferenceCard.content style={{ gap: 8, padding: 16 }}>
          {has("icon") && (
            <PreferenceCard.content.icon>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </PreferenceCard.content.icon>
          )}
          <PreferenceCard.content.information
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong data-part="title">Weekly digest</strong>
              <span data-part="titleTag">New</span>
            </div>
            <p data-part="description" style={{ margin: 0 }}>
              A summary of everything that happened in your projects this week.
            </p>
          </PreferenceCard.content.information>
          {has("cardTag") && (
            <PreferenceCard.content.cardTag>
              <span>Recommended</span>
            </PreferenceCard.content.cardTag>
          )}
          {has("children") && (
            <PreferenceCard.content.children>
              <button type="button">Choose a day</button>
            </PreferenceCard.content.children>
          )}
        </PreferenceCard.content>
      </PreferenceCard>
    );
  }

  /** The rows of the content grid the ticket specifies, top to bottom. */
  function contentRows(has: (area: Optional) => boolean, width: number): Array<Array<string>> {
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

  describe.each(
    combinations<Optional>(["input", "icon", "cardTag", "children"]).map(
      present => [label(present), present] as const,
    ),
  )("with %s", (_, present) => {
    const has = (area: Optional) => present.includes(area);

    it.each([NARROW, WIDE])("places every slot at %ipx", async width => {
      const card = await mountDesign(<Preference present={present} />, { width });
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

describe("ID card", () => {
  const IdCard = createGridComponent(idCardGrid);

  type Optional = "logo" | "qr" | "badge";

  const svg = (width: number, height: number, body: string) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
    )}`;
  const photoUrl = svg(320, 240, '<rect width="320" height="240" fill="#556"/>');
  const qrUrl = svg(60, 60, '<rect width="60" height="60" fill="#000"/>');
  const fill = { width: "100%", height: "100%", objectFit: "cover" } as const;

  function Id({ present }: { present: ReadonlyArray<Optional> }) {
    const has = (area: Optional) => present.includes(area);
    return (
      <IdCard>
        <IdCard.photo asChild>
          <img src={photoUrl} alt="" style={fill} />
        </IdCard.photo>
        {has("logo") && <IdCard.logo style={{ padding: 4 }}>ACME</IdCard.logo>}
        {has("badge") && (
          <IdCard.badge style={{ padding: 4, textAlign: "right" }}>
            <span aria-label="Verified">✓</span>
          </IdCard.badge>
        )}
        <IdCard.identity style={{ padding: 4 }}>
          <strong>Ada Lovelace</strong>
        </IdCard.identity>
        <IdCard.details style={{ padding: 4 }}>Analyst, Engine Division</IdCard.details>
        {has("qr") && (
          <IdCard.qr asChild>
            <img src={qrUrl} alt="QR code" style={{ ...fill, objectFit: "contain" }} />
          </IdCard.qr>
        )}
      </IdCard>
    );
  }

  describe.each(
    combinations<Optional>(["logo", "qr", "badge"]).map(
      present => [label(present), present] as const,
    ),
  )("with %s", (_, present) => {
    const has = (area: Optional) => present.includes(area);

    it("puts the logo, badge and identity in the photo's corners on a narrow card", async () => {
      const card = await mountDesign(<Id present={present} />, { width: NARROW });
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
      const card = await mountDesign(<Id present={present} />, { width: WIDE });
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

describe("generated CSS", () => {
  const designs: Array<[string, Array<GridConfig<string>>]> = [
    ["PreferenceCard", [preferenceCardGrid, preferenceContentGrid]],
    ["ID card", [idCardGrid]],
  ];

  it.each(designs)("reports its size for the %s", (name, grids) => {
    const bytes = new TextEncoder().encode(grids.map(grid => generateCss(grid)).join("")).length;
    console.info(`${name}: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB) of generated CSS`);
    expect(bytes).toBeGreaterThan(0);
  });
});
