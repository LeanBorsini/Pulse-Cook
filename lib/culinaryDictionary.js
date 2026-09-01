"use strict";
// Diccionario culinario bidireccional para ingredientes y etiquetas gastronómicas
Object.defineProperty(exports, "__esModule", { value: true });
exports.INGREDIENT_DICTIONARY = exports.TAG_TRANSLATIONS = void 0;
exports.translateTag = translateTag;
exports.translateIngredientName = translateIngredientName;
exports.TAG_TRANSLATIONS = {
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
exports.INGREDIENT_DICTIONARY = {
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
function translateTag(tag, targetLang) {
    var normalized = tag.toLowerCase().trim();
    var match = exports.TAG_TRANSLATIONS[normalized];
    if (match) {
        return targetLang === 'ES' ? match.es : match.en;
    }
    return tag;
}
function translateIngredientName(nameEs, nameEn, targetLang) {
    if (targetLang === 'ES') {
        return nameEs || nameEn || '';
    }
    if (nameEn && nameEn.trim().length > 0 && nameEn !== nameEs) {
        return nameEn;
    }
    var normalized = (nameEs || '').toLowerCase().trim();
    if (exports.INGREDIENT_DICTIONARY[normalized]) {
        return exports.INGREDIENT_DICTIONARY[normalized].en;
    }
    for (var _i = 0, _a = Object.entries(exports.INGREDIENT_DICTIONARY); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (normalized.includes(key)) {
            return value.en;
        }
    }
    return nameEs || '';
}
