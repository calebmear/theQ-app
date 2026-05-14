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
  assigned_to: string | null;
  notes: string | null;
  customers: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    pricing_models: {
      MAIN?: string;
      LAT?: string;
      JET?: string;
    } | null;
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
  hours: number | null;
  feet: number | null;
  laterals: number | null;
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
  feet: string;
  laterals: string;
  notes: string;
};

type ProjectNote = {
  id: string;
  note: string;
  created_at: string;
};

type Employee = {
  id: string;
  name: string;
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
  feet: '',
  laterals: '',
  notes: '',
});

const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
const [newProjectNote, setNewProjectNote] = useState('');

const [showServiceSubmission, setShowServiceSubmission] = useState(false);

const [expandedTimeEntryId, setExpandedTimeEntryId] = useState<string | null>(
  null
);
const [employees, setEmployees] = useState<Employee[]>([]);

const projectNoteHistory = projectNotes.filter(
  (note) => !note.note.toLowerCase().startsWith('service note:')
);

const serviceNoteHistory = projectNotes.filter((note) =>
  note.note.toLowerCase().startsWith('service note:')
);

const [managingProjectNotes, setManagingProjectNotes] = useState(false);

const [editingProject, setEditingProject] = useState(false);
const [projectEditForm, setProjectEditForm] = useState({
  projectNumber: '',
  projectLocation: '',
  serviceStartDate: '',
  pricingType: '',
  assignedToId: '',
});
const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(
  null
);

const [editingProjectNoteId, setEditingProjectNoteId] = useState<string | null>(null);
const [projectNoteEditText, setProjectNoteEditText] = useState('');

const [managingTimeEntries, setManagingTimeEntries] = useState(false);
const [inlineEditingTimeEntryId, setInlineEditingTimeEntryId] = useState<
  string | null
>(null);
const [inlineTimeForm, setInlineTimeForm] = useState<TimeForm>({
  workDate: '',
  workCompleted: '',
  serviceVehicle: '',
  hours: '',
  feet: '',
  laterals: '',
  notes: '',
});

const isHourlyProject = project?.pricing_type === 'Hourly';
const isFootLateralProject = project?.pricing_type === 'Per Foot / Lateral';



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
  pricing_type,
  assigned_to,
  notes,
  customers (
    id,
    name,
    address,
    phone,
    email,
    pricing_models
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
    assigned_to: data.assigned_to,
    notes: data.notes,
    customers: customer ?? null,
    employees: employee ?? null,
  });
  
  loadTimeEntries(data.id);
  loadProjectNotes(data.id);
  
  setLoading(false);
  
    }

    loadProject();
    loadEmployees();

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

  const latestServiceDate =
  timeEntries.length > 0 ? formatDate(timeEntries[0].work_date) : null;


  const showFeetInput =
  isFootLateralProject &&
  ['Mainline', 'Jetter'].includes(timeForm.workCompleted);

const showLateralsInput =
  isFootLateralProject && timeForm.workCompleted === 'Lateral';

async function loadTimeEntries(projectId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(
      'id, work_date, work_completed, service_vehicle, hours, feet, laterals, notes, created_at, updated_at'
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

async function loadProjectNotes(projectId: string) {
  const { data, error } = await supabase
    .from('project_notes')
    .select('id, note, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading project notes:', error);
    return;
  }

  setProjectNotes(data ?? []);
}

async function saveProjectNote() {
  if (!project || !newProjectNote.trim()) return;

  const { error } = await supabase.from('project_notes').insert({
    project_id: project.id,
    note: `Project note: ${newProjectNote.trim()}`,
  });

  if (error) {
    console.error('Error saving project note:', error);
    alert(error.message);
    return;
  }

  setNewProjectNote('');
  loadProjectNotes(project.id);
}

function startProjectNoteEdit(note: ProjectNote) {
  setEditingProjectNoteId(note.id);
  setProjectNoteEditText(note.note);
}

function cancelProjectNoteEdit() {
  setEditingProjectNoteId(null);
  setProjectNoteEditText('');
}

async function updateProjectNote(noteId: string) {
  if (!project || !projectNoteEditText.trim()) return;

  const { error } = await supabase
    .from('project_notes')
    .update({ note: projectNoteEditText.trim() })
    .eq('id', noteId);

  if (error) {
    console.error('Error updating project note:', error);
    alert(error.message);
    return;
  }

  cancelProjectNoteEdit();
  loadProjectNotes(project.id);
}

async function deleteProjectNote(noteId: string) {
  if (!project) return;

  const confirmed = window.confirm('Delete this project note?');
  if (!confirmed) return;

  const { error } = await supabase
    .from('project_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Error deleting project note:', error);
    alert(error.message);
    return;
  }

  loadProjectNotes(project.id);
}


