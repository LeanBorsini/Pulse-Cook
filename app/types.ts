/**
 * Representación de los idiomas admitidos en la interfaz y en el motor de traducción.
 * Las variantes en minúsculas y mayúsculas se normalizan internamente a 'ES' | 'EN'.
 */
export type Language = 'es' | 'en' | 'ES' | 'EN';

/**
 * Perfil público del autor de una receta (asociado a la tabla `profiles` de Supabase).
 */
export interface Profile {
  /** Identificador único del perfil (mismo ID que auth.users de Supabase) */
  id: string;
  /** Nombre público o alias culinario del usuario */
  username: string;
  /** Enlace opcional a la imagen de avatar del perfil */
  avatar_url?: string;
}

/**
 * Enlace externo a un video explicativo de la receta (ej. YouTube, Vimeo, TikTok, etc.).
 */
export interface VideoLink {
  /** Identificador único local o de base de datos */
  id: string;
  /** Título o descripción del video (ej. "Técnica de corte en juliana") */
  title: string;
  /** URL directa al video */
  url: string;
}

/**
 * Valoración numérica asignada por un usuario a una receta específica.
 */
export interface Rating {
  /** Identificador único de la calificación */
  id: string;
  /** Identificador de la receta calificada */
  recipe_id: string;
  /** Identificador del usuario que emite la valoración */
  user_id: string;
  /** Puntuación en escala de 1 a 5 estrellas */
  stars: number;
  /** Fecha ISO de creación de la calificación */
  created_at?: string;
}

/**
 * Comentario u opinión comunitaria dejado en una receta.
 */
export interface Comment {
  /** Identificador único del comentario */
  id: string;
  /** Identificador de la receta sobre la que se comenta */
  recipe_id: string;
  /** Identificador opcional del usuario autor del comentario */
  user_id?: string;
  /** Nombre legible o alias del autor */
  user_name: string;
  /** URL opcional al avatar del autor */
  avatar_url?: string;
  /** Texto del comentario */
  message: string;
  /** Marca de tiempo ISO de publicación */
  created_at: string;
}

/**
 * Modelo central de datos de una Receta en Pulse&Cook.
 * Diseñado con soporte bilingüe nativo para títulos, descripciones e instrucciones.
 */
export interface Recipe {
  /** Identificador único de la receta (UUID o ID generado localmente) */
  id: string;
  /** Identificador del autor creador de la receta */
  user_id?: string;
  /** Nombre del autor/creador (opcional para recetas de terceros o con autor específico) */
  author_name?: string;
  /** Perfil enriquecido del autor obtenido mediante JOIN con profiles */
  profiles?: Profile | null;
  /** Título de la receta en español */
  title_es: string;
  /** Título de la receta en inglés */
  title_en: string;
  /** Categoría culinaria (ej. Desayuno, Almuerzo / Cena, Postres, Bebidas, etc.) */
  category: string;
  /** Tiempo estimado de preparación y cocción en minutos */
  prep_time: number;
  /** Número de raciones o porciones que rinde la preparación */
  servings: number;
  /** Breve descripción o resumen introductorio en español */
  description_es: string;
  /** Breve descripción o resumen introductorio en inglés */
  description_en: string;
  /** Instrucciones paso a paso detalladas en español */
  instructions_es?: string;
  /** Instrucciones paso a paso detalladas en inglés */
  instructions_en?: string;
  /** URL principal de video en YouTube (compatible con embed automático) */
  youtube_url?: string;
  /** Lista de enlaces de video secundarios o alternativos */
  video_links?: VideoLink[];
  /** Imagen de portada principal de la receta */
  image_url?: string;
  /** Galería de hasta 3 imágenes ilustrativas de la preparación */
  images?: string[];
  /** Etiquetas dietéticas y descriptivas (ej. Sin Gluten, Vegano, Rápido, Alto en Proteínas) */
  dietary_tags: string[];
  /** Promedio acumulado de calificaciones (1.0 a 5.0) */
  avg_rating?: number;
  /** Conteo total de personas que han calificado la receta */
  ratings_count?: number;
  /** Calificación específica otorgada por el usuario autenticado actual */
  user_rating?: number;
  /** Información nutricional orientativa estimada por ración */
  nutrition_info?: NutritionInfo;
  /** Marca de tiempo ISO de creación de la receta */
  created_at?: string;
}

/**
 * Valores nutricionales orientativos calculados por ración/porción.
 */
