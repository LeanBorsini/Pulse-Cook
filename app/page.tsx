'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Recipe, Ingredient, Comment } from './types';
import { User } from '@supabase/supabase-js';

import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { AuthModal } from './components/AuthModal';

const DEFAULT_FORM: Partial<Recipe> = {
  title_es: '',
  title_en: '',
  category: 'Main Dishes',
  prep_time: 15,
  servings: 2,
  description_es: '',
  description_en: '',
  instructions_es: '',
  instructions_en: '',
  youtube_url: '',
  image_url: '',
  dietary_tags: [],
};

export default function Home() {
  const [lang, setLang] = useState<'ES' | 'EN'>('ES');
  const [user, setUser] = useState<User | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Estados UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [shoppingList, setShoppingList] = useState<Ingredient[]>([]);

  // Modales
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);

  // Formulario
  const [formRecipe, setFormRecipe] = useState<Partial<Recipe>>(DEFAULT_FORM);
  const [formIngredients, setFormIngredients] = useState<Ingredient[]>([]);

  // Comentarios
  const [userName, setUserName] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // 1. Monitorear Sesión de Usuario y Cargar Recetas
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchUserProfile(currentUser.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser.id);
      } else {
        setProfileUsername(null);
      }
    });

    fetchRecipes();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    if (data?.username) {
      setProfileUsername(data.username);
      setUserName(data.username);
    }
  };

  const fetchRecipes = async () => {
    // Intenta traer las recetas junto a la tabla profiles
    const { data, error } = await supabase
      .from('recipes')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando recetas con profiles:', error.message);
      // Fallback: Si falla la relación por permisos RLS, trae solo recetas
      const { data: fallbackData } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackData) setRecipes(fallbackData as any);
    } else if (data) {
      setRecipes(data as any);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleOpenNewRecipe = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setIsEditing(false);
    setSelectedRecipe(null);
    setFormRecipe(DEFAULT_FORM);
    setFormIngredients([]);
    setShowFormModal(true);
  };

  const handleOpenDetails = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setLoadingIngredients(true);

    const [ingRes, comRes] = await Promise.all([
      supabase.from('ingredients').select('*').eq('recipe_id', recipe.id),
      supabase.from('comments').select('*').eq('recipe_id', recipe.id).order('created_at', { ascending: false }),
    ]);

    if (ingRes.data) setIngredients(ingRes.data);
    if (comRes.data) setComments(comRes.data);
    setLoadingIngredients(false);
  };

  const handleStartEdit = async (recipe: Recipe) => {
    if (!user || user.id !== recipe.user_id) {
      alert(lang === 'ES' ? 'Solo el autor puede editar esta receta' : 'Only the author can edit this recipe');
      return;
    }

    setSelectedRecipe(null);
    setIsEditing(true);

    const { data: current } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipe.id)
      .single();

    if (current) {
      setFormRecipe({
        id: current.id,
        user_id: current.user_id,
        title_es: current.title_es || '',
        title_en: current.title_en || '',
        category: current.category || 'Main Dishes',
        prep_time: Number(current.prep_time) || 15,
        servings: Number(current.servings) || 2,
        description_es: current.description_es || '',
        description_en: current.description_en || '',
        instructions_es: current.instructions_es || '',
        youtube_url: current.youtube_url || '',
        image_url: current.image_url || '',
        dietary_tags: current.dietary_tags || [],
      });
    }

    const { data: ingData } = await supabase.from('ingredients').select('*').eq('recipe_id', recipe.id);
    setFormIngredients(ingData || []);
    setShowFormModal(true);
  };

  const handleSubmitRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      title_es: formRecipe.title_es?.trim() || '',
      title_en: formRecipe.title_en?.trim() || formRecipe.title_es?.trim() || '',
      category: formRecipe.category || 'Main Dishes',
      prep_time: Number(formRecipe.prep_time) || 15,
      servings: Number(formRecipe.servings) || 1,
      description_es: formRecipe.description_es?.trim() || '',
      description_en: formRecipe.description_en?.trim() || '',
      instructions_es: formRecipe.instructions_es?.trim() || '',
      youtube_url: formRecipe.youtube_url?.trim() || '',
      image_url: formRecipe.image_url?.trim() || '',
      dietary_tags: formRecipe.dietary_tags || [],
    };

    let targetRecipeId = formRecipe.id;

    if (isEditing && targetRecipeId) {
      const { error } = await supabase.from('recipes').update(payload).eq('id', targetRecipeId);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase.from('recipes').insert([payload]).select();
      if (error || !data || !data[0]) {
        alert(`Error: ${error?.message || 'Error guardando'}`);
        return;
      }
      targetRecipeId = data[0].id;
    }

    if (targetRecipeId) {
      await supabase.from('ingredients').delete().eq('recipe_id', targetRecipeId);
      if (formIngredients.length > 0) {
        const ingredientsToInsert = formIngredients.map((ing) => ({
          name_es: ing.name_es,
          name_en: ing.name_en || ing.name_es,
          amount: Number(ing.amount) || 0,
          unit: ing.unit || 'g',
          recipe_id: targetRecipeId,
        }));
        await supabase.from('ingredients').insert(ingredientsToInsert);
      }
    }

    setShowFormModal(false);
    fetchRecipes();
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!user) return;
    if (!confirm(lang === 'ES' ? '¿Eliminar receta?' : 'Delete recipe?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
    if (error) {
      alert(error.message);
      return;
    }
    setSelectedRecipe(null);
    fetchRecipes();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!selectedRecipe || !newMessage.trim()) return;

    const authorName = profileUsername || userName || 'Anónimo';

    const { data, error } = await supabase
      .from('comments')
      .insert([{ recipe_id: selectedRecipe.id, user_name: authorName, message: newMessage }])
      .select();

    if (!error && data) {
      setComments([data[0], ...comments]);
      setNewMessage('');
    }
  };

  const toggleMenuRecipe = (recipeId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (selectedMenuIds.includes(recipeId)) {
      setSelectedMenuIds(selectedMenuIds.filter((id) => id !== recipeId));
    } else {
      setSelectedMenuIds([...selectedMenuIds, recipeId]);
    }
  };

  const handleOpenShoppingList = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (selectedMenuIds.length === 0) return;
    const { data } = await supabase.from('ingredients').select('*').in('recipe_id', selectedMenuIds);

    if (data) {
      const consolidated: Record<string, Ingredient> = {};
      data.forEach((item) => {
        const key = `${item.name_es.toLowerCase()}_${item.unit.toLowerCase()}`;
        if (consolidated[key]) {
          consolidated[key].amount += item.amount;
        } else {
          consolidated[key] = { ...item };
        }
      });
      setShoppingList(Object.values(consolidated));
    }
    setShowShoppingModal(true);
  };

  const filteredRecipes = recipes.filter((r) => {
    const title = lang === 'ES' ? r.title_es : (r.title_en || r.title_es);
    const matchesSearch = title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag ? r.dietary_tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto font-sans">
      <Header
        lang={lang}
        setLang={setLang}
        user={user}
        profileUsername={profileUsername}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onOpenNewRecipe={handleOpenNewRecipe}
        selectedCount={selectedMenuIds.length}
        onOpenShoppingList={handleOpenShoppingList}
      />

      <SearchBar
        lang={lang}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            lang={lang}
            isSelected={selectedMenuIds.includes(recipe.id)}
            user={user}
            onOpenDetails={handleOpenDetails}
            onToggleMenu={toggleMenuRecipe}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        ))}
      </section>

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          lang={lang}
          ingredients={ingredients}
          comments={comments}
          loadingIngredients={loadingIngredients}
          userName={userName}
          setUserName={setUserName}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          user={user}
          onClose={() => setSelectedRecipe(null)}
          onEdit={() => handleStartEdit(selectedRecipe)}
          onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
          onAddComment={handleAddComment}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      )}

      {showFormModal && (
        <RecipeFormModal
          lang={lang}
          isEditing={isEditing}
          formRecipe={formRecipe}
          setFormRecipe={setFormRecipe}
          formIngredients={formIngredients}
          setFormIngredients={setFormIngredients}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSubmitRecipe}
        />
      )}

      {showShoppingModal && (
        <ShoppingListModal
          lang={lang}
          shoppingList={shoppingList}
          onClose={() => setShowShoppingModal(false)}
          onClearMenu={() => {
            setSelectedMenuIds([]);
            setShoppingList([]);
            setShowShoppingModal(false);
          }}
        />
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
}