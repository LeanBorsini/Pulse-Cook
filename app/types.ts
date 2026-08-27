export interface Recipe {
  id: string;
  title_es: string;
  title_en?: string;
  description_es?: string;
  description_en?: string;
  instructions_es?: string;
  instructions_en?: string; 
  category: string;
  prep_time: number;
  servings: number;
  image_url?: string;
  youtube_url?: string;
  dietary_tags?: string[];
  created_at?: string;
}

export interface Ingredient {
  id?: string;
  recipe_id?: string;
  name_en?: string;
  name_es: string;
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