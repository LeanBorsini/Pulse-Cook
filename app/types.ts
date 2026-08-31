export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface VideoLink {
  id: string;
  title: string;
  url: string;
}

export interface Rating {
  id: string;
  recipe_id: string;
  user_id: string;
  stars: number; // 1 to 5
  created_at?: string;
}

export interface Comment {
  id: string;
  recipe_id: string;
  user_id?: string;
  user_name: string;
  avatar_url?: string;
  message: string;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id?: string;
  profiles?: Profile | null;
  title_es: string;
  title_en: string;
  category: string;
  prep_time: number;
  servings: number;
  description_es: string;
  description_en: string;
  instructions_es?: string;
  instructions_en?: string;
  youtube_url?: string;
  video_links?: VideoLink[];
  image_url?: string;
  images?: string[];
  dietary_tags: string[];
  avg_rating?: number;
  ratings_count?: number;
  user_rating?: number; // Calificación dada por el usuario actual
  created_at?: string;
}

export interface Ingredient {
  id?: string;
  recipe_id?: string;
  name_es: string;
  name_en?: string;
  amount: number;
  unit: string;
  aisle?: string;
}
