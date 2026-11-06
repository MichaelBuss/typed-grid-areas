/**
 * The How it works page shows the CSS and markup the core generates for the
 * ID card, and explains each CSS feature they rely on. These checks fail
 * when the core stops using a feature the page explains.
 */
import { headline } from "./howItWorks.ts";

describe("the How it works page's headline definition", () => {
  it("is the ID card, with its grid inside its own size container", () => {
    expect(headline.markup).toMatch(
      /^<div style="container-type: inline-size; container-name: grid-tga-\w+;[^"]*">\n {2}<div data-grid-id="tga-\w+">\n/,
    );
    for (const area of ["photo", "identity", "details", "logo", "qr", "badge"]) {
      expect(headline.markup).toContain(`<div data-area="${area}">`);
    }
  });

  it("generates CSS with every feature the page explains", () => {
    const { css } = headline;
    // `grid-template-areas`, drawn from the templates.
    expect(css).toContain("grid-template-areas: 'photo photo photo'");
    // Conditions: `:has()` / `:not(:has())` inside `:where()`.
    expect(css).toMatch(/:where\(\[data-grid-id=tga-\w+\]:not\(:has\(> \[data-area=logo\]\)\)\)/);
    // Breakpoints: `@container`, naming the grid's own size container.
    expect(css).toMatch(/@container grid-tga-\w+ \(min-width: 28rem\) \{/);
    // Everything in one cascade layer.
    expect(css).toMatch(/^@layer typed-grid-areas \{\n/);
    // Layers: `--tga-over` names the area underneath.
    expect(css).toContain("--tga-over: photo;");
  });
});
