'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  /** Nombre del input hidden que se envía con el form */
  name: string
  /** URL inicial (si está editando) */
  defaultValue?: string | null
  /** Bucket de Supabase Storage donde se sube */
  bucket: string
  /** Carpeta dentro del bucket (opcional) */
  folder?: string
  /** Si está deshabilitado (no admin) */
  disabled?: boolean
}

export default function PhotoUpload({
  name,
  defaultValue,
  bucket,
  folder = '',
  disabled = false,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string>(defaultValue ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      return
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 5MB')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()

      // Generar nombre único para evitar colisiones
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = folder ? `${folder}/${fileName}` : fileName

      // Subir
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
      setPhotoUrl(data.publicUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir la imagen'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    setPhotoUrl('')
    setError(null)
  }

  return (
    <div className="space-y-3">
      {/* Input hidden que se envía con el form */}
      <input type="hidden" name={name} value={photoUrl} />

      {/* Preview de la foto actual */}
      {photoUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Foto del comediante"
            className="w-32 h-32 object-cover rounded-lg border border-line"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-600 text-body rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
              title="Quitar foto"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div className="w-32 h-32 bg-surface-2 border border-line rounded-lg flex items-center justify-center text-faint text-xs text-center px-2">
          Sin foto
        </div>
      )}

      {/* Botón de upload */}
      {!disabled && (
        <div>
          <label className="inline-block px-4 py-2 bg-surface-2 border border-line text-body rounded-md hover:bg-surface-2 transition cursor-pointer text-sm">
            {uploading ? 'Subiendo...' : photoUrl ? 'Cambiar foto' : 'Subir foto'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-faint mt-1">Imagen, máximo 5MB</p>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}