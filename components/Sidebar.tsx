'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Briefcase,
  FolderKanbanIcon,
} from 'lucide-react';

export default function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden min-h-screen w-64 flex-col bg-black p-4 text-white md:flex">
        <h1 className="mb-8 text-2xl font-bold">Ops Dashboard</h1>

        <nav className="flex flex-col gap-2">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-800">
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          <Link href="/operations" className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-800">
            <Briefcase size={20} />
            Operations
          </Link>

          <Link href="/projects" className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-800">
            <FolderKanbanIcon size={20} />
            Projects
          </Link>
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t bg-white p-2 shadow md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center text-xs">
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link href="/operations" className="flex flex-col items-center text-xs">
          <Briefcase size={20} />
          Ops
        </Link>

        <Link href="/projects" className="flex flex-col items-center text-xs">
          <FolderKanbanIcon size={20} />
          Projects
        </Link>
      </nav>
    </>
  );
}