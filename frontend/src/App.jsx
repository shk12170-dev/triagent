import { useState } from 'react'
import './App.css'

const EXAMPLES = {
  high: { project_name: 'Envoy', issue_title: 'Memory leak detected', active_contributors: 68 },
  low: { project_name: 'CoreDNS', issue_title: 'Typo in docs', active_contributors: 10 },
  bad: { project_name: 'Envoy', issue_title: '', active_contributors: '많음' },
}

const INITIAL_PAYLOAD = JSON.stringify(EXAMPLES.high, null, 2)

function App() {
  const [payloadText, setPayloadText] = useState(INITIAL_PAYLOAD)
  const [loading, setLoading] = useState(false)
  const [badge, setBadge] = useState(null) // { text, cls }
  const [resultText, setResultText] = useState('아직 요청을 보내지 않았습니다.')
  const [remediation, setRemediation] = useState(null)

  const applyExample = (key) => {
    setPayloadText(JSON.stringify(EXAMPLES[key], null, 2))
  }

  const sendRequest = async () => {
    let parsed
    try {
      parsed = JSON.parse(payloadText)
    } catch (e) {
      setBadge({ text: '클라이언트 JSON 파싱 오류', cls: 'error' })
      setResultText('요청 본문이 올바른 JSON 형식이 아닙니다: ' + e.message)
      setRemediation(null)
      return
    }

    setLoading(true)
    setResultText('요청 전송 중...')
    setBadge(null)
    setRemediation(null)

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()

      if (!res.ok) {
        setBadge({ text: `서버 거부 (HTTP ${res.status})`, cls: 'error' })
      } else {
        setBadge(
          data.routing_decision === 'Core Team'
            ? { text: 'routing_decision: Core Team', cls: 'core' }
            : { text: 'routing_decision: Community Pool', cls: 'community' },
        )
        setRemediation({
          diagnosis: data.diagnosis,
          steps: data.executed_steps,
          statusBefore: data.status_before,
          statusAfter: data.status_after,
          simNotice: data.simulation_notice,
        })
      }

      setResultText(JSON.stringify(data, null, 2))
    } catch (e) {
      setBadge({ text: '네트워크 오류', cls: 'error' })
      setResultText(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="label">Triagent · 참고 논문</div>
        <h1>클라우드 네이티브 오픈소스 프로젝트에서 활성 기여자 수와 이슈 처리 시간의 관계</h1>
        <p className="sentence">
          오픈소스 프로젝트에 새로운 이슈가 등록되면, 이 API가 현재 기여자 수 데이터를 즉시 분석해 '조율
          비용 지연 위험'을 진단하고, 담당팀 배정·SLA 타이머 시작 같은 해결 조치를 자동으로 실행해 이슈가
          미배정 상태로 정체되지 않도록 정상화합니다.
        </p>
      </header>

      <main className="app-main">
        <section className="panel">
          <h2>1. Webhook 요청 (JSON Request Body)</h2>
          <p className="status-line">
            active_contributors 값을 바꿔가며 POST 요청을 보내보세요. 임계치는 <strong>25명</strong>입니다.
          </p>
          <textarea
            id="payload"
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
          />
          <div className="presets">
            <button type="button" onClick={() => applyExample('high')}>
              예시: 기여자 68명 (Core Team 예상)
            </button>
            <button type="button" onClick={() => applyExample('low')}>
              예시: 기여자 10명 (Community Pool 예상)
            </button>
            <button type="button" onClick={() => applyExample('bad')}>
              예시: 잘못된 값 (에러 확인)
            </button>
          </div>
          <button className="send-btn" onClick={sendRequest} disabled={loading}>
            {loading ? '요청 전송 중...' : 'POST 요청 보내기 → /api/triage'}
          </button>
        </section>

        <section className="panel">
          <h2>2. 분석 → 해결 → 정상화</h2>
          <div id="badge">
            {badge && <span className={`badge ${badge.cls}`}>{badge.text}</span>}
          </div>

          {remediation && (
            <div id="remediation">
              <h3>진단</h3>
              <div className="diagnosis">{remediation.diagnosis}</div>
              <h3>실행된 조치</h3>
              <ul>
                {remediation.steps.map((step, i) => (
                  <li key={i}>✓ {step}</li>
                ))}
              </ul>
              <h3>이슈 상태 변화</h3>
              <div className="status-flow">
                <span className="pill before">{remediation.statusBefore}</span>
                <span>→</span>
                <span className="pill after">{remediation.statusAfter}</span>
              </div>
              <div className="sim-notice">{remediation.simNotice}</div>
            </div>
          )}

          <pre id="result">{resultText}</pre>
        </section>
      </main>

      <footer className="app-footer">
        이 화면은 가상의 GitHub Webhook 데이터를 흉내 낸 API 테스트 대시보드입니다. 실제 개인정보는
        포함되어 있지 않고, 자동 실행 조치는 실제 GitHub 저장소를 바꾸지 않는 시뮬레이션입니다.
      </footer>
    </div>
  )
}

export default App
