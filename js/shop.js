/* 새록 — 어르신께 도움이 되는 물건 (쿠팡 파트너스)
 *
 * 2026-11-13 에 사용자가 쿠팡 파트너스에 가입해, 시니어용 마우스를 홈에 소개하기로 했다.
 * 구글 광고와 달리 그냥 링크 하나라서 쿠키도, 동의 창도 필요 없다.
 *
 * 지키는 것 (CLAUDE.md '광고가 들어갈 자리')
 *   - 홈 맨 아래에만 둔다. 게임을 푸는 도중에는 절대 나오지 않는다.
 *   - 인쇄 문제지에는 나오지 않는다 (css 의 @media print 에서 감춘다).
 *   - 한국어 화면에서만 보인다. 쿠팡은 한국에서만 배송된다.
 *   - 두 입구 모두 나오되, 두뇌 게임(play) 입구에서는 '어르신' 을 뺀 문구(playTitle·playSub)를 쓴다.
 *   - 휴대폰에서도 보인다 — 사용자가 정함 ("시니어용은 다 필요함").
 *   - 「쿠팡 파트너스 활동의 일환으로 …」 문구는 법(공정위 추천·보증 심사지침)이 정한 것이라
 *     반드시 링크 곁에 둔다. 빠뜨리면 파트너스 계정이 정지될 수 있다.
 *
 * ─────────────────────────────────────────────
 *  상품 넣는 법
 *    쿠팡 파트너스 → 링크 생성 → 상품 고르기 → 「단축 URL」 을 아래 ITEMS 의 link 에 붙여 넣는다.
 *    img 는 (있으면) 상품 사진 주소. 비워 두면 우리가 그린 마우스 그림이 나온다.
 *  link 가 비어 있으면 카드 자체가 나오지 않는다 (눌러도 안 되는 카드를 보이지 않으려고).
 * ─────────────────────────────────────────────
 */
window.Shop = (function () {

  var ITEMS = [
    {
      /* 2026-11-13 사용자가 고름 — 코시 유선 버티컬 마우스 M4077 */
      link: 'https://link.coupang.com/a/iDGlEFauxU',
      img: 'https://t1c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2023/03/03/11/3/1740bd4a-6332-461f-b90f-c5318ad43434.jpg',
      title: '손목이 편한 세로 마우스',
      sub: '어르신들은 손가락 힘이 약해 마우스를 쓰기가 힘들고 금방 피곤해지십니다. 이 마우스는 악수하듯 손을 세워 쥐어, 힘을 덜 들이고도 편하게 쓰실 수 있습니다.',
      /* 두뇌 게임(play) 입구에서는 '어르신' 을 빼고 누구나 쓰는 물건으로 소개한다 (사용자가 정함) */
      playSub: '마우스를 오래 쓰면 손목과 손가락이 금방 피곤해집니다. 이 마우스는 악수하듯 손을 세워 쥐어, 힘을 덜 들이고도 편하게 쓸 수 있습니다.'
    }
  ];

  /* 우리가 그린 마우스 — 상품 사진이 없을 때 쓴다 */
  var MOUSE =
    '<svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="12" y="6" width="24" height="36" rx="12"></rect>' +
      '<path d="M24 6v12"></path>' +
      '<path d="M12 18h24"></path>' +
      '<rect x="22.3" y="10" width="3.4" height="5.5" rx="1.7" fill="currentColor" stroke="none"></rect>' +
    '</svg>';

  function lang() { return window.I18N ? I18N.get() : 'ko'; }

  function list() { return ITEMS.filter(function (it) { return !!it.link; }); }

  /** 보여 드릴 상품이 있는가 — 한국어일 때만 */
  function ready() { return lang() === 'ko' && list().length > 0; }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /** 홈 맨 아래에 붙일 카드 */
  function card(mode) {
    if (!ready()) return '';
    var play = mode === 'play';
    var head = play ? T('생활에 도움이 되는 물건') : T('어르신께 도움이 되는 물건');
    return '<section class="shop" aria-label="' + esc(head) + '">' +
      '<h2 class="sec">' + head + '</h2>' +
      list().map(function (it) {
        var title = (play && it.playTitle) || it.title;
        var sub = (play && it.playSub) || it.sub;
        return '<a class="shopcard" href="' + esc(it.link) + '" target="_blank" rel="sponsored noopener">' +
          '<span class="shopcard__pic">' +
            (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" onerror="this.parentNode.innerHTML=Shop.mouse">' : MOUSE) +
          '</span>' +
          '<span class="shopcard__txt">' +
            '<span class="shopcard__name">' + T(title) + '</span>' +
            '<span class="shopcard__sub">' + T(sub) + '</span>' +
            '<span class="shopcard__go">' + T('쿠팡에서 보기') + ' ›</span>' +
          '</span>' +
        '</a>';
      }).join('') +
      '<p class="shop__note">' + T('이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.') + '</p>' +
    '</section>';
  }

  return { ready: ready, card: card, mouse: MOUSE };
})();
