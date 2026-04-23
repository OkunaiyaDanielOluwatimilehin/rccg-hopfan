import { AdminRole, AdminSection, RolePermissions } from '../types';

export const ADMIN_SECTIONS: AdminSection[] = [
  'overview',
  'posts',
  'sermons',
  'devotionals',
  'events',
  'testimonials',
  'users',
  'settings',
  'notifications',
  'prayer_requests',
  'counseling_requests',
  'follow_up',
  'department_requests',
  'departments',
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  admin: {
    overview: true,
    posts: true,
    sermons: true,
    devotionals: true,
    events: true,
    testimonials: true,
    users: true,
    settings: true,
    notifications: true,
    prayer_requests: true,
    counseling_requests: true,
    follow_up: true,
    department_requests: true,
    departments: true,
  },
  editorial: {
    overview: false,
    posts: true,
    sermons: true,
    devotionals: true,
    events: false,
    testimonials: false,
    users: false,
    settings: false,
    notifications: true,
    prayer_requests: false,
    counseling_requests: false,
    follow_up: false,
    department_requests: false,
    departments: false,
  },
  prayer: {
    overview: false,
    posts: false,
    sermons: false,
    devotionals: false,
    events: false,
    testimonials: false,
    users: false,
    settings: false,
    notifications: true,
    prayer_requests: true,
    counseling_requests: false,
    follow_up: false,
    department_requests: false,
    departments: false,
  },
  counselor: {
    overview: false,
    posts: false,
    sermons: false,
    devotionals: false,
    events: false,
    testimonials: false,
    users: false,
    settings: false,
    notifications: true,
    prayer_requests: false,
    counseling_requests: true,
    follow_up: false,
    department_requests: false,
    departments: false,
  },
  follow_up: {
    overview: false,
    posts: false,
    sermons: false,
    devotionals: false,
    events: false,
    testimonials: false,
    users: false,
    settings: false,
    notifications: true,
    prayer_requests: false,
    counseling_requests: false,
    follow_up: true,
    department_requests: false,
    departments: false,
  },
  member: {
    overview: false,
    posts: false,
    sermons: false,
    devotionals: false,
    events: false,
    testimonials: false,
    users: false,
    settings: false,
    notifications: false,
    prayer_requests: false,
    counseling_requests: false,
    follow_up: false,
    department_requests: false,
    departments: false,
  },
};

export const ROLE_LANDING_PATHS: Record<AdminRole, string> = {
  admin: '/admin',
  editorial: '/admin/posts',
  prayer: '/admin/prayer-requests',
  counselor: '/admin/counseling-requests',
  follow_up: '/admin/follow-up',
  member: '/',
};

export function normalizeAdminRole(role?: string | null): AdminRole {
  if (role === 'admin' || role === 'editorial' || role === 'prayer' || role === 'counselor' || role === 'follow_up' || role === 'member') {
    return role;
  }
  return 'member';
}

export function getRolePermissions(matrix?: RolePermissions | null): RolePermissions {
  const merged = !matrix ? DEFAULT_ROLE_PERMISSIONS : {
    admin: { ...DEFAULT_ROLE_PERMISSIONS.admin, ...(matrix.admin || {}) },
    editorial: { ...DEFAULT_ROLE_PERMISSIONS.editorial, ...(matrix.editorial || {}) },
    prayer: { ...DEFAULT_ROLE_PERMISSIONS.prayer, ...(matrix.prayer || {}) },
    counselor: { ...DEFAULT_ROLE_PERMISSIONS.counselor, ...(matrix.counselor || {}) },
    follow_up: { ...DEFAULT_ROLE_PERMISSIONS.follow_up, ...(matrix.follow_up || {}) },
    member: { ...DEFAULT_ROLE_PERMISSIONS.member, ...(matrix.member || {}) },
  };
  return {
    ...merged,
    editorial: { ...merged.editorial, overview: false },
    prayer: { ...merged.prayer, overview: false },
    counselor: { ...merged.counselor, overview: false },
    follow_up: { ...merged.follow_up, overview: false },
    member: { ...merged.member, overview: false },
  };
}

export function canAccessSection(
  role: AdminRole | string | null | undefined,
  section: AdminSection,
  matrix?: RolePermissions | null,
) {
  const normalizedRole = normalizeAdminRole(role);
  if (section === 'overview') return normalizedRole === 'admin';
  if (normalizedRole === 'admin') return true;
  const permissions = getRolePermissions(matrix);
  return Boolean(permissions[normalizedRole]?.[section]);
}

export function resolveAdminSection(pathname: string): AdminSection | null {
  if (pathname.startsWith('/admin/posts')) return 'posts';
  if (pathname.startsWith('/admin/sermons')) return 'sermons';
  if (pathname.startsWith('/admin/devotionals')) return 'devotionals';
  if (pathname.startsWith('/admin/events')) return 'events';
  if (pathname.startsWith('/admin/testimonials')) return 'testimonials';
  if (pathname.startsWith('/admin/users')) return 'users';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  if (pathname.startsWith('/admin/notifications')) return 'notifications';
  if (pathname.startsWith('/admin/prayer-requests')) return 'prayer_requests';
  if (pathname.startsWith('/admin/counseling-requests')) return 'counseling_requests';
  if (pathname.startsWith('/admin/follow-up')) return 'follow_up';
  if (pathname.startsWith('/admin/department-requests')) return 'department_requests';
  if (pathname === '/admin') return 'overview';
  return null;
}

export function getFirstAllowedPath(role: AdminRole | string | null | undefined, matrix?: RolePermissions | null) {
  const normalizedRole = normalizeAdminRole(role);
  if (normalizedRole === 'admin') return ROLE_LANDING_PATHS.admin;
  const permissions = getRolePermissions(matrix);
  const preferredSections: AdminSection[] = (() => {
    switch (normalizedRole) {
      case 'editorial':
        return ['posts', 'sermons', 'devotionals', 'notifications', 'overview', 'events', 'testimonials'];
      case 'prayer':
        return ['prayer_requests', 'notifications', 'follow_up', 'department_requests', 'overview'];
      case 'counselor':
        return ['counseling_requests', 'notifications', 'follow_up', 'department_requests', 'overview'];
      case 'follow_up':
        return ['follow_up', 'notifications', 'department_requests', 'overview'];
      default:
        return ['notifications', 'overview'];
    }
  })();
  const allowedSection =
    preferredSections.find((section) => permissions[normalizedRole]?.[section]) ||
    ADMIN_SECTIONS.filter((section) => section !== 'overview' && !preferredSections.includes(section))
      .find((section) => permissions[normalizedRole]?.[section]) ||
    (permissions[normalizedRole]?.overview ? 'overview' : null);
  if (!allowedSection) return ROLE_LANDING_PATHS.member;
  switch (allowedSection) {
    case 'overview':
      return ROLE_LANDING_PATHS.admin;
    case 'notifications':
      return '/admin/notifications';
    case 'posts':
      return ROLE_LANDING_PATHS.editorial;
    case 'prayer_requests':
      return ROLE_LANDING_PATHS.prayer;
    case 'counseling_requests':
      return ROLE_LANDING_PATHS.counselor;
    case 'follow_up':
      return ROLE_LANDING_PATHS.follow_up;
    case 'sermons':
    case 'devotionals':
      return ROLE_LANDING_PATHS.editorial;
    default:
      return ROLE_LANDING_PATHS.admin;
  }
}
