---
version: alpha
name: "새록"
description: "어르신이 매일 혼자서도 편안하게 쓰는, 건강 기록처럼 차분한 두뇌 훈련 게임"
colors:
  background: "#FFFFFF"
  surface: "#F5F8F6"
  surfaceStrong: "#EDF2EF"
  text: "#0E1A14"
  textMuted: "#4F6459"
  line: "#E5EDE8"
  accent: "#0E9E62"
  accentDark: "#0A7B4C"
  accentSoft: "#E2F4EB"
  error: "#D6453F"
typography:
  body:
    fontFamily: "'Gothic A1', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif"
  number:
    fontFamily: "'Manrope', 'Gothic A1', sans-serif"
rounded:
  sm: "10px"
  DEFAULT: "16px"
  lg: "20px"
spacing:
  tabbar-height: "68px"
  touch-target-min: "3.1rem"
components:
  button: { emphasis: "accent, ghost, tool" }
  gameGrid: { rule: "large square targets; no shadows" }
  dialog: { owner: "js/ui.js" }
  toast: { owner: "js/ui.js" }
---

# 새록 디자인 기준

## Overview

### Creative North Star

흰 종이에 매일의 건강 상태를 또렷하게 적는 건강 기록지입니다. 장식보다 읽기 쉬운 글자, 넉넉한 여백, 초록 표시 하나로 다음 행동을 알려 줍니다.

### Product context and register

- **대상과 일:** 어르신과 곁에서 돕는 보호자가 매일 짧은 두뇌 훈련을 혼자서 끝내는 제품입니다.
- **언어:** 한국어·영어·일본어를 같은 화면 구조로 제공하며, 모든 문구는 번역 함수로 처리합니다.
- **사용 장면:** 휴대폰·태블릿에서 큰 글씨로 누르거나 A4 종이로 풉니다. 설정의 글씨 크기가 커져도 칸과 단추가 화면 밖으로 나가지 않아야 합니다.
- **성격:** 익숙함과 신뢰가 우선인 제품 화면입니다. 기억에 남는 요소는 오늘의 완료 표시와 초록색 정답 표시뿐입니다.
- **절제:** 그림자·화려한 배경·작은 아이콘만의 단추를 쓰지 않습니다.
- **기준의 주인:** 이 문서는 의도를 기록하며, 실제 색과 글꼴 값은 `css/style.css`의 `:root` 변수가 기준입니다.

## Colors

흰 바탕과 연한 녹색 면, 가는 선으로 구역을 나눕니다. `accent` 초록은 시작·정답·완료처럼 좋은 다음 행동에만 쓰며, 빨강은 틀린 칸을 잠깐 알릴 때만 씁니다. 점수나 뜻을 색만으로 전달하지 않습니다.

## Typography

본문은 Gothic A1 계열로 17px부터 시작하고, 숫자판은 Manrope를 씁니다. 한국어·영어·일본어가 섞여도 줄이 자연스럽게 바뀌어야 하며, 일본어에 기울임 글씨나 영어식 대문자 규칙을 강요하지 않습니다. 숫자는 충분히 크고 굵게 표시합니다.

## Layout

한 화면에는 한 가지 일만 둡니다. 하단 탭은 항상 세 개이고, 게임에서는 문제·다음 행동·그만두기만 보입니다. 정사각형 게임 칸은 열 수에 따라 크기를 줄이되, 가로 스크롤을 만들지 않습니다.

## Elevation & Depth

정적인 카드와 게임판에는 그림자를 쓰지 않습니다. 구분은 바탕 면·얇은 선·여백으로 하고, 모달만 화면 위에 떠 보이게 합니다.

## Shapes

게임 칸은 약간 둥근 모서리, 일반 카드와 단추는 16px, 큰 영역은 20px을 씁니다. 누를 수 있는 영역은 충분히 크고, 눌렀을 때 옅은 초록으로 반응합니다.

## Components

공통 모달·토스트·확인 창은 `js/ui.js`를 사용합니다. 게임별 화면은 시작, 이어서 하기, 진행, 완성, 그만두기의 흐름과 같은 이름의 단추를 유지합니다. 정답은 초록, 오답은 잠깐 빨강으로 보이되 점수는 깎지 않습니다.

## Do's and Don'ts

- **Do:** 큰 글씨와 큰 누름 영역을 우선합니다.
- **Do:** 세 언어에서 문장이 길어져도 자연스럽게 줄바꿈되게 둡니다.
- **Don't:** 게임을 푸는 중간에 광고·복잡한 안내·작은 선택지를 넣지 않습니다.
- **Don't:** 새 화면마다 독자적인 색이나 그림자 규칙을 만들지 않습니다.
