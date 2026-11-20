/* 같은 진행 방식으로 다섯 가지 시각 기억 놀이를 제공한다. 다시 볼 때도 같은 문제를 쓴다. */
(function () {
  var pictures = Array.from('🍎🐢🚗🌻🐰🍌🏠🐟🎁🍇');
  var pictureNames = ['사과','거북이','자동차','해바라기','토끼','바나나','집','물고기','선물','포도'];
  var lights = ['●','▲','★','■'];
  var names = ['첫걸음','가볍게','쉬움','보통','어려움'];
  function shuffle(items) {
    var a = items.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function create(id, title, question) {
    var root, state, timer;
    function save() { Store.saveSession(id, state); }
    function button(label, action) {
      var b = document.createElement('button'); b.className = 'btn btn--ghost';
      b.textContent = label; b.onclick = action; root.appendChild(b); return b;
    }
    function line(value) {
      var p = document.createElement('p'); p.textContent = value; root.appendChild(p); return p;
    }
    function start(level, round) {
      var n = level + 2, all = shuffle(pictures), shown = all.slice(0,n);
      var at = Math.floor(Math.random()*n), choices = shuffle(shown).slice(0, Math.min(n,4));
      var answer = shown[at], after = shown.slice(), prompt = T(question);
      if (id === 'changedpic') { answer = all[n]; after[at] = answer; }
      if (id === 'picplace') {
        prompt = T('{pic} 그림은 몇 번 자리에 있었나요?', {pic:answer});
        answer = String(at+1); choices = shown.map(function (_,i) { return String(i+1); });
        shown = shown.map(function (pic,i) { return (i+1)+' · '+pic; }); after = [];
      }
      var steps = [];
      if (id === 'lightorder') {
        shown = lights.slice(0,Math.min(n,4)); choices = shown.slice();
        for (var i=0;i<n;i++) steps.push(shuffle(shown)[0]);
        answer = steps[at]; prompt = T('{n}번째 불빛은 어느 모양인가요?',{n:at+1}); after=[];
      }
      if (id === 'cupball') {
        shown = ['🥤','🥤','🥤','🥤'].slice(0,[2,2,3,3,4][level]);
        at = Math.floor(Math.random()*shown.length);
        var pos=at;
        for (var k=0;k<3;k++) {
          var other=shuffle(shown.map(function(_,i){return i;}).filter(function(i){return i!==pos;}))[0];
          steps.push([pos,other]); pos=other;
        }
        answer=String(pos+1); choices=shown.map(function(_,i){return String(i+1);}); after=[];
      }
      if (choices.indexOf(answer)<0) choices[0]=answer;
      state={day:Store.dayKey(),level:level,round:round,shown:shown,after:after,answer:answer,
        choices:shuffle(choices),prompt:prompt,steps:steps,at:at,phase:'study'};
      save(); study();
    }
    function cupLevels() {
      if(id!=='cupball') return;
      var nav=document.createElement('div');
      nav.className='vm-levels';
      function step(label,delta){
        var b=button(T(label),function(){start(state.level+delta,1);});
        b.disabled=state.level+delta<0 || state.level+delta>=names.length;
        nav.appendChild(b);
      }
      step('이전 단계',-1);
      var current=document.createElement('strong');
      current.textContent=T('{n}단계',{n:state.level+1})+' · '+T(names[state.level]);
      nav.appendChild(current);
      step('다음 단계',1);
      root.appendChild(nav);
    }
    function pictureGrid(items,onPick){
      var grid=document.createElement('div'); grid.className='vm-picture-grid';
      items.forEach(function(pic){
        var card=document.createElement(onPick?'button':'div');card.className='vm-picture-card';
        var art=document.createElement('span');art.textContent=pic;art.setAttribute('aria-hidden','true');
        var name=document.createElement('strong');name.textContent=T(pictureNames[pictures.indexOf(pic)]);
        card.appendChild(art);card.appendChild(name);
        if(onPick)card.onclick=function(){onPick(pic);};
        grid.appendChild(card);
      });
      root.appendChild(grid);return grid;
    }
    function board(answering) {
      root.innerHTML='';
      line(id==='changedpic'?T(answering?'바뀐 그림을 눌러 주세요.':'그림을 천천히 기억해 주세요.'):T(title));
      line(T('{n} / 5',{n:state.round}));
      if(id==='changedpic') return answering?null:pictureGrid(state.shown);
      cupLevels();
      var row=document.createElement('div'); row.className='vm-board'+(id==='cupball'?' vm-cups':''); root.appendChild(row);
      state.shown.forEach(function(x,i){var tile=document.createElement('span'); tile.textContent=x;
        if(id==='cupball'){
          tile.innerHTML='<i class="vm-cup-shell" aria-hidden="true"><i class="vm-cup-wall"></i></i>';
          if(i===state.at){var ball=document.createElement('i');ball.className='vm-ball';tile.appendChild(ball);}
        }
        row.appendChild(tile);});return row;
    }
    function study() {
      clearTimeout(timer); var row=board();
      var startButton=button(id==='cupball'||id==='lightorder'?T('시작'):T('기억했어요'),function(){
        this.remove();
        if (!state.steps.length) { ask(); return; }
        var tiles=Array.from(row.children), order=tiles.slice(), step=0;
        if(id==='cupball') row.classList.add('vm-covered');
        function move(){
          tiles.forEach(function(t){t.classList.remove('vm-lit');});
          if(step===state.steps.length){ask(id==='cupball'?order:null);return;}
          var pair=state.steps[step++];
          if(id==='cupball'){
            var a=order[pair[0]], b=order[pair[1]];
            var duration=[2400,2100,1800,1500,1300][state.level];
            function slide(tile,from,to){
              var offset=tiles.indexOf(tile);
              var frames=[0,.25,.5,.75,1].map(function(f){
                var x=(from+(to-from)*f-offset)*100;
                var y=Math.sin(Math.PI*f)*(from<to?-2.3:2.3);
                return {transform:'translate('+x+'%, '+y+'rem)'};
              });
              tile.style.transform=frames[4].transform;
              tile.animate(frames,{duration:duration,easing:'ease-in-out'});
            }
            slide(a,pair[0],pair[1]);slide(b,pair[1],pair[0]);
            order[pair[0]]=b;order[pair[1]]=a;
            timer=setTimeout(move,duration+650);return;
          } else tiles[state.shown.indexOf(pair)].classList.add('vm-lit');
          timer=setTimeout(function(){tiles.forEach(function(t){t.classList.remove('vm-lit');});timer=setTimeout(move,300);},1450-state.level*120);
        }
        timer=setTimeout(move,650);
      });
      if(id==='cupball'||id==='changedpic'){
        startButton.className='btn vm-start';
        var actions=document.createElement('div'); actions.className='vm-study-actions';
        root.appendChild(actions); actions.appendChild(startButton);
        startButton.addEventListener('click',function(){actions.remove();},{once:true});
      }
    }
    function ask(order){
      var restoreSolved=state.phase==='solved';
      if(!restoreSolved){state.phase='ask';save();}
      if(id==='cupball'){
        if(!order){
          var row=board(); row.classList.add('vm-covered');
          order=Array.from(row.children);
          var ball=row.querySelector('.vm-ball');
          if(ball) order[Number(state.answer)-1].appendChild(ball);
        }
        line(T('공이 숨은 컵을 눌러 주세요.'));
      }else if(id==='changedpic'){board(true);pictureGrid(state.after,choose);}
      else{root.innerHTML='';line(state.prompt);}
      var feedback=line(''); feedback.setAttribute('role','status');feedback.className='vm-feedback';
      var solved=false;
      function choose(x){
        if(solved)return;
        solved=x===state.answer;
        feedback.dataset.correct=String(solved);
        feedback.textContent=solved?T('정답입니다!'):T('틀렸습니다. 다시 골라 보세요.');
        if(solved){
          state.phase='solved';save();
          if(order) order[Number(state.answer)-1].classList.add('vm-lifted');
          root.querySelectorAll('.vm-picture-card, .vm-cup-hit, .vm-answer').forEach(function(b){b.disabled=true;});
          replay.remove();
          button(state.round<5?T('다음 문제'):T('결과 보기'),advance).className='btn vm-start';
        }
        feedback.scrollIntoView({block:'nearest'});
      }
      function advance(){
        if(state.round<5){start(state.level,state.round+1);return;}
        var score=1000+([0,0,0,100,250][state.level]);
        Store.addRecord({game:id,score:score,difficulty:T(names[state.level]),detail:{rounds:5}});
        Store.clearSession(id);root.innerHTML='';line(T('다섯 문제를 마치셨습니다.'));line(T('{n}점',{n:score}));
        cupLevels();button(T('한 판 더'),intro);
      }
      if(order){
        order.forEach(function(tile,i){
          var hit=document.createElement('button');hit.className='vm-cup-hit';
          hit.setAttribute('aria-label',T('왼쪽에서 {n}번째 컵',{n:i+1}));
          hit.onclick=function(){
            tile.classList.add('vm-lifted');hit.disabled=true;
            choose(String(i+1));
          };tile.appendChild(hit);
        });
      }else if(id!=='changedpic') state.choices.forEach(function(x){button(x,function(){choose(x);}).classList.add('vm-answer');});
      var replay=button(T('다시 보기'),study);
      if(restoreSolved) choose(state.answer);
    }
    function intro(){root.innerHTML='';line(T(question));names.forEach(function(name,i){
      button(T('{n}단계',{n:i+1})+' · '+T(name),function(){start(i,1);});});}
    window.Games[id]={id:id,name:T(title),tagline:T(question),rules:{title:T(title),lines:[[T('하는 법'),T(question)]]},
      hasProgress:function(){return !!Store.getSession(id);},mount:function(el){el.innerHTML='';root=document.createElement('section');root.className='vm-game';el.appendChild(root);state=Store.getSession(id);
        if(!state)intro();else if(state.phase==='ask'||state.phase==='solved')ask();else study();},unmount:function(){clearTimeout(timer);}};
  }
  create('changedpic','바뀐 그림 찾기','새로 나타난 그림을 골라 주세요.');
  create('cupball','컵 속 공 찾기','공이 숨은 컵을 눌러 주세요.');
})();
