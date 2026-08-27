'use client';

import { Search } from 'lucide-react';

const TAG_TRANSLATIONS: Record<string, { ES: string; EN: string }> = {
  'glutenfree': { ES: 'Sin Gluten', EN: 'Gluten Free' },
  'dairyfree': { ES: 'Sin Lácteos', EN: 'Dairy Free' },
  'vegetarian': { ES: 'Vegetariano', EN: 'Vegetarian' },
  'vegan': { ES: 'Vegano', EN: 'Vegan' },
  'nutfree': { ES: 'Sin Frutos Secos', EN: 'Nut Free' },
  'lowcarb': { ES: 'Bajo en Carbohidratos', EN: 'Low Carb' },
  'keto': { ES: 'Keto', EN: 'Keto' },
  'quick': { ES: 'Rápido', EN: 'Quick' },
};

interface SearchBarProps {
  lang: 'ES' | 'EN';
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}

export function SearchBar({
  lang,
  searchTerm,
  setSearchTerm,
  selectedTag,
  setSelectedTag,
}: SearchBarProps) {
  return (
    <section className="mb-8 space-y-4">
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3 text-[#5C6650]" />
        <input
          type="text"
          placeholder={lang === 'ES' ? 'Buscar receta o ingrediente...' : 'Search recipe or ingredient...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#EFECE1] border border-[#D8D3C4] pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#2C3523]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag(null)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
            selectedTag === null ? 'bg-[#2C3523] text-[#F7F5EC]' : 'bg-[#EFECE1] text-[#5C6650] border border-[#D8D3C4]'
          }`}
        >
          {lang === 'ES' ? 'Todas' : 'All'}
        </button>
        {Object.keys(TAG_TRANSLATIONS).slice(0, 5).map((tagKey) => (
          <button
            key={tagKey}
            onClick={() => setSelectedTag(selectedTag === tagKey ? null : tagKey)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              selectedTag === tagKey ? 'bg-[#2C3523] text-[#F7F5EC]' : 'bg-[#EFECE1] text-[#5C6650] border border-[#D8D3C4]'
            }`}
          >
            {TAG_TRANSLATIONS[tagKey][lang]}
          </button>
        ))}
      </div>
    </section>
  );
}