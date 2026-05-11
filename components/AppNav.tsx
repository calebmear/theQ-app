'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppNav() {
  const pathname = usePathname();

  const navClass = (active: boolean) =>
    `rounded-lg border-l-4 px-3 py-2 font-medium ${
      active
        ? 'border-[#009be5] bg-[#eaf7fe] font-bold text-[#009be5] shadow-sm'
        : 'border-transparent text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <nav className="mt-6 flex gap-2 md:flex-col">
      <Link href="/" className={navClass(pathname === '/')}>
        Dashboard
      </Link>

      <Link
        href="/operations"
        className={navClass(pathname.startsWith('/operations'))}
      >
        Operations
      </Link>

      <Link
        href="/projects"
        className={navClass(pathname.startsWith('/projects'))}
      >
        Projects
      </Link>
    </nav>
  );
}
