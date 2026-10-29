import type { ReactNode } from 'react'
import { ADSENSE_CLIENT, ADSTERRA } from '../lib/config'
import { usePageTitle } from '../lib/usePageTitle'

const UPDATED = '29 de octubre de 2026'
const usesAdsterra = Boolean(ADSTERRA.popunder || ADSTERRA.socialBar || ADSTERRA.native || ADSTERRA.banner || ADSTERRA.smartlink)

export default function PrivacyPage() {
  usePageTitle('Política de privacidad')
  return (
    <div className="gutter pt-24 pb-10 lg:pt-32">
      <article className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">Legal</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">Política de privacidad</h1>
        <p className="mt-3 text-muted">Última actualización: {UPDATED}</p>

        <Section title="Qué datos se guardan en tu navegador">
          <p>
            Para que puedas usar <b>Mi lista</b>, <b>Continuar viendo</b> y recordar el volumen del reproductor, guardamos esa
            información en el almacenamiento local de tu navegador. No sale de tu dispositivo y puedes borrarla en cualquier
            momento desde la configuración del navegador.
          </p>
        </Section>

        <Section title="Cuentas">
          <p>
            Para ver el catálogo no necesitas registrarte. Solo los administradores inician sesión, mediante el servicio de
            autenticación de Supabase, que guarda su correo electrónico y una contraseña cifrada.
          </p>
        </Section>

        {ADSENSE_CLIENT && (
          <Section title="Publicidad (Google AdSense)">
            <p>
              Este sitio muestra anuncios de Google AdSense. Google y otros proveedores externos usan cookies para mostrar anuncios
              basados en tus visitas anteriores a este y a otros sitios web. Las cookies de publicidad permiten a Google y a sus
              socios mostrarte anuncios según tu navegación.
            </p>
            <p>
              Puedes desactivar la publicidad personalizada en{' '}
              <ExternalLink href="https://myadcenter.google.com/">Mi Centro de Anuncios de Google</ExternalLink> y conocer cómo usa
              Google la información en <ExternalLink href="https://policies.google.com/technologies/ads">Cómo usa Google las cookies en publicidad</ExternalLink>.
              También puedes rechazar las cookies de otros proveedores en{' '}
              <ExternalLink href="https://optout.aboutads.info/">aboutads.info</ExternalLink>.
            </p>
          </Section>
        )}

        {usesAdsterra && (
          <Section title="Publicidad (Adsterra)">
            <p>
              Este sitio muestra anuncios de Adsterra. Adsterra y sus anunciantes pueden usar cookies e identificadores similares
              para mostrar anuncios, limitar cuántas veces ves cada uno y medir su rendimiento. Algunos anuncios se abren en una
              pestaña o ventana nueva cuando haces clic en la página.
            </p>
            <p>
              Puedes bloquear o borrar esas cookies desde la configuración de tu navegador. Más información en la{' '}
              <ExternalLink href="https://adsterra.com/cookies/">política de cookies de Adsterra</ExternalLink>.
            </p>
          </Section>
        )}

        <Section title="Contenido de terceros">
          <p>
            Algunos videos pueden reproducirse desde YouTube, Vimeo o Google Drive. En esos casos se aplican las políticas de
            privacidad de esas plataformas.
          </p>
        </Section>

        <Section title="Proveedores">
          <p>
            El sitio se aloja en GitHub Pages y los videos, imágenes y datos del catálogo se guardan en Supabase. Como cualquier
            servidor web, estos proveedores pueden registrar datos técnicos de la conexión, como la dirección IP y el navegador,
            para operar y proteger el servicio.
          </p>
        </Section>

        <Section title="Cambios">
          <p>Si esta política cambia, publicaremos la nueva versión en esta página con su fecha de actualización.</p>
        </Section>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-white/80">{children}</div>
    </section>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
      {children}
    </a>
  )
}
