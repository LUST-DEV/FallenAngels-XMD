const pairForm = document.querySelector('#pair-form')
const loginForm = document.querySelector('#login-form')

function showMessage(target, message, isError = false) {
  target.textContent = message
  target.classList.toggle('error', isError)
}

pairForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const message = document.querySelector('#pair-message')
  const button = pairForm.querySelector('button[type="submit"]')
  button.disabled = true
  showMessage(message, 'Connecting…')

  try {
    const response = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: document.querySelector('#numero').value }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Unable to start the connection.')

    message.replaceChildren()
    const detail = document.createElement('span')
    detail.textContent = result.message
    message.append(detail)
    if (result.pairingCode) {
      const codeRow = document.createElement('div')
      codeRow.className = 'pair-code-row'
      const code = document.createElement('strong')
      code.className = 'pair-code'
      code.textContent = result.pairingCode
      const copyButton = document.createElement('button')
      copyButton.className = 'copy-code-button'
      copyButton.type = 'button'
      copyButton.textContent = 'Copy code'
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.pairingCode)
          copyButton.textContent = 'Code copied ✓'
          copyButton.classList.add('copied')
        } catch {
          copyButton.textContent = 'Unable to copy'
          copyButton.classList.add('copy-failed')
        }
      })
      codeRow.append(code, copyButton)
      message.append(codeRow)
    }
  } catch (error) {
    showMessage(message, error.message, true)
  } finally {
    button.disabled = false
  }
})

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const message = document.querySelector('#login-message')
  const button = loginForm.querySelector('button[type="submit"]')
  button.disabled = true
  showMessage(message, 'Verifying…')

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.querySelector('#password').value }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Sign-in failed.')
    window.location.assign('/dashboard')
  } catch (error) {
    showMessage(message, error.message, true)
  } finally {
    button.disabled = false
  }
})
