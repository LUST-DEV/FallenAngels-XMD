const audio = document.getElementById('site-music')
const toggle = document.getElementById('music-toggle')
const label = document.getElementById('music-toggle-label')

function updateMusicButton(isPlaying) {
  const text = isPlaying ? 'Turn music off' : 'Play music'
  label.textContent = text
  toggle.setAttribute('aria-label', text)
  toggle.setAttribute('aria-pressed', String(isPlaying))
}

toggle.addEventListener('click', async () => {
  if (!audio.paused) {
    audio.pause()
    updateMusicButton(false)
    return
  }

  try {
    await audio.play()
    updateMusicButton(true)
  } catch (error) {
    console.error('Unable to play the site music.', error)
    label.textContent = 'Music unavailable'
    toggle.setAttribute('aria-label', 'Music unavailable')
    toggle.disabled = true
  }
})

audio.addEventListener('play', () => updateMusicButton(true))
audio.addEventListener('pause', () => updateMusicButton(false))
audio.addEventListener('error', () => {
  console.error('The site audio file could not be loaded.')
  label.textContent = 'Music unavailable'
  toggle.setAttribute('aria-label', 'Music unavailable')
  toggle.disabled = true
})

function startMusic() {
  audio.play().then(() => {
    updateMusicButton(true)
  }).catch((error) => {
    if (error.name !== 'NotAllowedError') {
      console.error('Automatic music playback failed.', error)
    }
    updateMusicButton(false)
  })
}

startMusic()
audio.addEventListener('canplay', startMusic, { once: true })
