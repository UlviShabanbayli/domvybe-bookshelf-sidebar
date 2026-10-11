// SHELF · Nordic: the starting notebooks. Real notes, real dates (autumn 2026), no duplicates.
const d = (s) => `2026-${s}T09:30:00`;
const N = (id, title, edited, body) => ({ id, title, edited: d(edited), body });

export const PASTELS = [
  { name: 'Rose', c: '#efbcc0' }, { name: 'Periwinkle', c: '#a3b3d6' }, { name: 'Sage', c: '#acc9a9' }, { name: 'Apricot', c: '#f5c89e' },
  { name: 'Slate', c: '#93a4b6' }, { name: 'Cream', c: '#efe5cc' }, { name: 'Lilac', c: '#c9b8dc' }, { name: 'Mint', c: '#b5dccd' },
];
export const ICONS = ['bulb', 'book', 'mug', 'plane', 'doc', 'journal', 'heart', 'star', 'leaf', 'music'];

export const NOTEBOOKS = [
  { id: 'ideas', title: 'Ideas', color: '#efbcc0', icon: 'bulb', hf: 0.93, tf: 1.0, notes: [
    N('plant-sitter', 'An app that waters plants', '10-08', 'A tiny moisture sensor in the pot, a phone notification when it is dry.\n\nWhy now: sensors cost under $4 and everyone I know has killed a basil plant.\n\nFirst version\n- One plant, one sensor, one notification\n- Learn each plant\'s rhythm over two weeks\n- No account needed\n\nRisk: people stop opening the app once the plant is fine. Maybe that is the point.'),
    N('podcast', 'Podcast: tiny design wins', '10-02', 'Ten-minute episodes, one small design decision per episode.\n\nEpisode ideas\n- Why the iPhone alarm snooze is 9 minutes\n- The checkout button that moved 40 px\n- Empty states that sell\n- The colour of the London Underground map\n\nFormat: one guest, one screenshot, one lesson.'),
    N('workshop', 'Weekend workshop format', '09-27', 'Two mornings, twelve people, one real brief.\n\nSaturday: research and sketches, crit at noon.\nSunday: one prototype per pair, demo at 12:30, lunch together.\n\nKeep the room bright, the tables big and the laptops closed until Sunday.'),
  ] },
  { id: 'reading', title: 'Reading list', color: '#a3b3d6', icon: 'book', hf: 0.88, tf: 1.04, notes: [
    N('everyday-things', 'The Design of Everyday Things', '10-07', 'Don Norman, revised edition (2013).\n\nOn chapter 4. Notes so far:\n- Affordances are relationships, signifiers are the clues\n- When people fail, blame the design first\n- Good feedback is immediate and informative\n\nTo try: label every door handle in the office for a week.'),
    N('shape-up', 'Shape Up', '09-30', 'Ryan Singer, Basecamp.\n\nSix-week cycles, two-week cool-downs. Work is shaped before it is bet on, and the appetite fixes the time, not the scope.\n\nIdea to steal: the hill chart for showing progress without percentages.'),
    N('pattern-language', 'A Pattern Language', '09-21', 'Christopher Alexander et al. (1977).\n\nReading a pattern a night. Favourites so far:\n- 159 Light on two sides of every room\n- 180 Window place\n- 251 Different chairs\n\nEach pattern is a problem, a solution and the patterns around it. Very close to how design systems should be written.'),
    N('thinking-fast', 'Thinking, Fast and Slow', '09-12', 'Daniel Kahneman (2011). Paused at part 3.\n\nSystem 1 is fast and automatic; system 2 is slow and effortful. Most interface decisions are made by system 1, so defaults matter more than explanations.'),
  ] },
  { id: 'recipes', title: 'Recipes', color: '#acc9a9', icon: 'mug', hf: 0.89, tf: 1.0, notes: [
    N('cardamom-buns', 'Cardamom buns', '10-04', 'Makes 12.\n\nDough: 500 g flour, 75 g sugar, 7 g dry yeast, 1 tsp ground cardamom, 1/2 tsp salt, 250 ml warm milk, 75 g soft butter, 1 egg.\n\nFilling: 100 g soft butter, 80 g brown sugar, 2 tsp cardamom.\n\nRoll to 30 × 40 cm, spread, fold in thirds, cut 12 strips, twist and knot. Rise 45 min. Bake 200 °C for 10–12 min. Brush with syrup while warm.'),
    N('miso-soup', 'Weeknight miso soup', '09-29', '15 minutes, serves 2.\n\n800 ml dashi (or water + 1 tsp dashi powder), 3 tbsp white miso, 150 g silken tofu, a handful of spinach, 2 spring onions.\n\nWarm the dashi, never boil after the miso goes in. Whisk the miso in a ladle of broth first.'),
    N('olive-oil-cake', 'Lemon olive oil cake', '09-15', '3 eggs, 200 g sugar, zest of 2 lemons, 160 ml olive oil, 120 ml yoghurt, 200 g flour, 2 tsp baking powder, pinch of salt.\n\nWhisk eggs and sugar until pale, add zest, oil and yoghurt, fold in the dry. 23 cm tin, 175 °C, 40 minutes.'),
  ] },
  { id: 'travel', title: 'Travel', color: '#f5c89e', icon: 'plane', hf: 0.94, tf: 1.02, notes: [
    N('lisbon', 'Lisbon in November', '10-09', 'Nov 12–17. Flat in Graça, near the 28 tram.\n\n- Thursday: Gulbenkian museum and garden\n- Friday: day trip to Sintra, early train from Rossio\n- Saturday: LX Factory, sunset at Miradouro da Senhora do Monte\n\nBook: dinner at a tasca in Alfama for Saturday.'),
    N('packing', 'Packing list', '10-03', 'Carry-on only.\n\n- Rain jacket\n- Two pairs of shoes, one waterproof\n- Plug adapter (type F)\n- Camera, one lens\n- Sketchbook and the good pen\n- Book for the flight'),
    N('kyoto', 'Kyoto rail days', '09-18', 'Spring trip idea, 6 days.\n\nBase in Kyoto, day trips by train: Nara (45 min), Osaka (15 min by shinkansen), Uji for tea.\n\nGo early to Fushimi Inari, before 7:00.'),
  ] },
  { id: 'work', title: 'Work', color: '#93a4b6', icon: 'doc', hf: 0.87, tf: 1.06, notes: [
    N('project-alpha', 'Project Alpha roadmap', '10-09', 'Goal: ship the redesigned onboarding by December 4.\n\nPhase 1 · Research (Oct 5–16)\n- Interview 8 new users about their first week\n- Map where people drop off in the current flow\n\nPhase 2 · Design (Oct 19–Nov 6)\n- Prototype three onboarding paths\n- Test the top two with 5 people each\n\nPhase 3 · Build (Nov 9–Dec 4)\n- Ship behind a flag to 10 % of sign-ups\n- Watch activation for two weeks before the full rollout\n\nOpen questions\n- Do teams need their own path?\n- Who owns the welcome email?'),
    N('meeting-oct-6', 'Oct 6: Meeting notes', '10-06', 'Weekly product sync. Present: Ana, Ravi, Mei, me.\n\n- Research recruiting is done: 8 interviews booked\n- Ravi needs the event list for the analytics dashboard by Friday\n- Mei raised the question of a team path; parked until the interviews\n\nActions\n- Me: interview guide draft by Wednesday\n- Ana: share last quarter\'s drop-off data'),
    N('marketing-sync', 'Marketing sync', '10-02', 'Launch story for December.\n\nOne message: "Get set up in five minutes." Support it with the activation numbers from the beta.\n\nChannels: blog post, changelog, a 30-second product film, email to trial users.'),
    N('q4-ideas', 'Oct 1: Ideas for Q4', '10-01', '- Keyboard shortcuts sheet (press ?)\n- Undo for every destructive action\n- Faster first load: split the editor bundle\n- Weekly digest email, opt-in'),
    N('ux-feedback', 'UX feedback', '09-24', 'From the September usability round (6 people).\n\n- 4 of 6 missed the import button; it reads as decoration\n- Everyone understood the empty state copy\n- Two people expected the sidebar to remember its width\n- The success toast disappears too fast to read'),
  ] },
  { id: 'journal', title: 'Journal', color: '#efe5cc', icon: 'journal', hf: 0.72, tf: 0.94, notes: [
    N('oct-9', 'Oct 9: A quiet day', '10-09', 'Rain all morning. Wrote for two hours before opening email, which felt like a small victory.\n\nWalked to the market at lunch; the first clementines are in.'),
    N('oct-4', 'Oct 4: First frost', '10-04', 'Frost on the car this morning. Moved the basil inside.\n\nFinished the bookshelf sketch, finally happy with the spacing.'),
    N('sep-28', 'Sep 28: The move', '09-28', 'Last boxes unpacked. The new desk faces the window and the light at four o\'clock is perfect.'),
  ] },
];
