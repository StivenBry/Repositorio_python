import { asset } from '../lib/config'
import type { Playlist, Video } from '../types'

/**
 * Catálogo de ejemplo. Todas las imágenes y clips en /public/demo son originales
 * (generados para este proyecto), así que se pueden usar y publicar sin problemas.
 */
interface Seed {
  slug: string
  title: string
  category: string
  tags: string[]
  description: string
  age: string
  daysAgo: number
  featured?: boolean
  top10?: boolean
  exclusive?: boolean
  ribbon?: string
}

const SEEDS: Seed[] = [
  {
    slug: 'tierra-de-pasion',
    title: 'Tierra de Pasión',
    category: 'Novelas',
    tags: ['Drama', 'Relaciones familiares', 'Traición'],
    description:
      'En los valles de San Jacinto, tres hermanos se enfrentan por la herencia de la hacienda familiar mientras una mujer misteriosa llega para reclamar lo que su madre perdió. Amor, orgullo y traición bajo el mismo atardecer.',
    age: 'TV-14',
    daysAgo: 1,
    featured: true,
    top10: true,
    exclusive: true,
    ribbon: 'Nuevos episodios',
  },
  {
    slug: 'reina-del-barrio',
    title: 'Reina del Barrio',
    category: 'Series',
    tags: ['Acción', 'Drama', 'Poder'],
    description:
      'Lupe pasó de vender flores en la esquina a convertirse en la mujer más poderosa de la ciudad. Ahora tendrá que decidir cuánto está dispuesta a sacrificar para mantener su corona.',
    age: 'TV-MA',
    daysAgo: 3,
    featured: true,
    top10: true,
    ribbon: 'Nuevos episodios',
  },
  {
    slug: 'la-hacienda-del-silencio',
    title: 'La Hacienda del Silencio',
    category: 'Series',
    tags: ['Suspenso', 'Misterio', 'Drama'],
    description:
      'Cuando Elena regresa a la hacienda donde desapareció su hermana hace veinte años, descubre que todo el pueblo guarda el mismo secreto. Una serie de suspenso donde cada campanada revela una mentira.',
    age: 'TV-14',
    daysAgo: 5,
    featured: true,
    exclusive: true,
    ribbon: 'Estreno',
  },
  {
    slug: 'corazon-de-fuego',
    title: 'Corazón de Fuego',
    category: 'Novelas',
    tags: ['Romance', 'Melodrama', 'Pasión'],
    description:
      'Valentina, una chef apasionada, y Rodrigo, el heredero de un imperio hotelero, descubren que el amor también puede quemar. Entre secretos de familia y rivalidades, su historia arde capítulo a capítulo.',
    age: 'TV-14',
    daysAgo: 8,
    featured: true,
    top10: true,
  },
  {
    slug: 'mi-verdad-oculta',
    title: 'Mi verdad oculta',
    category: 'Series',
    tags: ['Drama', 'Suspenso', 'Identidad'],
    description:
      'Detrás de la vida perfecta de Camila se esconde una identidad falsa. Cuando un viejo amor reaparece en la gala más importante del año, las máscaras empiezan a caer.',
    age: 'TV-14',
    daysAgo: 10,
    top10: true,
    exclusive: true,
  },
  {
    slug: 'mariposas-de-medianoche',
    title: 'Mariposas de Medianoche',
    category: 'Series',
    tags: ['Misterio', 'Fantasía', 'Romance'],
    description:
      'Cada noche, en el pequeño pueblo de Santa Lucía, aparecen mariposas luminosas que anuncian un secreto. Sofía decide seguirlas sin imaginar lo que encontrará al final del bosque.',
    age: 'TV-14',
    daysAgo: 12,
    featured: true,
    ribbon: 'Estreno',
  },
  {
    slug: 'destinos-cruzados',
    title: 'Destinos Cruzados',
    category: 'Novelas',
    tags: ['Romance', 'Comedia romántica', 'Drama'],
    description:
      'Dos desconocidos intercambian por error sus maletas en el aeropuerto de Bogotá. Lo que empieza como una confusión se convierte en el encuentro que cambiará sus vidas para siempre.',
    age: 'TV-PG',
    daysAgo: 15,
    top10: true,
  },
  {
    slug: 'sangre-de-mi-sangre',
    title: 'Sangre de mi Sangre',
    category: 'Novelas',
    tags: ['Melodrama', 'Venganza', 'Relaciones familiares'],
    description:
      'Gemelas separadas al nacer crecen en mundos opuestos: una en la opulencia y otra en la pobreza. Cuando el destino las reúne, la venganza y el amor fraternal se disputan su corazón.',
    age: 'TV-14',
    daysAgo: 20,
    top10: true,
    exclusive: true,
  },
  {
    slug: 'amor-en-tiempos-de-tormenta',
    title: 'Amor en tiempos de Tormenta',
    category: 'Novelas',
    tags: ['Romance', 'Época', 'Melodrama'],
    description:
      'En un pueblo costero azotado por los huracanes, la hija del farero y un pescador forastero desafían a sus familias en una historia de amor que ni la peor tormenta puede apagar.',
    age: 'TV-PG',
    daysAgo: 26,
  },
  {
    slug: 'bajo-el-mismo-cielo',
    title: 'Bajo el mismo cielo',
    category: 'Películas',
    tags: ['Drama familiar', 'Migración', 'Esperanza'],
    description:
      'Separados por una frontera, una madre y su hijo se escriben cartas durante quince años con la promesa de volver a mirar juntos las estrellas. Una película sobre la esperanza y la familia.',
    age: 'TV-PG',
    daysAgo: 33,
  },
  {
    slug: 'el-ultimo-bolero',
    title: 'El último Bolero',
    category: 'Películas',
    tags: ['Musical', 'Romance', 'Clásico'],
    description:
      'Un cantante retirado recibe la oportunidad de dar un último concierto en el teatro donde conoció al amor de su vida. Una carta de amor a la música latinoamericana.',
    age: 'TV-G',
    daysAgo: 41,
  },
  {
    slug: 'raices',
    title: 'Raíces',
    category: 'Documentales',
    tags: ['Cultura', 'Música', 'Gastronomía'],
    description:
      'Un recorrido por las tradiciones, la música y los sabores que dan identidad a nuestros pueblos. Historias reales de quienes mantienen viva la memoria de su tierra.',
    age: 'TV-G',
    daysAgo: 55,
    exclusive: true,
  },
]

