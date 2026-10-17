const message = document.querySelector('#dashboard-message')
const chartColors = ['#20201d', '#55554f', '#85857d', '#aaa9a1', '#c8c8c1', '#72726b']
const charts = {}

function showError(error) {
  message.textContent = error.message
  message.classList.add('error')
}

async function restartConnections(url, confirmMessage, button, all = false) {
  if (!window.confirm(confirmMessage)) return

  button.disabled = true
  message.textContent = ''
  message.classList.remove('error')
  try {
    const response = await fetch(url, { method: 'POST' })
    const result = await response.json()
    if (response.status === 401) {
      window.location.replace('/')
      return
    }
    if (!response.ok) throw new Error(result.error || 'Unable to restart the session.')

    if (all) {
      const failed = result.failed || []
      message.textContent = failed.length
        ? `Restart initiated for ${result.restarted} session(s); failed: ${failed.map((item) => item.numero).join(', ')}${result.skipped ? `; ${result.skipped} skipped` : ''}.`
        : `Restart initiated for ${result.restarted} session(s)${result.skipped ? `; ${result.skipped} skipped` : ''}.`
      if (failed.length) message.classList.add('error')
    } else {
      message.textContent = `Restart initiated for ${result.numero}.`
    }
    await loadDashboard()
  } catch (error) {
    showError(error)
  } finally {
    button.disabled = false
  }
}

function cell(row, value, className) {
  const td = document.createElement('td')
  td.textContent = value ?? ''
  if (className) td.className = className
  row.append(td)
  return td
}

function countryName(country) {
  if (!country) return 'Unknown'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(country) || country
  } catch {
    return country
  }
}

function createCharts(stats) {
  for (const chart of Object.values(charts)) chart.destroy()
  for (const key of Object.keys(charts)) delete charts[key]

  const gridColor = 'rgba(30, 30, 26, 0.08)'
  const tickColor = '#74746e'
  Chart.defaults.font.family = '"Segoe UI", Arial, sans-serif'
  const tooltip = {
    backgroundColor: '#20201d',
    borderColor: '#deded9',
    borderWidth: 1,
    titleColor: '#ffffff',
    bodyColor: '#e1e1dc',
    padding: 12,
    displayColors: true,
    boxPadding: 5,
  }
  const centerText = (value, label) => ({
    id: 'doughnut-center-text',
    afterDraw(chart) {
      const { ctx, chartArea } = chart
      if (!chartArea) return
      const x = (chartArea.left + chartArea.right) / 2
      const y = (chartArea.top + chartArea.bottom) / 2
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#20201d'
      ctx.font = '700 25px "Segoe UI", Arial, sans-serif'
      ctx.fillText(value, x, y - 7)
      ctx.fillStyle = '#777772'
      ctx.font = '500 9px "Segoe UI", Arial, sans-serif'
      ctx.letterSpacing = '1.5px'
      ctx.fillText(label, x, y + 13)
      ctx.restore()
    },
  })

  charts.activity = new Chart(document.querySelector('#activity-chart'), {
    type: 'line',
    data: {
      labels: stats.activity.map((point) => new Date(point.hour).toLocaleTimeString('en-US', { hour: '2-digit' })),
      datasets: [{
        label: 'Commands',
        data: stats.activity.map((point) => point.count),
        borderColor: '#22221f',
        backgroundColor: (context) => {
          const { chart } = context
          const { ctx, chartArea } = chart
          if (!chartArea) return 'rgba(30, 30, 26, 0.08)'
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, 'rgba(30, 30, 26, 0.14)')
          gradient.addColorStop(1, 'rgba(30, 30, 26, 0)')
          return gradient
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#22221f',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltip,
          callbacks: { title: (items) => `${items[0].label} · hourly activity` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: tickColor, maxTicksLimit: 8, maxRotation: 0, font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          border: { display: false, dash: [4, 4] },
          ticks: { color: tickColor, precision: 0, padding: 10, font: { size: 10 } },
        },
      },
    },
  })

  const hasCommands = stats.commands.length > 0
  document.querySelector('#commands-chart').hidden = !hasCommands
  document.querySelector('#commands-empty').hidden = hasCommands
  if (hasCommands) {
    charts.commands = new Chart(document.querySelector('#commands-chart'), {
      type: 'doughnut',
      data: {
        labels: stats.commands.map((item) => `.${item.command}`),
        datasets: [{
          data: stats.commands.map((item) => Number(item.count)),
          backgroundColor: chartColors,
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 8,
          borderRadius: 5,
          spacing: 3,
        }],
      },
      plugins: [centerText(stats.commandTotals.toLocaleString('en-US'), 'COMMANDS')],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tickColor, usePointStyle: true, pointStyle: 'circle', padding: 18, boxWidth: 7, font: { size: 10 } },
          },
          tooltip: { ...tooltip, callbacks: { label: (item) => ` ${item.label}: ${item.raw} use(s)` } },
        },
      },
    })
  }

  charts.resources = new Chart(document.querySelector('#resources-chart'), {
    type: 'doughnut',
    data: {
      labels: ['CPU', 'Memory', 'Disk'],
      datasets: [{
        data: ['cpu', 'ram', 'disk'].map((key) => Math.min(100, Math.max(0, Number(stats.system[key])))),
        backgroundColor: ['#22221f', '#777772', '#c8c8c1'],
        borderColor: '#ffffff',
        borderWidth: 4,
        hoverOffset: 7,
        borderRadius: 5,
        spacing: 3,
      }],
    },
    plugins: [centerText(`${Math.round(['cpu', 'ram', 'disk'].reduce((sum, key) => sum + Number(stats.system[key]), 0) / 3)}%`, 'AVERAGE')],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip, callbacks: { label: (item) => ` ${item.label}: ${Number(item.raw).toFixed(1)}%` } },
      },
    },
  })

  const countryRows = stats.countries.filter((entry) => entry.count > 0)
  const hasCountries = countryRows.length > 0
  document.querySelector('#countries-chart').hidden = !hasCountries
  document.querySelector('#countries-empty').hidden = hasCountries
  if (hasCountries) {
    charts.countries = new Chart(document.querySelector('#countries-chart'), {
      type: 'doughnut',
      data: {
        labels: countryRows.map((entry) => countryName(entry.country)),
        datasets: [{
          data: countryRows.map((entry) => entry.count),
          backgroundColor: countryRows.map((_, index) => chartColors[index % chartColors.length]),
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 8,
          borderRadius: 5,
          spacing: 3,
        }],
      },
      plugins: [centerText(countryRows.reduce((sum, entry) => sum + entry.count, 0).toLocaleString('en-US'), 'USERS')],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tickColor, usePointStyle: true, pointStyle: 'circle', padding: 18, boxWidth: 7, font: { size: 10 } },
          },
          tooltip: {
            ...tooltip,
            callbacks: {
              label: (item) => ` ${item.label}: ${item.raw} user(s)`,
            },
          },
        },
      },
    })
  }
}

