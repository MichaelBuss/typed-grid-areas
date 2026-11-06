import type { ReactNode } from "react";
import { createGridComponent } from "@typed-grid-areas/react";
import { preferenceCardGrid, preferenceContentGrid } from "./designs";

const Content = createGridComponent(preferenceContentGrid);
const Card = createGridComponent(preferenceCardGrid, { nest: { content: Content } });

type PreferenceCardProps = {
  input?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  tag?: ReactNode;
  children?: ReactNode;
};

/** Optional areas are absent when their slot isn't rendered: leave out a prop to see the layout change. */
export function PreferenceCard({ input, icon, title, tag, children }: PreferenceCardProps) {
  return (
    <Card className="card">
      {input && (
        <Card.input asChild className="panel input">
          <label>{input}</label>
        </Card.input>
      )}
      <Card.content className="panel content">
        {/* Misspell an area, say <Card.content.iconn>, and `npm run typecheck` reports it. */}
        {icon && <Card.content.icon>{icon}</Card.content.icon>}
        <Card.content.information>{title}</Card.content.information>
        {tag && <Card.content.cardTag className="tag">{tag}</Card.content.cardTag>}
        {children && <Card.content.children>{children}</Card.content.children>}
      </Card.content>
    </Card>
  );
}
