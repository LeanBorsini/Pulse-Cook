-- ==============================================================================
-- 🍳 PULSE&COOK — MIGRACIÓN SQL: SECCIÓN "TIPS & HACKS DE CHEF"
-- ==============================================================================
-- Instrucciones:
-- Copia y pega este script completo en el SQL Editor de tu proyecto Supabase y pulsa "Run".
-- Es 100% idempotente (se puede ejecutar múltiples veces sin provocar duplicados ni errores).
--
-- Autor principal y creador: leanBorsini (leoborsini12@gmail.com)
-- UUID: 1afb8de4-9294-4f57-af9f-dc50b3e6e768
-- ==============================================================================

-- 1. TABLA PRINCIPAL: chef_tips
create table if not exists public.chef_tips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_username text default 'Chef',
  title_es text not null,
  title_en text not null,
  summary_es text not null,
  summary_en text not null,
  content_es text,
  content_en text,
  category text not null, -- 'knife_skills', 'organization', 'heat_control', 'flavor_seasoning', 'shortcuts_conservation', 'baking'
  image_url text,
  read_time_seconds integer default 45,
  likes_count integer default 0,
  avg_rating numeric(3,1) default 5.0,
  ratings_count integer default 1,
  created_at timestamp with time zone default now()
);

-- 2. TABLA DE EXPERIENCIAS / COMENTARIOS DE LA COMUNIDAD: tip_experiences
create table if not exists public.tip_experiences (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.chef_tips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'Cocinero de casa',
  avatar_url text,
  comment text not null,
  photo_url text,
  created_at timestamp with time zone default now()
);

-- 3. TABLA DE VALORACIONES DE ESTRELLAS (1 a 5): tip_ratings
create table if not exists public.tip_ratings (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.chef_tips(id) on delete cascade,
  user_id text not null,
  stars integer not null check (stars >= 1 and stars <= 5),
  created_at timestamp with time zone default now(),
  constraint tip_ratings_user_tip_unique unique (tip_id, user_id)
);

-- 4. TABLA DE LIKES / UTILIDAD: tip_likes
create table if not exists public.tip_likes (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.chef_tips(id) on delete cascade,
  user_id text not null,
  created_at timestamp with time zone default now(),
  constraint tip_likes_user_tip_unique unique (tip_id, user_id)
);

-- 5. ÍNDICES DE RENDIMIENTO
create index if not exists idx_chef_tips_category on public.chef_tips(category);
create index if not exists idx_chef_tips_created_at on public.chef_tips(created_at desc);
create index if not exists idx_tip_experiences_tip_id on public.tip_experiences(tip_id);
create index if not exists idx_tip_ratings_tip_id on public.tip_ratings(tip_id);
create index if not exists idx_tip_likes_tip_id on public.tip_likes(tip_id);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
alter table public.chef_tips enable row level security;
alter table public.tip_experiences enable row level security;
alter table public.tip_ratings enable row level security;
alter table public.tip_likes enable row level security;

-- 7. POLÍTICAS DE ACCESO (RLS) PARA chef_tips
-- Lectura pública para todos
drop policy if exists "Lectura pública de chef_tips" on public.chef_tips;
create policy "Lectura pública de chef_tips"
  on public.chef_tips for select
  using (true);

-- Creación para usuarios autenticados
drop policy if exists "Inserción de tips para usuarios autenticados" on public.chef_tips;
create policy "Inserción de tips para usuarios autenticados"
  on public.chef_tips for insert
  with check (auth.role() = 'authenticated');

-- Edición permitida al autor original o al creador principal leanBorsini
drop policy if exists "Actualización de tips por autor o leanBorsini" on public.chef_tips;
create policy "Actualización de tips por autor o leanBorsini"
  on public.chef_tips for update
  using (
    auth.uid() = author_id 
    or auth.uid() = '1afb8de4-9294-4f57-af9f-dc50b3e6e768'::uuid
    or exists (
      select 1 from public.profiles 
      where id = auth.uid() and username = 'leanBorsini'
    )
  );

-- Eliminación permitida al autor original o al creador principal leanBorsini
drop policy if exists "Eliminación de tips por autor o leanBorsini" on public.chef_tips;
create policy "Eliminación de tips por autor o leanBorsini"
  on public.chef_tips for delete
  using (
    auth.uid() = author_id 
    or auth.uid() = '1afb8de4-9294-4f57-af9f-dc50b3e6e768'::uuid
    or exists (
      select 1 from public.profiles 
      where id = auth.uid() and username = 'leanBorsini'
    )
  );

-- 8. POLÍTICAS DE ACCESO PARA tip_experiences (COMENTARIOS)
drop policy if exists "Lectura pública de tip_experiences" on public.tip_experiences;
create policy "Lectura pública de tip_experiences"
  on public.tip_experiences for select
  using (true);

