/* 새록 — 방문자 세기 (구글 애널리틱스 GA4)
 *
 * 왜 넣는가
 *   광고 수익은 방문자 수에서 나옵니다. 몇 사람이 어느 화면을 보았는지 모르면
 *   무엇을 고쳐야 할지도 알 수 없습니다.
 *
 * 왜 구글인가
 *   - 공짜이고, 나중에 붙일 구글 광고(애드센스)와 한 계정에서 이어집니다.
 *   - 2026-08-22 에 Cloudflare 것을 먼저 대 보았으나, 우리 도메인이
 *     Cloudflare 를 거치지 않고(회색 구름) Netlify 로 곧장 가는 구조라
 *     Cloudflare 쪽에서 받아 주지 않았습니다.
 *
 * 열쇠(측정 ID) 넣는 법
 *   analytics.google.com → 관리(⚙) → 데이터 스트림 → 웹 스트림을 누르면
 *   'G-' 로 시작하는 글자가 있습니다. 그것을 아래 ID 에 그대로 넣습니다.
 *   비워 두면 아무 일도 하지 않습니다 (열쇠가 없어도 앱이 멀쩡하도록).
 *
 * 주의 — 이것은 쿠키를 씁니다.
 *   유럽·미국 방문자가 늘거나 광고를 붙일 때는 개인정보 안내와 동의 창이
 *   함께 있어야 합니다. 광고를 붙이는 날 같이 만듭니다.
 */
(function () {
  'use strict';

  var ID = 'G-S66W3J4EVX';              /* 2026-08-22 에 받은 measurement ID */

  if (!ID) return;

  /* 내 컴퓨터에서 시험할 때는 세지 않는다 — 방문자 수가 부풀어 판단이 흐려진다 */
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', ID);

  /* 화면이 다 뜬 뒤에 불러온다. 게임이 먼저 열리는 것이 언제나 우선이다. */
  function load() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }

  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load);
})();
