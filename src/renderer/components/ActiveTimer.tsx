import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function ActiveTimer() {
  const { timer, stopTimer, discardTimer } = useApp()
  const [elapsed, setElapsed] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (timer.isRunning && timer.startedAt) {
      const update = () => {
        const now = Date.now()
        const diff = Math.floor((now - timer.startedAt!.getTime()) / 1000)
        const total = diff + timer.accumulatedSeconds
        setElapsed(total)
        // Send tick to main process for mini-widget
        window.api.timer.tick(timer.issueKey, formatTime(total))
      }
      update()
      intervalRef.current = setInterval(update, 1000)
      return () => clearInterval(intervalRef.current)
    } else {
      setElapsed(0)
    }
  }, [timer.isRunning, timer.startedAt, timer.accumulatedSeconds])

  async function handleStop() {
    setIsSaving(true)
    await stopTimer()
    setIsSaving(false)
  }

  if (!timer.isRunning) {
    return (
      <section className="active-timer idle">
        <div className="timer-idle-text">
          <span className="timer-dot idle-dot" />
          NO ACTIVE TIMER
        </div>
      </section>
    )
  }

  return (
    <section className="active-timer running">
      <div className="timer-issue">
        <span className="timer-dot running-dot" />
        <span className="timer-issue-key">{timer.issueKey}</span>
      </div>
      <div className="timer-summary">{timer.issueSummary}</div>
      <div className="timer-display">{formatTime(elapsed)}</div>
      <div className="timer-actions">
        <button className="btn btn-stop" onClick={handleStop} disabled={isSaving}>
          {isSaving ? 'SAVING...' : 'STOP'}
        </button>
        <button className="btn btn-discard" onClick={discardTimer}>
          DISCARD
        </button>
      </div>
    </section>
  )
}
