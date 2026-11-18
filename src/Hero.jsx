import { PauseGlyph, PlayGlyph } from './icons.jsx'

/** Dark banner shared by track/playlist/user pages: blurred backdrop, content left, picture right. */
export default function Hero({ label, backdrop, image, round, children }) {
  return (
    <section className="hero" data-color-mode="dark" data-dark-theme="dark" aria-label={label}>
      {backdrop && <div className="hero-bg" style={{ backgroundImage: `url("${backdrop}")` }} />}
      <div className="hero-body">
        <div className="hero-main">{children}</div>
        {image !== undefined &&
          (image ? (
            <img className={`hero-art${round ? ' hero-art-round' : ''}`} src={image} alt="" />
          ) : (
            <div className="hero-art" />
          ))}
      </div>
    </section>
  )
}

/** Big orange play button + artist/title pills + right-aligned meta, like a soundcloud.com track header. */
export function HeroHead({ playing, onPlay, sub, onSub, title, meta }) {
  return (
    <div className="hero-head">
      {onPlay && (
        <button type="button" className="big-play" aria-label={playing ? '一時停止' : '再生'} onClick={onPlay}>
          {playing ? <PauseGlyph size={24} /> : <PlayGlyph size={24} />}
        </button>
      )}
      <div className="hero-titles">
        {sub &&
          (onSub ? (
            <button type="button" className="hero-pill hero-artist linkish" onClick={onSub}>
              {sub}
            </button>
          ) : (
            <span className="hero-pill hero-artist">{sub}</span>
          ))}
        <h1 className="hero-pill hero-title">{title}</h1>
      </div>
      {meta && <div className="hero-meta">{meta}</div>}
    </div>
  )
}
