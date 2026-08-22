/* 새록 — 건의하기
 *
 * 서버를 두지 않습니다. 건의 받아 주는 곳(Web3Forms)으로 바로 보내고,
 * 그쪽이 어르신 메일함으로 옮겨 줍니다.
 *
 * 2026-08-22 에 Netlify Forms 에서 이리로 옮겼습니다.
 * 넷리파이가 배포를 막아 Cloudflare Pages 로 홈페이지를 옮겼는데,
 * 그쪽에는 건의 받는 기능이 없기 때문입니다.
 * 이제 어디로 옮기든 이 기능은 따라옵니다 — 호스팅에 매이지 않습니다.
 *
 * 로그인이 없습니다. 어르신에게 이메일 코드를 받아 적게 하는 것은 벽이 너무 높아서,
 * 글 한 칸과 보내기 단추만 둡니다. 이메일은 답이 필요할 때만 적으시면 됩니다.
 *
 * ─────────────────────────────────────────────
 *  열쇠(access key) 넣는 법
 *    1. web3forms.com 에 들어갑니다
 *    2. 건의를 받을 메일 주소를 넣고 'Create Access Key' 를 누릅니다
 *    3. 그 메일함으로 온 글자(access key)를 아래 KEY 에 그대로 붙여 넣습니다
 *  비워 두면 홈과 설정에서 '건의하기' 단추 자체가 나오지 않습니다.
 *  (눌러도 안 되는 단추를 보여 드리지 않기 위해서입니다)
 * ─────────────────────────────────────────────
 */
window.Suggest = (function () {

  var KEY = 'ea330e8a-71e9-4122-9b9c-b8784bc84374';   /* 2026-08-22 에 받은 Web3Forms 열쇠 */
  var URL = 'https://api.web3forms.com/submit';

  var MAX = 2000;                                  /* 너무 긴 글은 잘라 보낸다 */

  /** 건의하기를 쓸 수 있는 상태인가 — 열쇠가 없으면 단추를 아예 감춘다 */
  function ready() { return !!KEY; }

  /** 보내기 — 성공하면 true */
  function send(data) {
    data.access_key = KEY;
    return fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().then(function (j) { return !!(res.ok && j && j.success); });
    });
  }

  function open() {
    if (!ready()) return;
    var wrap = UI.h('<div></div>');

    wrap.innerHTML =
      '<p class="modal__msg">' +
        T('새록에 넣었으면 하는 게임이나, 고쳤으면 하는 곳을 적어 주세요.') +
      '</p>' +
      '<label class="sg-field">' +
        '<span class="sg-lbl">' + T('하고 싶은 말') + '</span>' +
        '<textarea class="sg-text" id="sgText" maxlength="' + MAX + '"></textarea>' +
      '</label>' +
      '<label class="sg-field">' +
        '<span class="sg-lbl">' + T('이메일') + ' <em>' + T('(답을 받고 싶으실 때만)') + '</em></span>' +
        '<input class="sg-mail" id="sgMail" type="email" autocomplete="email" inputmode="email">' +
      '</label>' +
      /* 사람 눈에는 안 보이는 칸 — 기계가 채우면 걸러 낸다 */
      '<input type="checkbox" id="sgBot" name="botcheck" tabindex="-1" hidden>' +
      '<p class="sg-bad" id="sgBad" hidden></p>' +
      '<p class="sg-note">' +
        T('적어 주신 이메일은 답장에만 씁니다. 다른 곳에 쓰거나 남에게 넘기지 않습니다.') +
      '</p>';

    var m = UI.modal({
      title: T('건의하기'),
      body: wrap,
      actions: [
        { label: T('취소') },
        { label: T('보내기'), kind: 'accent', keepOpen: true, onClick: function () { submit(m, wrap); } }
      ]
    });

    setTimeout(function () { var t = wrap.querySelector('#sgText'); if (t) t.focus(); }, 60);
  }

  function warn(wrap, msg) {
    var b = wrap.querySelector('#sgBad');
    b.textContent = msg;
    b.hidden = false;
  }

  function submit(m, wrap) {
    var text = (wrap.querySelector('#sgText').value || '').trim();
    var mail = (wrap.querySelector('#sgMail').value || '').trim();

    if (text.length < 5) {
      warn(wrap, T('하고 싶은 말을 조금만 더 적어 주세요.'));
      wrap.querySelector('#sgText').focus();
      return;
    }
    if (mail && mail.indexOf('@') < 0) {
      warn(wrap, T('이메일 주소를 다시 봐 주세요.'));
      wrap.querySelector('#sgMail').focus();
      return;
    }
    wrap.querySelector('#sgBad').hidden = true;

    /* 보내는 동안 두 번 눌리지 않게 */
    var btn = m.card.querySelectorAll('.modal__actions button')[1];
    var was = btn.textContent;
    btn.disabled = true;
    btn.textContent = T('보내는 중…');

    send({
      subject: '새록 건의 (' + I18N.get() + ')',    /* 메일 제목 — 메일함에서 한눈에 찾으시라고 */
      from_name: '새록',
      botcheck: wrap.querySelector('#sgBot').checked,
      message: text.slice(0, MAX),
      email: mail,
      lang: I18N.get(),
      version: (window.App && App.version) ? App.version() : ''
    }).then(function (ok) {
      if (!ok) throw new Error('bad');
      m.close();
      UI.modal({
        title: T('보냈습니다'),
        body: '<p class="modal__msg">' + T('읽어 보고 반영하겠습니다. 고맙습니다.') + '</p>',
        actions: [{ label: T('닫기'), kind: 'accent' }]
      });
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = was;
      warn(wrap, T('지금은 보낼 수 없습니다. 인터넷 연결을 확인하고 잠시 뒤 다시 눌러 주세요.'));
    });
  }

  return { open: open, ready: ready };
})();
