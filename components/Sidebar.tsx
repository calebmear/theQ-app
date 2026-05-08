'use client';

import Link from 'next/link';
import { LayoutDashboard, Briefcase, FolderKanbanIcon } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col bg-black text-white min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">
        Ops Dashboard
      </h1>

      <nav className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-800"
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          href="/operations"
          className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-800"
        >
          <Briefcase size={20} />
          Operations
        </Link>

        <Link
  href="/projects"
  className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-800"
>
  <FolderKanbanIcon size={20} />
  Projects
</Link>
      </nav>
    </aside>
  );
}