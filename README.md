## 🏆 스포츠 경기 대진표 생성기
---
웹 기반의 스포츠 경기 대진표 생성 및 관리 애플리케이션입니다.

토너먼트 및 라운드 로빈 방식의 대회를 손쉽게 생성하고, 실시간으로 경기 결과를 업데이트하며, 최종 우승자를 시각적으로 강조할 수 있습니다. 모든 데이터는 Firebase를 사용하여 사용자별로 안전하게 저장 및 동기화됩니다.
---
## ✨ 주요 기능 (Features)

### Tournament Management
대회 관리 시스템: 여러 개의 대회를 생성하고 목록에서 선택하여 관리할 수 있습니다.

고유 설정: 각 대회는 고유한 이름과 경기 방식, 기간 등의 설정을 가집니다.

영구 저장: 생성된 모든 대회는 사용자 계정에 귀속되어 영구적으로 저장됩니다.

### Game Formats
토너먼트 (Tournament) : 참가팀 수에 맞춰 부전승을 최소화하는 지능적인 대진을 자동으로 생성합니다.

라운드 로빈 (Round Robin) == : 모든 팀이 한 번씩 맞붙는 리그 순위표를 생성하고, 결과에 따라 순위를 실시간으로 업데이트합니다.

### Real-time Updates & Automation
실시간 결과 업데이트: 경기 점수를 입력하면 승패가 즉시 반영되며, 토너먼트의 경우 승자가 다음 라운드로 자동 진출합니다.

자동 순위 계산: 라운드 로빈의 경우 승점, 득실차, 순위가 실시간으로 계산됩니다.

자동 저장: 모든 변경 사항은 Firebase Firestore에 즉시 저장되어 데이터 유실 걱정이 없습니다.

### User-Friendly Interface
우승자 축하: 최종 우승자가 결정되면 화려한 챔피언 배너와 축하 효과가 나타납니다.

날짜별 필터링: 특정 날짜를 선택하여 해당일의 경기만 모아서 볼 수 있습니다.

이미지로 저장: 현재 대진표 및 순위표 화면을 PNG 이미지 파일로 다운로드하여 공유하거나 보관할 수 있습니다.

대회 삭제: 더 이상 필요 없는 대회는 목록에서 안전하게 삭제할 수 있습니다.

## 🛠️ 기술 스택 (Tech Stack)
Frontend: HTML, CSS, JavaScript

Styling: Tailwind CSS

Backend (BaaS): Google Firebase

Authentication: 익명 로그인을 통해 사용자별 데이터 저장 공간을 구분합니다.

Firestore: NoSQL 데이터베이스로 모든 대회 정보를 실시간으로 저장하고 동기화합니다.

Library:

html2canvas.js: 웹 화면을 이미지로 캡처하는 데 사용됩니다.

### 🚀 사용 방법 (How to Use)
앱 실행: 앱을 처음 실행하면 고유한 사용자 ID가 발급되고, '대회 목록' 화면이 나타납니다.

새 대회 생성: + 새 대회 만들기 버튼을 클릭하여 대회 설정 화면으로 이동합니다.

정보 입력: 대회명, 참가팀 목록, 경기 방식, 경기 기간을 입력하고 대진표 생성 버튼을 클릭합니다.

결과 입력: 생성된 대진표에서 각 경기의 점수를 입력합니다. 모든 변경 내용은 자동으로 저장됩니다.

기록 불러오기: '대회 목록' 화면으로 돌아가 저장된 다른 대회를 클릭하면 언제든지 해당 대회의 결과를 불러와 이어서 작업할 수 있습니다.

기능 활용:

결과 화면 상단의 날짜 필터를 사용하여 특정일의 경기만 볼 수 있습니다.

이미지로 저장 버튼을 눌러 현재 화면을 다운로드할 수 있습니다.

대회 삭제 버튼으로 선택한 대회를 영구적으로 삭제할 수 있습니다.
