/**
 * @file categories.ts
 * @description Catálogo simplificado y natural de categorías gastronómicas bilingüe (ES/EN).
 * Opciones claras y no redundantes:
 * - Desayuno
 * - Plato Principal
 * - Acompañamiento
 * - Ensalada
 * - Sopa
 * - Entrada o Snack
 * - Postre
 * - Otro
 */

export interface RecipeCategory {
  id: string;
  label_es: string;
  label_en: string;
  aliases: string[];
}

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  {
    id: 'breakfast',
    label_es: 'Desayuno',
    label_en: 'Breakfast',
    aliases: [
      'desayuno',
      'desayunos',
      'brunch',
      'breakfast',
      'merienda',
      'tostada',
      'tostadas',
      'pancakes',
      'panaderia',
      'panadería',
      'pan',
      'bakery',
      'waffles',
    ],
  },
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
    id: 'side_dish',
    label_es: 'Acompañamiento',
    label_en: 'Side Dish',
    aliases: [
      'acompañamiento',
      'acompañamientos',
      'acompanamiento',
      'guarnicion',
      'guarnición',
      'guarniciones',
      'side',
      'sides',
      'side dish',
      'aderezo',
      'aderezos',
      'salsa',
      'salsas',
      'sauce',
      'dip',
      'dips',
      'dressing',
      'pure',
      'puré',
      'papas',
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
    id: 'soup',
    label_es: 'Sopa',
    label_en: 'Soup',
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
    id: 'appetizer_snack',
    label_es: 'Entrada o Snack',
    label_en: 'Appetizer or Snack',
    aliases: [
      'entrada',
      'entradas',
      'aperitivo',
      'aperitivos',
      'appetizer',
      'appetizers',
      'starter',
      'starters',
      'snack',
      'snacks',
      'picoteo',
      'tapa',
      'tapas',
      'bocadillo',
      'bocado',
      'primer plato',
      'entremes',
      'entremeses',
      'bites',
    ],
  },
  {
    id: 'dessert',
    label_es: 'Postre',
    label_en: 'Dessert',
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
      'helado',
    ],
  },
  {
    id: 'other',
    label_es: 'Otro',
    label_en: 'Other',
    aliases: [
      'general',
      'otro',
      'otros',
      'other',
      'varios',
      'bebida',
      'bebidas',
      'trago',
      'tragos',
      'drink',
      'beverage',
    ],
  },
];

/**
 * Normaliza cualquier texto libre o categoría previa a una categoría canónica del catálogo simplificado.
 */
export function normalizeCategory(rawCategory: string | undefined | null): RecipeCategory {
  if (!rawCategory || !rawCategory.trim()) {
    return RECIPE_CATEGORIES[1]; // 'main_dish' ('Plato Principal') por defecto
  }

  const clean = rawCategory.toLowerCase().trim();

  // 1. Coincidencia exacta por ID
  const directMatch = RECIPE_CATEGORIES.find((c) => c.id === clean);
  if (directMatch) return directMatch;

  // Compatibilidad con IDs previos consolidados
  if (clean === 'appetizer' || clean === 'snack') {
    return RECIPE_CATEGORIES.find((c) => c.id === 'appetizer_snack')!;
  }
  if (clean === 'pasta_rice') {
    return RECIPE_CATEGORIES.find((c) => c.id === 'main_dish')!;
  }
  if (clean === 'sauce') {
    return RECIPE_CATEGORIES.find((c) => c.id === 'side_dish')!;
  }
  if (clean === 'bread_bakery') {
    return RECIPE_CATEGORIES.find((c) => c.id === 'breakfast')!;
  }

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
  if (
    clean.includes('desayun') ||
    clean.includes('breakfast') ||
    clean.includes('brunch')
  ) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'breakfast')!;
  }
  if (
    clean.includes('acompañ') ||
    clean.includes('acompan') ||
    clean.includes('guarnic') ||
    clean.includes('side')
  ) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'side_dish')!;
  }
  if (
    clean.includes('prin') ||
    clean.includes('fuerte') ||
    clean.includes('main') ||
    clean.includes('almuerzo') ||
    clean.includes('cena')
  ) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'main_dish')!;
  }
  if (clean.includes('ensalada') || clean.includes('salad')) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'salad')!;
  }
  if (
    clean.includes('sopa') ||
    clean.includes('crema') ||
    clean.includes('caldo') ||
    clean.includes('soup') ||
    clean.includes('guiso')
  ) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'soup')!;
  }
  if (
    clean.includes('entrad') ||
    clean.includes('snack') ||
    clean.includes('aperitiv') ||
    clean.includes('tapa') ||
    clean.includes('picote') ||
    clean.includes('appetiz')
  ) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'appetizer_snack')!;
  }
  if (
    clean.includes('postre') ||
    clean.includes('dulce') ||
    clean.includes('dessert') ||
    clean.includes('tarta') ||
    clean.includes('pastel')
  ) {
    return RECIPE_CATEGORIES.find((c) => c.id === 'dessert')!;
  }

  return RECIPE_CATEGORIES.find((c) => c.id === 'other') || RECIPE_CATEGORIES[1];
}

/**
 * Obtiene el ID canónico de una categoría (e.g. 'main_dish', 'breakfast', 'side_dish')
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
