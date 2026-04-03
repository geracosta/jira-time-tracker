import React, { useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function TaskSearch() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    myIssues,
    isSearching,
    startTimer,
    timer,
    setSelectedIssue,
    setCurrentView
  } = useApp()

  const displayIssues = searchQuery.trim() ? searchResults : myIssues

  function handleSelectIssue(issue: typeof displayIssues[0]) {
    if (timer.isRunning) {
      // If timer is already running, offer manual entry
      setSelectedIssue(issue)
      setCurrentView('manual-entry')
    } else {
      startTimer(issue)
    }
  }

  function handleManualEntry(issue: typeof displayIssues[0], e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIssue(issue)
    setCurrentView('manual-entry')
  }

  return (
    <section className="task-search">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Buscar tarea por clave o texto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isSearching && <span className="search-spinner">⟳</span>}
      </div>

      <div className="issues-list">
        {!searchQuery.trim() && (
          <div className="list-header">Mis tareas asignadas</div>
        )}
        {searchQuery.trim() && displayIssues.length === 0 && !isSearching && (
          <div className="no-results">No se encontraron tareas</div>
        )}
        {displayIssues.map((issue) => (
          <div
            key={issue.key}
            className="issue-item"
            onClick={() => handleSelectIssue(issue)}
          >
            <div className="issue-info">
              <div className="issue-key-row">
                <span className="issue-key">{issue.key}</span>
                <span className={`issue-status status-${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {issue.status}
                </span>
              </div>
              <div className="issue-summary">{issue.summary}</div>
              <div className="issue-meta">{issue.project} · {issue.issueType}</div>
            </div>
            <div className="issue-actions">
              {!timer.isRunning && (
                <button
                  className="btn-play"
                  onClick={(e) => { e.stopPropagation(); startTimer(issue) }}
                  title="Iniciar timer"
                >
                  ▶
                </button>
              )}
              <button
                className="btn-manual"
                onClick={(e) => handleManualEntry(issue, e)}
                title="Carga manual"
              >
                ✏
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
