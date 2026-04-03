import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function ManualEntry({ onBack }: { onBack: () => void }) {
  const { selectedIssue, refreshWorklogs } = useApp()
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [comment, setComment] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!selectedIssue) {
    return (
      <div className="manual-entry">
        <div className="view-header">
          <button className="btn-back" onClick={onBack}>← Volver</button>
          <h2>Carga Manual</h2>
        </div>
        <p className="no-results">No hay tarea seleccionada</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const h = parseInt(hours || '0')
    const m = parseInt(minutes || '0')
    const totalSeconds = h * 3600 + m * 60

    if (totalSeconds < 60) {
      setError('El tiempo mínimo es 1 minuto')
      return
    }

    const startedAt = new Date(`${date}T${startTime}:00`)
    if (isNaN(startedAt.getTime())) {
      setError('Fecha/hora inválida')
      return
    }

    setIsSaving(true)
    const result = await window.api.jira.addWorklog(
      selectedIssue.key,
      totalSeconds,
      startedAt.toISOString(),
      comment || undefined
    )

    if (result.success) {
      setSuccess(true)
      window.api.notifications.reportWorklogAdded()
      await refreshWorklogs()
      setTimeout(() => onBack(), 1500)
    } else {
      setError(result.error || 'Error al guardar')
    }
    setIsSaving(false)
  }

  return (
    <div className="manual-entry">
      <div className="view-header">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <h2>Carga Manual</h2>
      </div>

      <div className="selected-issue-card">
        <span className="issue-key">{selectedIssue.key}</span>
        <span className="issue-summary">{selectedIssue.summary}</span>
      </div>

      <form onSubmit={handleSubmit} className="manual-form">
        <div className="form-row">
          <div className="form-group">
            <label>Horas</label>
            <input
              type="number"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label>Minutos</label>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Hora inicio</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Comentario (opcional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Descripción del trabajo realizado..."
            rows={3}
          />
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">Worklog guardado en Jira</div>}

        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar en Jira'}
        </button>
      </form>
    </div>
  )
}
