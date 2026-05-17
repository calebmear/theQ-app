'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '../lib/useUserProfile';

export default function AppNav() {
  const pathname = usePathname();
  const { role, loading } = useUserProfile();

const normalizedRole = role ? String(role).trim().toLowerCase() : null;

if (loading || !normalizedRole) {
  return null;
}

const canViewDashboard =
normalizedRole === 'admin' || normalizedRole === 'management';

const navItems = [
...(canViewDashboard
  ? [{ href: '/dashboard', label: 'Dashboard' }]
  : []),
{ href: '/activework', label: 'Active Work' },
{ href: '/projects', label: 'Projects' },
{ href: '/customers', label: 'Customers' },
];

  const navClass = (active: boolean) =>
    `flex h-12 items-center justify-center border-b-4 text-sm font-medium ${
      active
        ? 'border-[#009be5] bg-[#eaf7fe] text-[#009be5]'
        : 'border-transparent text-gray-700 hover:bg-gray-100'
    } md:h-auto md:justify-start md:border-b-0 md:border-l-4 md:px-3 md:py-2`;

  return (
    <nav
      className="mt-3 -mx-4 grid bg-white md:mx-0 md:mt-6 md:flex md:flex-col"
      style={{
        gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
      }}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={navClass(pathname.startsWith(item.href))}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
