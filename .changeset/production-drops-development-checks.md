---
"typed-grid-areas": patch
"@typed-grid-areas/react": patch
"@typed-grid-areas/preact": patch
"@typed-grid-areas/vue": patch
"@typed-grid-areas/solid": patch
"@typed-grid-areas/lit": patch
"@typed-grid-areas/octane": patch
"@typed-grid-areas/angular": patch
---

Production builds no longer include the development-only checks. The config validation `defineLayout` runs and each grid's slot check, with their warning messages, are now dropped when your bundler (such as Vite or esbuild) builds for production, so they cost nothing in your app's bundle. In development they warn as before, and importing the library without a bundler, where `process` doesn't exist, still works and logs nothing.
