/**
 * Get display name from author/user object (supports common API field names).
 */
export function getDisplayName(user) {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return 'Unknown';
  const direct =
    user.name ||
    user.username ||
    user.fullName ||
    user.userName ||
    user.displayName ||
    user.creatorName ||
    user.createdByName;
  if (direct) return direct;
  const first = user.firstName || user.first_name;
  const last = user.lastName || user.last_name;
  if (first || last) return [first, last].filter(Boolean).join(' ').trim();
  const nested = user.user || user.profile || user.account || user.data || user.creator || user.createdBy;
  if (nested && typeof nested === 'object') return getDisplayName(nested);
  return 'Unknown';
}

/**
 * Get first character for avatar initial (name, or email, or 'U').
 */
export function getDisplayInitial(user) {
  if (!user) return 'U';
  const name = getDisplayName(user);
  if (name !== 'Unknown') return name[0]?.toUpperCase() || 'U';
  const email = user.email || user.mail || '';
  if (email) return email[0]?.toUpperCase() || 'U';
  return 'U';
}
