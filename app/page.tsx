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
import { Recipe, Ingredient, Comment, ChefTip } from './types';
import {
  getLocalRecipes,
  saveLocalRecipe,
  deleteLocalRecipe,
  getLocalIngredients,
  saveLocalIngredients,
  batchSaveLocalIngredients,
  reconcileLocalRecipesWithRemote,
  normalizeRecipeTitle,
} from '@/lib/recipeStore';
import {
  getLocalUserRating,
  saveLocalRating,
  syncRatingToSupabase,
  fetchCommunityRatings,
  getConsolidatedRating,
} from '@/lib/ratingStore';
import { fetchTipsWithSync, saveChefTip, deleteChefTip, getLocalTips } from '@/lib/tipStore';
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
import { ChefTipsModal } from './components/ChefTipsModal';
import { ChefTipDetailModal } from './components/ChefTipDetailModal';
import { ChefTipFormModal } from './components/ChefTipFormModal';
import { ReportModal, ReportModalTarget } from './components/ReportModal';
import { ModerationDrawer } from './components/ModerationDrawer';
import { UtensilsCrossed, Clock, Star, ArrowUpDown, Plus, Sparkles } from 'lucide-react';
import { getCategoryKey, getCategoryLabel } from '@/lib/categories';
import { translateIngredientName } from '@/lib/culinaryDictionary';
import { MAIN_AUTHOR_CONFIG, isModeratorOrAdmin } from '@/lib/constants';
import { getPendingReportsCount, isUserLocallyBanned } from '@/lib/reportStore';

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
  status?: 'active' | 'under_review' | 'hidden' | 'deleted';
  reports_count?: number;
}