async function loadDashboard() {
  const [statsResponse, usersResponse] = await Promise.all([
    fetch('/api/stats'),
    fetch('/api/users'),
  ])
  if ([statsResponse, usersResponse].some((response) => response.status === 401)) {
    window.location.replace('/')
    return
  }
  if (!statsResponse.ok || !usersResponse.ok) throw new Error('Unable to load dashboard data.')

  const [stats, users] = await Promise.all([statsResponse.json(), usersResponse.json()])
  document.querySelector('#users-count').textContent = stats.users
  document.querySelector('#online-count').textContent = stats.online
  document.querySelector('#logs-count').textContent = stats.logs
  document.querySelector('#uptime').textContent = stats.system.uptime
  document.querySelector('#cpu').textContent = `${stats.system.cpu.toFixed(1)} %`
  document.querySelector('#ram').textContent = `${stats.system.ram.toFixed(1)} %`
  document.querySelector('#disk').textContent = `${stats.system.disk.toFixed(1)} %`
  createCharts(stats)

  const usersTable = document.querySelector('#users-table')
  usersTable.replaceChildren()
  if (!users.length) {
    const row = usersTable.insertRow()
    cell(row, 'No users', 'empty').colSpan = 6
  }
  for (const user of users) {
    const row = usersTable.insertRow()
    cell(row, user.numero)
    cell(row, countryName(user.country))
    cell(row, user.prefix)
    const status = cell(row, user.online ? 'Online' : 'Offline', `status${user.online ? ' online' : ''}`)
    status.setAttribute('aria-label', user.online ? 'Online' : 'Offline')
    cell(row, new Date(user.createdAt).toLocaleString('en-US'))
    const actionCell = row.insertCell()
    const actions = document.createElement('div')
    actions.className = 'session-actions'
    const restart = document.createElement('button')
    restart.className = 'session-action-button'
    restart.type = 'button'
    restart.textContent = 'Restart'
    restart.addEventListener('click', () => restartConnections(
      `/api/users/${encodeURIComponent(user.numero)}/restart`,
      `Restart the WhatsApp session for ${user.numero}?`,
      restart,
    ))
    const remove = document.createElement('button')
    remove.className = 'danger-button'
    remove.type = 'button'
    remove.textContent = 'Remove'
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Disconnect and remove ${user.numero}?`)) return
      remove.disabled = true
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(user.numero)}`, { method: 'DELETE' })
        const result = await response.json()
        if (response.status === 401) {
          window.location.replace('/')
          return
        }
        if (!response.ok) throw new Error(result.error || 'Unable to remove the session.')
        await loadDashboard()
      } catch (error) {
        showError(error)
      } finally {
        remove.disabled = false
      }
    })
    actions.append(restart, remove)
    actionCell.append(actions)
  }

  const logsTable = document.querySelector('#logs-table')
  logsTable.replaceChildren()
  if (!stats.recentLogs.length) {
    const row = logsTable.insertRow()
    cell(row, 'No recent commands', 'empty').colSpan = 3
  }
  for (const log of stats.recentLogs) {
    const row = logsTable.insertRow()
    cell(row, log.command)
    cell(row, log.numero)
    cell(row, new Date(log.createdAt).toLocaleString('en-US'))
  }
}

document.querySelector('#restart-all').addEventListener('click', (event) => {
  restartConnections(
    '/api/users/restart-all',
    'Restart every linked WhatsApp session? Connections may be briefly offline.',
    event.currentTarget,
    true,
  )
})

document.querySelector('#logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.replace('/')
})

loadDashboard().catch(showError)
