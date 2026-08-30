export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
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
  image_url?: string;
  dietary_tags: string[];
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

export interface Comment {
  id: string;
  recipe_id: string;
  user_name: string;
  message: string;
  created_at: string;
}