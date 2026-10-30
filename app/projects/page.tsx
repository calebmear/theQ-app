'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import PageSwipeNavigation from '../../components/PageSwipeNavigation';

type Project = {
  id: string;
  projectNumber: string;
  status: string;
  serviceStartDate: string | null;
  projectLocation: string | null;
  customerName: string;
  assignedTo: string;
  latestServiceDate: string | null;
};

type ProjectFilter = 'Active' | 'Scheduled' | 'Completed' | 'All';


export default function ProjectsPage() {
  return <Suspense fallback={<ProjectsLoading />}>
    <ProjectsDirectory />
  </Suspense>;
}

function ProjectsDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = (searchParams.get('q') ?? '').trim();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('All');
  const filters: ProjectFilter[] = ['All', 'Active', 'Scheduled', 'Completed'];
  const [drag, setDrag] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; time: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const direction = useRef(0);
  const previousFilter = useRef(projectFilter);
  function selectFilter(next: ProjectFilter) {
    if (next === projectFilter) return;
    direction.current = filters.indexOf(next) > filters.indexOf(projectFilter) ? 1 : -1;
    setProjectFilter(next);
  }
  useLayoutEffect(() => {
    if (previousFilter.current === projectFilter) return;
    previousFilter.current = projectFilter;
    const content = contentRef.current;
    if (!content || typeof content.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = content.animate([
      { transform: `translate3d(${direction.current * Math.min(content.clientWidth * 0.25, 96)}px, 0, 0)`, opacity: 0.5 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    ], { duration: 260, easing: 'cubic-bezier(0.22,1,0.36,1)' });
    return () => animation.cancel();
  }, [projectFilter]);


  useEffect(() => { void loadProjects(); }, []);

  async function loadProjects() {
    setLoading(true);
    setLoadError('');
    try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        project_number,
        status,
        service_start_date,
        project_location,
        customers (
          name
        ),
        employees (
          name
        ),
        time_entries (
          work_date,
          deleted_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedProjects: Project[] = (data ?? []).map((project) => {
      const customer = Array.isArray(project.customers)
        ? project.customers[0]
        : project.customers;

      const employee = Array.isArray(project.employees)
        ? project.employees[0]
        : project.employees;

      const timeEntries = Array.isArray(project.time_entries)
        ? project.time_entries
        : [];

      const latestServiceDate =
        timeEntries
          .filter((entry) => !entry.deleted_at)
          .map((entry) => entry.work_date)
          .sort()
          .reverse()[0] ?? null;

      return {
        id: project.id,
        projectNumber: project.project_number,
        status: project.status ?? 'Scheduled',
        serviceStartDate: project.service_start_date,
        projectLocation: project.project_location,
        customerName: customer?.name ?? 'No customer saved',
        assignedTo: employee?.name ?? 'Unassigned',
        latestServiceDate,
      };
    });

    setProjects(formattedProjects);
    } catch {
      setLoadError('Could not load projects. Check your connection and try again.');
    } finally { setLoading(false); }
  }

  function formatDate(value: string | null) {
    if (!value) return 'No date';

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function statusBadgeClass(status: string) {
    if (status === 'Active') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'Completed') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'Scheduled') return 'bg-yellow-100 text-yellow-700 border-yellow-200';

    return 'bg-gray-100 text-gray-700 border-gray-200';
  }


  function sameText(first: string | null, second: string | null) {
    const normalize = (value: string | null) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    return normalize(first) === normalize(second);
  }

  // Header search stays name based; service/customer classification filters can be added later.
  const searchValue = search.toLowerCase();
  const matchingProjects = projects.filter((project) =>
    !searchValue || project.projectNumber.toLowerCase().includes(searchValue) ||
    project.customerName.toLowerCase().includes(searchValue)
  );
  const projectCounts = {
    All: matchingProjects.length,
    Active: matchingProjects.filter((project) => project.status === 'Active').length,
    Scheduled: matchingProjects.filter((project) => project.status === 'Scheduled').length,
    Completed: matchingProjects.filter((project) => project.status === 'Completed').length,
  };
  const visibleProjects = matchingProjects
    .filter((project) => projectFilter === 'All' || project.status === projectFilter)
    .sort((first: Project, second: Project) => {
      const rank = (status: string) => status === 'Active' ? 0 : status === 'Scheduled' ? 1 : status === 'Completed' ? 3 : 2;
      const statusOrder = rank(first.status) - rank(second.status);
      if (statusOrder) return statusOrder;
      const dateOrder = (second.latestServiceDate ?? '').localeCompare(first.latestServiceDate ?? '');
      return dateOrder || first.projectNumber.localeCompare(second.projectNumber, undefined, { numeric: true, sensitivity: 'base' });
    });

  function serviceDate(project: Project) {
    if (project.latestServiceDate) return `Last service: ${formatDate(project.latestServiceDate)}`;
    if (project.status === 'Scheduled' && project.serviceStartDate) return `Scheduled: ${formatDate(project.serviceStartDate)}`;
    return 'No service recorded';
  }

  if (loading) return <ProjectsLoading />;
  if (loadError) return <div className="rounded-xl border bg-white p-4">
    <p role="alert" className="text-sm text-red-700">{loadError}</p>
    <button type="button" onClick={() => void loadProjects()} className="mt-2 min-h-11 rounded-lg border px-4 py-2 text-sm font-medium">Retry</button>
  </div>;

return (
  <PageSwipeNavigation
    previous="/activework?view=active"
    next="/customers"
  >
    <div className="min-h-[70dvh] space-y-3 text-black" style={{ touchAction: 'pan-y pinch-zoom' }}
      onTouchStart={(event) => {
        event.stopPropagation(); gesture.current = null; setDrag(0);
        if (event.touches.length !== 1 || document.querySelector('dialog[open]')) return;
        const target = event.target as HTMLElement;
        if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
        const point = event.touches[0];
        if (point.clientX < 24 || point.clientX > window.innerWidth - 24) return;
        gesture.current = { x: point.clientX, y: point.clientY, time: Date.now() };
      }}
      onTouchMove={(event) => {
        event.stopPropagation();
        const start = gesture.current;
        if (!start || event.touches.length !== 1) { gesture.current = null; setDrag(0); return; }
        const dx = event.touches[0].clientX - start.x, dy = event.touches[0].clientY - start.y;
        if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { gesture.current = null; setDrag(0); return; }
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          const index = filters.indexOf(projectFilter);
          setDrag((index === 0 && dx > 0) || (index === filters.length - 1 && dx < 0) ? dx * 0.1 : dx * 0.25);
        }
      }}
      onTouchEnd={(event) => {
        event.stopPropagation();
        const start = gesture.current; gesture.current = null; setDrag(0);
        if (!start || event.changedTouches.length !== 1) return;
        const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
        const elapsed = Math.max(1, Date.now() - start.time);
        const distance = Math.abs(dx);
        if (distance <= Math.abs(dy) * 1.5 || (distance < 64 && !(distance >= 24 && elapsed <= 250 && distance / elapsed >= 0.45))) return;
        suppressClickUntil.current = Date.now() + 600;
        if (projectFilter === 'All' && dx > 0) {
          router.push('/activework?view=active');
          return;
        }
        if (projectFilter === 'Completed' && dx < 0) {
          router.push('/customers');
          return;
        }
        const next = filters.indexOf(projectFilter) + (dx < 0 ? 1 : -1);
        if (next >= 0 && next < filters.length) selectFilter(filters[next]);
      }}
      onTouchCancel={(event) => { event.stopPropagation(); gesture.current = null; setDrag(0); }}
      onClickCapture={(event) => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
    <div role="group" aria-label="Project status" className="grid grid-cols-4 border-b border-gray-200">
      {filters.map((filter) => <button
        key={filter} type="button" aria-pressed={projectFilter === filter} onClick={() => selectFilter(filter)}
        className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-3 text-sm font-medium sm:flex-row sm:gap-1.5 sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5] ${projectFilter === filter ? 'border-[#009be5] text-[#007bb5]' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
        <span>{filter}</span><span className={`rounded-full px-2 text-sm ${projectFilter === filter ? 'bg-[#e8f7ff] text-[#007bb5]' : 'text-gray-400'}`}>{projectCounts[filter]}</span>
      </button>)}
    </div>
    {search && <p aria-live="polite" className="text-xs text-gray-600">{visibleProjects.length} {visibleProjects.length === 1 ? 'project' : 'projects'} matching “{search}”</p>}

    <div className="overflow-hidden">
    <div ref={contentRef} style={{ transform: `translate3d(${drag}px, 0, 0)` }}>
    {visibleProjects.length > 0 && <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:hidden">
      {visibleProjects.map((project) => <Link key={project.id}
        href={`/projects/${encodeURIComponent(project.projectNumber)}`}
        className="flex min-h-24 items-center gap-3 p-4 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#007bb5]">
        <div className="min-w-0 flex-1">
          <p className="break-words text-base font-bold text-[#16324f]">{project.projectNumber}</p>
          {!sameText(project.customerName, project.projectNumber) && <p className="mt-1 break-words text-sm font-medium text-gray-700">{project.customerName}</p>}
          <p className="mt-2 text-sm text-gray-500">{serviceDate(project)}</p>
        </div>
        {projectFilter === 'All' && <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(project.status)}`}>{project.status}</span>}
        <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-gray-300" />
      </Link>)}
    </div>}

    <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50"><tr>{['Project', 'Customer', 'Assigned', 'Service date', 'Status'].map((title) => <th key={title} className="px-4 py-3 font-medium">{title}</th>)}</tr></thead>
        <tbody>{visibleProjects.map((project) => <tr key={project.id} className="border-t hover:bg-gray-50">
          <td className="px-4 py-3"><Link href={`/projects/${encodeURIComponent(project.projectNumber)}`} className="font-semibold text-[#007bb5] hover:underline">{project.projectNumber}</Link></td>
          <td className="px-4 py-3">{project.customerName}</td><td className="px-4 py-3">{project.assignedTo}</td>
          <td className="px-4 py-3">{serviceDate(project)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(project.status)}`}>{project.status}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
    {visibleProjects.length === 0 && <p role="status" className="rounded-xl border border-dashed bg-white p-4 text-center text-sm text-gray-500">No projects match{search ? ` “${search}”` : ''}{projectFilter !== 'All' ? ` with status ${projectFilter}` : ''}.</p>}
    </div>
    </div>
    </div>
  </PageSwipeNavigation>
);
}


function ProjectsLoading() {
  const [showMessage, setShowMessage] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowMessage(true), 800);
    return () => window.clearTimeout(timer);
  }, []);
  return <div aria-busy="true" className="min-h-[50dvh]">
    {showMessage && <p role="status" className="py-4 text-center text-sm text-gray-500">Loading projects…</p>}
  </div>;
}
