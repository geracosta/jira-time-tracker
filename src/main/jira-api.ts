import { ipcMain } from 'electron'
import { getSettings } from './store'

interface JiraAuth {
  baseUrl: string
  email: string
  token: string
}

function getAuth(): JiraAuth {
  const settings = getSettings()
  return {
    baseUrl: settings.jiraUrl.replace(/\/+$/, ''),
    email: settings.email,
    token: settings.apiToken
  }
}

function authHeaders(auth: JiraAuth): Record<string, string> {
  const encoded = Buffer.from(`${auth.email}:${auth.token}`).toString('base64')
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
}

async function jiraFetch(path: string, options: RequestInit = {}): Promise<any> {
  const auth = getAuth()
  const url = `${auth.baseUrl}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(auth),
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Jira API error ${response.status}: ${text}`)
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export function registerJiraHandlers(): void {
  ipcMain.handle('jira:testConnection', async () => {
    try {
      const user = await jiraFetch('/rest/api/3/myself')
      return { success: true, displayName: user.displayName, accountId: user.accountId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('jira:search', async (_e, query: string) => {
    try {
      const jql = query.match(/^[A-Z]+-\d+$/i)
        ? `key = "${query.toUpperCase()}"`
        : `text ~ "${query}" ORDER BY updated DESC`
      const result = await jiraFetch('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({
          jql,
          maxResults: 15,
          fields: ['summary', 'status', 'project', 'issuetype']
        })
      })
      return result.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name || '',
        project: issue.fields.project?.name || '',
        issueType: issue.fields.issuetype?.name || ''
      }))
    } catch (error: any) {
      console.error('Search error:', error)
      return []
    }
  })

  ipcMain.handle('jira:getMyIssues', async () => {
    try {
      const jql = 'assignee = currentUser() OR reporter = currentUser() ORDER BY updated DESC'
      const result = await jiraFetch('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({
          jql,
          maxResults: 20,
          fields: ['summary', 'status', 'project', 'issuetype']
        })
      })
      return result.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name || '',
        project: issue.fields.project?.name || '',
        issueType: issue.fields.issuetype?.name || ''
      }))
    } catch (error: any) {
      console.error('Get my issues error:', error)
      return []
    }
  })

  ipcMain.handle('jira:addWorklog', async (_e, issueKey: string, timeSpentSeconds: number, started: string, comment?: string) => {
    try {
      const body: any = {
        timeSpentSeconds,
        started: formatJiraDate(started)
      }
      if (comment) {
        body.comment = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: comment }]
            }
          ]
        }
      }
      const result = await jiraFetch(`/rest/api/3/issue/${issueKey}/worklog`, {
        method: 'POST',
        body: JSON.stringify(body)
      })
      return { success: true, worklog: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('jira:getMyWorklogs', async (_e, date: string) => {
    try {
      const settings = getSettings()
      // First get current user
      const myself = await jiraFetch('/rest/api/3/myself')
      const accountId = myself.accountId

      // Search issues where current user has worklogs today
      const jql = `worklogAuthor = currentUser() AND worklogDate = "${date}"`
      const result = await jiraFetch('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({
          jql,
          maxResults: 50,
          fields: ['summary', 'worklog']
        })
      })

      const worklogs: any[] = []
      for (const issue of result.issues) {
        // Get worklogs for this issue
        const wlResult = await jiraFetch(`/rest/api/3/issue/${issue.key}/worklog`)
        const issueWorklogs = (wlResult.worklogs || [])
          .filter((wl: any) => {
            const wlDate = wl.started?.substring(0, 10)
            return wl.author?.accountId === accountId && wlDate === date
          })
          .map((wl: any) => ({
            id: wl.id,
            issueKey: issue.key,
            issueSummary: issue.fields.summary,
            timeSpentSeconds: wl.timeSpentSeconds,
            timeSpent: wl.timeSpent,
            started: wl.started,
            comment: extractComment(wl.comment)
          }))
        worklogs.push(...issueWorklogs)
      }

      return worklogs
    } catch (error: any) {
      console.error('Get worklogs error:', error)
      return []
    }
  })
}

function formatJiraDate(isoDate: string): string {
  // Jira expects: "2024-01-15T09:00:00.000+0000"
  const date = new Date(isoDate)
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOffset = Math.abs(offset)
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const minutes = String(absOffset % 60).padStart(2, '0')
  return date.toISOString().replace('Z', `${sign}${hours}${minutes}`)
}

function extractComment(comment: any): string {
  if (!comment) return ''
  if (typeof comment === 'string') return comment
  // ADF format
  if (comment.content) {
    return comment.content
      .map((block: any) =>
        block.content?.map((inline: any) => inline.text || '').join('') || ''
      )
      .join('\n')
  }
  return ''
}
