// Angular's packages ship partially compiled; outside the CLI's build, the
// compiler finishes them at runtime.
import "@angular/compiler";

// The CLI defines this in server builds; without it, client-only code (event
// replay, hydration logging) runs on the server too.
(globalThis as { ngServerMode?: boolean }).ngServerMode = true;
