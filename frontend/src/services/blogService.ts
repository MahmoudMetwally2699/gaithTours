import api from './api';

export interface BlogCategory {
    _id: string;
    name: { en: string; ar: string };
    slug: string;
    description: { en: string; ar: string };
    icon: string;
    color: string;
    image?: string;
    order: number;
    isActive: boolean;
    postCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface LinkedHotel {
    hotelId: string;
    hotelName: string;
    hotelImage?: string;
}

export interface BlogPost {
    _id: string;
    title: { en: string; ar: string };
    slug: string;
    excerpt: { en: string; ar: string };
    content: { en: string; ar: string };
    category: BlogCategory;
    featuredImage: string;
    gallery?: string[];
    author: { _id: string; name: string; avatar?: string };
    linkedHotels?: LinkedHotel[];
    destination?: {
        name: string;
        regionId?: string;
        coordinates?: { latitude: number; longitude: number };
    };
    tags?: { en: string; ar: string }[];
    metaTitle?: { en: string; ar: string };
    metaDescription?: { en: string; ar: string };
    status: 'draft' | 'published' | 'scheduled' | 'archived';
    publishedAt?: string;
    viewCount: number;
    readTime: number;
    isFeatured: boolean;
    order: number;
    url: string;
    createdAt: string;
    updatedAt: string;
}

export interface BlogPostSummary {
    _id: string;
    title: { en: string; ar: string };
    slug: string;
    excerpt: { en: string; ar: string };
    category?: { name: { en: string; ar: string }; slug: string; color: string };
    featuredImage: string;
    author?: { name: string; avatar?: string };
    publishedAt?: string;
    readTime: number;
    isFeatured: boolean;
}

export interface BlogPagination {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
}

// Get published blog posts
export const getBlogPosts = async (params: {
    page?: number;
    limit?: number;
    category?: string;
    featured?: boolean;
    destination?: string;
    search?: string;
    language?: string;
} = {}): Promise<{ posts: BlogPostSummary[]; pagination: BlogPagination }> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.category) queryParams.append('category', params.category);
    if (params.featured) queryParams.append('featured', 'true');
    if (params.destination) queryParams.append('destination', params.destination);
    if (params.search) queryParams.append('search', params.search);
    if (params.language) queryParams.append('language', params.language);

    const response = await api.get(`/blog/posts?${queryParams.toString()}`);
    return {
        posts: response.data.data,
        pagination: response.data.pagination
    };
};

// Get single blog post by slug
export const getBlogPost = async (slug: string): Promise<{ post: BlogPost; related: BlogPostSummary[] }> => {
    const response = await api.get(`/blog/posts/${slug}`);
    return {
        post: response.data.data,
        related: response.data.related
    };
};

// Get blog categories
export const getBlogCategories = async (): Promise<BlogCategory[]> => {
    const response = await api.get('/blog/categories');
    return response.data.data;
};

// Get featured posts
export const getFeaturedPosts = async (limit = 3): Promise<BlogPostSummary[]> => {
    const response = await api.get(`/blog/featured?limit=${limit}`);
    return response.data.data;
};

// Get posts by destination
export const getDestinationPosts = async (regionId: string): Promise<BlogPostSummary[]> => {
    const response = await api.get(`/blog/destination/${regionId}`);
    return response.data.data;
};
