import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { getFeed, getPosts } from '../services/api';
import { PostCard } from '../components/PostCard';
import { CreatePostModal } from '../components/CreatePostModal';
import { getDisplayName } from '../utils/displayName';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';

const FEED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'following', label: 'Following' },
  { value: 'me', label: 'My posts' },
];

export function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedOnly, setFeedOnly] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPosts = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      setError('');
      let res;
      try {
        res = await getFeed({ only: feedOnly, page: pageNum, limit: 10 });
      } catch {
        res = await getPosts({ page: pageNum, limit: 10 });
      }
      const { data } = res;
      if (data?.success && data?.data) {
        const newPosts = Array.isArray(data.data) ? data.data : data.data.posts || data.data || [];
        setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
        setHasMore(newPosts.length >= 10);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(page, page > 1);
  }, [page, feedOnly]);

  const handlePostCreated = () => {
    setShowCreateModal(false);
    loadPosts(1);
  };

  const handlePostUpdated = () => {
    loadPosts(1);
  };

  const handlePostDeleted = () => {
    loadPosts(1);
  };

  const handleFeedChange = (only) => {
    setFeedOnly(only);
    setPage(1);
  };

  const filteredPosts = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) => {
      const text = (post.content || post.body || '').toLowerCase();
      const author = post?.author ?? post?.user ?? post?.creator;
      const authorName = getDisplayName(author).toLowerCase();
      return text.includes(q) || authorName.includes(q);
    });
  }, [posts, searchQuery]);

  return (
    <Layout>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 text-sm w-full sm:w-48 focus:outline-none focus:border-cyan-500"
            />
            {FEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFeedChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  feedOnly === opt.value
                    ? 'bg-cyan-500 text-slate-900'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-medium transition"
          >
            New Post
          </button>
        </div>
      </div>

      <div
        className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-4 shadow-sm cursor-pointer hover:border-slate-600 transition"
        onClick={() => setShowCreateModal(true)}
      >
        <div className="flex items-center gap-3">
          <Avatar user={user} size="lg" />
          <div className="flex-1 rounded-xl bg-slate-900/50 border border-slate-700 px-4 py-2.5 text-sm text-slate-500">
            What's on your mind, {getDisplayName(user)}?
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/20 text-red-400">{error}</div>
      )}

      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>{searchQuery.trim() ? 'No posts match your search.' : 'No posts yet. Create the first one!'}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
          >
            Create Post
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 items-stretch">
          {filteredPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onUpdate={handlePostUpdated}
              onDelete={handlePostDeleted}
            />
          ))}
          {hasMore && !loading && (
            <div className="text-center py-4">
              <button
                onClick={() => setPage((p) => p + 1)}
                type="button"
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePostCreated}
        />
      )}
    </Layout>
  );
}
