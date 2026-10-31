/**
 * Acceptance for issue #4, with Angular's mounting: the two target designs,
 * rendered with real content through the Angular adapter, place every slot
 * correctly in every combination of their optional areas. The checks
 * themselves are shared by every adapter.
 */
import { Component, input, Type } from "@angular/core";
import {
  describeIdCard,
  describePreferenceCard,
  idCardGrid,
  idCardImages,
  type IdCardOptional,
  type PreferenceCardOptional,
  preferenceCardGrid,
  preferenceContentGrid,
} from "@typed-grid-areas/acceptance";
import { render } from "vitest-browser-angular";
import { createGrid, TgaArea, TgaGrid, TgaSizeContainer } from "./index.ts";

/** Renders a design into a wrapper `width` px wide and returns its outermost element. */
async function mount<TOptional extends string>(
  design: Type<{ present: unknown; width: unknown }>,
  present: ReadonlyArray<TOptional>,
  width: number,
): Promise<HTMLElement> {
  const { container } = await render(design, { inputs: { present, width } });
  const root = container.firstElementChild?.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("mount: nothing was rendered");
  }
  return root;
}

const PreferenceContent = createGrid(preferenceContentGrid);
const PreferenceCard = createGrid(preferenceCardGrid, { nest: { content: PreferenceContent } });

@Component({
  imports: [TgaGrid, TgaArea, TgaSizeContainer],
  template: `
    <div [style.width.px]="width()">
      <div [tgaGrid]="Card">
        @if (has("input")) {
          <label [tgaArea]="Card.input" style="display: flex; align-items: center; padding: 16px">
            <input type="checkbox" aria-label="Weekly digest" />
          </label>
        }
        <div tgaSizeContainer>
          <div [tgaGrid]="Card.content" style="gap: 8px; padding: 16px">
            @if (has("icon")) {
              <div [tgaArea]="Card.content.icon">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
            }
            <div
              [tgaArea]="Card.content.information"
              style="display: flex; flex-direction: column; gap: 4px"
            >
              <div style="display: flex; align-items: center; gap: 8px">
                <strong data-part="title">Weekly digest</strong>
                <span data-part="titleTag">New</span>
              </div>
              <p data-part="description" style="margin: 0">
                A summary of everything that happened in your projects this week.
              </p>
            </div>
            @if (has("cardTag")) {
              <div [tgaArea]="Card.content.cardTag"><span>Recommended</span></div>
            }
            @if (has("children")) {
              <div [tgaArea]="Card.content.children">
                <button type="button">Choose a day</button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
class Preference {
  protected readonly Card = PreferenceCard;
  readonly present = input.required<ReadonlyArray<PreferenceCardOptional>>();
  readonly width = input.required<number>();
  protected has(area: PreferenceCardOptional): boolean {
    return this.present().includes(area);
  }
}

const IdCard = createGrid(idCardGrid);

@Component({
  imports: [TgaGrid, TgaArea, TgaSizeContainer],
  template: `
    <div [style.width.px]="width()">
      <div tgaSizeContainer>
        <div [tgaGrid]="Card">
          <img
            [tgaArea]="Card.photo"
            [src]="images.photo"
            alt=""
            style="width: 100%; height: 100%; object-fit: cover"
          />
          @if (has("logo")) {
            <div [tgaArea]="Card.logo" style="padding: 4px">ACME</div>
          }
          @if (has("badge")) {
            <div [tgaArea]="Card.badge" style="padding: 4px; text-align: right">
              <span aria-label="Verified">✓</span>
            </div>
          }
          <div [tgaArea]="Card.identity" style="padding: 4px"><strong>Ada Lovelace</strong></div>
          <div [tgaArea]="Card.details" style="padding: 4px">Analyst, Engine Division</div>
          @if (has("qr")) {
            <img
              [tgaArea]="Card.qr"
              [src]="images.qr"
              alt="QR code"
              style="width: 100%; height: 100%; object-fit: contain"
            />
          }
        </div>
      </div>
    </div>
  `,
})
class Id {
  protected readonly Card = IdCard;
  protected readonly images = idCardImages;
  readonly present = input.required<ReadonlyArray<IdCardOptional>>();
  readonly width = input.required<number>();
  protected has(area: IdCardOptional): boolean {
    return this.present().includes(area);
  }
}

describePreferenceCard((present, width) => mount(Preference, present, width));
describeIdCard((present, width) => mount(Id, present, width));
