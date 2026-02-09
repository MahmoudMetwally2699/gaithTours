import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { BlogPostSummary } from '../services/blogService';

interface BlogCardProps {
  post: BlogPostSummary;
  variant?: 'default' | 'featured' | 'compact';
  className?: string;
}

export const BlogCard: React.FC<BlogCardProps> = ({
  post,
  variant = 'default',
  className = ''
}) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const lang = isRTL ? 'ar' : 'en';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const title = post.title[lang] || post.title.en;
  const excerpt = post.excerpt[lang] || post.excerpt.en;
  const categoryName = post.category?.name?.[lang] || post.category?.name?.en || '';

  if (variant === 'featured') {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className={`group relative block overflow-hidden rounded-2xl shadow-lg ${className}`}
      >
        {/* Background Image */}
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={post.featuredImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          {/* Category Badge */}
          {post.category && (
            <span
              className="inline-block text-xs font-bold text-white px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: post.category.color || '#E67915' }}
            >
              {categoryName}
            </span>
          )}

          <h3 className="text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-orange-300 transition-colors line-clamp-2">
            {title}
          </h3>

          <p className="text-white/80 text-sm line-clamp-2 mb-3">
            {excerpt}
          </p>

          <div className="flex items-center gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              {post.readTime} min
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className={`group flex gap-4 ${className}`}
      >
        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
          <img
            src={post.featuredImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h4 className="font-semibold text-gray-800 line-clamp-2 group-hover:text-orange-500 transition-colors">
            {title}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(post.publishedAt)} · {post.readTime} min
          </p>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 ${className}`}
    >
      {/* Image */}
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={post.featuredImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className={`p-5 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* Category */}
        {post.category && (
          <span
            className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3"
            style={{
              backgroundColor: `${post.category.color}15`,
              color: post.category.color || '#E67915'
            }}
          >
            {categoryName}
          </span>
        )}

        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
          {title}
        </h3>

        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {excerpt}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            {formatDate(post.publishedAt)}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            {post.readTime} min read
          </span>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;
