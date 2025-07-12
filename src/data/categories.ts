export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
}

export const VIDEO_CATEGORIES: Category[] = [
  {
    id: 'technology',
    name: 'Technology & Digital',
    description: 'Software, AI, programming, web development, and digital innovation',
    icon: '💻',
    color: '#3B82F6'
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Wellbeing',
    description: 'Medical, wellness, therapy, and health-related careers',
    icon: '🏥',
    color: '#10B981'
  },
  {
    id: 'creative',
    name: 'Creative & Media',
    description: 'Art, design, music, film, content creation, and media',
    icon: '🎨',
    color: '#F59E0B'
  },
  {
    id: 'trades',
    name: 'Skilled Trades',
    description: 'Construction, culinary, manufacturing, and hands-on skilled work',
    icon: '🔧',
    color: '#EF4444'
  },
  {
    id: 'business',
    name: 'Business & Entrepreneurship',
    description: 'Management, sales, consulting, startups, and business operations',
    icon: '💼',
    color: '#8B5CF6'
  },
  {
    id: 'sustainability',
    name: 'Sustainability & Environment',
    description: 'Environmental science, renewable energy, and conservation',
    icon: '🌱',
    color: '#059669'
  },
  {
    id: 'education',
    name: 'Education & Training',
    description: 'Teaching, coaching, curriculum development, and knowledge transfer',
    icon: '📚',
    color: '#DC2626'
  },
  {
    id: 'finance',
    name: 'Finance & Economics',
    description: 'Banking, investment, accounting, and financial services',
    icon: '💰',
    color: '#7C3AED'
  }
];

export const CATEGORY_MAP = VIDEO_CATEGORIES.reduce((map, category) => {
  map[category.id] = category;
  return map;
}, {} as Record<string, Category>);

export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORY_MAP[id];
};

export const getCategoryName = (id: string): string => {
  return CATEGORY_MAP[id]?.name || id;
};

export const getCategoryColor = (id: string): string => {
  return CATEGORY_MAP[id]?.color || '#6B7280';
};

export const getAllCategoryIds = (): string[] => {
  return VIDEO_CATEGORIES.map(c => c.id);
};

export const getAllCategoryNames = (): string[] => {
  return VIDEO_CATEGORIES.map(c => c.name);
}; 