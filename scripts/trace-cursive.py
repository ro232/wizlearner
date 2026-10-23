"""
Builds src/lib/glyphs/cursive-model.json from the handwriting alphabet of the approved
first-grade textbook (Comunicare în limba română, clasa I, Editura Art, 2023, p. 122),
exported with `pdftocairo -svg -f 124 -l 124 art-romana-1-2023.pdf p124.svg`.

The letters there are drawn as centre lines (stroked paths), so they can be traced directly:
each letter's pieces are joined into strokes in writing order (lead-in first) and converted to
the glyph units used by the app (x-height line 50, baseline 100).

usage: python3 scripts/trace-cursive.py p124.svg src/lib/glyphs/cursive-model.json
"""
import json, math, re, sys

COLOR = '22.999573%, 48.298645%, 67.298889%'
MAP = {0:'a',1:'A',18:'ă',19:'Ă',34:'â',37:'b',38:'B',16:'c',17:'C',30:'d',31:'D',8:'e',9:'E',50:'f',49:'F',43:'g',44:'G',
       41:'h',42:'H',4:'i',5:'I',35:'î',36:'Î',39:'j',40:'J',57:'k',58:'K',24:'l',25:'L',2:'m',3:'M',6:'n',7:'N',14:'o',15:'O',
       26:'p',27:'P',59:'q',60:'Q',12:'r',13:'R',22:'s',23:'S',32:'ș',33:'Ș',20:'t',21:'T',45:'ț',46:'Ț',10:'u',11:'U',
       28:'v',29:'V',56:'w',55:'W',51:'x',52:'X',53:'y',54:'Y',47:'z',48:'Z'}
XH = 8.8          # x-height in the source (pt)
K = 50 / XH       # source pt -> glyph units
STEP = 0.25       # sampling step along the source curves (pt)
SNAP = 0.7        # pieces closer than this (pt) are joined

def parse(svg):
    src = open(svg).read()
    out = []
    for m in re.finditer(r'<path ([^>]*?)/>', src):
        a = m.group(1)
        if 'stroke="rgb(%s)"' % COLOR not in a:
            continue
        d = re.search(r' d="([^"]*)"', a).group(1)
        t = re.search(r'transform="matrix\(([^)]*)\)"', a)
        M = [float(v) for v in t.group(1).split(',')] if t else [1, 0, 0, 1, 0, 0]
        tp = lambda x, y: (M[0]*x + M[2]*y + M[4], M[1]*x + M[3]*y + M[5])
        tok = re.findall(r'[MLCZ]|-?[\d.]+(?:e-?\d+)?', d)
        subs, cur, i, pen, first = [], None, 0, None, None
        while i < len(tok):
            c = tok[i]; i += 1
            if c == 'M':
                pen = first = tp(float(tok[i]), float(tok[i+1])); i += 2
                cur = [pen]; subs.append(cur)
            elif c == 'L':
                p = tp(float(tok[i]), float(tok[i+1])); i += 2
                n = max(1, int(math.dist(pen, p) / STEP))
                cur += [(pen[0] + (p[0]-pen[0])*k/n, pen[1] + (p[1]-pen[1])*k/n) for k in range(1, n+1)]; pen = p
            elif c == 'C':
                v = [float(x) for x in tok[i:i+6]]; i += 6
                c1, c2, p = tp(v[0], v[1]), tp(v[2], v[3]), tp(v[4], v[5])
                L = math.dist(pen, c1) + math.dist(c1, c2) + math.dist(c2, p)
                n = max(2, int(L / STEP))
                for k in range(1, n+1):
                    s = k / n; r = 1 - s
                    cur.append((r**3*pen[0] + 3*r*r*s*c1[0] + 3*r*s*s*c2[0] + s**3*p[0], r**3*pen[1] + 3*r*r*s*c1[1] + 3*r*s*s*c2[1] + s**3*p[1]))
                pen = p
            elif c == 'Z':
                if cur and first: cur.append(first)
        out.append(subs)
    return out

