'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ChefTip, TipCategoryKey } from '@/app/types';
import { CHEF_TIP_CATEGORIES } from '@/lib/chefTipsData';
import { canManageTip, toggleTipLike, rateChefTip } from '@/lib/tipStore';
import {
  Search,
  Plus,
  Heart,
  Star,
  Clock,
  MessageSquare,
  Sparkles,
  ArrowUpDown,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Flame,
  LayoutGrid,
  Scissors,
  Zap,
  Cake,
  Flag,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface ChefTipsFeedProps {
  tips: ChefTip[];
  lang: 'ES' | 'EN';
  user: User | null;
  profileUsername: string | null;
  onOpenNewTip: () => void;
  onOpenTipDetail: (tip: ChefTip) => void;
  onEditTip: (tip: ChefTip) => void;
  onDeleteTip: (tipId: string) => void;
  onTipUpdated?: (updatedTip: ChefTip) => void;
  onOpenAuth: () => void;
  onReportTip?: (tip: ChefTip) => void;
}

export function ChefTipsFeed({
  tips,
  lang,
  user,
  onOpenNewTip,
  onOpenTipDetail,
  onEditTip,
  onDeleteTip,
  onTipUpdated,
  onOpenAuth,
  onReportTip,
}: ChefTipsFeedProps) {
  const isEs = lang === 'ES';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TipCategoryKey | 'all'>('all');
  const [sortBy, setSortBy] = useState<'likes' | 'rating' | 'recent'>('likes');

  // Filtro y ordenamiento
  const filteredTips = useMemo(() => {
    return tips
      .filter((tip) => {
        if (selectedCategory !== 'all' && tip.category !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle =
            tip.title_es.toLowerCase().includes(q) ||
            (tip.title_en && tip.title_en.toLowerCase().includes(q));
          const matchSummary =
            tip.summary_es.toLowerCase().includes(q) ||
            (tip.summary_en && tip.summary_en.toLowerCase().includes(q));
          const matchContent =
            (tip.content_es && tip.content_es.toLowerCase().includes(q)) ||
            (tip.content_en && tip.content_en.toLowerCase().includes(q));
          const catMeta = CHEF_TIP_CATEGORIES.find((c) => c.key === tip.category);
          const matchCategory =
            catMeta &&
            (catMeta.label_es.toLowerCase().includes(q) ||
              catMeta.label_en.toLowerCase().includes(q) ||
              catMeta.tag.toLowerCase().includes(q));

          if (!matchTitle && !matchSummary && !matchContent && !matchCategory) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'likes') {
          return (b.likes_count || 0) - (a.likes_count || 0);
        }
        if (sortBy === 'rating') {
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        }
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [tips, searchQuery, selectedCategory, sortBy]);

  // Manejador de Like rápido desde la tarjeta
  const handleQuickLike = async (e: React.MouseEvent, tip: ChefTip) => {
    e.stopPropagation();
    const { likesCount, userLiked } = await toggleTipLike(tip.id, user?.id);
    const updated = {
      ...tip,
      likes_count: likesCount,
      user_liked: userLiked,
    };
    if (onTipUpdated) onTipUpdated(updated);
  };

  // Manejador de Rating rápido
  const handleQuickRate = async (e: React.MouseEvent, tip: ChefTip, stars: number) => {
    e.stopPropagation();
    const { avgRating, ratingsCount, userRating } = await rateChefTip(tip.id, stars, user?.id);
    const updated = {
      ...tip,
      avg_rating: avgRating,
      ratings_count: ratingsCount,
      user_rating: userRating,
    };
    if (onTipUpdated) onTipUpdated(updated);
  };

  const getCategoryIcon = (key: TipCategoryKey) => {
    switch (key) {
      case 'knife_skills':
        return <Scissors className="w-3.5 h-3.5" />;
      case 'organization':
        return <LayoutGrid className="w-3.5 h-3.5" />;
      case 'heat_control':
        return <Flame className="w-3.5 h-3.5" />;
      case 'flavor_seasoning':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'shortcuts_conservation':
        return <Zap className="w-3.5 h-3.5" />;
      case 'baking':
        return <Cake className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Banner Introductorio Elegante */}
      <div className="bg-gradient-to-r from-[#2C3523] via-[#3A462E] to-[#4B5A3D] text-[#FAF8F2] rounded-3xl p-5 sm:p-7 shadow-sm border border-[#2C3523]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-400 text-[#2C3523] text-[10px] font-black uppercase rounded-md tracking-wider">
              {isEs ? 'Comunidad & Técnica' : 'Community & Technique'}
            </span>
            <span className="text-xs text-amber-200 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{isEs ? 'Tips de 30-60 seg' : '30-60s hacks'}</span>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-handwritten tracking-wide text-[#FAF8F2]">
            {isEs
              ? 'Tips & Hacks de Chef: Cocina Profesional en Casa'
              : 'Chef Tips & Hacks: Professional Cooking at Home'}
          </h2>
          <p className="font-cozy text-xs sm:text-sm text-[#FAF8F2]/90 leading-relaxed">
            {isEs
              ? 'Pequeños trucos de ciencia culinaria, ergonomía y mise en place para hacer tu cocina más amena, cómoda y deliciosa.'
              : 'Quick culinary science secrets, ergonomics, and mise en place hacks to make home cooking joyful, effortless, and professional.'}
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              onOpenAuth();
              return;
            }
            onOpenNewTip();
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF8F2] text-[#2C3523] hover:bg-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          id="add-chef-tip-btn"
        >
          <Plus className="w-4 h-4 text-[#2C3523]" />
          <span>{isEs ? 'Compartir Mi Tip' : 'Share My Hack'}</span>
        </button>
      </div>

      {/* Buscador de Tips */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5C6650]">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isEs
              ? 'Buscar truco (ej: trapo húmedo, ácido, sartenes, maillard, pasta...)'
              : 'Search hack (e.g. damp towel, acid, sear, pasta water, garlic...)'
          }
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8D3C4] rounded-2xl text-xs sm:text-sm text-[#2C3523] placeholder-[#5C6650]/70 focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 shadow-2xs"
          id="chef-tips-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-[#5C6650] hover:text-[#2C3523] cursor-pointer"
          >
            {isEs ? 'Limpiar' : 'Clear'}
          </button>
        )}
      </div>

      {/* Píldoras de Categorías Temáticas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-[#2C3523] text-white shadow-xs'
              : 'bg-[#EFECE1] text-[#5C6650] hover:text-[#2C3523] border border-[#D8D3C4]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isEs ? 'Todos los Hacks' : 'All Hacks'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10">
            {tips.length}
          </span>
        </button>

        {CHEF_TIP_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          const count = tips.filter((t) => t.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'border-[#2C3523] bg-[#2C3523] text-white shadow-xs'
                  : 'border-[#D8D3C4] bg-white text-[#2C3523] hover:bg-[#EFECE1]'
              }`}
            >
              {getCategoryIcon(cat.key)}
              <span>{cat.tag}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#EFECE1] text-[#5C6650]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de Ordenamiento & Total */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b border-[#D8D3C4]/60">
        <div className="text-xs font-semibold text-[#5C6650] flex items-center gap-1.5">
          <span>
            {filteredTips.length}{' '}
            {isEs
              ? filteredTips.length === 1 ? 'tip disponible' : 'tips disponibles'
              : filteredTips.length === 1 ? 'hack available' : 'hacks available'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-[#5C6650] flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            {isEs ? 'Ordenar:' : 'Sort:'}
          </span>
          <div className="flex bg-[#EFECE1] border border-[#D8D3C4] rounded-xl p-0.5">
            <button
              onClick={() => setSortBy('likes')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                sortBy === 'likes'
                  ? 'bg-[#2C3523] text-[#FAF8F2] shadow-xs font-bold'
                  : 'text-[#5C6650] hover:text-[#2C3523]'
              }`}
            >
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>{isEs ? 'Más útiles' : 'Most helpful'}</span>
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                sortBy === 'rating'
                  ? 'bg-[#2C3523] text-[#FAF8F2] shadow-xs font-bold'
                  : 'text-[#5C6650] hover:text-[#2C3523]'
              }`}
            >
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{isEs ? 'Mejor puntuados' : 'Top rated'}</span>
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sortBy === 'recent'
                  ? 'bg-[#2C3523] text-[#FAF8F2] shadow-xs font-bold'
                  : 'text-[#5C6650] hover:text-[#2C3523]'
              }`}
            >
              {isEs ? 'Recientes' : 'Recent'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Tips */}
      {filteredTips.length === 0 ? (
        <div className="text-center py-16 bg-[#EFECE1]/50 border border-dashed border-[#D8D3C4] rounded-3xl p-8 max-w-lg mx-auto">
          <Sparkles className="w-10 h-10 text-[#5C6650] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-[#2C3523] mb-1">
            {isEs ? 'No se encontraron tips con este criterio' : 'No hacks found matching criteria'}
          </h3>
          <p className="text-xs text-[#5C6650] mb-4">
            {isEs
              ? 'Prueba con otra palabra clave o selecciona otra categoría temática.'
              : 'Try searching other terms or select another category filter.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 bg-[#2C3523] text-white rounded-xl text-xs font-semibold hover:bg-[#3D4932] cursor-pointer"
          >
            {isEs ? 'Ver todos los tips' : 'View all hacks'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTips.map((tip) => {
            const catMeta = CHEF_TIP_CATEGORIES.find((c) => c.key === tip.category);
            const canManage = canManageTip(tip, user);
            const displayTitle = isEs ? tip.title_es : tip.title_en || tip.title_es;
            const displaySummary = isEs ? tip.summary_es : tip.summary_en || tip.summary_es;
            const authorAlias = tip.profiles?.username || tip.author_username || 'Chef';

            return (
              <article
                key={tip.id}
                onClick={() => onOpenTipDetail(tip)}
                className="bg-white border border-[#D8D3C4] rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col group relative"
                id={`chef-tip-card-${tip.id}`}
              >
                {/* Imagen demostrativa si existe */}
                {tip.image_url && (
                  <div className="relative w-full h-36 overflow-hidden bg-[#EFECE1]">
                    <Image
                      src={tip.image_url}
                      alt={displayTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Tiempo de lectura flotante */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/50 text-white backdrop-blur-xs rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{tip.read_time_seconds || 45}s</span>
                    </div>

                    {/* Tag de Categoría flotante */}
                    {catMeta && (
                      <div
                        className="absolute bottom-2.5 left-3 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-xs backdrop-blur-xs"
                        style={{ backgroundColor: catMeta.color }}
                      >
                        {catMeta.tag}
                      </div>
                    )}
                  </div>
                )}

                {/* Contenido Principal de la Tarjeta */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Si no había imagen, mostramos la categoría aquí */}
                    {!tip.image_url && (
                      <div className="flex items-center justify-between">
                        {catMeta && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-xs"
                            style={{ backgroundColor: catMeta.color }}
                          >
                            {catMeta.tag}
                          </span>
                        )}
                        <span className="text-[10px] text-[#5C6650] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{tip.read_time_seconds || 45}s</span>
                        </span>
                      </div>
                    )}

                    <h3 className="text-2xl sm:text-[26px] font-handwritten font-bold text-[#2C3523] leading-[1.2] group-hover:text-[#3D4932] transition-colors tracking-wide pt-0.5">
                      {displayTitle}
                    </h3>

                    <p className="font-cozy text-xs sm:text-[13px] text-[#38432E] leading-relaxed line-clamp-3">
                      {displaySummary}
                    </p>
                  </div>

                  {/* Pie de tarjeta con interacción */}
                  <div className="pt-3 border-t border-[#D8D3C4]/60 flex items-center justify-between gap-2">
                    {/* Likes e Interacción */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleQuickLike(e, tip)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                          tip.user_liked
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-[#F7F5EC] text-[#5C6650] hover:text-rose-600 border border-[#D8D3C4]'
                        }`}
                        title={isEs ? 'Marcar como útil' : 'Mark as helpful'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            tip.user_liked ? 'fill-rose-600 text-rose-600' : 'text-rose-500'
                          }`}
                        />
                        <span>{tip.likes_count || 0}</span>
                      </button>

                      {/* Estrellas */}
                      <div
                        onClick={(e) => handleQuickRate(e, tip, 5)}
                        className={`flex items-center gap-1 px-2 py-1 bg-[#F7F5EC] border border-[#D8D3C4] rounded-xl text-xs font-bold ${
                          tip.ratings_count && tip.ratings_count > 0 ? 'text-[#2C3523]' : 'text-[#8C977D]'
                        }`}
                        title={
                          tip.ratings_count && tip.ratings_count > 0
                            ? `${isEs ? 'Puntuación promedio' : 'Average rating'}: ${tip.avg_rating?.toFixed(1)} (${tip.ratings_count} ${tip.ratings_count === 1 ? (isEs ? 'voto' : 'rating') : (isEs ? 'votos' : 'ratings')})`
                            : isEs
                            ? 'Sin valoraciones aún (haz clic para calificar)'
                            : 'No ratings yet (click to rate)'
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            tip.ratings_count && tip.ratings_count > 0
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-[#B8BEAF]'
                          }`}
                        />
                        <span>
                          {tip.ratings_count && tip.ratings_count > 0 && tip.avg_rating
                            ? tip.avg_rating.toFixed(1)
                            : '0'}
                        </span>
                      </div>

                      {/* Experiencias / Comentarios */}
                      <div
                        className="flex items-center gap-1 px-2 py-1 bg-[#F7F5EC] border border-[#D8D3C4] rounded-xl text-xs font-medium text-[#5C6650]"
                        title={isEs ? 'Ver experiencias y comentarios' : 'View experiences and comments'}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#5C6650]" />
                        <span>{tip.comments_count || 0}</span>
                      </div>
                    </div>

                    {/* Autor / Acciones */}
                    <div className="flex items-center gap-1 text-[11px] text-[#5C6650]">
                      <span className="truncate max-w-[90px] font-semibold">
                        @{authorAlias}
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onEditTip(tip)}
                            className="p-1 hover:bg-[#EFECE1] text-[#5C6650] hover:text-[#2C3523] rounded-lg transition-colors"
                            title={isEs ? 'Editar tip' : 'Edit hack'}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(isEs ? '¿Eliminar este tip?' : 'Delete this hack?')) {
                                onDeleteTip(tip.id);
                              }
                            }}
                            className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title={isEs ? 'Eliminar tip' : 'Delete hack'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {onReportTip && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              onOpenAuth();
                              return;
                            }
                            onReportTip(tip);
                          }}
                          className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-colors ml-0.5"
                          title={isEs ? 'Denunciar tip' : 'Report tip'}
                        >
                          <Flag className="w-3 h-3 text-red-500/80" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
