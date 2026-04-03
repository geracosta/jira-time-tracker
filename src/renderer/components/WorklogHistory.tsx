import React, { useEffect } from 'react'
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
  const { todayWorklogs, todayTotalSeconds, refreshWorklogs, settings } = useApp()

  const targetSeconds = (settings?.targetHoursPerDay || 8) * 3600
  const percentage = Math.min(100, (todayTotalSeconds / targetSeconds) * 100)
  const remaining = Math.max(0, targetSeconds - todayTotalSeconds)

  return (
    <section className="worklog-history">
      <div className="worklog-header">
        <h3>Hoy</h3>
        <button className="btn-refresh" onClick={refreshWorklogs} title="Actualizar">
          ↻
        </button>
      </div>

      <div className="hours-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-text">
          <span>{formatDuration(todayTotalSeconds)} cargadas</span>
          <span>
            {remaining > 0
              ? `Faltan ${formatDuration(remaining)}`
              : 'Objetivo cumplido'
            }
          </span>
        </div>
      </div>

      {todayWorklogs.length === 0 ? (
        <div className="no-worklogs">No hay horas cargadas hoy</div>
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