def graph(polys):
    """Nodes at piece ends and where a piece end touches another piece; edges are point runs."""
    # split points: indexes where another piece's endpoint lies on this piece
    cuts = [set([0, len(p)-1]) for p in polys]
    # crossing bars (t, z, x, F …) are drawn as their own stroke: they do not join the letter
    bar = [abs(p[0][1] - p[-1][1]) < 0.5 and math.dist(p[0], p[-1]) > 2 and max(abs(q[1] - p[0][1]) for q in p) < 0.6 for p in polys]
    ends = [(pi, p[0]) for pi, p in enumerate(polys) if not bar[pi]] + [(pi, p[-1]) for pi, p in enumerate(polys) if not bar[pi]]
    for pi, p in enumerate(polys):
        if bar[pi]: continue
        for qi, e in ends:
            best, bi = 1e9, None
            for k, pt in enumerate(p):
                d = math.dist(pt, e)
                if d < best: best, bi = d, k
            if best < SNAP and not (qi == pi and (bi in (0, len(p)-1))):
                cuts[pi].add(bi)
    edges = []
    for pi, p in enumerate(polys):
        if bar[pi]: continue
        cs = sorted(cuts[pi])
        for a, b in zip(cs, cs[1:]):
            if b > a: edges.append(p[a:b+1])
    # merge node positions
    nodes = []
    def node(pt, own=False):
        if not own:
            for i, n in enumerate(nodes):
                if math.dist(n, pt) < SNAP and i not in bar_nodes: return i
        nodes.append(pt); return len(nodes) - 1
    bar_nodes = set()
    edges_bar = []
    for pi, p in enumerate(polys):
        if bar[pi]:
            a = node(p[0], True); b = node(p[-1], True); bar_nodes.update([a, b]); edges_bar.append((a, b, p))
    E = list(edges_bar)
    edges = [e for e, pi in zip(edges, [None]*len(edges))]
    for e in edges:
        if len(e) < 2: continue
        a, b = node(e[0]), node(e[-1])
        if a == b and len(e) < 4: continue
        E.append((a, b, e))
    return nodes, E

def direction(pts, at_start=True, span=6):
    if at_start:
        a, b = pts[0], pts[min(len(pts)-1, span)]
    else:
        a, b = pts[max(0, len(pts)-1-span)], pts[-1]
    d = (b[0]-a[0], b[1]-a[1]); n = math.hypot(*d) or 1
    return (d[0]/n, d[1]/n)

def traverse(nodes, E, start, finish=None):
    """One pen-down path through every edge of a component: straightest continuation at
    crossings, retracing dead ends (the way a stem is gone down and back up)."""
    used = [False]*len(E)
    adj = {}
    for i, (a, b, _) in enumerate(E):
        adj.setdefault(a, []).append(i); adj.setdefault(b, []).append(i)
    path, cur, heading = [nodes[start]], start, None
    def run(i, frm):
        a, b, pts = E[i]
        return pts if a == frm else pts[::-1]
    while not all(used):
        cands = [i for i in adj.get(cur, []) if not used[i]]
        if finish is not None and len(cands) > 1:
            # keep the edge that leads to the exit for last
            keep = [i for i in cands if finish not in (E[i][0], E[i][1])]
            if keep: cands = keep
        if finish is not None and len(cands) == 1 and finish in (E[cands[0]][0], E[cands[0]][1]) and sum(not u for u in used) > 1:
            # do everything else first, then come back for the exit
            others = [j for j in range(len(E)) if not used[j] and j != cands[0]]
            if others:
                cands = []
        if cands:
            def turn(i):
                d = direction(run(i, cur))
                return 0 if heading is None else -(d[0]*heading[0] + d[1]*heading[1])
            i = min(cands, key=turn)
            pts = run(i, cur); used[i] = True
            path += pts[1:]
            heading = direction(pts, at_start=False)
            a, b, _ = E[i]; cur = b if a == cur else a
            continue
        # dead end: go back along used edges to the nearest node that still has an unused edge
        from collections import deque
        q, prev = deque([cur]), {cur: None}
        target = None
        while q:
            n = q.popleft()
            pending = [i for i in adj.get(n, []) if not used[i]]
            only_exit = finish is not None and all(finish in (E[i][0], E[i][1]) for i in pending) and any(not used[j] and finish not in (E[j][0], E[j][1]) for j in range(len(E)))
            if pending and not only_exit: target = n; break
            for i in adj.get(n, []):
                a, b, _ = E[i]; m = b if a == n else a
                if m not in prev: prev[m] = (n, i); q.append(m)
        if target is None: break
        chain = []
        n = target
        while prev[n] is not None:
            pn, i = prev[n]; chain.append((pn, i)); n = pn
        for pn, i in reversed(chain):
            pts = run(i, pn); path += pts[1:]
            heading = direction(pts, at_start=False)
        cur = target
    return path

def components(nodes, E):
    parent = list(range(len(nodes)))
    def f(x):
        while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for a, b, _ in E: parent[f(a)] = f(b)
    groups = {}
    for i, e in enumerate(E): groups.setdefault(f(e[0]), []).append(i)
    return list(groups.values())

def simplify(pts, tol=0.04):
    """Drop points that lie on a straight run (keeps curves smooth, files small)."""
    out = [pts[0]]
    for i in range(1, len(pts)-1):
        a, b, c = out[-1], pts[i], pts[i+1]
        cross = abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]))
        if cross > tol * max(math.dist(a, c), 1e-6) or math.dist(a, b) > 1.2: out.append(b)
    out.append(pts[-1])
    return out

