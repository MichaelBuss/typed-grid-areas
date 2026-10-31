import { defineLayout } from "./defineLayout";
import { mountGrid } from "./test-utils/mountGrid";

describe("layers in a real browser", () => {
  it("places a layer over the cells it shares with its base", async () => {
    const photoCard = defineLayout({
      areas: ["photo", "badge"],
      layouts: [{ template: "photo photo+badge", rows: "80px", columns: "100px 40px" }],
    });

    const grid = await mountGrid(photoCard, { width: 140, present: ["photo", "badge"] });

    expect(grid.templateAreas()).toBe('"photo photo"');
    expect(grid.rect("photo")).toMatchObject({ x: 0, y: 0, width: 140, height: 80 });
    expect(grid.rect("badge")).toMatchObject({ x: 100, y: 0, width: 40, height: 80 });
  });

  it("draws a layer above its base, even when the base comes later in the DOM", async () => {
    const photoCard = defineLayout({
      areas: ["photo", "badge"],
      layouts: [{ template: "photo photo+badge", rows: "80px", columns: "100px 40px" }],
    });

    const grid = await mountGrid(photoCard, { width: 140, present: ["badge", "photo"] });

    const badge = grid.slot("badge").getBoundingClientRect();
    expect(document.elementFromPoint(badge.x + badge.width / 2, badge.y + badge.height / 2)).toBe(
      grid.slot("badge"),
    );
  });
});

/**
 * The ID card from issue #4: on narrow cards the logo, badge and identity sit
 * in the photo's corners; from `@md` (448px) the photo is a column of its own
 * and only the badge stays on it.
 */
const idCard = defineLayout({
  areas: ["photo", "identity", "details", "logo?", "qr?", "badge?"],
  layouts: [
    {
      template: `
        photo+logo     photo          photo+badge
        photo          photo          photo
        photo+identity photo+identity photo+identity
        details        details        qr`,
      rows: "40px 80px 40px 60px",
      columns: "60px 1fr 60px",
      breakpoints: {
        "@md": {
          template: `
            photo photo+badge identity logo
            photo photo       details  qr`,
          rows: "40px 120px",
          columns: "100px 40px 1fr 80px",
        },
      },
    },
  ],
});

type IdCardArea = (typeof idCard.areas)[number];
type Rect = { x: number; y: number; width: number; height: number };

const right = (rect: Rect) => rect.x + rect.width;
const bottom = (rect: Rect) => rect.y + rect.height;

/** Every combination of the ID card's optional areas, as the slots to render. */
const combinations: Array<Array<IdCardArea>> = [[]];
for (const area of ["logo", "qr", "badge"] as const) {
  combinations.push(...combinations.map(combination => [...combination, area]));
}

const label = (optional: ReadonlyArray<IdCardArea>) =>
  optional.length === 0 ? "no optional areas" : optional.join(", ");

