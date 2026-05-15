'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppNav() {
  const pathname = usePathname();

  const navClass = (active: boolean) =>
    `flex h-12 items-center justify-center border-b-4 text-sm font-medium ${
      active
        ? 'border-[#009be5] bg-[#eaf7fe] text-[#009be5]'
        : 'border-transparent text-gray-700 hover:bg-gray-100'
    } md:h-auto md:justify-start md:border-b-0 md:border-l-4 md:px-3 md:py-2`;

  return (
    <nav className="mt-3 -mx-4 grid grid-cols-4 bg-white md:mx-0 md:mt-6 md:flex md:flex-col">
      <Link
  href="/dashboard"
  className={navClass(pathname.startsWith('/dashboard'))}
>
  Dashboard
</Link>



      <Link
        href="/activework"
        className={navClass(pathname.startsWith('/activework'))}
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
