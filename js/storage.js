/* 새록 — 저장소
 * 모든 점수/설정/진행중 게임을 localStorage 한 곳에 모아 관리한다.
 * 스키마:
 * {
 *   v: 1,
 *   settings: { fontScale:'md'|'lg'|'xl', sound:true, lang:'ko'|'en', introDone:false },
 *   records: { "2026-08-19": [ {game,score,difficulty,detail,duration,at}, ... ] },
 *   sessions: { <게임id>: {...}|null, ... }   — 게임이 늘 때마다 저절로 늘어난다
 * }
 */
window.Store = (function () {
  var KEY = 'malgeunddeul.v1';
  var MAX_DAYS = 400; // 400일치까지만 보관

  var db = null;

  function blank() {
    return {
      v: 1,
      settings: { fontScale: 'md', sound: true, lang: null, introDone: false },   /* lang 이 null 이면 브라우저 말을 따른다 */
      records: {},
      sessions: {},                              /* 게임이 늘어나도 손댈 곳이 없도록 빈 채로 둔다 */
      quizWrong: []
    };
  }

  function load() {
    if (db) return db;
    try {
      var raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : blank();
    } catch (e) {
      db = blank();
    }
    if (!db || typeof db !== 'object') db = blank();
    if (!db.settings) db.settings = blank().settings;
    if (!db.records) db.records = {};
    if (!db.sessions) db.sessions = {};
    if (!Array.isArray(db.quizWrong)) db.quizWrong = [];
    return db;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(load()));
    } catch (e) {
      /* 저장 공간이 없어도 게임은 계속 진행되도록 조용히 넘어간다 */
    }
  }

  /* ---------- 날짜 유틸 (모두 기기의 현지 시각 기준) ---------- */

  function dayKey(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function shiftDay(key, delta) {
    var p = key.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + delta);
    return dayKey(d);
  }

  function lastDays(n, endKey) {
    var end = endKey || dayKey();
    var out = [];
    for (var i = n - 1; i >= 0; i--) out.push(shiftDay(end, -i));
    return out;
  }

  function labelOf(key) {
    var p = key.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var wd = T('일 월 화 수 목 금 토').split(' ')[d.getDay()];
    var mn = T('1월 2월 3월 4월 5월 6월 7월 8월 9월 10월 11월 12월').split(' ')[+p[1] - 1];
    return {
      month: +p[1], date: +p[2], weekday: wd,
      text: T('{m} {d}일 ({w})', { m: mn, d: +p[2], w: wd })
    };
  }

  /* ---------- 기록 ---------- */

  function addRecord(rec) {
    var d = load();
    var key = dayKey();
    if (!d.records[key]) d.records[key] = [];
    var row = {
      game: rec.game,
      score: Math.max(0, Math.round(rec.score)),
      difficulty: rec.difficulty || '',
      detail: rec.detail || {},
      duration: Math.round(rec.duration || 0),
      at: new Date().toISOString()
    };
    d.records[key].push(row);
    prune(d);
    save();
    return row;
  }

  function prune(d) {
    var keys = Object.keys(d.records).sort();
    while (keys.length > MAX_DAYS) delete d.records[keys.shift()];
  }

  function dayRecords(key) {
    return (load().records[key || dayKey()] || []).slice();
  }

  /** 그날 게임별 최고점 — 그날 실제로 한 게임만 담긴다.
   *  게임 종류가 늘어나도 고칠 곳이 없도록 기록에서 바로 뽑는다. */
  function dayBest(key) {
    var out = {};
    dayRecords(key).forEach(function (r) {
      if (out[r.game] == null || r.score > out[r.game]) out[r.game] = r.score;
    });
    return out;
  }

  /** 그날의 총점 = 게임별 최고점의 합 (여러 번 해도 최고 기록만 합산) */
  function dayTotal(key) {
    var b = dayBest(key), sum = 0;
    Object.keys(b).forEach(function (g) { sum += b[g] || 0; });
    return sum;
  }

  /** 게임별 역대 최고 기록 (없으면 null) */
  function bestEver(game) {
    var d = load(), best = null;
    Object.keys(d.records).forEach(function (k) {
      d.records[k].forEach(function (r) {
        if (r.game !== game) return;
        if (!best || r.score > best.score) best = { score: r.score, day: k, difficulty: r.difficulty };
      });
    });
    return best;
  }

  /** 오늘까지 이어진 연속 플레이 일수 */
  function streak() {
    var d = load(), n = 0, key = dayKey();
    if (!(d.records[key] || []).length) key = shiftDay(key, -1); // 오늘 아직 안 했으면 어제부터 센다
    while ((d.records[key] || []).length) { n++; key = shiftDay(key, -1); }
    return n;
  }

  function stats() {
    var d = load(), plays = 0, sum = 0, days = 0, byGame = {};
    Object.keys(d.records).forEach(function (k) {
      var list = d.records[k];
      if (list.length) days++;
      list.forEach(function (r) {
        plays++; sum += r.score;
        if (!byGame[r.game]) byGame[r.game] = { plays: 0, sum: 0, best: 0 };
        byGame[r.game].plays++;
        byGame[r.game].sum += r.score;
        if (r.score > byGame[r.game].best) byGame[r.game].best = r.score;
      });
    });
    return { plays: plays, days: days, avg: plays ? Math.round(sum / plays) : 0, byGame: byGame };
  }

  /* ---------- 진행중인 게임 (다른 게임으로 전환해도 이어하기) ---------- */

  function saveSession(game, data) { load().sessions[game] = data; save(); }
  function getSession(game) {
    var s = load().sessions[game];
    return s && s.day === dayKey() ? s : null; // 날짜가 바뀌면 이어하기 없음
  }
  function clearSession(game) { load().sessions[game] = null; save(); }

  /* ---------- 퀴즈 오답 노트 ----------
   * 정답은 보기 번호가 아니라 '정답 글'로 저장한다. 그래야 다시 낼 때
   * 보기 순서를 마음껏 섞어도 정답이 어긋나지 않는다.
   */
  var WRONG_MAX = 200;

  function getWrong() { return load().quizWrong; }

  function addWrong(items) {
    var w = getWrong();
    (items || []).forEach(function (it) {
      if (!it || !it.q) return;
      var dup = false;
      for (var i = 0; i < w.length; i++) if (w[i].q === it.q) { dup = true; break; }
      if (dup) return;
      /* lang 은 어느 말로 된 문제인가 — 한국어 노트와 영어 노트가 섞이지 않게 한다 */
      w.push({ c: it.c, q: it.q, options: it.options, a: it.a, lang: it.lang || 'ko', at: new Date().toISOString() });
    });
    if (w.length > WRONG_MAX) w.splice(0, w.length - WRONG_MAX);
    save();
    return w.length;
  }

  /** 다시 맞힌 문제는 노트에서 뺀다 */
  function removeWrong(qText) {
    var w = getWrong();
    for (var i = 0; i < w.length; i++) {
      if (w[i].q === qText) { w.splice(i, 1); save(); return true; }
    }
    return false;
  }

  /** 오답 노트 비우기 — lang 을 주면 그 말로 된 문제만 지운다 (다른 말의 노트는 남는다) */
  function clearWrong(lang) {
    var db = load();
    db.quizWrong = lang
      ? db.quizWrong.filter(function (w) { return (w.lang || 'ko') !== lang; })
      : [];
    save();
  }

  /* ---------- 설정 ---------- */

  function settings() { return load().settings; }
  function setSetting(k, v) { load().settings[k] = v; save(); }

  /* ---------- 내보내기 / 초기화 ---------- */

  function exportJSON() { return JSON.stringify(load(), null, 2); }

  /** 내보낸 파일을 다시 불러와 합친다. 같은 판이 두 번 들어가지 않도록 걸러 낸다. */
  function importJSON(text) {
    var incoming = JSON.parse(text);
    if (!incoming || typeof incoming !== 'object' || !incoming.records) {
      throw new Error(T('새록에서 내보낸 파일이 아닙니다.'));
    }
    var d = load(), added = 0;
    Object.keys(incoming.records).forEach(function (day) {
      var list = incoming.records[day];
      if (!Array.isArray(list)) return;
      if (!d.records[day]) d.records[day] = [];
      var seen = {};
      d.records[day].forEach(function (r) { seen[r.at + '|' + r.game + '|' + r.score] = 1; });
      list.forEach(function (r) {
        if (!r || !r.game || typeof r.score !== 'number') return;
        var k = r.at + '|' + r.game + '|' + r.score;
        if (seen[k]) return;
        seen[k] = 1;
        d.records[day].push(r);
        added++;
      });
      d.records[day].sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    });
    prune(d);
    save();
    return added;
  }
  function resetAll() { db = blank(); save(); }
  function resetRecords() { load().records = {}; save(); }

  return {
    dayKey: dayKey, shiftDay: shiftDay, lastDays: lastDays, labelOf: labelOf,
    addRecord: addRecord, dayRecords: dayRecords, dayBest: dayBest, dayTotal: dayTotal,
    bestEver: bestEver, streak: streak, stats: stats, allRecords: function () { return load().records; },
    saveSession: saveSession, getSession: getSession, clearSession: clearSession,
    getWrong: getWrong, addWrong: addWrong, removeWrong: removeWrong, clearWrong: clearWrong,
    settings: settings, setSetting: setSetting,
    exportJSON: exportJSON, importJSON: importJSON, resetAll: resetAll, resetRecords: resetRecords
  };
})();
