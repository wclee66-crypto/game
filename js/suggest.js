/* 새록 — 건의하기
 *
 * 서버를 두지 않습니다. 배포한 곳(Netlify)에 딸린 '받는 곳'으로 바로 보냅니다.
 * index.html 의 숨은 <form name="suggest"> 를 호스팅이 읽어 만들어 둔 자리입니다.
 *
 * 로그인이 없습니다. 어르신에게 이메일 코드를 받아 적게 하는 것은 벽이 너무 높아서,
 * 글 한 칸과 보내기 단추만 둡니다. 이메일은 답이 필요할 때만 적으시면 됩니다.
 */
window.Suggest = (function () {

  var MAX = 2000;                                  /* 너무 긴 글은 잘라 보낸다 */

  function enc(o) {
    var out = [];
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      out.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k]));
    }
    return out.join('&');
  }

  /** 보내기 — 성공하면 true */
  function send(data) {
    return fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: enc(data)
    }).then(function (res) { return !!(res && res.ok); });
  }

  function open() {
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
      'form-name': 'suggest',
      'bot-field': '',
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

  return { open: open };
})();