OVAL_LETTERS = 'aăâdgqo'

def oval_letter(polys, base):
    """a, d, g, q, o in the order taught at school: the lead-in goes up to the top of the oval,
    the oval is drawn round to the left (counter-clockwise), then the stem (or the exit of o)."""
    closed = [p for p in polys if math.dist(p[0], p[-1]) < 0.5 and len(p) > 20]
    if not closed: return None
    O = max(closed, key=len)[:-1]
    others = [p for p in polys if p is not max(closed, key=len)]
    # lead-in: a short piece with one end low on the left, the other touching the oval
    def touch(p): return min(min(math.dist(p[0], q) for q in O), min(math.dist(p[-1], q) for q in O))
    leads = [p for p in others if len(p) < 40 and touch(p) < 0.8 and max(p[0][1], p[-1][1]) > base - 2]
    if not leads: return None
    lead0 = min(leads, key=lambda p: min(p[0][0], p[-1][0]))
    rest = [p for p in others if p is not lead0]
    lead = lead0[::-1] if lead0[0][0] > lead0[-1][0] else lead0   # from the left (baseline) to the oval
    n = len(O)
    # counter-clockwise on screen (y down): signed area < 0 for the shoelace formula in screen coords
    area = sum(O[i][0] * O[(i+1) % n][1] - O[(i+1) % n][0] * O[i][1] for i in range(n))
    if area > 0: O = O[::-1]
    top = min(range(n), key=lambda i: O[i][1])
    J = min(range(n), key=lambda i: math.dist(O[i], lead[-1]))
    # from J up to the top: the way that does not go round the bottom (backwards along the ccw order)
    up = []
    i = J
    while i != top:
        up.append(O[i]); i = (i - 1) % n
    up.append(O[top])
    loop = [O[(top + k) % n] for k in range(n + 1)]
    path = list(lead) + up[1:] + loop[1:]
    strokes = []
    marks = []
    longs = [p for p in rest if len(p) >= 15]
    if longs:
        stem0 = max(longs, key=len)
        rest = [p for p in rest if p is not stem0]
        stem = stem0
        T = O[top]
        # the stem: start from its end nearest the top of the oval; if that end is not near (d), go up to it first
        a_end, b_end = stem[0], stem[-1]
        if a_end[1] > b_end[1]: stem = stem[::-1]   # stem[0] = upper end
        k = min(range(len(stem)), key=lambda i: math.dist(stem[i], T))
        if k > 3:
            path += stem[k::-1][1:] if False else list(reversed(stem[:k+1]))
        path += stem
    for p in rest:
        if len(p) >= 4: strokes.append(p)
    return [path] + strokes

