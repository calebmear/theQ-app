'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('Active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
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

    if (error) {
      console.error('Error loading projects:', error);
      alert(error.message);
      setLoading(false);
      return;
    }

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
    setLoading(false);
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

  const projectCounts = {
    Active: projects.filter((project) => project.status === 'Active').length,
    Scheduled: projects.filter((project) => project.status === 'Scheduled').length,
    Completed: projects.filter((project) => project.status === 'Completed').length,
    All: projects.length,
  };

  const visibleProjects = projects.filter((project) => {
    const matchesFilter =
      projectFilter === 'All' || project.status === projectFilter;

    const searchValue = search.toLowerCase();
    const matchesSearch =
      project.projectNumber.toLowerCase().includes(searchValue) ||
      project.customerName.toLowerCase().includes(searchValue) ||
      project.assignedTo.toLowerCase().includes(searchValue) ||
      (project.projectLocation ?? '').toLowerCase().includes(searchValue);

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <div className="text-black">Loading projects...</div>;
  }

  return (
    <div className="space-y-6 text-black">
      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
        <p className="text-center text-sm text-gray-600">
          Browse projects by status, customer, assignment, and service activity.
        </p>

        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border bg-white p-1 shadow-sm sm:grid-cols-4">
          {(['Active', 'Scheduled', 'Completed', 'All'] as ProjectFilter[]).map(
            (filter) => (
              <button
  key={filter}
  type="button"
  onClick={() => setProjectFilter(filter)}
  className={`inline-flex items-center justify-center rounded-md px-2 py-2.5 text-sm font-medium ${
    projectFilter === filter
      ? 'bg-black text-white'
      : 'text-gray-600 hover:bg-gray-50'
  }`}
>
  <span>{filter}</span>
  <span
    className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
      projectFilter === filter
        ? 'bg-white/20 text-white'
        : 'bg-gray-100 text-gray-600'
    }`}
  >
    {projectCounts[filter]}
  </span>
</button>
            )
          )}
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {visibleProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${encodeURIComponent(project.projectNumber)}?from=/projects&fromLabel=Projects`}
            className="block rounded-xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{project.projectNumber}</p>
                <p className="mt-1 text-sm font-medium text-gray-700">
                  {project.customerName}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass(
                  project.status
                )}`}
              >
                {project.status}
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-sm text-gray-600">
              <p>Assigned: {project.assignedTo}</p>
              <p>
  {project.status === 'Completed' ? 'Completed' : 'Latest service'}:{' '}
  {formatDate(project.latestServiceDate)}
</p>
              {project.projectLocation && <p>{project.projectLocation}</p>}
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-white shadow md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Project</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Assigned</th>
              <th className="p-4">Latest Service</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {visibleProjects.map((project) => (
              <tr key={project.id} className="border-t hover:bg-gray-50">
                <td className="p-4">
                  <Link
                    href={`/projects/${encodeURIComponent(project.projectNumber)}?from=/projects&fromLabel=Projects`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {project.projectNumber}
                  </Link>
                </td>
                <td className="p-4">{project.customerName}</td>
                <td className="p-4">{project.assignedTo}</td>
                <td className="p-4">{formatDate(project.latestServiceDate)}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </td>
              </tr>
            ))}

            {visibleProjects.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visibleProjects.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white p-4 text-center text-sm text-gray-500 md:hidden">
          No projects found.
        </div>
      )}
    </div>
  );
}
