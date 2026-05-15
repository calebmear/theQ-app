'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useSearchParams } from 'next/navigation';


type ProjectDetail = {
  id: string;
  project_number: string;
  status: string;
  progress: number;
  service_start_date: string;
  project_location: string | null;
  pricing_type: string | null;
  billing_method_source: string | null;
  main_pricing_type: string | null;
  lateral_pricing_type: string | null;
  jet_pricing_type: string | null;
  dye_pricing_type: string | null;
  smoke_pricing_type: string | null;
  traffic_control_pricing_type: string | null;
  billing_methods_updated_at: string | null;

  assigned_to: string | null;
  notes: string | null;
  customers: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    main_pricing_type: string | null;
    lateral_pricing_type: string | null;
    jet_pricing_type: string | null;
    dye_pricing_type: string | null;
    smoke_pricing_type: string | null;
    traffic_control_pricing_type: string | null;

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
  residences: number | null;
mainline_tests: number | null;
flat_rate: boolean | null;
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

type PendingServiceItem = {
  id: string;
  serviceType: string;
  billingMethod: string;
  quantity: string;
  serviceVehicle: string;
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

const searchParams = useSearchParams();
const from = searchParams.get('from') ?? '/projects';
const fromLabel = searchParams.get('fromLabel') ?? 'Projects';

const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
const [serviceQuantities, setServiceQuantities] = useState<
  Record<string, string>
>({});

const [pendingServiceItems, setPendingServiceItems] = useState<
  PendingServiceItem[]
>([]);

const [serviceSubmissionError, setServiceSubmissionError] = useState('');


const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
const [newProjectNote, setNewProjectNote] = useState('');

const [showServiceSubmission, setShowServiceSubmission] = useState(false);
const [showServiceLog, setShowServiceLog] = useState(true);
const [showNotes, setShowNotes] = useState(true);



const [expandedTimeEntryId, setExpandedTimeEntryId] = useState<string | null>(
  null
);
const [expandedServiceDates, setExpandedServiceDates] = useState<string[]>([]);

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
  billingMethodSource: 'customer',
  mainPricingType: '',
  lateralPricingType: '',
  jetPricingType: '',
  dyePricingType: '',
  smokePricingType: '',
  trafficControlPricingType: '',
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


const standardBillingMethods = {
  main: 'Per Foot',
  lateral: 'Per Lateral',
  jet: 'Per Foot',
  dye: 'Per Hour',
  smoke: 'Per Residence',
  trafficControl: 'Flat Rate',
};

const billingTypeOptions = [
  {
    code: 'MAIN',
    label: 'Mainline',
    field: 'mainPricingType',
    choices: ['Per Hour', 'Per Foot'],
  },
  {
    code: 'LAT',
    label: 'Lateral',
    field: 'lateralPricingType',
    choices: ['Per Hour', 'Per Lateral'],
  },
  {
    code: 'JET',
    label: 'Jetter',
    field: 'jetPricingType',
    choices: ['Per Hour', 'Per Foot'],
  },
  {
    code: 'DYE',
    label: 'Dye',
    field: 'dyePricingType',
    choices: ['Per Hour'],
  },
  {
    code: 'SMK',
    label: 'Smoke',
    field: 'smokePricingType',
    choices: ['Per Hour', 'Per Mainline Test', 'Per Residence'],
  },
  {
    code: 'TRFC',
    label: 'Traffic Control',
    field: 'trafficControlPricingType',
    choices: ['Flat Rate'],
  },
] as const;

function getProjectBillingMethods() {
  if (!project) return standardBillingMethods;

  if (project.billing_method_source === 'project') {
    return {
      main: project.main_pricing_type || standardBillingMethods.main,
      lateral: project.lateral_pricing_type || standardBillingMethods.lateral,
      jet: project.jet_pricing_type || standardBillingMethods.jet,
      dye: project.dye_pricing_type || standardBillingMethods.dye,
      smoke: project.smoke_pricing_type || standardBillingMethods.smoke,
      trafficControl:
        project.traffic_control_pricing_type ||
        standardBillingMethods.trafficControl,
    };
  }

  if (project.billing_method_source === 'standard') {
    return standardBillingMethods;
  }

  return {
    main: project.customers?.main_pricing_type || standardBillingMethods.main,
    lateral:
      project.customers?.lateral_pricing_type || standardBillingMethods.lateral,
    jet: project.customers?.jet_pricing_type || standardBillingMethods.jet,
    dye: project.customers?.dye_pricing_type || standardBillingMethods.dye,
    smoke: project.customers?.smoke_pricing_type || standardBillingMethods.smoke,
    trafficControl:
      project.customers?.traffic_control_pricing_type ||
      standardBillingMethods.trafficControl,
  };
}

const billingMethods = getProjectBillingMethods();

function billingMethodForService(serviceType: string) {
  if (serviceType === 'Mainline') return billingMethods.main;
  if (serviceType === 'Lateral') return billingMethods.lateral;
  if (serviceType === 'Jetter') return billingMethods.jet;
  if (serviceType === 'Dye') return billingMethods.dye;
  if (serviceType === 'Smoke') return billingMethods.smoke;
  if (serviceType === 'Traffic Control') return billingMethods.trafficControl;

  return '';
}

function billingMethodForEntry(entry: TimeEntry) {
  return billingMethodForService(entry.work_completed ?? '');
}

function entryQuantityDetails(entry: TimeEntry) {
  const details = [];

  if (entry.hours !== null && entry.hours !== undefined) {
    details.push({ label: 'Hours', value: entry.hours });
  }

  if (entry.feet !== null && entry.feet !== undefined) {
    details.push({ label: 'Feet', value: entry.feet });
  }

  if (entry.laterals !== null && entry.laterals !== undefined) {
    details.push({ label: 'Laterals', value: entry.laterals });
  }

  if (entry.residences !== null && entry.residences !== undefined) {
    details.push({ label: 'Residences', value: entry.residences });
  }

  if (entry.mainline_tests !== null && entry.mainline_tests !== undefined) {
    details.push({ label: 'Mainline Tests', value: entry.mainline_tests });
  }

  if (entry.flat_rate) {
    details.push({ label: 'Flat Rate', value: 'Yes' });
  }

  return details;
}



function quantityLabelForEntry(entry: TimeEntry) {
  const entryBillingMethod = billingMethodForEntry(entry);

  if (entryBillingMethod === 'Per Hour') {
    return `${entry.hours ?? 0} hrs`;
  }

  if (entryBillingMethod === 'Per Foot') {
    return entry.feet !== null && entry.feet !== undefined
      ? `${entry.feet} ft`
      : 'No quantity';
  }

  if (entryBillingMethod === 'Per Lateral') {
    return entry.laterals !== null && entry.laterals !== undefined
      ? `${entry.laterals} laterals`
      : 'No quantity';
  }

  if (entryBillingMethod === 'Per Residence') {
    return entry.residences !== null && entry.residences !== undefined
      ? `${entry.residences} residences`
      : 'No quantity';
  }
  
  if (entryBillingMethod === 'Per Mainline Test') {
    return entry.mainline_tests !== null && entry.mainline_tests !== undefined
      ? `${entry.mainline_tests} tests`
      : 'No quantity';
  }
  

  if (entryBillingMethod === 'Flat Rate' || entry.flat_rate) {
    return 'Flat rate';
  }

  return 'No quantity';
}


const serviceTypeOptions = [
  'Mainline',
  'Lateral',
  'Jetter',
  'Dye',
  'Smoke',
  'Traffic Control',
] as const;

function serviceNeedsQuantity(serviceType: string) {
  return billingMethodForService(serviceType) !== 'Flat Rate';
}

function quantityLabelForService(serviceType: string) {
  const billingMethod = billingMethodForService(serviceType);

  if (billingMethod === 'Per Hour') return 'Hours Worked';
  if (billingMethod === 'Per Foot') return 'Feet Serviced';
  if (billingMethod === 'Per Lateral') return 'Laterals Serviced';
  if (billingMethod === 'Per Residence') return 'Residences Tested';
  if (billingMethod === 'Per Mainline Test') return 'Mainline Tests';

  return '';
}

function quantityPlaceholderForService(serviceType: string) {
  const billingMethod = billingMethodForService(serviceType);

  if (billingMethod === 'Per Hour') return 'Enter hours';
  if (billingMethod === 'Per Foot') return 'Enter feet';
  if (billingMethod === 'Per Lateral') return 'Enter laterals';
  if (billingMethod === 'Per Residence') return 'Enter residences';
  if (billingMethod === 'Per Mainline Test') return 'Enter tests';

  return '';
}

function clearServiceSubmissionForm() {
  setTimeForm({
    workDate: today,
    workCompleted: '',
    serviceVehicle: '',
    hours: '',
    feet: '',
    laterals: '',
    notes: '',
  });

  setSelectedServiceTypes([]);
  setServiceQuantities({});
  setPendingServiceItems([]);
  setEditingTimeEntryId(null);
  setServiceSubmissionError('');

}

function addSelectedServicesToSubmission() {
  if (!timeForm.serviceVehicle) {
    setServiceSubmissionError('Select a service vehicle.');
    return;
  }

  if (selectedServiceTypes.length === 0) {
    setServiceSubmissionError('Select at least one service.');
    return;
  }

  const missingQuantity = selectedServiceTypes.some(
    (serviceType) =>
      serviceNeedsQuantity(serviceType) && !serviceQuantities[serviceType]
  );

  if (missingQuantity) {
    setServiceSubmissionError('Enter the required quantity.');
    return;
  }

  setServiceSubmissionError('');

  const newItems = selectedServiceTypes.map((serviceType) => {
    const billingMethod = billingMethodForService(serviceType);

    return {
      id: crypto.randomUUID(),
      serviceType,
      billingMethod,
      quantity: serviceQuantities[serviceType] ?? '',
      serviceVehicle: timeForm.serviceVehicle,
    };
  });

  setPendingServiceItems([...pendingServiceItems, ...newItems]);
  setSelectedServiceTypes([]);
  setServiceQuantities({});
  setTimeForm({
    ...timeForm,
    serviceVehicle: '',
  });
}


function removePendingServiceItem(itemId: string) {
  setPendingServiceItems(
    pendingServiceItems.filter((item) => item.id !== itemId)
  );
}

function quantityLabelForPendingItem(item: PendingServiceItem) {
  if (item.billingMethod === 'Per Hour') return `${item.quantity} hrs`;
  if (item.billingMethod === 'Per Foot') return `${item.quantity} ft`;
  if (item.billingMethod === 'Per Lateral') return `${item.quantity} laterals`;
  if (item.billingMethod === 'Per Residence') return `${item.quantity} residences`;
  if (item.billingMethod === 'Per Mainline Test') return `${item.quantity} tests`;
  if (item.billingMethod === 'Flat Rate') return 'Flat rate';

  return 'No quantity';
}



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
billing_method_source,
main_pricing_type,
lateral_pricing_type,
jet_pricing_type,
dye_pricing_type,
smoke_pricing_type,
traffic_control_pricing_type,
billing_methods_updated_at,
assigned_to,
notes,
customers (
  id,
  name,
  address,
  phone,
  email,
  main_pricing_type,
  lateral_pricing_type,
  jet_pricing_type,
  dye_pricing_type,
  smoke_pricing_type,
  traffic_control_pricing_type
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
    billing_method_source: data.billing_method_source ?? 'customer',
main_pricing_type: data.main_pricing_type,
lateral_pricing_type: data.lateral_pricing_type,
jet_pricing_type: data.jet_pricing_type,
dye_pricing_type: data.dye_pricing_type,
smoke_pricing_type: data.smoke_pricing_type,
traffic_control_pricing_type: data.traffic_control_pricing_type,
billing_methods_updated_at: data.billing_methods_updated_at,

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

  function serviceDateSummary(entries: TimeEntry[]) {
    const vehicles = Array.from(
      new Set(
        entries
          .map((entry) => entry.service_vehicle)
          .filter((vehicle): vehicle is string => Boolean(vehicle))
      )
    );
  
    const serviceTotals = entries.reduce<
  Record<
    string,
    {
      hours: number;
      feet: number;
      laterals: number;
      residences: number;
      mainlineTests: number;
      flatRates: number;
    }
  >
>((summary, entry) => {
      const serviceType = entry.work_completed || 'Unknown Service';
      const billingMethod = billingMethodForEntry(entry);
  
      if (!summary[serviceType]) {
        summary[serviceType] = {
          hours: 0,
          feet: 0,
          laterals: 0,
          residences: 0,
          mainlineTests: 0,
          flatRates: 0,
        };
      }
  
      if (billingMethod === 'Per Hour') {
        summary[serviceType].hours += entry.hours ?? 0;
      }
  
      if (billingMethod === 'Per Foot') {
        summary[serviceType].feet += entry.feet ?? 0;
      }
  
      if (billingMethod === 'Per Lateral') {
        summary[serviceType].laterals += entry.laterals ?? 0;
      }

      if (billingMethod === 'Per Residence') {
        summary[serviceType].residences += entry.residences ?? 0;
      }
      
      if (billingMethod === 'Per Mainline Test') {
        summary[serviceType].mainlineTests += entry.mainline_tests ?? 0;
      }
      
      if (billingMethod === 'Flat Rate' || entry.flat_rate) {
        summary[serviceType].flatRates += 1;
      }
  
      return summary;
    }, {});
  
    const services = Object.entries(serviceTotals).map(([serviceType, totals]) => {
      const quantities = [];
  
      if (totals.hours > 0) quantities.push(`${totals.hours} hrs`);
      if (totals.feet > 0) quantities.push(`${totals.feet} ft`);
      if (totals.laterals > 0) quantities.push(`${totals.laterals} laterals`);
      if (totals.residences > 0) quantities.push(`${totals.residences} residences`);
      if (totals.mainlineTests > 0) quantities.push(`${totals.mainlineTests} tests`);

      if (totals.flatRates > 0) quantities.push('Flat rate');
  
      return `${serviceType}: ${quantities.join(' • ') || 'No quantity'}`;
    });
  
    return {
      vehicles: vehicles.length > 0 ? vehicles.join(', ') : 'No vehicle listed',
      services,
    };
  }
  
  

  const groupedTimeEntries = Object.entries(
    timeEntries.reduce<Record<string, TimeEntry[]>>((groups, entry) => {
      if (!groups[entry.work_date]) {
        groups[entry.work_date] = [];
      }
  
      groups[entry.work_date].push(entry);
      return groups;
    }, {})
  );

async function loadTimeEntries(projectId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select(
      'id, work_date, work_completed, service_vehicle, hours, feet, laterals, residences, mainline_tests, flat_rate, notes, created_at, updated_at'
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
  if (!project || !timeForm.workDate) {
    return;
  }

  if (pendingServiceItems.length === 0) return;

  const isFirstTimeEntry = !editingTimeEntryId && timeEntries.length === 0;

  const timeEntryValues = pendingServiceItems.map((item) => ({
    project_id: project.id,
    work_date: timeForm.workDate,
    work_completed: item.serviceType,
    service_vehicle: item.serviceVehicle,
    hours: item.billingMethod === 'Per Hour' ? Number(item.quantity) : null,
feet: item.billingMethod === 'Per Foot' ? Number(item.quantity) : null,
laterals: item.billingMethod === 'Per Lateral' ? Number(item.quantity) : null,
residences:
  item.billingMethod === 'Per Residence' ? Number(item.quantity) : null,
mainline_tests:
  item.billingMethod === 'Per Mainline Test' ? Number(item.quantity) : null,
flat_rate: item.billingMethod === 'Flat Rate',
notes: timeForm.notes,
  }));

  const { error } = await supabase.from('time_entries').insert(timeEntryValues);

  if (error) {
    console.error('Error submitting time entry:', error);
    alert(error.message);
    return;
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

  setSelectedServiceTypes([]);
  setServiceQuantities({});
  setPendingServiceItems([]);
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
  if (!project || !inlineTimeForm.workDate || !inlineTimeForm.workCompleted) {
    return;
  }

  const inlineBillingMethod = billingMethodForService(
    inlineTimeForm.workCompleted
  );

  const inlineShowsHours = inlineBillingMethod === 'Per Hour';
  const inlineShowsFeet = inlineBillingMethod === 'Per Foot';
  const inlineShowsLaterals = inlineBillingMethod === 'Per Lateral';

  if (inlineShowsHours && !inlineTimeForm.hours) return;
  if (inlineShowsFeet && !inlineTimeForm.feet) return;
  if (inlineShowsLaterals && !inlineTimeForm.laterals) return;

  const { error } = await supabase
    .from('time_entries')
    .update({
      work_date: inlineTimeForm.workDate,
      work_completed: inlineTimeForm.workCompleted,
      service_vehicle: inlineTimeForm.serviceVehicle,
      hours: inlineShowsHours ? Number(inlineTimeForm.hours) : null,
      feet: inlineShowsFeet ? Number(inlineTimeForm.feet) : null,
      laterals: inlineShowsLaterals ? Number(inlineTimeForm.laterals) : null,
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
    billingMethodSource: project.billing_method_source ?? 'customer',
mainPricingType: project.main_pricing_type ?? billingMethods.main,
lateralPricingType: project.lateral_pricing_type ?? billingMethods.lateral,
jetPricingType: project.jet_pricing_type ?? billingMethods.jet,
dyePricingType: project.dye_pricing_type ?? billingMethods.dye,
smokePricingType: project.smoke_pricing_type ?? billingMethods.smoke,
trafficControlPricingType:
  project.traffic_control_pricing_type ?? billingMethods.trafficControl,

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

    const billingChanged =
  projectEditForm.billingMethodSource !==
    (project.billing_method_source ?? 'customer') ||
  projectEditForm.mainPricingType !== (project.main_pricing_type ?? '') ||
  projectEditForm.lateralPricingType !==
    (project.lateral_pricing_type ?? '') ||
  projectEditForm.jetPricingType !== (project.jet_pricing_type ?? '') ||
  projectEditForm.dyePricingType !== (project.dye_pricing_type ?? '') ||
  projectEditForm.smokePricingType !== (project.smoke_pricing_type ?? '') ||
  projectEditForm.trafficControlPricingType !==
    (project.traffic_control_pricing_type ?? '');

const billingMethodsUpdatedAt = billingChanged
  ? new Date().toISOString()
  : project.billing_methods_updated_at;


  const { error } = await supabase
    .from('projects')
    .update({
      project_number: projectEditForm.projectNumber,
      project_location: projectEditForm.projectLocation,
      ...(timeEntries.length === 0 && {
        service_start_date: projectEditForm.serviceStartDate,
      }),
      pricing_type: projectEditForm.pricingType,
      assigned_to: projectEditForm.assignedToId || null,
billing_method_source: projectEditForm.billingMethodSource,
billing_methods_updated_at: billingMethodsUpdatedAt,

main_pricing_type:

  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.mainPricingType
    : null,
lateral_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.lateralPricingType
    : null,
jet_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.jetPricingType
    : null,
dye_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.dyePricingType
    : null,
smoke_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.smokePricingType
    : null,
traffic_control_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.trafficControlPricingType
    : null,

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
    service_start_date:
  timeEntries.length === 0
    ? projectEditForm.serviceStartDate
    : project.service_start_date,
    pricing_type: projectEditForm.pricingType,
    assigned_to: projectEditForm.assignedToId || null,
    employees: assignedEmployee ? { name: assignedEmployee.name } : null,
    billing_method_source: projectEditForm.billingMethodSource,
    billing_methods_updated_at: billingMethodsUpdatedAt,

main_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.mainPricingType
    : null,
lateral_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.lateralPricingType
    : null,
jet_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.jetPricingType
    : null,
dye_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.dyePricingType
    : null,
smoke_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.smokePricingType
    : null,
traffic_control_pricing_type:
  projectEditForm.billingMethodSource === 'project'
    ? projectEditForm.trafficControlPricingType
    : null,

  });

  setEditingProject(false);
}


  return (
    <div className="space-y-6 text-black">
      <div className="text-sm text-gray-500">
  <Link href={from} className="hover:text-black hover:underline">
    {fromLabel}
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
  <p className="text-xs font-medium uppercase text-gray-500">Project ID / PO Number</p>


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
  <div className="mb-1 h-4">
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
        className="block w-full text-xs font-medium text-gray-500 hover:text-black hover:underline"
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
        className="block w-full text-xs font-medium text-gray-500 hover:text-black hover:underline"
      >
        Reopen project
      </button>
    )}
  </div>

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
<p className="text-xs font-medium uppercase text-gray-500">Location</p>

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
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 text-sm font-semibold text-gray-700">
          {project.project_location || 'No project location saved'}
        </p>
    
        {project.project_location && (
          <button
          type="button"
          aria-label="Copy project location"
          title="Copy project location"
          onClick={() => navigator.clipboard.writeText(project.project_location || '')}
          className="shrink-0 rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600"
        >
          <Copy size={14} strokeWidth={1.75} />
        </button>
        )}
      </div>
    )}
</div>
<div className="mt-4 grid gap-3 text-sm">
  <div>
  <p className="text-xs font-medium uppercase text-gray-500">Assigned To</p>

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
    <p className="text-xs font-medium uppercase text-gray-500">Service Start Date</p>

      {editingProject && timeEntries.length === 0 ? (
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
    {serviceStartDate || 'No date saved'}
    {timeEntries.length === 0 ? ' (Est.)' : ''}
  </p>
)}

    </div>

    <div className="flex justify-end">
  <div className="text-left">
  <p className="text-xs font-medium uppercase text-gray-500">
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
<p className="text-xs font-medium uppercase text-gray-500">Customer Info</p>

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
    Billing Methods
  </p>

  <p className="mt-1 text-xs text-gray-500">
  Source: {project.billing_method_source || 'Customer'}
</p>

{project.billing_methods_updated_at && (
  <p className="mt-1 text-xs text-gray-500">
    Updated: {formatTimestamp(project.billing_methods_updated_at)}
  </p>
)}

  {editingProject && (
  <div className="mt-3 space-y-3">
    <select
      value={projectEditForm.billingMethodSource}
      onChange={(e) =>
        setProjectEditForm({
          ...projectEditForm,
          billingMethodSource: e.target.value,
        })
      }
      className="w-full rounded-lg border p-2 text-sm"
    >
      <option value="customer">Customer</option>
      <option value="standard">Standard</option>
      <option value="project">Project Override</option>
    </select>

    {projectEditForm.billingMethodSource === 'project' && (
      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
        {billingTypeOptions.map((option) => (
          <div key={option.code} className="grid gap-2">
            <div className="flex items-baseline gap-2">
              <p className="font-medium">{option.label}</p>
              <p className="text-xs font-medium text-gray-500">
                {option.code}
              </p>
            </div>

            <select
              value={projectEditForm[option.field]}
              onChange={(e) =>
                setProjectEditForm({
                  ...projectEditForm,
                  [option.field]: e.target.value,
                })
              }
              className="rounded-lg border p-2 text-sm"
            >
              <option value="" disabled hidden>
                Select billing method
              </option>

              {option.choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    )}
  </div>
)}


<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
  <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
    <span className="font-semibold">MAIN</span>
    <span className="min-w-0 break-words text-gray-600">
      {billingMethods.main}
    </span>

    <span className="font-semibold">LAT</span>
    <span className="min-w-0 break-words text-gray-600">
      {billingMethods.lateral}
    </span>

    <span className="font-semibold">JET</span>
    <span className="min-w-0 break-words text-gray-600">
      {billingMethods.jet}
    </span>
  </div>

  <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
    <span className="font-semibold">DYE</span>
    <span className="min-w-0 break-words text-gray-600">
      {billingMethods.dye}
    </span>

    <span className="font-semibold">SMK</span>
    <span className="min-w-0 break-words text-gray-600">
      {billingMethods.smoke}
    </span>

    <span className="font-semibold">TRFC</span>
    <span className="min-w-0 break-words text-gray-600">
      {billingMethods.trafficControl}
    </span>
  </div>
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
<div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">

      <div className="min-w-0">
  <label className="mb-2 block text-sm font-medium">Service Date</label>
  <input
    type="date"
    value={timeForm.workDate}
    onChange={(e) =>
      setTimeForm({ ...timeForm, workDate: e.target.value })
    }
    className="block w-full min-w-0 max-w-full appearance-none rounded-lg border border-black p-3 text-sm"
  />
</div>


<div>
  <label className="mb-2 block text-sm font-medium">Service Vehicle</label>

  <div className="grid grid-cols-2 gap-2">
    {['2016 Ford Van', '2007 Ford F-150'].map((vehicle) => {
      const selected = timeForm.serviceVehicle === vehicle;

      return (
        <button
          key={vehicle}
          type="button"
          onClick={() =>
            setTimeForm({
              ...timeForm,
              serviceVehicle: selected ? '' : vehicle,
            })
          }
          className={`rounded-lg border px-3 py-3 text-sm font-medium ${
            selected
              ? 'border-black bg-black text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {vehicle}
        </button>
      );
    })}
  </div>
</div>


<div className="md:col-span-2">
  <label className="mb-2 block text-sm font-medium">
    Type of Service Completed
  </label>

  <div className="grid grid-cols-2 gap-2">
  {serviceTypeOptions.map((serviceType) => {
  const selected = selectedServiceTypes.includes(serviceType);

  return (
    <button
      key={serviceType}
      type="button"
      onClick={() => {
        if (selected) {
          setSelectedServiceTypes(
            selectedServiceTypes.filter((type) => type !== serviceType)
          );

          const nextQuantities = { ...serviceQuantities };
          delete nextQuantities[serviceType];
          setServiceQuantities(nextQuantities);
          return;
        }

        setSelectedServiceTypes([...selectedServiceTypes, serviceType]);
      }}
      className={`rounded-lg border px-3 py-3 text-sm font-medium ${
        selected
          ? 'border-black bg-black text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {serviceType}
    </button>
  );
})}

  </div>
</div>

{selectedServiceTypes.length > 0 && (
  <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
    {selectedServiceTypes.map((serviceType) => {
      const billingMethod = billingMethodForService(serviceType);

      if (billingMethod === 'Flat Rate') {
        return (
          <div key={serviceType} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{serviceType}</p>
            <p className="mt-1 text-sm text-gray-500">Flat rate</p>
          </div>
        );
      }

      return (
        <div key={serviceType}>
          <label className="mb-2 block text-sm font-medium">
            {serviceType} - {quantityLabelForService(serviceType)}
          </label>
          <input
            type="text"
            inputMode={
              billingMethod === 'Per Hour' || billingMethod === 'Per Foot'
                ? 'decimal'
                : 'numeric'
            }
            placeholder={quantityPlaceholderForService(serviceType)}
            value={serviceQuantities[serviceType] ?? ''}
            onChange={(e) =>
              setServiceQuantities({
                ...serviceQuantities,
                [serviceType]: e.target.value,
              })
            }
            className="block w-full min-w-0 max-w-full rounded-lg border p-3"
          />
        </div>
      );
    })}
  </div>
)}

<div className="md:col-span-2">
  <button
    type="button"
    onClick={addSelectedServicesToSubmission}
    className="w-full rounded-lg border border-[#009be5] bg-[#eaf7fe] px-5 py-3 text-sm font-semibold text-[#007bb8] shadow-sm hover:bg-[#d8f0fc]"
  >
    Add Service
  </button>

  {serviceSubmissionError && (
    <p className="mt-2 text-sm font-medium text-red-600">
      {serviceSubmissionError}
    </p>
  )}
</div>


{pendingServiceItems.length > 0 && (
  <div className="md:col-span-2 rounded-xl border p-4">
    <p className="text-sm font-bold text-gray-700">Submission Review</p>

    <div className="mt-3 space-y-2">
      {pendingServiceItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">{item.serviceType}</p>
            <p className="text-xs text-gray-500">
  {item.serviceVehicle}
</p>
<p className="text-xs text-gray-500">
  {item.billingMethod} - {quantityLabelForPendingItem(item)}
</p>
          </div>

          <button
            type="button"
            onClick={() => removePendingServiceItem(item.id)}
            className="rounded-lg border px-3 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
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

<div className="mt-4 grid gap-3">
  <button
    type="button"
    onClick={submitTimeEntry}
    className="w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
    >
    {editingTimeEntryId ? 'Update Time' : 'Submit All'}
  </button>

  <button
  type="button"
  onClick={clearServiceSubmissionForm}
  className="w-full rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
>
  Clear
</button>
</div>

</>
  )}

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
  <button
    type="button"
    onClick={() => setShowServiceLog(!showServiceLog)}
    className="flex w-full items-center justify-between gap-4 text-left"
  >
    <div>
      <h2 className="text-xl font-bold">Service Log</h2>
      <p className="mt-1 text-sm text-gray-600">
        View submitted service entries.
      </p>
    </div>

    <span className="text-2xl leading-none text-gray-500">
      {showServiceLog ? '⌄' : '›'}
    </span>
  </button>

  {showServiceLog && (
    <>
      <div className="mt-4 flex justify-end">
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

      {groupedTimeEntries.map(([workDate, entries]) => {
  const isDateExpanded = expandedServiceDates.includes(workDate);
  const summary = serviceDateSummary(entries);

  return (
    <div key={workDate} className="rounded-xl border">
      <button
  type="button"
  onClick={() =>
    setExpandedServiceDates((dates) =>
      dates.includes(workDate)
        ? dates.filter((date) => date !== workDate)
        : [...dates, workDate]
    )
  }
  className="w-full p-4 text-left"
>
<div className="grid w-full gap-4 md:grid-cols-[180px_minmax(0,1fr)_80px] md:items-start">
<div>
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">
        Service Date
      </p>
      <p className="mt-1 font-semibold">{formatDate(workDate)}</p>
    </div>

    <div className="text-right md:hidden">
      <p className="text-xs font-medium uppercase text-gray-500">
        Entries
      </p>
      <p className="mt-1 pr-4 font-semibold">
        {entries.length}
      </p>
    </div>
  </div>

  <div className="mt-5">
      <p className="text-xs font-medium uppercase text-gray-500">
        Vehicles
      </p>
      <p className="mt-1 text-sm text-gray-700">
        {summary.vehicles}
      </p>
    </div>
  </div>

  <div className="min-w-0">
    <p className="text-xs font-medium uppercase text-gray-500">
      Services
    </p>

    <div className="mt-1 space-y-1">
      {summary.services.length > 0 ? (
        summary.services.map((service) => (
          <p key={service} className="text-sm font-medium text-gray-700 md:truncate">
            {service}
          </p>
        ))
      ) : (
        <p className="text-sm text-gray-500">No services listed</p>
      )}
    </div>
  </div>

  <div className="hidden border-t pt-3 md:block md:border-t-0 md:pt-0 md:text-right">
    <p className="text-xs font-medium uppercase text-gray-500">
      Entries
    </p>
    <p className="mt-1 font-semibold">
      {entries.length}
    </p>
  </div>
</div>
</button>


      {isDateExpanded && (
        <div className="space-y-3 border-t p-3">
          {entries.map((entry) => {
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
<option>Dye</option>
<option>Smoke</option>
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
  {billingMethodForEntry(entry) || 'Quantity'}
</p>
<p className="mt-1 font-semibold">
{quantityLabelForEntry(entry)}
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
<div>
  <p className="text-xs font-medium uppercase text-gray-500">
    Quantities
  </p>

  {entryQuantityDetails(entry).length > 0 ? (
    <div className="mt-1 grid gap-1 text-sm text-gray-700">
      {entryQuantityDetails(entry).map((detail) => (
        <p key={detail.label}>
          <span className="font-medium">{detail.label}:</span>{' '}
          {detail.value}
        </p>
      ))}
    </div>
  ) : (
    <p className="mt-1 text-sm text-gray-700">No quantity submitted</p>
  )}
</div>

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
        </div>
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
    </>
  )}
</div>



    

<div className="rounded-2xl bg-white p-6 shadow">
  <button
    type="button"
    onClick={() => setShowNotes(!showNotes)}
    className="flex w-full items-center justify-between gap-4 text-left"
  >
    <div>
      <h2 className="text-xl font-bold">Notes</h2>
      <p className="mt-1 text-sm text-gray-600">
        View project and service notes.
      </p>
    </div>

    <span className="text-2xl leading-none text-gray-500">
      {showNotes ? '⌄' : '›'}
    </span>
  </button>

  {showNotes && (
    <>
      <div className="mt-4 flex justify-end">
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
    </>
  )}
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
