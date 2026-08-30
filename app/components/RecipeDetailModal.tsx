'use client';

import { X, Clock, Users, Edit, Trash2, Video, MessageSquare, Send } from 'lucide-react';
import { Recipe, Ingredient } from '../types';
import { User } from '@supabase/supabase-js';

interface RecipeDetailModalProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  comments?: any[];
  loadingIngredients?: boolean;
  userName?: string;
  setUserName?: (val: string) => void;
  newMessage?: string;
  setNewMessage?: (val: string) => void;
  lang: 'ES' | 'EN';
  user: User | null;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onAddComment?: (e: React.FormEvent) => void;
  onOpenAuth: () => void;
}

export function RecipeDetailModal({
  recipe,
  ingredients,
  comments = [],
  loadingIngredients,
  userName = '',
  setUserName,
  newMessage = '',
  setNewMessage,
  lang,
  user,
  onClose,
  onEdit,
  onDelete,
  onAddComment,
  onOpenAuth,
}: RecipeDetailModalProps) {
  const getEmbedYoutubeUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const youtubeEmbed = getEmbedYoutubeUrl(recipe.youtube_url);
  
  // Buscar la imagen en cualquier propiedad posible de la DB
  const rawImage = recipe.image_url || (recipe as any).image;
  const imageUrl = rawImage && rawImage.trim() !== '' ? rawImage : null;

  // Buscar las instrucciones en cualquier propiedad posible
  const instructionsText = recipe.instructions_es || (recipe as any).instructions || recipe.instructions_en;

  // Lógica de autor y propietario
  const authorName = (recipe as any).profiles?.username || 'leanBorsini';
  const isOwner = user && (recipe.user_id === user.id || recipe.user_id === null);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4]/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Renderizado Seguro de Imagen */}
        {imageUrl && (
          <div className="w-full h-56 mb-4 rounded-xl overflow-hidden border border-[#D8D3C4] bg-black/5">
            <img
              src={imageUrl}
              alt={recipe.title_es || 'Receta'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).parentElement!.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Encabezado con botones alineados */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#2C3523]">
              {lang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es}
            </h2>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              by @{authorName}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Solo se muestran Editar y Eliminar si el usuario es el creador/admin */}
            {isOwner && (
              <>
                <button
                  onClick={() => onEdit(recipe)}
                  title="Editar"
                  className="p-1.5 rounded-lg bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] hover:bg-[#E2DEC2] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(recipe.id)}
                  title="Eliminar"
                  className="p-1.5 rounded-lg bg-red-100 border border-red-300 text-red-700 hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              title="Cerrar"
              className="p-1.5 rounded-lg bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] hover:bg-[#E2DEC2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadatos */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#5C6650] mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {lang === 'ES' ? `Preparación: ${recipe.prep_time || 0}m` : `Prep time: ${recipe.prep_time || 0}m`}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {recipe.servings || 1} {lang === 'ES' ? 'Porciones' : 'Servings'}
          </span>
          <span className="bg-[#2C3523] text-[#F7F5EC] px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
            {recipe.category || 'General'}
          </span>
        </div>

        {recipe.description_es && (
          <p className="text-xs text-[#5C6650] mb-4 italic">
            {lang === 'ES' ? recipe.description_es : recipe.description_en || recipe.description_es}
          </p>
        )}

        {/* Video Tutorial */}
        {youtubeEmbed && (
          <div className="mb-5">
            <h3 className="font-serif font-bold text-[#2C3523] mb-2 text-xs flex items-center gap-1.5">
              <Video className="w-4 h-4 text-red-600" />
              {lang === 'ES' ? 'Video Tutorial' : 'Video Tutorial'}
            </h3>
            <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#D8D3C4]">
              <iframe
                src={youtubeEmbed}
                title="YouTube Video"
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Ingredientes */}
        <div className="mb-5">
          <h3 className="font-serif font-bold text-[#2C3523] mb-2 text-xs">
            {lang === 'ES' ? 'Ingredientes' : 'Ingredients'}
          </h3>
          {loadingIngredients ? (
            <p className="text-xs text-gray-500">{lang === 'ES' ? 'Cargando ingredientes...' : 'Loading ingredients...'}</p>
          ) : ingredients && ingredients.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-xs text-[#2C3523]">
              {ingredients.map((ing, i) => (
                <li key={i}>
                  <span className="font-semibold">{ing.amount} {ing.unit}</span> - {lang === 'ES' ? ing.name_es : ing.name_en || ing.name_es}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">{lang === 'ES' ? 'Sin ingredientes registrados.' : 'No ingredients.'}</p>
          )}
        </div>

        {/* Instrucciones */}
        {instructionsText ? (
          <div className="mb-5 border-t border-[#D8D3C4] pt-4">
            <h3 className="font-serif font-bold text-[#2C3523] mb-2 text-xs">
              {lang === 'ES' ? 'Instrucciones' : 'Instructions'}
            </h3>
            <div className="text-xs text-[#2C3523] whitespace-pre-line leading-relaxed bg-[#EFECE1] p-3 rounded-xl border border-[#D8D3C4]">
              {instructionsText}
            </div>
          </div>
        ) : (
          <div className="mb-5 border-t border-[#D8D3C4] pt-4">
            <h3 className="font-serif font-bold text-[#2C3523] mb-1 text-xs">
              {lang === 'ES' ? 'Instrucciones' : 'Instructions'}
            </h3>
            <p className="text-xs text-gray-400 italic">
              {lang === 'ES' ? 'No hay instrucciones escritas para esta receta.' : 'No instructions provided.'}
            </p>
          </div>
        )}

        {/* Sección Comentarios */}
        <div className="border-t border-[#D8D3C4] pt-4">
          <h3 className="font-serif font-bold text-[#2C3523] mb-3 text-xs flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {lang === 'ES' ? 'Comentarios' : 'Comments'}
          </h3>

          {user ? (
            <form onSubmit={onAddComment} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === 'ES' ? 'Escribe un comentario...' : 'Write a comment...'}
                  value={newMessage}
                  onChange={(e) => setNewMessage && setNewMessage(e.target.value)}
                  required
                  className="flex-1 bg-[#EFECE1] border border-[#D8D3C4] px-3 py-1.5 rounded-lg text-xs outline-none"
                />
                <button
                  type="submit"
                  className="bg-[#2C3523] text-[#F7F5EC] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-[#3D4932]"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-4 p-3 bg-[#EFECE1]/80 rounded-lg text-center text-xs text-stone-600 border border-[#D8D3C4]">
              <button onClick={onOpenAuth} className="font-bold text-[#2C3523] underline">
                {lang === 'ES' ? 'Inicia sesión' : 'Sign in'}
              </button> {lang === 'ES' ? 'para dejar un comentario.' : 'to leave a comment.'}
            </div>
          )}

          <div className="space-y-2 max-h-36 overflow-y-auto">
            {comments.map((c, i) => (
              <div key={i} className="bg-[#EFECE1]/60 p-2.5 rounded-lg border border-[#D8D3C4] text-xs">
                <span className="font-bold text-[#2C3523]">{c.user_name || 'Anónimo'}: </span>
                <span className="text-[#5C6650]">{c.message}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}