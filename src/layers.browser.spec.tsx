import { defineLayout } from "./defineLayout";
import { idCardGrid as idCard } from "./test-utils/designs";
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

type IdCardArea = (typeof idCard.areas)[number];

/**
 * The ID card from issue #4. Where its slots land in every combination is
 * covered by the acceptance spec; these check how layered content restyles.
 */
describe("the ID card", () => {
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
