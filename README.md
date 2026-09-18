# Triagent — 오픈소스 이슈 자동 트리아지(Triage) API 서버

## 참고 논문
클라우드 네이티브 오픈소스 프로젝트에서 활성 기여자 수와 이슈 처리 시간의 관계

## 앱이 될 문장
> 오픈소스 프로젝트에 새로운 이슈가 등록될 때, 이 API가 현재 기여자 수에 따른 '조율 비용 지연 위험'을 계산하고 이슈를 최적의 팀에 자동 라우팅(분배)하여 메인테이너를 돕습니다.

## 실행 방법 (Windows PowerShell 기준)

```powershell
cd issue-triage-api
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

서버가 뜨면 브라우저에서 `http://localhost:8000` 접속.

## 확인 방법 (사용자가 할 일 세 가지)

1. 대시보드 왼쪽 텍스트 박스의 JSON에서 `active_contributors` 값을 수정한다.
2. 값이 25 이상(예: 68)이면 [POST 요청 보내기]를 눌러 서버가 `routing_decision: "Core Team"`으로 응답하는지 확인한다. 응답의 `reason`, `paper_evidence` 필드에 왜 그렇게 판단했는지가 함께 표시된다.
3. 값이 25 미만(예: 10)이면 다시 요청을 보내 `routing_decision: "Community Pool"`로 정상 할당되는지 확인한다. 이어서 값이 빈 칸이거나 문자열("많음")인 경우로 다시 보내보고, 서버가 죽지 않고 HTTP 422 에러(상세 사유 포함)를 반환하는지 확인한다.

대시보드의 "예시" 버튼 3개(기여자 68명 / 10명 / 잘못된 값)를 눌러 위 세 가지 케이스를 바로 시험해볼 수 있다.

## 라우팅 로직

- 임계치: 활성 기여자 25명
- 25명 이상 → `Core Team`으로 즉시 라우팅. 논문 재분석 결과 특이값(Envoy) 제외 시 기여자 수가 많을수록 조율 비용 증가로 처리 시간이 길어지는 경향(r=+0.226, p=0.017)이 확인되어, 지연 위험을 낮추기 위해 의사결정 권한이 있는 팀에 우선 배정한다.
- 25명 미만 → `Community Pool`로 정상 할당.

## 데이터 및 보안

- 요청 예시(`{"project_name": "Envoy", "issue_title": "Memory leak detected", ...}`)는 모두 가상의 더미 데이터이며, 실제 개인정보는 포함하지 않는다.
- 이 서버는 외부 API를 호출하지 않는 자체 로직 기반이므로 API 키/토큰이 필요 없다. 환경 변수(.env)도 사용하지 않는다.

## 폴더 구조

```text
issue-triage-api/
├── main.py            FastAPI 서버 로직 및 API 엔드포인트
├── templates/
│   └── index.html     API 테스트용 프론트엔드 대시보드
├── requirements.txt   의존성 목록
└── README.md          본 문서
```

## AI와 나의 판단 (회고)

1. **AI에게 맡긴 일:** FastAPI 뼈대 코드 작성 및 API 테스트용 HTML 대시보드 UI 생성.
2. **내가 직접 판단한 일:** 논문 결론(기여자 수 증가 → 조율 비용 증가 → 처리 지연 위험)을 바탕으로 기여자 수 기준(threshold=25) 라우팅 분기 로직을 설계한 것.
3. **AI 제안을 따르지 않은 일:** 외부 DB 연동이나 복잡한 인증 절차를 붙이자는 제안이 있었으나, 직관적인 시연과 과제 목적(논문 반영)에 집중하기 위해 메모리 기반의 심플한 로직으로 축소함.
