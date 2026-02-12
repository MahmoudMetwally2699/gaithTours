import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  DocumentTextIcon,
  PhotoIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface BlogCategory {
  _id: string;
  name: { en: string; ar: string };
  slug: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  order: number;
}

interface BlogPost {
  _id: string;
  title: { en: string; ar: string };
  slug: string;
  excerpt: { en: string; ar: string };
  content: { en: string; ar: string };
  featuredImage: string;
  category: BlogCategory;
  author: { _id: string; name: string };
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  views: number;
  readTime: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface PostForm {
  title: { en: string; ar: string };
  slug: string;
  excerpt: { en: string; ar: string };
  content: { en: string; ar: string };
  featuredImage: string;
  category: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  seo: {
    metaTitle: { en: string; ar: string };
    metaDescription: { en: string; ar: string };
  };
}

interface CategoryForm {
  name: { en: string; ar: string };
  slug: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export const BlogTab: React.FC = () => {
  const { t, i18n } = useTranslation(['admin']);
  const isRTL = i18n.language === 'ar';
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  // Tab state
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'categories'>('posts');

  // Posts state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ totalPages: number; total: number } | null>(null);

  // Modal states
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [postForm, setPostForm] = useState<PostForm>({
    title: { en: '', ar: '' },
    slug: '',
    excerpt: { en: '', ar: '' },
    content: { en: '', ar: '' },
    featuredImage: '',
    category: '',
    status: 'draft',
    isFeatured: false,
    seo: {
      metaTitle: { en: '', ar: '' },
      metaDescription: { en: '', ar: '' }
    }
  });

  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    name: { en: '', ar: '' },
    slug: '',
    icon: '📝',
    color: '#f97316',
    isActive: true
  });

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const response = await api.get('/admin/blog/posts', { params });
      if (response.data?.data?.posts) {
        setPosts(response.data.data.posts);
        setPagination(response.data.data.pagination);
      } else if (Array.isArray(response.data?.data)) {
        setPosts(response.data.data);
      } else {
        setPosts([]);
      }
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/admin/blog/categories');
      if (Array.isArray(response.data?.data)) {
        setCategories(response.data.data);
      } else if (response.data?.data?.categories) {
        setCategories(response.data.data.categories);
      } else {
        setCategories([]);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (activeSubTab === 'posts') {
      fetchPosts();
    }
  }, [activeSubTab, fetchPosts]);

  // Generate slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Handle create/edit post
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      if (editingPost) {
        await api.patch(`/admin/blog/posts/${editingPost._id}`, postForm);
        toast.success('Post updated successfully');
      } else {
        await api.post('/admin/blog/posts', postForm);
        toast.success('Post created successfully');
      }

      setShowPostModal(false);
      resetPostForm();
      fetchPosts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await api.delete(`/admin/blog/posts/${postId}`);
      toast.success('Post deleted');
      fetchPosts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    }
  };

  // Handle toggle publish
  const handleTogglePublish = async (post: BlogPost) => {
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published';
      await api.patch(`/admin/blog/posts/${post._id}/publish`, { status: newStatus });
      toast.success(newStatus === 'published' ? 'Post published' : 'Post unpublished');
      fetchPosts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update post');
    }
  };

  // Handle create/edit category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      if (editingCategory) {
        await api.patch(`/admin/blog/categories/${editingCategory._id}`, categoryForm);
        toast.success('Category updated');
      } else {
        await api.post('/admin/blog/categories', categoryForm);
        toast.success('Category created');
      }

      setShowCategoryModal(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await api.delete(`/admin/blog/categories/${categoryId}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  // Edit post
  const openEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setPostForm({
      title: post.title || { en: '', ar: '' },
      slug: post.slug,
      excerpt: post.excerpt || { en: '', ar: '' },
      content: post.content || { en: '', ar: '' },
      featuredImage: post.featuredImage,
      category: post.category?._id || '',
      status: post.status === 'archived' ? 'draft' : post.status,
      isFeatured: post.isFeatured,
      seo: {
        metaTitle: { en: '', ar: '' },
        metaDescription: { en: '', ar: '' }
      }
    });
    setShowPostModal(true);
  };

  // Edit category
  const openEditCategory = (category: BlogCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      icon: category.icon || '📝',
      color: category.color || '#f97316',
      isActive: category.isActive
    });
    setShowCategoryModal(true);
  };

  const resetPostForm = () => {
    setEditingPost(null);
    setPostForm({
      title: { en: '', ar: '' },
      slug: '',
      excerpt: { en: '', ar: '' },
      content: { en: '', ar: '' },
      featuredImage: '',
      category: '',
      status: 'draft',
      isFeatured: false,
      seo: {
        metaTitle: { en: '', ar: '' },
        metaDescription: { en: '', ar: '' }
      }
    });
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: { en: '', ar: '' },
      slug: '',
      icon: '📝',
      color: '#f97316',
      isActive: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="text-gray-600">Create and manage blog posts and categories</p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === 'posts' ? (
            <button
              onClick={() => { resetPostForm(); setShowPostModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              New Post
            </button>
          ) : (
            <button
              onClick={() => { resetCategoryForm(); setShowCategoryModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              New Category
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab('posts')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'posts'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4 inline mr-2" />
          Posts ({posts?.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'categories'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TagIcon className="w-4 h-4 inline mr-2" />
          Categories ({categories?.length || 0})
        </button>
      </div>

      {/* Posts Tab */}
      {activeSubTab === 'posts' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name?.[lang] || cat.name?.en || ''}</option>
              ))}
            </select>
          </div>

          {/* Posts Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No posts found</p>
                <p className="text-sm text-gray-400">Create your first blog post to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Post</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Category</th>
                      <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                      <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Views</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Date</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {post.featuredImage && (
                              <img
                                src={post.featuredImage}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900 line-clamp-1">{post.title?.[lang] || post.title?.en || ''}</p>
                              <p className="text-sm text-gray-500 line-clamp-1">{post.excerpt?.[lang] || post.excerpt?.en || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {post.category && (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg">
                              {post.category.name?.[lang] || post.category.name?.en || ''}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                            post.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              post.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            {post.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-gray-600">{post.views}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-500">{formatDate(post.createdAt)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View post"
                            >
                              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                            </a>
                            <button
                              onClick={() => handleTogglePublish(post)}
                              className={`p-2 rounded-lg transition-colors ${
                                post.status === 'published'
                                  ? 'text-yellow-600 hover:bg-yellow-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openEditPost(post)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  Page {page} of {pagination.totalPages} ({pagination.total} posts)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Categories Tab */}
      {activeSubTab === 'categories' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No categories found</p>
              <p className="text-sm text-gray-400">Create your first category to organize posts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Category</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Slug</th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon || '📝'}</span>
                          <div>
                            <p className="font-medium text-gray-900">{category.name?.[lang] || category.name?.en || ''}</p>
                            {category.name?.ar && lang === 'en' && (
                              <p className="text-sm text-gray-500" dir="rtl">{category.name.ar}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {category.slug}
                        </code>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          category.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditCategory(category)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category._id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPostModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingPost ? 'Edit Post' : 'Create New Post'}
                </h3>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePost} className="p-6 space-y-6">
              {/* Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (English) *</label>
                  <input
                    type="text"
                    required
                    value={postForm.title.en}
                    onChange={(e) => {
                      setPostForm({
                        ...postForm,
                        title: { ...postForm.title, en: e.target.value },
                        slug: editingPost ? postForm.slug : generateSlug(e.target.value)
                      });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="Enter post title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (Arabic)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={postForm.title.ar}
                    onChange={(e) => setPostForm({ ...postForm, title: { ...postForm.title, ar: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="أدخل عنوان المقال"
                  />
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={postForm.slug}
                  onChange={(e) => setPostForm({ ...postForm, slug: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono text-sm"
                  placeholder="post-url-slug"
                />
              </div>

              {/* Excerpt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt (English)</label>
                  <textarea
                    rows={3}
                    value={postForm.excerpt.en}
                    onChange={(e) => setPostForm({ ...postForm, excerpt: { ...postForm.excerpt, en: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="Brief description of the post"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt (Arabic)</label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={postForm.excerpt.ar}
                    onChange={(e) => setPostForm({ ...postForm, excerpt: { ...postForm.excerpt, ar: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="وصف موجز للمقال"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (English) *</label>
                  <textarea
                    rows={8}
                    required
                    value={postForm.content.en}
                    onChange={(e) => setPostForm({ ...postForm, content: { ...postForm.content, en: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="Write your post content here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (Arabic)</label>
                  <textarea
                    rows={8}
                    dir="rtl"
                    value={postForm.content.ar}
                    onChange={(e) => setPostForm({ ...postForm, content: { ...postForm.content, ar: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="اكتب محتوى المقال هنا..."
                  />
                </div>
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL</label>
                <input
                  type="url"
                  value={postForm.featuredImage}
                  onChange={(e) => setPostForm({ ...postForm, featuredImage: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={postForm.category}
                    onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name?.[lang] || cat.name?.en || ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={postForm.status}
                    onChange={(e) => setPostForm({ ...postForm, status: e.target.value as 'draft' | 'published' })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={postForm.isFeatured}
                      onChange={(e) => setPostForm({ ...postForm, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured Post</span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all font-medium disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Saving...
                    </span>
                  ) : (
                    editingPost ? 'Update Post' : 'Create Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name.en}
                    onChange={(e) => {
                      setCategoryForm({
                        ...categoryForm,
                        name: { ...categoryForm.name, en: e.target.value },
                        slug: editingCategory ? categoryForm.slug : generateSlug(e.target.value)
                      });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (Arabic)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={categoryForm.name.ar}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: { ...categoryForm.name, ar: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    placeholder="اسم الفئة"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono text-sm"
                  placeholder="category-slug"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-center text-2xl"
                    placeholder="📝"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-full h-11 border border-gray-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogTab;
