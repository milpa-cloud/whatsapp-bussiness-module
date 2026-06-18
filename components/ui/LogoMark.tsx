export default function LogoMark({
  size = 18,
  color = 'currentColor',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x={0}  y={7}  width={4} height={11} rx={2} fill={color} />
      <rect x={7}  y={0}  width={4} height={18} rx={2} fill={color} />
      <rect x={14} y={11} width={4} height={7}  rx={2} fill={color} />
    </svg>
  )
}
