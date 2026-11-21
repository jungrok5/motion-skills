// The Packet Post — how a web page reaches you, as a pop-up quest. Written from BRIEF.md in this folder.
// Quill, a pigeon courier, carries one request across a paper island: the address tower (DNS), the knocking ferry
// (the TCP handshake), the post office (HTTP), the sorting loom (packets) and the window house (rendering).
export default {
  title: 'The Packet Post',
  subtitle: 'HOW A WEB PAGE REACHES YOU',
  mark: 'map',
  mapTitle: 'From your click to your window',
  theme: { cover: '#2f5a6e', cloth: '#4a6658', accent: '#e9b44c', paper: '#efe2c2' },
  hero: 'quill',
  cast: {
    quill:   { name: 'Quill', species: 'bird', mass: 'light', height: 1.08, fur: '#9aa8ba', belly: '#ece6da', coat: '#3c6d8e', collar: '#d3a74b', hat: { type: 'cap', color: '#2b4b66' }, bag: '#b8763b', boot: '#4a3a33', nose: '#e0a33a',
               item: [{ pts: [[-6, -4], [6, -4], [6, 4], [-6, 4]], fill: '#f6ecd2' }, { pts: [[-6, 4], [0, -1], [6, 4]], fill: '#d9c9a2' }] },
    ledger:  { name: 'Ledger', species: 'owl', mass: 'medium', height: 1.12, fur: '#9a7756', belly: '#ead6aa', coat: '#56688c', collar: '#c9a24a', nose: '#e0a33a', eye: '#2d2a26' },
    pike:    { name: 'Pike', species: 'frog', mass: 'medium', height: 1.0, fur: '#7fae69', belly: '#dfeab9', coat: '#c56b3b', collar: '#e0b04a' },
    tally:   { name: 'Tally', species: 'mouse', mass: 'light', height: .98, fur: '#aaa39f', belly: '#efe5d3', coat: '#a5483a', inner: '#e3aaa1', collar: '#f1e4c3' },
    bramble: { name: 'Bramble', species: 'bear', mass: 'heavy', height: 1.2, fur: '#8a6243', belly: '#e3c9a0', coat: '#4d7b69', boot: '#3e3029' },
    wick:    { name: 'Wick', species: 'cat', mass: 'light', height: 1.02, fur: '#e2a45c', belly: '#f6e7c9', coat: '#3a4a6c', hat: { type: 'tall', color: '#2a2f3d' }, inner: '#c9785a' },
  },
  chapters: [
    {
      id: 'tower', title: ['The Address', 'Tower'], region: 'Name Hills', feature: 'DNS', stamp: 'Name Finder', coords: 'N 12° · E 04°', sky: 'morning',
      line: 'Quill has a parcel marked “harbor.town”, but roads only know numbers.',
      story: 'Quill’s satchel holds a request for a page at harbor.town. At the foot of Name Hills, Ledger keeps the great address book. “Names are for people,” says Ledger. “Roads only know numbers.”',
      lesson: 'Before your browser can fetch a page, it asks a DNS server to turn the site’s name into an IP address — the number routers use.',
      hint: 'Open Ledger’s address book.', prop: { label: 'Open the address book', hint: 'Ledger turns to the H pages.' },
      task: { type: 'choice', prompt: 'Quill asks for harbor.town. What does the address book give back?', options: ['The whole page, ready to read', 'A number: 93.184.216.34', 'A password for the harbour'], answer: 1,
        hint: 'The book only knows where things are, not what they say.', solved: 'Ledger copies 93.184.216.34 onto Quill’s parcel. Now every road on the island knows where it goes.' },
      ground: { land: '#a9c47c', path: [[-4.9, 2.2], [-3.4, 1.7], [-1.6, 1.4], [.4, 1.0], [2.0, .6]], sand: [] },
      set(S) {
        const { P, C } = S;
        S.mountains(-5.5, 5.5, -2.95, [[-4.6, 1.5], [-3.6, .9], [-2.4, 1.75], [-1.0, 1.1], [.6, 1.9], [2.2, 1.2], [3.5, 1.6], [4.8, 1.0]], '#7f97a3');
        S.ridge(-5.4, 5.4, -2.45, [[-4.8, .7], [-3.2, 1.0], [-1.8, .65], [-.4, .9], [1.2, .7], [2.8, 1.0], [4.4, .75]], '#8fb070');
        S.sun(-2.2, -2.2, 3.1, .55); S.cloud(-4.1, -1.9, 2.6, 1.0); S.cloud(3.9, -2.1, 2.9, 1.2);
        for (const [x, z, h] of [[-5.0, -1.4, 1.3], [-4.3, -.6, 1.0], [-5.1, .6, 1.1], [4.4, -1.3, 1.4], [5.0, -.3, 1.0], [4.7, 1.0, 1.15], [-3.0, -1.4, .9]]) S.pine(x, z, h);
        S.tree(-1.5, -1.3, 1.0, '#7aa35e');
        // the tower: stone drum, a reading room, a slate cone, a weather flag
        const tower = S.add(1.6, -1.0, g => {
          P.cyl(g, 0, .9, 0, .62, .72, 1.8, C.stone, 10); for (let i = 0; i < 6; i++) P.cyl(g, 0, .18 + i * .3, 0, .66 - i * .015, .7 - i * .015, .04, '#b9a481', 10);
          P.cyl(g, 0, 2.05, 0, .78, .7, .5, C.cream, 10); P.cyl(g, 0, 2.32, 0, .84, .84, .06, C.wood, 10);
          P.hipRoof(g, 0, 2.35, 0, .9, .85, '#56677a', 10); P.flag(g, 0, 3.2, 0, .5, C.red);
          for (let i = 0; i < 5; i++) { const a = -.9 + i * .45; P.box(g, Math.sin(a) * .79, 2.05, Math.cos(a) * .79, .16, .24, .02, '#f3d68e').rotation.y = a; }
          P.box(g, 0, .38, .7, .34, .62, .04, C.wood); P.cyl(g, 0, .7, .7, .17, .17, .04, C.wood, 10).rotation.x = Math.PI / 2;
        }, { name: 'tower' });
        S.house(3.3, -.6, { w: .9, h: .7, d: .7, roofC: C.rust }); S.house(-3.7, .1, { w: .8, h: .62, d: .65, roofC: '#5f7f6a', wall: '#efe0c0' });
        // the number banner unrolls down the tower's front when the task is solved
        const banner = P.group(tower.content, 0, 1.78, .74); banner.name = 'banner';
        P.box(banner, 0, 0, 0, 1.0, .05, .05, C.wood);
        const cloth = P.group(banner, 0, 0, .02); P.box(cloth, 0, -.24, 0, .9, .48, .015, C.cream); P.slab(cloth, [[-.45, -.48], [.45, -.48], [0, -.62]], .015, C.cream);
        const lab = P.label('93.184.216.34', { w: .82, h: .2, color: '#2b4b66' }); lab.position.set(0, -.25, .012); cloth.add(lab);
        S.on(c => { const u = c.solved; banner.visible = u > 0; cloth.scale.y = Math.max(.001, u); });
        // the address book on its lectern — the prop
        const book = S.prop('address book', .6, .55, g => {
          P.box(g, 0, .3, 0, .1, .6, .1, C.wood); P.box(g, 0, .62, 0, .62, .05, .42, C.wood).rotation.x = -.35;
          const cover = P.group(g, 0, .66, 0); cover.rotation.x = -.35; cover.name = 'pages';
          P.box(cover, -.15, .03, 0, .28, .03, .36, '#f4e9cf'); const leaf = P.group(cover, 0, .05, 0); leaf.name = 'leaf'; P.box(leaf, .14, 0, 0, .28, .02, .36, '#efe2c2');
          P.box(cover, .15, .03, 0, .28, .03, .36, '#f4e9cf');
        }, { label: 'Open the address book' });
        const leaf = book.item.content.getObjectByName('leaf');
        book.on(c => { const flip = c.poke != null ? (Math.min(1, c.poke / .5) + Math.min(1, Math.max(0, c.poke - .6) / .5)) : 0; leaf.rotation.z = (flip % 1) * Math.PI * (c.poke != null && c.poke < 1.1 ? 1 : 0); });
        S.sign(-1.4, 2.25, 'Name Hills', 1);
        for (const [x, z] of [[-2.2, 2.6], [-.6, 2.4], [1.6, 2.5], [3.2, 2.2], [-4.4, 2.6], [4.4, 2.5]]) S.grass(x, z, .3);
        for (const [x, z] of [[-3.0, 2.2], [3.9, 1.7], [-.9, 2.8]]) S.flower(x, z, C.cream);
        S.rock(.55, -1.9, .3); S.bush(-2.6, -.5, .25);
        S.hero(-1.9, 1.15);
        S.guide('ledger', -.45, .45, { facing: 1 });
      },
    },
    {
      id: 'ferry', title: ['The Knocking', 'Ferry'], region: 'Three-Knock River', feature: 'TCP handshake', stamp: 'Ferry Hand', coords: 'N 17° · E 10°', sky: 'day',
      line: 'The river crossing opens only after three knocks — each side must hear the other.',
      story: 'The ferry to harbor.town waits on the far bank. Pike the ferry hand won’t cast off until both banks have heard each other clearly. “Knock,” says Pike, “and listen for the answer.”',
      lesson: 'Before sending data, your computer and the server agree to talk with a three-step handshake: SYN, SYN-ACK, ACK. Only then does the connection open.',
      hint: 'Ring the bell on the dock.', prop: { label: 'Ring the dock bell', hint: 'Put the three knocks in order.' },
      task: { type: 'order', prompt: 'Put the three knocks in the order they cross the river.', items: ['Quill: “Can you hear me?” (SYN)', 'Far bank: “Yes — can you hear me?” (SYN-ACK)', 'Quill: “Yes, I hear you!” (ACK)'],
        hint: 'Someone has to ask first, and the asker has the last word.', solved: 'Three lanterns light on the far bank. The connection is open, and Pike poles the ferry across.' },
      ground: { land: '#a8c47d', water: [[[-5.6, -.95], [-3, -1.15], [0, -.85], [3, -1.1], [5.6, -.9], [5.6, .75], [3, .95], [0, .7], [-3, .95], [-5.6, .8]]], path: [[-4.6, 2.3], [-2.6, 1.7], [-1.4, 1.1]] },
      set(S) {
        const { P, C } = S;
        S.ridge(-5.4, 5.4, -2.9, [[-4.6, 1.1], [-3.0, .7], [-1.6, 1.2], [-.2, .8], [1.4, 1.25], [3.0, .8], [4.6, 1.1]], '#7da36a');
        S.sun(2.4, -2.4, 3.2, .5); S.cloud(-2.6, -2.3, 2.8, 1.2); S.cloud(4.3, -1.8, 2.5, .9);
        for (const [x, z, h] of [[-5.0, -1.7, 1.3], [-4.0, -2.0, 1.0], [5.0, -1.6, 1.2], [3.9, -2.1, 1.05], [-5.2, 1.9, 1.0], [5.1, 2.2, 1.1]]) S.pine(x, z, h);
        // docks on both banks
        for (const [x0, z0] of [[-1.6, .95], [1.5, -1.3]]) S.add(x0, z0, g => { for (let i = 0; i < 4; i++) P.box(g, -.6 + i * .4, .08, 0, .36, .05, .6, i % 2 ? '#c9975c' : '#e3b273'); for (const x of [-.75, .75]) for (const z of [-.28, .28]) P.cyl(g, x, .14, z, .05, .05, .32, C.wood, 6); }, { name: 'dock' });
        // the far bank: three lanterns on posts that light one by one when the handshake completes
        const lamps = S.add(3.0, -1.75, g => { for (let i = 0; i < 3; i++) { P.beam(g, [i * .55 - .55, 0, 0], [i * .55 - .55, 1.05, 0], .025, C.wood, 5); P.beam(g, [i * .55 - .55, 1.0, 0], [i * .55 - .4, 1.0, 0], .015, C.ink, 4); const l = P.lantern(g, i * .55 - .4, .86, 0); l.name = 'lamp' + i; } }, { name: 'lanterns' });
        const lampMeshes = [0, 1, 2].map(i => lamps.content.getObjectByName('lamp' + i).children[1]);
        const lit = P.mat('#ffd27a', { emissive: '#ffb547', emissiveIntensity: 1.2 }), unlit = P.mat(C.honey);
        S.on(c => lampMeshes.forEach((m, i) => { m.material = c.solvedAt != null && c.t - c.solvedAt > .25 + i * .3 ? lit : unlit; }));
        S.house(4.2, -2.35, { w: .9, h: .7, d: .6, roofC: C.red }); S.house(-3.6, 2.0, { w: .8, h: .6, d: .6, roofC: '#5f7f6a' });
        // the ferry raft: crosses from the far dock to the near side of the right page when solved
        const raft = S.add(2.4, -.1, g => {
          const r = P.group(g); r.name = 'raft';
          for (let i = 0; i < 5; i++) P.cyl(r, -.4 + i * .2, .07, 0, .08, .08, .78, i % 2 ? '#b98552' : '#d8a468', 7).rotation.x = Math.PI / 2;
          P.box(r, .1, .3, 0, .36, .3, .36, C.cream); P.roof(r, .1, .45, 0, .48, .2, .44, C.teal); P.beam(r, [-.35, .1, .25], [-.6, 1.1, .1], .02, C.wood, 4);
        }, { name: 'ferry' });
        const rf = raft.content.getObjectByName('raft');
        S.on(c => { const u = c.solvedAt == null ? 0 : Math.min(1, Math.max(0, (c.t - c.solvedAt - .6) / 1.5)), e = u * u * (3 - 2 * u); rf.position.x = -1.0 * e; rf.position.y = Math.sin(c.t * 2.2) * .02; rf.rotation.z = Math.sin(c.t * 1.7) * .03; });
        for (const [x, z] of [[-4.3, -.2], [-.8, .1], [1.3, .2], [4.3, .1]]) S.ripple(x, z, .8, .4);
        // the dock bell — the prop
        const bell = S.prop('dock bell', -.75, 1.45, g => {
          P.box(g, 0, .6, 0, .08, 1.2, .08, C.wood); P.box(g, .18, 1.16, 0, .44, .06, .06, C.wood);
          const b = P.group(g, .36, 1.12, 0); b.name = 'bell'; P.beam(b, [0, 0, 0], [0, -.1, 0], .01, C.ink, 4); P.cyl(b, 0, -.2, 0, .06, .12, .18, C.ochre, 8); P.ball(b, 0, -.3, 0, .035, C.wood);
        }, { label: 'Ring the dock bell' });
        const bm = bell.item.content.getObjectByName('bell');
        bell.on(c => { const k = c.poke != null ? Math.exp(-2.4 * c.poke) : 0; bm.rotation.z = k * Math.sin(c.poke * 14) * .7; });
        S.sign(-3.0, 2.55, 'Ferry', 1);
        for (const [x, z] of [[-2.4, 2.8], [-4.6, 1.2], [3.4, 2.5], [1.8, 2.7], [4.8, 1.0]]) S.grass(x, z, .3);
        S.hero(-2.3, 1.45);
        S.guide('pike', 3.0, 1.55, { facing: -1 });
        S.rock(2.1, 2.4, .25); S.flower(2.6, 2.9, C.cream); S.bush(3.9, 2.9, .22);
      },
    },
    {
      id: 'post', title: ['The Request', 'Post Office'], region: 'Letter Square', feature: 'HTTP request', stamp: 'Clear Writer', coords: 'N 21° · E 17°', sky: 'day',
      line: 'Across the river, the post office takes one clearly written letter at a time.',
      story: 'Tally runs the post office in Letter Square. Every letter that goes into the red box must start with a single verb that says what the writer wants. Quill wants the page itself.',
      lesson: 'Over the open connection, the browser sends an HTTP request: a method such as GET, the path it wants, and headers. The server answers with a status and the content.',
      hint: 'Post Quill’s letter in the red box.', prop: { label: 'Post the letter', hint: 'Which verb asks for a page?' },
      task: { type: 'choice', prompt: 'Quill wants to read the page at /index.html. Which letter goes in the box?', options: ['POST /index.html — here is something new', 'GET /index.html — please send me this', 'DELETE /index.html — throw this away'], answer: 1,
        hint: 'Quill isn’t sending or removing anything — only asking.', solved: 'The box swallows the letter. A moment later a reply flutters out: “200 OK”, with the page tucked inside.' },
      ground: { land: '#b5c98a', fills: [{ pts: [[-.2, -1.6], [3.8, -1.6], [3.9, 1.1], [-.1, 1.2]], color: '#e1cfa0' }], path: [[-4.8, 2.3], [-3.0, 1.6], [-1.2, 1.2], [.6, .9]] },
      set(S) {
        const { P, C } = S;
        S.ridge(-5.4, 5.4, -2.9, [[-4.4, .9], [-2.8, 1.25], [-1.2, .8], [.4, 1.15], [2.0, .85], [3.6, 1.3], [5.0, .9]], '#8db06b');
        S.sun(3.5, -2.5, 3.3, .5); S.cloud(-.8, -2.3, 2.9, 1.1); S.cloud(-3.9, -2.0, 2.4, 1.0);
        for (const [x, z, h] of [[-5.0, -1.5, 1.2], [-4.2, -2.0, .95], [5.0, -1.2, 1.25], [-5.2, 1.0, 1.0], [5.2, 1.6, 1.05]]) S.pine(x, z, h);
        for (const [x, z] of [[-2.8, -1.6], [-1.6, -1.9]]) S.tree(x, z, 1.05, '#86a95c');
        // the post office: columns, a pediment, a clock, a pneumatic tube on the roof
        S.add(2.0, -1.0, g => {
          P.box(g, 0, .08, 0, 2.3, .16, 1.15, '#d8c7a2'); P.box(g, 0, .85, -.12, 2.0, 1.4, .8, '#efe2c5');
          for (let i = 0; i < 5; i++) P.cyl(g, -.84 + i * .42, .87, .4, .07, .08, 1.4, C.cream, 8);
          P.box(g, 0, 1.62, .1, 2.2, .14, 1.0, '#d8c7a2'); P.slab(g, [[-1.12, 0], [1.12, 0], [0, .5]], .9, '#c4473a', 0, 1.69, .05);
          P.cyl(g, 0, 1.88, .52, .17, .17, .04, C.cream, 16).rotation.x = Math.PI / 2; P.box(g, .04, 1.9, .55, .02, .12, .01, C.ink);
          P.box(g, 0, .5, .3, .4, .74, .04, C.wood);
          P.cyl(g, .7, 2.05, -.3, .1, .1, .7, C.slate, 8); P.cyl(g, .7, 2.42, -.3, .16, .12, .1, C.slate, 8);
          const l = P.label('POST', { w: .7, h: .16, color: '#f3e4c0' }); l.position.set(0, 1.8, .51); g.add(l);
        }, { name: 'post office' });
        // the reply envelope: flies out of the tube on solve and lands by Quill
        const reply = S.add(2.7, -1.3, g => { const e = P.group(g, 0, 2.5, 0); e.name = 'env'; P.box(e, 0, 0, 0, .34, .22, .02, C.cream); P.slab(e, [[-.17, .11], [.17, .11], [0, -.02]], .025, '#d9c9a2'); const s = P.label('200 OK', { w: .3, h: .07, color: '#7a3a2a' }); s.position.set(0, -.06, .02); e.add(s); }, { name: 'reply', fold: 'fwd' });
        const env = reply.content.getObjectByName('env');
        S.on(c => { const u = c.solvedAt == null ? 0 : Math.min(1, Math.max(0, (c.t - c.solvedAt - .5) / 1.6)); env.visible = u > 0; env.position.set(-.6 * u, 2.5 + Math.sin(Math.PI * u) * .9 - 1.4 * u, 1.6 * u); env.rotation.z = Math.sin(u * 9) * .4 * (1 - u); });
        S.house(-3.9, -.4, { w: .9, h: .72, d: .7, roofC: C.rust }); S.house(4.6, -.1, { w: .8, h: .6, d: .6, roofC: C.teal, wall: '#f0e3c7' });
        S.fence(-2.6, -.9, -.55);
        // the red postbox — the prop
        const box = S.prop('postbox', .75, .75, g => {
          P.cyl(g, 0, .38, 0, .2, .2, .76, C.red, 12); P.ball(g, 0, .76, 0, .2, C.red, 1).scale.y = .6; P.box(g, 0, .6, .19, .22, .035, .03, C.ink); P.box(g, 0, .04, 0, .3, .08, .3, '#7f2f26');
          const l = P.group(g, 0, .9, .2); l.name = 'letter'; P.box(l, 0, 0, 0, .2, .13, .01, C.cream);
        }, { label: 'Post the letter' });
        const lt = box.item.content.getObjectByName('letter');
        box.on(c => { const u = c.poke != null ? Math.min(1, c.poke / .6) : 0; lt.visible = c.solvedAt == null && (c.poke == null || u < 1 || c.open); lt.position.y = .9 - .3 * u; lt.scale.y = 1 - .6 * u; });
        S.sign(-.9, 2.5, 'Letter Sq.', 1);
        for (const [x, z] of [[-2.2, 2.7], [-4.1, 2.2], [3.0, 2.6], [1.2, 2.8], [4.6, 2.2]]) S.grass(x, z, .3);
        for (const [x, z] of [[-3.3, 2.7], [3.8, 2.8]]) S.flower(x, z, '#f0c5b5');
        S.hero(-1.5, 1.35);
        S.guide('tally', 2.0, 1.3, { facing: -1 });
      },
    },
    {
      id: 'loom', title: ['The Sorting', 'Loom'], region: 'Parcel Meadow', feature: 'Packets', stamp: 'Packet Counter', coords: 'N 26° · E 23°', sky: 'dusk',
      line: 'The page is too big for one parcel. The loom splits it into numbered packets.',
      story: 'Bramble works the sorting loom at the edge of Parcel Meadow. Big things never travel whole here. The loom cuts them into small parcels, numbers each one, and rebuilds them at the other end.',
      lesson: 'Data crosses the network in packets. Each carries a slice of the content plus a sequence number, so the receiver can put them back in order and ask again for any that go missing.',
      hint: 'Turn the loom’s crank.', prop: { label: 'Turn the crank', hint: 'Count how many parcels the page needs.' },
      task: { type: 'count', prompt: 'The reply weighs 6 kilobytes and each parcel carries 1.5. How many parcels will the loom make?', min: 1, max: 8, answer: 4, unit: 'parcels', check: 'Wind the loom',
        hint: 'How many times does 1.5 go into 6?', solved: 'Four numbered parcels ride the belt and stack themselves in order: 1, 2, 3, 4. The page is whole again.' },
      ground: { land: '#cbbf7c', fills: [{ pts: [[-5.2, .6], [-2.2, .4], [-1.8, 2.6], [-5.0, 2.7]], color: '#d9c98a' }], path: [[-4.6, 2.2], [-2.6, 1.6], [-.8, 1.3]] },
      set(S) {
        const { P, C } = S;
        S.ridge(-5.4, 5.4, -2.9, [[-4.6, 1.0], [-3.2, .7], [-1.8, 1.15], [-.2, .75], [1.4, 1.1], [3.0, .7], [4.6, 1.0]], '#b6a76a');
        S.sun(3.6, -2.5, 2.4, .55); S.cloud(-3.0, -2.2, 2.7, 1.1); S.cloud(1.0, -2.4, 3.0, .9);
        for (const [x, z, h] of [[-5.0, -1.4, 1.1], [5.0, -1.0, 1.2], [4.6, 1.8, 1.0]]) S.tree(x, z, h, '#b08a4a');
        for (const [x, z, h] of [[-4.2, -2.0, 1.0], [-5.2, .2, .95]]) S.pine(x, z, h, '#4f6b48');
        // wheat rows
        for (let i = 0; i < 9; i++) S.add(-4.6 + (i % 3) * .55, 1.0 + Math.floor(i / 3) * .45, g => { for (let k = 0; k < 3; k++) P.slab(g, [[-.02, 0], [.02, 0], [.05, .42], [0, .5], [-.05, .42]], .02, k % 2 ? '#e2bf62' : '#d4a94a', (k - 1) * .1, 0, (k % 2) * .05); }, { name: 'wheat' });
        // the loom: a timber frame, a belt, four numbered parcels
        const loom = S.add(1.8, -.8, g => {
          for (const x of [-1.1, 1.1]) for (const z of [-.35, .35]) P.box(g, x, .7, z, .12, 1.4, .12, C.wood);
          P.box(g, 0, 1.42, 0, 2.5, .12, .85, '#8b6440'); P.roof(g, 0, 1.48, 0, 2.7, .55, .95, C.rust);
          P.box(g, 0, .55, 0, 2.2, .06, .5, '#4a4038'); for (const x of [-1.0, 1.0]) P.cyl(g, x, .55, 0, .1, .1, .55, '#6c5a48', 10).rotation.x = Math.PI / 2;
          for (let k = 0; k < 4; k++) { const p = P.group(g, 0, 0, 0); p.name = 'parcel' + k; P.box(p, 0, .13, 0, .32, .26, .3, k % 2 ? '#d9b27a' : '#e6c58d'); P.box(p, 0, .13, .155, .32, .03, .01, '#9a6a3a'); const l = P.label(String(k + 1), { w: .16, h: .16, color: '#4a2f1a' }); l.position.set(0, .14, .162); p.add(l); }
        }, { name: 'loom' });
        const parcels = [0, 1, 2, 3].map(k => loom.content.getObjectByName('parcel' + k));
        S.on(c => { const u = c.solvedAt == null ? 0 : Math.max(0, c.t - c.solvedAt - .3);
          parcels.forEach((p, k) => { const v = Math.min(1, Math.max(0, (u - k * .45) / .9)), e = v * v * (3 - 2 * v);
            const sx = -.9 + ((k * .6 + c.t * .1 * (c.solvedAt == null ? 1 : 0)) % 1.8), tx = .1, ty = .58 + k * .27; // ride, then stack in order at the end of the belt
            p.position.set(c.solvedAt == null ? sx : sx + (tx - sx) * e, c.solvedAt == null ? .58 : .58 + (ty - .58) * e, c.solvedAt == null ? 0 : .42 * e); }); });
        S.house(-3.2, -1.0, { w: 1.0, h: .75, d: .7, roofC: '#8a4a3a', wall: '#efdcb4' });
        // the crank — the prop
        const crank = S.prop('crank', .5, .7, g => {
          P.box(g, 0, .4, 0, .16, .8, .16, C.wood);
          const w = P.group(g, 0, .7, .12); w.name = 'wheel'; P.cyl(w, 0, 0, 0, .28, .28, .05, C.ochre, 14).rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) { const s = P.box(w, 0, 0, .03, .5, .04, .02, C.wood); s.rotation.z = i * Math.PI / 4; } P.cyl(w, .22, .12, .08, .03, .03, .2, C.wood, 6).rotation.x = Math.PI / 2;
        }, { label: 'Turn the crank' });
        const wheel = crank.item.content.getObjectByName('wheel');
        crank.on(c => { wheel.rotation.z = -(c.poke != null ? Math.min(c.poke, 1.2) * 5 : 0) - (c.solvedAt != null ? Math.min(3, c.t - c.solvedAt) * 4 : 0); });
        S.sign(-1.0, 2.55, 'Parcel Mdw.', 1);
        for (const [x, z] of [[1.0, 2.6], [2.6, 2.7], [4.0, 2.4], [-1.9, 2.8]]) S.grass(x, z, .3, '#9a9a4a');
        S.hero(-1.6, 1.25);
        S.guide('bramble', 2.9, 1.35, { facing: -1 });
      },
    },
    {
      id: 'window', title: ['The Window', 'House'], region: 'Harbor Town', feature: 'Rendering', stamp: 'Lamp Lighter', coords: 'N 31° · E 29°', sky: 'night',
      line: 'By nightfall Quill reaches the window house, where pages become pictures.',
      story: 'The last house in Harbor Town has one great window and no picture in it yet. Wick the lamplighter reads the page from Quill’s parcels, one step at a time, and lights the panes as the picture takes shape.',
      lesson: 'The browser parses the HTML into a tree, applies the CSS, works out where every box goes (layout), and then paints the pixels you see.',
      hint: 'Hand Wick the lamplighter’s pole.', prop: { label: 'Raise the lamp pole', hint: 'Light the panes in the order the browser works.' },
      task: { type: 'order', prompt: 'Light the four panes in the order the browser does the work.', items: ['Read the HTML into a tree', 'Apply the CSS styles', 'Lay out every box', 'Paint the pixels'],
        hint: 'You can’t style what you haven’t read, or paint what you haven’t placed.', solved: 'One pane after another glows. The page is in the window, and Quill’s satchel is finally empty.' },
      ground: { land: '#71906f', water: [[[1.8, 1.4], [5.6, 1.1], [5.6, 3.2], [2.2, 3.2], [1.2, 2.4]]], waterColor: '#4e7f8a', path: [[-4.6, 2.2], [-2.8, 1.5], [-1.0, 1.0], [.6, .4]] },
      set(S) {
        const { P, C } = S;
        S.ridge(-5.4, 5.4, -2.9, [[-4.6, .9], [-3.0, 1.2], [-1.4, .8], [.2, 1.1], [1.8, .8], [3.4, 1.25], [4.8, .9]], '#4f6a62');
        S.moon(-3.0, -2.5, 3.2, .5);
        for (const [x, y] of [[-4.6, 2.6], [-1.8, 3.4], [.9, 3.0], [2.4, 3.5], [4.2, 2.9], [-.9, 2.7]]) S.star(x, -2.6, y);
        S.cloud(4.4, -2.0, 2.4, 1.0);
        for (const [x, z, h] of [[-5.0, -1.4, 1.2], [-4.3, -2.0, 1.0], [5.1, -1.3, 1.15], [-5.1, .8, 1.0]]) S.pine(x, z, h, '#3b5a48');
        // the window house: one big four-pane window
        const house = S.add(1.6, -1.0, g => {
          P.box(g, 0, .85, 0, 2.0, 1.7, 1.0, '#e8d6b0'); P.roof(g, 0, 1.7, 0, 2.3, .95, 1.15, '#7a3c34'); P.box(g, .6, 2.25, -.15, .22, .55, .22, '#b9a07a');
          P.box(g, 0, .95, .505, 1.36, 1.06, .03, C.wood);
          for (let k = 0; k < 4; k++) { const m = P.box(g, (k % 2 ? .32 : -.32), (k < 2 ? 1.22 : .68), .525, .58, .46, .02, '#3a4660'); m.name = 'pane' + k; }
          P.box(g, -.75, .3, .51, .3, .6, .02, C.wood);
        }, { name: 'window house' });
        const panes = [0, 1, 2, 3].map(k => house.content.getObjectByName('pane' + k));
        const dark = P.mat('#3a4660'), lit = P.mat('#ffd98a', { emissive: '#ffb547', emissiveIntensity: 1.1 });
        const glow = S.glow(1.6, 1.0, .3, '#ffc46b', 0);
        S.on(c => { let n = 0; panes.forEach((p, k) => { const on = c.solvedAt != null ? c.t - c.solvedAt > .2 + k * .3 : (c.open && false); p.material = on ? lit : dark; n += on; }); glow.userData.power = n * 2.2; });
        S.boat(3.6, 2.2, .9, C.cream, '#3a5a7a'); S.ripple(4.6, 2.7, .7, .3);
        S.house(-3.6, -.6, { w: .85, h: .65, d: .65, roofC: '#5a3a3a', wall: '#d9c7a2' });
        S.glow(-3.6, .5, -.2, '#ffc46b', 1.4);
        S.add(-.9, -1.0, g => { P.box(g, 0, .45, 0, .05, .9, .05, C.wood); P.lantern(g, 0, .9, 0, 1.2); }, { name: 'street lamp' });
        S.glow(-.9, 1.0, -.95, '#ffc46b', 1.2);
        // the lamp pole — the prop
        const pole = S.prop('lamp pole', .55, .9, g => {
          const p = P.group(g); p.name = 'pole'; P.beam(p, [0, 0, 0], [.12, 1.3, 0], .025, C.wood, 5); P.lantern(p, .14, 1.3, 0, .8);
          P.box(g, 0, .05, 0, .3, .1, .3, '#5a4a3a');
        }, { label: 'Raise the lamp pole' });
        const pm = pole.item.content.getObjectByName('pole');
        pole.on(c => { pm.rotation.z = c.poke != null ? -Math.sin(Math.min(1, c.poke / .8) * Math.PI) * .25 : 0; });
        S.sign(-2.0, 2.5, 'Harbor Town', 1);
        for (const [x, z] of [[-3.4, 2.7], [-1.0, 2.8], [-4.5, 1.7], [.6, 2.3]]) S.grass(x, z, .3, '#4f7a4f');
        S.hero(-1.7, 1.2);
        S.guide('wick', 2.7, .85, { facing: -1 });
      },
    },
  ],
};
