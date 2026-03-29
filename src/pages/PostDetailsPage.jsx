import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import {
  getFeed,
  getPost,
  getPosts,
  getComments,
  deletePost,
  likePost,
  bookmarkPost,
  getPostLikes,
  sharePost,
  getUserProfile,
  getUserById,
  updatePost,
} from '../services/api';
import { CommentForm } from '../components/CommentForm';
import { CommentItem } from '../components/CommentItem';
import { ImageLightbox } from '../components/ImageLightbox';
import { Avatar } from '../components/Avatar';
import { getDisplayName } from '../utils/displayName';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString();
}

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" /><path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" /><path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" /><circle cx="12" cy="12" r="10" />
  </svg>
);
const UsersSmIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const LockSmIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', Icon: GlobeIcon },
  { value: 'following', label: 'Followers', Icon: UsersSmIcon },
  { value: 'only_me', label: 'Only me', Icon: LockSmIcon },
];

function normalizeVisibility(v) {
  const lower = typeof v === 'string' ? v.toLowerCase() : 'public';
  if (lower === 'following' || lower === 'followers' || lower === 'friends') return 'following';
  if (lower === 'private' || lower === 'only me' || lower === 'onlyme' || lower === 'only_me') return 'only_me';
  return 'public';
}

function VisibilityBadge({ post, editable, onUpdate }) {
  const raw = post?.visibility ?? post?.privacy ?? 'public';
  const current = normalizeVisibility(raw);
  const opt = VISIBILITY_OPTIONS.find((o) => o.value === current) || VISIBILITY_OPTIONS[0];
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleChange = async (newVal) => {
    setOpen(false);
    if (newVal === current) return;
    setSaving(true);
    try {
      await updatePost(post._id, { privacy: newVal });
      onUpdate?.();
    } catch {}
    setSaving(false);
  };

  if (!editable) {
    return <span className="inline-flex items-center gap-1"><opt.Icon />{opt.label}</span>;
  }

  return (
    <span className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={saving}
        className="inline-flex items-center gap-1 hover:text-cyan-400 transition cursor-pointer disabled:opacity-50"
      >
        <opt.Icon />{saving ? '...' : opt.label}
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg">
          {VISIBILITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleChange(o.value)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition ${
                current === o.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <o.Icon />{o.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function isPostOwnerByCurrentUser(post, currentUser) {
  if (!currentUser) return false;
  const uid = currentUser._id ?? currentUser.id;
  if (!uid) return false;
  const author = post?.author ?? post?.user ?? post?.creator;
  if (typeof author === 'object' && author !== null) {
    const aid = author._id ?? author.id;
    return aid != null && String(aid) === String(uid);
  }
  const authorId = post?.authorId ?? post?.creator;
  if (authorId != null) return String(authorId) === String(uid);
  return false;
}

export function PostDetailsPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [postImageError, setPostImageError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBody, setShareBody] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [likesList, setLikesList] = useState([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [resolvedPostAuthor, setResolvedPostAuthor] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const loadPost = async () => {
    try {
      try {
        const res = await getPost(postId);
        const { data } = res;
        if (data?.success && data?.data) {
          const raw = data.data;
          setPost(raw?.post ?? raw);
        } else setError('Post not found');
      } catch {
        let res;
        try {
          res = await getFeed({ limit: 100 });
        } catch {
          res = await getPosts({ limit: 100 });
        }
        const { data } = res;
        const posts = Array.isArray(data?.data) ? data.data : data?.data?.posts || data?.data || [];
        const found = posts.find((p) => p._id === postId);
        if (found) setPost(found);
        else setError('Post not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load post');
    }
  };

  const loadComments = async () => {
    try {
      const { data } = await getComments(postId, { limit: 50 });
      if (data?.success && data?.data) {
        const list = Array.isArray(data.data) ? data.data : data.data.comments || data.data || [];
        setComments(list);
        return list;
      }
    } catch {
      setComments([]);
    }
    return [];
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadPost();
      await loadComments();
      setLoading(false);
    };
    load();
  }, [postId]);

  useEffect(() => setResolvedPostAuthor(null), [post?._id]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!post || !user) return;
    const author = post.author ?? post.user ?? post.creator;
    const authorIdRaw =
      post.creatorId ?? post.authorId ?? post.userId
      ?? (typeof author === 'object' && author !== null ? (author._id ?? author.id) : author);
    const currentUserId = user._id ?? user.id;
    if (!authorIdRaw || String(authorIdRaw) === String(currentUserId)) return;
    if (getDisplayName(author) !== 'Unknown') return;
    let cancelled = false;
    const fetchAuthor = async () => {
      try {
        const { data } = await getUserProfile(authorIdRaw);
        if (!cancelled && data?.success && data?.data) setResolvedPostAuthor(data.data);
      } catch {
        try {
          const { data } = await getUserById(authorIdRaw);
          if (!cancelled && data?.success && data?.data) setResolvedPostAuthor(data.data);
        } catch {
          // ignore
        }
      }
    };
    fetchAuthor();
    return () => { cancelled = true; };
  }, [post, user]);

  const handleCommentCreated = async (createdCommentFromApi) => {
    const list = await loadComments();
    await loadPost();
    if (createdCommentFromApi?._id && user && Array.isArray(list)) {
      const merged = list.map((c) =>
        c._id === createdCommentFromApi._id
          ? { ...c, author: user, user, creator: user }
          : c
      );
      setComments(merged);
    }
  };

  const handleCommentUpdated = () => {
    loadComments();
  };

  const handleCommentDeleted = () => {
    loadComments();
    loadPost();
  };

  const handlePostDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await deletePost(postId);
      navigate('/home');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleLike = async () => {
    try {
      await likePost(postId);
      loadPost();
    } catch {}
  };

  const handleShareSubmit = async (e) => {
    e?.preventDefault?.();
    if (!shareBody.trim()) return;
    setShareLoading(true);
    try {
      await sharePost(postId, { body: shareBody.trim() });
      setShowShareModal(false);
      setShareBody('');
      loadPost();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to share');
    } finally {
      setShareLoading(false);
    }
  };

  const handleShowLikes = async () => {
    setShowLikesModal(true);
    setLikesLoading(true);
    try {
      const { data } = await getPostLikes(postId, { limit: 50 });
      const raw = Array.isArray(data?.data) ? data.data : data?.data?.users ?? data?.data?.likes ?? data?.data ?? [];
      const list = raw.map((item) => (item && typeof item === 'object' && item.user) ? item.user : item);
      setLikesList(list);
    } catch {
      setLikesList([]);
    } finally {
      setLikesLoading(false);
    }
  };

  if (loading && !post) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-400">{error || 'Post not found'}</div>
      </Layout>
    );
  }

  const originalPost = post?.sharedPost ?? post?.originalPost ?? post?.post ?? post?.shared;
  const isShared = originalPost && typeof originalPost === 'object';
  const displayPost = isShared ? originalPost : post;

  const author = post.author ?? post.user ?? post.creator;
  const authorObj = typeof author === 'object' && author !== null ? author : null;
  const authorIdRaw =
    post.creatorId ?? post.authorId ?? post.userId
    ?? (authorObj ? (authorObj._id ?? authorObj.id ?? authorObj.user?._id ?? authorObj.user?.id) : (typeof author === 'string' ? author : null));
  const currentUserId = user?._id ?? user?.id;
  const isCurrentUserPost = currentUserId != null && authorIdRaw != null && String(authorIdRaw) === String(currentUserId);
  const authorForDisplay = isCurrentUserPost ? user : (resolvedPostAuthor || author);
  let authorName = getDisplayName(authorForDisplay);
  if (authorName === 'Unknown') authorName = getDisplayName(post);
  const isPostOwner = isPostOwnerByCurrentUser(post, user);
  const postImageUrl = displayPost?.image ?? displayPost?.imageUrl ?? post?.image ?? post?.imageUrl;
  const showPostImage = postImageUrl && !postImageError;
  const shareComment = (post?.content || post?.body || '').trim();
  const originalAuthor = displayPost?.author ?? displayPost?.user ?? displayPost?.creator;
  const originalAuthorName = getDisplayName(originalAuthor);
  const originalPostId = displayPost?._id ?? displayPost?.id;
  const originalAuthorId = (() => {
    const oa = originalAuthor;
    if (typeof oa === 'object' && oa != null) return oa._id ?? oa.id ?? oa.user?._id ?? oa.user?.id;
    if (typeof oa === 'string') return oa;
    return displayPost?.creatorId ?? displayPost?.authorId ?? displayPost?.userId;
  })();

  const handleBookmark = async () => {
    setMenuOpen(false);
    try {
      await bookmarkPost(post._id);
      loadPost();
    } catch {}
  };

  return (
    <Layout>
      <article className="overflow-visible rounded-xl border border-slate-700 bg-slate-800/50 shadow-sm mb-6">
        <div className="p-4">
          <div className="flex items-center gap-3">
            {(authorIdRaw || isCurrentUserPost) ? (
              <Link to={isCurrentUserPost ? '/profile' : `/user/${authorIdRaw}`} className="shrink-0">
                <Avatar user={authorForDisplay} size="lg" />
              </Link>
            ) : (
              <div className="shrink-0"><Avatar user={authorForDisplay} size="lg" /></div>
            )}
            <div className="min-w-0 flex-1">
              {(authorIdRaw || isCurrentUserPost) ? (
                <Link
                  to={isCurrentUserPost ? '/profile' : `/user/${authorIdRaw}`}
                  className="truncate text-sm font-bold text-slate-100 hover:underline block"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="truncate text-sm font-bold text-slate-100 block">{authorName}</span>
              )}
              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                {authorForDisplay?.username && <span>@{authorForDisplay.username} ·</span>}
                <span>{relativeTime(post.createdAt)}</span>
                <span className="mx-0.5">·</span>
                <VisibilityBadge post={post} editable={isPostOwner} onUpdate={loadPost} />
              </div>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-slate-600 bg-slate-800 py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleBookmark}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition text-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />
                    </svg>
                    {post.bookmarked ? 'Unsave post' : 'Save post'}
                  </button>
                  {isPostOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); handlePostDelete(); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition text-left"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        Delete post
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {post.bookmarked && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />
              </svg>
              Saved
            </div>
          )}

          <div className="mt-3">
            {isShared && shareComment && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{shareComment}</p>
            )}
            {!isShared && (post.content || post.body) && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{post.content || post.body}</p>
            )}
            {isShared && (
              <div className="mt-3 rounded-xl border border-slate-600 bg-slate-800/80 overflow-hidden">
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {originalAuthorId ? (
                      <Link to={`/user/${originalAuthorId}`} className="shrink-0">
                        <Avatar user={originalAuthor} size="sm" />
                      </Link>
                    ) : (
                      <Avatar user={originalAuthor} size="sm" />
                    )}
                    <div>
                      {originalAuthorId ? (
                        <Link to={`/user/${originalAuthorId}`} className="font-medium text-slate-200 text-sm hover:underline block">
                          {originalAuthorName}
                        </Link>
                      ) : (
                        <p className="font-medium text-slate-200 text-sm">{originalAuthorName}</p>
                      )}
                      <p className="text-xs text-slate-500">Original post</p>
                    </div>
                  </div>
                  <Link
                    to={originalPostId ? `/post/${originalPostId}` : `/post/${postId}`}
                    className="text-cyan-400 text-xs hover:underline flex-shrink-0"
                  >
                    Original Post ↗
                  </Link>
                </div>
                {(displayPost.content || displayPost.body) && (
                  <p className="px-3 pb-2 text-slate-300 text-sm whitespace-pre-wrap">{displayPost.content || displayPost.body}</p>
                )}
                {showPostImage && (
                  <div className="max-h-[620px] overflow-hidden border-t border-slate-600">
                    <button type="button" className="group relative block w-full cursor-zoom-in" onClick={() => setShowImageLightbox(true)}>
                      <img src={postImageUrl} alt="" className="w-full object-cover" onError={() => setPostImageError(true)} />
                      <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!isShared && showPostImage && (
          <div className="max-h-[620px] overflow-hidden border-y border-slate-700">
            <button type="button" className="group relative block w-full cursor-zoom-in" onClick={() => setShowImageLightbox(true)}>
              <img src={postImageUrl} alt="" className="w-full object-cover" onError={() => setPostImageError(true)} />
              <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
            </button>
          </div>
        )}

        <div className="px-4 pb-2 pt-3 text-sm text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /><path d="M7 10v12" />
                </svg>
              </span>
              <button type="button" onClick={handleShowLikes} className="font-semibold hover:text-cyan-400 hover:underline transition cursor-pointer">
                {post.likesCount ?? 0} likes
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
              <span className="inline-flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m2 9 3-3 3 3" /><path d="M13 18H7a2 2 0 0 1-2-2V6" /><path d="m22 15-3 3-3-3" /><path d="M11 6h6a2 2 0 0 1 2 2v10" />
                </svg>
                {post.sharesCount ?? 0} shares
              </span>
              <span>{comments.length} comments</span>
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-slate-700" />
        <div className="grid grid-cols-3 gap-1 p-1">
          <button onClick={handleLike} className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold sm:gap-2 sm:text-sm transition-colors ${post.liked ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-700/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /><path d="M7 10v12" />
            </svg>
            <span>Like</span>
          </button>
          <button type="button" className="cursor-pointer flex items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold sm:gap-2 sm:text-sm text-slate-400 hover:bg-slate-700/50 transition-colors" onClick={() => document.getElementById('comment-input')?.focus()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
            </svg>
            <span>Comment</span>
          </button>
          <button type="button" onClick={() => setShowShareModal(true)} className="cursor-pointer flex items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold sm:gap-2 sm:text-sm text-slate-400 hover:bg-slate-700/50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </article>

      {showImageLightbox && postImageUrl && (
        <ImageLightbox src={postImageUrl} onClose={() => setShowImageLightbox(false)} />
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">Comments</h2>
        <CommentForm postId={postId} onSuccess={handleCommentCreated} />
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            postId={postId}
            onUpdate={handleCommentUpdated}
            onDelete={handleCommentDeleted}
            onReplyCreated={handleCommentCreated}
          />
        ))}
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Share post</h2>
            <form onSubmit={handleShareSubmit} className="space-y-4">
              <textarea
                value={shareBody}
                onChange={(e) => setShareBody(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                rows={3}
                placeholder="Add a message (optional)"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowShareModal(false); setShareBody(''); }}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shareLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-medium disabled:opacity-50"
                >
                  {shareLoading ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLikesModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowLikesModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100">Likes</h2>
              <button type="button" onClick={() => setShowLikesModal(false)} className="text-slate-400 hover:text-white">Close</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {likesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
                </div>
              ) : likesList.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No likes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {likesList.map((u) => (
                    <li key={u._id ?? u.id ?? u.email}>
                      <Link to={u._id ? `/user/${u._id}` : '#'} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50">
                        <Avatar user={u} size="sm" />
                        <span className="text-slate-200">{getDisplayName(u)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
