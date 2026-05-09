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

type TimeEntry = {
  id: string;
  work_date: string;
  work_completed: string | null;
  service_vehicle: string | null;
  hours: number;
  notes: string | null;
  created_at: string;
};

type TimeForm = {
  workDate: string;
  workCompleted: string;
  serviceVehicle: string;
  hours: string;
  notes: string;
};

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const today = new Date().toISOString().split('T')[0];

const [project, setProject] = useState<ProjectDetail | null>(null);
const [loading, setLoading] = useState(true);
const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
const [timeForm, setTimeForm] = useState<TimeForm>({
  workDate: today,
  workCompleted: '',
  serviceVehicle: '',
  hours: '',
  notes: '',
});


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

      const customer = Array.isArray(data.customers)
  ? data.customers[0]
  : data.customers;

const employee = Array.isArray(data.employees)
  ? data.employees[0]
  : data.employees;

  setProject({
    id: data.id,
    project_number: data.project_number,
    status: data.status,
    progress: data.progress,
    service_start_date: data.service_start_date,
    notes: data.notes,
    customers: customer ?? null,
    employees: employee ?? null,
  });
  
  loadTimeEntries(data.id);
  
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

async function loadTimeEntries(projectId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(
      'id, work_date, work_completed, service_vehicle, hours, notes, created_at'
    )
    .eq('project_id', projectId)
    .order('work_date', { ascending: false });

  if (error) {
    console.error('Error loading time entries:', error);
    return;
  }

  setTimeEntries(data ?? []);
}

async function submitTimeEntry() {
  if (!project || !timeForm.workDate || !timeForm.hours) {
    return;
  }

  const { error } = await supabase.from('time_entries').insert({
    project_id: project.id,
    work_date: timeForm.workDate,
    work_completed: timeForm.workCompleted,
    service_vehicle: timeForm.serviceVehicle,
    hours: Number(timeForm.hours),
    notes: timeForm.notes,
  });

  if (error) {
    console.error('Error submitting time entry:', error);
    return;
  }

  setTimeForm({
    workDate: today,
    workCompleted: '',
    serviceVehicle: '',
    hours: '',
    notes: '',
  });

  loadTimeEntries(project.id);
}


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
  <div>
    <label className="mb-2 block text-sm font-medium">Work Date</label>
    <input
  type="date"
  value={timeForm.workDate}
  onChange={(e) =>
    setTimeForm({ ...timeForm, workDate: e.target.value })
  }
  className="w-full rounded-lg border border-black p-3"
/>
  </div>

  <div>
    <label className="mb-2 block text-sm font-medium">
      Type of Work Completed
    </label>
    <select
  className={`w-full rounded-lg border p-3 ${
    timeForm.workCompleted ? 'text-black' : 'text-gray-400'
  }`}
  value={timeForm.workCompleted}
  onChange={(e) =>
    setTimeForm({ ...timeForm, workCompleted: e.target.value })
  }
>
  <option value="" disabled hidden>
    Select work type
  </option>
  <option>Mainline</option>
  <option>Lateral</option>
  <option>Jetter</option>
  <option>Traffic Control</option>
</select>
  </div>

  <div>
    <label className="mb-2 block text-sm font-medium">Service Vehicle</label>
    <select
  className={`w-full rounded-lg border p-3 ${
    timeForm.serviceVehicle ? 'text-black' : 'text-gray-400'
  }`}
  value={timeForm.serviceVehicle}
  onChange={(e) =>
    setTimeForm({ ...timeForm, serviceVehicle: e.target.value })
  }
>
  <option value="" disabled hidden>
    Select service vehicle
  </option>
  <option>2016 Ford Van</option>
  <option>2007 Ford F-150</option>
</select>

  </div>

  <div>
    <label className="mb-2 block text-sm font-medium">Hours Worked</label>
    <input
  type="number"
  placeholder="Enter hours"
  value={timeForm.hours}
  onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
  className="w-full rounded-lg border p-3"
/>
  </div>

  <div className="md:col-span-2">
    <label className="mb-2 block text-sm font-medium">Submission Notes</label>
    <textarea
  placeholder="Add notes about the work completed..."
  value={timeForm.notes}
  onChange={(e) => setTimeForm({ ...timeForm, notes: e.target.value })}
  className="w-full rounded-lg border p-3"
  rows={4}
/>
  </div>
</div>

<button
  type="button"
  onClick={submitTimeEntry}
  className="mt-4 rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
>
  Submit Time
</button>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">Time Entry History</h2>
            <div className="mt-4 overflow-hidden rounded-xl border">
  <table className="w-full text-left text-sm">
    <thead className="bg-gray-50">
      <tr>
        <th className="p-4">Date</th>
        <th className="p-4">Hours</th>
        <th className="p-4">Work Completed</th>
        <th className="p-4">Vehicle</th>
        <th className="p-4">Notes</th>
      </tr>
    </thead>

    <tbody>
      {timeEntries.map((entry) => (
        <tr key={entry.id} className="border-t">
          <td className="p-4">{entry.work_date}</td>
          <td className="p-4">{entry.hours}</td>
          <td className="p-4">{entry.work_completed}</td>
          <td className="p-4">{entry.service_vehicle}</td>
          <td className="p-4">{entry.notes}</td>
        </tr>
      ))}

      {timeEntries.length === 0 && (
        <tr>
          <td colSpan={5} className="p-4 text-center text-gray-500">
            No time entries submitted yet.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

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
