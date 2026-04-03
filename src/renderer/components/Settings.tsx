import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import type { Settings } from '../types'

export default function SettingsView({ onBack }: { onBack?: () => void }) {
  const { settings, saveSettings, testConnection, isConnected, userName } = useApp()
  const [form, setForm] = useState<Settings>({
    jiraUrl: '',
    email: '',
    apiToken: '',
    workStartHour: 9,
    workStartMinute: 0,
    workEndHour: 18,
    workEndMinute: 0,
    reminderIntervalMinutes: 15,
    targetHoursPerDay: 8,
    notificationsEnabled: true
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings])

  function updateField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    // Save first so the main process has the credentials
    await saveSettings(form)
    const result = await testConnection()
    setTestResult(result)
    setTesting(false)
  }

  async function handleSave() {
    setSaving(true)
    await saveSettings(form)
    setSaving(false)
    if (onBack) onBack()
  }

  return (
    <div className="settings-view">
      <div className="view-header">
        {onBack && <button className="btn-back" onClick={onBack}>← Volver</button>}
        <h2>Configuración</h2>
      </div>

      <div className="settings-form">
        <fieldset>
          <legend>Conexión a Jira</legend>

          <div className="form-group full-width">
            <label>URL de Jira</label>
            <input
              type="url"
              placeholder="https://tu-empresa.atlassian.net"
              value={form.jiraUrl}
              onChange={(e) => updateField('jiraUrl', e.target.value)}
            />
          </div>

          <div className="form-group full-width">
            <label>Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>

          <div className="form-group full-width">
            <label>API Token</label>
            <input
              type="password"
              placeholder="Tu API token de Atlassian"
              value={form.apiToken}
              onChange={(e) => updateField('apiToken', e.target.value)}
            />
            <small className="form-hint">
              Generalo en id.atlassian.net/manage-profile/security/api-tokens
            </small>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={testing || !form.jiraUrl || !form.email || !form.apiToken}
          >
            {testing ? 'Probando...' : 'Probar conexión'}
          </button>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success
                ? `Conectado como ${userName}`
                : `Error: ${testResult.error}`
              }
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Horario laboral</legend>
          <div className="form-row">
            <div className="form-group">
              <label>Inicio</label>
              <input
                type="time"
                value={`${String(form.workStartHour).padStart(2, '0')}:${String(form.workStartMinute).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  updateField('workStartHour', h)
                  updateField('workStartMinute', m)
                }}
              />
            </div>
            <div className="form-group">
              <label>Fin</label>
              <input
                type="time"
                value={`${String(form.workEndHour).padStart(2, '0')}:${String(form.workEndMinute).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  updateField('workEndHour', h)
                  updateField('workEndMinute', m)
                }}
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Notificaciones</legend>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.notificationsEnabled}
                onChange={(e) => updateField('notificationsEnabled', e.target.checked)}
              />
              Activar notificaciones
            </label>
          </div>

          <div className="form-group">
            <label>Recordar cada (minutos)</label>
            <input
              type="number"
              min="1"
              max="120"
              value={form.reminderIntervalMinutes}
              onChange={(e) => updateField('reminderIntervalMinutes', parseInt(e.target.value) || 15)}
            />
          </div>

          <div className="form-group">
            <label>Horas objetivo por día</label>
            <input
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={form.targetHoursPerDay}
              onChange={(e) => updateField('targetHoursPerDay', parseFloat(e.target.value) || 8)}
            />
          </div>
        </fieldset>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
