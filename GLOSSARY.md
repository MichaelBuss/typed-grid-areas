# typed-grid-areas

Type-safe CSS grid layouts that rearrange themselves based on which slots are rendered and how much room they get.

## Language

**Grid**:
One declared layout surface: a set of areas plus the layouts that arrange them.
_Avoid_: Grid areas (as a noun for the whole thing), template
_Note_: `defineLayout` and its `LayoutDefinition` define a whole grid (its areas and all its layouts), not one layout; the API name is fixed by the spec.

**Area**:
A named region of a grid that exactly one slot fills.
_Avoid_: Cell, region, part

**Optional area**:
An area whose slot may be absent. Every other area is required: its slot is always expected to be rendered.
_Avoid_: Conditional area, nullable area

**Slot**:
The rendered element that fills an area. A slot is either present or absent.
_Avoid_: Child, item
_Note_: Not the HTML `<slot>` element, nor Vue's or Svelte's slots; a slot here is always an element in the page.

**Layer**:
An area drawn on top of cells that another area owns, for example a badge over a photo.
_Avoid_: Overlay, floating area

**Nested grid**:
A grid that is itself the slot of an area in another grid.
_Avoid_: Subgrid (that's a different CSS feature), child grid

**Layout**:
One arrangement of a grid's areas into rows and columns, with optional track sizes and per-area alignment. Areas a layout leaves out are hidden while it applies, whatever `display` the slot's own styles give it.
_Avoid_: Template, variant

**Derived layout**:
A layout the library produces from an authored layout for one combination of absent optional areas, by leaving those areas out.
_Avoid_: Generated layout, fallback layout

**Override**:
An authored layout with a condition, written because the derived layout for that case isn't the arrangement you want.
_Avoid_: Exception, special case

**Base layout**:
The layout that applies when no other layout's condition matches.
_Avoid_: Default layout, fallback

**Condition**:
The rule that decides when a layout applies, stated as areas that must be present and areas that must be absent. Areas it doesn't mention don't affect it.
_Avoid_: Variant, state, `when` (that's one half of a condition, not the whole of it)

**Breakpoint**:
A width threshold at which a layout switches to a different arrangement, measured against the space the grid itself is given (never an outer grid's).
_Avoid_: Media query, responsive variant

**Adapter**:
What renders grids in one UI framework, turning a definition into that framework's components. Every adapter offers the same concepts (slots, nested grids, hidden areas); how it spells them follows its framework.
_Avoid_: Renderer, binding, integration

**Server-only grid**:
A grid rendered on the server, in a page or region that is never hydrated, so none of the library's code runs in the browser for it.
_Avoid_: Static grid, zero-JS grid

**Precompiled definition**:
A definition whose CSS and markup are produced when the app is built, instead of when it runs.
_Avoid_: Compiled grid, static definition
