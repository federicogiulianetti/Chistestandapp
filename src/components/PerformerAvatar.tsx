import { comedianColor } from '@/lib/comedianColor'

/**
 * Avatar de comediante / elenco con el anillo de su color de identidad.
 * Si no hay foto, muestra la inicial sobre un fondo tenue del mismo color.
 * Server-component friendly (sin estado).
 */
export default function PerformerAvatar({
  name,
  photoUrl,
  size = 44,
}: {
  name: string
  photoUrl?: string | null
  size?: number
}) {
  const color = comedianColor(name)
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: `2px solid ${color}` }}
      />
    )
  }
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, border: `2px solid ${color}`, backgroundColor: color + '22', color, fontSize: size * 0.32 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
