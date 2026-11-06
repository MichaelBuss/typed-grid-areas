import { Component } from "@angular/core";
import { PreferenceCard } from "./preference-card";

@Component({
  selector: "app-root",
  imports: [PreferenceCard],
  template: `
    <main>
      <h1>typed-grid-areas with Angular</h1>
      <div class="cards">
        <app-preference-card
          [selectable]="true"
          icon="★"
          heading="Weekly digest"
          tag="New"
          details="Sent on Mondays at 8:00"
        />
        <app-preference-card icon="★" heading="Monthly report" />
        <app-preference-card heading="Security alerts" tag="Recommended" />
      </div>
    </main>
  `,
})
export class App {}
