(function () {
  var paths = {
    article: '<path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1zm0 0v14M6 9h3m6 0h3M6 13h3m6 0h3"/>'
  };
  var videos = [
    ['전문의 인터뷰', '정희원 교수와 함께 알아보는 치매 예방과 돌봄', 'KBS 성공예감 · 정희원 교수 (방송 당시 서울아산병원 노년내과)', 'qqwBsSTCktI', '39:56', '정희원 교수가 뇌 건강을 위한 생활 습관과 가족 돌봄에 대해 이야기합니다.'],
    ['전문의 강연', '기억력 장애와 치매의 진단과 치료', '서울아산병원 · 신경과 임재성 교수', 'WYRtcJNXHQg', '38:16', '임재성 교수가 기억력 저하와 치매의 진단 및 치료를 설명합니다.'],
    ['전문의 해설', '뇌가 보내는 중요한 신호, 경도인지장애', '서울아산병원 백세수업', 'C43Hb4n_GDo', '4:40', '같은 말을 반복하거나 약속을 자주 헷갈릴 때 살펴볼 변화를 설명합니다.'],
    ['따라 하는 운동', '치매예방운동법', '중앙치매센터 · 보건복지부', 'f2G9HM59FJM', '22:18', '뇌신경체조와 치매예방체조 동작을 보여 줍니다.'],
    ['인지 활동', '두뇌활성화 퀴즈', '새록퀴즈', 'M33SKsNirCs', '15:32', '50가지 기억력 문제를 영상에 맞춰 풀어봅니다.'],
    ['따라 하는 운동', '앉아서 하는 뇌신경체조', '경상북도광역치매센터', 'f6dotnz5H04', '4:26', '의자에 앉아 얼굴과 손을 움직이는 짧은 체조입니다.'],
    ['인지 활동', '집에서 해보는 기억력 훈련', '강서구치매안심센터', 'm-QA62CKcb0', '4:00', '정보를 묶어 기억하는 법과 단서로 떠올리는 법을 소개합니다.'],
    ['따라 하는 운동', '손동작 따라 하기: 치매 예방 손유희', '동대문구치매안심센터', 'drTZ2PMCPTQ', '6:45', '어르신과 가족이 함께 따라 할 수 있는 손동작 활동입니다.'],
    ['따라 하는 운동', '노래에 맞춰 하는 치매예방운동', '대구광역치매센터', 'npaTjimlF00', '7:13', '음악에 맞춰 몸을 움직이는 체조입니다.'],
    ['따라 하는 운동', '치매예방운동법: 안전하게 따라 하기', '중앙치매센터', 'kCoGsIXUD7o', '14:52', '걷기가 불편한 분을 고려한 운동입니다.'],
    ['따라 하는 운동', '치매예방운동법: 쉽게 따라 하기', '중앙치매센터', 'b9EzQuJTEoU', '24:30', '복잡한 동작이 부담스러운 분을 위한 운동입니다.'],
    ['전문의 해설', '치매와 건망증, 어떻게 다를까요?', '세브란스', '3uNBwHLKrJ4', '3:32', '일상 사례로 치매와 건망증의 차이를 설명합니다.'],
    ['전문의 해설', '치매 초기 증상 5가지', '용인세브란스병원', 'NdYD8EWdduE', '5:30', '본인이나 가족이 알아차릴 수 있는 초기 변화를 소개합니다.'],
    ['검진과 치료', '치매 조기 발견법 및 치료법', '분당서울대학교병원', 'b7XPVKtYYgI', '11:07', '치매를 일찍 발견하는 이유와 진료에서 다루는 내용을 소개합니다.'],
    ['예방과 생활', '치매 위험을 낮추는 생활습관 3가지', '세브란스', 'x7dJaHn8xF0', '3:55', '사회적 교류와 두뇌를 쓰는 활동을 일상에 넣는 방법을 소개합니다.'],
    ['전문의 강연', '치매 예방을 위한 식사와 생활습관', '분당서울대학교병원', 'L4kIuM31OCE', '1:01:47', '식사와 생활습관을 자세히 살펴보는 신경과 전문의 강좌입니다.'],
    ['검진 안내', '치매안심센터, 이럴 때 찾아가세요', 'KBS LIFE', '2Kd5D5dWihk', '9:23', '치매안심센터가 어떤 도움을 주는 곳인지 소개합니다.'],
    ['가족과 돌봄', '치매 가족 교육: 마음 읽어주기, 망상 편', '중앙치매센터', 'Jt_CI6ciMaM', '7:19', '치매가 있는 가족이 망상으로 불안해할 때 보호자가 어떻게 대응할지 보여줍니다.']
  ];
  var articles = [
    ['전문의 칼럼', '뇌가 보내는 중요한 신호, 경도인지장애', '건망증과 경도인지장애의 차이, 검사와 관리 방법을 설명합니다.', '서울아산병원 · 신경과 임재성 교수', 'https://news.amc.seoul.kr/news/con/detail.do?cntId=12420'],
    ['병원 건강정보', '경도인지장애의 증상과 검사', '어떤 증상이 나타나는지, 병원에서 어떻게 평가하는지 소개합니다.', '서울대학교병원', 'https://www.snuh.org/health/nMedInfo/nView.do?category=DIS&medid=AA000095'],
    ['검진 안내', '치매안심센터의 조기검진 절차', '선별검사부터 진단검사까지의 순서와 지역별 문의처를 확인할 수 있습니다.', '인천 연수구보건소 치매안심센터', 'https://www.yeonsu.go.kr/clinic/health/dementia/checkup.asp'],
    ['예방과 생활', '인지기능 저하 예방법', '운동과 건강 관리 등 인지 건강과 관련된 생활 요인을 알아봅니다.', '질병관리청 국가건강정보포털', 'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=6723'],
    ['가족과 돌봄', '치매와 함께 살아가기', '치매의 증상과 치료, 일상에서 이용할 수 있는 지원을 소개합니다.', '국립정신건강센터 국가정신건강정보포털', 'https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=22'],
    ['활동지 안내', '두뇌건강놀이책 1~3단계', '그림 찾기와 일상 속 계산을 담은 단계별 활동지 세 권을 소개합니다.', '강원특별자치도광역치매센터 제작 · 수원시장기요양지원센터 게시', 'https://www.suwonudc.co.kr/swjjc/base/board/read?boardManagementNo=38&boardNo=1998&menuLevel=3&menuNo=18'],
    ['활동지 안내', '두근두근 뇌운동 제1권', '신문 제목 외우기, 날짜 계산, 초성 이어가기 등을 담은 활동 자료입니다.', '중앙치매센터', 'https://ansim.nid.or.kr/community/pds_view.aspx?bid=120'],
    ['인지 활동', '두근두근 뇌운동: 강세 바꿔 읽기', '문장에서 힘주어 읽는 부분을 바꾸는 활동입니다. 첨부파일을 보려면 로그인이 필요합니다.', '중앙치매센터', 'https://www.nid.or.kr/info/dataroom_view.aspx?bid=113'],
    ['활동지 안내', '인지훈련도구 자료집', '종이 활동, 만들기, 회상 활동과 보호자 안내를 모았습니다. 공단 자료의 상업적 이용은 금지돼 있습니다.', '국민건강보험공단 노인장기요양보험', 'https://www.longtermcare.or.kr/npbs/contents/np/e/a/pop2/popup_dementiatool.jsp'],
    ['운동 자료', '치매예방운동법 접이식 수첩', '기억 상태와 걷기 능력에 맞는 운동을 고르는 안내 자료입니다.', '중앙치매센터', 'https://ansim.nid.or.kr/community/pds_view.aspx?bid=141'],
    ['예방과 생활', '치매예방수칙 3·3·3', '즐길 것, 피할 것, 챙길 것을 각각 세 가지로 정리한 생활수칙입니다.', '중앙치매센터', 'https://www.nid.or.kr/notification/prevention.aspx'],
    ['예방과 생활', '일상에서 실천하는 뇌 건강 습관', '손글씨로 일기 쓰기와 색칠하기처럼 바로 시작할 수 있는 활동을 소개합니다.', '보건복지부 공식 네이버 블로그', 'https://blog.naver.com/mohw2016/223905830567'],
    ['건강정보', '경도인지장애 바로 알기', '경도인지장애가 낯선 분과 가족을 위한 입문 글입니다.', '국립중앙의료원 공식 네이버 블로그', 'https://blog.naver.com/nmc_official/224361661937'],
    ['건강정보', '경도인지장애: 증상·진단·관리', '진단과 관리 방법, 인지훈련 등 비약물 접근의 근거와 한계를 설명합니다.', '국가정신건강정보포털', 'https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=23'],
    ['검진 안내', '치매 조기검진사업 안내', '선별검사, 진단검사, 감별검사가 어떤 순서로 진행되는지 알려줍니다.', '보건복지부', 'https://www.mohw.go.kr/menu.es?mid=a10712010100'],
    ['기관 찾기', '가까운 치매안심센터·치매 관련 시설 찾기', '지역별 상담·검진 기관을 찾는 공식 검색 페이지입니다.', '중앙치매센터', 'https://www.nid.or.kr/info/facility_new2.aspx'],
    ['가족과 돌봄', '치매환자의 가족을 위한 정보', '치매 진단 이후 돌봄 정보를 찾아볼 수 있는 보호자용 안내입니다.', '질병관리청 국가건강정보포털', 'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=6858'],
    ['상담 안내', '치매상담콜센터 1899-9988', '치매와 가족 돌봄을 상담할 수 있습니다. 운영 시간은 안내 페이지에서 확인하실 수 있습니다.', '중앙치매센터', 'https://www.nid.or.kr/support/callcenter.aspx']
  ];
  var home = '/?mode=care#home';
  function route(kind) { return '?kind=' + kind; }
  function icon(kind) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[kind] + '</svg>';
  }
  var catalog = document.getElementById('health-catalog');
  if (catalog) {
    var video = new URLSearchParams(location.search).get('kind') !== 'article';
    var title = video ? '인지 건강 영상' : '인지 건강 글';
    document.title = title + ' · 새록';
    catalog.innerHTML = '<nav class="health-nav" aria-label="자료 화면 이동"><a href="' + home +
      '">← 인지 훈련 홈</a><a href="' + route(video ? 'article' : 'video') + '">' +
      (video ? '관련 글 읽기' : '관련 영상 보기') + '</a></nav><h1>' + title +
      '</h1><p class="health-sample">' + (video ? '영상을 누르면 유튜브가 새 탭에서 열립니다.' : '글을 누르면 제공 기관의 원문이 새 탭에서 열립니다.') + '</p>' +
      '<ul class="' + (video ? 'health-videos' : 'health-articles') + '">' + (video ? videos : articles).map(function (item) {
        if (video) {
          return '<li class="health-video"><a class="health-resource" target="_blank" rel="noopener noreferrer" ' +
            'href="https://www.youtube.com/watch?v=' + item[3] + '">' +
            '<div class="health-cover" style="background-image:url(https://i.ytimg.com/vi/' + item[3] + '/hqdefault.jpg)">' +
            '<span class="health-youtube" aria-hidden="true"></span>' +
            (item[4] ? '<span class="health-duration" aria-label="재생 시간 ' + item[4] + '">' + item[4] + '</span>' : '') + '</div>' +
            '<div class="health-video-copy"><span class="health-topic">' + item[0] + '</span><h2>' + item[1] +
            '</h2><p>' + item[2] + '</p>' + (item[5] ? '<p>' + item[5] + '</p>' : '') +
            '<span class="health-action">유튜브에서 보기 ↗</span></div></a></li>';
        }
        return '<li class="health-article"><a class="health-resource" target="_blank" rel="noopener noreferrer" href="' +
          item[4].replace(/&/g, '&amp;') + '"><span class="health-icon">' + icon('article') +
          '</span><div><span class="health-topic">' + item[0] + '</span><h2>' + item[1] +
          '</h2><p>' + item[2] + '</p><small>' + item[3] +
          '</small><span class="health-action">원문 읽기 ↗</span></div></a></li>';
      }).join('') + '</ul>';
  }
})();
