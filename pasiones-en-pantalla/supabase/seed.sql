-- =============================================================================
--  Pasiones en Pantalla · Datos de ejemplo (OPCIONAL)
--  Carga los 12 títulos de demostración. Las imágenes y clips viven en /public/demo
--  del propio sitio, por eso las URLs son relativas. Puedes borrarlos luego desde
--  el panel /admin. Ejecutar dos veces no duplica títulos.
-- =============================================================================

insert into public.videos
  (title, description, category, tags, video_url, thumbnail_url, backdrop_url,
   age_rating, ribbon, duration_seconds, is_featured, is_top10, is_exclusive, published_at)
select v.*
from (values
  ('Tierra de Pasión', 'En los valles de San Jacinto, tres hermanos se enfrentan por la herencia de la hacienda familiar mientras una mujer misteriosa llega para reclamar lo que su madre perdió. Amor, orgullo y traición bajo el mismo atardecer.', 'Novelas', array['Drama', 'Relaciones familiares', 'Traición'],
   '/demo/videos/tierra-de-pasion.mp4', '/demo/posters/tierra-de-pasion.webp', '/demo/backdrops/tierra-de-pasion.webp',
   'TV-14', 'Nuevos episodios', 16, true, true, true, now() - interval '1 days'),
  ('Reina del Barrio', 'Lupe pasó de vender flores en la esquina a convertirse en la mujer más poderosa de la ciudad. Ahora tendrá que decidir cuánto está dispuesta a sacrificar para mantener su corona.', 'Series', array['Acción', 'Drama', 'Poder'],
   '/demo/videos/reina-del-barrio.mp4', '/demo/posters/reina-del-barrio.webp', '/demo/backdrops/reina-del-barrio.webp',
   'TV-MA', 'Nuevos episodios', 16, true, true, false, now() - interval '3 days'),
  ('La Hacienda del Silencio', 'Cuando Elena regresa a la hacienda donde desapareció su hermana hace veinte años, descubre que todo el pueblo guarda el mismo secreto. Una serie de suspenso donde cada campanada revela una mentira.', 'Series', array['Suspenso', 'Misterio', 'Drama'],
   '/demo/videos/la-hacienda-del-silencio.mp4', '/demo/posters/la-hacienda-del-silencio.webp', '/demo/backdrops/la-hacienda-del-silencio.webp',
   'TV-14', 'Estreno', 16, true, false, true, now() - interval '5 days'),
  ('Corazón de Fuego', 'Valentina, una chef apasionada, y Rodrigo, el heredero de un imperio hotelero, descubren que el amor también puede quemar. Entre secretos de familia y rivalidades, su historia arde capítulo a capítulo.', 'Novelas', array['Romance', 'Melodrama', 'Pasión'],
   '/demo/videos/corazon-de-fuego.mp4', '/demo/posters/corazon-de-fuego.webp', '/demo/backdrops/corazon-de-fuego.webp',
   'TV-14', null, 16, true, true, false, now() - interval '8 days'),
  ('Mi verdad oculta', 'Detrás de la vida perfecta de Camila se esconde una identidad falsa. Cuando un viejo amor reaparece en la gala más importante del año, las máscaras empiezan a caer.', 'Series', array['Drama', 'Suspenso', 'Identidad'],
   '/demo/videos/mi-verdad-oculta.mp4', '/demo/posters/mi-verdad-oculta.webp', '/demo/backdrops/mi-verdad-oculta.webp',
   'TV-14', null, 16, false, true, true, now() - interval '10 days'),
  ('Mariposas de Medianoche', 'Cada noche, en el pequeño pueblo de Santa Lucía, aparecen mariposas luminosas que anuncian un secreto. Sofía decide seguirlas sin imaginar lo que encontrará al final del bosque.', 'Series', array['Misterio', 'Fantasía', 'Romance'],
   '/demo/videos/mariposas-de-medianoche.mp4', '/demo/posters/mariposas-de-medianoche.webp', '/demo/backdrops/mariposas-de-medianoche.webp',
   'TV-14', 'Estreno', 16, true, false, false, now() - interval '12 days'),
  ('Destinos Cruzados', 'Dos desconocidos intercambian por error sus maletas en el aeropuerto de Bogotá. Lo que empieza como una confusión se convierte en el encuentro que cambiará sus vidas para siempre.', 'Novelas', array['Romance', 'Comedia romántica', 'Drama'],
   '/demo/videos/destinos-cruzados.mp4', '/demo/posters/destinos-cruzados.webp', '/demo/backdrops/destinos-cruzados.webp',
   'TV-PG', null, 16, false, true, false, now() - interval '15 days'),
  ('Sangre de mi Sangre', 'Gemelas separadas al nacer crecen en mundos opuestos: una en la opulencia y otra en la pobreza. Cuando el destino las reúne, la venganza y el amor fraternal se disputan su corazón.', 'Novelas', array['Melodrama', 'Venganza', 'Relaciones familiares'],
   '/demo/videos/sangre-de-mi-sangre.mp4', '/demo/posters/sangre-de-mi-sangre.webp', '/demo/backdrops/sangre-de-mi-sangre.webp',
   'TV-14', null, 16, false, true, true, now() - interval '20 days'),
  ('Amor en tiempos de Tormenta', 'En un pueblo costero azotado por los huracanes, la hija del farero y un pescador forastero desafían a sus familias en una historia de amor que ni la peor tormenta puede apagar.', 'Novelas', array['Romance', 'Época', 'Melodrama'],
   '/demo/videos/amor-en-tiempos-de-tormenta.mp4', '/demo/posters/amor-en-tiempos-de-tormenta.webp', '/demo/backdrops/amor-en-tiempos-de-tormenta.webp',
   'TV-PG', null, 16, false, false, false, now() - interval '26 days'),
  ('Bajo el mismo cielo', 'Separados por una frontera, una madre y su hijo se escriben cartas durante quince años con la promesa de volver a mirar juntos las estrellas. Una película sobre la esperanza y la familia.', 'Películas', array['Drama familiar', 'Migración', 'Esperanza'],
   '/demo/videos/bajo-el-mismo-cielo.mp4', '/demo/posters/bajo-el-mismo-cielo.webp', '/demo/backdrops/bajo-el-mismo-cielo.webp',
   'TV-PG', null, 16, false, false, false, now() - interval '33 days'),
  ('El último Bolero', 'Un cantante retirado recibe la oportunidad de dar un último concierto en el teatro donde conoció al amor de su vida. Una carta de amor a la música latinoamericana.', 'Películas', array['Musical', 'Romance', 'Clásico'],
   '/demo/videos/el-ultimo-bolero.mp4', '/demo/posters/el-ultimo-bolero.webp', '/demo/backdrops/el-ultimo-bolero.webp',
   'TV-G', null, 16, false, false, false, now() - interval '41 days'),
  ('Raíces', 'Un recorrido por las tradiciones, la música y los sabores que dan identidad a nuestros pueblos. Historias reales de quienes mantienen viva la memoria de su tierra.', 'Documentales', array['Cultura', 'Música', 'Gastronomía'],
   '/demo/videos/raices.mp4', '/demo/posters/raices.webp', '/demo/backdrops/raices.webp',
   'TV-G', null, 16, false, false, true, now() - interval '55 days')
) as v (title, description, category, tags, video_url, thumbnail_url, backdrop_url,
        age_rating, ribbon, duration_seconds, is_featured, is_top10, is_exclusive, published_at)
where not exists (select 1 from public.videos x where x.title = v.title);
