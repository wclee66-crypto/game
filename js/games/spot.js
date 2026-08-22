/* 새록 — 틀린그림찾기
 * 점수: 찾기 600 + 시간 300 + 정확도 100 − (힌트 50/회) + 난이도 보너스
 *
 * 그림 파일을 따로 넣지 않고, 판을 시작할 때마다 SVG로 그려 낸다.
 * 그래서 같은 그림이 되풀이되지 않고, 인터넷이 없어도 가볍게 돌아간다.
 *
 * 문제의 질을 위해 지키는 것 —
 *  1) 두 그림의 물건 수는 언제나 똑같다. 빈자리를 누르게 하지 않는다.
 *  2) 크기 차이·자리 옮김은 쓰지 않는다. '틀렸다'고 보기에 애매하기 때문이다.
 *  3) 대신 물건마다 그 물건다운 차이를 미리 만들어 둔다.
 *     (우산은 손잡이 방향, 물고기는 눈 색, 하트는 뒤집힘, 별은 살짝 틀어짐 …)
 *     자세히 보면 누구나 확실히 알아볼 수 있으면서, 그림 자체는 자연스럽다.
 */
window.Games = window.Games || {};
window.Games.spot = (function () {

  var W = 120, H = 90;   /* 그림 한 장의 좌표 크기 (가로:세로 = 4:3) */

  var LEVELS = {
    step1:  { name: T('첫걸음'), step: 1, cols: 2, rows: 2, diffs: 2, limit: 300, bonus: 0,
              note: T('큼직한 물건 4개 · 다른 곳 2군데') },
    step2:  { name: T('가볍게'), step: 2, cols: 3, rows: 2, diffs: 3, limit: 300, bonus: 0,
              note: T('물건 6개 · 다른 곳 3군데') },
    easy:   { name: T('쉬움'),   step: 3, cols: 4, rows: 2, diffs: 3, limit: 360, bonus: 0,
              note: T('물건 8개 · 다른 곳 3군데') },
    normal: { name: T('보통'),   step: 4, cols: 4, rows: 3, diffs: 4, limit: 420, bonus: 100,
              note: T('물건 12개 · 다른 곳 4군데') },
    hard:   { name: T('어려움'), step: 5, cols: 5, rows: 3, diffs: 5, limit: 480, bonus: 250,
              note: T('물건 15개 · 다른 곳 5군데') }
  };
  var ORDER = ['step1', 'step2', 'easy', 'normal', 'hard'];

  /* 달라지는 방식은 세 가지뿐이다 — 모양 · 색 · 다른 물건.
     한 판에는 이 셋이 골고루 들어간다. */
  var KINDS = ['shape', 'color', 'swap'];

  /* 무엇이 달라졌는지 — 판이 끝났을 때 알려 주는 말 */
  var KIND_NAME = {
    shape: T('모양이 달라진 곳'),
    color: T('색이 바뀐 곳'),
    swap:  T('다른 물건으로 바뀐 곳')
  };

  /* 흰 바탕에서 또렷하게 보이면서 서로 헷갈리지 않는 색만 골랐다 */
  var COLORS = ['#0E9E62', '#2F8F8A', '#3B7DD8', '#6B5DD3', '#C2417A',
                '#D6453F', '#DE8420', '#A98A12', '#5E8C3A', '#8A6A4E'];

  /* ================= 물건 그리기 =================
   * 모든 물건은 가로세로 -1 ~ 1 안에 그린다.
   * 화면에 놓을 때 크기(s)를 곱하므로 선 굵기도 작은 숫자로 적는다.
   *
   * draw(색, 모양번호) — 물건마다 모양이 세 가지씩 있고,
   * 둘째 그림에서는 그중 다른 번호를 골라 그린다. 이것이 '모양이 달라진 곳'이다.
   */

  function starPoints(n, inner) {
    var p = [];
    for (var k = 0; k < n * 2; k++) {
      var a = -Math.PI / 2 + k * Math.PI / n;
      var r = (k % 2) ? inner : 0.98;
      p.push((Math.cos(a) * r).toFixed(3) + ',' + (Math.sin(a) * r).toFixed(3));
    }
    return p.join(' ');
  }
  var STAR5 = starPoints(5, 0.44), STAR6 = starPoints(6, 0.54);

  var SHAPES = {

    /* 꽃 — 0 꽃잎 여섯 장 / 1 꽃잎 다섯 장 / 2 잎이 반대쪽 */
    flower: { name: T('꽃'), vars: 3, draw: function (c, v) {
      var n = (v === 1) ? 5 : 6, p = '', k;
      for (k = 0; k < n; k++) {
        p += '<ellipse cx="0" cy="-0.55" rx="0.3" ry="0.42" fill="' + c + '" transform="rotate(' + (k * (360 / n)).toFixed(1) + ')"/>';
      }
      var lx = (v === 2) ? -0.28 : 0.28, lr = (v === 2) ? 20 : -20;
      return '<path d="M0 0.2 L0 0.95" stroke="#4E7A5E" stroke-width="0.12" fill="none" stroke-linecap="round"/>' +
             '<ellipse cx="' + lx + '" cy="0.62" rx="0.26" ry="0.13" fill="#4E7A5E" transform="rotate(' + lr + ' ' + lx + ' 0.62)"/>' +
             p + '<circle r="0.26" fill="#F0C244"/>';
    } },

    /* 나무 — 0 기본 / 1 빨간 열매 세 개 / 2 위 덩어리가 없어 납작함 */
    tree: { name: T('나무'), vars: 3, draw: function (c, v) {
      var s = '<rect x="-0.13" y="0.1" width="0.26" height="0.9" rx="0.06" fill="#8A6A4E"/>' +
              '<circle cx="-0.36" cy="-0.02" r="0.44" fill="' + c + '"/>' +
              '<circle cx="0.36" cy="-0.02" r="0.41" fill="' + c + '"/>';
      if (v !== 2) s += '<circle cx="0" cy="-0.45" r="0.5" fill="' + c + '"/>';
      if (v === 1) {
        s += '<circle cx="-0.34" cy="-0.24" r="0.13" fill="#D6453F"/>' +
             '<circle cx="0.3" cy="-0.1" r="0.13" fill="#D6453F"/>' +
             '<circle cx="0.02" cy="-0.62" r="0.13" fill="#D6453F"/>';
      }
      return s;
    } },

    /* 집 — 0 기본 / 1 문과 창문이 좌우 바뀜 / 2 지붕에 굴뚝 */
    house: { name: T('집'), vars: 3, draw: function (c, v) {
      var door = (v === 1) ? 0.08 : -0.42;
      var win  = (v === 1) ? -0.46 : 0.12;
      return (v === 2 ? '<rect x="0.3" y="-1" width="0.22" height="0.45" fill="#8A6A4E"/>' : '') +
             '<rect x="-0.62" y="-0.12" width="1.24" height="1.05" rx="0.05" fill="' + c + '"/>' +
             '<path d="M-0.84 -0.12 L0 -0.92 L0.84 -0.12 Z" fill="#B0553F"/>' +
             '<rect x="' + door + '" y="0.36" width="0.34" height="0.57" rx="0.03" fill="#FFFFFF"/>' +
             '<rect x="' + win + '" y="0.12" width="0.34" height="0.32" rx="0.03" fill="#FFFFFF"/>';
    } },

    /* 물고기 — 0 기본(검은 눈) / 1 눈이 빨감 / 2 반대쪽을 봄 */
    fish: { name: T('물고기'), vars: 3, draw: function (c, v) {
      var g = '<path d="M-0.45 0 L-1 -0.42 L-1 0.42 Z" fill="' + c + '"/>' +
              '<ellipse cx="0.1" cy="0" rx="0.72" ry="0.42" fill="' + c + '"/>' +
              '<ellipse cx="-0.02" cy="-0.06" rx="0.26" ry="0.14" fill="rgba(255,255,255,.4)"/>' +
              '<circle cx="0.5" cy="-0.1" r="0.13" fill="' + ((v === 1) ? '#D6453F' : '#0E1A14') + '"/>';
      return (v === 2) ? '<g transform="scale(-1 1)">' + g + '</g>' : g;
    } },

    /* 새 — 0 기본(노란 부리) / 1 부리가 빨감 / 2 반대쪽을 봄 */
    bird: { name: T('새'), vars: 3, draw: function (c, v) {
      var g = '<path d="M-0.68 0.12 L-1.05 -0.22 L-0.85 0.4 Z" fill="' + c + '"/>' +
              '<ellipse cx="-0.1" cy="0.15" rx="0.62" ry="0.4" fill="' + c + '"/>' +
              '<circle cx="0.44" cy="-0.28" r="0.3" fill="' + c + '"/>' +
              '<path d="M0.7 -0.32 L1.06 -0.14 L0.7 -0.02 Z" fill="' + ((v === 1) ? '#D6453F' : '#F0A72A') + '"/>' +
              '<ellipse cx="-0.05" cy="0.12" rx="0.3" ry="0.16" fill="rgba(255,255,255,.45)" transform="rotate(-12 -0.05 0.12)"/>' +
              '<circle cx="0.52" cy="-0.36" r="0.07" fill="#0E1A14"/>';
      return (v === 2) ? '<g transform="scale(-1 1)">' + g + '</g>' : g;
    } },

    /* 해 — 0 빛살 여덟 개 / 1 빛살 여섯 개 / 2 웃는 얼굴 */
    sun: { name: T('해'), vars: 3, draw: function (c, v) {
      var n = (v === 1) ? 6 : 8, r = '', k;
      for (k = 0; k < n; k++) {
        r += '<line x1="0" y1="-0.68" x2="0" y2="-0.98" stroke="' + c + '" stroke-width="0.14" stroke-linecap="round" transform="rotate(' + (k * (360 / n)).toFixed(1) + ')"/>';
      }
      var face = (v === 2)
        ? '<circle cx="-0.2" cy="-0.14" r="0.075" fill="#FFFFFF"/><circle cx="0.2" cy="-0.14" r="0.075" fill="#FFFFFF"/>' +
          '<path d="M-0.24 0.12 Q0 0.34 0.24 0.12" stroke="#FFFFFF" stroke-width="0.08" fill="none" stroke-linecap="round"/>'
        : '';
      return r + '<circle r="0.58" fill="' + c + '"/>' + face;
    } },

    /* 구름 — 0 봉우리 세 개 / 1 봉우리 두 개 / 2 빗방울이 내림 */
    cloud: { name: T('구름'), vars: 3, draw: function (c, v) {
      var s = '<g fill="' + c + '"><circle cx="-0.44" cy="0.12" r="0.4"/><circle cx="0.06" cy="-0.2" r="0.5"/>' +
              ((v === 1) ? '' : '<circle cx="0.55" cy="0.1" r="0.36"/>') +
              '<rect x="-0.82" y="0.1" width="' + ((v === 1) ? '1.02' : '1.4') + '" height="0.4" rx="0.2"/></g>';
      if (v === 2) {
        s += '<path d="M-0.42 0.6 L-0.52 0.94 M0.04 0.6 L-0.06 0.94 M0.5 0.6 L0.4 0.94" ' +
             'stroke="#3B7DD8" stroke-width="0.11" fill="none" stroke-linecap="round"/>';
      }
      return s;
    } },

    /* 사과 — 0 잎이 왼쪽 / 1 잎이 오른쪽 / 2 잎이 두 장 */
    apple: { name: T('사과'), vars: 3, draw: function (c, v) {
      var lL = '<ellipse cx="-0.3" cy="-0.7" rx="0.3" ry="0.16" fill="#5E8C3A" transform="rotate(-18 -0.3 -0.7)"/>';
      var lR = '<ellipse cx="0.3" cy="-0.7" rx="0.3" ry="0.16" fill="#5E8C3A" transform="rotate(18 0.3 -0.7)"/>';
      var leaf = (v === 1) ? lR : ((v === 2) ? lL + lR : lL);
      return '<path d="M0 -0.5 Q0.04 -0.82 0.2 -0.94" stroke="#8A6A4E" stroke-width="0.1" fill="none" stroke-linecap="round"/>' +
             leaf +
             '<circle cx="-0.28" cy="0.2" r="0.62" fill="' + c + '"/><circle cx="0.28" cy="0.2" r="0.62" fill="' + c + '"/>' +
             '<ellipse cx="-0.32" cy="-0.05" rx="0.14" ry="0.22" fill="rgba(255,255,255,.35)" transform="rotate(-22 -0.32 -0.05)"/>';
    } },

    /* 별 — 0 똑바로 / 1 살짝 기울어짐 / 2 뿔이 여섯 개 */
    star: { name: T('별'), vars: 3, draw: function (c, v) {
      if (v === 2) return '<polygon points="' + STAR6 + '" fill="' + c + '"/>';
      return '<polygon points="' + STAR5 + '" fill="' + c + '"' + ((v === 1) ? ' transform="rotate(22)"' : '') + '/>';
    } },

    /* 나비 — 0 기본 / 1 날개에 흰 점무늬 / 2 아래 날개가 뾰족한 꼬리 모양 */
    butterfly: { name: T('나비'), vars: 3, draw: function (c, v) {
      var s = '<ellipse cx="-0.42" cy="-0.3" rx="0.42" ry="0.34" fill="' + c + '" transform="rotate(-25 -0.42 -0.3)"/>' +
              '<ellipse cx="0.42" cy="-0.3" rx="0.42" ry="0.34" fill="' + c + '" transform="rotate(25 0.42 -0.3)"/>';
      if (v === 2) {
        s += '<path d="M-0.1 0.16 L-0.66 0.28 L-0.28 0.92 Z" fill="' + c + '" opacity=".85"/>' +
             '<path d="M0.1 0.16 L0.66 0.28 L0.28 0.92 Z" fill="' + c + '" opacity=".85"/>';
      } else {
        s += '<ellipse cx="-0.34" cy="0.36" rx="0.32" ry="0.27" fill="' + c + '" opacity=".78"/>' +
             '<ellipse cx="0.34" cy="0.36" rx="0.32" ry="0.27" fill="' + c + '" opacity=".78"/>';
      }
      if (v === 1) {
        s += '<circle cx="-0.46" cy="-0.34" r="0.13" fill="rgba(255,255,255,.85)"/>' +
             '<circle cx="0.46" cy="-0.34" r="0.13" fill="rgba(255,255,255,.85)"/>';
      }
      return s + '<ellipse cx="0" cy="0.02" rx="0.1" ry="0.5" fill="#3A3630"/>' +
             '<path d="M-0.05 -0.45 L-0.3 -0.82 M0.05 -0.45 L0.3 -0.82" stroke="#3A3630" stroke-width="0.07" fill="none" stroke-linecap="round"/>';
    } },

    /* 찻잔 — 0 손잡이가 오른쪽 / 1 손잡이가 왼쪽 / 2 김이 오름 */
    cup: { name: T('찻잔'), vars: 3, draw: function (c, v) {
      var handle = '<g transform="scale(' + ((v === 1) ? -1 : 1) + ' 1)">' +
                   '<path d="M0.5 -0.22 q0.44 0.22 0 0.48" stroke="' + c + '" stroke-width="0.15" fill="none"/></g>';
      var steam = (v === 2)
        ? '<path d="M-0.22 -0.6 q0.18 -0.18 0 -0.36 M0.22 -0.6 q0.18 -0.18 0 -0.36" stroke="' + c + '" stroke-width="0.09" fill="none" stroke-linecap="round" opacity=".75"/>'
        : '';
      return handle + steam +
             '<path d="M-0.58 -0.45 L0.58 -0.45 L0.44 0.4 Q0.42 0.54 0.28 0.54 L-0.28 0.54 Q-0.42 0.54 -0.44 0.4 Z" fill="' + c + '"/>' +
             '<ellipse cx="0" cy="-0.45" rx="0.58" ry="0.14" fill="#FFFFFF"/>' +
             '<ellipse cx="0" cy="0.76" rx="0.84" ry="0.16" fill="' + c + '" opacity=".5"/>';
    } },

    /* 우산 — 0 손잡이 갈고리가 왼쪽 / 1 갈고리가 오른쪽 / 2 꼭대기에 꼭지 */
    umbrella: { name: T('우산'), vars: 3, draw: function (c, v) {
      var hook = (v === 1) ? 0.3 : -0.3;
      return '<path d="M0 0.05 L0 0.72 q0 0.28 ' + hook + ' 0.2" stroke="#8A6A4E" stroke-width="0.13" fill="none" stroke-linecap="round"/>' +
             '<path d="M-0.92 0.05 A0.92 0.8 0 0 1 0.92 0.05 Z" fill="' + c + '"/>' +
             ((v === 2) ? '<path d="M0 -0.72 L0 -1" stroke="#8A6A4E" stroke-width="0.11" stroke-linecap="round"/>' : '') +
             '<path d="M-0.92 0.05 q0.23 -0.24 0.46 0 q0.23 -0.24 0.46 0 q0.23 -0.24 0.46 0 q0.23 -0.24 0.46 0" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="0.08"/>';
    } },

    /* 버섯 — 0 갓에 점 세 개 / 1 점이 없는 민짜 갓 / 2 대에 테가 있음 */
    mushroom: { name: T('버섯'), vars: 3, draw: function (c, v) {
      var dots = (v === 1) ? ''
        : '<circle cx="-0.36" cy="-0.26" r="0.17" fill="rgba(255,255,255,.7)"/>' +
          '<circle cx="0.2" cy="-0.42" r="0.13" fill="rgba(255,255,255,.7)"/>' +
          '<circle cx="0.46" cy="-0.1" r="0.11" fill="rgba(255,255,255,.7)"/>';
      return '<rect x="-0.24" y="-0.05" width="0.48" height="0.85" rx="0.16" fill="#F0EAE0"/>' +
             '<path d="M-0.88 0 A0.9 0.82 0 0 1 0.88 0 Z" fill="' + c + '"/>' + dots +
             ((v === 2) ? '<rect x="-0.35" y="0.18" width="0.7" height="0.14" rx="0.07" fill="#D8CDBC"/>' : '');
    } },

    /* 하트 — 0 기본 / 1 위아래로 뒤집힘 / 2 반짝임이 있음 */
    heart: { name: T('하트'), vars: 3, draw: function (c, v) {
      var p = '<path d="M0 0.88 C-1.05 0.12 -0.6 -0.85 0 -0.3 C0.6 -0.85 1.05 0.12 0 0.88 Z" fill="' + c + '"/>';
      if (v === 1) return '<g transform="scale(1 -1)">' + p + '</g>';
      return p + ((v === 2) ? '<ellipse cx="-0.36" cy="-0.14" rx="0.15" ry="0.24" fill="rgba(255,255,255,.55)" transform="rotate(-25 -0.36 -0.14)"/>' : '');
    } }
  };

  var TYPES = Object.keys(SHAPES);

  /* ================= 판 만들기 ================= */

  var S = null, root = null, timer = null, els = {}, mounted = false;

  function lv() { return LEVELS[S.level] || LEVELS.easy; }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function copy(o) { var n = {}, k; for (k in o) { if (o.hasOwnProperty(k)) n[k] = o[k]; } return n; }

  /** 손가락으로 누르기 편하도록 넉넉한 동그라미를 잡는다 */
  function hitR(s) { return r2(clamp(s * 1.15 + 2.5, 7, 22)); }
  function hitOf(it) { return { x: it.x, y: it.y, r: hitR(it.s) }; }

  /** 물건을 격자에 하나씩 놓는다 (조금씩 흔들어 놓아야 그림처럼 보인다) */
  function buildItems(L) {
    var cw = W / L.cols, ch = H / L.rows;
    var s = Math.min(cw, ch) * 0.36;
    var pool = [];
    while (pool.length < L.cols * L.rows) pool = pool.concat(shuffle(TYPES.slice()));

    var items = [], i = 0;
    for (var r = 0; r < L.rows; r++) {
      for (var c = 0; c < L.cols; c++) {
        var type = pool[i++];
        var size = r2(s * rnd(0.9, 1.05));
        items.push({
          t: type,
          x: r2(clamp(cw * (c + 0.5) + rnd(-cw * 0.12, cw * 0.12), size + 1, W - size - 1)),
          y: r2(clamp(ch * (r + 0.5) + rnd(-ch * 0.1, ch * 0.1), size + 1, H - size - 1)),
          s: size,
          c: pick(COLORS),
          v: Math.floor(Math.random() * SHAPES[type].vars)   /* 이 물건의 모양 번호 */
        });
      }
    }
    return items;
  }

  /** 물건 하나를 정해진 방식으로 바꾼다. 그 물건에 맞지 않으면 null 을 돌려준다. */
  function change(items, i, kind) {
    var it = items[i], a = hitOf(it);

    if (kind === 'shape') {
      var others = [], k;
      for (k = 0; k < SHAPES[it.t].vars; k++) if (k !== it.v) others.push(k);
      if (!others.length) return null;
      return { i: i, kind: kind, mod: { v: pick(others) }, a: a, b: a };
    }
    if (kind === 'color') {
      var c = pick(COLORS.filter(function (x) { return x !== it.c; }));
      return { i: i, kind: kind, mod: { c: c }, a: a, b: a };
    }
    if (kind === 'swap') {
      var nt = pick(TYPES.filter(function (x) { return x !== it.t; }));
      return { i: i, kind: kind, mod: { t: nt }, a: a, b: a };
    }
    return null;
  }

  function buildDiffs(items, L) {
    var order = shuffle(items.map(function (_, i) { return i; }));
    var kinds = shuffle(KINDS.slice());
    var diffs = [], ki = 0;

    for (var p = 0; p < order.length && diffs.length < L.diffs; p++) {
      var made = null;
      for (var k = 0; k < kinds.length && !made; k++) {   /* 이 물건에 맞는 방식을 찾는다 */
        made = change(items, order[p], kinds[(ki + k) % kinds.length]);
      }
      if (made) { diffs.push(made); ki++; }
    }
    return diffs;
  }

  /** 둘째 그림에 쓸 물건 목록 — 물건 수는 그대로이고 달라진 것만 바뀐다 */
  function rightItems(items, diffs) {
    var out = items.map(copy);
    diffs.forEach(function (d) {
      for (var k in d.mod) { if (d.mod.hasOwnProperty(k)) out[d.i][k] = d.mod[k]; }
    });
    return out;
  }

  function newGame(level) {
    var L = LEVELS[level] ? LEVELS[level] : LEVELS.easy;
    var items = buildItems(L);
    S = {
      day: Store.dayKey(), level: LEVELS[level] ? level : 'easy',
      items: items, diffs: buildDiffs(items, L),
      found: [], hinted: [], wrong: 0, hints: 0, elapsed: 0, done: false
    };
    persist();
  }

  function persist() {
    if (!S || S.done) return;
    Store.saveSession('spot', {
      day: S.day, level: S.level, items: S.items, diffs: S.diffs,
      found: S.found, hinted: S.hinted, wrong: S.wrong, hints: S.hints, elapsed: S.elapsed
    });
  }

  function restore(s) {
    S = {
      day: s.day, level: LEVELS[s.level] ? s.level : 'easy',
      items: s.items, diffs: s.diffs,
      found: s.found || [], hinted: s.hinted || [], wrong: s.wrong || 0,
      hints: s.hints || 0, elapsed: s.elapsed || 0, done: false
    };
  }

  /* ================= 그림 그리기 ================= */

  function drawItem(it) {
    if (!it) return '';
    return '<g transform="translate(' + it.x + ' ' + it.y + ') scale(' + it.s + ')">' +
      SHAPES[it.t].draw(it.c, it.v || 0) + '</g>';
  }

  function svgOf(items, id) {
    return '<svg class="sp-svg" id="' + id + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      items.map(drawItem).join('') +
      '<g class="sp-marks"></g>' +
    '</svg>';
  }

  function markOf(p, state, label) {
    return '<g class="sp-mark is-' + state + '">' +
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + p.r + '"/>' +
      '<text x="' + p.x + '" y="' + r2(p.y - p.r - 1.6) + '">' + label + '</text>' +
    '</g>';
  }

  /** 찾은 곳·힌트를 두 그림에 함께 표시한다 */
  function paintMarks(revealAll) {
    if (!els.marksA) return;
    var a = '', b = '';
    S.diffs.forEach(function (d, k) {
      var pos = S.found.indexOf(k);
      var state = pos >= 0 ? 'found'
                : (revealAll ? 'miss' : (S.hinted.indexOf(k) >= 0 ? 'hint' : ''));
      if (!state) return;
      var label = pos >= 0 ? String(pos + 1) : '?';
      a += markOf(d.a, state, label);
      b += markOf(d.b, state, label);
    });
    els.marksA.innerHTML = a;
    els.marksB.innerHTML = b;
    paintDots();
  }

  function paintDots() {
    if (!els.dots) return;
    els.dots.innerHTML = S.diffs.map(function (d, k) {
      return '<i class="sp-dot' + (S.found.indexOf(k) >= 0 ? ' is-on' : '') + '"></i>';
    }).join('');
    els.found.textContent = S.found.length + ' / ' + S.diffs.length;
    els.hint.textContent = S.hints;
  }

  /* ================= 화면: 시작 ================= */

  function renderIntro() {
    stopTimer();
    if (!mounted) return;
    var sess = Store.getSession('spot');
    var best = Store.bestEver('spot');

    root.innerHTML =
      '<section class="intro">' +
        ('<h2 class="intro__title">' + T('틀린그림찾기') + '</h2>') +
        ('<p class="intro__desc">' + T('두 그림을 견주어 보고') + '<br>' + T('모양이 다른 것을 눌러 주세요.') + '<br>') +
          ('<small>' + T('물건 수는 두 그림이 똑같습니다.') + '<br>' + T('모양 · 색 · 다른 물건으로만 달라집니다.') + '<br>') +
          (T('어느 쪽 그림을 눌러도 되고, 틀려도 점수가 깎이지 않습니다.') + '</small></p>') +
        (best ? ('<p class="intro__best">' + T('나의 최고 기록') + ' <b>') + UI.comma(best.score) + (T('점') + '</b></p>') : '') +
        (sess && LEVELS[sess.level]
          ? ('<button class="btn btn--accent btn--big" id="spResume">' + T('이어서 하기') + ' <small>') +
            LEVELS[sess.level].name + ' · ' + T('{a}/{b}군데 찾음', { a: (sess.found || []).length, b: sess.diffs.length }) + '</small></button>'
          : '') +
        '<div class="levels">' +
          ORDER.map(function (k) {
            var L = LEVELS[k];
            return '<button class="level" data-level="' + k + '">' +
              '<span class="level__step">' + T('{n}단계', { n: L.step }) + '</span>' +
              '<span class="level__name">' + L.name + '</span>' +
              '<span class="level__meta">' + L.note + ' ' + T('· 제한 {m}분', { m: Math.round(L.limit / 60) }) + '</span>' +
              '<span class="level__bonus">' + (L.bonus ? T('난이도 보너스 +{n}', { n: L.bonus }) : T('기본')) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        ('<button class="btn btn--ghost btn--print" id="spPrint">' + T('종이로 풀 문제 만들기') + ' <small>' + T('A4 인쇄 · PDF 저장') + '</small></button>') +
        ('<button class="linkbtn" id="spRules">' + T('점수 규칙 보기') + '</button>') +
      '</section>';

    root.querySelectorAll('.level').forEach(function (b) {
      b.addEventListener('click', function () { newGame(b.dataset.level); renderBoard(); });
    });
    var rb = root.querySelector('#spResume');
    if (rb) rb.addEventListener('click', function () { restore(sess); renderBoard(); });
    root.querySelector('#spRules').addEventListener('click', function () { App.showRules('spot'); });
    root.querySelector('#spPrint').addEventListener('click', function () { Print.dialog('spot'); });
  }

  /* ================= 화면: 판 ================= */

  function renderBoard() {
    if (!mounted) return;
    var L = lv();

    root.innerHTML =
      '<section class="game spot">' +
        '<div class="hud">' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('난이도') + '</span><b>') + L.name + '</b></div>' +
          ('<div class="hud__item"><span class="hud__lbl">' + T('남은 시간') + '</span><b id="spTime">0:00</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('찾음') + '</span><b id="spFound">0 / 0</b></div>') +
          ('<div class="hud__item"><span class="hud__lbl">' + T('힌트') + '</span><b id="spHint">0</b></div>') +
        '</div>' +
        '<div class="sp-wrap">' +
          ('<figure class="sp-panel" id="spPanelA"><figcaption class="sp-cap">' + T('첫째 그림') + '</figcaption>') +
            svgOf(S.items, 'spSvgA') + '</figure>' +
          ('<figure class="sp-panel" id="spPanelB"><figcaption class="sp-cap">' + T('둘째 그림') + '</figcaption>') +
            svgOf(rightItems(S.items, S.diffs), 'spSvgB') + '</figure>' +
        '</div>' +
        '<div class="sp-dots" id="spDots"></div>' +
        '<p class="sp-note" id="spNote">' + T('모양이 다른 곳 {n}군데를 찾아 눌러 보세요.', { n: S.diffs.length }) + '</p>' +
        '<div class="tools" id="spTools">' +
          ('<button class="tool" id="spHintBtn"><span>💡</span>' + T('힌트') + '</button>') +
          ('<button class="tool" id="spRestart"><span>↺</span>' + T('새 판') + '</button>') +
          ('<button class="tool" id="spSwitch"><span>⇄</span>' + T('다른 게임') + '</button>') +
        '</div>' +
      '</section>';

    els = {
      time:   root.querySelector('#spTime'),
      found:  root.querySelector('#spFound'),
      hint:   root.querySelector('#spHint'),
      dots:   root.querySelector('#spDots'),
      note:   root.querySelector('#spNote'),
      svgA:   root.querySelector('#spSvgA'),
      svgB:   root.querySelector('#spSvgB'),
      panelA: root.querySelector('#spPanelA'),
      panelB: root.querySelector('#spPanelB')
    };
    els.marksA = els.svgA.querySelector('.sp-marks');
    els.marksB = els.svgB.querySelector('.sp-marks');

    els.svgA.addEventListener('click', function (e) { onTap(e, 'a'); });
    els.svgB.addEventListener('click', function (e) { onTap(e, 'b'); });

    root.querySelector('#spHintBtn').addEventListener('click', useHint);
    root.querySelector('#spRestart').addEventListener('click', function () {
      UI.confirm(T('새 판'), T('지금 판을 그만두고 새 그림으로 시작할까요?'), function () {
        newGame(S.level); renderBoard();
      }, T('새로 시작'));
    });
    root.querySelector('#spSwitch').addEventListener('click', function () { App.gameSwitcher('spot'); });

    paintMarks(false);
    startTimer();
  }

  /* ================= 누르기 ================= */

  /** 화면에서 누른 자리를 그림 안의 좌표로 바꾼다 */
  function toScene(svg, cx, cy) {
    var b = svg.getBoundingClientRect();
    var k = Math.min(b.width / W, b.height / H);
    return {
      x: (cx - b.left - (b.width - W * k) / 2) / k,
      y: (cy - b.top - (b.height - H * k) / 2) / k
    };
  }

  function onTap(e, side) {
    if (!S || S.done) return;
    var p = toScene(side === 'a' ? els.svgA : els.svgB, e.clientX, e.clientY);
    var hit = -1, near = 1e9, already = false;

    S.diffs.forEach(function (d, k) {
      var c = (side === 'a') ? d.a : d.b;
      var dx = p.x - c.x, dy = p.y - c.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > c.r) return;
      if (S.found.indexOf(k) >= 0) { already = true; return; }
      if (dist < near) { near = dist; hit = k; }
    });

    if (hit >= 0) return foundOne(hit);
    if (already) return;                 /* 이미 찾은 곳을 다시 눌러도 벌점이 없다 */
    missOne(side, p);
  }

  function foundOne(k) {
    S.found.push(k);
    UI.beep('ok');
    paintMarks(false);
    persist();

    if (S.found.length >= S.diffs.length) return finish(false);
    els.note.textContent = T('찾았습니다! {n}군데 남았습니다.', { n: S.diffs.length - S.found.length });
  }

  function missOne(side, p) {
    S.wrong++;
    UI.beep('no');
    persist();

    var g = (side === 'a') ? els.marksA : els.marksB;
    var panel = (side === 'a') ? els.panelA : els.panelB;
    var x = r2(p.x), y = r2(p.y);
    var mark = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mark.setAttribute('class', 'sp-x');
    mark.innerHTML =
      '<line x1="' + (x - 3) + '" y1="' + (y - 3) + '" x2="' + (x + 3) + '" y2="' + (y + 3) + '"/>' +
      '<line x1="' + (x + 3) + '" y1="' + (y - 3) + '" x2="' + (x - 3) + '" y2="' + (y + 3) + '"/>';
    g.appendChild(mark);
    setTimeout(function () { if (mark.parentNode) mark.parentNode.removeChild(mark); }, 800);

    panel.classList.remove('is-miss');
    void panel.offsetWidth;
    panel.classList.add('is-miss');
    setTimeout(function () { panel.classList.remove('is-miss'); }, 400);

    els.note.textContent = T('이곳은 두 그림이 같습니다. 다시 살펴보세요.');
  }

  function useHint() {
    if (!S || S.done) return;
    var rest = [];
    S.diffs.forEach(function (d, k) {
      if (S.found.indexOf(k) < 0 && S.hinted.indexOf(k) < 0) rest.push(k);
    });
    if (!rest.length) { UI.toast(T('표시할 곳이 더 없습니다.')); return; }

    S.hinted.push(pick(rest));
    S.hints++;
    UI.beep('tick');
    paintMarks(false);
    persist();
    UI.toast(T('한 곳을 노란 동그라미로 표시했습니다. (−50점)'), 2400);
  }

  /* ================= 시간 ================= */

  function startTimer() {
    stopTimer();
    var L = lv();
    els.time.textContent = UI.fmtTime(L.limit - S.elapsed);
    timer = setInterval(function () {
      if (!S || S.done || !mounted) return;
      S.elapsed++;
      var left = L.limit - S.elapsed;
      els.time.textContent = UI.fmtTime(left);
      els.time.classList.toggle('is-urgent', left <= 30);
      if (S.elapsed % 10 === 0) persist();
      if (left <= 0) finish(true);
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  /* ================= 점수 ================= */

  function score() {
    var L = lv();
    var all = S.found.length === S.diffs.length;
    var find = Math.round(600 * S.found.length / S.diffs.length);
    var time = all ? Math.round(300 * Math.max(0, L.limit - S.elapsed) / L.limit) : 0;
    var acc = Math.max(0, 100 - S.wrong * 10);
    var penalty = S.hints * 50;
    var bonus = all ? L.bonus : 0;
    return {
      find: find, time: time, acc: acc, penalty: penalty, bonus: bonus, all: all,
      total: Math.max(0, find + time + acc + bonus - penalty)
    };
  }

  function finish(timeUp) {
    S.done = true;
    stopTimer();
    Store.clearSession('spot');
    UI.beep(timeUp ? 'no' : 'win');

    paintMarks(true);                     /* 못 찾은 곳도 점선으로 알려 준다 */
    afterTools();

    var L = lv(), sc = score();
    Store.addRecord({
      game: 'spot', score: sc.total, difficulty: T('{n}단계', { n: L.step }) + ' ' + L.name, duration: S.elapsed,
      detail: { found: S.found.length, total: S.diffs.length, wrong: S.wrong, hints: S.hints, timeUp: !!timeUp }
    });

    var rows = [{ label: T('찾은 곳 ({a}/{b}군데)', { a: S.found.length, b: S.diffs.length }), value: sc.find }];
    if (sc.all) rows.push({ label: T('시간 보너스 ({t} 남김)', { t: UI.fmtTime(Math.max(0, L.limit - S.elapsed)) }), value: sc.time });
    rows.push({ label: T('정확도 보너스 (헛짚음 {n}회)', { n: S.wrong }), value: sc.acc });
    if (sc.bonus) rows.push({ label: T('난이도 보너스 ({name})', { name: L.name }), value: sc.bonus });
    if (sc.penalty) rows.push({ label: T('힌트 사용 ({n}회)', { n: S.hints }), value: sc.penalty, minus: true });

    var missed = [];
    S.diffs.forEach(function (d, k) {
      if (S.found.indexOf(k) < 0) missed.push(KIND_NAME[d.kind] || T('달라진 곳'));
    });

    UI.resultModal({
      title: timeUp ? T('시간이 다 되었습니다') : T('다 찾으셨습니다!'),
      score: sc.total,
      headline: sc.all
        ? T('다른 곳 {n}군데를 모두 찾으셨습니다.', { n: S.diffs.length })
        : T('못 찾으신 곳: {list}', { list: missed.join(', ') }),
      rows: rows,
      note: sc.all ? '' : T('「그림 보기」를 누르시면 못 찾은 곳을 점선 동그라미로 알려 드립니다.'),
      actions: [
        { label: T('그림 보기') },
        { label: T('다른 게임'), onClick: function () { App.gameSwitcher('spot'); } },
        { label: T('한 판 더'), kind: 'accent', onClick: function () { S = null; renderIntro(); } }
      ]
    });
  }

  /** 판이 끝난 뒤에는 아래 단추를 바꿔 준다 */
  function afterTools() {
    var t = root.querySelector('#spTools');
    if (!t) return;
    t.innerHTML =
      ('<button class="tool" id="spAgain"><span>↺</span>' + T('한 판 더') + '</button>') +
      ('<button class="tool" id="spSwitch2"><span>⇄</span>' + T('다른 게임') + '</button>');
    t.querySelector('#spAgain').addEventListener('click', function () { S = null; renderIntro(); });
    t.querySelector('#spSwitch2').addEventListener('click', function () { App.gameSwitcher('spot'); });
    if (els.note) els.note.textContent = T('초록 동그라미는 찾으신 곳, 점선 동그라미는 못 찾으신 곳입니다.');
  }

  /* ================= 바깥에 내보내기 ================= */

  return {
    art: '<path d="M3 4h8v8H3zM13 4h8v8h-8z"/><circle cx="7" cy="8" r="1.7"/><circle cx="17" cy="8" r="1.7"/><path d="M6 16.5h5M13 16.5h5M6 19.5h3M13 19.5h5"/>',
    id: 'spot', name: T('틀린그림찾기'), tagline: T('두 그림을 견주어 보는 눈'),
    rules: {
      title: T('틀린그림찾기 점수 규칙'),
      lines: [
        [T('난이도'), T('1단계 물건 4개·2군데 · 2단계 6개·3군데 · 3단계 8개·3군데 · 4단계 12개·4군데 · 5단계 15개·5군데')],
        [T('찾기 점수'), T('최대 600점 · 찾은 곳 수에 비례 (모두 찾으면 600점)')],
        [T('시간 보너스'), T('최대 300점 · 모두 찾았을 때만, 남은 시간에 비례')],
        [T('정확도 보너스'), T('최대 100점 · 엉뚱한 곳을 1번 누를 때마다 10점씩 줄어듦')],
        [T('힌트 감점'), T('힌트 1회마다 50점 차감 (한 곳을 노란 동그라미로 알려 줍니다)')],
        [T('달라지는 방식'), T('모양이 달라짐 · 색이 바뀜 · 다른 물건으로 바뀜, 세 가지뿐입니다')],
        [T('모양의 차이'), T('물건마다 정해져 있습니다 — 우산은 손잡이 방향, 물고기는 눈 색과 보는 방향, 하트는 뒤집힘, 별은 살짝 기울어짐, 집은 굴뚝, 해는 빛살 수처럼 자세히 보면 확실한 것만 냅니다')],
        [T('두 그림의 물건 수'), T('항상 똑같습니다. 한쪽에만 있는 물건이나 크기·자리 차이는 내지 않습니다')],
        [T('난이도 보너스'), T('보통 +100점, 어려움 +250점 (모두 찾았을 때)')],
        [T('최고 점수'), T('1~3단계 1,000점 / 보통 1,100점 / 어려움 1,250점')],
        [T('시간이 끝나면'), T('찾은 만큼만 점수로 기록되고, 못 찾은 곳을 알려 드립니다')]
      ]
    },
    mount: function (container) {
      mounted = true;
      root = container;
      if (S && !S.done) renderBoard();
      else renderIntro();
    },
    unmount: function () { mounted = false; stopTimer(); persist(); },
    hasProgress: function () { return !!Store.getSession('spot'); },
    levels: LEVELS,
    levelOrder: ORDER,

    /** 종이로 풀 문제를 한 판 새로 만든다.
     *  화면에서 하던 판(S)은 건드리지 않는다 — 인쇄했다고 진행 중인 판이 사라지면 안 된다. */
    makeForPrint: function (level) {
      var L = LEVELS[level] ? LEVELS[level] : LEVELS.easy;
      var items = buildItems(L);
      var diffs = buildDiffs(items, L);
      return {
        levelName: T('{n}단계', { n: L.step }) + ' ' + L.name,
        note: L.note,
        w: W, h: H,
        count: diffs.length,
        first: items.map(drawItem).join(''),
        second: rightItems(items, diffs).map(drawItem).join(''),
        marksA: diffs.map(function (d, i) { return markOf(d.a, 'miss', String(i + 1)); }).join(''),
        marksB: diffs.map(function (d, i) { return markOf(d.b, 'miss', String(i + 1)); }).join('')
      };
    }
  };
})();
