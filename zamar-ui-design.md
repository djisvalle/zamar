Design a mobile-first UI for "Zamar," a live-performance chord-chart and sheet-music app for musicians and worship leaders. I want you to treat the current design as a functional baseline only — feel free to rethink layout, visual hierarchy, spacing, navigation patterns, and styling wherever it improves the experience. Don't feel obligated to replicate the current look pixel-for-pixel; propose something better where you see the opportunity, but keep every flow and piece of functionality described below intact.

## Who it's for and how it's used
Musicians and worship leaders use this on a phone (sometimes a tablet) while actively playing an instrument on stage — often one-handed, in dim lighting, mid-song. Design for:
- Large, thumb-reachable tap targets; controls that work under low light and under time pressure
- A dark theme that's genuinely easy to read on stage (not just an inverted palette) alongside a light theme
- Fast, low-friction access to the most time-critical actions (transpose, switch songs in a setlist, jump between chord/sheet views) — these should never be buried
- Minimal chrome during actual performance so the chart/music is the star

## Brand starting point (adjust freely)
Current palette: warm, "classical" aesthetic — warm amber/gold accent (#b68235 on light, #e1ad66 on dark), warm neutral grays (not cool/blue grays), two themes named "Light" and "Stage Dark." System sans-serif everywhere except chord-over-lyric grids, which use monospace for alignment. Rounded corners are small/subtle (2-7px), not heavily rounded. Take this as a mood/starting point — propose refinements to color, type, or spacing if you think it reads better, especially for stage legibility.

## Platform note
This ships as a React Native (Expo) app using Tailwind/NativeWind styling. Build the screens as responsive web UI (React + Tailwind) sized and interacted with as a mobile app — that's fine as a design reference even though the final implementation is native. Prioritize phone viewport (~375-430px wide) but the layout should also hold up on a small tablet, since the app uses one shell across screen sizes.

## Data model (for realistic content)
- **Song**: title, artist, key (musical key, e.g. "G"), tempo, meter, source type (PDF / MusicXML / typed chord chart), a chord-over-lyric text chart, an optional imported sheet music file (PDF or MusicXML), freehand pen annotations on PDF pages, favorite flag, plus live-performance state: current transpose (semitones), capo position, clef (treble/alto/bass), and which sheet mode is active.
- **Setlist**: a name and an ordered list of songs. Setlists can be auto-ordered by key, and the UI should be able to flag an "abrupt key change" between two adjacent songs (i.e., a transition that isn't a closely related key).
- **Global settings**: enharmonic spelling (sharp vs. flat, e.g. F# vs. Gb), light/Stage Dark appearance, library sort mode (by letter / by key / by artist), auto-order-setlists-by-key toggle.

## Screens to design

**1. Live Stage (home/performance screen)**
The app's default screen — no separate "home" or "library" screen exists outside of this. Two states:
- *Empty state*: no song loaded yet. Friendly prompt to open the menu and pick a song. A disabled/inactive "Music Tools" affordance is visible but not usable yet.
- *Song loaded*: 
  - A compact top bar: menu trigger, song title (centered/truncated), an edit button
  - A header area with song title, artist, and where the chart came from (e.g. "Uploaded PDF — static" or "MusicXML — transposable"), a toggle between "Chord Chart" and "Sheet Music" views, and the current *live* key (base key adjusted by any active transpose)
  - **Chord Chart view**: a monospace, chord-over-lyric display (like a classic chord chart) — chords rendered in the accent color above the lyric line, transposed live
  - **Sheet Music view**: either an embedded PDF (with lightweight pen annotation tools — draw, undo, clear-page) or an embedded MusicXML rendering (with an instrument-filter option and a toggle to show note names)
  - A floating "Music Tools" button that expands into a panel with: a 12-key transpose grid, sheet source toggle (PDF/MusicXML), clef toggle, enharmonic toggle, note-names toggle, and capo +/- stepper
  - When the user is actively performing a setlist, a floating "active setlist" shortcut appears, and swiping left/right on the chart/sheet area moves to the next/previous song in that setlist (with a "song X of Y" indicator)

**2. Menu (slide-in navigation drawer)**
Opens from the top bar, covers roughly 3/4 of the screen width, slides from the left. Root menu has three entries — Library, Setlist, Settings — each drilling into its own pane within the same drawer (with a back chevron to return to the root). Consider whether a drawer is even the best pattern here, or whether something else serves this better on mobile.
- **Library pane**: full song list, sortable (by letter / key / artist), each row shows title, artist, key, and a favorite (star) toggle; a button to create a new song; shows total song count
- **Setlist pane**: list of saved setlists, each showing song count and a preview of the key progression (e.g. "G → D → Em"), with edit and delete actions per setlist, and a "create new setlist" action. Editing/creating opens a **setlist builder** sub-view: name field, auto-order-by-key toggle, a reorderable draft list of songs in the setlist (manual up/down reordering when auto-order is off, with a warning badge on abrupt key changes), and a section below to add more songs from the library (filterable to favorites only)
- **Settings pane**: enharmonic spelling toggle, per-song sheet source override, light/Stage Dark theme toggle, auto-order-setlists-by-key toggle

**3. Setlist Details (full screen)**
Reached by tapping a setlist. Shows the setlist name, a prominent "Start Setlist" / "Stop Setlist" action, song count, and the ordered list of songs (title + key) — tapping a song jumps into Live Stage with that setlist active for swipe-navigation.

**4. Add / Edit Song (full screen)**
Reached from the Library pane or the Live Stage edit button. A source-type selector (PDF / MusicXML / "Type it in"), title and artist fields, a key stepper with a favorite toggle alongside it, and then source-specific input: a file dropzone for PDF/MusicXML imports, or a multiline monospace text editor for typing a chord-over-lyric chart directly.

**5. Instrument Filter (modal)**
A focused modal opened from the MusicXML sheet view for multi-instrument scores: select-all / deselect-all actions and a checklist of instrument parts to show/hide in the rendered score.

## What to prioritize in your proposal
- A performance-first Live Stage screen that gets out of the way of the music
- Clear, fast affordances for transpose/capo/key changes — these get used constantly, mid-song
- A navigation pattern for Library/Setlist/Settings that you think works best on mobile (feel free to challenge the drawer-with-sub-panes pattern currently in place)
- Strong readability in both themes, especially Stage Dark, under real stage-lighting conditions
- A setlist-building flow that makes key-progression and abrupt key changes easy to scan at a glance
