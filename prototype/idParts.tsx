// PROTOTYPE (issue #4) — throwaway. Leaf content for the ID-card stretch goal, shared by its
// variants. A fictional person; visuals are placeholders.

/** Which optional parts a demo ID card renders. */
export type IdParts = { logo: boolean; qr: boolean; badge: boolean };

export function Photo() {
  return <div className="photo">AM</div>;
}

/** White-on-gradient while layered over the photo, via a style query on `--tga-over` (see CSS). */
export function Identity() {
  return (
    <div className="identity">
      <strong>Alex Morgan</strong>
      <span>Field technician</span>
    </div>
  );
}

export function Details() {
  return (
    <dl className="details">
      <dt>ID</dt>
      <dd>004217</dd>
      <dt>Valid until</dt>
      <dd>31 Dec 2027</dd>
      <dt>Site</dt>
      <dd>North depot</dd>
    </dl>
  );
}

export function Logo() {
  return <div className="logo">LOGO</div>;
}

export function Badge() {
  return <span className="badge">Visitor</span>;
}

export function Qr() {
  return <div aria-label="QR code" className="qr" role="img" />;
}
