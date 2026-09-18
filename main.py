from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Triagent — 오픈소스 이슈 자동 트리아지 API")

BASE_DIR = Path(__file__).resolve().parent
INDEX_HTML_PATH = BASE_DIR / "templates" / "index.html"

# 논문 재분석 결과(특이값 Envoy 제외 시 r=+0.226, p=0.017)에서 근거를 둔 임계값.
# 기여자 수가 이 값 이상이면 조율 비용 증가로 인한 처리 지연 위험이 유의하게 커진다고 판단한다.
CONTRIBUTOR_THRESHOLD = 25

PAPER_EVIDENCE = (
    "전체 120개 관측치 상관관계는 r=-0.041, p=0.661(유의하지 않음)이었으나, "
    "특이값(Envoy) 제외 후에는 r=+0.226, p=0.017로 반전되어 "
    "'기여자가 많을수록 처리 시간이 길어짐'이 통계적으로 유의했습니다. "
    "단독 사례로는 CoreDNS가 r=+0.761(p<0.001)로 가장 뚜렷했습니다."
)


class IssueWebhook(BaseModel):
    project_name: str = Field(..., min_length=1, description="프로젝트 이름, 예: Envoy")
    issue_title: str = Field(..., min_length=1, description="이슈 제목")
    active_contributors: int = Field(..., ge=0, le=100000, description="최근 활성 기여자 수")


class TriageResponse(BaseModel):
    project_name: str
    issue_title: str
    active_contributors: int
    routing_decision: str
    reason: str
    paper_evidence: str


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "요청 데이터가 올바르지 않습니다.",
            "detail": exc.errors(),
        },
    )


@app.get("/", response_class=FileResponse)
def dashboard():
    return FileResponse(INDEX_HTML_PATH)


@app.post("/api/triage", response_model=TriageResponse)
def triage_issue(payload: IssueWebhook) -> TriageResponse:
    if payload.active_contributors >= CONTRIBUTOR_THRESHOLD:
        routing_decision = "Core Team"
        reason = (
            f"활성 기여자 {payload.active_contributors}명은 임계치({CONTRIBUTOR_THRESHOLD}명) 이상입니다. "
            "기여자가 많을수록 조율 비용이 증가해 처리 시간이 오히려 길어질 위험이 있으므로, "
            "지연을 막기 위해 의사결정 권한이 있는 Core Team에 즉시 배정합니다."
        )
    else:
        routing_decision = "Community Pool"
        reason = (
            f"활성 기여자 {payload.active_contributors}명은 임계치({CONTRIBUTOR_THRESHOLD}명) 미만으로, "
            "조율 비용으로 인한 지연 위험이 낮아 커뮤니티 풀에서 정상적으로 처리 가능합니다."
        )

    return TriageResponse(
        project_name=payload.project_name,
        issue_title=payload.issue_title,
        active_contributors=payload.active_contributors,
        routing_decision=routing_decision,
        reason=reason,
        paper_evidence=PAPER_EVIDENCE,
    )
