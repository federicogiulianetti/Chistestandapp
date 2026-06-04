// src/components/MapPreview.tsx
"use client";

type MapPreviewProps = {
  query: string;        // dirección o nombre del lugar
  className?: string;
};

export default function MapPreview({ query, className }: MapPreviewProps) {
  const q = query?.trim();
  // Si todavía no hay dirección cargada, no mostramos nada
  if (!q) return null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(q)}&zoom=16`;

  return (
    <div className={`overflow-hidden rounded-xl border border-zinc-700 ${className ?? ""}`}>
      <iframe
        title="Ubicación del teatro"
        src={src}
        width="100%"
        height="200"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}