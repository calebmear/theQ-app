'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { supabase } from '../../lib/supabaseClient';

type Project = {
  id: string;
  name: string;
  customer: string;
  assignedTo: string;
  status: string;
  progress: number;
  startdateofservice: string;
  projectLocation?: string;
  latestServiceDate?: string;
  notes?: string;
};

export default function ActiveWorkPage() {
  const searchParams = useSearchParams();
  const activeWorkSearch = searchParams.get('q') ?? '';

  const [projects, setProjects] = useState<Project[]>([]);

  function formatDate(value: string | undefined) {
    if (!value) return '';

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  const activeWorkSearchValue = activeWorkSearch.toLowerCase().trim();

  function projectMatchesSearch(project: Project) {
    if (!activeWorkSearchValue) return true;

    return (
      project.id.toLowerCase().includes(activeWorkSearchValue) ||
      project.name.toLowerCase().includes(activeWorkSearchValue) ||
      project.customer.toLowerCase().includes(activeWorkSearchValue) ||
      project.assignedTo.toLowerCase().includes(activeWorkSearchValue) ||
      project.status.toLowerCase().includes(activeWorkSearchValue) ||
      project.startdateofservice.toLowerCase().includes(activeWorkSearchValue) ||
      (project.projectLocation ?? '').toLowerCase().includes(activeWorkSearchValue)
    );
  }

  const activeProjects = projects
    .filter((project) => project.status === 'Active')
    .filter(projectMatchesSearch);

  const scheduledProjects = projects
    .filter((project) => project.status === 'Scheduled')
    .filter(projectMatchesSearch);

  useEffect(() => {
    async function loadProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_number,
          status,
          progress,
          service_start_date,
          project_location,
          notes,
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
          timeEntries.length > 0
            ? timeEntries
                .filter((entry) => !entry.deleted_at)
                .map((entry) => entry.work_date)
                .sort()
                .reverse()[0] ?? ''
            : '';

        return {
          id: project.project_number,
          name: project.project_number,
          customer: customer?.name ?? '',
          assignedTo: employee?.name ?? '',
          status: project.status ?? 'Active',
          progress: Number(project.progress ?? 0),
          startdateofservice: project.service_start_date ?? '',
          projectLocation: project.project_location ?? '',
          latestServiceDate,
          notes: project.notes ?? '',
        };
      });

      setProjects(formattedProjects);
    }

    loadProjects();
  }, []);

  return (
    <div className="space-y-6 text-black">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Active and scheduled projects assigned to you.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProjectTable
          title="Active Projects"
          projects={activeProjects}
          formatDate={formatDate}
          emptyMessage="No active projects found."
        />

        <ProjectTable
          title="Scheduled Projects"
          projects={scheduledProjects}
          formatDate={formatDate}
          emptyMessage="No scheduled projects found."
        />
      </div>
    </div>
  );
}

function ProjectTable({
  title,
  projects,
  formatDate,
  emptyMessage,
}: {
  title: string;
  projects: Project[];
  formatDate: (value: string | undefined) => string;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow md:p-6">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="mt-4 space-y-3 md:hidden">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${encodeURIComponent(project.id)}`}
            className="block rounded-xl border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{project.id}</h3>
                <p className="mt-1 text-sm font-medium">{project.customer}</p>
              </div>

              <div className="text-right text-xs text-gray-500">
                <p>Latest service</p>
                <p className="font-semibold text-gray-700">
                  {project.latestServiceDate
                    ? formatDate(project.latestServiceDate)
                    : 'No service yet'}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-1 text-sm text-gray-600">
              {project.assignedTo && <p>Assigned: {project.assignedTo}</p>}
              {project.projectLocation && <p>Location: {project.projectLocation}</p>}
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Project</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Assigned</th>
              <th className="p-4">Latest Service Date</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t hover:bg-gray-50">
                <td className="p-4">
                  <Link
href={`/projects/${encodeURIComponent(project.id)}?from=/activework&fromLabel=Active%20Work`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {project.id}
                  </Link>
                </td>
                <td className="p-4">{project.customer}</td>
                <td className="p-4">{project.assignedTo || 'Unassigned'}</td>
                <td className="p-4">
                  {project.latestServiceDate
                    ? formatDate(project.latestServiceDate)
                    : 'No service yet'}
                </td>
              </tr>
            ))}

            {projects.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