export interface NutritionInfo {
  /** Calorías aproximadas por ración (kcal) */
  calories: number;
  /** Proteínas estimadas en gramos (g) */
  protein: number;
  /** Carbohidratos estimados en gramos (g) */
  carbs: number;
  /** Grasas totales estimadas en gramos (g) */
  fat: number;
  /** Fibra dietética en gramos (g) (opcional) */
  fiber?: number;
  /** Resumen o comentario del perfil nutricional */
  summary?: string;
  /** Confirmación de que es un valor estimado */
  is_estimated?: boolean;
  /** Timestamp de cálculo */
  calculated_at?: string;
}

/**
 * Ingrediente cuantificable asociado a una receta.
 */
export interface Ingredient {
  /** Identificador único opcional en base de datos */
  id?: string;
  /** Identificador de la receta a la que pertenece */
  recipe_id?: string;
  /** Nombre del ingrediente en español */
  name_es: string;
  /** Nombre del ingrediente en inglés (opcional) */
  name_en?: string;
  /** Cantidad numérica del ingrediente (ej. 250, 2, 0.5) */
  amount: number;
  /** Unidad de medida normalizada (ej. g, kg, ml, L, cda, cdta, und, taza) */
  unit: string;
  /** Pasillo o sección del supermercado sugerida para la lista de compras */
  aisle?: string;
}

/**
 * Categorías temáticas para los Tips & Hacks de Chef.
 */
export type TipCategoryKey =
  | 'knife_skills'
  | 'organization'
  | 'heat_control'
  | 'flavor_seasoning'
  | 'shortcuts_conservation'
  | 'baking';

/**
 * Entrada de micro-contenido en la sección "Tips & Hacks de Chef".
 * Diseñada para lectura rápida (30-60 seg) con trucos profesionales para cocinar en casa.
 */
export interface ChefTip {
  /** Identificador único del tip (UUID en Supabase o ID local) */
  id: string;
  /** Identificador del autor en profiles / auth.users */
  author_id?: string;
  /** Perfil enriquecido del autor obtenido de profiles */
  profiles?: Profile | null;
  /** Alias legible del autor si profiles no está disponible */
  author_username?: string;
  /** Título directo e impactante en español */
  title_es: string;
  /** Título directo en inglés */
  title_en: string;
  /** Resumen o truco conciso (2-3 oraciones) en español */
  summary_es: string;
  /** Resumen o truco conciso en inglés */
  summary_en: string;
  /** Explicación o detalle científico ampliado en español */
  content_es?: string;
  /** Explicación o detalle científico ampliado en inglés */
  content_en?: string;
  /** Categoría temática del hack */
  category: TipCategoryKey;
  /** URL de imagen o ilustración demostrativa */
  image_url?: string;
  /** Tiempo de lectura estimado en segundos (ej. 30, 45, 60) */
  read_time_seconds?: number;
  /** Contador acumulado de likes / utilidad */
  likes_count: number;
  /** Indica si el usuario actual ha marcado este tip como útil / like */
  user_liked?: boolean;
  /** Calificación media de 1 a 5 estrellas */
  avg_rating?: number;
  /** Total de valoraciones recibidas */
  ratings_count?: number;
  /** Calificación individual otorgada por el usuario actual (1-5) */
  user_rating?: number;
  /** Contador de comentarios / experiencias de la comunidad */
  experiences_count?: number;
  /** Alias para contador de comentarios */
  comments_count?: number;
  /** Fecha ISO de publicación */
  created_at?: string;
}

/**
 * Comentario o experiencia compartida por un usuario sobre un tip de chef.
 */
export interface TipExperience {
  /** Identificador único de la experiencia */
  id: string;
  /** Identificador del tip al que pertenece */
  tip_id: string;
  /** Identificador del usuario que comenta */
  user_id?: string;
  /** Nombre o alias de quien comenta */
  author_name: string;
  /** Avatar opcional del autor */
  avatar_url?: string;
  /** Mensaje de la experiencia o prueba realizada en casa */
  comment: string;
  /** URL de foto demostrativa opcional subida por el usuario */
  photo_url?: string;
  /** Marca de tiempo ISO */
  created_at: string;
}

/**
 * Puntuación individual por estrellas (1 a 5) dada a un tip.
 */
export interface TipRating {
  id?: string;
  tip_id: string;
  user_id: string;
  stars: number;
  created_at?: string;
}

