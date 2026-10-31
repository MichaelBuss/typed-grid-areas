/**
 * Development warnings. Tests run in Angular's development mode, as `ng serve`
 * and `ng test` do; `warnings.production.browser.spec.ts` covers production.
 */
import { Component, signal } from "@angular/core";
import { defineLayout } from "typed-grid-areas";
import { render } from "vitest-browser-angular";
import { createGrid, TgaArea, TgaGrid, TgaSizeContainer } from "./index.ts";

const Card = createGrid(
  defineLayout({
    areas: ["icon?", "info"],
    layouts: [{ template: "icon info" }],
  }),
);

const Responsive = createGrid(
  defineLayout({
    areas: ["icon", "info"],
    layouts: [{ template: "info", breakpoints: { "@sm": { template: "icon info" } } }],
  }),
);

@Component({
  imports: [TgaGrid, TgaArea],
  template: `
    <div [tgaGrid]="Card">
      @if (icon()) {
        <span [tgaArea]="Card.icon">★</span>
      }
      @if (info()) {
        <p [tgaArea]="Card.info">Information</p>
      }
      @if (stray()) {
        <span>stray</span>
      }
    </div>
    <p>{{ unrelated() }}</p>
  `,
})
class Example {
  protected readonly Card = Card;
  readonly icon = signal(true);
  readonly info = signal(true);
  readonly stray = signal(false);
  readonly unrelated = signal(0);
}

/** The warnings logged so far, in order. */
function warnings(): Array<unknown> {
  return vi.mocked(console.warn).mock.calls.map(([message]) => message);
}

describe("in development", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs nothing when every required slot is there and only optional ones are absent", async () => {
    const { fixture, componentClassInstance: example } = await render(Example);
    example.icon.set(false);
    await fixture.whenStable();
    expect(warnings()).toEqual([]);
  });

  it("warns about a missing required slot after mount", async () => {
    @Component({
      imports: [TgaGrid, TgaArea],
      template: `<div [tgaGrid]="Card"><span [tgaArea]="Card.icon">★</span></div>`,
    })
    class Missing {
      protected readonly Card = Card;
    }

    await render(Missing);
    expect(warnings()).toEqual([
      'typed-grid-areas: no slot for the required area "info". Render its slot component, or ' +
        'declare the area optional ("info?").',
    ]);
  });

  it("warns about a stray direct child, naming [tgaArea] as the way to make it a slot", async () => {
    const { fixture, componentClassInstance: example } = await render(Example);
    example.stray.set(true);
    await fixture.whenStable();
    expect(warnings()).toEqual([
      "typed-grid-areas: <span> at index 2 is a direct child of the grid but not one of its " +
        "slots (icon, info). Put it inside a slot, or make it a slot with [tgaArea].",
    ]);
  });

  it("warns once per distinct set of problems, again after an update that introduces new ones", async () => {
    const { fixture, componentClassInstance: example } = await render(Example);
    example.info.set(false);
    await fixture.whenStable();
    example.unrelated.set(1);
    await fixture.whenStable();
    expect(warnings()).toHaveLength(1);

    example.stray.set(true);
    await fixture.whenStable();
    expect(warnings()).toHaveLength(3);
    expect(warnings()[2]).toContain("<span>");
  });

  it("warns about a grid with breakpoints whose parent isn't its size container", async () => {
    @Component({
      imports: [TgaGrid, TgaArea, TgaSizeContainer],
      template: `
        <div [tgaGrid]="Responsive">
          <span [tgaArea]="Responsive.icon">★</span>
          <p [tgaArea]="Responsive.info">Information</p>
        </div>
        <div tgaSizeContainer>
          <div [tgaGrid]="Responsive">
            <span [tgaArea]="Responsive.icon">★</span>
            <p [tgaArea]="Responsive.info">Information</p>
          </div>
        </div>
      `,
    })
    class Uncontained {
      protected readonly Responsive = Responsive;
    }

    await render(Uncontained);
    expect(warnings()).toEqual([
      "typed-grid-areas: a grid with breakpoints needs its own size container as its parent " +
        "element. Wrap the grid in an element marked tgaSizeContainer.",
    ]);
  });
});
