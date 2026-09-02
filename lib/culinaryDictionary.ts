// Diccionario culinario bidireccional para ingredientes y etiquetas gastronómicas

export const TAG_TRANSLATIONS: Record<string, { es: string; en: string }> = {
  'todas': { es: 'Todas', en: 'All' },
  'all': { es: 'Todas', en: 'All' },
  'sin gluten': { es: 'Sin Gluten', en: 'Gluten-Free' },
  'glutenfree': { es: 'Sin Gluten', en: 'Gluten-Free' },
  'gluten-free': { es: 'Sin Gluten', en: 'Gluten-Free' },
  'sin lácteos': { es: 'Sin Lácteos', en: 'Dairy-Free' },
  'sin lacteos': { es: 'Sin Lácteos', en: 'Dairy-Free' },
  'dairyfree': { es: 'Sin Lácteos', en: 'Dairy-Free' },
  'dairy-free': { es: 'Sin Lácteos', en: 'Dairy-Free' },
  'vegetariano': { es: 'Vegetariano', en: 'Vegetarian' },
  'vegetarian': { es: 'Vegetariano', en: 'Vegetarian' },
  'vegano': { es: 'Vegano', en: 'Vegan' },
  'vegan': { es: 'Vegano', en: 'Vegan' },
  'sin frutos secos': { es: 'Sin Frutos Secos', en: 'Nut-Free' },
  'nutfree': { es: 'Sin Frutos Secos', en: 'Nut-Free' },
  'nut-free': { es: 'Sin Frutos Secos', en: 'Nut-Free' },
  'keto / low carb': { es: 'Keto / Bajo en Carbohidratos', en: 'Keto / Low Carb' },
  'keto': { es: 'Keto', en: 'Keto' },
  'low carb': { es: 'Bajo en Carbohidratos', en: 'Low Carb' },
  'rápido (<20m)': { es: 'Rápido (<20m)', en: 'Quick (<20m)' },
  'rapido (<20m)': { es: 'Rápido (<20m)', en: 'Quick (<20m)' },
  'quick': { es: 'Rápido', en: 'Quick' },
  'postre': { es: 'Postre', en: 'Dessert' },
  'dessert': { es: 'Postre', en: 'Dessert' },
  'almuerzo / cena': { es: 'Almuerzo / Cena', en: 'Lunch / Dinner' },
  'lunch / dinner': { es: 'Almuerzo / Cena', en: 'Lunch / Dinner' },
  'desayuno': { es: 'Desayuno', en: 'Breakfast' },
  'breakfast': { es: 'Desayuno', en: 'Breakfast' },
  'merienda': { es: 'Merienda', en: 'Snack' },
  'snack': { es: 'Merienda', en: 'Snack' },
  'principal': { es: 'Plato Principal', en: 'Main Dish' },
  'main dishes': { es: 'Platos Principales', en: 'Main Dishes' },
  'ensaladas': { es: 'Ensaladas', en: 'Salads' },
  'salads': { es: 'Ensaladas', en: 'Salads' },
  'sopas': { es: 'Sopas', en: 'Soups' },
  'soups': { es: 'Sopas', en: 'Soups' },
  'pastas': { es: 'Pastas', en: 'Pastas' },
  'dulces': { es: 'Dulces & Postres', en: 'Sweets & Desserts' },
};

