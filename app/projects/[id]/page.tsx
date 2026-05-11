'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';


type ProjectDetail = {
  id: string;
  project_number: string;
  status: string;
  progress: number;
  service_start_date: string;
  project_location: string | null;
  pricing_type: string | null;
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
  deleted_at?: string | null;
deleted_reason?: string | null;
updated_at: string | null;
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
  function getLocalDateInputValue() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  
    return formatter.format(new Date());
  }

  function formatDate(value: string | null) {
    if (!value) return '';
  
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }
  
  
  const today = getLocalDateInputValue();

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

const [showServiceSubmission, setShowServiceSubmission] = useState(false);

const [expandedTimeEntryId, setExpandedTimeEntryId] = useState<string | null>(
  null
);

const [editingProject, setEditingProject] = useState(false);
const [projectEditForm, setProjectEditForm] = useState({
  projectNumber: '',
  projectLocation: '',
  serviceStartDate: '',
  pricingType: '',
});
const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(
  null
);

const [managingTimeEntries, setManagingTimeEntries] = useState(false);
const [inlineEditingTimeEntryId, setInlineEditingTimeEntryId] = useState<
  string | null
>(null);
const [inlineTimeForm, setInlineTimeForm] = useState<TimeForm>({
  workDate: '',
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
          project_location,
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
        .eq('project_number', decodeURIComponent(params.id))
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
    project_location: data.project_location,
    pricing_type: data.pricing_type,
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

  const mapQuery = encodeURIComponent(
    project.project_location || project.customers?.address || ''
  );
  

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
      'id, work_date, work_completed, service_vehicle, hours, notes, created_at, updated_at'
    )
    
    .eq('project_id', projectId)
.is('deleted_at', null)
.order('work_date', { ascending: false });


  if (error) {
    console.error('Error loading time entries:', error);
    return;
  }

  setTimeEntries(data ?? []);
}

async function updateProjectStatus(status: string) {
  if (!project) return;

  const { data, error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', project.id)
    .select('status')
    .single();

  if (error) {
    console.error('Error updating project status:', error);
    alert('Project status could not be updated.');
    return;
  }

  setProject({
    ...project,
    status: data.status,
  });
}


async function submitTimeEntry() {
  if (!project || !timeForm.workDate || !timeForm.hours) {
    return;
  }
  const isFirstTimeEntry = !editingTimeEntryId && timeEntries.length === 0;


  if (editingTimeEntryId) {
    const { error } = await supabase
      .from('time_entries')
      .update({
        work_date: timeForm.workDate,
        work_completed: timeForm.workCompleted,
        service_vehicle: timeForm.serviceVehicle,
        hours: Number(timeForm.hours),
        notes: timeForm.notes,
      })
      .eq('id', editingTimeEntryId);

    if (error) {
      console.error('Error updating time entry:', error);
      return;
    }
  } else {
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
  }

  if (isFirstTimeEntry) {
    const { error: projectUpdateError } = await supabase
      .from('projects')
      .update({
        status: 'Active',
        service_start_date: timeForm.workDate,
      })
      .eq('id', project.id);
  
    if (projectUpdateError) {
      console.error('Error updating project from first time entry:', projectUpdateError);
      return;
    }
  
    setProject({
      ...project,
      status: 'Active',
      service_start_date: timeForm.workDate,
    });
  } else if (project.status === 'Scheduled') {
    await updateProjectStatus('Active');
  }
  

  setTimeForm({
    workDate: today,
    workCompleted: '',
    serviceVehicle: '',
    hours: '',
    notes: '',
  });

  setEditingTimeEntryId(null);
  loadTimeEntries(project.id);
}

function editTimeEntry(entry: TimeEntry) {
  setEditingTimeEntryId(entry.id);
  setTimeForm({
    workDate: entry.work_date,
    workCompleted: entry.work_completed ?? '',
    serviceVehicle: entry.service_vehicle ?? '',
    hours: String(entry.hours),
    notes: entry.notes ?? '',
  });
}

function startInlineTimeEdit(entry: TimeEntry) {
  setInlineEditingTimeEntryId(entry.id);
  setInlineTimeForm({
    workDate: entry.work_date,
    workCompleted: entry.work_completed ?? '',
    serviceVehicle: entry.service_vehicle ?? '',
    hours: String(entry.hours),
    notes: entry.notes ?? '',
  });
}

function cancelInlineTimeEdit() {
  setInlineEditingTimeEntryId(null);
  setInlineTimeForm({
    workDate: '',
    workCompleted: '',
    serviceVehicle: '',
    hours: '',
    notes: '',
  });
}

async function saveInlineTimeEntry(entryId: string) {
  if (!project || !inlineTimeForm.workDate || !inlineTimeForm.hours) return;

  const { error } = await supabase
    .from('time_entries')
    .update({
      work_date: inlineTimeForm.workDate,
      work_completed: inlineTimeForm.workCompleted,
      service_vehicle: inlineTimeForm.serviceVehicle,
      hours: Number(inlineTimeForm.hours),
      notes: inlineTimeForm.notes,
    })
    .eq('id', entryId);

  if (error) {
    console.error('Error updating time entry:', error);
    return;
  }

  cancelInlineTimeEdit();
  loadTimeEntries(project.id);
}


async function deleteTimeEntry(entryId: string) {
  if (!project) return;

  const confirmed = window.confirm('Are you sure you want to delete this time entry?');
  if (!confirmed) return;

  const { error } = await supabase
    .from('time_entries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: 'Deleted from project workspace',
    })
    .eq('id', entryId);

  if (error) {
    console.error('Error deleting time entry:', error);
    return;
  }

  loadTimeEntries(project.id);
}



