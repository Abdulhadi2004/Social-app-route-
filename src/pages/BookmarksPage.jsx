import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { getBookmarks } from '../services/api';

export function BookmarksPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const { data } = await getBookmarks();
      if (data?.success !== false && data?.data != null) {
        const list = Array.isArray(data.data)
          ? data.data
          : data.data?.posts ?? data.data?.bookmarks ?? data.data ?? [];
        setPosts(list);
      } else {
        setPosts([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load bookmarks');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePostUpdated = () => load();
  const handlePostDeleted = () => load();

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Bookmarks</h1>
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-slate-400 text-center py-12">No bookmarked posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onUpdate={handlePostUpdated}
              onDelete={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
