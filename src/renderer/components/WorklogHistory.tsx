import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHour(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function WorklogHistory() {
  const { todayWorklogs, todayTotalSeconds, refreshWorklogs, settings, timer } = useApp()
  const [timerElapsed, setTimerElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (timer.isRunning && timer.startedAt) {
      const update = () => {
        const diff = Math.floor((Date.now() - timer.startedAt!.getTime()) / 1000)
        setTimerElapsed(diff + timer.accumulatedSeconds)
      }
      update()
      intervalRef.current = setInterval(update, 1000)
      return () => clearInterval(intervalRef.current)
    } else {
      setTimerElapsed(0)
    }
  }, [timer.isRunning, timer.startedAt, timer.accumulatedSeconds])

  const targetSeconds = (settings?.targetHoursPerDay || 8) * 3600
  const loggedPct = Math.min(100, (todayTotalSeconds / targetSeconds) * 100)
  const projectedPct = timer.isRunning
    ? Math.min(100 - loggedPct, (timerElapsed / targetSeconds) * 100)
    : 0
  const totalProjected = todayTotalSeconds + timerElapsed
  const remaining = Math.max(0, targetSeconds - totalProjected)

  return (
    <section className="worklog-history">
      <div className="worklog-header">
        <h3>Today</h3>
        <button className="btn-refresh" onClick={refreshWorklogs} title="Refresh">
          SYNC
        </button>
      </div>

      <div className="hours-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${loggedPct}%` }}
          />
          {timer.isRunning && projectedPct > 0 && (
            <div
              className="progress-fill-projected"
              style={{ width: `${projectedPct}%` }}
            />
          )}
        </div>
        <div className="progress-text">
          <span>
            {formatDuration(todayTotalSeconds)} logged
            {timer.isRunning && timerElapsed > 0 && (
              <span className="projected-text"> + {formatDuration(timerElapsed)}</span>
            )}
          </span>
          <span>
            {remaining > 0
              ? `${formatDuration(remaining)} remaining`
              : 'Target reached'
            }
          </span>
        </div>
      </div>

      {todayWorklogs.length === 0 ? (
        <div className="no-worklogs">NO WORKLOGS TODAY</div>
      ) : (
        <div className="worklog-list">
          {todayWorklogs.map((wl) => (
            <div key={wl.id} className="worklog-item">
              <div className="worklog-info">
                <span className="worklog-key">{wl.issueKey}</span>
                <span className="worklog-summary">{wl.issueSummary}</span>
              </div>
              <div className="worklog-time">
                <span className="worklog-duration">{formatDuration(wl.timeSpentSeconds)}</span>
                <span className="worklog-start">{formatHour(wl.started)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
