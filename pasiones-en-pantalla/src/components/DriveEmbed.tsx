/**
 * Visor de Google Drive sin su barra superior: el botón "abrir en ventana nueva" vive dentro
 * del iframe (no se puede ocultar con CSS), así que el iframe se desplaza hacia arriba y el
 * contenedor recorta esa franja. Tampoco se permite la pantalla completa propia de Drive,
 * porque mostraría el iframe entero; quien lo usa ofrece su propio botón.
 */
export const DRIVE_TOOLBAR_PX = 64

export function DriveEmbed({ src, title, className = '' }: { src: string; title: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <iframe
        src={src}
        title={title}
        className="absolute inset-x-0 w-full border-0"
        style={{ top: -DRIVE_TOOLBAR_PX, height: `calc(100% + ${DRIVE_TOOLBAR_PX}px)` }}
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
