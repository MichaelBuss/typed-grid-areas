import {
  afterEveryRender,
  computed,
  contentChild,
  Directive,
  ElementRef,
  inject,
  input,
  isDevMode,
  OnChanges,
  PLATFORM_ID,
} from "@angular/core";
import type { GridConfig } from "typed-grid-areas";
import { createSlotCheck, gridMarkup, type GridElements } from "typed-grid-areas/adapter";
import { AREA, AreaRef, AnyGridRef, GRID } from "./gridRef.ts";
import { GridStyles } from "./gridStyles.ts";

/**
 * Makes the element it's on (a native element or a component's host) the
 * slot that fills an area: `<h2 [tgaArea]="Card.title">`. It must be a direct
 * child of its grid's element.
 */
@Directive({
  selector: "[tgaArea]",
  host: { "[attr.data-area]": "area()" },
})
export class TgaArea {
  /** The area this element fills, as its grid reference's property (`Card.title`). */
  readonly tgaArea = input.required<AreaRef>();

  protected readonly area = computed(() => this.tgaArea()[AREA]);
}

/**
 * Makes the element it's on a grid: `<div [tgaGrid]="Card">`. Its slots are
 * its direct children, each marked with `[tgaArea]`.
 */
@Directive({
  selector: "[tgaGrid]",
  host: {
    "[attr.data-grid-id]": "elements().grid.attributes['data-grid-id']",
    "[attr.data-area]": "area()",
  },
})
export class TgaGrid implements OnChanges {
  /** The grid this element renders: a reference from `createGrid`, or a nested one (`Card.content`). */
  readonly tgaGrid = input.required<AnyGridRef>();

  /** The nearest size container around this grid; this grid's own when it claims this grid. */
  private readonly sizeContainer = inject(TgaSizeContainer, { optional: true });
  private readonly styles = inject(GridStyles);

  /** What this instance renders: its own elements, and its size container's. */
  readonly elements = computed((): GridElements => {
    const { definition, outerArea } = this.tgaGrid()[GRID];
    return gridMarkup(definition).elements(outerArea);
  });

  /** The outer grid's area: on the size container when this grid has one, else here. */
  protected readonly area = computed(() =>
    this.hasOwnSizeContainer() ? undefined : this.tgaGrid()[GRID].outerArea,
  );

  constructor() {
    // In development, in the browser, check the slots after every render.
    if (isDevMode() && inject(PLATFORM_ID) === "browser") {
      const host: Element = inject(ElementRef).nativeElement;
      afterEveryRender(this.developmentCheck(host));
    }
  }

  ngOnChanges(): void {
    this.styles.insert(this.tgaGrid()[GRID].definition);
  }

  private hasOwnSizeContainer(): boolean {
    return this.sizeContainer?.grid() === this;
  }

  /** The development check of one grid instance: each set of problems is warned about once. */
  private developmentCheck(host: Element): () => void {
    let definition: GridConfig<string> | undefined;
    let checkSlots: (grid: Element) => Array<string> = () => [];
    let wasUncontained = false;
    return () => {
      const current = this.tgaGrid()[GRID].definition;
      if (current !== definition) {
        definition = current;
        checkSlots = createSlotCheck(current, {
          strayChildRemedy: "make it a slot with [tgaArea]",
        });
      }
      const warnings = checkSlots(host);

      const uncontained =
        this.elements().sizeContainer !== undefined &&
        !(this.hasOwnSizeContainer() && this.sizeContainer?.element === host.parentElement);
      if (uncontained && !wasUncontained) {
        warnings.push(
          "typed-grid-areas: a grid with breakpoints needs its own size container as its " +
            "parent element. Wrap the grid in an element marked tgaSizeContainer.",
        );
      }
      wasUncontained = uncontained;

      for (const warning of warnings) {
        // eslint-disable-next-line no-console
        console.warn(warning);
      }
    };
  }
}

/**
 * Makes the element it's on the size container of the grid inside it, which
 * a grid with breakpoints needs: `<div tgaSizeContainer><div [tgaGrid]="Content">`.
 * When that grid fills an outer grid's area, the size container is the slot.
 */
@Directive({
  selector: "[tgaSizeContainer]",
  host: {
    "[attr.data-area]": "markup()?.attributes['data-area']",
    "[style.container-type]": "markup()?.style?.containerType",
    "[style.container-name]": "markup()?.style?.containerName",
    "[style.display]": "markup()?.style?.display",
    "[style.grid-template-columns]": "markup()?.style?.gridTemplateColumns",
  },
})
export class TgaSizeContainer {
  /** The grid this element contains: the first one in its content. */
  readonly grid = contentChild(TgaGrid);

  readonly element: Element = inject(ElementRef).nativeElement;

  protected readonly markup = computed(() => this.grid()?.elements().sizeContainer);
}