export const INGREDIENT_DICTIONARY: Record<string, { es: string; en: string }> = {
  // Proteínas & Carnes
  'pechuga de pollo desmenuzada': { es: 'Pechuga de pollo desmenuzada', en: 'Shredded chicken breast' },
  'pechuga de pollo': { es: 'Pechuga de pollo', en: 'Chicken breast' },
  'pollo': { es: 'Pollo', en: 'Chicken' },
  'carne picada': { es: 'Carne picada', en: 'Ground beef' },
  'atún': { es: 'Atún', en: 'Tuna' },
  'atun': { es: 'Atún', en: 'Tuna' },
  'salmón': { es: 'Salmón', en: 'Salmon' },
  'huevo': { es: 'Huevo', en: 'Egg' },
  'huevos': { es: 'Huevos', en: 'Eggs' },
  'tofu': { es: 'Tofu', en: 'Tofu' },

  // Lácteos
  'queso mozzarella': { es: 'Queso mozzarella', en: 'Mozzarella cheese' },
  'queso': { es: 'Queso', en: 'Cheese' },
  'leche': { es: 'Leche', en: 'Milk' },
  'crema de leche': { es: 'Crema de leche', en: 'Heavy cream' },
  'manteca': { es: 'Manteca', en: 'Butter' },
  'mantequilla': { es: 'Mantequilla', en: 'Butter' },
  'yogur griego': { es: 'Yogur griego', en: 'Greek yogurt' },
  'parmesano': { es: 'Queso parmesano', en: 'Parmesan cheese' },

  // Vegetales
  'tomate': { es: 'Tomate', en: 'Tomato' },
  'tomates': { es: 'Tomates', en: 'Tomatoes' },
  'cebolla': { es: 'Cebolla', en: 'Onion' },
  'cebollas': { es: 'Cebollas', en: 'Onions' },
  'cebolla morada': { es: 'Cebolla morada', en: 'Red onion' },
  'ajo': { es: 'Ajo', en: 'Garlic' },
  'dientes de ajo': { es: 'Dientes de ajo', en: 'Garlic cloves' },
  'pimiento': { es: 'Pimiento', en: 'Bell pepper' },
  'pimiento rojo, amarillo y verde': { es: 'Pimiento rojo, amarillo y verde', en: 'Red, yellow, and green bell pepper' },
  'pimientos': { es: 'Pimientos', en: 'Bell peppers' },
  'zapallo': { es: 'Zapallo / Calabaza', en: 'Butternut squash / Pumpkin' },
  'calabaza': { es: 'Calabaza', en: 'Pumpkin / Squash' },
  'zanahoria': { es: 'Zanahoria', en: 'Carrot' },
  'zanahorias': { es: 'Zanahorias', en: 'Carrots' },
  'espinaca': { es: 'Espinaca', en: 'Spinach' },
  'espinacas': { es: 'Espinacas', en: 'Spinach' },
  'lechuga': { es: 'Lechuga', en: 'Lettuce' },
  'papa': { es: 'Papa', en: 'Potato' },
  'papas': { es: 'Papas', en: 'Potatoes' },
  'palta': { es: 'Palta / Aguacate', en: 'Avocado' },
  'aguacate': { es: 'Aguacate', en: 'Avocado' },
  'champiñones': { es: 'Champiñones', en: 'Mushrooms' },
  'hongos': { es: 'Hongos', en: 'Mushrooms' },

  // Harinas, Granos y Legumbres
  'avena': { es: 'Avena', en: 'Oats' },
  'harina de avena': { es: 'Harina de avena', en: 'Oat flour' },
  'harina de trigo': { es: 'Harina de trigo', en: 'Wheat flour' },
  'harina': { es: 'Harina', en: 'Flour' },
  'fideo integral o de legumbres o trigo serraceno': { es: 'Fideos integrales o de legumbres', en: 'Whole wheat or legume pasta' },
  'fideos': { es: 'Fideos / Pasta', en: 'Pasta' },
  'pasta': { es: 'Pasta', en: 'Pasta' },
  'arroz': { es: 'Arroz', en: 'Rice' },
  'lentejas': { es: 'Lentejas', en: 'Lentils' },
  'garbanzos': { es: 'Garbanzos', en: 'Chickpeas' },
  'quinoa': { es: 'Quinoa', en: 'Quinoa' },

  // Condimentos, Aceites & Especias
  'sal': { es: 'Sal', en: 'Salt' },
  'pimienta': { es: 'Pimienta', en: 'Black pepper' },
  'pimienta negra': { es: 'Pimienta negra', en: 'Black pepper' },
  'aceite de oliva': { es: 'Aceite de oliva', en: 'Olive oil' },
  'aceite': { es: 'Aceite', en: 'Oil' },
  'orégano': { es: 'Orégano', en: 'Oregano' },
  'oregano': { es: 'Orégano', en: 'Oregano' },
  'paprika': { es: 'Paprika / Pimentón', en: 'Paprika' },
  'pimentón': { es: 'Pimentón', en: 'Paprika' },
  'hierbas finas': { es: 'Hierbas finas', en: 'Fine herbs' },
  'perejil': { es: 'Perejil', en: 'Parsley' },
  'albahaca': { es: 'Albahaca', en: 'Basil' },
  'comino': { es: 'Comino', en: 'Cumin' },
  'canela': { es: 'Canela', en: 'Cinnamon' },
  'azúcar': { es: 'Azúcar', en: 'Sugar' },
  'azucar': { es: 'Azúcar', en: 'Sugar' },
  'miel': { es: 'Miel', en: 'Honey' },
  'polvo de hornear': { es: 'Polvo de hornear', en: 'Baking powder' },
  'esencia de vainilla': { es: 'Esencia de vainilla', en: 'Vanilla extract' },
};

