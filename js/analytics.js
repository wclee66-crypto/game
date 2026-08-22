/* 새록 — 방문자 세기 (Cloudflare Web Analytics)
 *
 * 왜 넣는가
 *   광고 수익은 방문자 수에서 나옵니다. 몇 사람이 어느 화면을 보았는지 모르면
 *   무엇을 고쳐야 할지도 알 수 없습니다.
 *
 * 왜 하필 Cloudflare 인가
 *   - 공짜이고, 쿠키를 심지 않습니다. 그래서 유럽·미국의 동의 창이 필요 없습니다.
 *   - 어르신 기기에서 무겁지 않습니다 (아주 작은 파일 하나).
 *
 * 열쇠(토큰) 넣는 법
 *   Cloudflare 로 들어가 → 왼쪽 Analytics & Logs → Web Analytics →
 *   Add a site 에 playsaerok.com 을 넣으면 <script ... token="..."> 이 나옵니다.
 *   그 token 안의 글자를 아래 TOKEN 에 그대로 붙여 넣으면 됩니다.
 *   비워 두면 아무 일도 하지 않습니다 (그래야 열쇠가 없어도 앱이 멀쩡합니다).
 */
(function () {
  'use strict';

  var TOKEN = '';                       /* ← 여기에 Cloudflare 열쇠를 넣습니다 */

  if (!TOKEN) return;

  /* 내 컴퓨터에서 시험할 때는 세지 않는다 — 방문자 수가 부풀어 판단이 흐려진다 */
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') return;

  /* 화면이 다 뜬 뒤에 불러온다. 게임이 먼저 열리는 것이 언제나 우선이다. */
  function load() {
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', '{"token":"' + TOKEN + '"}');
    document.head.appendChild(s);
  }

  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load);
})();
