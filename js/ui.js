/* 새록 — 공용 UI 도우미 */
window.UI = (function () {

  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------- 토스트 ---------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-on');
      setTimeout(function () { el.hidden = true; }, 250);
    }, ms || 1800);
  }

  /* ---------- 모달 ---------- */
  function modal(opts) {
    var root = document.getElementById('modalRoot');
    root.hidden = false;
    root.innerHTML = '';

    var wrap = h('<div class="modal"><div class="modal__card" role="dialog" aria-modal="true"></div></div>');
    var card = wrap.querySelector('.modal__card');

    if (opts.title) card.appendChild(h('<h2 class="modal__title">' + esc(opts.title) + '</h2>'));
    if (opts.body) {
      var body = document.createElement('div');
      body.className = 'modal__body';
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else body.appendChild(opts.body);
      card.appendChild(body);
    }
    var acts = document.createElement('div');
    acts.className = 'modal__actions';
    (opts.actions || [{ label: '확인' }]).forEach(function (a) {
      var b = h('<button class="btn ' + (a.kind ? 'btn--' + a.kind : 'btn--ghost') + '">' + esc(a.label) + '</button>');
      b.addEventListener('click', function () {
        if (!a.keepOpen) close();
        if (a.onClick) a.onClick();
      });
      acts.appendChild(b);
    });
    card.appendChild(acts);

    if (opts.dismissable !== false) {
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    }
    root.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('is-on'); });

    function close() {
      wrap.classList.remove('is-on');
      setTimeout(function () { root.hidden = true; root.innerHTML = ''; }, 200);
    }
    return { close: close, card: card };
  }

  function confirm(title, message, onYes, yesLabel) {
    modal({
      title: title,
      body: '<p class="modal__msg">' + esc(message) + '</p>',
      actions: [
        { label: '취소' },
        { label: yesLabel || '확인', kind: 'accent', onClick: onYes }
      ]
    });
  }

  /* ---------- 소리 (짧은 신호음) ---------- */
  var actx = null;
  function beep(kind) {
    if (!Store.settings().sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var seq = {
        ok: [[660, 0, 0.09], [880, 0.08, 0.12]],
        no: [[196, 0, 0.18]],
        tick: [[520, 0, 0.05]],
        win: [[523, 0, 0.12], [659, 0.11, 0.12], [784, 0.22, 0.14], [1046, 0.34, 0.3]]
      }[kind] || [[600, 0, 0.08]];
      seq.forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine';
        o.frequency.value = n[0];
        var t0 = actx.currentTime + n[1];
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[2]);
        o.connect(g); g.connect(actx.destination);
        o.start(t0); o.stop(t0 + n[2] + 0.02);
      });
    } catch (e) { /* 소리는 없어도 무방 */ }
  }

  /* ---------- 점수 결과 화면 ---------- */
  /* rows: [{label, value, minus?:true}] */
  function resultModal(o) {
    var rows = (o.rows || []).map(function (r) {
      var sign = r.plain ? '' : (r.minus ? '−' : '+');
      return '<li class="score__row' + (r.minus ? ' is-minus' : '') + (r.plain ? ' is-plain' : '') + '">' +
        '<span>' + esc(r.label) + '</span><b>' + sign + comma(Math.abs(r.value)) + '</b></li>';
    }).join('');

    var body =
      '<div class="score">' +
        '<div class="score__big"><span class="score__num">' + comma(o.score) + '</span>' +
          '<span class="score__unit">' + esc(o.unit || '점') + '</span></div>' +
        (o.headline ? '<p class="score__headline">' + esc(o.headline) + '</p>' : '') +
        '<ul class="score__rows">' + rows + '</ul>' +
        (o.note ? '<p class="score__note">' + esc(o.note) + '</p>' : '') +
      '</div>';

    return modal({
      title: o.title,
      body: body,
      dismissable: false,
      actions: o.actions
    });
  }

  /* ---------- 막대 그래프 ---------- */
  /* data: [{label, value, sub?}] , max: 기준 최대값 */
  function barChart(data, max) {
    var top = Math.max(max || 0, 1);
    var bars = data.map(function (d) {
      var pct = Math.max(0, Math.min(100, (d.value / top) * 100));
      return '<div class="chart__col' + (d.today ? ' is-today' : '') + '">' +
        '<div class="chart__track"><div class="chart__bar" style="height:' + pct + '%"></div></div>' +
        '<span class="chart__lbl">' + esc(d.label) + '</span></div>';
    }).join('');
    return '<div class="chart">' + bars + '</div>';
  }

  return {
    h: h, esc: esc, fmtTime: fmtTime, comma: comma,
    toast: toast, modal: modal, confirm: confirm, beep: beep,
    resultModal: resultModal, barChart: barChart
  };
})();
