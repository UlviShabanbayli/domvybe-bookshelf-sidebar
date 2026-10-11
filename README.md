# Bookshelf sidebar — UI component

**[Live demo](https://domvybe.com/components/bookshelf-sidebar/)** · [Step-by-step tutorial](https://domvybe.com/library/bookshelf-sidebar/) · [Download the ZIP](https://github.com/UlviShabanbayli/domvybe-bookshelf-sidebar/releases/latest/download/bookshelf-sidebar-source.zip)

A sidebar that is a bookshelf: pick a book and it flies off the shelf and opens with its chapters; drag the books into a new order, search dims the shelf, add your own; walnut and light oak.

Open `index.html` through any local static server (for example `python3 -m http.server`) and try it with a mouse,
a finger or the keyboard. Plain HTML, CSS and JavaScript; no build step, no libraries.

- `index.html` — the chooser: pick Library or Nordic
- `library` — Library: a course site with a walnut bookcase of cloth books (index.html, library.css, library.js, data.js = the courses, art.js = the lesson pictures)
- `nordic` — Nordic: a notes app with a light-oak shelf of notebooks (index.html, nordic.css, nordic.js, data.js)
- `shared` — the shared shelf: shelf.js (layout, tilt, keys, drag to reorder), sheet.js (the phone's chapters sheet), util.js, base.css, the fonts and the wood and cloth textures (generated in code)
- `thumbs` — the chooser's two pictures

The courses and notebooks are made up. The wood and cloth textures are generated in code, and the plant, bookend and
lesson pictures are drawn in SVG and CSS: no photos. The fonts in `shared/fonts/` (Inter by Rasmus Andersson,
Cormorant Garamond by Christian Thalmann) are under the SIL Open Font License 1.1, not MIT.

It respects `prefers-reduced-motion`. Made by Ulvi (Code with Ulvi) · domvybe.com

## Licence

MIT — see [LICENSE](LICENSE). Use it in your own projects, commercial ones included.