function formatTimestamp(value: string | null) {
  if (!value) return '';

  return new Date(value).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function submittedUpdatedLabel(entry: TimeEntry) {
  if (entry.updated_at) {
    const createdAt = new Date(entry.created_at).getTime();
    const updatedAt = new Date(entry.updated_at).getTime();

    if (updatedAt - createdAt > 5000) {
      return `Updated: ${formatTimestamp(entry.updated_at)}`;
    }
  }

  return `Submitted: ${formatTimestamp(entry.created_at)}`;
}

function formatPhone(value: string | null | undefined) {
  if (!value) return 'No phone saved';

  const digits = value.replace(/\D/g, '');

  if (digits.length !== 10) {
    return value;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function statusBadgeClass(status: string) {
  if (status === 'Active') {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  if (status === 'Completed') {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  if (status === 'Scheduled') {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function startProjectEdit() {
  if (!project) return;

  setProjectEditForm({
    projectNumber: project.project_number,
    projectLocation: project.project_location ?? '',
    serviceStartDate: project.service_start_date ?? '',
    pricingType: project.pricing_type ?? '',
  });

  setEditingProject(true);
}

async function saveProjectEdit() {
  if (!project || !projectEditForm.projectNumber.trim()) {
    return;
  }

  const { error } = await supabase
    .from('projects')
    .update({
      project_number: projectEditForm.projectNumber,
      project_location: projectEditForm.projectLocation,
      service_start_date: projectEditForm.serviceStartDate,
      pricing_type: projectEditForm.pricingType,
    })
    .eq('id', project.id);

  if (error) {
    console.error('Error updating project:', error);
    return;
  }

  setProject({
    ...project,
    project_number: projectEditForm.projectNumber,
    project_location: projectEditForm.projectLocation,
    service_start_date: projectEditForm.serviceStartDate,
    pricing_type: projectEditForm.pricingType,
  });

  setEditingProject(false);
}

  return (
    <div className="space-y-6 text-black">
      <div className="text-sm text-gray-500">
  <Link href="/operations" className="hover:text-black hover:underline">
    Operations
  </Link>
  <span className="mx-2">/</span>

  <Link href="/projects" className="hover:text-black hover:underline">
    Projects
  </Link>
  <span className="mx-2">/</span>

  <span className="font-medium text-gray-700">
    {project.project_number}
  </span>
</div>

<div className="rounded-2xl bg-white p-6 shadow">
  {editingProject && (
    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
      Editing project details
    </div>
  )}

<div className="border-b pb-5">
  <p className="text-sm text-gray-500">Project ID / PO Number</p>

  <div className="mt-1 flex flex-wrap items-center gap-3">
    {editingProject ? (
      <input
        type="text"
        value={projectEditForm.projectNumber}
        onChange={(e) =>
          setProjectEditForm({
            ...projectEditForm,
            projectNumber: e.target.value,
          })
        }
        className="rounded-lg border p-3 text-xl font-bold"
      />
    ) : (
      <p className="text-2xl font-bold">{project.project_number}</p>
    )}

    <span
      className={`rounded-full border px-3 py-1 text-sm font-medium ${statusBadgeClass(
        project.status
      )}`}
    >
      {project.status}
    </span>

    {!editingProject && (
      <button
        type="button"
        onClick={startProjectEdit}
        className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Edit Project
      </button>
    )}

    {project.status === 'Active' && !editingProject && (
      <button
        type="button"
        onClick={() => {
          const confirmed = window.confirm(
            'Are you sure you want to mark this project as completed?'
          );

          if (confirmed) {
            updateProjectStatus('Completed');
          }
        }}
        className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Mark Completed
      </button>
    )}
  </div>

  {editingProject ? (
    <input
      type="text"
      value={projectEditForm.projectLocation}
      onChange={(e) =>
        setProjectEditForm({
          ...projectEditForm,
          projectLocation: e.target.value,
        })
      }
      placeholder="Project location"
      className="mt-2 w-full rounded-lg border p-3 text-sm"
    />
  ) : (
    <p className="mt-2 text-sm text-gray-600">
      {project.project_location || 'No project location saved'}
    </p>
  )}
</div>



<div className="border-b py-5">
  <p className="text-sm text-gray-500">Customer Info</p>
  <p className="mt-1 text-lg font-semibold">{project.customers?.name}</p>
  <p className="mt-1 text-sm text-gray-600">
    {formatPhone(project.customers?.phone)}
    {project.customers?.email ? ` • ${project.customers.email}` : ''}
  </p>
</div>

<div className="flex flex-col gap-3 pt-5 text-sm md:flex-row md:gap-8">
  <div>
    <span className="text-gray-500">Assigned To: </span>
    <span className="font-semibold">
      {project.employees?.name || 'Unassigned'}
    </span>
  </div>

  <div>
  <span className="text-gray-500">Pricing Model: </span>
  {editingProject ? (
    <select
      value={projectEditForm.pricingType}
      onChange={(e) =>
        setProjectEditForm({
          ...projectEditForm,
          pricingType: e.target.value,
        })
      }
      className="rounded-lg border p-2"
    >
      <option value="">Select pricing model</option>
      <option>Hourly</option>
      <option>Per Foot / Lateral</option>
    </select>
  ) : (
    <span className="font-semibold">
      {project.pricing_type || 'No pricing model saved'}
    </span>
  )}
</div>


  <div>
  <span className="text-gray-500">Service Start Date: </span>
    {editingProject ? (
      <input
        type="date"
        value={projectEditForm.serviceStartDate}
        onChange={(e) =>
          setProjectEditForm({
            ...projectEditForm,
            serviceStartDate: e.target.value,
          })
        }
        className="rounded-lg border p-2"
      />
    ) : (
      <span className="font-semibold">
  {serviceStartDate}
  {timeEntries.length === 0 ? ' (Est.)' : ''}
</span>
    )}
  </div>
</div>



{editingProject && (
  <div className="mt-5 flex gap-3">
    <button
      type="button"
      onClick={saveProjectEdit}
      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
    >
      Save Project
    </button>

    <button
      type="button"
      onClick={() => setEditingProject(false)}
      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
    >
      Cancel
    </button>
  </div>
)}
</div>



<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
  <div className="min-w-0 space-y-6">

  <div className="rounded-2xl bg-white p-6 shadow">
  <button
    type="button"
    onClick={() => setShowServiceSubmission(!showServiceSubmission)}
    className="flex w-full items-center justify-between gap-4 text-left"
  >
    <div>
      <h2 className="text-xl font-bold">Service Submission</h2>
      <p className="mt-1 text-sm text-gray-600">
        Add service date, hours, vehicle, and notes.
      </p>
    </div>

    <span className="text-2xl leading-none text-gray-500">
  {showServiceSubmission ? '⌄' : '›'}
</span>

  </button>

  {showServiceSubmission && (
    <>
      <div className="mt-4 grid gap-4 md:grid-cols-2">

  <div>
    <label className="mb-2 block text-sm font-medium">Service Date</label>
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
      Type of Service Completed
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
    Select service type
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
  {editingTimeEntryId ? 'Update Time' : 'Submit Time'}
</button>
</>
  )}

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
  <h2 className="text-xl font-bold">Service Log</h2>

  <button
    type="button"
    onClick={() => {
      setManagingTimeEntries(!managingTimeEntries);
      setInlineEditingTimeEntryId(null);
    }}
    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
  >
    {managingTimeEntries ? 'Done' : 'Manage Entries'}
  </button>
</div>

<div className="mt-4 space-y-3">
  {timeEntries.map((entry) => {
    const isEditing = inlineEditingTimeEntryId === entry.id;

    return (
      <div key={entry.id} className="rounded-xl border p-4">
        {isEditing ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Service Date
              </label>
              <input
                type="date"
                value={inlineTimeForm.workDate}
                onChange={(e) =>
                  setInlineTimeForm({
                    ...inlineTimeForm,
                    workDate: e.target.value,
                  })
                }
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Hours
              </label>
              <input
                type="number"
                value={inlineTimeForm.hours}
                onChange={(e) =>
                  setInlineTimeForm({
                    ...inlineTimeForm,
                    hours: e.target.value,
                  })
                }
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Work Type
              </label>
              <select
                value={inlineTimeForm.workCompleted}
                onChange={(e) =>
                  setInlineTimeForm({
                    ...inlineTimeForm,
                    workCompleted: e.target.value,
                  })
                }
                className="w-full rounded-lg border p-3"
              >
                <option value="">Select work type</option>
                <option>Mainline</option>
                <option>Lateral</option>
                <option>Jetter</option>
                <option>Traffic Control</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Service Vehicle
              </label>
              <select
                value={inlineTimeForm.serviceVehicle}
                onChange={(e) =>
                  setInlineTimeForm({
                    ...inlineTimeForm,
                    serviceVehicle: e.target.value,
                  })
                }
                className="w-full rounded-lg border p-3"
              >
                <option value="">Select service vehicle</option>
                <option>2016 Ford Van</option>
                <option>2007 Ford F-150</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Notes
              </label>
              <textarea
                value={inlineTimeForm.notes}
                onChange={(e) =>
                  setInlineTimeForm({
                    ...inlineTimeForm,
                    notes: e.target.value,
                  })
                }
                className="w-full rounded-lg border p-3"
                rows={3}
              />
            </div>

            <div className="flex gap-2 md:col-span-2">
              <button
                type="button"
                onClick={() => saveInlineTimeEntry(entry.id)}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                Save
              </button>

              <button
                type="button"
                onClick={cancelInlineTimeEdit}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => deleteTimeEntry(entry.id)}
                className="ml-auto rounded-lg border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
  type="button"
  onClick={() =>
    setExpandedTimeEntryId(expandedTimeEntryId === entry.id ? null : entry.id)
  }
  className="flex w-full items-center justify-between gap-4 text-left"
>
  <div>
    <p className="text-xs font-medium uppercase text-gray-500">Service Date</p>
    <p className="mt-1 font-semibold">{formatDate(entry.work_date)}</p>
  </div>

  <div className="text-right">
    <p className="text-xs font-medium uppercase text-gray-500">Service Hours</p>
    <p className="mt-1 font-semibold">{entry.hours} hrs</p>
  </div>
</button>

{managingTimeEntries && (
  <div className="mt-3 flex gap-2">
    <button
      type="button"
      onClick={() => startInlineTimeEdit(entry)}
      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
    >
      Edit
    </button>

    <button
      type="button"
      onClick={() => deleteTimeEntry(entry.id)}
      className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
    >
      Delete
    </button>
  </div>
)}

{expandedTimeEntryId === entry.id && (
  <div className="mt-4 border-t pt-4">
    <div className="grid gap-4">
      <div>
        <p className="text-xs font-medium uppercase text-gray-500">
          Service Type
        </p>
        <p className="mt-1 text-sm text-gray-700">
  {entry.work_completed || 'No work type selected'}
</p>

      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">
          Service Vehicle
        </p>
        <p className="mt-1 text-sm text-gray-700">
  {entry.service_vehicle || 'No vehicle selected'}
</p>

      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">
          Service Notes
        </p>
        <p className="mt-1 text-sm text-gray-700">
          {entry.notes || 'No notes submitted'}
        </p>
      </div>

      <p className="text-xs text-gray-500">
        {submittedUpdatedLabel(entry)}
      </p>
    </div>
  </div>
)}






            
            
          </>
        )}
      </div>
    );
  })}

  {timeEntries.length === 0 && (
    <div className="rounded-xl border border-dashed p-4 text-center text-sm text-gray-500">
      No time entries submitted yet.
    </div>
  )}
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
