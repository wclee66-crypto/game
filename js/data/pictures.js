/* 새록 — 색칠 도안 만들기
 *
 * 그림은 그림 파일이 아니라 '그리는 방법'으로 들어 있습니다.
 * 같은 그림이라도 단계(detail)와 씨앗값(seed)에 따라 칸 수와 색이 달라지므로,
 * 몇 줄 안 되는 정보만 저장해 두었다가 언제든 똑같이 되살릴 수 있습니다.
 *
 * 한 칸(region) = { d: SVG 경로, c: 색 번호, x,y: 번호를 적을 자리 }
 */
window.PICTURES = (function () {

  /* ================= 색 ================= */
  /* 번호와 색은 항상 같은 짝입니다. 단계가 올라가면 뒤쪽 색이 더해집니다. */
  var PALETTE = [
    { n: 1,  name: '빨강', hex: '#E03A2F' },
    { n: 2,  name: '노랑', hex: '#F2BE1A' },
    { n: 3,  name: '파랑', hex: '#2C63C9' },
    { n: 4,  name: '초록', hex: '#3E9E4E' },
    { n: 5,  name: '주황', hex: '#EE7F26' },
    { n: 6,  name: '보라', hex: '#8A55C0' },
    { n: 7,  name: '분홍', hex: '#F08BB0' },
    { n: 8,  name: '하늘', hex: '#5FBCEA' },
    { n: 9,  name: '갈색', hex: '#8B5A34' },
    { n: 10, name: '회색', hex: '#78847E' }
  ];

  function hexOf(n) { var p = PALETTE[n - 1]; return p ? p.hex : '#FFFFFF'; }
  function nameOf(n) { var p = PALETTE[n - 1]; return p ? p.name : ''; }

  /* ================= 그리기 도구 ================= */

  function r2(v) { return Math.round(v * 100) / 100; }
  function rad(deg) { return (deg - 90) * Math.PI / 180; }
  function polar(cx, cy, r, deg) { var a = rad(deg); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

  function cen(pts) {
    var sx = 0, sy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; });
    return [sx / pts.length, sy / pts.length];
  }
  function poly(pts) {
    return 'M' + pts.map(function (p) { return r2(p[0]) + ' ' + r2(p[1]); }).join(' L') + ' Z';
  }
  function rect(x0, y0, x1, y1) { return poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); }
  function circlePath(cx, cy, r) {
    return 'M' + r2(cx - r) + ' ' + r2(cy) +
      'a' + r2(r) + ' ' + r2(r) + ' 0 1 0 ' + r2(r * 2) + ' 0' +
      'a' + r2(r) + ' ' + r2(r) + ' 0 1 0 ' + r2(-r * 2) + ' 0Z';
  }

  /** 점들을 부드러운 곡선으로 잇는다 (Catmull-Rom 을 3차 베지에로) */
  function curve(pts, closed, cont) {
    var n = pts.length, out = [], i;
    out.push((cont ? 'L' : 'M') + r2(pts[0][0]) + ' ' + r2(pts[0][1]));
    var last = closed ? n : n - 1;
    for (i = 0; i < last; i++) {
      var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      var p1 = pts[i % n];
      var p2 = pts[(i + 1) % n];
      var p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      out.push('C' + r2(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r2(p1[1] + (p2[1] - p0[1]) / 6) +
               ' ' + r2(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r2(p2[1] - (p3[1] - p1[1]) / 6) +
               ' ' + r2(p2[0]) + ' ' + r2(p2[1]));
    }
    if (closed) out.push('Z');
    return out.join(' ');
  }

  /* 반지름 함수 — 각도(deg, 위쪽이 0도)를 넣으면 그 방향의 반지름을 돌려준다 */
  function rConst(r) { return function () { return r; }; }
  function rEllipse(rx, ry) {
    return function (deg) {
      var t = rad(deg), c = Math.cos(t) / rx, s = Math.sin(t) / ry;
      return 1 / Math.sqrt(c * c + s * s);
    };
  }
  function rEllipseRot(rx, ry, tilt) {
    var base = rEllipse(rx, ry);
    return function (deg) { return base(deg - tilt); };
  }

  function samples(cx, cy, rf, s, a0, a1, full) {
    var n = Math.max(6, Math.round(Math.abs(a1 - a0) / 10)), pts = [], i;
    for (i = 0; i <= (full ? n - 1 : n); i++) {
      var a = a0 + (a1 - a0) * (i / n);
      pts.push(polar(cx, cy, rf(a) * s, a));
    }
    return pts;
  }

  /** rf 가 그리는 모양에서 s0~s1 두께, a0~a1 각도만큼 잘라 낸 한 칸 */
  function slice(cx, cy, rf, s0, s1, a0, a1) {
    var full = Math.abs(a1 - a0) >= 359.9;
    if (full) {
      var o = samples(cx, cy, rf, s1, a0, a1, true);
      if (s0 <= 0.001) return curve(o, true);
      return curve(o, true) + ' ' + curve(samples(cx, cy, rf, s0, a0, a1, true).reverse(), true);
    }
    var out = samples(cx, cy, rf, s1, a0, a1, false);
    if (s0 <= 0.001) return curve(out, false) + ' L' + r2(cx) + ' ' + r2(cy) + ' Z';
    return curve(out, false) + ' ' + curve(samples(cx, cy, rf, s0, a0, a1, false).reverse(), false, true) + ' Z';
  }

  function slicePt(cx, cy, rf, s0, s1, a0, a1) {
    var am = (a0 + a1) / 2;
    if (s0 <= 0.001 && Math.abs(a1 - a0) >= 359.9) return [cx, cy];
    var sm = s0 <= 0.001 ? s1 * 0.55 : (s0 + s1) / 2;
    return polar(cx, cy, rf(am) * sm, am);
  }

  /** 꽃잎·잎사귀처럼 가운데에서 뻗어 나가 끝이 둥근 모양 */
  function petal(cx, cy, r0, r1, mid, half, pow) {
    var pts = [], n = 12, i, t, a, rr;
    for (i = 0; i <= n; i++) {
      t = -1 + 2 * i / n;
      a = mid + t * half;
      rr = r0 + (r1 - r0) * Math.pow(Math.cos(t * Math.PI / 2), pow || 0.5);
      pts.push(polar(cx, cy, rr, a));
    }
    for (i = 5; i >= 1; i--) pts.push(polar(cx, cy, r0, mid - half + 2 * half * (i / 6)));
    return { d: curve(pts, true), pt: polar(cx, cy, r0 + (r1 - r0) * 0.55, mid) };
  }

  /** 잎사귀의 반쪽 — 바깥 가장자리를 따라 끝까지 갔다가 잎맥(가운데 선)으로 돌아온다.
      side 가 -1이면 왼쪽 반, +1이면 오른쪽 반. 둘을 합치면 잎 한 장이 된다. */
  function leafHalf(cx, cy, r0, r1, mid, half, pow, side) {
    var n = 10, pts = [], i, t, a, rr;
    for (i = 0; i <= n; i++) {                          // 바깥 가장자리: 밑동 → 잎 끝
      t = side * (1 - i / n);
      a = mid + t * half;
      rr = r0 + (r1 - r0) * Math.pow(Math.cos(t * Math.PI / 2), pow);
      pts.push(polar(cx, cy, rr, a));
    }
    for (i = 1; i <= 3; i++) pts.push(polar(cx, cy, r1 - (r1 - r0) * i / 4, mid));      // 잎맥
    for (i = 1; i <= 3; i++) pts.push(polar(cx, cy, r0, mid + side * half * i / 4));    // 밑동
    return {
      d: curve(pts, true),
      pt: polar(cx, cy, r0 + (r1 - r0) * 0.5, mid + side * half * 0.42)
    };
  }

  /** 타원의 x0~x1 구간을 세로로 잘라 낸 띠 (part: 0 전체 · 1 위쪽 · 2 아래쪽) */
  function ellBand(cx, cy, rx, ry, x0, x1, part) {
    var n = 16, pts = [], i, x;
    function top(v) { return cy - ry * Math.sqrt(Math.max(0, 1 - Math.pow((v - cx) / rx, 2))); }
    function bot(v) { return cy + ry * Math.sqrt(Math.max(0, 1 - Math.pow((v - cx) / rx, 2))); }
    for (i = 0; i <= n; i++) { x = x0 + (x1 - x0) * i / n; pts.push([x, part === 2 ? cy : top(x)]); }
    for (i = n; i >= 0; i--) { x = x0 + (x1 - x0) * i / n; pts.push([x, part === 1 ? cy : bot(x)]); }
    var xm = (x0 + x1) / 2;
    var ym = part === 1 ? (cy + top(xm)) / 2 : part === 2 ? (cy + bot(xm)) / 2 : cy;
    return { d: poly(pts), pt: [xm, ym] };
  }

  /** 타원의 y0~y1 구간을 가로로 잘라 낸 띠 (나비 몸통) */
  function ellBandH(cx, cy, rx, ry, y0, y1) {
    var n = 10, pts = [], i, y, dx;
    for (i = 0; i <= n; i++) {
      y = y0 + (y1 - y0) * i / n;
      dx = rx * Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / ry, 2)));
      pts.push([cx + dx, y]);
    }
    for (i = n; i >= 0; i--) {
      y = y0 + (y1 - y0) * i / n;
      dx = rx * Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / ry, 2)));
      pts.push([cx - dx, y]);
    }
    return { d: poly(pts), pt: [cx, (y0 + y1) / 2] };
  }

  /** 한 점에서 부챗살처럼 뻗는 조각들 (지느러미·꼬리) */
  function fan(root, edge) {
    var out = [], i;
    for (i = 0; i < edge.length - 1; i++) {
      var p = [root, edge[i], edge[i + 1]];
      out.push({ d: poly(p), pt: cen(p) });
    }
    return out;
  }

  function reg(d, c, pt) { return { d: d, c: c, x: r2(pt[0]), y: r2(pt[1]) }; }

  /** 그림을 두르는 액자 — 네 변을 m 조각씩 나눈다 */
  function frameRegions(out, ctx, m) {
    if (!m) return;
    var O = [2, 2, 98, 98], I = [9, 9, 91, 91];
    var sides = [
      [[O[0], O[1]], [O[2], O[1]], [I[0], I[1]], [I[2], I[1]]],
      [[O[2], O[1]], [O[2], O[3]], [I[2], I[1]], [I[2], I[3]]],
      [[O[2], O[3]], [O[0], O[3]], [I[2], I[3]], [I[0], I[3]]],
      [[O[0], O[3]], [O[0], O[1]], [I[0], I[3]], [I[0], I[1]]]
    ];
    var A = ctx.col(5), B = ctx.col(6), idx = 0;
    sides.forEach(function (s) {
      for (var i = 0; i < m; i++) {
        var t0 = i / m, t1 = (i + 1) / m;
        var p = [lerp(s[0], s[1], t0), lerp(s[0], s[1], t1), lerp(s[2], s[3], t1), lerp(s[2], s[3], t0)];
        out.push(reg(poly(p), (idx % 2 ? B : A), cen(p)));
        idx++;
      }
    });
  }

  /* ================= 그림 1 · 고운 무늬 ================= */

  function mandala(ctx, d) {
    var out = [], cx = 50, cy = 50, R = 46, rf = rConst(R), i;
    var C = [
      { n: 6,  bands: [[0, .24], [.24, .52]],                         petals: 6,  pr: [.52, .97] },
      { n: 6,  bands: [[0, .20], [.20, .38], [.38, .56]],             petals: 8,  pr: [.56, .97] },
      { n: 8,  bands: [[0, .18], [.18, .36], [.36, .56]],             petals: 10, pr: [.56, .97] },
      { n: 8,  bands: [[0, .15], [.15, .30], [.30, .45], [.45, .60]], petals: 12, pr: [.60, .97] },
      { n: 12, bands: [[0, .14], [.14, .28], [.28, .42], [.42, .58]], petals: 14, pr: [.58, .97] }
    ][d - 1];

    C.bands.forEach(function (b, k) {
      if (b[0] <= 0) {
        out.push(reg(slice(cx, cy, rf, 0, b[1], 0, 360), ctx.pref([2, 5, 1]), [cx, cy]));
        return;
      }
      var A = ctx.col(2 * k), B = ctx.col(2 * k + 1);
      for (var j = 0; j < C.n; j++) {
        var a0 = j * 360 / C.n, a1 = (j + 1) * 360 / C.n;
        out.push(reg(slice(cx, cy, rf, b[0], b[1], a0, a1), (j % 2 ? B : A),
          slicePt(cx, cy, rf, b[0], b[1], a0, a1)));
      }
    });

    var P1 = ctx.col(1), P2 = ctx.col(4), step = 360 / C.petals;
    for (i = 0; i < C.petals; i++) {
      var p = petal(cx, cy, C.pr[0] * R, C.pr[1] * R, i * step, step / 2 * 0.94, 0.6);
      out.push(reg(p.d, (i % 2 ? P2 : P1), p.pt));
    }
    return { regions: out, strokes: [] };
  }

  /* ================= 그림 2 · 조각보 ================= */

  function cellPieces(x, y, s, kind) {
    var h = s / 2;
    var A = [x, y], B = [x + s, y], C = [x + s, y + s], D = [x, y + s], M = [x + h, y + h];
    function mk(p) { return { d: poly(p), pt: cen(p) }; }
    if (kind === 'diag') return [mk([A, B, C]), mk([A, C, D])];
    if (kind === 'anti') return [mk([A, B, D]), mk([B, C, D])];
    if (kind === 'quad') return [mk([A, B, M]), mk([B, C, M]), mk([C, D, M]), mk([D, A, M])];
    if (kind === 'four') return [
      mk([[x, y], [x + h, y], [x + h, y + h], [x, y + h]]),
      mk([[x + h, y], [x + s, y], [x + s, y + h], [x + h, y + h]]),
      mk([[x, y + h], [x + h, y + h], [x + h, y + s], [x, y + s]]),
      mk([[x + h, y + h], [x + s, y + h], [x + s, y + s], [x + h, y + s]])
    ];
    return [mk([A, B, C, D])];
  }

  function patchwork(ctx, d) {
    var out = [];
    var g = [3, 4, 4, 4, 5][d - 1];
    var sp = [.35, .35, .65, .8, .6][d - 1];
    var kinds = d >= 3 ? ['diag', 'anti', 'quad', 'four', 'diag', 'anti'] : ['diag', 'anti'];
    var M = 3, S = (100 - M * 2) / g, prev = -1;

    for (var r = 0; r < g; r++) {
      for (var c = 0; c < g; c++) {
        var kind = ctx.rnd() < sp ? kinds[ctx.ri(kinds.length)] : 'full';
        var used = [];
        cellPieces(M + c * S, M + r * S, S, kind).forEach(function (p) {
          var col = ctx.col(ctx.ri(ctx.colors));
          for (var t = 0; t < 14 && (used.indexOf(col) >= 0 || col === prev); t++) {
            col = ctx.col(ctx.ri(ctx.colors));
          }
          used.push(col);
          prev = col;
          out.push(reg(p.d, col, p.pt));
        });
      }
    }
    return { regions: out, strokes: [] };
  }

  /* ================= 그림 3 · 해바라기 ================= */

  function flower(ctx, d) {
    var out = [], i;
    var C = [
      { core: [],     petals: 8,  dbl: 0, leaf: 1, sun: 0 },
      { core: [6],    petals: 8,  dbl: 0, leaf: 1, sun: 0 },
      { core: [8],    petals: 10, dbl: 0, leaf: 2, sun: 0 },
      { core: [8, 8], petals: 12, dbl: 0, leaf: 2, sun: 1 },
      { core: [8, 8], petals: 10, dbl: 1, leaf: 2, sun: 1 }
    ][d - 1];

    var IN = [3, 3, 97, 97], hz = 79;
    out.push(reg(rect(IN[0], IN[1], IN[2], hz), ctx.pref([8, 3]), [IN[0] + 8, IN[1] + 8]));
    out.push(reg(rect(IN[0], hz, IN[2], IN[3]), ctx.pref([9, 5, 1]), [IN[0] + 8, (hz + IN[3]) / 2]));
    if (C.sun) out.push(reg(circlePath(85, 15, 8), ctx.pref([2, 5]), [85, 15]));

    var stemC = ctx.pref([4]);
    out.push(reg(poly([[47.5, 38], [52.5, 38], [52.5, 94], [47.5, 94]]), stemC, [50, 87]));

    /* 잎사귀 — 줄기 양옆에 마주 난다.
       단계가 오르면 한 장을 잎맥을 따라 반씩 나눈다 (모양은 그대로 잎이다). */
    [256, 104].forEach(function (mid) {
      if (C.leaf === 1) {
        var p = petal(50, 67, 3, 25, mid, 28, .6);
        out.push(reg(p.d, stemC, p.pt));
      } else {
        [-1, 1].forEach(function (side) {
          var h = leafHalf(50, 67, 3, 25, mid, 28, .6, side);
          out.push(reg(h.d, stemC, h.pt));
        });
      }
    });

    /* 꽃잎 */
    var fx = 50, fy = 36, Rc = 16;
    var pc1 = ctx.pref([2, 5, 7, 1]);
    var pc2 = ctx.pref([5, 7, 1, 2]);
    if (pc2 === pc1) pc2 = ctx.col(3);
    var m = C.petals * (C.dbl ? 2 : 1), step = 360 / m;
    for (i = 0; i < m; i++) {
      var r1 = C.dbl ? (i % 2 ? 25 : 31) : 29;
      var p2 = petal(fx, fy, Rc - 1, r1, i * step, step / 2 * 0.95, .55);
      out.push(reg(p2.d, C.dbl ? (i % 2 ? pc2 : pc1) : pc1, p2.pt));
    }

    /* 씨앗 자리 */
    var rf = rConst(Rc);
    var coreN = C.core.length;
    out.push(reg(slice(fx, fy, rf, 0, coreN ? 0.4 : 1, 0, 360), ctx.pref([9, 5, 1]), [fx, fy]));
    C.core.forEach(function (n, k) {
      var s0 = 0.4 + k * (0.6 / coreN), s1 = 0.4 + (k + 1) * (0.6 / coreN);
      var A = ctx.col(2 * k + 3), B = ctx.col(2 * k + 4);
      for (var j = 0; j < n; j++) {
        var a0 = j * 360 / n, a1 = (j + 1) * 360 / n;
        out.push(reg(slice(fx, fy, rf, s0, s1, a0, a1), (j % 2 ? B : A),
          slicePt(fx, fy, rf, s0, s1, a0, a1)));
      }
    });

    return { regions: out, strokes: [] };
  }

  /* ================= 그림 4 · 나비 ================= */

  function wingRings(out, cx, cy, rx, ry, tilt, rings, slices, cols, mir) {
    var rf = rEllipseRot(rx, ry, tilt);
    rings.forEach(function (b, k) {
      var m = slices[k], off = tilt - 180 / m;
      for (var i = 0; i < m; i++) {
        var a0 = off + i * 360 / m, a1 = off + (i + 1) * 360 / m;
        if (mir) { var t = -a1; a1 = -a0; a0 = t; }
        out.push(reg(slice(cx, cy, rf, b[0], b[1], a0, a1), cols[(k + i) % cols.length],
          slicePt(cx, cy, rf, b[0], b[1], a0, a1)));
      }
    });
  }

  function butterfly(ctx, d) {
    var out = [], st = [], i;
    var C = [
      { up: [[0, .5], [.5, 1]],                           ups: [1, 1],        lo: [[0, .5], [.5, 1]],               los: [1, 1],    body: 3, spots: 0, frame: 0 },
      { up: [[0, .42], [.42, .74], [.74, 1]],             ups: [1, 1, 1],     lo: [[0, .55], [.55, 1]],             los: [1, 1],    body: 3, spots: 0, frame: 1 },
      { up: [[0, .4], [.4, .72], [.72, 1]],               ups: [1, 1, 2],     lo: [[0, .55], [.55, 1]],             los: [1, 2],    body: 3, spots: 2, frame: 2 },
      { up: [[0, .32], [.32, .56], [.56, .78], [.78, 1]], ups: [1, 1, 2, 3],  lo: [[0, .45], [.45, .75], [.75, 1]], los: [1, 2, 2], body: 3, spots: 2, frame: 3 },
      { up: [[0, .3], [.3, .52], [.52, .76], [.76, 1]],   ups: [1, 2, 3, 4],  lo: [[0, .42], [.42, .72], [.72, 1]], los: [1, 2, 3], body: 3, spots: 3, frame: 3 }
    ][d - 1];

    var I = C.frame ? [9, 9, 91, 91] : [3, 3, 97, 97];
    out.push(reg(rect(I[0], I[1], I[2], I[3]), ctx.pref([8, 3, 2]), [I[0] + 6, I[1] + 6]));

    var upC = [ctx.col(0), ctx.col(1), ctx.col(2), ctx.col(3)];
    var loC = [ctx.col(2), ctx.col(3), ctx.col(0), ctx.col(1)];
    wingRings(out, 66, 33, 13.5, 19, 42, C.up, C.ups, upC, false);
    wingRings(out, 34, 33, 13.5, 19, -42, C.up, C.ups, upC, true);
    wingRings(out, 64, 64, 11, 15, 138, C.lo, C.los, loC, false);
    wingRings(out, 36, 64, 11, 15, -138, C.lo, C.los, loC, true);

    /* 날개 무늬 점 (좌우 대칭) */
    var spotC = ctx.pref([1, 6, 10]);
    var wingR = rEllipseRot(13.5, 19, 42);
    for (i = 0; i < C.spots; i++) {
      var ang = 42 + (i - (C.spots - 1) / 2) * 34;
      var a = polar(66, 33, wingR(ang) * 0.62, ang);
      out.push(reg(circlePath(a[0], a[1], 3.4), spotC, a));
      out.push(reg(circlePath(100 - a[0], a[1], 3.4), spotC, [100 - a[0], a[1]]));
    }

    /* 몸통 — 머리 · 가슴 · 배 */
    var bodyC = ctx.pref([9, 10, 6, 1]);
    var cuts = [[28, 37], [37, 50], [50, 74]];
    for (i = 0; i < C.body; i++) {
      var band = ellBandH(50, 51, 5.6, 23, cuts[i][0], cuts[i][1]);
      out.push(reg(band.d, bodyC, band.pt));
    }

    /* 더듬이 */
    st.push('M50 30 C46 22 42 18 36 15');
    st.push('M50 30 C54 22 58 18 64 15');
    st.push(circlePath(35, 14, 1.6));
    st.push(circlePath(65, 14, 1.6));

    frameRegions(out, ctx, C.frame);
    return { regions: out, strokes: st };
  }

  /* ================= 그림 5 · 물고기 ================= */

  function fish(ctx, d) {
    var out = [], st = [], i;
    var C = [
      { bands: 3, half: 0, tail: 2, dor: 1, ven: 1, bub: 3, frame: 0 },
      { bands: 3, half: 0, tail: 2, dor: 2, ven: 1, bub: 3, frame: 1 },
      { bands: 4, half: 1, tail: 3, dor: 2, ven: 1, bub: 4, frame: 2 },
      { bands: 5, half: 1, tail: 3, dor: 3, ven: 2, bub: 5, frame: 3 },
      { bands: 6, half: 1, tail: 4, dor: 3, ven: 2, bub: 6, frame: 3 }
    ][d - 1];

    var I = C.frame ? [9, 9, 91, 91] : [3, 3, 97, 97];
    out.push(reg(rect(I[0], I[1], I[2], I[3]), ctx.pref([8, 3]), [I[0] + 6, I[1] + 6]));

    var bx = 44, by = 52, brx = 26, bry = 17;

    /* 꼬리 — 부챗살 */
    var tailC = ctx.pref([5, 1, 6, 2]);
    var tailAlt = ctx.col(4);
    var edge = [];
    for (i = 0; i <= C.tail; i++) {
      var t = i / C.tail;
      edge.push([90 - 9 * Math.sin(Math.PI * t), 32 + 40 * t]);
    }
    fan([bx + brx - 4, by], edge).forEach(function (p, k) {
      out.push(reg(p.d, k % 2 ? tailAlt : tailC, p.pt));
    });

    /* 등지느러미 · 배지느러미 */
    var finC = ctx.pref([5, 2, 7, 1]);
    var finAlt = ctx.col(6);
    var top = [];
    for (i = 0; i <= C.dor; i++) {
      var u = i / C.dor;
      top.push([34 + 26 * u, 37 - 20 * Math.sin(Math.PI * u * 0.85)]);
    }
    fan([46, 39], top).forEach(function (p, k) { out.push(reg(p.d, k % 2 ? finAlt : finC, p.pt)); });

    if (C.ven) {
      var bot = [];
      for (i = 0; i <= C.ven; i++) {
        var v = i / C.ven;
        bot.push([38 + 20 * v, 66 + 14 * Math.sin(Math.PI * (v * 0.6 + 0.2))]);
      }
      fan([44, 65], bot).forEach(function (p, k) { out.push(reg(p.d, k % 2 ? finAlt : finC, p.pt)); });
    }

    /* 몸통 세로 띠 */
    var cols = [ctx.pref([5, 2, 1]), ctx.pref([2, 7, 4]), ctx.pref([1, 6, 5])];
    if (cols[1] === cols[0]) cols[1] = ctx.col(2);
    if (cols[2] === cols[1] || cols[2] === cols[0]) cols[2] = ctx.col(5);
    for (i = 0; i < C.bands; i++) {
      var x0 = bx - brx + 2 * brx * i / C.bands, x1 = bx - brx + 2 * brx * (i + 1) / C.bands;
      if (C.half) {
        for (var part = 1; part <= 2; part++) {
          var e = ellBand(bx, by, brx, bry, x0, x1, part);
          out.push(reg(e.d, cols[(i + part) % cols.length], e.pt));
        }
      } else {
        var e0 = ellBand(bx, by, brx, bry, x0, x1, 0);
        out.push(reg(e0.d, cols[i % cols.length], e0.pt));
      }
    }

    /* 눈 · 아가미 */
    out.push(reg(circlePath(28, 47, 3.6), ctx.pref([10, 6, 3]), [28, 47]));
    st.push('M34 41 C31 47 31 58 34 64');

    /* 물방울 */
    var bubC = ctx.pref([8, 3]);
    var bubAlt = ctx.col(7);
    var spots = [[20, 22, 4.2], [31, 14, 3.6], [14, 34, 3.2], [76, 19, 4], [87, 32, 3.4], [65, 13, 3.2]];
    for (i = 0; i < C.bub; i++) {
      var s = spots[i];
      out.push(reg(circlePath(s[0], s[1], s[2]), i % 2 ? bubAlt : bubC, [s[0], s[1]]));
    }

    frameRegions(out, ctx, C.frame);
    return { regions: out, strokes: st };
  }

  /* ================= 그림 6 · 거북이 ================= */

  function turtle(ctx, d) {
    var out = [], st = [];
    var C = [
      { rings: [[0, .42], [.42, 1]],                         sl: [1, 5],         frame: 0 },
      { rings: [[0, .35], [.35, .7], [.7, 1]],               sl: [1, 5, 6],      frame: 1 },
      { rings: [[0, .34], [.34, .68], [.68, 1]],             sl: [1, 6, 8],      frame: 2 },
      { rings: [[0, .3], [.3, .55], [.55, .78], [.78, 1]],   sl: [1, 6, 8, 10],  frame: 3 },
      { rings: [[0, .28], [.28, .52], [.52, .76], [.76, 1]], sl: [1, 6, 10, 12], frame: 3 }
    ][d - 1];

    var I = C.frame ? [9, 9, 91, 91] : [3, 3, 97, 97];
    out.push(reg(rect(I[0], I[1], I[2], I[3]), ctx.pref([8, 3]), [I[0] + 6, I[1] + 6]));

    var cx = 50, cy = 54, rf = rEllipse(30, 25);
    var skinC = ctx.pref([4, 2, 5]);

    /* 머리 · 네 다리 · 꼬리 — 등딱지보다 먼저 그려서 뒤로 간다 */
    [[0, 13, 41], [-52, 15, 43], [52, 15, 43], [-128, 15, 43], [128, 15, 43], [180, 9, 35]]
      .forEach(function (L) {
        var p = petal(cx, cy, 18, L[2], L[0], L[1], .6);
        out.push(reg(p.d, skinC, p.pt));
      });
    st.push(circlePath(46.5, 17, 1.5));
    st.push(circlePath(53.5, 17, 1.5));

    /* 등딱지 */
    C.rings.forEach(function (b, k) {
      var m = C.sl[k];
      if (m === 1) {
        out.push(reg(slice(cx, cy, rf, b[0], b[1], 0, 360), ctx.pref([2, 5, 1]), [cx, cy]));
        return;
      }
      var A = ctx.col(2 * k), B = ctx.col(2 * k + 1);
      var off = -180 / m;
      for (var i = 0; i < m; i++) {
        var a0 = off + i * 360 / m, a1 = off + (i + 1) * 360 / m;
        out.push(reg(slice(cx, cy, rf, b[0], b[1], a0, a1), (i % 2 ? B : A),
          slicePt(cx, cy, rf, b[0], b[1], a0, a1)));
      }
    });

    frameRegions(out, ctx, C.frame);
    return { regions: out, strokes: st };
  }

  /* ================= 그림 7 · 꽃 ================= */

  /** 화분에 담긴 튤립. 해바라기와 달리 꽃잎이 위로 오므린 잔 모양이다. */
  function tulip(ctx, d) {
    var out = [], i;
    var C = [
      { sky: 1, pot: 3, rim: 1, lobes: 3, split: 0, leaf: 1, sun: 1, frame: 0 },
      { sky: 2, pot: 3, rim: 1, lobes: 3, split: 1, leaf: 1, sun: 1, frame: 0 },
      { sky: 2, pot: 4, rim: 2, lobes: 5, split: 1, leaf: 2, sun: 1, frame: 1 },
      { sky: 3, pot: 5, rim: 2, lobes: 5, split: 1, leaf: 2, sun: 1, frame: 2 },
      { sky: 3, pot: 6, rim: 2, lobes: 7, split: 1, leaf: 2, sun: 1, frame: 3 }
    ][d - 1];

    var I = C.frame ? [9, 9, 91, 91] : [3, 3, 97, 97];
    var hz = 74;                                        /* 탁자 선 */

    /* 배경 — 하늘을 가로 띠로 나눈다. 번호는 왼쪽 끝에 적어 꽃과 겹치지 않게. */
    var skyA = ctx.pref([8, 3]), skyB = ctx.col(7);
    for (i = 0; i < C.sky; i++) {
      var sy0 = I[1] + (hz - I[1]) * i / C.sky, sy1 = I[1] + (hz - I[1]) * (i + 1) / C.sky;
      out.push(reg(rect(I[0], sy0, I[2], sy1), i % 2 ? skyB : skyA, [I[0] + 6, (sy0 + sy1) / 2]));
    }
    out.push(reg(rect(I[0], hz, I[2], I[3]), ctx.pref([9, 5, 1]), [I[0] + 6, (hz + I[3]) / 2]));
    if (C.sun) out.push(reg(circlePath(84, 18, 8), ctx.pref([2, 5]), [84, 18]));

    /* 줄기 · 잎 */
    var stemC = ctx.pref([4]);
    out.push(reg(poly([[47.5, 44], [52.5, 44], [52.5, 66], [47.5, 66]]), stemC, [50, 62]));
    [-68, 68].forEach(function (mid) {
      if (C.leaf === 1) {
        var p = petal(50, 60, 3, 22, mid, 24, .6);
        out.push(reg(p.d, stemC, p.pt));
      } else {
        [-1, 1].forEach(function (side) {
          var h = leafHalf(50, 60, 3, 22, mid, 24, .6, side);
          out.push(reg(h.d, stemC, h.pt));
        });
      }
    });

    /* 꽃잎 — 밑에서 모여 위로 벌어지는 잔 모양 */
    var pc1 = ctx.pref([1, 7, 5, 2]);
    var pc2 = ctx.pref([7, 5, 2, 1]);
    if (pc2 === pc1) pc2 = ctx.col(3);
    var lx = 50, ly = 46, spread = 30;
    for (i = 0; i < C.lobes; i++) {
      var t = C.lobes === 1 ? 0.5 : i / (C.lobes - 1);
      var mid = -spread + 2 * spread * t;
      var r1 = 30 - 12 * Math.abs(t - 0.5);             /* 가운데 꽃잎이 가장 길다 */
      var lc = i % 2 ? pc2 : pc1;
      if (C.split) {
        [-1, 1].forEach(function (side) {
          var h2 = leafHalf(lx, ly, 3, r1, mid, 15, .55, side);
          out.push(reg(h2.d, lc, h2.pt));
        });
      } else {
        var p2 = petal(lx, ly, 3, r1, mid, 15, .55);
        out.push(reg(p2.d, lc, p2.pt));
      }
    }

    /* 화분 */
    var potC = ctx.pref([9, 5, 1]), potAlt = ctx.col(2);
    var pTop = 66, pBot = 92, tw = 19, bw = 14, rimH = 8;
    for (i = 0; i < C.rim; i++) {
      var ry0 = pTop + rimH * i / C.rim, ry1 = pTop + rimH * (i + 1) / C.rim;
      out.push(reg(rect(50 - tw - 3, ry0, 50 + tw + 3, ry1), i % 2 ? potC : potAlt, [50, (ry0 + ry1) / 2]));
    }
    for (i = 0; i < C.pot; i++) {
      var u0 = i / C.pot, u1 = (i + 1) / C.pot;
      var q = [[50 - tw + 2 * tw * u0, pTop + rimH], [50 - tw + 2 * tw * u1, pTop + rimH],
               [50 - bw + 2 * bw * u1, pBot], [50 - bw + 2 * bw * u0, pBot]];
      out.push(reg(poly(q), i % 2 ? potAlt : potC, cen(q)));
    }

    frameRegions(out, ctx, C.frame);
    return { regions: out, strokes: [] };
  }

  /* ================= 그림 8 · 배 ================= */

  /** 바다 위 돛단배. 하늘·바다를 가로 띠로, 돛을 가로 줄무늬로 나눈다. */
  function boat(ctx, d) {
    var out = [], st = [], i;
    var C = [
      { sky: 1, sea: 1, hull: 3, sr: 3, sl: 2, cloud: 0, flag: 0, frame: 0 },
      { sky: 2, sea: 2, hull: 4, sr: 4, sl: 3, cloud: 1, flag: 0, frame: 0 },
      { sky: 2, sea: 3, hull: 5, sr: 5, sl: 4, cloud: 2, flag: 1, frame: 1 },
      { sky: 3, sea: 4, hull: 6, sr: 6, sl: 5, cloud: 3, flag: 1, frame: 2 },
      { sky: 3, sea: 5, hull: 7, sr: 7, sl: 6, cloud: 3, flag: 1, frame: 3 }
    ][d - 1];

    var I = C.frame ? [9, 9, 91, 91] : [3, 3, 97, 97];
    var hz = 64;                                        /* 수평선 */

    var skyA = ctx.pref([8, 3]), skyB = ctx.col(7);
    for (i = 0; i < C.sky; i++) {
      var y0 = I[1] + (hz - I[1]) * i / C.sky, y1 = I[1] + (hz - I[1]) * (i + 1) / C.sky;
      out.push(reg(rect(I[0], y0, I[2], y1), i % 2 ? skyB : skyA, [I[0] + 6, (y0 + y1) / 2]));
    }
    var seaA = ctx.pref([3, 8]), seaB = ctx.col(5);
    for (i = 0; i < C.sea; i++) {
      var w0 = hz + (I[3] - hz) * i / C.sea, w1 = hz + (I[3] - hz) * (i + 1) / C.sea;
      out.push(reg(rect(I[0], w0, I[2], w1), i % 2 ? seaB : seaA, [I[0] + 6, (w0 + w1) / 2]));
    }
    out.push(reg(circlePath(80, 20, 8), ctx.pref([2, 5]), [80, 20]));

    /* 구름 — 동그라미 셋을 겹쳐 놓은 모양 대신, 하나씩 큼직하게 */
    var cloudC = ctx.pref([10, 7, 8]);
    var clouds = [[22, 20, 7], [34, 26, 5.5], [60, 15, 5]];
    for (i = 0; i < C.cloud; i++) {
      out.push(reg(circlePath(clouds[i][0], clouds[i][1], clouds[i][2]), cloudC, [clouds[i][0], clouds[i][1]]));
    }

    /* 돛대 · 깃발 */
    var mastC = ctx.pref([9, 10]);
    out.push(reg(poly([[48.5, 16], [51.5, 16], [51.5, 66], [48.5, 66]]), mastC, [50, 30]));
    if (C.flag) {
      var fg = [[51.5, 16], [66, 20], [51.5, 24]];
      out.push(reg(poly(fg), ctx.pref([1, 5, 2]), cen(fg)));
    }

    /* 돛 두 장 — 가로 줄무늬로 나눈다 */
    var sailA = ctx.pref([1, 5, 2]), sailB = ctx.pref([2, 7, 8]);
    if (sailB === sailA) sailB = ctx.col(4);
    var rTop = 20, rBot = 66, rW = 32;
    for (i = 0; i < C.sr; i++) {
      var a0 = rTop + (rBot - rTop) * i / C.sr, a1 = rTop + (rBot - rTop) * (i + 1) / C.sr;
      var pr = [[51.5, a0], [51.5 + rW * (a0 - rTop) / (rBot - rTop), a0],
                [51.5 + rW * (a1 - rTop) / (rBot - rTop), a1], [51.5, a1]];
      out.push(reg(poly(pr), i % 2 ? sailB : sailA, cen(pr)));
    }
    var lTop = 28, lBot = 66, lW = 25;
    for (i = 0; i < C.sl; i++) {
      var b0 = lTop + (lBot - lTop) * i / C.sl, b1 = lTop + (lBot - lTop) * (i + 1) / C.sl;
      var pl = [[48.5, b0], [48.5 - lW * (b0 - lTop) / (lBot - lTop), b0],
                [48.5 - lW * (b1 - lTop) / (lBot - lTop), b1], [48.5, b1]];
      out.push(reg(poly(pl), i % 2 ? sailA : sailB, cen(pl)));
    }

    /* 배 몸통 — 갑판은 반듯하고 바닥은 둥근 진짜 배 모양 (반타원) */
    var hullC = ctx.pref([1, 9, 6]), hullAlt = ctx.col(3);
    var hx = 50, hy = 66, hrx = 31, hry = 17;
    for (i = 0; i < C.hull; i++) {
      var x0 = hx - hrx + 2 * hrx * i / C.hull, x1 = hx - hrx + 2 * hrx * (i + 1) / C.hull;
      var e = ellBand(hx, hy, hrx, hry, x0, x1, 2);
      out.push(reg(e.d, i % 2 ? hullAlt : hullC, e.pt));
    }
    st.push('M19 66 L81 66');

    frameRegions(out, ctx, C.frame);
    return { regions: out, strokes: st };
  }

  /* ================= 그림 9 · 새 ================= */

  /** 나뭇가지에 앉은 새. 몸통을 세로 띠로, 꼬리를 부챗살로 나눈다. */
  function bird(ctx, d) {
    var out = [], st = [], i;
    var C = [
      { sky: 1, bands: 3, half: 0, tail: 3, wing: 1, head: 1, leaf: 0, frame: 0 },
      { sky: 2, bands: 3, half: 0, tail: 3, wing: 2, head: 1, leaf: 2, frame: 0 },
      { sky: 2, bands: 4, half: 1, tail: 4, wing: 2, head: 2, leaf: 3, frame: 1 },
      { sky: 3, bands: 5, half: 1, tail: 4, wing: 3, head: 2, leaf: 4, frame: 2 },
      { sky: 3, bands: 6, half: 1, tail: 5, wing: 3, head: 3, leaf: 4, frame: 3 }
    ][d - 1];

    var I = C.frame ? [9, 9, 91, 91] : [3, 3, 97, 97];
    var skyA = ctx.pref([8, 3]), skyB = ctx.col(7);
    for (i = 0; i < C.sky; i++) {
      var y0 = I[1] + (I[3] - I[1]) * i / C.sky, y1 = I[1] + (I[3] - I[1]) * (i + 1) / C.sky;
      out.push(reg(rect(I[0], y0, I[2], y1), i % 2 ? skyB : skyA, [I[0] + 6, (y0 + y1) / 2]));
    }

    /* 나뭇가지와 잎 */
    var woodC = ctx.pref([9, 10]);
    out.push(reg(poly([[I[0], 78], [I[2], 74], [I[2], 80], [I[0], 84]]), woodC, [I[0] + 14, 80]));
    var leafC = ctx.pref([4]);
    var spots = [[26, 79, -40], [70, 76, 40], [40, 79, -30], [84, 75, 35]];
    for (i = 0; i < C.leaf; i++) {
      var lp = petal(spots[i][0], spots[i][1], 2, 13, spots[i][2], 20, .6);
      out.push(reg(lp.d, leafC, lp.pt));
    }

    /* 꼬리 — 왼쪽으로 뻗는 부챗살 */
    var bx = 48, by = 48, brx = 20, bry = 15;
    var tailC = ctx.pref([5, 1, 6]), tailAlt = ctx.col(4);
    var edge = [];
    for (i = 0; i <= C.tail; i++) {
      var t = i / C.tail;
      edge.push([16 + 4 * Math.sin(Math.PI * t), 30 + 30 * t]);
    }
    fan([bx - brx + 4, by], edge).forEach(function (p, k) {
      out.push(reg(p.d, k % 2 ? tailAlt : tailC, p.pt));
    });

    /* 몸통 — 세로 띠 */
    var cols = [ctx.pref([5, 2, 1]), ctx.pref([2, 7, 8]), ctx.pref([1, 6, 5])];
    if (cols[1] === cols[0]) cols[1] = ctx.col(2);
    if (cols[2] === cols[1] || cols[2] === cols[0]) cols[2] = ctx.col(5);
    for (i = 0; i < C.bands; i++) {
      var x0 = bx - brx + 2 * brx * i / C.bands, x1 = bx - brx + 2 * brx * (i + 1) / C.bands;
      if (C.half) {
        for (var part = 1; part <= 2; part++) {
          var e = ellBand(bx, by, brx, bry, x0, x1, part);
          out.push(reg(e.d, cols[(i + part) % cols.length], e.pt));
        }
      } else {
        var e0 = ellBand(bx, by, brx, bry, x0, x1, 0);
        out.push(reg(e0.d, cols[i % cols.length], e0.pt));
      }
    }

    /* 날개 — 몸통 위에 겹쳐 놓는다 */
    var wingC = ctx.pref([6, 3, 1]);
    for (i = 0; i < C.wing; i++) {
      var wr = 21 - 3 * i;
      var wp = petal(56, 44, 3, wr, 244 + 13 * i, 19, .6);
      out.push(reg(wp.d, i % 2 ? ctx.col(1) : wingC, wp.pt));
    }

    /* 머리 · 부리 · 눈 */
    var headC = ctx.pref([5, 1, 2]);
    var hx = 70, hy = 34, hr = 11, rf = rConst(hr);
    if (C.head === 1) {
      out.push(reg(circlePath(hx, hy, hr), headC, [hx, hy]));
    } else {
      for (i = 0; i < C.head; i++) {
        var a0 = i * 360 / C.head, a1 = (i + 1) * 360 / C.head;
        out.push(reg(slice(hx, hy, rf, 0, 1, a0, a1), i % 2 ? ctx.col(3) : headC,
          slicePt(hx, hy, rf, 0, 1, a0, a1)));
      }
    }
    var bk = [[79, 31], [92, 35], [79, 40]];
    out.push(reg(poly(bk), ctx.pref([5, 2]), cen(bk)));
    out.push(reg(circlePath(72, 30, 3), ctx.pref([10, 6, 3]), [72, 30]));

    st.push('M46 62 L44 76 M56 62 L58 76');           /* 다리 */

    frameRegions(out, ctx, C.frame);
    return { regions: out, strokes: st };
  }

  /* ================= 그림 10 · 과일 ================= */

  /** 그릇에 담긴 과일. 사과·배·귤·포도가 단계에 따라 늘어난다. */
  function fruit(ctx, d) {
    var out = [], st = [], i, j;
    var C = [
      { sky: 1, bowl: 3, rim: 1, seg: 1, pear: 1, grape: 3, frame: 0 },
      { sky: 1, bowl: 4, rim: 1, seg: 3, pear: 1, grape: 4, frame: 0 },
      { sky: 2, bowl: 5, rim: 2, seg: 4, pear: 2, grape: 6, frame: 1 },
      { sky: 2, bowl: 6, rim: 2, seg: 6, pear: 3, grape: 6, frame: 2 },
      { sky: 2, bowl: 7, rim: 2, seg: 8, pear: 3, grape: 7, frame: 3 }
    ][d - 1];

    var I = C.frame ? [9, 9, 91, 91] : [3, 3, 97, 97];
    var hz = 62;                                        /* 탁자 선 */
    var wallA = ctx.pref([8, 3]), wallB = ctx.col(7);
    for (i = 0; i < C.sky; i++) {
      var y0 = I[1] + (hz - I[1]) * i / C.sky, y1 = I[1] + (hz - I[1]) * (i + 1) / C.sky;
      out.push(reg(rect(I[0], y0, I[2], y1), i % 2 ? wallB : wallA, [I[0] + 6, (y0 + y1) / 2]));
    }
    out.push(reg(rect(I[0], hz, I[2], I[3]), ctx.pref([9, 5, 1]), [I[0] + 6, (hz + I[3]) / 2]));

    /* 사과 — 통째로 또는 조각으로 나눈다 */
    var apC = ctx.pref([1, 5, 2]), apAlt = ctx.col(4);
    var ax = 32, ay = 44, ar = 14, arf = rConst(ar);
    if (C.seg === 1) {
      out.push(reg(circlePath(ax, ay, ar), apC, [ax, ay]));
    } else {
      for (i = 0; i < C.seg; i++) {
        var a0 = i * 360 / C.seg, a1 = (i + 1) * 360 / C.seg;
        out.push(reg(slice(ax, ay, arf, 0, 1, a0, a1), i % 2 ? apAlt : apC,
          slicePt(ax, ay, arf, 0, 1, a0, a1)));
      }
    }
    var alf = petal(ax + 2, ay - ar + 1, 2, 11, 40, 18, .6);
    out.push(reg(alf.d, ctx.pref([4]), alf.pt));
    st.push('M32 30 C33 26 34 25 36 24');

    /* 배 — 위가 좁고 아래가 넓은 열매 */
    var prC = ctx.pref([2, 4, 5]);
    var px = 62, py = 46;
    /* 목은 잘록하고 아래가 통통한 배 모양 — 동그라미 둘을 겹쳐 만든다 */
    function pearW(u) {
      var a = 1 - Math.pow((u - 0.30) / 0.34, 2);       /* 위쪽 목 */
      var b = 1 - Math.pow((u - 0.72) / 0.34, 2);       /* 아래쪽 몸 */
      return Math.max(a > 0 ? 8 * Math.sqrt(a) : 0, b > 0 ? 14.5 * Math.sqrt(b) : 0, 0.8);
    }
    for (i = 0; i < C.pear; i++) {
      var s0 = i / C.pear, s1 = (i + 1) / C.pear;
      var pts = [], k, u, w;
      for (k = 0; k <= 14; k++) { u = k / 14; w = pearW(u); pts.push([px - w + 2 * w * s0, py - 18 + 38 * u]); }
      for (k = 14; k >= 0; k--) { u = k / 14; w = pearW(u); pts.push([px - w + 2 * w * s1, py - 18 + 38 * u]); }
      var pw = pearW(0.72);
      out.push(reg(poly(pts), i % 2 ? ctx.col(6) : prC, [px - pw + 2 * pw * (s0 + s1) / 2, py + 9]));
    }
    st.push('M62 28 L62 22');

    /* 포도 — 송이로 모아 놓는다 */
    var grC = ctx.pref([6, 3, 8]);
    var gs = [[80, 36, 5], [88, 42, 4.6], [74, 43, 4.6], [82, 47, 4.6], [90, 51, 4.4], [76, 52, 4.4], [84, 56, 4.2]];
    for (i = 0; i < C.grape; i++) {
      out.push(reg(circlePath(gs[i][0], gs[i][1], gs[i][2]), i % 3 === 2 ? ctx.col(2) : grC, [gs[i][0], gs[i][1]]));
    }

    /* 그릇 — 반타원을 세로로 나눈다 */
    var bwC = ctx.pref([10, 9, 3]), bwAlt = ctx.col(5);
    var cx = 50, cy = 64, rx = 34, ry = 20;
    for (i = 0; i < C.bowl; i++) {
      var x0 = cx - rx + 2 * rx * i / C.bowl, x1 = cx - rx + 2 * rx * (i + 1) / C.bowl;
      var e = ellBand(cx, cy, rx, ry, x0, x1, 2);
      out.push(reg(e.d, i % 2 ? bwAlt : bwC, e.pt));
    }
    for (j = 0; j < C.rim; j++) {
      var ry0 = cy - 5 + 5 * j / C.rim, ry1 = cy - 5 + 5 * (j + 1) / C.rim;
      out.push(reg(rect(cx - rx - 3, ry0, cx + rx + 3, ry1), j % 2 ? bwC : bwAlt, [cx, (ry0 + ry1) / 2]));
    }

    frameRegions(out, ctx, C.frame);
    return { regions: out, strokes: st };
  }

  /* ================= 그림 목록 ================= */

  var LIST = [
    { id: 'mandala',   name: '고운 무늬', make: mandala },
    { id: 'patchwork', name: '조각보',    make: patchwork },
    { id: 'flower',    name: '해바라기',  make: flower },
    { id: 'butterfly', name: '나비',      make: butterfly },
    { id: 'fish',      name: '물고기',    make: fish },
    { id: 'turtle',    name: '거북이',    make: turtle },
    { id: 'tulip',     name: '꽃',        make: tulip },
    { id: 'boat',      name: '배',        make: boat },
    { id: 'bird',      name: '새',        make: bird },
    { id: 'fruit',     name: '과일',      make: fruit }
  ];

  /* ================= 만들기 ================= */

  /** 씨앗값 하나로 항상 똑같은 그림이 나오는 난수 */
  function rngFrom(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCtx(colors, seed) {
    var rnd = rngFrom(seed), pal = [], i, j, k, t;
    for (i = 1; i <= colors; i++) pal.push(i);
    for (j = pal.length - 1; j > 0; j--) {          // 색 순서를 섞어 판마다 느낌이 달라지게
      k = Math.floor(rnd() * (j + 1));
      t = pal[j]; pal[j] = pal[k]; pal[k] = t;
    }
    return {
      colors: colors,
      rnd: rnd,
      ri: function (n) { return Math.floor(rnd() * n); },
      col: function (i2) { return pal[((i2 % pal.length) + pal.length) % pal.length]; },
      /** 어울리는 색을 먼저 고르고, 그 색이 이 단계에 없으면 다음 후보로 */
      pref: function (list) {
        for (var m = 0; m < list.length; m++) if (list[m] <= colors) return list[m];
        return pal[0];
      }
    };
  }

  /**
   * picId  그림 종류 (목록에 없으면 씨앗값으로 아무거나)
   * o      { detail: 1~5, colors: 4~10, seed: 정수 }
   */
  function make(picId, o) {
    var seed = o.seed >>> 0, item = null, i;
    for (i = 0; i < LIST.length; i++) if (LIST[i].id === picId) item = LIST[i];
    if (!item) item = LIST[seed % LIST.length];

    var ctx = makeCtx(o.colors, seed);
    var built = item.make(ctx, o.detail);

    /* 실제로 쓰인 색만 골라 낸다 — 쓰이지도 않는 색이 팔레트에 남지 않도록 */
    var seen = {}, used = [], n;
    built.regions.forEach(function (r) { seen[r.c] = 1; });
    for (n = 1; n <= PALETTE.length; n++) if (seen[n]) used.push(n);

    return {
      id: item.id,
      name: item.name,
      viewBox: '0 0 100 100',
      regions: built.regions,
      strokes: built.strokes || [],
      colors: used
    };
  }

  return {
    PALETTE: PALETTE, list: LIST, make: make,
    hexOf: hexOf, nameOf: nameOf
  };
})();