async function submitTimeEntry() {
  if (!project || !timeForm.workDate || !timeForm.workCompleted || !timeForm.serviceVehicle) {
    return;
  }

  if (isHourlyProject && !timeForm.hours) return;
  if (showFeetInput && !timeForm.feet) return;
  if (showLateralsInput && !timeForm.laterals) return;

  const isFirstTimeEntry = !editingTimeEntryId && timeEntries.length === 0;

  const timeEntryValues = {
    work_date: timeForm.workDate,
    work_completed: timeForm.workCompleted,
    service_vehicle: timeForm.serviceVehicle,
    hours: isHourlyProject ? Number(timeForm.hours) : null,
    feet: showFeetInput ? Number(timeForm.feet) : null,
    laterals: showLateralsInput ? Number(timeForm.laterals) : null,
    notes: timeForm.notes,
  };

  if (editingTimeEntryId) {
    const { error } = await supabase
      .from('time_entries')
      .update(timeEntryValues)
      .eq('id', editingTimeEntryId);

    if (error) {
      console.error('Error updating time entry:', error);
      alert(error.message);
      return;
    }
  } else {
    const { error } = await supabase.from('time_entries').insert({
      project_id: project.id,
      ...timeEntryValues,
    });

    if (error) {
      console.error('Error submitting time entry:', error);
      alert(error.message);
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
      alert(projectUpdateError.message);
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

  if (timeForm.notes.trim()) {
    const { error: noteError } = await supabase.from('project_notes').insert({
      project_id: project.id,
      note: `Service note: ${timeForm.notes.trim()}`,
    });
  
    if (noteError) {
      console.error('Error saving service note to project notes:', noteError);
      alert(noteError.message);
      return;
    }
  
    loadProjectNotes(project.id);
  }
  

  setTimeForm({
    workDate: today,
    workCompleted: '',
    serviceVehicle: '',
    hours: '',
    feet: '',
    laterals: '',
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
    hours: entry.hours === null ? '' : String(entry.hours),
    feet: entry.feet === null ? '' : String(entry.feet),
    laterals: entry.laterals === null ? '' : String(entry.laterals),
    notes: entry.notes ?? '',
  });
}

function startInlineTimeEdit(entry: TimeEntry) {
  setInlineEditingTimeEntryId(entry.id);
  setInlineTimeForm({
    workDate: entry.work_date,
    workCompleted: entry.work_completed ?? '',
    serviceVehicle: entry.service_vehicle ?? '',
    hours: entry.hours === null ? '' : String(entry.hours),
    feet: entry.feet === null ? '' : String(entry.feet),
    laterals: entry.laterals === null ? '' : String(entry.laterals),
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
    feet: '',
    laterals: '',
    notes: '',
  });
}

async function saveInlineTimeEntry(entryId: string) {
  if (!project || !inlineTimeForm.workDate || !inlineTimeForm.hours) return;

  const { error } = await supabase
    .from('time_entries')
    .update({
      work_date: timeForm.workDate,
work_completed: timeForm.workCompleted,
service_vehicle: timeForm.serviceVehicle,
hours: isHourlyProject ? Number(timeForm.hours) : null,
feet: showFeetInput ? Number(timeForm.feet) : null,
laterals: showLateralsInput ? Number(timeForm.laterals) : null,
notes: timeForm.notes,
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

async function loadEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .order('name');

  console.log('Employee load result:', { data, error });

  if (error) {
    console.error('Error loading employees:', error);
    alert(error.message);
    return;
  }

  setEmployees(data ?? []);
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
    assignedToId: project.assigned_to ?? '',
  });

  setEditingProject(true);
}

async function saveProjectEdit() {
  if (!project || !projectEditForm.projectNumber.trim()) {
    return;
  }

  const assignedEmployee =
    employees.find((employee) => employee.id === projectEditForm.assignedToId) ??
    null;

  const { error } = await supabase
    .from('projects')
    .update({
      project_number: projectEditForm.projectNumber,
      project_location: projectEditForm.projectLocation,
      service_start_date: projectEditForm.serviceStartDate,
      pricing_type: projectEditForm.pricingType,
      assigned_to: projectEditForm.assignedToId || null,
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
    assigned_to: projectEditForm.assignedToId || null,
    employees: assignedEmployee ? { name: assignedEmployee.name } : null,
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

<div className="border-b pb-3">
<div className="flex items-start justify-between gap-3">
  <div className="min-w-0">
    <p className="text-sm text-gray-500">Project ID / PO Number</p>

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
        className="mt-1 w-full rounded-lg border p-3 text-xl font-bold"
      />
    ) : (
      <p className="mt-1 truncate text-2xl font-bold">
        {project.project_number}
      </p>
    )}
  </div>

  <div className="shrink-0 text-right">
  {!editingProject && project.status === 'Active' && (
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
    className="mb-1 block w-full text-xs font-medium text-gray-500 hover:text-black hover:underline"
  >
    Mark completed
  </button>
)}

{!editingProject && project.status === 'Completed' && (
  <button
    type="button"
    onClick={() => {
      const confirmed = window.confirm(
        'Reopen this project and mark it active?'
      );

      if (confirmed) {
        updateProjectStatus('Active');
      }
    }}
    className="mb-1 block w-full text-xs font-medium text-gray-500 hover:text-black hover:underline"
  >
    Reopen project
  </button>
)}


  <span
    className={`inline-block min-w-[96px] rounded-full border px-4 py-1 text-center text-sm font-medium ${statusBadgeClass(
      project.status
    )}`}
  >
    {project.status}
  </span>
</div>


</div>


  

 
<div className="my-4 border-t" />
<div className="mt-3">
  <p className="text-sm text-gray-500">Location</p>

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
      className="mt-1 w-full rounded-lg border p-3 text-sm"
    />
  ) : (
    <p className="mt-1 text-sm font-semibold text-gray-700">
  {project.project_location || 'No project location saved'}
</p>
  )}
</div>
<div className="mt-4 grid gap-3 text-sm">
  <div>
    <p className="text-sm text-gray-500">Assigned To</p>

    {editingProject ? (
      <select
        value={projectEditForm.assignedToId}
        onChange={(e) =>
          setProjectEditForm({
            ...projectEditForm,
            assignedToId: e.target.value,
          })
        }
        className="mt-1 w-full rounded-lg border p-2"
      >
        <option value="">Unassigned</option>

        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name}
          </option>
        ))}
      </select>
    ) : (
      <p className="mt-1 font-semibold">
        {project.employees?.name || 'Unassigned'}
      </p>
    )}
  </div>

  <div className="grid grid-cols-2 gap-3">
    <div>
      <p className="text-sm text-gray-500">Service Start Date</p>

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
          className="mt-1 w-full rounded-lg border p-2"
        />
      ) : (
        <p className="mt-1 font-semibold">
          {serviceStartDate}
          {timeEntries.length === 0 ? ' (Est.)' : ''}
        </p>
      )}
    </div>

    <div className="flex justify-end">
  <div className="text-left">
  <p className="text-sm text-gray-500">
  {project.status === 'Completed' ? 'Completion Date' : 'Latest Service Date'}
