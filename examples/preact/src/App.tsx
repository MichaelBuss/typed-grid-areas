import { PreferenceCard } from "./PreferenceCard";

export function App() {
  return (
    <main>
      <h1>typed-grid-areas with Preact</h1>
      <div class="cards">
        <PreferenceCard
          input={<input type="checkbox" checked aria-label="Weekly digest" />}
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