def main(svg, dest):
    paths = parse(svg)
    # baselines: one per row of the chart, from small letters without tails
    rows = {}
    for idx, ch in MAP.items():
        if ch in 'aeimnoruvwscz':
            ys = [p[1] for s in paths[idx] for p in s]
            rows[ch] = max(ys)
    base_lines = sorted(set(round(v, 1) for v in rows.values()))
    model = {}
    for idx, ch in MAP.items():
        polys = [s for s in paths[idx] if len(s) > 1]
        ys = [p[1] for s in polys for p in s]; xs = [p[0] for s in polys for p in s]
        top = min(ys)
        base = min((b for b in base_lines if b >= top + 4), key=lambda b: b - top) if ch.islower() else min((b for b in base_lines if b >= top + 10), key=lambda b: b - top)
        if ch in OVAL_LETTERS:
            strokes = oval_letter(polys, base)
            if strokes:
                x0 = min(xs)
                conv = lambda p: [round((p[0] - x0) * K, 2), round(100 - (base - p[1]) * K, 2)]
                S = [[conv(p) for p in simplify(s)] for s in strokes]
                marks = [i for i, st in enumerate(S) if i > 0 and ch in 'ăâ']
                model[ch] = {'strokes': S, 'marks': marks}
                print(ch, 'oval', len(S))
                continue
        nodes, E = graph(polys)
        comps = components(nodes, E)
        info = []
        for comp in comps:
            sub = [E[i] for i in comp]
            ns = sorted(set([a for a, b, _ in sub] + [b for a, b, _ in sub]))
            deg = {n: sum((a == n) + (b == n) for a, b, _ in sub) for n in ns}
            ends = [n for n in ns if deg[n] == 1] or ns
            info.append((sub, ends))
        # where the pen starts
        size = [sum(len(e[2]) for e in sub) for sub, _ in info]
        big = max(size)
        # short pieces (bars, dots, marks) are never where the pen starts
        all_ends = [(ci, n) for ci, (_, ends) in enumerate(info) for n in ends if size[ci] > 0.3 * big]
        if ch.islower():
            # the lead-in on the baseline (or the top of m, n, v …): leftmost end in the body of the letter
            body = [(ci, n) for ci, n in all_ends if base - XH * 1.1 <= nodes[n][1] <= base + 0.8] or all_ends
            ci0, start = min(body, key=lambda cn: nodes[cn[1]][0])
        elif ch in 'AĂÂMN':
            ci0, start = min(all_ends, key=lambda cn: nodes[cn[1]][0] - 0.3 * nodes[cn[1]][1])
        else:
            # capitals are written from the top (the stems end in the little curl at the bottom left)
            ci0, start = min(all_ends, key=lambda cn: nodes[cn[1]][1] + 0.3 * nodes[cn[1]][0])
        finish = None
        if ch.islower():
            sub0, ends0 = info[ci0]
            cand = [n for n in ends0 if n != start]
            if cand:
                # the exit is the end furthest to the right among those at or above the baseline
                low_ok = [n for n in cand if nodes[n][1] <= base + 0.8] or cand
                # most letters leave from the lower half (o, b, v, w leave from the top and have no low end)
                lower = [n for n in low_ok if nodes[n][1] >= base - XH * 0.45]
                finish = max(lower or low_ok, key=lambda n: nodes[n][0])
        main_path = traverse(nodes, info[ci0][0], start, finish)
        rest = [i for i in range(len(info)) if i != ci0]
        # pieces that carry on where the pen stopped (the stem of a, d, g, q after the oval) join the same stroke
        merged = True
        while merged:
            merged = False
            for ci in list(rest):
                sub, ends = info[ci]
                ys_c = [q[1] for e in sub for q in e[2]]
                if max(ys_c) - min(ys_c) < 1.0:
                    continue  # a crossing bar stays its own stroke
                near = min(ends, key=lambda n: math.dist(nodes[n], main_path[-1]))
                if size[ci] > 0.15 * big and math.dist(nodes[near], main_path[-1]) < 3.6:
                    main_path += traverse(nodes, sub, near)
                    rest.remove(ci); merged = True
                    continue
                # a stem that starts on the body already drawn (a, d, g, q): go back along the oval to it
                if size[ci] > 0.15 * big:
                    best = min(((math.dist(nodes[n], q), n, k) for n in ends for k, q in enumerate(main_path)), key=lambda t: t[0])
                    if best[0] < 2.0:
                        _, n, k = best
                        main_path += main_path[k:-1][::-1]
                        main_path += traverse(nodes, sub, n)
                        rest.remove(ci); merged = True
        strokes = [simplify(main_path)]
        for ci in sorted(rest, key=lambda ci: min(nodes[n][0] for n in info[ci][1])):
            sub, ends = info[ci]
            st = min(ends, key=lambda n: nodes[n][0] + nodes[n][1])
            strokes.append(simplify(traverse(nodes, sub, st)))
        x0 = min(xs)
        conv = lambda p: [round((p[0] - x0) * K, 2), round(100 - (base - p[1]) * K, 2)]
        S = [[conv(p) for p in s] for s in strokes]
        main_s = S[0]
        if ch in 'ij':
            # the dot is a filled circle in the book: add it above the top of the stem
            top_pt = min(main_s, key=lambda p: p[1])
            S.append([[round(top_pt[0] + 6, 2), 30.0], [round(top_pt[0] + 6, 2), 30.01]])
        # diacritics: marks drawn after the letter, short and above the x-height or under the baseline
        marks = [i for i, st in enumerate(S) if i > 0 and ch in 'ăâîșțĂÂÎȘȚ' and (max(p[1] for p in st) < 45 or min(p[1] for p in st) > 101)]
        model[ch] = {'strokes': S, 'marks': marks}
        print(ch, 'strokes', len(S), 'start', main_s[0], 'end', main_s[-1])
    # Â is not on the textbook page: the A with the circumflex of Î, centred over the top of the A
    if 'A' in model and 'Î' in model and 'Â' not in model:
        A = model['A']['strokes']; hat = model['Î']['strokes'][model['Î']['marks'][0]]
        apex = min((p for st in A for p in st), key=lambda p: p[1])
        hx = sum(p[0] for p in hat) / len(hat); top_hat = max(p[1] for p in hat)
        dx = apex[0] - hx; dy = (apex[1] - 6) - top_hat
        model['Â'] = {'strokes': A + [[[round(p[0] + dx, 2), round(p[1] + dy, 2)] for p in hat]], 'marks': [len(A)]}
    json.dump(model, open(dest, 'w'), ensure_ascii=False, separators=(',', ':'))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
