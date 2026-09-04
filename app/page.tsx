'use client';

/**
 * @file page.tsx
 * @description Vista y controlador principal de Pulse&Cook.
 *
 * Responsabilidades:
 * 1. Inicialización y persistencia dual de recetas (localStorage + Supabase Cloud).
 * 2. Gestión del estado global: idioma activo, autenticación del usuario, perfil y menú semanal.
 * 3. Búsqueda y filtrado interactivo: filtrado por término de búsqueda, etiquetas dietéticas y ordenamiento.
 * 4. Orquestación de modales: Creación/Edición, Detalle de Receta, Lista de Compras, Chef Remy,
 *    Autenticación y Bienvenida.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Recipe, Ingredient, Comment } from './types';
import {
  getLocalRecipes,
  saveLocalRecipe,
  deleteLocalRecipe,
  getLocalIngredients,
} from '@/lib/recipeStore';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { AuthModal } from './components/AuthModal';
import { UsernameSetupModal } from './components/UsernameSetupModal';
import ChefAssistantModal from './components/ChefAssistantModal';
import { WelcomeLandingModal } from './components/WelcomeLandingModal';
import { ShareAppModal } from './components/ShareAppModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UtensilsCrossed, Clock, Star, ArrowUpDown, Plus, Sparkles } from 'lucide-react';
import { getCategoryKey, getCategoryLabel } from '@/lib/categories';

interface SupabaseRatingRow {
  recipe_id?: string;
  stars: number;
  user_id: string;
}

interface SupabaseRecipeRow {
  id: string;
  user_id?: string;
  author_name?: string;
  profiles?: { id: string; username: string; avatar_url?: string } | null;
  ratings?: SupabaseRatingRow[];
  avg_rating?: number;
  ratings_count?: number;
  title?: string;
  title_es?: string;
  title_en?: string;
  category?: string;
  prep_time?: number;
  servings?: number;
  description_es?: string;
  description_en?: string;
  instructions_es?: string;
  instructions_en?: string;
  youtube_url?: string;
  video_links?: { id: string; title: string; url: string }[];
  image_url?: string;
  images?: string[];
  dietary_tags?: string[] | string;
  created_at?: string;
}

export default function Home() {
  const [lang, setLang] = useState<'ES' | 'EN'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pulse_lang');
        if (saved === 'ES' || saved === 'EN') return saved;
      } catch {
        // Ignore localStorage errors
      }
    }
    return 'ES';
  });

  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalRecipes();
    }
    return [];
  });
  const [loadingRecipes, setLoadingRecipes] = useState<boolean>(true);

  // Search, Filters & Sorting (Soporte de selección múltiple)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'prepTime'>('recent');

  // Menu Selection for Shopping List (Persists across reloads & sessions)
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pulse_menu_recipe_ids');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (err) {
        console.warn('Error loading saved menu recipe ids:', err);
      }
    }
    return [];
  });

  // Persist selected menu recipe IDs whenever changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pulse_menu_recipe_ids', JSON.stringify(selectedRecipeIds));
      } catch (err) {
        console.warn('Error saving menu recipe ids:', err);
      }
    }
  }, [selectedRecipeIds]);

  // Clear entire menu and stored checks
  const handleClearMenu = () => {
    setSelectedRecipeIds([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('pulse_menu_recipe_ids');
        localStorage.removeItem('pulse_shopping_list_checks');
      } catch (err) {
        console.warn('Error clearing menu storage:', err);
      }
    }
  };

  // Modals
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState<boolean>(false);
  const [showShoppingList, setShowShoppingList] = useState<boolean>(false);
  const [showChefAI, setShowChefAI] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState<boolean>(false);
  const [showShareApp, setShowShareApp] = useState<boolean>(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('pulse_cook_welcome_seen') !== 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  // Active Recipe Details (Ingredients & Comments)
  const [activeIngredients, setActiveIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState<boolean>(false);
  const [activeComments, setActiveComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [newCommentMessage, setNewCommentMessage] = useState<string>('');
  const [currentUserRating, setCurrentUserRating] = useState<number>(0);

  const handleSetLang = (newLang: 'ES' | 'EN') => {
    setLang(newLang);
    try {
      localStorage.setItem('pulse_lang', newLang);
    } catch {
      // Ignore localStorage errors
    }
  };

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (data && data.username) {
        setProfileUsername(data.username);
      } else if (!error || error.code === 'PGRST116') {
        setShowUsernameSetup(true);
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
  }, []);

  // Fetch Recipes: Prioriza la base de datos de Supabase y combina con el almacén local
  const fetchRecipes = useCallback(async (userOverride?: User | null) => {
    setLoadingRecipes(true);
    const localList = getLocalRecipes();
    setRecipes(localList);

    try {
      // 1. Consulta directa a la tabla 'recipes' (siempre compatible sin depender de claves foráneas)
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase recipes fetch warning:', error.message);
      }

      if (data && data.length > 0) {
        const rawRecipes = data as unknown as SupabaseRecipeRow[];

        // 2. Obtener perfiles de autor si existen
        const profileMap = new Map<string, { id: string; username: string; avatar_url?: string }>();
        try {
          const userIds = Array.from(
            new Set(rawRecipes.map((r) => r.user_id).filter((id): id is string => Boolean(id)))
          );
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);

            if (profilesData) {
              profilesData.forEach((p) => {
                profileMap.set(p.id, p);
              });
            }
          }
        } catch (profErr) {
          console.warn('Profiles lookup optional note:', profErr);
        }

        // 3. Obtener valoraciones si la tabla ratings existe
        const ratingsMap = new Map<string, { stars: number; user_id: string }[]>();
        try {
          const recipeIds = rawRecipes.map((r) => r.id);
          const { data: ratingsData } = await supabase
            .from('ratings')
            .select('recipe_id, stars, user_id')
            .in('recipe_id', recipeIds);

          if (ratingsData) {
            ratingsData.forEach((rt: SupabaseRatingRow) => {
              if (rt.recipe_id) {
                const list = ratingsMap.get(rt.recipe_id) || [];
                list.push({ stars: rt.stars, user_id: rt.user_id });
                ratingsMap.set(rt.recipe_id, list);
              }
            });
          }
        } catch {
          // ratings table might be optional
        }

        // 4. Formatear y normalizar cada receta
        const currentUser = userOverride !== undefined ? userOverride : userRef.current;
        const formatted: Recipe[] = rawRecipes.map((item) => {
          const allRatings = ratingsMap.get(item.id) || item.ratings || [];
          const count = allRatings.length;
          const avg = count > 0 
            ? allRatings.reduce((acc: number, r: SupabaseRatingRow) => acc + (r.stars || 0), 0) / count 
            : (typeof item.avg_rating === 'number' ? item.avg_rating : 0);
          
          let myRating = 0;
          if (currentUser && allRatings.length > 0) {
            const userRat = allRatings.find((r: SupabaseRatingRow) => r.user_id === currentUser.id);
            if (userRat) myRating = userRat.stars;
          }

          // Resolver autor
          const authorProfile = item.user_id ? profileMap.get(item.user_id) : null;
          const resolvedProfiles =
            authorProfile ||
            item.profiles ||
            (item.author_name ? { id: item.user_id || 'author', username: item.author_name } : null);

          // Normalizar imágenes
          let imagesList: string[] = [];
          if (Array.isArray(item.images) && item.images.length > 0) {
            imagesList = item.images;
          } else if (item.image_url) {
            imagesList = [item.image_url];
          }

          // Normalizar etiquetas dietéticas
          let tags: string[] = [];
          if (Array.isArray(item.dietary_tags)) {
            tags = item.dietary_tags;
          } else if (typeof item.dietary_tags === 'string') {
            try {
              tags = JSON.parse(item.dietary_tags);
            } catch {
              tags = [item.dietary_tags];
            }
          }

          return {
            id: String(item.id),
            user_id: item.user_id,
            profiles: resolvedProfiles,
            title_es: item.title_es || item.title_en || item.title || '',
            title_en: item.title_en || item.title_es || item.title || '',
            category: getCategoryLabel(item.category, 'ES'),
            prep_time: item.prep_time || 15,
            servings: item.servings || 1,
            description_es: item.description_es || item.description_en || '',
            description_en: item.description_en || item.description_es || '',
            instructions_es: item.instructions_es || item.instructions_en || '',
            instructions_en:
              item.instructions_en &&
              item.instructions_en.trim() !== '' &&
              item.instructions_en !== item.instructions_es
                ? item.instructions_en
                : '',
            youtube_url: item.youtube_url || '',
            video_links: Array.isArray(item.video_links) ? item.video_links : [],
            image_url: item.image_url || (imagesList.length > 0 ? imagesList[0] : ''),
            images: imagesList,
            dietary_tags: tags,
            avg_rating: avg > 0 ? Number(avg.toFixed(1)) : undefined,
            ratings_count: count || (item.ratings_count || 0),
            user_rating: myRating > 0 ? myRating : undefined,
            created_at: item.created_at,
          };
        });

        // Combinar recetas locales con las de Supabase sin duplicados
        const combined = [...localList];
        formatted.forEach((remoteRecipe) => {
          const existsIndex = combined.findIndex((r) => r.id === remoteRecipe.id);
          if (existsIndex === -1) {
            combined.push(remoteRecipe);
          } else {
            // Actualizar datos con los remotos
            combined[existsIndex] = { ...combined[existsIndex], ...remoteRecipe };
          }
        });
        setRecipes(combined);
      }
    } catch (err) {
      console.warn('Error fetching Supabase recipes:', err);
    } finally {
      setLoadingRecipes(false);
    }
  }, []);

  // Check auth session on mount (stabilized without loop dependencies)
  useEffect(() => {
    let isMounted = true;

    const initAuthAndRecipes = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          userRef.current = session.user;
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          userRef.current = null;
          setProfileUsername(null);
        }

        if (isMounted) {
          await fetchRecipes(session?.user || null);
        }
      } catch (err) {
        console.warn('Supabase auth session check failed:', err);
        if (isMounted) {
          await fetchRecipes(null);
        }
      }
    };

    initAuthAndRecipes();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user || null;
      setUser(currentUser);
      userRef.current = currentUser;

      if (currentUser) {
        await loadUserProfile(currentUser.id);
      } else {
        setProfileUsername(null);
      }

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        fetchRecipes(currentUser);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile, fetchRecipes]);

  // Load ingredients & comments when activeRecipe changes
  useEffect(() => {
    if (!activeRecipe) return;

    let isMounted = true;

    const loadRecipeDetails = async () => {
      setLoadingIngredients(true);
      setLoadingComments(true);

      // User rating check
      setCurrentUserRating(activeRecipe.user_rating || 0);

      // Load Ingredients (check local persistent store first, then Supabase)
      const localIngs = getLocalIngredients(activeRecipe.id);
      if (localIngs && localIngs.length > 0) {
        if (isMounted) {
          setActiveIngredients(localIngs);
          setLoadingIngredients(false);
        }
      } else {
        try {
          const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .eq('recipe_id', activeRecipe.id);

          if (!isMounted) return;

          if (!error && data && data.length > 0) {
            setActiveIngredients(data);
          } else {
            setActiveIngredients([]);
          }
        } catch {
          if (!isMounted) return;
          setActiveIngredients([]);
        } finally {
          if (isMounted) setLoadingIngredients(false);
        }
      }

      // Load Comments
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('recipe_id', activeRecipe.id)
          .order('created_at', { ascending: true });

        if (!isMounted) return;

        if (!error && data) {
          setActiveComments(data);
        } else {
          setActiveComments([]);
        }
      } catch {
        if (!isMounted) setActiveComments([]);
      } finally {
        if (isMounted) setLoadingComments(false);
      }
    };

    loadRecipeDetails();

    return () => {
      isMounted = false;
    };
  }, [activeRecipe]);

  // Toggle Recipe into Shopping Menu
  const handleToggleMenu = (recipeId: string) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
    );
  };

  // Rate a recipe
  const handleRateRecipe = async (stars: number) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!activeRecipe) return;

    setCurrentUserRating(stars);

    try {
      await supabase
        .from('ratings')
        .upsert(
          { recipe_id: activeRecipe.id, user_id: user.id, stars },
          { onConflict: 'recipe_id,user_id' }
        );

      fetchRecipes();
    } catch (err) {
      console.warn('Rating save error:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!activeRecipe || !newCommentMessage.trim()) return;

    const author = profileUsername || user.email?.split('@')[0] || 'chef';
    const newCommentObj: Comment = {
      id: `temp-${Date.now()}`,
      recipe_id: activeRecipe.id,
      user_id: user.id,
      user_name: author,
      message: newCommentMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setActiveComments((prev) => [...prev, newCommentObj]);
    const msgToSend = newCommentMessage.trim();
    setNewCommentMessage('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          recipe_id: activeRecipe.id,
          user_id: user.id,
          user_name: author,
          message: msgToSend,
        })
        .select()
        .single();

      if (!error && data) {
        setActiveComments((prev) =>
          prev.map((c) => (c.id === newCommentObj.id ? data : c))
        );
      }
    } catch (err) {
      console.warn('Comment insert error:', err);
    }
  };

  // Delete Recipe
  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      await supabase.from('recipes').delete().eq('id', recipeId);
    } catch (err) {
      console.warn('Delete recipe remote error:', err);
    }
    const updated = deleteLocalRecipe(recipeId);
    setRecipes(updated);
    setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipeId));
    setActiveRecipe(null);
  };

  // Save generated recipe from Chef AI Assistant
  const handleSaveChefRecipe = async (
    newRecipe: Partial<Recipe> & { generatedIngredients?: Ingredient[] }
  ) => {
    const localNewRecipe: Recipe = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: user?.id || 'local_user',
      profiles: profileUsername
        ? { id: user?.id || 'local_user', username: profileUsername }
        : { id: 'local_user', username: user?.email?.split('@')[0] || 'Mi Cocina' },
      title_es: newRecipe.title_es || 'Nueva Receta',
      title_en: newRecipe.title_en || '',
      category: getCategoryLabel(newRecipe.category, 'ES'),
      prep_time: newRecipe.prep_time || 20,
      servings: newRecipe.servings || 2,
      description_es: newRecipe.description_es || '',
      description_en: newRecipe.description_en || '',
      instructions_es: newRecipe.instructions_es || '',
      instructions_en: newRecipe.instructions_en || '',
      image_url: newRecipe.image_url || '',
      images: newRecipe.images || (newRecipe.image_url ? [newRecipe.image_url] : []),
      dietary_tags: newRecipe.dietary_tags || [],
      created_at: new Date().toISOString(),
    };

    saveLocalRecipe(localNewRecipe, newRecipe.generatedIngredients || []);
    setRecipes(getLocalRecipes());
    setShowChefAI(false);

    try {
      if (user) {
        const { data: supaRec } = await supabase
          .from('recipes')
          .insert([
            {
              user_id: user.id,
              title_es: localNewRecipe.title_es,
              title_en: localNewRecipe.title_en,
              category: localNewRecipe.category,
              prep_time: localNewRecipe.prep_time,
              servings: localNewRecipe.servings,
              description_es: localNewRecipe.description_es,
              description_en: localNewRecipe.description_en,
              instructions_es: localNewRecipe.instructions_es,
              instructions_en: localNewRecipe.instructions_en,
              image_url: localNewRecipe.image_url,
              images: localNewRecipe.images,
              dietary_tags: localNewRecipe.dietary_tags,
            },
          ])
          .select()
          .single();

        if (supaRec && newRecipe.generatedIngredients && newRecipe.generatedIngredients.length > 0) {
          const ingPayload = newRecipe.generatedIngredients.map((ing) => ({
            recipe_id: supaRec.id,
            name_es: ing.name_es,
            name_en: ing.name_en || ing.name_es,
            amount: ing.amount || 1,
            unit: ing.unit || '',
          }));
          await supabase.from('ingredients').insert(ingPayload);
        }
      }
    } catch (err) {
      console.warn('Chef recipe remote sync skipped:', err);
    }
  };

  // Filtered and Sorted Recipes
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter((r) => {
        // Filtro por categorías seleccionadas (OR: coincide con cualquiera de las seleccionadas)
        if (selectedCategories.length > 0) {
          const recCatKey = getCategoryKey(r.category);
          if (!selectedCategories.includes(recCatKey)) {
            return false;
          }
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesTitle =
            r.title_es.toLowerCase().includes(q) ||
            (r.title_en && r.title_en.toLowerCase().includes(q));
          const matchesDesc =
            (r.description_es && r.description_es.toLowerCase().includes(q)) ||
            (r.description_en && r.description_en.toLowerCase().includes(q));
          const catEs = getCategoryLabel(r.category, 'ES').toLowerCase();
          const catEn = getCategoryLabel(r.category, 'EN').toLowerCase();
          const matchesCategory =
            catEs.includes(q) || catEn.includes(q) || (r.category && r.category.toLowerCase().includes(q));
          const matchesTags = r.dietary_tags?.some((t) => t.toLowerCase().includes(q));

          if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesTags) {
            return false;
          }
        }

        // Filtro por dietas seleccionadas (AND: cumple cada una de las restricciones de dieta seleccionadas)
        if (selectedTags.length > 0) {
          const satisfiesAllTags = selectedTags.every((tag) => {
            const normTag = tag.toLowerCase();
            return r.dietary_tags?.some((t) => {
              const nt = t.toLowerCase();
              if (normTag === 'glutenfree') return nt.includes('gluten') || nt.includes('celiac') || nt.includes('sin gluten');
              if (normTag === 'dairyfree') return nt.includes('lacteo') || nt.includes('dairy') || nt.includes('sin lacteos');
              if (normTag === 'vegetarian') return nt.includes('vege');
              if (normTag === 'vegan') return nt.includes('vega');
              if (normTag === 'nutfree') return nt.includes('frutos') || nt.includes('nut') || nt.includes('sin nueces');
              if (normTag === 'lowcarb') return nt.includes('carb') || nt.includes('keto') || nt.includes('bajo en carb');
              if (normTag === 'quick') return r.prep_time <= 20;
              return nt.includes(normTag);
            });
          });
          if (!satisfiesAllTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          const rA = a.avg_rating || 0;
          const rB = b.avg_rating || 0;
          return rB - rA;
        }
        if (sortBy === 'prepTime') {
          return a.prep_time - b.prep_time;
        }
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [recipes, searchTerm, selectedCategories, selectedTags, sortBy]);

  const isEs = lang === 'ES';

  return (
    <main className="min-h-screen bg-[#F4F1EA] text-[#2C3523] px-4 py-6 sm:px-8 sm:py-8 font-sans max-w-7xl mx-auto flex flex-col">
      {/* Header con Autenticación, Idioma, Chef IA y Menú */}
      <Header
        lang={lang}
        setLang={handleSetLang}
        user={user}
        profileUsername={profileUsername}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={async () => {
          await supabase.auth.signOut();
          setUser(null);
          setProfileUsername(null);
        }}
        onOpenNewRecipe={() => setIsCreatingRecipe(true)}
        selectedCount={selectedRecipeIds.length}
        onOpenShoppingList={() => setShowShoppingList(true)}
        onOpenChefAI={() => setShowChefAI(true)}
        onOpenWelcome={() => setShowWelcomeModal(true)}
        onOpenShareApp={() => setShowShareApp(true)}
      />

      {/* Buscador & Combobox de Filtros Inteligente */}
      <SearchBar
        lang={lang}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
      />

      {/* Controles de Ordenamiento & Total de Recetas */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2 border-b border-[#D8D3C4]/60">
        <div className="flex items-center gap-3 text-xs font-semibold text-[#5C6650]">
          <div className="flex items-center gap-1.5">
            <UtensilsCrossed className="w-4 h-4 text-[#2C3523]" />
            <span>
              {filteredRecipes.length}{' '}
              {isEs
                ? filteredRecipes.length === 1 ? 'receta de la comunidad' : 'recetas de la comunidad'
                : filteredRecipes.length === 1 ? 'community recipe' : 'community recipes'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-[#5C6650] flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            {isEs ? 'Ordenar por:' : 'Sort by:'}
          </span>
          <div className="flex bg-[#EFECE1] border border-[#D8D3C4] rounded-lg p-0.5">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                sortBy === 'recent'
                  ? 'bg-[#2C3523] text-[#F7F5EC] shadow-xs'
                  : 'text-[#5C6650] hover:text-[#2C3523]'
              }`}
            >
              {isEs ? 'Recientes' : 'Recent'}
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                sortBy === 'rating'
                  ? 'bg-[#2C3523] text-[#F7F5EC] shadow-xs'
                  : 'text-[#5C6650] hover:text-[#2C3523]'
              }`}
            >
              <Star className="w-3 h-3" />
              {isEs ? 'Mejor valoradas' : 'Top rated'}
            </button>
            <button
              onClick={() => setSortBy('prepTime')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                sortBy === 'prepTime'
                  ? 'bg-[#2C3523] text-[#F7F5EC] shadow-xs'
                  : 'text-[#5C6650] hover:text-[#2C3523]'
              }`}
            >
              <Clock className="w-3 h-3" />
              {isEs ? 'Más rápidas' : 'Fastest'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Recetas */}
      {loadingRecipes ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse py-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-[#EFECE1] rounded-2xl border border-[#D8D3C4]" />
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-16 bg-[#EFECE1]/50 border border-dashed border-[#D8D3C4] rounded-2xl p-8 max-w-xl mx-auto">
          <UtensilsCrossed className="w-12 h-12 text-[#5C6650] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-[#2C3523] mb-1.5">
            {searchTerm || selectedCategories.length > 0 || selectedTags.length > 0
              ? (isEs ? 'No se encontraron recetas con estos filtros' : 'No recipes found with these filters')
              : (isEs ? 'Aún no hay recetas publicadas' : 'No recipes published yet')}
          </h3>
          <p className="text-xs text-[#5C6650] max-w-md mx-auto mb-6 leading-relaxed">
            {searchTerm || selectedCategories.length > 0 || selectedTags.length > 0
              ? (isEs
                  ? 'Prueba a cambiar el término de búsqueda o seleccionar otra categoría en el menú de filtros.'
                  : 'Try changing your search keywords or selecting another category from the filters menu.')
              : (isEs
                  ? '¡Sé el primero en compartir una receta con la comunidad o crea una con la ayuda del Chef IA!'
                  : 'Be the first to share a recipe with the community or generate one with the AI Chef!')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {searchTerm || selectedCategories.length > 0 || selectedTags.length > 0 ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategories([]);
                  setSelectedTags([]);
                }}
                className="px-4 py-2 bg-[#2C3523] text-white rounded-xl text-xs font-semibold hover:bg-[#3D4932] transition-colors cursor-pointer"
              >
                {isEs ? 'Restablecer filtros' : 'Reset filters'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsCreatingRecipe(true)}
                  className="px-4 py-2 bg-[#2C3523] text-[#FAF8F2] rounded-xl text-xs font-semibold hover:bg-[#3D4932] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Crear Receta' : 'Create Recipe'}</span>
                </button>
                <button
                  onClick={() => setShowChefAI(true)}
                  className="px-4 py-2 bg-[#EFECE1] text-[#2C3523] border border-[#D8D3C4] hover:bg-[#E5E0D0] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isEs ? 'Chef Asistente IA' : 'AI Chef Assistant'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              lang={lang}
              isSelected={selectedRecipeIds.includes(recipe.id)}
              user={user}
              onOpenDetails={(r) => setActiveRecipe(r)}
              onToggleMenu={handleToggleMenu}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          ))}
        </div>
      )}

      {/* Modal Detalle de Receta */}
      {activeRecipe && (
        <RecipeDetailModal
          recipe={activeRecipe}
          ingredients={activeIngredients}
          comments={activeComments}
          loadingIngredients={loadingIngredients}
          loadingComments={loadingComments}
          newMessage={newCommentMessage}
          setNewMessage={setNewCommentMessage}
          lang={lang}
          user={user}
          userRating={currentUserRating}
          isInMenu={activeRecipe ? selectedRecipeIds.includes(activeRecipe.id) : false}
          onToggleMenu={handleToggleMenu}
          onRate={handleRateRecipe}
          onClose={() => {
            setActiveRecipe(null);
            setActiveIngredients([]);
            setActiveComments([]);
            setCurrentUserRating(0);
          }}
          onEdit={(r) => {
            setActiveRecipe(null);
            setActiveIngredients([]);
            setActiveComments([]);
            setCurrentUserRating(0);
            setRecipeToEdit(r);
          }}
          onDelete={handleDeleteRecipe}
          onAddComment={handleAddComment}
          onOpenAuth={() => setShowAuthModal(true)}
          onRecipeUpdated={(updated) => {
            setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setActiveRecipe(updated);
          }}
        />
      )}

      {/* Modal Crear / Editar Receta */}
      {(isCreatingRecipe || recipeToEdit) && (
        <RecipeFormModal
          recipeToEdit={recipeToEdit}
          lang={lang}
          user={user}
          onClose={() => {
            setIsCreatingRecipe(false);
            setRecipeToEdit(null);
          }}
          onSuccess={() => {
            setIsCreatingRecipe(false);
            setRecipeToEdit(null);
            fetchRecipes();
          }}
        />
      )}

      {/* Modal Lista Inteligente de Compras */}
      {showShoppingList && (
        <ShoppingListModal
          lang={lang}
          selectedRecipeIds={selectedRecipeIds}
          recipes={recipes}
          onClose={() => setShowShoppingList(false)}
          onClearMenu={handleClearMenu}
          onRemoveRecipe={handleToggleMenu}
        />
      )}

      {/* Modal Asistente Chef Remy IA */}
      <ChefAssistantModal
        isOpen={showChefAI}
        onClose={() => setShowChefAI(false)}
        lang={lang}
        user={user}
        onSaveRecipe={handleSaveChefRecipe}
      />

      {/* Modal Autenticación Híbrida */}
      <AuthModal
        isOpen={showAuthModal}
        lang={lang}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={(authUser) => {
          setUser(authUser);
          setShowAuthModal(false);
          loadUserProfile(authUser.id);
        }}
      />

      {/* Modal Configuración Obligatoria de Alias */}
      {user && (
        <UsernameSetupModal
          isOpen={showUsernameSetup}
          userId={user.id}
          suggestedUsername={user.email ? user.email.split('@')[0] : ''}
          lang={lang}
          onSuccess={(newUsername) => {
            setProfileUsername(newUsername);
            setShowUsernameSetup(false);
          }}
        />
      )}

      {/* Modal / Pantalla de Bienvenida y Landing Guía */}
      <WelcomeLandingModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        lang={lang === 'ES' ? 'es' : 'en'}
        onLanguageChange={(newLang) => handleSetLang(newLang === 'es' ? 'ES' : 'EN')}
      />

      {/* Modal Compartir PWA con Código QR y WhatsApp */}
      <ShareAppModal
        isOpen={showShareApp}
        onClose={() => setShowShareApp(false)}
        lang={lang}
      />

      {/* Indicador sutil de conectividad offline para PWA */}
      <OfflineIndicator lang={lang} />
    </main>
  );
}
