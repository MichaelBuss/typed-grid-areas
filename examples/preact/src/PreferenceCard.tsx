import type { ComponentChildren } from "preact";
import { createGridComponent } from "@typed-grid-areas/preact";
import { preferenceCardGrid, preferenceContentGrid } from "./designs";

const Content = createGridComponent(preferenceContentGrid);
const Card = createGridComponent(preferenceCardGrid, { nest: { content: Content } });

type PreferenceCardProps = {
  input?: ComponentChildren;
  icon?: ComponentChildren;
  title: ComponentChildren;
  tag?: ComponentChildren;
  children?: ComponentChildren;
};

/** Optional areas are absent when their slot isn't rendered: leave out a prop to see the layout change. */
export function PreferenceCard({ input, icon, title, tag, children }: PreferenceCardProps) {
  return (
    <Card class="card">
      {input && (
        <Card.input asChild class="panel input">
          <label>{input}</label>
        </Card.input>
      )}
      <Card.content class="panel content">
        {/* Misspell an area, say <Card.content.iconn>, and `npm run typecheck` reports it. */}
        {icon && <Card.content.icon>{icon}</Card.content.icon>}
        <Card.content.information>{title}</Card.content.information>
        {tag && <Card.content.cardTag class="tag">{tag}</Card.content.cardTag>}
        {children && <Card.content.children>{children}</Card.content.children>}
      </Card.content>
    </Card>
  );
}