</p>
    <p className="mt-1 font-semibold">
      {latestServiceDate || 'No service submitted'}
    </p>
  </div>
</div>

  </div>

  {!editingProject && (
    <button
      type="button"
      onClick={startProjectEdit}
      className="text-center text-sm font-medium text-gray-500 hover:text-black hover:underline"
      >
      Edit project details
    </button>
  )}
</div>


</div>





<div className="py-3">
  <p className="text-sm text-gray-500">Customer Info</p>

  {project.customers?.id ? (
    <Link
      href={`/customers/${project.customers.id}`}
      className="mt-1 inline-block text-lg font-semibold hover:underline"
    >
      {project.customers.name}
    </Link>
  ) : (
    <p className="mt-1 text-lg font-semibold">No customer saved</p>
  )}

  <p className="mt-1 text-sm text-gray-600">
    {formatPhone(project.customers?.phone)}
    {project.customers?.email ? ` • ${project.customers.email}` : ''}
  </p>

  <div className="mt-4 border-t pt-4">
    <p className="text-xs font-medium uppercase text-gray-500">
      Customer Pricing Models
    </p>

    <div className="mt-2 grid grid-cols-[56px_1fr] gap-x-4 gap-y-1 text-sm">
      <span className="font-semibold">MAIN</span>
      <span className="text-gray-600">
        {project.customers?.pricing_models?.MAIN || 'Not set'}
      </span>

      <span className="font-semibold">LAT</span>
      <span className="text-gray-600">
        {project.customers?.pricing_models?.LAT || 'Not set'}
      </span>

      <span className="font-semibold">JET</span>
      <span className="text-gray-600">
        {project.customers?.pricing_models?.JET || 'Not set'}
      </span>
    </div>
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
  <label className="mb-2 block text-sm font-medium">Service Vehicle</label>
  <select
    className={`block w-full min-w-0 max-w-full rounded-lg border p-3 ${
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
    <option value="2016 Ford Van" className="text-black">
      2016 Ford Van
    </option>
    <option value="2007 Ford F-150" className="text-black">
      2007 Ford F-150
    </option>
  </select>
</div>

<div>
  <label className="mb-2 block text-sm font-medium">
    Type of Service Completed
  </label>
  <select
    className={`block w-full min-w-0 max-w-full rounded-lg border p-3 ${
      timeForm.workCompleted ? 'text-black' : 'text-gray-400'
    }`}
    value={timeForm.workCompleted}
    onChange={(e) => {
      const workCompleted = e.target.value;

      setTimeForm({
        ...timeForm,
        workCompleted,
        feet: ['Mainline', 'Jetter'].includes(workCompleted)
          ? timeForm.feet
          : '',
        laterals: workCompleted === 'Lateral' ? timeForm.laterals : '',
      });
    }}
  >
    <option value="" disabled hidden>
      Select service type
    </option>
    <option value="Mainline" className="text-black">
      Mainline
    </option>
    <option value="Lateral" className="text-black">
      Lateral
    </option>
    <option value="Jetter" className="text-black">
      Jetter
    </option>
    <option value="Traffic Control" className="text-black">
      Traffic Control
    </option>
  </select>
</div>


  {isHourlyProject && (
  <div>
    <label className="mb-2 block text-sm font-medium">Hours Worked</label>
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.]?[0-9]*"
      placeholder="Enter hours"
      value={timeForm.hours}
      onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
      className="block w-full min-w-0 max-w-full rounded-lg border p-3"
    />
  </div>
)}

{showFeetInput && (
  <div>
    <label className="mb-2 block text-sm font-medium">Feet Serviced</label>
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.]?[0-9]*"
      placeholder="Enter feet"
      value={timeForm.feet}
      onChange={(e) => setTimeForm({ ...timeForm, feet: e.target.value })}
      className="block w-full min-w-0 max-w-full rounded-lg border p-3"
    />
  </div>
)}

{showLateralsInput && (
  <div>
    <label className="mb-2 block text-sm font-medium">
      Laterals Serviced
    </label>
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder="Enter laterals"
      value={timeForm.laterals}
      onChange={(e) => setTimeForm({ ...timeForm, laterals: e.target.value })}
      className="block w-full min-w-0 max-w-full rounded-lg border p-3"
    />
  </div>
)}



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

<div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-2">
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
  <p className="text-xs font-medium uppercase text-gray-500">
  {isHourlyProject ? 'Service Hours' : 'Serviced'}
</p>
<p className="mt-1 font-semibold">
{isHourlyProject
  ? `${entry.hours ?? 0} hrs`
  : entry.feet !== null && entry.feet !== undefined
    ? `${entry.feet} ft`
    : entry.laterals !== null && entry.laterals !== undefined
      ? `${entry.laterals} laterals`
      : 'No quantity'}
</p>

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
          <div className="flex items-center justify-between gap-3">
  <h2 className="text-xl font-bold">Notes</h2>

  <button
    type="button"
    onClick={() => {
      setManagingProjectNotes(!managingProjectNotes);
      setEditingProjectNoteId(null);
    }}
    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
  >
    {managingProjectNotes ? 'Done' : 'Manage Notes'}
  </button>
</div>


<div className="mt-4 flex gap-2">
  <input
    type="text"
    value={newProjectNote}
    onChange={(e) => setNewProjectNote(e.target.value)}
    placeholder="Add project note..."
    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
  />

  <button
    type="button"
    onClick={saveProjectNote}
    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
  >
    Save
  </button>
</div>


  <div className="mt-5 h-[20rem] space-y-5 overflow-y-auto pr-2">
  <div>
    <h3 className="text-sm font-bold text-gray-700">Project Notes</h3>

    <div className="mt-3 space-y-3">
      {projectNoteHistory.map((note) => {
        const isEditingNote = editingProjectNoteId === note.id;

        return (
          <div key={note.id} className="rounded-xl border p-4">
            {isEditingNote ? (
              <>
                <textarea
                  value={projectNoteEditText}
                  onChange={(e) => setProjectNoteEditText(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  rows={3}
                />

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateProjectNote(note.id)}
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={cancelProjectNoteEdit}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">{note.note}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {formatTimestamp(note.created_at)}
                </p>

                {managingProjectNotes && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startProjectNoteEdit(note)}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProjectNote(note.id)}
                      className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {projectNoteHistory.length === 0 && (
        <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
          No project notes yet.
        </div>
      )}
    </div>
  </div>

  <div>
    <h3 className="text-sm font-bold text-gray-700">Service Notes</h3>

    <div className="mt-3 space-y-3">
      {serviceNoteHistory.map((note) => {
        const isEditingNote = editingProjectNoteId === note.id;

        return (
          <div key={note.id} className="rounded-xl border p-4">
            {isEditingNote ? (
              <>
                <textarea
                  value={projectNoteEditText}
                  onChange={(e) => setProjectNoteEditText(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  rows={3}
                />

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateProjectNote(note.id)}
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={cancelProjectNoteEdit}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">{note.note}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {formatTimestamp(note.created_at)}
                </p>

                {managingProjectNotes && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startProjectNoteEdit(note)}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProjectNote(note.id)}
                      className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {serviceNoteHistory.length === 0 && (
        <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
          No service notes yet.
        </div>
      )}
    </div>
  </div>
</div>

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
