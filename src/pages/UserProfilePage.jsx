import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { getUserProfile, getUserById, followUser, getUserPosts } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getDisplayName } from '../utils/displayName';
import { FollowListModal } from '../components/FollowListModal';
import { ImageLightbox } from '../components/ImageLightbox';

export function UserProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const isOwnProfile = currentUser && (currentUser._id === userId || currentUser.id === userId);

  useEffect(() => {
    if (!userId) {
      setError('Invalid user');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadUser = async () => {
      try {
        const { data } = await getUserProfile(userId);
        if (!cancelled && data?.success && data?.data) {
          const payload = data.data;
          const u = payload.user ?? payload;
          const merged = (u && typeof u === 'object') ? { ...u, isFollowing: payload.isFollowing ?? u.isFollowing } : payload;
          setUser(merged);
          setError('');
        } else if (!cancelled) {
          const fallback = await getUserById(userId);
          const d = fallback?.data;
          if (d?.success && d?.data) {
            const payload = d.data;
            const u = payload?.user ?? payload;
            setUser(u && typeof u === 'object' ? { ...u, isFollowing: payload?.isFollowing ?? u.isFollowing } : payload);
          } else setError('User not found');
        }
      } catch (err) {
        if (!cancelled) {
          try {
            const { data } = await getUserById(userId);
            if (data?.success && data?.data) {
              const payload = data.data;
              const u = payload?.user ?? payload;
              setUser(u && typeof u === 'object' ? { ...u, isFollowing: payload?.isFollowing ?? u.isFollowing } : payload);
              setError('');
            } else setError('User not found');
          } catch {
            setError(err.response?.data?.message || 'Could not load profile.');
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadUser();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId || !user) return;
    let cancelled = false;
    const loadPosts = async () => {
      setPostsLoading(true);
      try {
        const { data } = await getUserPosts(userId, { limit: 50 });
        if (!cancelled && data?.success !== false && data?.data != null) {
          const list = Array.isArray(data.data)
            ? data.data
            : data.data?.posts ?? data.data ?? [];
          setPosts(list);
        }
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    };
    loadPosts();
    return () => { cancelled = true; };
  }, [userId, user]);

  const handleFollow = async () => {
    if (!userId || followLoading) return;
    setFollowLoading(true);
    try {
      await followUser(userId);
      if (user) setUser({ ...user, isFollowing: !user.isFollowing });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostUpdated = () => {
    if (!userId) return;
    getUserPosts(userId, { limit: 50 }).then(({ data }) => {
      if (data?.success !== false && data?.data != null) {
        const list = Array.isArray(data.data) ? data.data : data.data?.posts ?? data.data ?? [];
        setPosts(list);
      }
    }).catch(() => {});
  };

  const handlePostDeleted = () => {
    handlePostUpdated();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
        </div>
      </Layout>
    );
  }

  if (error || !user) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-400">{error || 'User not found'}</div>
        <div className="text-center">
          <Link to="/people" className="text-cyan-400 hover:underline">Back to People</Link>
        </div>
      </Layout>
    );
  }

  const displayName = getDisplayName(user);
  const isFollowing = user.isFollowing === true;
  const coverUrl = user?.cover || user?.coverImage || user?.coverPhoto || '';
  const followersCount = Array.isArray(user?.followers) ? user.followers.length : (user?.followersCount ?? 0);
  const followingCount = Array.isArray(user?.following) ? user.following.length : (user?.followingCount ?? 0);

  return (
    <Layout>
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden mb-6">
        {/* Cover Photo */}
        <div className="relative h-48 group">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-cyan-700 via-slate-700 to-slate-800" />
          )}
          {coverUrl && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => setShowCoverLightbox(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                View cover
              </button>
            </div>
          )}
        </div>

        {/* Avatar + Info */}
        <div className="relative z-10 px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
            <div className="shrink-0">
              <div className="rounded-full ring-4 ring-slate-800 overflow-hidden w-28 h-28">
                <Avatar user={user} size="xl" className="!w-28 !h-28" />
              </div>
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              <h1 className="text-2xl font-bold text-slate-100 truncate">
                {displayName}
              </h1>
              {user.username && (
                <p className="text-slate-400 text-sm">@{user.username}</p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:pb-1">
              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-5 py-2 rounded-lg font-medium text-sm transition disabled:opacity-50 ${
                    isFollowing
                      ? 'bg-slate-700 hover:bg-red-500/20 text-slate-300 hover:text-red-400'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                  }`}
                >
                  {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
              <Link
                to="/people"
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition"
              >
                Back to People
              </Link>
            </div>
          </div>

          {user.email && (
            <p className="text-slate-500 text-sm mt-3">{user.email}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-700">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-100">{posts.length}</p>
              <p className="text-xs text-slate-500">Posts</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFollowers(true)}
              className="text-center hover:text-cyan-400 transition"
            >
              <p className="text-lg font-bold text-slate-100">{followersCount}</p>
              <p className="text-xs text-slate-500">Followers</p>
            </button>
            <button
              type="button"
              onClick={() => setShowFollowing(true)}
              className="text-center hover:text-cyan-400 transition"
            >
              <p className="text-lg font-bold text-slate-100">{followingCount}</p>
              <p className="text-xs text-slate-500">Following</p>
            </button>
          </div>
        </div>
      </div>

      {/* Posts */}
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Posts</h2>
      {postsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No posts yet.</p>
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

      {showFollowers && (
        <FollowListModal
          title="Followers"
          users={user?.followers ?? []}
          onClose={() => setShowFollowers(false)}
        />
      )}
      {showFollowing && (
        <FollowListModal
          title="Following"
          users={user?.following ?? []}
          onClose={() => setShowFollowing(false)}
        />
      )}

      {showCoverLightbox && coverUrl && (
        <ImageLightbox src={coverUrl} onClose={() => setShowCoverLightbox(false)} />
      )}
    </Layout>
  );
}
