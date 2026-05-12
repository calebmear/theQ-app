'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppNav() {
  const pathname = usePathname();

  const navClass = (active: boolean) =>
  `border-l-4 px-3 py-2 font-medium ${
    active
      ? 'relative top-px rounded-b-none rounded-t-lg border-[#009be5] bg-gray-100 font-bold text-[#009be5] shadow-none md:top-0 md:-mr-4 md:rounded-none'
      : 'rounded-lg border-transparent text-gray-700 hover:bg-gray-100'
  }`;

  return (
    <nav className="-mb-4 mt-6 flex w-full justify-center gap-2 border-b border-gray-100 md:mb-0 md:flex-col md:justify-start md:border-b-0">


      <Link href="/" className={navClass(pathname === '/')}>
        Dashboard
      </Link>

      <Link href="/mywork" className={navClass(pathname.startsWith('/mywork'))}>
        MyWork
      </Link>

      <Link href="/projects" className={navClass(pathname.startsWith('/projects'))}>
        Projects
      </Link>

      <Link href="/customers" className={navClass(pathname.startsWith('/customers'))}>
        Customers
      </Link>
    </nav>
  );
}