describe("the ID card", () => {
  describe.each(combinations.map(optional => [label(optional), optional] as const))(
    "with %s",
    (_, optional) => {
      const present: Array<IdCardArea> = ["photo", "identity", "details", ...optional];
      const has = (area: IdCardArea) => optional.includes(area);

      it("puts the logo, badge and identity in the photo's corners on a narrow card", async () => {
        const grid = await mountGrid(idCard, { width: 300, present });
        const photo = grid.rect("photo");
        expect(photo).toMatchObject({ x: 0, y: 0, width: 300 });

        if (has("logo")) {
          const logo = grid.rect("logo");
          expect(logo).toMatchObject({ x: photo.x, y: photo.y });
          expect(right(logo)).toBeLessThan(right(photo));
          expect(bottom(logo)).toBeLessThan(bottom(photo));
        }
        if (has("badge")) {
          const badge = grid.rect("badge");
          expect(badge.y).toBe(photo.y);
          expect(right(badge)).toBe(right(photo));
          expect(badge.x).toBeGreaterThan(photo.x);
          expect(bottom(badge)).toBeLessThan(bottom(photo));
        }
        const identity = grid.rect("identity");
        expect(identity).toMatchObject({ x: photo.x, width: photo.width });
        expect(bottom(identity)).toBe(bottom(photo));
        expect(identity.y).toBeGreaterThan(photo.y);

        const details = grid.rect("details");
        expect(details).toMatchObject({ x: 0, y: bottom(photo) });
        if (has("qr")) {
          const qr = grid.rect("qr");
          expect(qr.y).toBe(details.y);
          expect(qr.x).toBe(right(details));
          expect(right(qr)).toBe(300);
        } else {
          expect(details.width).toBe(300);
        }
      });

      it("gives the photo a column of its own on a wide card (@md)", async () => {
        const grid = await mountGrid(idCard, { width: 560, present });
        const photo = grid.rect("photo");
        const identity = grid.rect("identity");
        const details = grid.rect("details");
        expect(photo).toMatchObject({ x: 0, y: 0 });
        expect(bottom(photo)).toBe(bottom(details));

        if (has("badge")) {
          const badge = grid.rect("badge");
          expect(badge.y).toBe(photo.y);
          expect(right(badge)).toBe(right(photo));
          expect(badge.x).toBeGreaterThan(photo.x);
          expect(bottom(badge)).toBeLessThan(bottom(photo));
        }

        expect(identity).toMatchObject({ x: right(photo), y: 0 });
        if (has("logo")) {
          const logo = grid.rect("logo");
          expect(logo.y).toBe(0);
          expect(logo.x).toBe(right(identity));
          expect(right(logo)).toBe(560);
        } else {
          expect(right(identity)).toBe(560);
        }

        expect(details).toMatchObject({ x: identity.x, y: bottom(identity) });
        if (has("qr")) {
          const qr = grid.rect("qr");
          expect(qr.x).toBe(right(details));
          expect(right(qr)).toBe(560);
          expect(bottom(qr)).toBe(bottom(photo));
        } else {
          expect(right(details)).toBe(560);
        }
      });
    },
  );

  /**
   * Identity content that turns its text white while `--tga-over` says it is
   * drawn over the photo.
   */
  const identityContent = (
    <>
      <style>{`
        .identity-name { color: rgb(0, 0, 0); }
        @container style(--tga-over: photo) { .identity-name { color: rgb(255, 255, 255); } }
      `}</style>
      <span className="identity-name">Ada Lovelace</span>
    </>
  );
  const nameColor = (grid: { slot: (area: IdCardArea) => HTMLElement }) => {
    const name = grid.slot("identity").querySelector(".identity-name");
    return name === null ? undefined : getComputedStyle(name).color;
  };

  it("lets identity content restyle itself while it is layered over the photo", async () => {
    const narrow = await mountGrid(idCard, {
      width: 300,
      present: ["photo", "identity", "details"],
      slotContent: { identity: identityContent },
    });
    expect(nameColor(narrow)).toBe("rgb(255, 255, 255)");
  });

  it("leaves identity content alone while identity owns its own cells", async () => {
    const wide = await mountGrid(idCard, {
      width: 560,
      present: ["photo", "identity", "details"],
      slotContent: { identity: identityContent },
    });
    expect(nameColor(wide)).toBe("rgb(0, 0, 0)");
  });

  it("sets --tga-over to the area underneath on layered slots, and none on every other slot", async () => {
    const tgaOver = (grid: { slot: (area: IdCardArea) => HTMLElement }, area: IdCardArea) =>
      getComputedStyle(grid.slot(area)).getPropertyValue("--tga-over").trim();
    const present: Array<IdCardArea> = ["photo", "identity", "details", "logo", "qr", "badge"];

    const narrow = await mountGrid(idCard, { width: 300, present });
    expect(present.map(area => [area, tgaOver(narrow, area)])).toEqual([
      ["photo", "none"],
      ["identity", "photo"],
      ["details", "none"],
      ["logo", "photo"],
      ["qr", "none"],
      ["badge", "photo"],
    ]);

    const wide = await mountGrid(idCard, { width: 560, present });
    expect(present.map(area => [area, tgaOver(wide, area)])).toEqual([
      ["photo", "none"],
      ["identity", "none"],
      ["details", "none"],
      ["logo", "none"],
      ["qr", "none"],
      ["badge", "photo"],
    ]);
  });
});
