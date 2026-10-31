/**
 * Hydrating server-rendered HTML whose `<head>` holds the grid style
 * sheet's tags, as an app's client entry does.
 */
import { hydrate } from "preact";
import { renderToString } from "preact-render-to-string";
import { defineLayout, gridId } from "typed-grid-areas";
import { GRID_STYLE_ATTRIBUTE } from "typed-grid-areas/adapter";
import { createGridComponent, createGridStyleSheet } from "./index.ts";

const contentGrid = defineLayout({
  areas: ["icon?", "title"],
  layouts: [
    {
      template: "icon title",
      columns: "21px 1fr",
      breakpoints: { "@sm": { template: "title icon" } },
    },
  ],
});
const cardGrid = defineLayout({
  areas: ["input?", "content"],
  layouts: [{ template: "input content", columns: "22px minmax(0, 1fr)" }],
});
const Content = createGridComponent(contentGrid);
const Card = createGridComponent(cardGrid, { nest: { content: Content } });

function App() {
  return (
    <div style={{ width: "300px" }}>
      {[1, 2].map(index => (
        <Card key={index} class="card">
          <Card.input asChild>
            <label>
              <input type="checkbox" />
            </label>
          </Card.input>
          <Card.content>
            <Card.content.icon>★</Card.content.icon>
            <Card.content.title>Title {index}</Card.content.title>
          </Card.content>
        </Card>
      ))}
    </div>
  );
}

const tagsFor = (definition: typeof cardGrid | typeof contentGrid) =>
  document.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}="${gridId(definition)}"]`);

it("keeps the server's DOM and style tags, and logs no errors", () => {
  const sheet = createGridStyleSheet();
  const body = renderToString(sheet.collect(<App />));
  document.head.insertAdjacentHTML("beforeend", sheet.toString());
  const root = document.createElement("div");
  root.innerHTML = body;
  document.body.append(root);
  const serverHtml = root.innerHTML;
  const serverElements = Array.from(root.querySelectorAll("*"));

  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  hydrate(<App />, root);

  expect(root.innerHTML).toBe(serverHtml);
  expect(Array.from(root.querySelectorAll("*"))).toEqual(serverElements);
  expect(tagsFor(cardGrid)).toHaveLength(1);
  expect(tagsFor(contentGrid)).toHaveLength(1);
  expect(error).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  vi.restoreAllMocks();

  // And the server's CSS lays the grid out.
  const title = root.querySelector<HTMLElement>("[data-area=content]")!;
  expect(title.getBoundingClientRect().x - root.getBoundingClientRect().x).toBe(22);
  root.remove();
});
