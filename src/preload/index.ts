import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Jira
  jira: {
    testConnection: () => ipcRenderer.invoke('jira:testConnection'),
    search: (query: string) => ipcRenderer.invoke('jira:search', query),
    getMyIssues: () => ipcRenderer.invoke('jira:getMyIssues'),
    addWorklog: (issueKey: string, timeSpentSeconds: number, started: string, comment?: string) =>
      ipcRenderer.invoke('jira:addWorklog', issueKey, timeSpentSeconds, started, comment),
    getMyWorklogs: (date: string) => ipcRenderer.invoke('jira:getMyWorklogs', date)
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: any) => ipcRenderer.invoke('settings:save', settings)
  },

  // Timer persistence
  timer: {
    getState: () => ipcRenderer.invoke('timer:getState'),
    saveState: (state: any) => ipcRenderer.invoke('timer:saveState', state),
    notifyRunning: (isRunning: boolean, issueKey?: string, startedAt?: number, accumulatedSeconds?: number) =>
      ipcRenderer.send('timer:running', isRunning, issueKey, startedAt, accumulatedSeconds),
    notifyPaused: (issueKey: string, frozenTime: string) =>
      ipcRenderer.send('timer:paused', issueKey, frozenTime),
    tick: (issueKey: string, formattedTime: string) =>
      ipcRenderer.send('timer:tick', issueKey, formattedTime),
    onWidgetStop: (callback: () => void) => {
      ipcRenderer.on('widget:request-stop', callback)
      return () => ipcRenderer.removeListener('widget:request-stop', callback)
    },
    onWidgetPause: (callback: () => void) => {
      ipcRenderer.on('widget:request-pause', callback)
      return () => ipcRenderer.removeListener('widget:request-pause', callback)
    },
    onWidgetPlay: (callback: () => void) => {
      ipcRenderer.on('widget:request-play', callback)
      return () => ipcRenderer.removeListener('widget:request-play', callback)
    }
  },

  // Notifications
  notifications: {
    reportTimerState: (running: boolean) =>
      ipcRenderer.send('notification:timerState', running),
    reportWorklogAdded: () =>
      ipcRenderer.send('notification:worklogAdded'),
    reportDailyHours: (hours: number) =>
      ipcRenderer.send('notification:dailyHoursCheck', hours),
    onCheckDailyHours: (callback: () => void) => {
      ipcRenderer.on('check-daily-hours', callback)
      return () => ipcRenderer.removeListener('check-daily-hours', callback)
    }
  },

  // App control
  app: {
    minimizeToTray: () => ipcRenderer.send('app:minimize-to-tray'),
    quit: () => ipcRenderer.send('app:quit'),
    show: () => ipcRenderer.send('app:show')
  }
}

contextBridge.exposeInMainWorld('api', api)
