import { useState } from 'react'
import './App.css'

const PAPER_TITLE =
  '클라우드 네이티브 오픈소스 프로젝트에서 활성 기여자 수와 이슈 처리 시간의 관계'

const APP_SENTENCE =
  "오픈소스 프로젝트에 새로운 이슈가 등록되면, 이 API가 현재 기여자 수 데이터를 즉시 분석해 " +
  "'조율 비용 지연 위험'을 진단하고, 담당팀 배정·SLA 타이머 시작 같은 해결 조치를 자동으로 실행해 " +
  '이슈가 미배정 상태로 정체되지 않도록 정상화합니다.'

const EXAMPLES = {
  high: { project_name: 'Envoy', issue_title: 'Memory leak detected', active_contributors: 68 },
  low: { project_name: 'CoreDNS', issue_title: 'Typo in docs', active_contributors: 10 },
  bad: { project_name: 'Envoy', issue_title: '', active_contributors: '많음' },
}

function formatPayload(payload) {
  return JSON.stringify(payload, null, 2)
}

export default function App() {
  const [payloadText, setPayloadText] = useState(formatPayload(EXAMPLES.high))
  const [status, setStatus] = useState('idle') // idle | loading | ok | error
  const [badge, setBadge] = useState(null) // { text, variant }
  const [response, setResponse] = useState(null)
  const [rawError, setRawError] = useState('')

  function loadExample(key) {
    setPayloadText(formatPayload(EXAMPLES[key]))
  }

  async function sendRequest() {
    let parsed
    try {
      parsed = JSON.parse(payloadText)
    } catch (e) {
      setStatus('error')
      setBadge({ text: '클라이언트 JSON 파싱 오류', variant: 'error' })
      setResponse(null)
      setRawError(`요청 본문이 올바른 JSON 형식이 아닙니다: ${e.message}`)
      return
    }

    setStatus('loading')
    setBadge(null)
    setResponse(null)
    setRawError('')

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setBadge({ text: `서버 거부 (HTTP ${res.status})`, variant: 'error' })
        setRawError(JSON.stringify(data, null, 2))
        return
      }

      setStatus('ok')
      setBadge({
        text: `routing_decision: ${data.routing_decision}`,
        variant: data.routing_decision === 'Core Team' ? 'core' : 'community',
      })
      setResponse(data)
    } catch (e) {
      setStatus('error')
      setBadge({ text: '네트워크 오류', variant: 'error' })
      setRawError(String(e))
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="label">Triagent · 참고 논문</div>
        <h1>{PAPER_TITLE}</h1>
        <p className="sentence">{APP_SENTENCE}</p>
      </header>

      <main className="main">
        <section className="panel">
          <h2>1. Webhook 요청 (JSON Request Body)</h2>
          <p className="status-line">
            active_contributors 값을 바꿔가며 POST 요청을 보내보세요. 임계치는 <strong>25명</strong>입니다.
          </p>
          <textarea
            className="payload"
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            spellCheck={false}
          />
          <div className="presets">
            <button type="button" onClick={() => loadExample('high')}>
              예시: 기여자 68명 (Core Team 예상)
            </button>
            <button type="button" onClick={() => loadExample('low')}>
              예시: 기여자 10명 (Community Pool 예상)
            </button>
            <button type="button" onClick={() => loadExample('bad')}>
              예시: 잘못된 값 (에러 확인)
            </button>
          </div>
          <button className="send-btn" onClick={sendRequest} disabled={status === 'loading'}>
            {status === 'loading' ? '요청 전송 중...' : 'POST 요청 보내기 → /api/triage'}
          </button>
        </section>

        <section className="panel">
          <h2>2. 분석 → 해결 → 정상화</h2>
          {badge && <span className={`badge ${badge.variant}`}>{badge.text}</span>}

          {status === 'idle' && <p className="placeholder">아직 요청을 보내지 않았습니다.</p>}

          {status === 'ok' && response && (
            <div className="remediation">
              <h3>진단</h3>
              <div className="diagnosis">{response.diagnosis}</div>

              <h3>실행된 조치</h3>
              <ul>
                {response.executed_steps.map((step) => (
                  <li key={step}>✓ {step}</li>
                ))}
              </ul>

              <h3>이슈 상태 변화</h3>
              <div className="status-flow">
                <span className="pill before">{response.status_before}</span>
                <span aria-hidden="true">→</span>
                <span className="pill after">{response.status_after}</span>
              </div>

              <p className="sim-notice">{response.simulation_notice}</p>
            </div>
          )}

          {status === 'error' && rawError && <pre className="result error-text">{rawError}</pre>}

          {status === 'ok' && response && <pre className="result">{JSON.stringify(response, null, 2)}</pre>}
        </section>
      </main>

      <footer className="footer">
        이 화면은 가상의 GitHub Webhook 데이터를 흉내 낸 API 테스트 대시보드입니다. 실제 개인정보는
        포함되어 있지 않고, 자동 실행 조치는 실제 GitHub 저장소를 바꾸지 않는 시뮬레이션입니다.
      </footer>
    </div>
  )
}
