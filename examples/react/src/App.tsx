import { PreferenceCard } from "./PreferenceCard";

export function App() {
  return (
    <main>
      <h1>typed-grid-areas with React</h1>
      <div className="cards">
        <PreferenceCard
          input={<input type="checkbox" defaultChecked aria-label="Weekly digest" />}
          icon="★"
          title="Weekly digest"
          tag="New"
        >
          Sent on Mondays at 8:00
        </PreferenceCard>
        <PreferenceCard icon="★" title="Monthly report" />
        <PreferenceCard title="Security alerts" tag="Recommended" />
      </div>
    </main>
  );
}