export function translateTag(tag: string, targetLang: 'ES' | 'EN'): string {
  const normalized = tag.toLowerCase().trim();
  const match = TAG_TRANSLATIONS[normalized];
  if (match) {
    return targetLang === 'ES' ? match.es : match.en;
  }
  return tag;
}

// Mapa inverso para traducir de Inglés a Español rápidamente
const EN_TO_ES_MAP: Record<string, string> = {
  onion: 'Cebolla',
  onions: 'Cebollas',
  'red onion': 'Cebolla morada',
  garlic: 'Ajo',
  'garlic clove': 'Diente de ajo',
  'garlic cloves': 'Dientes de ajo',
  tomato: 'Tomate',
  tomatoes: 'Tomates',
  chicken: 'Pollo',
  'chicken breast': 'Pechuga de pollo',
  'shredded chicken breast': 'Pechuga de pollo desmenuzada',
  beef: 'Carne vacuna',
  'ground beef': 'Carne picada',
  tuna: 'Atún',
  salmon: 'Salmón',
  egg: 'Huevo',
  eggs: 'Huevos',
  butter: 'Manteca / Mantequilla',
  milk: 'Leche',
  cheese: 'Queso',
  'mozzarella cheese': 'Queso mozzarella',
  'parmesan cheese': 'Queso parmesano',
  flour: 'Harina',
  'wheat flour': 'Harina de trigo',
  'oat flour': 'Harina de avena',
  oats: 'Avena',
  potato: 'Papa',
  potatoes: 'Papas',
  spinach: 'Espinaca',
  carrot: 'Zanahoria',
  carrots: 'Zanahorias',
  lettuce: 'Lechuga',
  avocado: 'Palta / Aguacate',
  mushroom: 'Champiñón',
  mushrooms: 'Champiñones',
  rice: 'Arroz',
  pasta: 'Pasta / Fideos',
  noodles: 'Fideos',
  lentils: 'Lentejas',
  chickpeas: 'Garbanzos',
  salt: 'Sal',
  pepper: 'Pimienta',
  'black pepper': 'Pimienta negra',
  'olive oil': 'Aceite de oliva',
  oil: 'Aceite',
  oregano: 'Orégano',
  paprika: 'Pimentón / Paprika',
  parsley: 'Perejil',
  basil: 'Albahaca',
  cumin: 'Comino',
  cinnamon: 'Canela',
  sugar: 'Azúcar',
  honey: 'Miel',
  'baking powder': 'Polvo de hornear',
  'heavy cream': 'Crema de leche',
};

export function translateIngredientName(
  nameEs: string,
  nameEn: string | undefined,
  targetLang: 'ES' | 'EN'
): string {
  const es = (nameEs || '').trim();
  const en = (nameEn || '').trim();

  // 1. Si el objetivo es ESPAÑOL
  if (targetLang === 'ES') {
    // Si ya tiene un nombre en español que no sea un término inglés huérfano
    if (es && !EN_TO_ES_MAP[es.toLowerCase()]) {
      return es;
    }

    // Si nameEs o nameEn coincide con nuestro mapa de inglés a español
    const lookupCandidate = (es || en).toLowerCase();
    if (EN_TO_ES_MAP[lookupCandidate]) {
      return EN_TO_ES_MAP[lookupCandidate];
    }

    // Buscar si contiene alguna palabra clave en inglés
    for (const [engKey, esVal] of Object.entries(EN_TO_ES_MAP)) {
      if (lookupCandidate.includes(engKey)) {
        return esVal;
      }
    }

    return es || en || '';
  }

  // 2. Si el objetivo es INGLÉS
  if (en && en.length > 0 && en.toLowerCase() !== es.toLowerCase()) {
    return en;
  }

  const normalizedEs = es.toLowerCase();
  if (INGREDIENT_DICTIONARY[normalizedEs]) {
    return INGREDIENT_DICTIONARY[normalizedEs].en;
  }

  for (const [key, value] of Object.entries(INGREDIENT_DICTIONARY)) {
    if (normalizedEs.includes(key)) {
      return value.en;
    }
  }

  return en || es || '';
}
