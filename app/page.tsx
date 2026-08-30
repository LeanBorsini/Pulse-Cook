'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Header } from './components/Header';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { AuthModal } from './components/AuthModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { Recipe, Ingredient, Comment } from './types';
import { User } from '@supabase/supabase-js';

export default function Home() {
  const [lang, setLang] = useState<'ES' | 'EN'>('ES');
  const [user, setUser] = useState<User | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  // Estados de datos
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Todas');

  // Estados para Modales
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState<boolean>(false);

  // Comentarios
  const [newMessage, setNewMessage] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);

  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState<boolean>(false);

  // Carga de Sesión y Perfil
  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfileUsername(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    if (data?.username) {
      setProfileUsername(data.username);
    }
  };

  // Cargar Recetas desde Supabase
  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*, profiles(id, username, avatar_url)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecipes(data as Recipe[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // Cargar Ingredientes al abrir una receta
  const handleOpenRecipeDetails = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setLoadingIngredients(true);

    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('recipe_id', recipe.id);

    if (!error && data) {
      setRecipeIngredients(data);
    } else {
      setRecipeIngredients([]);
    }
    setLoadingIngredients(false);
  };

  // Filtros de búsqueda
  const tags = ['Todas', 'Sin Gluten', 'Sin Lácteos', 'Vegetariano', 'Vegano', 'Sin Frutos Secos'];

  const filteredRecipes = recipes.filter((recipe) => {
    const title = lang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es;
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedTag === 'Todas') return matchesSearch;
    return matchesSearch && recipe.dietary_tags?.includes(selectedTag);
  });

  // Alternar selección de menú de compras (REQUIERE SESIÓN)
  const toggleMenuRecipe = (id: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setSelectedRecipeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Manejar Borrado de Receta
  const handleDeleteRecipe = async (id: string) => {
    if (!confirm(lang === 'ES' ? '¿Deseas eliminar esta receta?' : 'Delete this recipe?')) return;

    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) {
      setSelectedRecipe(null);
      fetchRecipes();
    }
  };

  // Agregar comentario
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedRecipe) return;

    const newCommentObj: Comment = {
      id: Date.now().toString(),
      recipe_id: selectedRecipe.id,
      user_name: profileUsername || user.email?.split('@')[0] || 'leanBorsini',
      message: newMessage,
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, newCommentObj]);
    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-[#ece9e1] text-stone-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Header
          lang={lang}
          setLang={setLang}
          user={user}
          profileUsername={profileUsername}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSignOut={() => supabase.auth.signOut()}
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
        />

        <div className="mb-8 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder={lang === 'ES' ? 'Buscar receta o ingrediente...' : 'Search recipe or ingredient...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4f2eb] border border-stone-300 rounded-2xl py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-stone-500 transition-all"
            />
            <span className="absolute left-4 top-3.5 text-stone-400">🔍</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedTag === tag
                    ? 'bg-[#2b382b] text-white'
                    : 'bg-[#f4f2eb] text-stone-600 border border-stone-300 hover:bg-stone-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-stone-500 text-sm">
            {lang === 'ES' ? 'Cargando recetas...' : 'Loading recipes...'}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-sm">
            {lang === 'ES' ? 'No se encontraron recetas.' : 'No recipes found.'}
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
              />
            ))}
          </div>
        )}

        {selectedRecipe && (
          <RecipeDetailModal
            recipe={selectedRecipe}
            ingredients={recipeIngredients}
            loadingIngredients={loadingIngredients}
            comments={comments}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onAddComment={handleAddComment}
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
          onClose={() => setIsAuthOpen(false)} 
        />

        {isFormOpen && (
          <RecipeFormModal
            recipeToEdit={recipeToEdit}
            lang={lang}
            user={user}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchRecipes();
            }}
          />
        )}

        {isShoppingListOpen && (
          <ShoppingListModal
            selectedRecipeIds={selectedRecipeIds}
            recipes={recipes}
            lang={lang}
            onClose={() => setIsShoppingListOpen(false)}
          />
        )}
      </div>
    </div>
  );
}