'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  return <Suspense fallback={<p role="status" className="text-sm text-gray-600">Loading projects…</p>}>
    <ProjectsDirectory />
  </Suspense>;
}

function ProjectsDirectory() {
  const searchParams = useSearchParams();
  const search = (searchParams.get('q') ?? '').trim();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('All');

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

  if (loading) return <p role="status" className="text-sm text-gray-600">Loading projects…</p>;
  if (loadError) return <div className="rounded-xl border bg-white p-4">
    <p role="alert" className="text-sm text-red-700">{loadError}</p>
    <button type="button" onClick={() => void loadProjects()} className="mt-2 min-h-11 rounded-lg border px-4 py-2 text-sm font-medium">Retry</button>
  </div>;

return (
  <PageSwipeNavigation
    previous="/activework?view=scheduled"
    next="/customers"
  >
    <div className="space-y-3 text-black">    <div role="group" aria-label="Project status" className="grid grid-cols-4 gap-1 rounded-xl border bg-white p-1">
      {(['All', 'Active', 'Scheduled', 'Completed'] as ProjectFilter[]).map((filter) => <button
        key={filter} type="button" aria-pressed={projectFilter === filter} onClick={() => setProjectFilter(filter)}
        className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-xs font-medium sm:flex-row sm:gap-1.5 sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5] ${projectFilter === filter ? 'bg-[#16324f] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
        <span>{filter}</span><span className={`rounded-full px-1.5 text-xs ${projectFilter === filter ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{projectCounts[filter]}</span>
      </button>)}
    </div>
    {search && <p aria-live="polite" className="text-xs text-gray-600">{visibleProjects.length} {visibleProjects.length === 1 ? 'project' : 'projects'} matching “{search}”</p>}

    <div className="space-y-2 md:hidden">
      {visibleProjects.map((project) => <Link key={project.id}
        href={`/projects/${encodeURIComponent(project.projectNumber)}?from=/projects&fromLabel=Projects`}
        className="block rounded-xl border bg-white p-3 shadow-sm hover:border-[#b8def0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words font-semibold">{project.projectNumber}</p>
            {!sameText(project.customerName, project.projectNumber) && <p className="mt-0.5 break-words text-sm text-gray-700">{project.customerName}</p>}
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(project.status)}`}>{project.status}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          <span>Assigned: {project.assignedTo}</span><span>{serviceDate(project)}</span>
        </div>
        {project.projectLocation && !sameText(project.projectLocation, project.projectNumber) && !sameText(project.projectLocation, project.customerName) &&
          <p className="mt-1 break-words text-xs text-gray-600">{project.projectLocation}</p>}
      </Link>)}
    </div>

    <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50"><tr>{['Project', 'Customer', 'Assigned', 'Service date', 'Status'].map((title) => <th key={title} className="px-4 py-3 font-medium">{title}</th>)}</tr></thead>
        <tbody>{visibleProjects.map((project) => <tr key={project.id} className="border-t hover:bg-gray-50">
          <td className="px-4 py-3"><Link href={`/projects/${encodeURIComponent(project.projectNumber)}?from=/projects&fromLabel=Projects`} className="font-semibold text-[#007bb5] hover:underline">{project.projectNumber}</Link></td>
          <td className="px-4 py-3">{project.customerName}</td><td className="px-4 py-3">{project.assignedTo}</td>
          <td className="px-4 py-3">{serviceDate(project)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(project.status)}`}>{project.status}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
    {visibleProjects.length === 0 && <p role="status" className="rounded-xl border border-dashed bg-white p-4 text-center text-sm text-gray-500">No projects match{search ? ` “${search}”` : ''}{projectFilter !== 'All' ? ` with status ${projectFilter}` : ''}.</p>}
    </div>
  </PageSwipeNavigation>
);
}