const DAY = 86_400_000

/** Lista de ejemplo para mostrar cómo se agrupan videos en el modo demo. */
const DEMO_PLAYLIST_ID = 'demo-maraton-romance'
const DEMO_PLAYLIST_ITEMS = ['corazon-de-fuego', 'destinos-cruzados', 'amor-en-tiempos-de-tormenta', 'el-ultimo-bolero']

export function buildDemoPlaylists(now = Date.now()): Playlist[] {
  const created = new Date(now - 2 * DAY).toISOString()
  return [
    {
      id: DEMO_PLAYLIST_ID,
      title: 'Maratón de romance',
      description: 'Cuatro historias de amor para ver de corrido.',
      cover_url: asset('demo/backdrops/corazon-de-fuego.webp'),
      cover_path: null,
      created_at: created,
      updated_at: created,
    },
  ]
}

export function buildDemoCatalog(now = Date.now()): Video[] {
  return SEEDS.map((s, i) => {
    const published = new Date(now - s.daysAgo * DAY - i * 3_600_000).toISOString()
    return {
      id: `demo-${s.slug}`,
      title: s.title,
      description: s.description,
      category: s.category,
      tags: s.tags,
      video_url: asset(`demo/videos/${s.slug}.mp4`),
      video_path: null,
      thumbnail_url: asset(`demo/posters/${s.slug}.webp`),
      thumbnail_path: null,
      backdrop_url: asset(`demo/backdrops/${s.slug}.webp`),
      backdrop_path: null,
      age_rating: s.age,
      ribbon: s.ribbon ?? null,
      duration_seconds: 16,
      is_featured: Boolean(s.featured),
      is_top10: Boolean(s.top10),
      is_exclusive: Boolean(s.exclusive),
      playlist_id: DEMO_PLAYLIST_ITEMS.includes(s.slug) ? DEMO_PLAYLIST_ID : null,
      playlist_position: DEMO_PLAYLIST_ITEMS.includes(s.slug) ? DEMO_PLAYLIST_ITEMS.indexOf(s.slug) + 1 : null,
      published_at: published,
      created_at: published,
      updated_at: published,
    }
  })
}
