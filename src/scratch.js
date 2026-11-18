import workletUrl from './scratch-worklet.js?url&no-inline'

/** DJ-style scrubbing through the decoded track (see scratch-worklet.js). */
export async function createScratcher() {
  const ctx = new AudioContext()
  await ctx.audioWorklet.addModule(workletUrl)
  const node = new AudioWorkletNode(ctx, 'scratch', { outputChannelCount: [2] })
  const gain = ctx.createGain()
  node.connect(gain).connect(ctx.destination)
  const at = (t) => t * ctx.sampleRate
  let generation = 0

  return {
    gain: gain.gain,
    /** Decodes in the background; until it finishes, scratching is silent. Detaches `bytes`. */
    // shortcut: holds the whole track as float PCM (~21MB/min stereo); decode a window around the cursor if memory matters.
    async load(bytes) {
      const mine = ++generation
      node.port.postMessage({ ch: null })
      const buf = await ctx.decodeAudioData(bytes)
      if (mine !== generation) return // a newer track was loaded meanwhile
      const ch = [0, 1].map((i) => buf.getChannelData(Math.min(i, buf.numberOfChannels - 1)).slice())
      node.port.postMessage({ ch }, ch.map((c) => c.buffer))
    },
    start(t) {
      ctx.resume()
      node.port.postMessage({ pos: at(t), target: at(t), active: true })
    },
    move: (t) => node.port.postMessage({ target: at(t) }),
    stop: () => node.port.postMessage({ active: false }),
  }
}
