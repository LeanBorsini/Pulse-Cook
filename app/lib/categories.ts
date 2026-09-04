/**
 * @file categories.ts
 * @description Catálogo estandarizado de categorías gastronómicas bilingüe (ES/EN).
 * Proporciona claves fijas, etiquetas uniformes y un normalizador inteligente
 * para corregir errores tipográficos comunes o variantes históricas (e.g. "plato fuerte", "Prinles", "almuerzo").
 */

export interface RecipeCategory {
  id: string;
  label_es: string;
  label_en: string;
  iconName?: string;
  aliases: string[];
}

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  {
    id: 'main_dish',
    label_es: 'Plato Principal',
    label_en: 'Main Dish',
    aliases: [
      'plato principal',
      'platos principales',
      'principal',
      'principales',
      'plato fuerte',
      'platos fuertes',
      'fuerte',
      'main dish',
      'main dishes',
      'main course',
      'mains',
      'almuerzo',
      'cena',
      'dinner',
      'lunch',
      'almuerzo / cena',
      'lunch / dinner',
      'prinles',
      'segundo plato',
      'segundo',
    ],
  },
  {
    id: 'appetizer',
    label_es: 'Entrada / Aperitivo',
    label_en: 'Appetizer & Starter',
    aliases: [
      'entrada',
      'entradas',
      'aperitivo',
      'aperitivos',
      'appetizer',
      'appetizers',
      'starter',
      'starters',
      'primer plato',
      'entremes',
      'entremeses',
    ],
  },
  {
    id: 'salad',
    label_es: 'Ensalada',
    label_en: 'Salad',
    aliases: [
      'ensalada',
      'ensaladas',
      'salad',
      'salads',
      'vegetales frescos',
    ],
  },
  {
    id: 'pasta_rice',
    label_es: 'Pasta / Arroz',
    label_en: 'Pasta & Rice',
    aliases: [
      'pasta',
      'pastas',
      'arroz',
      'arroces',
      'fideo',
      'fideos',
      'rice',
      'noodles',
      'spaghetti',
      'pasta & rice',
      'risotto',
    ],
  },
  {
    id: 'soup',
    label_es: 'Sopa / Crema',
    label_en: 'Soup & Stew',
    aliases: [
      'sopa',
      'sopas',
      'crema',
      'cremas',
      'caldo',
      'caldos',
      'guiso',
      'guisos',
      'soup',
      'soups',
      'stew',
      'stews',
      'potaje',
    ],
  },
  {
    id: 'breakfast',
    label_es: 'Desayuno / Brunch',
    label_en: 'Breakfast & Brunch',
    aliases: [
      'desayuno',
      'desayunos',
      'brunch',
      'breakfast',
      'merienda',
      'tostada',
      'tostadas',
      'hotcakes',
      'pancakes',
    ],
  },
  {
    id: 'side_dish',
    label_es: 'Guarnición',
    label_en: 'Side Dish',
    aliases: [
      'guarnicion',
      'guarnición',
      'guarniciones',
      'acompañamiento',
      'acompanamiento',
      'side',
      'sides',
      'side dish',
    ],
  },
  {
    id: 'dessert',
    label_es: 'Postre / Dulce',
    label_en: 'Dessert & Baking',
    aliases: [
      'postre',
      'postres',
      'dulce',
      'dulces',
      'dessert',
      'desserts',
      'tarta',
      'pastel',
      'cake',
      'reposteria',
      'repostería',
      'sweet',
    ],
  },
  {
    id: 'snack',
    label_es: 'Snack / Picoteo',
    label_en: 'Snack & Bite',
    aliases: [
      'snack',
      'snacks',
      'picoteo',
      'tapa',
      'tapas',
      'bocadillo',
      'bocado',
      'bites',
    ],
  },
  {
    id: 'beverage',
    label_es: 'Bebida / Trago',
    label_en: 'Beverage & Drink',
    aliases: [
      'bebida',
      'bebidas',
      'trago',
      'tragos',
      'coctel',
      'cocktail',
      'smoothie',
      'jugo',
      'drink',
      'beverage',
      'infusion',
      'café',
      'tea',
    ],
  },
  {
    id: 'sauce',
    label_es: 'Salsa / Aderezo',
    label_en: 'Sauce & Dip',
    aliases: [
      'salsa',
      'salsas',
      'aderezo',
      'aderezos',
      'dip',
      'dips',
      'sauce',
      'sauces',
      'dressing',
    ],
  },
  {
    id: 'bread_bakery',
    label_es: 'Pan / Panadería',
    label_en: 'Bread & Bakery',
    aliases: [
      'pan',
      'panes',
      'panaderia',
      'panadería',
      'masa',
      'masas',
      'bread',
      'bakery',
      'dough',
    ],
  },
  {
    id: 'other',
    label_es: 'Otro / General',
    label_en: 'Other / General',
    aliases: [
      'general',
      'otro',
      'otros',
      'other',
      'varios',
    ],
  },
];

/**
 * Normaliza cualquier texto libre o categoría previa a una categoría canónica.
 */
export function normalizeCategory(rawCategory: string | undefined | null): RecipeCategory {
  if (!rawCategory || !rawCategory.trim()) {
    return RECIPE_CATEGORIES[0]; // Por defecto 'main_dish'
  }

  const clean = rawCategory.toLowerCase().trim();

  // 1. Coincidencia exacta por ID
  const directMatch = RECIPE_CATEGORIES.find((c) => c.id === clean);
  if (directMatch) return directMatch;

  // 2. Coincidencia exacta por etiquetas ES o EN
  const labelMatch = RECIPE_CATEGORIES.find(
    (c) => c.label_es.toLowerCase() === clean || c.label_en.toLowerCase() === clean
  );
  if (labelMatch) return labelMatch;

  // 3. Coincidencia por alias
  const aliasMatch = RECIPE_CATEGORIES.find((c) =>
    c.aliases.some((alias) => clean === alias || clean.includes(alias))
  );
  if (aliasMatch) return aliasMatch;

  // 4. Búsqueda por sub-cadena inteligente
  if (clean.includes('prin') || clean.includes('fuerte') || clean.includes('main') || clean.includes('almuerzo') || clean.includes('cena')) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'main_dish')!;
  }
  if (clean.includes('ensalada') || clean.includes('salad')) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'salad')!;
  }
  if (clean.includes('postre') || clean.includes('dulce') || clean.includes('dessert') || clean.includes('tarta') || clean.includes('pastel')) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'dessert')!;
  }
  if (clean.includes('pasta') || clean.includes('arroz') || clean.includes('fideo') || clean.includes('rice')) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'pasta_rice')!;
  }
  if (clean.includes('sopa') || clean.includes('crema') || clean.includes('caldo') || clean.includes('soup')) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'soup')!;
  }
  if (clean.includes('desayuno') || clean.includes('breakfast') || clean.includes('brunch')) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'breakfast')!;
  }

  // Si no coincide con ninguna, devolver 'other'
  return RECIPE_CATEGORIES.find((c) => c.id === 'other') || RECIPE_CATEGORIES[0];
}

/**
 * Obtiene el ID canónico de una categoría (e.g. 'main_dish')
 */
export function getCategoryKey(rawCategory: string | undefined | null): string {
  return normalizeCategory(rawCategory).id;
}

/**
 * Obtiene la etiqueta traducida correcta ('Plato Principal' o 'Main Dish')
 */
export function getCategoryLabel(rawCategory: string | undefined | null, lang: 'ES' | 'EN'): string {
  const norm = normalizeCategory(rawCategory);
  return lang === 'ES' ? norm.label_es : norm.label_en;
}
