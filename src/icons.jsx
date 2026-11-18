// Media glyphs Octicons lacks; same API as octicons (size prop, currentColor) so IconButton accepts them.
const glyph = (d) =>
  function Glyph({ size = 16 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
        <path d={d} />
      </svg>
    )
  }

export const PlayGlyph = glyph('M4 2.5v11a.5.5 0 0 0 .76.43l9-5.5a.5.5 0 0 0 0-.86l-9-5.5A.5.5 0 0 0 4 2.5Z')
export const PauseGlyph = glyph('M3.5 2h3v12h-3zM9.5 2h3v12h-3z')
export const PrevGlyph = glyph('M3 2h2v12H3zM13.24 2.07a.5.5 0 0 1 .76.43v11a.5.5 0 0 1-.76.43L5.5 8.5a.6.6 0 0 1 0-1Z')
export const NextGlyph = glyph('M11 2h2v12h-2zM2.76 2.07A.5.5 0 0 0 2 2.5v11a.5.5 0 0 0 .76.43L10.5 8.5a.6.6 0 0 0 0-1Z')
