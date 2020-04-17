const img = document.getElementById('img')

// img.addEventListener('click', enable)
enable()

const { scream, stop } = setupScreaming()
function setupScreaming() {
  let audio = null
  const scream = function (vol) {
    console.log('Starting sound')
    if (!audio) audio = setupAudio()
    console.log(audio)
    audio.play()
    console.log(img.style)
    img.style.width = `${lerp(300, 600, vol)}px`
    img.style.animationPlayState = 'running'
  }

  const stop = function () {
    if (audio) {
      audio.pause()
      img.style.animationPlayState = 'paused'
      img.style.width = `300px`
    }
  }

  function setupAudio() {
    console.log('Setting up audio')
    const sound = randomSize(1, 12)
    console.log('Getting sound' + sound + '.mp3')
    var audio2 = new Audio(chrome.runtime.getURL(`sounds/scream${sound}.mp3`))
    audio2.onended = () => {
      console.log('Sound ended')
      audio = null
    }

    return audio2
  }

  return { scream, stop }
}

function randomSize(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function lerp(v0, v1, t) {
  return v0 * (1 - t) + v1 * t
}

// monkeypatch Web Audio
window.AudioContext = window.AudioContext || window.webkitAudioContext

// grab an audio context
audioContext = new AudioContext()

function enable() {
  img.style = ''
  // Attempt to get audio input
  try {
    // monkeypatch getUserMedia
    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia

    // ask for an audio input
    navigator.getUserMedia(
      {
        audio: {
          mandatory: {
            googEchoCancellation: 'false',
            googAutoGainControl: 'false',
            googNoiseSuppression: 'false',
            googHighpassFilter: 'false',
          },
          optional: [],
        },
      },
      gotStream,
      didntGetStream
    )
  } catch (e) {
    console.log('getUserMedia threw exception :' + e)
  }
}

function didntGetStream() {
  console.log('Stream generation failed.')
}

var mediaStreamSource = null

function gotStream(stream) {
  // Create an AudioNode from the stream.
  mediaStreamSource = audioContext.createMediaStreamSource(stream)

  // Create a new volume meter and connect it.
  meter = createAudioMeter(audioContext)
  mediaStreamSource.connect(meter)

  // kick off the visual updating
  drawLoop()
}

let timeout = null
function drawLoop(time) {
  if (meter.volume > 0.15) {
    scream(meter.volume)
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  } else {
    if (!timeout) {
      timeout = setTimeout(() => {
        stop()
      }, 1000)
    }
  }

  rafID = window.requestAnimationFrame(drawLoop)
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
  var processor = audioContext.createScriptProcessor(512)
  processor.onaudioprocess = volumeAudioProcess
  processor.clipping = false
  processor.lastClip = 0
  processor.volume = 0
  processor.clipLevel = clipLevel || 0.98
  processor.averaging = averaging || 0.95
  processor.clipLag = clipLag || 750

  // this will have no effect, since we don't copy the input to the output,
  // but works around a current Chrome bug.
  processor.connect(audioContext.destination)

  processor.checkClipping = function () {
    if (!this.clipping) return false
    if (this.lastClip + this.clipLag < window.performance.now())
      this.clipping = false
    return this.clipping
  }

  processor.shutdown = function () {
    this.disconnect()
    this.onaudioprocess = null
  }

  return processor
}

function volumeAudioProcess(event) {
  var buf = event.inputBuffer.getChannelData(0)
  var bufLength = buf.length
  var sum = 0
  var x

  // Do a root-mean-square on the samples: sum up the squares...
  for (var i = 0; i < bufLength; i++) {
    x = buf[i]
    if (Math.abs(x) >= this.clipLevel) {
      this.clipping = true
      this.lastClip = window.performance.now()
    }
    sum += x * x
  }

  // ... then take the square root of the sum.
  var rms = Math.sqrt(sum / bufLength)

  // Now smooth this out with the averaging factor applied
  // to the previous sample - take the max here because we
  // want "fast attack, slow release."
  this.volume = Math.max(rms, this.volume * this.averaging)
}

function debounce(func, wait, immediate) {
  var timeout, args, context, timestamp, result
  if (null == wait) wait = 100

  function later() {
    var last = Date.now() - timestamp

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last)
    } else {
      timeout = null
      if (!immediate) {
        result = func.apply(context, args)
        context = args = null
      }
    }
  }

  var debounced = function () {
    context = this
    args = arguments
    timestamp = Date.now()
    var callNow = immediate && !timeout
    if (!timeout) timeout = setTimeout(later, wait)
    if (callNow) {
      result = func.apply(context, args)
      context = args = null
    }

    return result
  }

  debounced.clear = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  debounced.flush = function () {
    if (timeout) {
      result = func.apply(context, args)
      context = args = null

      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

/*
https://freesound.org/people/redafs/sounds/348310/
https://freesound.org/people/TheSubber13/sounds/239900/
https://freesound.org/people/prucanada/sounds/415353/
https://freesound.org/people/adriancalzon/sounds/220619/
https://freesound.org/people/guamorims/sounds/391357/
https://freesound.org/people/Syna-Max/sounds/56901/
https://freesound.org/people/Lithe-Fider/sounds/9704/
https://freesound.org/people/GabrielaUPF/sounds/220291/
*/
