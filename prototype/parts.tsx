// PROTOTYPE (issue #4) — throwaway. Leaf content shared by every variant, so variants only
// differ in layout code. Visuals approximate Iris PreferenceCard; they are not the real thing.
import { ComponentPropsWithoutRef } from "react";

/** Which optional parts a demo card renders. */
export type Parts = {
  input: boolean;
  icon: boolean;
  titleTag: boolean;
  cardTag: boolean;
  children: boolean;
};

export const demo = {
  title: "Customers",
  description:
    "The app enables users to configure customer facing portals, and to invite customers to access the portal.",
};

export function Tag({ children, small = false }: { children: string; small?: boolean }) {
  return <span className={small ? "tag tag-small" : "tag"}>{children}</span>;
}

export function IconBox(props: ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className="icon-box">
      <svg fill="white" height="16" viewBox="0 0 20 20" width="16">
        <path d="M7 8a3 3 0 100-6 3 3 0 000 6zm7 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1 16a6 6 0 0112 0v1H1v-1zm13 1v-1c0-1.4-.4-2.7-1-3.8a4.5 4.5 0 016 3.8v1h-5z" />
      </svg>
    </div>
  );
}

/** Title + optional title tag + description. Micro layout: plain flex, outside the grid (Q6). */
export function Information({
  titleTag,
  ...props
}: { titleTag: boolean } & ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className="info">
      <div className="title-row">
        <span className="title">{demo.title}</span>
        {titleTag ? <Tag small>Beta</Tag> : null}
      </div>
      <p className="description">{demo.description}</p>
    </div>
  );
}

export function Checkbox() {
  return <input aria-label="Enable" type="checkbox" />;
}

export function ExtraContent() {
  return <div className="extra">Extra content (children): pricing details, links, etc.</div>;
}
