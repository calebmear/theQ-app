'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

type ProjectDetail = {
  id: string;
  project_number: string;
  status: string;
  progress: number;
  service_start_date: string;
  notes: string | null;
  customers: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  employees: {
    name: string;
  } | null;
};

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_number,
          status,
          progress,
          service_start_date,
          notes,
          customers (
            name,
            address,
            phone,
            email
          ),
          employees (
            name
          )
        `)
        .eq('project_number', params.id)
        .single();

      if (error) {
        console.error('Error loading project:', error);
        setLoading(false);
        return;
      }

      setProject(data);
      setLoading(false);
    }

    loadProject();
  }, [params.id]);

  if (loading) {
    return <div className="text-black">Loading project...</div>;
  }

  if (!project) {
    return <div className="text-black">Project not found.</div>;
  }

  const mapQuery = encodeURIComponent(project.customers?.address ?? '');

const serviceStartDate = project.service_start_date
  ? new Date(`${project.service_start_date}T00:00:00`).toLocaleDateString(
      'en-US',
      {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }
    )
  : '';

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 text-black">
      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm text-gray-500">Project Workspace</p>
        <h1 className="mt-1 text-3xl font-bold">
          {project.project_number}
        </h1>
        <p className="mt-2 text-gray-600">{project.customers?.name}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold">{project.status}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Assigned To</p>
            <p className="font-semibold">{project.employees?.name || 'Unassigned'}</p>
          </div>

      

          <div>
            <p className="text-sm text-gray-500">Service Start Date</p>
            <p className="font-semibold">{serviceStartDate}</p>

          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">Time Submission</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
  type="date"
  defaultValue={today}
  className="rounded-lg border p-3"
/>


              <select className="rounded-lg border p-3">
                <option value="" disabled hidden>
                  Type of Work Completed
                </option>
                <option>Mainline</option>
                <option>Lateral</option>
                <option>Jetter</option>
                <option>Traffic Control</option>
              </select>

              <select className="rounded-lg border p-3">
                <option value="" disabled hidden>
                  Service Vehicle
                </option>
                <option>2016 Ford Van</option>
                <option>2007 Ford F-150</option>
              </select>

              <input
                type="number"
                placeholder="Enter hours"
                className="rounded-lg border p-3"
              />

              <textarea
                placeholder="Add notes about the work completed..."
                className="rounded-lg border p-3 md:col-span-2"
                rows={4}
              />
            </div>

            <button className="mt-4 rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800">
              Submit Time
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">Time Entry History</h2>
            <p className="mt-2 text-sm text-gray-600">
              Time entries will load here from Supabase next.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">Project Notes</h2>
            <textarea
              defaultValue={project.notes ?? ''}
              placeholder="Add project notes..."
              className="mt-4 w-full rounded-lg border p-3"
              rows={5}
            />
            <button className="mt-4 rounded-lg border px-5 py-3 hover:bg-gray-50">
              Save Notes
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">Customer Info</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p>{project.customers?.address || 'No address saved'}</p>
              <p>{project.customers?.phone}</p>
              <p>{project.customers?.email}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">Map</h2>

            {project.customers?.address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                className="mt-4 block rounded-lg bg-black px-5 py-3 text-center text-white hover:bg-gray-800"
              >
                Open in Google Maps
              </a>
            ) : (
              <p className="mt-4 text-sm text-gray-600">
                Add a customer address to enable map access.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
