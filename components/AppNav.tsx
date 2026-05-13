'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppNav() {
  const pathname = usePathname();

  const navClass = (active: boolean) =>
  `relative flex h-10 items-center justify-center whitespace-nowrap rounded-t-lg border-l-4 px-2 text-sm font-medium md:justify-start md:rounded-none md:px-3 ${
    active
      ? 'border-[#009be5] bg-[#eaf7fe] font-bold text-[#009be5] after:absolute after:bottom-[-16px] after:left-0 after:right-0 after:h-4after:bg-[#eaf7fe] md:bg-gray-100 md:after:hidden'
      : 'border-transparent text-gray-700 hover:bg-gray-100'
  }`;

  return (
<nav className="mt-2 grid grid-cols-4 gap-1 md:mt-3 md:-mr-4 md:flex md:flex-col md:gap-0">

      <Link href="/" className={navClass(pathname === '/')}>
        Dashboard
      </Link>

      <Link
        href="/dashboard"
        className={navClass(pathname.startsWith('/dashboard'))}
      >
        Active Work
      </Link>

      <Link
        href="/projects"
        className={navClass(pathname.startsWith('/projects'))}
      >
        Projects
      </Link>

      <Link
        href="/customers"
        className={navClass(pathname.startsWith('/customers'))}
      >
        Customers
      </Link>
    </nav>
  );
}
