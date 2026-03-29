import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getProfile, getPosts, getFeed, uploadPhoto, uploadCover, getUserProfile } from '../services/api';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { ImageLightbox } from '../components/ImageLightbox';
import { FollowListModal } from '../components/FollowListModal';
import { getDisplayName } from '../utils/displayName';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [coverError, setCoverError] = useState('');
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const loadProfile = async () => {
    try {
      const { data } = await getProfile();
      const raw = data?.success && data?.data ? data.data : user;
      const profileData = raw?.user ?? raw;
      setProfile(profileData);
      let finalProfile = profileData;
      const uid = profileData?._id ?? profileData?.id ?? user?._id ?? user?.id;
      if (uid) {
        try {
          const full = await getUserProfile(uid);
          if (full?.data?.success && full.data.data) {
            const u = full.data.data.user ?? full.data.data;
            finalProfile = { ...finalProfile, ...u };
            setProfile((prev) => ({ ...prev, ...u }));
          }
        } catch {}
      }
      updateUser(finalProfile);
    } catch {
      setProfile(user);
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadProfile();
      try {
        let res;
        try {
          res = await getFeed({ only: 'me', limit: 50 });
        } catch {
          res = await getPosts({ limit: 50 });
        }
        const { data } = res;
        const list = Array.isArray(data?.data) ? data.data : data?.data?.posts || data?.data || [];
        setPosts(list);
      } catch {
        setPosts([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const rawName = getDisplayName(profile);
  const displayName = rawName === 'Unknown' ? 'User' : rawName;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await uploadPhoto(formData);
      await loadProfile();
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError('');
    setCoverLoading(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);
      await uploadCover(formData);
      await loadProfile();
    } catch (err) {
      setCoverError(err.response?.data?.message || 'Failed to upload cover');
    } finally {
      setCoverLoading(false);
      e.target.value = '';
    }
  };

  const handlePostUpdated = async () => {
    try {
      let res;
      try { res = await getFeed({ only: 'me', limit: 50 }); }
      catch { res = await getPosts({ limit: 50 }); }
      const { data } = res;
      const list = Array.isArray(data?.data) ? data.data : data?.data?.posts || data?.data || [];
      setPosts(list);
    } catch {}
  };

  const coverUrl = profile?.cover || profile?.coverImage || profile?.coverPhoto || '';
  const followersCount = Array.isArray(profile?.followers) ? profile.followers.length : (profile?.followersCount ?? 0);
  const followingCount = Array.isArray(profile?.following) ? profile.following.length : (profile?.followingCount ?? 0);

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
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            {coverUrl && (
              <button
                type="button"
                onClick={() => setShowCoverLightbox(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                View cover
              </button>
            )}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverLoading}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 transition disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              {coverLoading ? 'Uploading...' : 'Change cover'}
            </button>
          </div>
          {coverError && (
            <p className="absolute top-3 left-3 text-xs text-red-400 bg-slate-900/80 px-3 py-1 rounded-lg">{coverError}</p>
          )}
        </div>

        {/* Avatar + Info */}
        <div className="relative z-10 px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
            <div className="relative group shrink-0">
              <div className="rounded-full ring-4 ring-slate-800 overflow-hidden w-28 h-28">
                <Avatar user={profile} size="xl" className="!w-28 !h-28" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              <h1 className="text-2xl font-bold text-slate-100 truncate">
                {displayName}
              </h1>
              {profile?.username && (
                <p className="text-slate-400 text-sm">@{profile.username}</p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:pb-1">
              <Link
                to="/change-password"
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition"
              >
                Change Password
              </Link>
            </div>
          </div>

          {photoError && (
            <p className="mt-2 text-sm text-red-400">{photoError}</p>
          )}

          {profile?.email && (
            <p className="text-slate-500 text-sm mt-3">{profile.email}</p>
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
      <h2 className="text-lg font-semibold text-slate-100 mb-4">My Posts</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
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
              onDelete={handlePostUpdated}
            />
          ))}
        </div>
      )}

      {showFollowers && (
        <FollowListModal
          title="Followers"
          users={profile?.followers ?? []}
          onClose={() => setShowFollowers(false)}
        />
      )}
      {showFollowing && (
        <FollowListModal
          title="Following"
          users={profile?.following ?? []}
          onClose={() => setShowFollowing(false)}
        />
      )}

      {showCoverLightbox && coverUrl && (
        <ImageLightbox src={coverUrl} onClose={() => setShowCoverLightbox(false)} />
      )}
    </Layout>
  );
}
