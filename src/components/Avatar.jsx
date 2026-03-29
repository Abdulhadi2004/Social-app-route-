import { useState } from 'react';
import { BASE_URL } from '../services/api';

const DEFAULT_PROFILE_IMAGE = 'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

function getProfileImageUrl(user) {
  if (!user) return '';
  const raw =
    user.profileImage ||
    user.profileImg ||
    user.profileImageUrl ||
    user.profileImageURL ||
    user.profilePhoto ||
    user.profile_photo ||
    user.avatar ||
    user.photo ||
    user.picture ||
    user.image ||
    user.imageUrl ||
    user.imageURL;
  const url = typeof raw === 'string' && raw.trim() ? raw.trim() : '';
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = BASE_URL.replace(/\/$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export function Avatar({ user, className = '', size = 'md' }) {
  const [imgError, setImgError] = useState(false);
  const url = getProfileImageUrl(user);
  const displayUrl = (url && !imgError) ? url : DEFAULT_PROFILE_IMAGE;

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-24 h-24 text-4xl',
  };
  const s = sizeClasses[size] || sizeClasses.md;

  return (
    <img
      src={displayUrl}
      alt=""
      className={`rounded-full object-cover flex-shrink-0 ${s} ${className}`}
      onError={() => setImgError(true)}
    />
  );
}
