import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Avatar } from '../components/Avatar';
import { getSuggestions, getUsers, getUsersList, getFeed, getPosts, followUser } from '../services/api';
import { getDisplayName } from '../utils/displayName';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;

function UsersIcon({ className = 'w-[18px] h-[18px]' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon({ className = 'w-[15px] h-[15px]' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`pointer-events-none ${className}`} aria-hidden="true">
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </svg>
  );
}

function UserPlusIcon({ className = 'w-[13px] h-[13px]' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function authorId(author) {
  if (!author) return null;
  if (typeof author === 'string') return author;
  return author._id ?? author.id ?? null;
}

function parseUserListResponse(data) {
  if (data?.success === false || data?.data == null) return null;
  const list = Array.isArray(data.data)
    ? data.data
    : data.data?.users ?? data.data?.list ?? data.data?.suggestions ?? [];
  const total = data.data?.total ?? data.data?.pagination?.total ?? data.meta?.total ?? list.length;
  return { list, total: typeof total === 'number' ? total : list.length };
}

/** Fetch one page of users from API. Returns { list, total, hasMore } or null. */
async function fetchUsersPage(page, limit, searchQuery) {
  const params = { page, limit };
  if (searchQuery && searchQuery.trim()) {
    params.search = searchQuery.trim();
    params.q = params.search;
  }

  let parsed = null;
  try {
    const res = await getSuggestions(params);
    parsed = parseUserListResponse(res?.data);
  } catch {
    try {
      const { data } = await getUsers(params);
      parsed = parseUserListResponse(data);
    } catch {
      try {
        const { data } = await getUsersList(params);
        parsed = parseUserListResponse(data);
      } catch {
        return null;
      }
    }
  }
  if (!parsed) return null;
  const hasMore = parsed.list.length >= limit;
  return { list: parsed.list, total: parsed.total, hasMore };
}

/** Fallback: extract users from one page of feed. Returns { list, hasMore }. */
async function fetchUsersFromFeedPage(page) {
  const limit = 50;
  let res;
  try {
    res = await getFeed({ page, limit });
  } catch {
    try {
      res = await getPosts({ page, limit });
    } catch {
      return { list: [], hasMore: false };
    }
  }
  const { data } = res;
  const posts = Array.isArray(data?.data) ? data.data : data?.data?.posts ?? data?.data ?? [];
  const seen = new Set();
  const list = [];
  for (const post of posts) {
    const author = post?.author ?? post?.user ?? post?.creator;
    const id = authorId(author);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    list.push(author);
  }
  return { list, hasMore: posts.length >= limit };
}

function UserCard({ u, onFollow, currentUserId }) {
  const id = u._id ?? u.id;
  const isCurrentUser = currentUserId && id && String(currentUserId) === String(id);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(u.isFollowing === true);

  const followersCount = u.followersCount ?? u.followers ?? u.followersCount;
  const mutualCount = u.mutualCount ?? u.mutual ?? u.mutualFollowers;

  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id || followLoading || isCurrentUser) return;
    setFollowLoading(true);
    try {
      await followUser(id);
      setIsFollowing((prev) => !prev);
      onFollow?.();
    } catch {
      // silent
    } finally {
      setFollowLoading(false);
    }
  };

  if (isCurrentUser) return null;

  const cardContent = (
    <div className="flex items-center justify-between gap-3">
      <Link
        to={id ? `/user/${id}` : '#'}
        className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-slate-700/50"
      >
        <Avatar user={u} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-100 hover:underline">
            {getDisplayName(u)}
          </p>
          <p className="truncate text-xs text-slate-500">
            {u.username ? `@${u.username}` : u.email || '—'}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleFollow}
        disabled={followLoading}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
      >
        <UserPlusIcon />
        {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  );

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
      {cardContent}
      <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
        {followersCount != null && (
          <span className="rounded-full bg-slate-700/80 px-2 py-0.5">
            {followersCount} followers
          </span>
        )}
        {mutualCount != null && mutualCount > 0 && (
          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-cyan-400">
            {mutualCount} mutual
          </span>
        )}
      </div>
    </article>
  );
}

export function PeoplePage() {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?._id ?? currentUser?.id;

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  const DEBOUNCE_MS = 300;

  const loadPage = useCallback(async (pageNum, append, search) => {
    const result = await fetchUsersPage(pageNum, PAGE_SIZE, search);
    if (result) {
      return { list: result.list, hasMore: result.hasMore, fallback: false };
    }
    const feedResult = await fetchUsersFromFeedPage(pageNum);
    return { list: feedResult.list, hasMore: feedResult.hasMore, fallback: true };
  }, []);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const result = await loadPage(nextPage, true, searchQuery.trim());
    if (result) {
      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u._id ?? u.id));
        const newOnes = result.list.filter((u) => {
          const id = u._id ?? u.id;
          return id && !seen.has(id);
        });
        return [...prev, ...newOnes];
      });
      setHasMore(result.hasMore);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }, [page, searchQuery, loadPage]);

  useEffect(() => {
    const q = searchQuery.trim();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      loadPage(1, false, q).then((result) => {
        if (result) {
          setUsers(result.list);
          setHasMore(result.hasMore);
          setPage(1);
          setUsingFallback(result.fallback);
        } else {
          setUsers([]);
          setHasMore(false);
          setError('Could not load people.');
        }
        setLoading(false);
      });
    }, q ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  let toShow = currentUserId
    ? users.filter((u) => {
        const id = u._id ?? u.id;
        return !id || String(id) !== String(currentUserId);
      })
    : users;

  if (usingFallback && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    toShow = toShow.filter(
      (u) =>
        getDisplayName(u).toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
    );
  }

  return (
    <Layout>
      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-[18px] h-[18px] text-cyan-400" />
            <h1 className="text-xl font-extrabold text-slate-100">Suggested Friends</h1>
          </div>
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-400">
            {toShow.length}
            {hasMore && '+'}
          </span>
        </div>

        {usingFallback && users.length > 0 && (
          <p className="mb-3 text-slate-400 text-sm">
            Showing people who have posted (server does not provide a full user list).
          </p>
        )}

        <label className="relative mb-4 block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <SearchIcon className="w-4 h-4" />
          </span>
          <input
            type="search"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-800 py-2.5 pl-10 pr-3 text-sm text-slate-200 outline-none placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800/80"
          />
        </label>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 p-4 text-sm text-red-400">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-cyan-500" />
          </div>
        ) : toShow.length === 0 ? (
          <p className="py-12 text-center text-slate-400">
            {searchQuery.trim() ? 'No people match your search.' : 'No users to show.'}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {toShow.map((u) => (
                <UserCard
                  key={u._id ?? u.id ?? u.email ?? Math.random()}
                  u={u}
                  onFollow={() => {}}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={loadMore}
              disabled={!hasMore || loadingMore}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
            >
              {loadingMore ? 'Loading...' : hasMore ? 'Load more users' : 'No more users'}
            </button>
          </>
        )}
      </section>
    </Layout>
  );
}
