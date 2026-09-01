/* 새록 — 말 바꾸기 (한국어 / English)
 *
 * 화면에 나오는 글은 모두 T('한국어 문구') 로 감싼다.
 * 한국어 문구 자체가 열쇠(key)라서 이렇게 된다.
 *
 *   - 사전에 번역이 있으면 그 말로 바뀐다.
 *   - 번역이 아직 없으면 **한국어가 그대로 나온다.** 절대 빈칸이 되지 않는다.
 *   - 코드를 읽을 때도 무슨 글인지 바로 보인다.
 *
 * 숫자나 이름이 끼어드는 문구는 이어 붙이지 말고 자리를 파 둔다.
 * 말마다 어순이 다르기 때문이다.
 *
 *   ✕  '오늘 ' + n + '종목 하셨습니다'
 *   ○  T('오늘 {n}종목 하셨습니다', { n: n })
 *
 * 새 말을 더할 때는 DICT 에 { '한국어': '그 나라 말' } 을 채우면 된다.
 */
window.I18N = (function () {

  /* 쓸 수 있는 말. 새 말을 더하면 설정 화면에 저절로 나타난다. */
  var LANGS = [
    { code: 'ko', name: '한국어', htmlLang: 'ko' },
    { code: 'en', name: 'English', htmlLang: 'en' },
    { code: 'ja', name: '日本語', htmlLang: 'ja' }
  ];

  /* ================= 사전 =================
   * 한국어는 열쇠 그대로라서 사전이 필요 없다.
   * 아래는 영어판을 채워 가는 자리다. 비어 있는 문구는 한국어가 그대로 나온다.
   */
  var DICT = {
    en: {}
  };

  var lang = 'ko';

  /** 이 기기의 브라우저 말을 보고 첫 말을 고른다 */
  function guess() {
    var n = (navigator.language || navigator.userLanguage || 'ko').toLowerCase();
    for (var i = 0; i < LANGS.length; i++) {
      if (n.indexOf(LANGS[i].code) === 0) return LANGS[i].code;
    }
    return 'en';                       /* 한국어도 영어도 아니면 영어로 */
  }

  function has(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return true;
    return false;
  }

  function set(code) {
    lang = has(code) ? code : 'ko';
    document.documentElement.setAttribute('lang', infoOf(lang).htmlLang);
    document.documentElement.setAttribute('data-lang', lang);
  }

  function infoOf(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return LANGS[0];
  }

  /** 주소에 ?lang=en 이 있으면 그것부터. 없으면 저장된 설정, 그것도 없으면 브라우저 말.
   *  (검색용 낱장 페이지에서 '지금 해 보기'로 들어올 때 쓴다) */
  function fromUrl() {
    var m = /[?&]lang=([a-z-]+)/i.exec(location.search || '');
    return m && has(m[1].toLowerCase()) ? m[1].toLowerCase() : null;
  }
  /** 주소에서 ?lang= 만 떼어 낸다. 나머지 물음표 뒤 글자와 # 은 그대로 둔다.
   *  이걸 안 지우면, 설정에서 말을 바꿔도 다시 열릴 때 주소가 도로 덮어쓴다. */
  function stripLangFromUrl() {
    if (!window.history || !history.replaceState || !location.search) return;
    var kept = location.search.slice(1).split('&').filter(function (kv) {
      return kv && !/^lang=/i.test(kv);
    });
    var q = kept.length ? '?' + kept.join('&') : '';
    try { history.replaceState(null, '', location.pathname + q + (location.hash || '')); } catch (e) {}
  }

  function start() {
    var want = fromUrl();
    if (want) {
      Store.setSetting('lang', want);                  /* 고른 말을 기억해 둔다 */
      stripLangFromUrl();                              /* 그리고 주소에서는 지운다 */
    }
    set(want || Store.settings().lang || guess());
  }

  /**
   * T('문구')                     그대로
   * T('{n}점', { n: 120 })        자리에 값을 넣어서
   */
  function t(s, vars) {
    var d = DICT[lang];
    var out = (d && Object.prototype.hasOwnProperty.call(d, s)) ? d[s] : s;
    if (vars) {
      out = out.replace(/\{(\w+)\}/g, function (whole, k) {
        return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : whole;
      });
    }
    return out;
  }

  return {
    langs: LANGS,
    get: function () { return lang; },
    set: set,
    start: start,
    t: t,
    /** 이 말로 된 자료가 있는가 — 낱말·퀴즈처럼 나라마다 다른 자료를 쓰는 게임이 묻는다 */
    dict: DICT
  };
})();

/* 어디서나 짧게 쓰도록 */
window.T = function (s, vars) { return window.I18N.t(s, vars); };

/* 게임 파일들보다 먼저 말을 정해 둔다.
   게임의 이름·설명·난이도 이름은 파일을 읽을 때 한 번만 정해지므로,
   그 전에 말이 정해져 있지 않으면 한국어로 굳어 버린다. */
window.I18N.start();
