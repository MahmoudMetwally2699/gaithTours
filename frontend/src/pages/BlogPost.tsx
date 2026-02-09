import React, { useState, useEffect } from 'react';
import { useParams, Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
  ShareIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { getBlogPost, BlogPost as BlogPostType, BlogPostSummary } from '../services/blogService';
import BlogCard from '../components/BlogCard';

interface Params {
  slug: string;
}

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<Params>();
  const { t, i18n } = useTranslation(['common']);
  const history = useHistory();
  const isRTL = i18n.language === 'ar';
  const lang = isRTL ? 'ar' : 'en';

  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError('');
      try {
        const { post: data, related } = await getBlogPost(slug);
        setPost(data);
        setRelatedPosts(related);

        // Update document title for SEO
        document.title = data.metaTitle?.[lang] || data.title[lang] || data.title.en;
      } catch (err: any) {
        console.error('Failed to fetch post:', err);
        setError(t('blog.postNotFound', 'Post not found'));
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
      window.scrollTo(0, 0);
    }
  }, [slug, lang, t]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title[lang] || post?.title.en,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{error || t('blog.postNotFound', 'Post not found')}</h1>
        <Link
          to="/blog"
          className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          {t('blog.backToBlog', 'Back to Blog')}
        </Link>
      </div>
    );
  }

  const title = post.title[lang] || post.title.en;
  const content = post.content[lang] || post.content.en;
  const categoryName = post.category?.name?.[lang] || post.category?.name?.en || '';

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Image */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img
          src={post.featuredImage}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => history.goBack()}
          className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/30 transition-colors`}
        >
          <ArrowLeftIcon className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          {t('common.back', 'Back')}
        </button>

        {/* Title Overlay */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 md:p-12 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="max-w-4xl mx-auto">
            {post.category && (
              <span
                className="inline-block text-sm font-bold text-white px-3 py-1 rounded-full mb-4"
                style={{ backgroundColor: post.category.color || '#E67915' }}
              >
                {categoryName}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {post.readTime} {t('blog.minRead', 'min read')}
              </span>
              <span className="flex items-center gap-1">
                <EyeIcon className="w-4 h-4" />
                {post.viewCount} {t('blog.views', 'views')}
              </span>
              <button
                onClick={handleShare}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <ShareIcon className="w-4 h-4" />
                {t('common:hotels.share', 'Share')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Author */}
        {post.author && (
          <div className="flex items-center gap-3 mb-8 pb-8 border-b">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
              {post.author.name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{post.author.name}</div>
              <div className="text-sm text-gray-500">{t('blog.author', 'Author')}</div>
            </div>
          </div>
        )}

        {/* Post Content */}
        <div
          className={`prose prose-lg max-w-none ${isRTL ? 'prose-rtl' : ''}`}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Linked Hotels */}
        {post.linkedHotels && post.linkedHotels.length > 0 && (
          <div className="mt-12 p-6 bg-orange-50 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t('blog.recommendedHotels', 'Recommended Hotels')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {post.linkedHotels.map((hotel, idx) => (
                <Link
                  key={idx}
                  to={`/hotel/${hotel.hotelId}`}
                  className="flex items-center gap-4 bg-white p-4 rounded-xl hover:shadow-md transition-shadow"
                >
                  {hotel.hotelImage && (
                    <img
                      src={hotel.hotelImage}
                      alt={hotel.hotelName}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="font-semibold text-gray-800 hover:text-orange-500">
                    {hotel.hotelName}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                >
                  {tag[lang] || tag.en}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              {t('blog.relatedPosts', 'Related Articles')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <BlogCard key={relatedPost._id} post={relatedPost} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPostPage;
