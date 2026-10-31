/**
 * Hydrating server-rendered output, in the `browser-development` project,
 * where Svelte reports hydration mismatches.
 */
import { flushSync, hydrate, unmount } from "svelte";
import { gridId } from "typed-grid-areas";
import { commands } from "vitest/browser";
import Hydrated from "./fixtures/Hydrated.svelte";
import { cardGrid } from "./fixtures/grids.ts";
import "./test-utils/commands.ts";

/** The `<head>` style tags carrying the card's CSS. */
const cardStyles = () =>
  Array.from(document.head.querySelectorAll("style")).filter(style =>
    style.textContent?.includes(gridId(cardGrid)),
  );

describe("hydrating server-rendered grids", () => {
  let target: HTMLElement;
  let headNodes: Array<ChildNode>;

  beforeEach(async () => {
    const { head, body } = await commands.renderOnServer("src/fixtures/Hydrated.svelte");
    const before = new Set(document.head.childNodes);
    document.head.insertAdjacentHTML("beforeend", head);
    headNodes = Array.from(document.head.childNodes).filter(node => !before.has(node));
    target = document.createElement("div");
    target.innerHTML = body;
    document.body.append(target);
    vi.spyOn(console, "warn");
    vi.spyOn(console, "error");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    target.remove();
    headNodes.forEach(node => node.remove());
  });

  it("reuses the server's style tag, with no hydration warning", async () => {
    const serverStyle = cardStyles()[0];
    expect(cardStyles()).toHaveLength(1);

    const app = hydrate(Hydrated, { target });
    flushSync();

    expect(cardStyles()).toEqual([serverStyle]);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(target.querySelectorAll(`[data-grid-id="${gridId(cardGrid)}"]`)).toHaveLength(3);
    unmount(app);
  });

  it("keeps the CSS in <head> once after the owning instance unmounts", async () => {
    const app = hydrate(Hydrated, { target });
    flushSync();

    app.remove(1);
    flushSync();
    expect(target.querySelectorAll(`[data-grid-id="${gridId(cardGrid)}"]`)).toHaveLength(2);
    expect(cardStyles()).toHaveLength(1);

    app.remove(2);
    flushSync();
    expect(cardStyles()).toHaveLength(1);

    app.remove(3);
    flushSync();
    expect(cardStyles()).toHaveLength(0);
    expect(console.warn).not.toHaveBeenCalled();
    unmount(app);
  });
});