drop policy if exists "Inserción comunitaria de tip_experiences" on public.tip_experiences;
create policy "Inserción comunitaria de tip_experiences"
  on public.tip_experiences for insert
  with check (true);

-- 9. POLÍTICAS DE ACCESO PARA tip_ratings Y tip_likes
drop policy if exists "Lectura pública de tip_ratings" on public.tip_ratings;
create policy "Lectura pública de tip_ratings"
  on public.tip_ratings for select
  using (true);

drop policy if exists "Escritura comunitaria de tip_ratings" on public.tip_ratings;
create policy "Escritura comunitaria de tip_ratings"
  on public.tip_ratings for all
  using (true)
  with check (true);

drop policy if exists "Lectura pública de tip_likes" on public.tip_likes;
create policy "Lectura pública de tip_likes"
  on public.tip_likes for select
  using (true);

drop policy if exists "Escritura comunitaria de tip_likes" on public.tip_likes;
create policy "Escritura comunitaria de tip_likes"
  on public.tip_likes for all
  using (true)
  with check (true);

-- ==============================================================================
-- 10. POBLACIÓN INICIAL DE TIPS CURADOS POR @leanBorsini
-- ==============================================================================
insert into public.chef_tips (
  author_id, author_username, title_es, title_en, summary_es, summary_en, 
  content_es, content_en, category, image_url, read_time_seconds, likes_count, avg_rating, ratings_count
)
values
  -- Cuchillos & Utensilios
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'La regla del trapo húmedo bajo la tabla',
    'The damp towel rule under your cutting board',
    'Nunca piques sobre una tabla que se tambalea. Coloca un paño de cocina húmedo o papel absorbente debajo para fijarla al instante.',
    'Never chop on a wobbling cutting board. Place a damp kitchen towel or paper towel underneath to anchor it instantly.',
    'Una tabla inestable es la principal causa de accidentes domésticos con cuchillos. Al presionar sobre una superficie que desliza, la hoja pierde tracción y resbala hacia tus dedos. Un trapo húmedo crea succión natural por fricción y deja tu estación 100% segura en 2 segundos.',
    'An unstable cutting board is the leading cause of home kitchen knife accidents. A damp cloth creates natural friction suction and locks your station firmly in place in seconds.',
    'knife_skills',
    'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&auto=format&fit=crop&q=80',
    35, 24, 4.9, 18
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'El agarre de pinza (Pinch Grip)',
    'The chef pinch grip technique',
    'Olvida agarrar solo el mango: pinza la base de la hoja con el pulgar y el índice. Multiplicarás tu control, equilibrio y velocidad al cortar.',
    'Forget holding just the handle: pinch the blade base with thumb and index finger. You will multiply control, balance, and speed.',
    'Sostener el cuchillo exclusivamente por el mango crea un punto de palanca débil y cansa la muñeca rápidamente. Al "pinzar" el talón de la hoja metálica con tu pulgar y el lateral del dedo índice, el cuchillo se convierte en una extensión natural de tu antebrazo.',
    'Holding the knife solely by its handle causes wrist fatigue. Pinching the blade heel turns the knife into an extension of your forearm for effortless precision.',
    'knife_skills',
    'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&auto=format&fit=crop&q=80',
    45, 19, 4.8, 14
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'El mito del cuchillo afilado es peligroso',
    'The myth: sharp knives are dangerous',
    'Un cuchillo desafilado es el que corta dedos: exige fuerza excesiva y resbala. Un filo vivo responde dócilmente con presión mínima.',
    'A dull knife is what cuts fingers: it requires brute force and slips. A sharp blade responds smoothly with minimal pressure.',
    'Cuando un cuchillo no tiene filo, tienes que ejercer presión hacia abajo sobre pieles duras (como tomates o pimientos). En ese esfuerzo la hoja salta sin control. Con un cuchillo afilado, basta el propio peso del cuchillo y un movimiento de balanceo suave.',
    'With a dull knife you exert heavy downward pressure, causing it to slip across skins like tomatoes. A truly sharp blade glides purely on its own weight and gentle motion.',
    'knife_skills',
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    40, 31, 5.0, 22
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'Dile adiós al prensador de ajos',
    'Say goodbye to the garlic press',
    'La técnica del aplastado con el lateral de la hoja y una pizca de sal gruesa crea pasta de ajo sedosa en 15 segundos sin lavar utensilios imposibles.',
    'Crushing garlic with the side of your knife blade and coarse salt creates a silky garlic paste in 15 seconds without hard-to-clean presses.',
    'Los prensadores de ajo dejan la mitad del producto atrapado en agujeros imposibles de lavar. Pela el diente, colócale una pizca de sal marina (que actúa como abrasivo mecánico natural) y arrastra el lateral plano del cuchillo varias veces en 45 grados. Obtendrás una emulsión aromática lista para salsas.',
    'Garlic presses trap half the garlic. Flatten a peeled clove with your knife side, sprinkle coarse salt as a natural micro-abrasive, and scrape down. Silky, fragrant garlic paste.',
    'knife_skills',
    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80',
    40, 27, 4.9, 19
  ),

  -- Organización y Espacio (Mise en Place)
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'El contenedor de desperdicios en tu tabla',
    'The prep waste bowl right beside your board',
    'Ten un bol mediano al lado exclusivo para cáscaras y tallos. Evitarás 15 viajes al cubo de basura y mantendrás tu tabla 100% limpia.',
    'Keep a bowl next to your board solely for peelings and scraps. You will avoid 15 trips to the trash can and keep your board spotless.',
    'El desorden mental en la cocina empieza cuando la tabla se llena de hojas de cebolla, cáscaras y semillas. Al arrojar cada desecho a un tazón dedicado en tu misma estación de trabajo, tu tabla permanece despejada y cocinas con fluidez de restaurante.',
    'Clutter creates stress. Throwing peels and ends into a dedicated counter bowl keeps your work surface free, hygienic, and restaurant-ready.',
    'organization',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
    35, 28, 4.9, 20
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'A.B.C: Always Be Cleaning (Limpia mientras cocinas)',
    'A.B.C: Always Be Cleaning as you go',
    '¿La cebolla tarda 5 minutos en pocharse? Lava la tabla y el bol. Llegar a la mesa sin una montaña de vajilla sucia cambia tu experiencia culinaria.',
    'Onions simmering for 5 minutes? Wash your board and knife. Sitting down to eat with an empty sink transforms your cooking experience.',
    'El secreto de los cocineros profesionales no es fregar al final: es aprovechar los tiempos muertos de hervor y cocción lenta para enjuagar herramientas inmediatamente. Los restos frescos se quitan con agua en 3 segundos; si se secan, requieren 10 minutos de remojo.',
    'Fresh food residues wash away in 3 seconds. Dried-on residue takes minutes of scrubbing. Use idle simmering windows to keep your sink clear.',
    'organization',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
    40, 36, 5.0, 27
  ),

  -- Manejo del Fuego
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'El sartén habla: aprende a escuchar el chillido',
    'Listen to the sizzle: the pan talks',
    'Añadir comida a un sartén tibio hace que absorba grasa y se pegue. Espera a que el aceite brille suavemente y emita un crepitar vivo al contacto.',
    'Putting ingredients into a warm pan makes them absorb oil and stick. Wait until oil shimmers and produces a confident sizzle on contact.',
    'El sonido del sellado es agua vaporizándose instantáneamente bajo el alimento, creando un micro-colchón de vapor que impide que las proteínas se adhieran al metal. Si al echar el filete no hay ruido, retíralo y calienta el sartén 1 minuto más.',
    'The sizzle is moisture flash-steaming, lifting the food and preventing sticking. Silence on contact means your pan is too cold: pull it back and heat up.',
    'heat_control',
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80',
    40, 26, 4.9, 21
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'No abarrotes el sartén (La regla del espacio)',
    'Do not overcrowd the pan (The spacing rule)',
    'Si saturas la superficie, los ingredientes liberan vapor y se hierven en lugar de dorarse. Deja al menos 25% de espacio libre o cocina en 2 tandas.',
    'Crowding the pan traps moisture, causing food to steam rather than brown. Leave at least 25% open space or cook in batches.',
    'Para que ocurra el dorado caramelizado (reacción de Maillard), la temperatura del fondo debe mantenerse por encima de 140°C. Si llenas el sartén hasta el borde, el calor cae en picada y los champiñones o carne nadarán en agua grisácea.',
    'For true caramelization, pan surface must stay above 140°C. Overcrowding drops heat drastically, resulting in gray steamed mushrooms or stewed meat.',
    'heat_control',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    40, 29, 4.9, 23
  ),

  -- Sabor y Sazón
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'Si a tu plato le falta algo, no es sal: es ÁCIDO',
    'When your dish lacks something, it needs ACID, not salt',
    '¿La sopa o salsa sabe "plana" y pesada? Unas gotas de limón o vinagre de jerez cortan la grasa y encienden los sabores apagados al instante.',
    'Does your soup or sauce feel heavy or flat? A squeeze of lemon or sherry vinegar cuts through fat and awakens dormant flavors immediately.',
    'El ácido estimula la salivación en las papilas gustativas laterales, haciendo que percibas todos los demás sabores con nitidez. Antes de añadir una tercera cucharadita de sal, prueba con media cucharadita de vinagre de manzana o zumo de lima.',
    'Acids trigger salivary response, heightening perception of sweetness and umami. Before dumping more salt, balance heavy stews with citrus or vinegar.',
    'flavor_seasoning',
    'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800&auto=format&fit=crop&q=80',
    45, 41, 5.0, 34
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'El oro líquido de los amantes de la pasta',
    'The liquid gold: pasta cooking water',
    'Nunca escurras la pasta directo al desagüe: reserva media taza de agua de cocción. Su almidón gelatinizado emulsiona salsas sedosas y brillantes.',
    'Never dump pasta water down the sink: save half a cup. Its gelatinized starches emulsify fatty sauces into glossy restaurant perfection.',
    '¿Por qué en los restaurantes italianos la salsa se abraza al fideo y en casa queda en el fondo del plato? El agua de pasta rica en almidón actúa como ligante entre las grasas del aceite o mantequilla y el tomate o queso (mantecatura).',
    'Why do Italian sauces coat noodles like silk? Pasta starch bonds fats and liquids into a creamy, glossy emulsion without needing heavy cream.',
    'flavor_seasoning',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
    45, 38, 5.0, 31
  ),

  -- Conservación y Atajos
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'Las hierbas frescas se tratan como flores',
    'Treat fresh tender herbs like cut flowers',
    'Corta 1 cm del tallo de cilantro o perejil, ponlos en un vaso con 2 dedos de agua en la puerta del refrigerador y cúbrelos con una bolsa holgada.',
    'Trim cilantro and parsley stems, place them in a glass with an inch of water in your fridge door, and loosely cover with a plastic bag.',
    'En plástico cerrado sudan y se pudren en 4 días; secas se marchitan en 2. Manteniendo sus tallos hidratados como un ramo de flores, permanecen turgentes, verdes y aromáticas hasta por 3 semanas completas.',
    'Sealed bags rot herbs in 4 days. Storing stems in water with loose air circulation keeps them crisp, vibrant, and fragrant for up to 3 weeks.',
    'shortcuts_conservation',
    'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=800&auto=format&fit=crop&q=80',
    40, 35, 4.9, 26
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'Los tomates nunca van en el refrigerador',
    'Tomatoes never belong in the refrigerator',
    'El frío por debajo de 12°C destruye las enzimas aromáticas y vuelve la pulpa harinosa. Mantenlos a temperatura ambiente boca abajo.',
    'Cold below 12°C deactivates flavor-producing enzymes and makes texture mealy. Store them at room temperature stem-side down.',
    'El compuesto que da el característico olor a tomate maduro (Z-3-hexenal) se desactiva permanentemente en frío. Guárdalos en una frutera y sólo refrigéralos si ya han sido cortados o si están excesivamente maduros.',
    'Refrigeration suppresses volatile aroma synthesis in fresh tomatoes. Keep them counter-side to savor sweet acidity and firm texture.',
    'shortcuts_conservation',
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    40, 33, 4.8, 25
  ),

  -- Repostería
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'La repostería es química: usa báscula gramera',
    'Baking is chemistry: always use a gram scale',
    'Una "taza" de harina puede pesar entre 110g y 160g según cómo la compactes. Pesar en gramos garantiza bizcochos esponjosos siempre.',
    'A "cup" of flour can weigh anywhere from 110g to 160g depending on packing. Digital gram scales guarantee fluffy cakes every single time.',
    'En cocina salada improvisar funciona; en repostería la proporción harina-grasa-azúcar-líquido determina la formación de gluten y leudado. Una báscula digital cuesta muy poco y revoluciona tus resultados de horneado.',
    'Cooking is art; baking is precision chemistry. Cup measurements fluctuate drastically. A simple kitchen scale guarantees consistent perfection.',
    'baking',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    45, 39, 5.0, 32
  ),
  (
    '1afb8de4-9294-4f57-af9f-dc50b3e6e768', 'leanBorsini',
    'Ingredientes a temperatura ambiente significan EXACTAMENTE eso',
    'Room temperature ingredients mean EXACTLY that',
    'Huevos o leche fríos cortan la emulsión de mantequilla batida con azúcar. Sácalos 45 minutos antes o entibia los huevos en agua templada.',
    'Cold eggs or milk curdle creamed butter and sugar emulsions. Pull them out 45 minutes ahead or warm eggs in lukewarm water for 5 minutes.',
    'Cuando bates mantequilla y azúcar atrapas microburbujas de aire. Si agregas un huevo a 4°C, solidificas la grasa al instante y la mezcla se corta, perdiendo aire y arruinando la miga esponjosa.',
    'Creamed butter traps air. Cold liquids coagulate milk fats instantly, causing splits and resulting in dense, sunken baked goods.',
    'baking',
    'https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=800&auto=format&fit=crop&q=80',
    45, 23, 4.8, 18
  )
on conflict do nothing;
