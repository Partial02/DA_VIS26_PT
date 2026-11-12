// All sound is synthesized locally: no recordings, music files or external sound service.
export function createAmbientEngine() {
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.value = 0
  master.connect(context.destination)
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 620
  filter.Q.value = .35
  filter.connect(master)
  const sources: (OscillatorNode | AudioBufferSourceNode)[] = []
  const nodes: AudioNode[] = [master, filter]
  for (const [index, frequency] of [65.405, 98, 196].entries()) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = index === 2 ? 'triangle' : 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = index === 2 ? .035 : .12
    oscillator.connect(gain).connect(filter)
    oscillator.start()
    sources.push(oscillator); nodes.push(gain)
  }
  const buffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  const noise = context.createBufferSource()
  noise.buffer = buffer
  noise.loop = true
  const texture = context.createBiquadFilter()
  texture.type = 'bandpass'
  texture.frequency.value = 280
  texture.Q.value = .8
  const noiseGain = context.createGain()
  noiseGain.gain.value = .07
  noise.connect(texture).connect(noiseGain).connect(filter)
  noise.start()
  const drift = context.createOscillator()
  const depth = context.createGain()
  drift.frequency.value = .09
  depth.gain.value = 140
  drift.connect(depth).connect(filter.frequency)
  drift.start()
  sources.push(noise, drift); nodes.push(texture, noiseGain, depth)
  let suspendTimer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  return {
    async play() {
      clearTimeout(suspendTimer)
      await context.resume()
      if (!disposed) master.gain.setTargetAtTime(.3, context.currentTime, .35)
    },
    pause() {
      if (disposed) return
      clearTimeout(suspendTimer)
      master.gain.setTargetAtTime(0, context.currentTime, .08)
      suspendTimer = setTimeout(() => { if (!disposed) void context.suspend().catch(() => {}) }, 400)
    },
    dispose() {
      disposed = true
      clearTimeout(suspendTimer)
      sources.forEach(source => { source.stop(); source.disconnect() })
      nodes.forEach(node => node.disconnect())
      void context.close().catch(() => {})
    },
  }
}
