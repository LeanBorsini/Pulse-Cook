'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { INITIAL_RECIPES, SAMPLE_INGREDIENTS } from '@/lib/sampleData';
import { Header } from './components/Header';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { AuthModal } from './components/AuthModal';
import { UsernameSetupModal } from './components/UsernameSetupModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import ChefAssistantModal from './components/ChefAssistantModal';
import { Recipe, Ingredient, Comment } from './types';
import { User } from '@supabase/supabase-js';
import { Star, Clock, Sparkles } from 'lucide-react';

export default function Home() {
  const [lang, setLang] = useState<'ES' | 'EN'>('ES');
  const [user, setUser] = useState<User | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  // Estados de datos
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Todas');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'prepTime'>('recent');

  // Estados para Modales
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState<boolean>(false);

  // Comentarios y Calificaciones
  const [newMessage, setNewMessage] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [userRatingsMap, setUserRatingsMap] = useState<Record<string, number>>({});

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);

  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState<boolean>(false);
  const [isChefAIOpen, setIsChefAIOpen] = useState<boolean>(false);

  // Cargar calificaciones del usuario actual
  const fetchUserRatings = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('recipe_id, stars')
        .eq('user_id', userId);

      if (!error && data) {
        const map: Record<string, number> = {};
        data.forEach((r: { recipe_id: string; stars: number }) => {
          map[r.recipe_id] = r.stars;
        });
        setUserRatingsMap(map);
      }
    } catch (err) {
      console.warn('[Pulse&Cook] Error fetching ratings:', err);
    }
  }, []);

  const checkAndFetchProfile = useCallback(async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!error && data?.username && data.username.trim() !== '') {
        setProfileUsername(data.username);
        setIsUsernameModalOpen(false);
      } else {
        setIsUsernameModalOpen(true);
      }
    } catch (err) {
      console.warn('[Pulse&Cook] Error fetching user profile:', err);
    }
  }, []);

  // Cargar Recetas desde Supabase junto con cálculo de calificaciones
  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*, profiles(id, username, avatar_url)')
        .order('created_at', { ascending: false });

      const ratingsMap: Record<string, { total: number; count: number }> = {};
      try {
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('recipe_id, stars');

        if (ratingsData) {
          ratingsData.forEach((r: { recipe_id: string; stars: number }) => {
            if (!ratingsMap[r.recipe_id]) {
              ratingsMap[r.recipe_id] = { total: 0, count: 0 };
            }
            ratingsMap[r.recipe_id].total += r.stars;
            ratingsMap[r.recipe_id].count += 1;
          });
        }
      } catch {
        // Fallback si la tabla aún no existe
      }

      if (!recipesError && recipesData && recipesData.length > 0) {
        const enriched: Recipe[] = recipesData.map((rec: Recipe) => {
          const rStats = ratingsMap[rec.id];
          return {
            ...rec,
            avg_rating: rStats && rStats.count > 0 ? rStats.total / rStats.count : rec.avg_rating || 0,
            ratings_count: rStats ? rStats.count : rec.ratings_count || 0,
          };
        });
        setRecipes(enriched);
      } else {
        setRecipes(
          INITIAL_RECIPES.map((r, idx) => ({
            ...r,
            avg_rating: idx === 0 ? 4.9 : idx === 1 ? 4.8 : idx === 2 ? 4.7 : 4.6,
            ratings_count: idx === 0 ? 12 : idx === 1 ? 8 : idx === 2 ? 5 : 9,
          }))
        );
      }
    } catch {
      setRecipes(INITIAL_RECIPES);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga de Sesión y Perfil
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAndFetchProfile(session.user);
          fetchUserRatings(session.user.id);
        }
      } catch (err) {
        console.warn('[Pulse&Cook] Supabase auth getSession:', err);
      }
    };

    fetchSession();

    try {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAndFetchProfile(session.user);
          fetchUserRatings(session.user.id);
        } else {
          setProfileUsername(null);
          setUserRatingsMap({});
          setIsUsernameModalOpen(false);
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe?.();
      };
    } catch {
      // Offline fallback
    }
  }, [checkAndFetchProfile, fetchUserRatings]);

  useEffect(() => {
    let ignore = false;
    const fetchAll = async () => {
      if (!ignore) {
        await loadRecipes();
      }
    };
    fetchAll();
    return () => {
      ignore = true;
    };
  }, [loadRecipes]);

  // Cargar comentarios y detalles al abrir una receta
  const handleOpenRecipeDetails = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setLoadingIngredients(true);
    setLoadingComments(true);

    // 1. Cargar ingredientes
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('recipe_id', recipe.id);

      if (!error && data && data.length > 0) {
        setRecipeIngredients(data);
      } else {
        setRecipeIngredients(SAMPLE_INGREDIENTS[recipe.id] || []);
      }
    } catch {
      setRecipeIngredients(SAMPLE_INGREDIENTS[recipe.id] || []);
    } finally {
      setLoadingIngredients(false);
    }

    // 2. Cargar comentarios de Supabase
    try {
      const { data: commentsData, error: commentsErr } = await supabase
        .from('comments')
        .select('*')
        .eq('recipe_id', recipe.id)
        .order('created_at', { ascending: false });

      if (!commentsErr && commentsData) {
        setComments(commentsData as Comment[]);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Manejo de Calificación (1 a 5 estrellas)
  const handleRateRecipe = async (stars: number) => {
    if (!user || !selectedRecipe) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('ratings')
        .upsert(
          {
            recipe_id: selectedRecipe.id,
            user_id: user.id,
            stars,
          },
          { onConflict: 'recipe_id,user_id' }
        );

      if (!error) {
        setUserRatingsMap((prev) => ({ ...prev, [selectedRecipe.id]: stars }));
        
        setRecipes((prev) =>
          prev.map((r) => {
            if (r.id === selectedRecipe.id) {
              const prevUserRating = userRatingsMap[r.id];
              const prevCount = r.ratings_count || 0;
              const prevAvg = r.avg_rating || 0;
              
              let newCount = prevCount;
              let newTotal = prevAvg * prevCount;

              if (prevUserRating) {
                newTotal = newTotal - prevUserRating + stars;
              } else {
                newCount += 1;
                newTotal += stars;
              }

              const newAvg = newCount > 0 ? newTotal / newCount : stars;
              const updated = { ...r, avg_rating: newAvg, ratings_count: newCount };
              setSelectedRecipe(updated);
              return updated;
            }
            return r;
          })
        );
      }
    } catch (err) {
      console.warn('[Pulse&Cook] Error updating rating:', err);
    }
  };

  // Extracción dinámica de tags a partir de todas las recetas
  const availableTags = Array.from(
    new Set([
      'Todas',
      'Sin Gluten',
      'Sin Lácteos',
      'Vegetariano',
      'Vegano',
      ...recipes.flatMap((r) => r.dietary_tags || []),
    ])
  ).filter(Boolean);

  // Filtrado y Ordenamiento
  const filteredRecipes = recipes
    .filter((recipe) => {
      const title = lang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es;
      const desc = lang === 'ES' ? recipe.description_es : recipe.description_en || recipe.description_es;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        title.toLowerCase().includes(q) ||
        (desc && desc.toLowerCase().includes(q)) ||
        (recipe.dietary_tags && recipe.dietary_tags.some((t) => t.toLowerCase().includes(q)));

      if (selectedTag === 'Todas') return matchesSearch;
      return matchesSearch && recipe.dietary_tags?.includes(selectedTag);
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingA = a.avg_rating || 0;
        const ratingB = b.avg_rating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.ratings_count || 0) - (a.ratings_count || 0);
      }
      if (sortBy === 'prepTime') {
        return (a.prep_time || 0) - (b.prep_time || 0);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  // Alternar selección de menú de compras
  const toggleMenuRecipe = (id: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setSelectedRecipeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Guardar receta generada por el Chef IA
  const handleSaveChefRecipe = async (newRecipeData: Partial<Recipe> & { generatedIngredients?: Ingredient[] }) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const recipeToInsert = {
        title_es: newRecipeData.title_es || '',
        title_en: newRecipeData.title_en || newRecipeData.title_es || '',
        description_es: newRecipeData.description_es || '',
        description_en: newRecipeData.description_en || newRecipeData.description_es || '',
        instructions_es: newRecipeData.instructions_es || '',
        instructions_en: newRecipeData.instructions_en || newRecipeData.instructions_es || '',
        category: newRecipeData.category || 'Almuerzo / Cena',
        prep_time: newRecipeData.prep_time || 30,
        servings: newRecipeData.servings || 2,
        dietary_tags: newRecipeData.dietary_tags || [],
        user_id: user.id,
      };

      const { data: insertedRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([recipeToInsert])
        .select()
        .single();

      if (recipeError) {
        console.warn('[Pulse&Cook] Error saving AI recipe in Supabase:', recipeError);
      }

      const recipeId = insertedRecipe?.id || Date.now().toString();

      // Guardar ingredientes si existen
      if (newRecipeData.generatedIngredients && newRecipeData.generatedIngredients.length > 0) {
        const ingredientsToInsert = newRecipeData.generatedIngredients.map((ing) => ({
          recipe_id: recipeId,
          name_es: ing.name_es || ing.name_en || '',
          name_en: ing.name_en || ing.name_es || '',
          amount: ing.amount || 1,
          unit: ing.unit || 'unidad',
        }));

        try {
          await supabase.from('ingredients').insert(ingredientsToInsert);
        } catch {
          // Fallback
        }
      }

      await loadRecipes();
    } catch (err) {
      console.warn('[Pulse&Cook] Error in handleSaveChefRecipe:', err);
    }
  };

  // Manejar Borrado de Receta
  const handleDeleteRecipe = async (id: string) => {
    if (!confirm(lang === 'ES' ? '¿Deseas eliminar esta receta?' : 'Delete this recipe?')) return;

    try {
      await supabase.from('recipes').delete().eq('id', id);
    } catch (err) {
      console.warn('[Pulse&Cook] Error deleting remote recipe:', err);
    }
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setSelectedRecipe(null);
  };

  // Agregar comentario persistente a Supabase
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedRecipe) return;

    const commentData = {
      recipe_id: selectedRecipe.id,
      user_id: user.id,
      user_name: profileUsername || user.email?.split('@')[0] || 'chef',
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    const tempId = Date.now().toString();
    const optimisticComment: Comment = { id: tempId, ...commentData };
    setComments((prev) => [optimisticComment, ...prev]);
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();

      if (!error && data) {
        setComments((prev) => prev.map((c) => (c.id === tempId ? (data as Comment) : c)));
      }
    } catch (err) {
      console.warn('[Pulse&Cook] Error inserting comment:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EC] text-[#2C3523] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Header
          lang={lang}
          setLang={setLang}
          user={user}
          profileUsername={profileUsername}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSignOut={() => {
            supabase.auth.signOut().catch(() => {});
            setUser(null);
            setProfileUsername(null);
            setUserRatingsMap({});
            setIsUsernameModalOpen(false);
          }}
          onOpenNewRecipe={() => {
            if (!user) {
              setIsAuthOpen(true);
            } else {
              setRecipeToEdit(null);
              setIsFormOpen(true);
            }
          }}
          selectedCount={selectedRecipeIds.length}
          onOpenShoppingList={() => {
            if (!user) {
              setIsAuthOpen(true);
            } else {
              setIsShoppingListOpen(true);
            }
          }}
          onOpenChefAI={() => setIsChefAIOpen(true)}
        />

        {/* Barra de Filtros, Búsqueda y Ordenamiento */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={lang === 'ES' ? 'Buscar por receta, ingrediente o etiqueta...' : 'Search by recipe, ingredient or tag...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-[#2C3523] shadow-sm outline-none focus:border-[#2C3523] transition-all"
              />
              <span className="absolute left-4 top-3.5 text-[#5C6650]">🔍</span>
            </div>

            {/* Selector de Ordenamiento */}
            <div className="flex items-center gap-1.5 bg-[#EFECE1] border border-[#D8D3C4] rounded-2xl p-1.5 self-start sm:self-auto shadow-sm">
              <button
                onClick={() => setSortBy('recent')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  sortBy === 'recent'
                    ? 'bg-[#2C3523] text-[#F7F5EC]'
                    : 'text-[#5C6650] hover:text-[#2C3523] hover:bg-[#E2DEC2]'
                }`}
                title={lang === 'ES' ? 'Ordenar por más recientes' : 'Sort by newest'}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ES' ? 'Recientes' : 'Newest'}</span>
              </button>

              <button
                onClick={() => setSortBy('rating')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  sortBy === 'rating'
                    ? 'bg-[#2C3523] text-[#F7F5EC]'
                    : 'text-[#5C6650] hover:text-[#2C3523] hover:bg-[#E2DEC2]'
                }`}
                title={lang === 'ES' ? 'Ordenar por mejor calificación' : 'Sort by top rated'}
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{lang === 'ES' ? 'Mejor Valoradas' : 'Top Rated'}</span>
              </button>

              <button
                onClick={() => setSortBy('prepTime')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  sortBy === 'prepTime'
                    ? 'bg-[#2C3523] text-[#F7F5EC]'
                    : 'text-[#5C6650] hover:text-[#2C3523] hover:bg-[#E2DEC2]'
                }`}
                title={lang === 'ES' ? 'Ordenar por tiempo de preparación' : 'Sort by fastest'}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{lang === 'ES' ? 'Más Rápidas' : 'Fastest'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedTag === tag
                    ? 'bg-[#2C3523] text-[#F7F5EC]'
                    : 'bg-[#EFECE1] text-[#5C6650] border border-[#D8D3C4] hover:bg-[#E2DEC2]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#5C6650] text-sm">
            {lang === 'ES' ? 'Cargando recetas y calificaciones...' : 'Loading recipes and ratings...'}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12 text-[#5C6650] text-sm">
            {lang === 'ES' ? 'No se encontraron recetas con los filtros seleccionados.' : 'No recipes found with the selected filters.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                lang={lang}
                isSelected={selectedRecipeIds.includes(recipe.id)}
                user={user}
                onOpenDetails={handleOpenRecipeDetails}
                onToggleMenu={toggleMenuRecipe}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            ))}
          </div>
        )}

        {selectedRecipe && (
          <RecipeDetailModal
            recipe={selectedRecipe}
            ingredients={recipeIngredients}
            loadingIngredients={loadingIngredients}
            loadingComments={loadingComments}
            comments={comments}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onAddComment={handleAddComment}
            userRating={userRatingsMap[selectedRecipe.id] || 0}
            onRate={handleRateRecipe}
            lang={lang}
            user={user}
            onClose={() => setSelectedRecipe(null)}
            onEdit={(recipe) => {
              setSelectedRecipe(null);
              setRecipeToEdit(recipe);
              setIsFormOpen(true);
            }}
            onDelete={handleDeleteRecipe}
            onOpenAuth={() => {
              setSelectedRecipe(null);
              setIsAuthOpen(true);
            }}
          />
        )}

        <AuthModal 
          isOpen={isAuthOpen}
          lang={lang}
          onClose={() => setIsAuthOpen(false)}
          onAuthenticated={(verifiedUser) => {
            setUser(verifiedUser);
            checkAndFetchProfile(verifiedUser);
            fetchUserRatings(verifiedUser.id);
          }}
        />

        {user && isUsernameModalOpen && (
          <UsernameSetupModal
            isOpen={isUsernameModalOpen}
            userId={user.id}
            suggestedUsername={user.email?.split('@')[0] || ''}
            lang={lang}
            onSuccess={(newAlias) => {
              setProfileUsername(newAlias);
              setIsUsernameModalOpen(false);
            }}
          />
        )}

        {isFormOpen && (
          <RecipeFormModal
            recipeToEdit={recipeToEdit}
            lang={lang}
            user={user}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false);
              loadRecipes();
            }}
          />
        )}

        {isShoppingListOpen && (
          <ShoppingListModal
            selectedRecipeIds={selectedRecipeIds}
            recipes={recipes}
            lang={lang}
            onClose={() => setIsShoppingListOpen(false)}
            onClearMenu={() => setSelectedRecipeIds([])}
          />
        )}

        {isChefAIOpen && (
          <ChefAssistantModal
            isOpen={isChefAIOpen}
            lang={lang}
            user={user}
            onClose={() => setIsChefAIOpen(false)}
            onSaveRecipe={handleSaveChefRecipe}
          />
        )}
      </div>
    </div>
  );
}
