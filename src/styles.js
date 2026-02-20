export function getCommonStyles(theme) {
  const inputBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.12)';
  const bg = theme === 'dark' ? '#0f1418' : '#ffffff';
  const color = theme === 'dark' ? '#e6eef8' : '#0b1220';

  const input = {
    padding: '8px 10px',
    borderRadius: 6,
    border: inputBorder,
    width: '100%',
    maxWidth: 360,
    marginTop: 6,
    background: bg,
    color: color,
    outline: 'none',
    boxShadow: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  };

  const button = {
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: theme === 'dark' ? '#1f6feb' : '#0b5fff',
    color: '#fff',
    outline: 'none',
    boxShadow: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  };

  const ghostButton = {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.06)',
    cursor: 'pointer',
    background: 'transparent',
    color: theme === 'dark' ? '#9fb7ff' : '#0b5fff',
    outline: 'none',
    boxShadow: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  };

  const smallToggle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.06)',
    background: theme === 'dark' ? '#11161b' : '#ffffff',
    color: color,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'none',
  };

  return { input, button, ghostButton, smallToggle, bg, color };
}