/**
 * Componente Principal de Pulse&Cook (Home / app/page.tsx)
 *
 * Responsabilidades Arquitectónicas:
 * 1. Orquestación del estado global (sesión de usuario, idioma ES/EN, catálogo de recetas, filtros activos).
 * 2. Carga reactiva de recetas e ingredientes híbrida (Supabase DB + LocalStorage v3 offline-first).
 * 3. Gestión de modales de la aplicación:
 *    - Detalle de receta (`RecipeDetailModal`) con panel de autor y confirmación de borrado.
 *    - Creación / Edición integral (`RecipeFormModal`) con hidratación de ingredientes.
 *    - Asistente culinario IA Remy (`ChefAssistantModal`).
 *    - Planificador de menú semanal y compras (`ShoppingListModal`).
 *    - Autenticación segura (`AuthModal`) y Guía de usuario (`WelcomeLandingModal`).
 * 4. Suscripción y ciclo de vida de Supabase Auth sin bucles reactivos.
 */
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

  // Custom Servings per Recipe in Menu (Persists across reloads & sessions)
  const [menuServings, setMenuServings] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pulse_menu_servings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (err) {
        console.warn('Error loading saved menu servings:', err);
      }
    }
    return {};
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

  // Persist menu servings whenever changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pulse_menu_servings', JSON.stringify(menuServings));
      } catch (err) {
        console.warn('Error saving menu servings:', err);
      }
    }
  }, [menuServings]);

  // Update servings for a recipe in menu (sólo usuarios autenticados)
  const handleUpdateMenuServings = (recipeId: string, newServings: number) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const sanitized = Math.max(1, Math.min(99, Math.round(newServings)));
    setMenuServings((prev) => ({
      ...prev,
      [recipeId]: sanitized,
    }));
  };

  // Clear entire menu and stored checks
  const handleClearMenu = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedRecipeIds([]);
    setMenuServings({});
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('pulse_menu_recipe_ids');
        localStorage.removeItem('pulse_menu_servings');
        localStorage.removeItem('pulse_shopping_list_checks');
      } catch (err) {
        console.warn('Error clearing menu storage:', err);
      }
    }
  };

  // Modals
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeToEditIngredients, setRecipeToEditIngredients] = useState<Ingredient[]>([]);
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

  // Modal de Tips & Hacks de Chef (abierto desde el menú lateral)
  const [showChefTipsModal, setShowChefTipsModal] = useState<boolean>(false);

  // Estado de Tips & Hacks de Chef
  const [chefTips, setChefTips] = useState<ChefTip[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalTips();
    }
    return [];
  });
  const [selectedTipForDetail, setSelectedTipForDetail] = useState<ChefTip | null>(null);
  const [tipToEdit, setTipToEdit] = useState<ChefTip | null>(null);
  const [isCreatingTip, setIsCreatingTip] = useState<boolean>(false);

  // Active Recipe Details (Ingredients & Comments)
  const [activeIngredients, setActiveIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState<boolean>(false);
  const [activeComments, setActiveComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [newCommentMessage, setNewCommentMessage] = useState<string>('');
  const [currentUserRating, setCurrentUserRating] = useState<number>(0);

  // Moderación & Denuncias
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  const [isModerationDrawerOpen, setIsModerationDrawerOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalTarget, setReportModalTarget] = useState<ReportModalTarget | null>(null);

  const handleOpenReport = useCallback((target: ReportModalTarget) => {
    setReportModalTarget(target);
    setIsReportModalOpen(true);
  }, []);

  const refreshPendingReportsCount = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) {
      setPendingReportsCount(0);
      return;
    }
    const isMod = isModeratorOrAdmin(currentUser, profileUsername, userRole);
    if (!isMod) {
      setPendingReportsCount(0);
      return;
    }
    try {
      const count = await getPendingReportsCount(currentUser, profileUsername, userRole);
      setPendingReportsCount(count);
    } catch (err) {
      console.warn('Error refreshing reports count:', err);
    }
  }, [profileUsername, userRole]);

  useEffect(() => {
    let isCancelled = false;
    const updateReportsCount = async () => {
      await Promise.resolve();
      if (isCancelled) return;
      if (!user) {
        setPendingReportsCount(0);
        return;
      }
      const isMod = isModeratorOrAdmin(user, profileUsername, userRole);
      if (!isMod) {
        setPendingReportsCount(0);
        return;
      }
      try {
        const count = await getPendingReportsCount(user, profileUsername, userRole);
        if (!isCancelled) setPendingReportsCount(count);
      } catch (err) {
        console.warn('Error refreshing reports count:', err);
      }
    };
    updateReportsCount();
    return () => {
      isCancelled = true;
    };
  }, [user, userRole, profileUsername]);

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
      const isMain = userId === MAIN_AUTHOR_CONFIG.UUID || userRef.current?.email === MAIN_AUTHOR_CONFIG.EMAIL;
      if (isMain) {
        setUserRole('admin');
      }

      // Comprobar baneo local
      if (!isMain && isUserLocallyBanned(userId)) {
        console.warn('User is locally banned. Signing out.');
        await supabase.auth.signOut();
        alert(lang === 'ES' ? 'Esta cuenta ha sido suspendida por moderación.' : 'This account has been suspended by moderation.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, role, is_banned')
        .eq('id', userId)
        .single();

      if (data) {
        if (!isMain && data.is_banned) {
          console.warn('User account is banned in Supabase profiles. Signing out.');
          await supabase.auth.signOut();
          alert(lang === 'ES' ? 'Esta cuenta ha sido suspendida por el Administrador.' : 'This account has been suspended by an Administrator.');
          return;
        }

        if (data.username) {
          setProfileUsername(data.username);
        }
        if (data.role) {
          setUserRole(data.role);
        } else if (isMain) {
          setUserRole('admin');
        }
      } else if (!error || error.code === 'PGRST116') {
        setShowUsernameSetup(true);
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
  }, [lang]);

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
        // 2. Obtener perfiles de autores para atribución
        const profileMap = new Map<string, { id: string; username: string; avatar_url?: string }>();
        let daniProfile: { id: string; username: string; avatar_url?: string } | null = null;
        try {
          // Consultar perfiles de autores disponibles
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url');

          if (profilesData) {
            profilesData.forEach((p) => {
              profileMap.set(p.id, p);
              if (p.username && p.username.toLowerCase() === 'danicooker') {
                daniProfile = p;
              }
            });
          }
        } catch (profErr) {
          console.warn('Profiles lookup optional note:', profErr);
        }

        // 3. Obtener valoraciones comunitarias sincronizadas en la nube
        let ratingsMap = new Map<string, { userId: string; stars: number }[]>();
        try {
          ratingsMap = await fetchCommunityRatings();
        } catch (ratErr) {
          console.warn('Community ratings lookup note:', ratErr);
        }

        // 4. Formatear y normalizar cada receta
        const currentUser = userOverride !== undefined ? userOverride : userRef.current;
        const formatted: Recipe[] = rawRecipes.map((item) => {
          const communityRatings = ratingsMap.get(item.id) || [];
          const count = communityRatings.length;
          const avg = count > 0 
            ? communityRatings.reduce((acc, r) => acc + r.stars, 0) / count 
            : (typeof item.avg_rating === 'number' ? item.avg_rating : 0);

          let myRating = 0;
          if (currentUser && communityRatings.length > 0) {
            const userRat = communityRatings.find((r) => r.userId === currentUser.id);
            if (userRat) myRating = userRat.stars;
          }

          // Resolver autor fidedigno
          const rawTitle = (item.title_es || item.title_en || item.title || '').toLowerCase();
          const isBizcochoDani = rawTitle.includes('bizcocho humedo');

          const effectiveUserId = isBizcochoDani
            ? (daniProfile?.id || (item.user_id !== MAIN_AUTHOR_CONFIG.UUID && item.user_id ? item.user_id : 'daniCooker'))
            : (item.user_id || MAIN_AUTHOR_CONFIG.UUID);

          const authorProfile = isBizcochoDani
            ? (daniProfile || { id: effectiveUserId, username: 'daniCooker' })
            : (profileMap.get(effectiveUserId) || (item.user_id ? profileMap.get(item.user_id) : null));

          const resolvedProfiles =
            authorProfile ||
            item.profiles ||
            (item.author_name
              ? { id: effectiveUserId, username: item.author_name }
              : (isBizcochoDani
                  ? { id: effectiveUserId, username: 'daniCooker' }
                  : { id: MAIN_AUTHOR_CONFIG.UUID, username: MAIN_AUTHOR_CONFIG.USERNAME }));

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
            user_id: effectiveUserId,
            author_name: isBizcochoDani ? 'daniCooker' : (item.author_name || resolvedProfiles?.username),
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
            status: item.status || 'active',
            reports_count: item.reports_count || 0,
          };
        });

        // Reconciliar y purgar cualquier duplicado local temporal que ya exista en Supabase
        const reconciledLocal = reconcileLocalRecipesWithRemote(formatted);

        // Combinar recetas: base canónica remota de Supabase + locales no sincronizadas
        const combined = [...formatted];
        reconciledLocal.forEach((localRecipe) => {
          const existsById = combined.some((r) => r.id === localRecipe.id);
          const normLocalTitle = normalizeRecipeTitle(localRecipe.title_es);
          const existsByTitle = combined.some(
            (r) => normalizeRecipeTitle(r.title_es) === normLocalTitle
          );

          if (!existsById && !existsByTitle) {
            combined.push(localRecipe);
          } else if (existsById) {
            const idx = combined.findIndex((r) => r.id === localRecipe.id);
            combined[idx] = {
              ...combined[idx],
              ...localRecipe,
              profiles: combined[idx].profiles || localRecipe.profiles,
              user_id: combined[idx].user_id || localRecipe.user_id,
              author_name: combined[idx].author_name || localRecipe.author_name,
              avg_rating: combined[idx].avg_rating || localRecipe.avg_rating,
              ratings_count: combined[idx].ratings_count || localRecipe.ratings_count,
              user_rating: combined[idx].user_rating || localRecipe.user_rating,
            };
          }
        });

        // Asegurar que cada receta del listado tenga su calificación consolidada al día
        const finalizedRecipes = combined.map((r) => {
          const ratingSummary = getConsolidatedRating(r.id, r.avg_rating, r.ratings_count, currentUser?.id);
          return {
            ...r,
            avg_rating: ratingSummary.avgRating,
            ratings_count: ratingSummary.ratingsCount,
            user_rating: ratingSummary.userRating > 0 ? ratingSummary.userRating : r.user_rating,
          };
        });

        setRecipes(finalizedRecipes);

        // 5. Precargar y sincronizar en caché local todos los ingredientes de Supabase en segundo plano
        try {
          const { data: allRemoteIngs, error: ingsErr } = await supabase
            .from('ingredients')
            .select('*');

          if (!ingsErr && allRemoteIngs && allRemoteIngs.length > 0) {
            const mapByRecipe: Record<string, Ingredient[]> = {};
            allRemoteIngs.forEach((ing) => {
              if (ing.recipe_id) {
                if (!mapByRecipe[ing.recipe_id]) mapByRecipe[ing.recipe_id] = [];
                mapByRecipe[ing.recipe_id].push(ing);
              }
            });
            batchSaveLocalIngredients(mapByRecipe);
          }
        } catch (ingsPrefetchErr) {
          console.warn('Background ingredients prefetch note:', ingsPrefetchErr);
        }
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

    // Suscripción en tiempo real: recetas y valoraciones de la comunidad
    const recipesChannel = supabase
      .channel('recipes_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes' },
        () => {
          fetchRecipes();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          fetchRecipes();
        }
      )
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user || null;
      setUser(currentUser);
      userRef.current = currentUser;

      if (currentUser) {
        await loadUserProfile(currentUser.id);
      } else {
        setProfileUsername(null);
        setSelectedRecipeIds([]);
        setMenuServings({});
        setShowShoppingList(false);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('pulse_menu_recipe_ids');
            localStorage.removeItem('pulse_menu_servings');
            localStorage.removeItem('pulse_shopping_list_checks');
          } catch (e) {
            console.warn('Error clearing menu storage on signout:', e);
          }
        }
      }

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        fetchRecipes(currentUser);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(recipesChannel);
    };
  }, [loadUserProfile, fetchRecipes]);

  // Carga inicial y reactiva de Tips & Hacks de Chef
  useEffect(() => {
    let isMounted = true;
    const syncTips = async () => {
      try {
        const tips = await fetchTipsWithSync(user?.id);
        if (isMounted) {
          setChefTips(tips);
        }
      } catch (err) {
        console.warn('Error syncing chef tips:', err);
      }
    };
    syncTips();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Guardar o Actualizar Tip de Chef
  const handleSaveChefTip = async (tipData: Partial<ChefTip>) => {
    const saved = await saveChefTip(tipData, user, profileUsername);
    setChefTips((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    if (selectedTipForDetail && selectedTipForDetail.id === saved.id) {
      setSelectedTipForDetail(saved);
    }
  };

  // Eliminar Tip de Chef
  const handleDeleteChefTip = async (tipId: string) => {
    await deleteChefTip(tipId, user);
    setChefTips((prev) => prev.filter((t) => t.id !== tipId));
    if (selectedTipForDetail && selectedTipForDetail.id === tipId) {
      setSelectedTipForDetail(null);
    }
  };

  // Actualización reactiva de tip tras like o votación
  const handleChefTipUpdated = (updatedTip: ChefTip) => {
    setChefTips((prev) => prev.map((t) => (t.id === updatedTip.id ? updatedTip : t)));
    if (selectedTipForDetail && selectedTipForDetail.id === updatedTip.id) {
      setSelectedTipForDetail(updatedTip);
    }
  };

  // Load ingredients & comments when activeRecipeId changes
  const activeRecipeId = activeRecipe?.id;
  useEffect(() => {
    if (!activeRecipeId) return;

    let isMounted = true;

    const loadRecipeDetails = async () => {
      // User rating check (local y remoto)
      const localVote = getLocalUserRating(activeRecipeId, user?.id);
      setCurrentUserRating(activeRecipe?.user_rating || localVote || 0);

      // 1. Cargar ingredientes de caché local inmediatamente (0 ms de espera, sin pantallas en blanco)
      const localIngs = getLocalIngredients(activeRecipeId);
      if (localIngs && localIngs.length > 0) {
        if (isMounted) {
          setActiveIngredients(localIngs);
          setLoadingIngredients(false);
        }
      } else {
        if (isMounted) {
          setLoadingIngredients(true);
        }
      }

      setLoadingComments(true);

      // 2. Cargar/Sincronizar ingredientes desde Supabase con tolerancia a cold start
      try {
        let fetchedData: Ingredient[] | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const { data, error } = await supabase
              .from('ingredients')
              .select('*')
              .eq('recipe_id', activeRecipeId);

            if (!error && data && data.length > 0) {
              fetchedData = data;
              break;
            }
          } catch (netErr) {
            console.warn(`Supabase ingredients fetch attempt ${attempt + 1} warning:`, netErr);
            if (attempt === 0) await new Promise((res) => setTimeout(res, 400));
          }
        }

        if (!isMounted) return;

        if (fetchedData && fetchedData.length > 0) {
          setActiveIngredients(fetchedData);
          saveLocalIngredients(activeRecipeId, fetchedData);
        } else if (!localIngs || localIngs.length === 0) {
          setActiveIngredients([]);
        }
      } catch {
        if (!isMounted) return;
        if (!localIngs || localIngs.length === 0) {
          setActiveIngredients([]);
        }
      } finally {
        if (isMounted) setLoadingIngredients(false);
      }

      // 3. Cargar comentarios
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('recipe_id', activeRecipeId)
          .order('created_at', { ascending: true });

        if (!isMounted) return;

        if (!error && data) {
          const genuineComments = data.filter(
            (c) => !c.user_name?.startsWith('__rating__') && !c.message?.startsWith('[RATING:')
          );
          setActiveComments(genuineComments);
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
  }, [activeRecipeId, activeRecipe?.user_rating, user?.id]);

  // Toggle Recipe into Shopping Menu (with optional customServings, sólo usuarios autenticados)
  const handleToggleMenu = (recipeId: string, customServings?: number) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedRecipeIds((prev) => {
      const isSelected = prev.includes(recipeId);
      if (isSelected) {
        return prev.filter((id) => id !== recipeId);
      } else {
        const rec = recipes.find((r) => r.id === recipeId);
        const initialServings = customServings || rec?.servings || 2;
        setMenuServings((prevMap) => ({
          ...prevMap,
          [recipeId]: prevMap[recipeId] || initialServings,
        }));
        return [...prev, recipeId];
      }
    });
  };

  // Calificar una receta (soporta re-calificar y actualizar votos, recalculando promedio y votos)
  const handleRateRecipe = async (stars: number) => {
    if (!activeRecipe) return;

    // 1. Guardar de forma inmediata en almacenamiento local persistente
    const summary = saveLocalRating(activeRecipe.id, stars, user?.id);
    setCurrentUserRating(stars);

    // 2. Actualizar la receta activa inmediatamente
    const updatedRecipe: Recipe = {
      ...activeRecipe,
      user_rating: stars,
      avg_rating: summary.avgRating,
      ratings_count: summary.ratingsCount,
    };
    setActiveRecipe(updatedRecipe);

    // 3. Actualizar la receta en el listado general en memoria
    setRecipes((prev) =>
      prev.map((r) => (r.id === activeRecipe.id ? updatedRecipe : r))
    );

    // 4. Sincronizar en Supabase en segundo plano
    try {
      await syncRatingToSupabase(activeRecipe.id, stars, user?.id);
    } catch (err) {
      console.warn('Rating sync note:', err);
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

  // Update Comment (Only owner can edit)
  const handleUpdateComment = async (commentId: string, newMessage: string) => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setActiveComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, message: trimmed } : c))
    );

    try {
      if (!commentId.startsWith('temp-')) {
        await supabase
          .from('comments')
          .update({ message: trimmed })
          .eq('id', commentId);
      }
    } catch (err) {
      console.warn('Error updating comment in Supabase:', err);
    }
  };

  // Delete Comment (Only owner can delete)
  const handleDeleteComment = async (commentId: string) => {
    setActiveComments((prev) => prev.filter((c) => c.id !== commentId));

    try {
      if (!commentId.startsWith('temp-')) {
        await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);
      }
    } catch (err) {
      console.warn('Error deleting comment in Supabase:', err);
    }
  };

  // Delete Recipe
  const handleDeleteRecipe = async (recipeId: string) => {
    deleteLocalRecipe(recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipeId));
    setActiveRecipe(null);
    setActiveIngredients([]);
    setActiveComments([]);
    setCurrentUserRating(0);

    try {
      await supabase.from('recipes').delete().eq('id', recipeId);
    } catch (err) {
      console.warn('Delete recipe remote error:', err);
    }
  };

  // Save generated recipe from Chef AI Assistant
  const handleSaveChefRecipe = async (
    newRecipe: Partial<Recipe> & { generatedIngredients?: Ingredient[] }
  ) => {
    setShowChefAI(false);

    const standardizedCategory = getCategoryLabel(newRecipe.category, 'ES');
    let finalRecipeId: string | null = null;

    const supabasePayload = {
      title_es: newRecipe.title_es || 'Nueva Receta',
      title_en: newRecipe.title_en || '',
      category: standardizedCategory,
      prep_time: newRecipe.prep_time || 20,
      servings: newRecipe.servings || 2,
      description_es: newRecipe.description_es || '',
      description_en: newRecipe.description_en || '',
      instructions_es: newRecipe.instructions_es || '',
      instructions_en: newRecipe.instructions_en || '',
      image_url: newRecipe.image_url || '',
      images: newRecipe.images || (newRecipe.image_url ? [newRecipe.image_url] : []),
      dietary_tags: newRecipe.dietary_tags || [],
      user_id: user?.id || null,
    };

    if (user) {
      try {
        const { data: supaRec, error: supaErr } = await supabase
          .from('recipes')
          .insert([supabasePayload])
          .select()
          .single();

        if (!supaErr && supaRec) {
          finalRecipeId = supaRec.id;

          if (newRecipe.generatedIngredients && newRecipe.generatedIngredients.length > 0) {
            const ingPayload = newRecipe.generatedIngredients.map((ing) => {
              const rawEs = (ing.name_es || '').trim();
              let rawEn = (ing.name_en || '').trim();
              if (!rawEn || rawEn.toLowerCase() === rawEs.toLowerCase()) {
                rawEn = translateIngredientName(rawEs, undefined, 'EN') || rawEs;
              }
              return {
                recipe_id: supaRec.id,
                name_es: rawEs,
                name_en: rawEn,
                amount: ing.amount || 1,
                unit: ing.unit || '',
                aisle: 'General',
              };
            });
            const { error: chefIngErr } = await supabase.from('ingredients').insert(ingPayload);
            if (chefIngErr) console.error('Chef recipe ingredients insert error:', chefIngErr);
          }
        }
      } catch (err) {
        console.warn('Chef recipe remote sync error, saving locally:', err);
      }
    }

    if (!finalRecipeId) {
      finalRecipeId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const localNewRecipe: Recipe = {
      id: finalRecipeId,
      user_id: user?.id || 'local_user',
      profiles: profileUsername
        ? { id: user?.id || 'local_user', username: profileUsername }
        : { id: 'local_user', username: user?.email?.split('@')[0] || 'Mi Cocina' },
      title_es: supabasePayload.title_es,
      title_en: supabasePayload.title_en,
      category: supabasePayload.category,
      prep_time: supabasePayload.prep_time,
      servings: supabasePayload.servings,
      description_es: supabasePayload.description_es,
      description_en: supabasePayload.description_en,
      instructions_es: supabasePayload.instructions_es,
      instructions_en: supabasePayload.instructions_en,
      image_url: supabasePayload.image_url,
      images: supabasePayload.images,
      dietary_tags: supabasePayload.dietary_tags,
      created_at: new Date().toISOString(),
    };

    saveLocalRecipe(localNewRecipe, newRecipe.generatedIngredients || []);
    await fetchRecipes();
  };

  // Filtered and Sorted Recipes
  const filteredRecipes = useMemo(() => {
    const isMod = isModeratorOrAdmin(user, profileUsername, userRole);

    return recipes
      .filter((r) => {
        // Moderación: Ocultar recetas eliminadas, ocultas o bajo revisión al público general
        if (r.status === 'deleted') return false;
        if (r.status === 'hidden' && !isMod) return false;
        const isAuthor = user && r.user_id === user.id;
        if (r.status === 'under_review' && !isMod && !isAuthor) return false;

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
  }, [recipes, searchTerm, selectedCategories, selectedTags, sortBy, user, profileUsername, userRole]);

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
          setUserRole(null);
          setPendingReportsCount(0);
          setSelectedRecipeIds([]);
          setMenuServings({});
          setShowShoppingList(false);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('pulse_menu_recipe_ids');
              localStorage.removeItem('pulse_menu_servings');
              localStorage.removeItem('pulse_shopping_list_checks');
            } catch (err) {
              console.warn('Error clearing menu storage on sign out:', err);
            }
          }
        }}
        onOpenNewRecipe={() => setIsCreatingRecipe(true)}
        selectedCount={user ? selectedRecipeIds.length : 0}
        onOpenShoppingList={() => {
          if (!user) {
            setShowAuthModal(true);
          } else {
            setShowShoppingList(true);
          }
        }}
        onOpenChefAI={() => setShowChefAI(true)}
        onOpenWelcome={() => setShowWelcomeModal(true)}
        onOpenShareApp={() => setShowShareApp(true)}
        onOpenChefTips={() => setShowChefTipsModal(true)}
        userRole={userRole}
        pendingReportsCount={pendingReportsCount}
        onOpenModeration={() => setIsModerationDrawerOpen(true)}
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
                    ? filteredRecipes.length === 1
                      ? 'receta de la comunidad'
                      : 'recetas de la comunidad'
                    : filteredRecipes.length === 1
                    ? 'community recipe'
                    : 'community recipes'}
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
                  ? isEs
                    ? 'No se encontraron recetas con estos filtros'
                    : 'No recipes found with these filters'
                  : isEs
                  ? 'Aún no hay recetas publicadas'
                  : 'No recipes published yet'}
              </h3>
              <p className="text-xs text-[#5C6650] max-w-md mx-auto mb-6 leading-relaxed">
                {searchTerm || selectedCategories.length > 0 || selectedTags.length > 0
                  ? isEs
                    ? 'Prueba a cambiar el término de búsqueda o seleccionar otra categoría en el menú de filtros.'
                    : 'Try changing your search keywords or selecting another category from the filters menu.'
                  : isEs
                  ? '¡Sé el primero en compartir una receta con la comunidad o crea una con la ayuda del Chef IA!'
                  : 'Be the first to share a recipe with the community or generate one with the AI Chef!'}
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
                  isSelected={Boolean(user && selectedRecipeIds.includes(recipe.id))}
                  servingsCount={menuServings[recipe.id] || recipe.servings || 2}
                  user={user}
                  onOpenDetails={(r) => setActiveRecipe(r)}
                  onToggleMenu={handleToggleMenu}
                  onUpdateServings={handleUpdateMenuServings}
                  onOpenAuth={() => setShowAuthModal(true)}
                  onReportRecipe={(rec) => {
                    handleOpenReport({
                      type: 'recipe',
                      id: rec.id,
                      title: lang === 'ES' ? rec.title_es : rec.title_en || rec.title_es,
                      snippet: lang === 'ES' ? rec.description_es : rec.description_en,
                      reportedUserId: rec.user_id,
                      reportedUsername: rec.profiles?.username || rec.author_name,
                    });
                  }}
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
          profileUsername={profileUsername}
          userRating={currentUserRating}
          isInMenu={Boolean(user && activeRecipe && selectedRecipeIds.includes(activeRecipe.id))}
          servingsCount={activeRecipe ? (menuServings[activeRecipe.id] || activeRecipe.servings || 2) : undefined}
          onToggleMenu={handleToggleMenu}
          onUpdateServings={handleUpdateMenuServings}
          onRate={handleRateRecipe}
          onClose={() => {
            setActiveRecipe(null);
            setActiveIngredients([]);
            setActiveComments([]);
            setCurrentUserRating(0);
          }}
          onEdit={(r, ings) => {
            setActiveRecipe(null);
            setActiveIngredients([]);
            setActiveComments([]);
            setCurrentUserRating(0);
            setRecipeToEdit(r);
            setRecipeToEditIngredients(ings || []);
          }}
          onDelete={handleDeleteRecipe}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onOpenAuth={() => setShowAuthModal(true)}
          onReportRecipe={(rec) => {
            handleOpenReport({
              type: 'recipe',
              id: rec.id,
              title: lang === 'ES' ? rec.title_es : rec.title_en || rec.title_es,
              snippet: lang === 'ES' ? rec.description_es : rec.description_en,
              reportedUserId: rec.user_id,
              reportedUsername: rec.profiles?.username || rec.author_name,
            });
          }}
          onReportComment={(cmt) => {
            handleOpenReport({
              type: 'comment',
              id: cmt.id,
              title: lang === 'ES' ? `Comentario de ${cmt.user_name}` : `Comment by ${cmt.user_name}`,
              snippet: cmt.message,
              reportedUserId: cmt.user_id,
              reportedUsername: cmt.user_name,
            });
          }}
        />
      )}

      {/* Modal Crear / Editar Receta */}
      {(isCreatingRecipe || recipeToEdit) && (
        <RecipeFormModal
          recipeToEdit={recipeToEdit}
          initialIngredients={recipeToEditIngredients}
          lang={lang}
          user={user}
          onClose={() => {
            setIsCreatingRecipe(false);
            setRecipeToEdit(null);
            setRecipeToEditIngredients([]);
          }}
          onSuccess={() => {
            setIsCreatingRecipe(false);
            setRecipeToEdit(null);
            setRecipeToEditIngredients([]);
            fetchRecipes();
          }}
        />
      )}

      {/* Modal Lista Inteligente de Compras */}
      {showShoppingList && (
        <ShoppingListModal
          lang={lang}
          user={user}
          selectedRecipeIds={user ? selectedRecipeIds : []}
          recipes={recipes}
          servingsMap={menuServings}
          onUpdateServings={handleUpdateMenuServings}
          onClose={() => setShowShoppingList(false)}
          onOpenAuth={() => setShowAuthModal(true)}
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

      {/* Modal Principal de Tips & Hacks de Chef (Accedido desde el Menú Desplegable) */}
      <ChefTipsModal
        isOpen={showChefTipsModal}
        onClose={() => setShowChefTipsModal(false)}
        tips={chefTips.filter((t) => {
          const isMod = isModeratorOrAdmin(user, profileUsername, userRole);
          const isAuthor = user && (t.author_id === user.id || t.user_id === user.id);
          if (t.status === 'deleted') return false;
          if (t.status === 'hidden' && !isMod) return false;
          if (t.status === 'under_review' && !isMod && !isAuthor) return false;
          return true;
        })}
        lang={lang}
        user={user}
        profileUsername={profileUsername}
        onOpenNewTip={() => {
          if (!user) {
            setShowAuthModal(true);
          } else {
            setTipToEdit(null);
            setIsCreatingTip(true);
          }
        }}
        onOpenTipDetail={(tip) => setSelectedTipForDetail(tip)}
        onEditTip={(tip) => {
          setTipToEdit(tip);
          setIsCreatingTip(true);
        }}
        onDeleteTip={handleDeleteChefTip}
        onTipUpdated={handleChefTipUpdated}
        onOpenAuth={() => setShowAuthModal(true)}
        onReportTip={(tip) => {
          handleOpenReport({
            type: 'tip',
            id: tip.id,
            title: lang === 'ES' ? tip.title_es : tip.title_en || tip.title_es,
            snippet: lang === 'ES' ? tip.summary_es : tip.summary_en,
            reportedUserId: tip.author_id || tip.user_id,
            reportedUsername: tip.profiles?.username || tip.author_username,
          });
        }}
      />

      {/* Modal Detalle de Tip de Chef (Interactivo con Estrellas, Likes y Comentarios) */}
      {selectedTipForDetail && (
        <ChefTipDetailModal
          isOpen={Boolean(selectedTipForDetail)}
          tip={selectedTipForDetail}
          lang={lang}
          user={user}
          profileUsername={profileUsername}
          onClose={() => setSelectedTipForDetail(null)}
          onEditTip={(tip: ChefTip) => {
            setSelectedTipForDetail(null);
            setTipToEdit(tip);
            setIsCreatingTip(true);
          }}
          onDeleteTip={handleDeleteChefTip}
          onTipUpdated={handleChefTipUpdated}
          onOpenAuth={() => setShowAuthModal(true)}
          onReportTip={(tip) => {
            handleOpenReport({
              type: 'tip',
              id: tip.id,
              title: lang === 'ES' ? tip.title_es : tip.title_en || tip.title_es,
              snippet: lang === 'ES' ? tip.summary_es : tip.summary_en,
              reportedUserId: tip.author_id || tip.user_id,
              reportedUsername: tip.profiles?.username || tip.author_username,
            });
          }}
          onReportExperience={(exp) => {
            handleOpenReport({
              type: 'comment',
              id: exp.id,
              title: lang === 'ES' ? `Experiencia de ${exp.author_name}` : `Experience by ${exp.author_name}`,
              snippet: exp.comment,
              reportedUserId: exp.user_id,
              reportedUsername: exp.author_name,
            });
          }}
        />
      )}

      {/* Modal Crear / Editar Tip de Chef */}
      {isCreatingTip && (
        <ChefTipFormModal
          isOpen={isCreatingTip}
          initialTip={tipToEdit}
          lang={lang}
          onClose={() => {
            setIsCreatingTip(false);
            setTipToEdit(null);
          }}
          onSave={handleSaveChefTip}
        />
      )}

      {/* Modal para Reportar / Denunciar Contenido */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportModalTarget(null);
        }}
        lang={lang}
        user={user}
        profileUsername={profileUsername}
        target={reportModalTarget}
        onOpenAuth={() => setShowAuthModal(true)}
        onReportSubmitted={() => {
          refreshPendingReportsCount();
        }}
      />

      {/* Cajón de Moderación para Administradores y Moderadores */}
      <ModerationDrawer
        isOpen={isModerationDrawerOpen}
        onClose={() => {
          setIsModerationDrawerOpen(false);
          refreshPendingReportsCount();
        }}
        lang={lang}
        user={user}
        profileUsername={profileUsername}
        userRole={userRole}
        onContentUpdated={() => {
          fetchRecipes();
          fetchTipsWithSync(user?.id).then((tips) => setChefTips(tips));
          refreshPendingReportsCount();
        }}
      />

      {/* Indicador sutil de conectividad offline para PWA */}
      <OfflineIndicator lang={lang} />
    </main>
  );
}
