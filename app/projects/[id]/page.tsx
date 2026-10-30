'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Copy, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useSearchParams } from 'next/navigation';
import { useUserProfile } from '../../../lib/useUserProfile';


type ProjectDayUpdate = {
  id: string;
  work_date: string;
  reason: string;
  note: string;
  created_at: string;
  technician: string;
  created_by: string;
  updated_at: string;
};

type ProjectDetail = {
  project_type: string | null;
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
  push_rod_pricing_type: string | null;
  dye_pricing_type: string | null;
  smoke_pricing_type: string | null;
  laborer_pricing_type: string | null;
  traffic_control_pricing_type: string | null;
  billing_methods_updated_at: string | null;

  assigned_to: string | null;
  notes: string | null;
  customers: {
    id: string;
    customer_type: string | null;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    main_pricing_type: string | null;
    lateral_pricing_type: string | null;
    jet_pricing_type: string | null;
    push_rod_pricing_type: string | null;
    dye_pricing_type: string | null;
    smoke_pricing_type: string | null;
    laborer_pricing_type: string | null;
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
  mainline_tests: number | null;
  residences: number | null;  
  flat_rate: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
  deleted_reason?: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_profile?: { full_name: string } | null;
  updated_profile?: { full_name: string } | null;
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
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_profile?: { full_name: string } | null;
  updated_profile?: { full_name: string } | null;
};

type ProjectAttachment = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  uploaded_by_username: string | null;
  signedUrl?: string;
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
  serviceConnections: string;
  serviceVehicle: string;
  note: string;
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
  
  function formatFeet(value: number) {
    return Number(value.toFixed(2)).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    });
  }
  
  const today = getLocalDateInputValue();

const [project, setProject] = useState<ProjectDetail | null>(null);
const [dayUpdates, setDayUpdates] = useState<ProjectDayUpdate[]>([]);
const [dayUpdatesError, setDayUpdatesError] = useState('');
const [dayUpdatesLoading, setDayUpdatesLoading] = useState(false);
const [dayRevision, setDayRevision] = useState(0);
const [dayUpdateNotice, setDayUpdateNotice] = useState('');
const [nonbillableEntries, setNonbillableEntries] = useState<NonbillableEntry[]>([]);
const [nonbillableError, setNonbillableError] = useState('');
const [nonbillableLoading, setNonbillableLoading] = useState(false);
const [nonbillableRevision, setNonbillableRevision] = useState(0);
const [nonbillableModal, setNonbillableModal] = useState<{date:string;entry:NonbillableEntry|null}|null>(null);
useEffect(() => {
 const projectId=project?.id;if(!projectId)return;let cancelled=false;
 async function load(){
  setNonbillableLoading(true);setNonbillableError('');
  try{
   const {data,error}=await supabase.from('project_nonbillable_work').select('*, created_profile:user_profiles!project_nonbillable_work_created_by_fkey(full_name)').eq('project_id',projectId).is('deleted_at',null).order('work_date',{ascending:false});
   if(error)throw error;
   if(!cancelled)setNonbillableEntries((data??[]).map(entry=>{
    const profile=Array.isArray(entry.created_profile)?entry.created_profile[0]:entry.created_profile;
    return {...entry,technician:profile?.full_name||'Unknown user'} as NonbillableEntry;
   }));
  }catch(e){if(!cancelled)setNonbillableError((e as {message?:string}).message||'Could not load non-billable work.');}
  finally{if(!cancelled)setNonbillableLoading(false);}
 }
 void load();return()=>{cancelled=true;};
},[project?.id,nonbillableRevision]);


useEffect(() => {
  const projectId = project?.id;
  if (!projectId) return;
  let cancelled = false;
  async function loadDayUpdates() {
    setDayUpdatesLoading(true);
    setDayUpdatesError('');
    try {
      const { data, error } = await supabase.from('project_day_updates')
        .select('id, work_date, reason, note, created_at, created_by, updated_at, created_profile:user_profiles!project_day_updates_created_by_fkey(full_name)')
        .eq('project_id', projectId).is('deleted_at', null).order('work_date', { ascending: false });
      if (error) throw error;
      if (!cancelled) setDayUpdates((data ?? []).map((entry) => {
        const profile = Array.isArray(entry.created_profile) ? entry.created_profile[0] : entry.created_profile;
        return { id: entry.id, work_date: entry.work_date, reason: entry.reason,
          note: entry.note ?? '', created_at: entry.created_at,
          created_by: entry.created_by, updated_at: entry.updated_at,
          technician: profile?.full_name || 'Unknown technician' };
      }));
    } catch (failure) {
      if (!cancelled) setDayUpdatesError(failure instanceof Error ? failure.message :
        (failure as { message?: string })?.message || 'Could not load Holiday/Unable updates.');
    } finally {
      if (!cancelled) setDayUpdatesLoading(false);
    }
  }
  setDayUpdates([]);
  void loadDayUpdates();
  return () => { cancelled = true; };
}, [project?.id, dayRevision]);

const [projectAttachments, setProjectAttachments] = useState<ProjectAttachment[]>([]);
const [uploadingAttachment, setUploadingAttachment] = useState(false);
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

const [calendarMonth, setCalendarMonth] = useState(() => new Date());
const calendarInitializedFor = useRef<string | null>(null);
const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(() => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
});

const searchParams = useSearchParams();
const from = searchParams.get('from') ?? '/projects';
const fromLabel = searchParams.get('fromLabel') ?? 'Projects';

const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
const [serviceQuantities, setServiceQuantities] = useState<
  Record<string, string>
>({});

const [serviceConnections, setServiceConnections] = useState<
  Record<string, string>
>({});

const [serviceNotes, setServiceNotes] = useState<Record<string, string>>({});


const [pendingServiceItems, setPendingServiceItems] = useState<
  PendingServiceItem[]
>([]);

const [serviceSubmissionError, setServiceSubmissionError] = useState('');


const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
const [newProjectNote, setNewProjectNote] = useState('');

const [showServiceSubmission, setShowServiceSubmission] = useState(false);

const [showNotes, setShowNotes] = useState(false);


const [expandedTimeEntryId, setExpandedTimeEntryId] = useState<string | null>(
  null
);
const [expandedServiceDates, setExpandedServiceDates] = useState<string[]>([]);



const [employees, setEmployees] = useState<Employee[]>([]);

const projectNoteHistory = projectNotes.filter(
  (note) => !note.note.toLowerCase().startsWith('service note:')
);

const [managingProjectNotes, setManagingProjectNotes] = useState(false);

const [editingProject, setEditingProject] = useState(false);
const [billingExpanded, setBillingExpanded] = useState(false);
const [projectPricingRevision, setProjectPricingRevision] = useState(0);
const [projectSaveError, setProjectSaveError] = useState('');
const [projectSaving, setProjectSaving] = useState(false);
const projectSavingRef = useRef(false);
const [projectEditForm, setProjectEditForm] = useState({
  projectType: '',
  projectNumber: '',
  projectLocation: '',
  serviceStartDate: '',
  pricingType: '',
  assignedToId: '',
  billingMethodSource: 'customer',
  mainPricingType: '',
  lateralPricingType: '',
  jetPricingType: '',
  pushRodPricingType: '',
  dyePricingType: '',
  smokePricingType: '',
  laborerPricingType: '',
  trafficControlPricingType: '',
});
const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(
  null
);

const [editingProjectNoteId, setEditingProjectNoteId] = useState<string | null>(null);
const [projectNoteEditText, setProjectNoteEditText] = useState('');

const [managingTimeEntries, setManagingTimeEntries] = useState(false);
const entryDetailsRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!managingTimeEntries) return;
  const cancelManagement = () => { setManagingTimeEntries(false); cancelInlineTimeEdit(); };
  const outside = (event: PointerEvent) => {
    if (document.querySelector('dialog[open]')) return;
    if (event.target instanceof Node && !entryDetailsRef.current?.contains(event.target)) cancelManagement();
  };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) cancelManagement(); };
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', escape);
  return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
}, [managingTimeEntries]);
useEffect(() => {
  setManagingTimeEntries(false);
  cancelInlineTimeEdit();
}, [selectedCalendarDate]);

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

const { role } = useUserProfile();
const normalizedRole = role ? String(role).trim().toLowerCase() : null;

const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [currentUserName, setCurrentUserName] = useState<string | null>(null);

const canManageProjects =
  normalizedRole === 'admin' || normalizedRole === 'management';
const canSubmitService =
  normalizedRole === 'admin' ||
  normalizedRole === 'management' ||
  normalizedRole === 'field';
const canAddProjectNotes =
  normalizedRole === 'admin' ||
  normalizedRole === 'management' ||
  normalizedRole === 'field';
const canManageHistory =
  normalizedRole === 'admin' || normalizedRole === 'management';


  
function canManageEntry(entry: TimeEntry) {
  if (canManageHistory) return true;
  return normalizedRole === 'field' && entry.created_by === currentUserId;
}

function canManageNote(note: ProjectNote) {
  if (canManageHistory) return true;
  return normalizedRole === 'field' && note.created_by === currentUserId;
}

function isSmokePackage(serviceType: string) {
  if (serviceType !== 'Smoke') return false;

  return billingMethodForService(serviceType) !== 'Per Hour';
}

const standardBillingMethods = {
  main: 'Per Foot',
  lateral: 'Per Lateral',
  jet: 'Per Foot',
  pushRod: 'Per Hour',
  dye: 'Per Hour',
  smoke: 'Per Mainline Segment + Per Connection',
  laborer: 'Per Hour',
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
    code: 'PUSH',
    label: 'Push Rod',
    field: 'pushRodPricingType',
    choices: ['Per Hour'],
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
    choices: ['Per Hour', 'Per Mainline Segments + Connections'],
  },
  {
    code: 'LABOR',
    label: 'Laborer',
    field: 'laborerPricingType',
    choices: ['Per Hour'],
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
      pushRod: project.push_rod_pricing_type || standardBillingMethods.pushRod,
      dye: project.dye_pricing_type || standardBillingMethods.dye,
      smoke: project.smoke_pricing_type || standardBillingMethods.smoke,
      laborer:
        project.laborer_pricing_type ||
        standardBillingMethods.laborer,
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
    pushRod: project.customers?.push_rod_pricing_type || standardBillingMethods.pushRod,
    dye: project.customers?.dye_pricing_type || standardBillingMethods.dye,
    smoke: project.customers?.smoke_pricing_type || standardBillingMethods.smoke,
    laborer:
      project.customers?.laborer_pricing_type ||
      standardBillingMethods.laborer,
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
  if (serviceType === 'Push Rod') return billingMethods.pushRod;
  if (serviceType === 'Dye') return billingMethods.dye;
  if (serviceType === 'Smoke') {
    return billingMethods.smoke === 'Per Hour'
      ? 'Per Hour'
      : 'Per Mainline Segment + Per Connection';
  }
  if (serviceType === 'Laborer') return billingMethods.laborer;
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

  if (entry.mainline_tests !== null && entry.mainline_tests !== undefined) {
    details.push({ label: 'Mainline Segments', value: entry.mainline_tests });
  }

  if (
    entry.residences !== null &&
    entry.residences !== undefined
  ) {
    details.push({
      label: 'Service Connections',
      value: entry.residences,
    });
  }

  if (entry.flat_rate) {
    details.push({ label: 'Flat Rate', value: 'Yes' });
  }

  return details;
}



function quantityLabelForEntry(entry: TimeEntry) {
  if (entry.hours !== null && entry.hours !== undefined) {
    return `${entry.hours} hrs`;
  }

  if (entry.feet !== null && entry.feet !== undefined) {
    return `${entry.feet} ft`;
  }

  if (entry.laterals !== null && entry.laterals !== undefined) {
    return `${entry.laterals} laterals`;
  }

  if (entry.mainline_tests !== null && entry.mainline_tests !== undefined) {
    if (
      entry.residences !== null &&
      entry.residences !== undefined
    ) {
      return `${entry.mainline_tests} segments • ${entry.residences} connections`;
    }
  
    return `${entry.mainline_tests} segments`;
  }
  
  if (
    entry.residences !== null &&
    entry.residences !== undefined
  ) {
    return `${entry.residences} connections`;
  }

  if (entry.flat_rate) {
    return 'Flat rate';
  }

  return 'No quantity';
}



const serviceTypeOptions = [
  'Mainline',
  'Lateral',
  'Jetter',
  'Push Rod',
  'Dye',
  'Smoke',
  'Laborer',
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
  if (billingMethod === 'Per Mainline Segments') return 'Mainline Segments';

  return '';
}

function quantityPlaceholderForService(serviceType: string) {
  const billingMethod = billingMethodForService(serviceType);

  if (billingMethod === 'Per Hour') return 'Enter hours';
  if (billingMethod === 'Per Foot') return 'Enter feet';
  if (billingMethod === 'Per Lateral') return 'Enter laterals';
  if (billingMethod === 'Per Mainline Segments') return 'Enter Segments';

  return '';
}

function formatBillingSource(value: string | null) {
  if (value === 'project') return 'Project Override';
  if (value === 'standard') return 'Standard';
  return 'Customer';
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
  setServiceConnections({});
  setServiceNotes({});

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
      serviceNeedsQuantity(serviceType) &&
      !isSmokePackage(serviceType) &&
      !serviceQuantities[serviceType]
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
      serviceConnections: serviceConnections[serviceType] ?? '',
      serviceVehicle: timeForm.serviceVehicle,
      note: serviceNotes[serviceType] ?? '',
    };
  });

  setPendingServiceItems([...pendingServiceItems, ...newItems]);
  setSelectedServiceTypes([]);
  setServiceQuantities({});
  setServiceConnections({});
  setServiceNotes({});

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
  if (item.billingMethod === 'Per Mainline Segment') return `${item.quantity} Segments`;
  if (item.billingMethod === 'Per Mainline Segment + Per Connection') {
    const parts = [];
  
    if (item.quantity) parts.push(`${item.quantity} Segments`);
    if (item.serviceConnections) {
      parts.push(`${item.serviceConnections} connections`);
    }
  
    return parts.length > 0 ? parts.join(' / ') : 'No quantity';
  }
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
  project_type,
  status,
  progress,
  service_start_date,
  project_location,
  pricing_type,
billing_method_source,
main_pricing_type,
lateral_pricing_type,
jet_pricing_type,
push_rod_pricing_type,
dye_pricing_type,
smoke_pricing_type,
laborer_pricing_type,
traffic_control_pricing_type,
billing_methods_updated_at,
assigned_to,
notes,
customers (
  id,
  name,
  customer_type,
  address,
  phone,
  email,
  main_pricing_type,
  lateral_pricing_type,
  jet_pricing_type,
  push_rod_pricing_type,
  dye_pricing_type,
  smoke_pricing_type,
  laborer_pricing_type,
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
    project_type: data.project_type ?? null,
    status: data.status,
    progress: data.progress,
    service_start_date: data.service_start_date,
    project_location: data.project_location,
    pricing_type: data.pricing_type,
    billing_method_source: data.billing_method_source ?? 'customer',
main_pricing_type: data.main_pricing_type,
lateral_pricing_type: data.lateral_pricing_type,
jet_pricing_type: data.jet_pricing_type,
push_rod_pricing_type: data.push_rod_pricing_type,
dye_pricing_type: data.dye_pricing_type,
smoke_pricing_type: data.smoke_pricing_type,
laborer_pricing_type: data.laborer_pricing_type,
traffic_control_pricing_type: data.traffic_control_pricing_type,
billing_methods_updated_at: data.billing_methods_updated_at,

    assigned_to: data.assigned_to,
    notes: data.notes,
    customers: customer ?? null,
    employees: employee ?? null,
  });
  
  loadTimeEntries(data.id);
  loadProjectNotes(data.id);
  loadProjectAttachments(data.id);

  setLoading(false);
  
    }

    loadProject();
    loadEmployees();

  }, [params.id]);

  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      setCurrentUserId(user?.id ?? null);
  
      if (!user) return;
  
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
  
      setCurrentUserName(profile?.full_name ?? null);
    }
  
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!project?.id || calendarInitializedFor.current === project.id) return;
    calendarInitializedFor.current = project.id;
    const today = new Date();
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  }, [project?.id]);
  

  if (loading) {
    return <DetailPageLoading />;
  }

  if (!project) {
    return <div className="text-black">Project not found.</div>;
  }

  
  

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

  const firstActiveServiceDate =
  timeEntries.length > 0
    ? [...timeEntries].map((entry) => entry.work_date).sort()[0]
    : null;

const displayedServiceStartDate = firstActiveServiceDate
  ? formatDate(firstActiveServiceDate)
  : project.service_start_date
  ? formatDate(project.service_start_date)
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
          mainlineTests: number;
serviceConnections: number;
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
          mainlineTests: 0,
serviceConnections: 0,
flatRates: 0,
        };
      }
  
      if (billingMethod === 'Per Hour') summary[serviceType].hours += entry.hours ?? 0;
      if (billingMethod === 'Per Foot') summary[serviceType].feet += entry.feet ?? 0;
      if (billingMethod === 'Per Lateral') summary[serviceType].laterals += entry.laterals ?? 0;
      if (billingMethod === 'Per Mainline Segment') summary[serviceType].mainlineTests += entry.mainline_tests ?? 0;
      if (billingMethod === 'Flat Rate' || entry.flat_rate) summary[serviceType].flatRates += 1;
  
      return summary;
    }, {});
  
    const services = Object.entries(serviceTotals).flatMap(([serviceType, totals]) => {
      const isSmoke = serviceType.toLowerCase().includes('smoke');
    
      if (isSmoke) {
        const smokeServices = [];
    
        if (totals.hours > 0) {
          smokeServices.push({
            serviceType: 'Smoke',
            summary: `${totals.hours} hrs`,
          });
        }
        
        if (totals.mainlineTests > 0) {
          smokeServices.push({
            serviceType: 'Smoke',
            summary: `${totals.mainlineTests} segments`,
          });
        }
        
        if (totals.serviceConnections > 0) {
          smokeServices.push({
            serviceType: 'Smoke',
            summary: `${totals.serviceConnections} connections`,
          });
        }
    
        return smokeServices.length > 0
          ? smokeServices
          : [{ serviceType: 'Smoke', summary: 'No quantity' }];
      }
    
      const quantities = [];
    
      if (totals.hours > 0) quantities.push(`${totals.hours} hrs`);
      if (totals.feet > 0) quantities.push(`${formatFeet(totals.feet)} ft`);
      if (totals.laterals > 0) quantities.push(`${totals.laterals} laterals`);
      if (totals.flatRates > 0) quantities.push(`${totals.flatRates} flat rate`);
    
      return {
        serviceType,
        summary: quantities.join(' • ') || 'No quantity',
      };
    });
  
    return {
      vehicles: vehicles.length > 0 ? vehicles.join(', ') : 'No vehicle listed',
      services,
    };
  }
  
  function serviceNamesForEntries(entries: TimeEntry[]) {
    const names = Array.from(
      new Set(
        entries
          .map((entry) => entry.work_completed)
          .filter((service): service is string => Boolean(service))
      )
    );

    return names.length > 0 ? names.join(', ') : 'No services listed';
  }

  function projectServiceSummary(entries: TimeEntry[]) {
    const serviceDays = new Set(entries.map((entry) => entry.work_date));
  
    const serviceTotals = entries.reduce<
      Record<
        string,
        {
          hours: number;
          feet: number;
          laterals: number;
          mainlineTests: number;
          serviceConnections: number;
          flatRates: number;
        }
      >
    >((summary, entry) => {
      const serviceType = entry.work_completed || 'Unknown Service';
  
      if (!summary[serviceType]) {
        summary[serviceType] = {
          hours: 0,
          feet: 0,
          laterals: 0,
          mainlineTests: 0,
          serviceConnections: 0,
          flatRates: 0,
        };
      }
  
      summary[serviceType].hours += Number(entry.hours ?? 0);
      summary[serviceType].feet += Number(entry.feet ?? 0);
      summary[serviceType].laterals += Number(entry.laterals ?? 0);
      summary[serviceType].mainlineTests += Number(entry.mainline_tests ?? 0);
      summary[serviceType].serviceConnections += Number(
        entry.residences ?? 0
      );
  
      if (entry.flat_rate) {
        summary[serviceType].flatRates += 1;
      }
  
      return summary;
    }, {});
  
    const services = Object.entries(serviceTotals).flatMap(([serviceType, totals]) => {
      const isSmoke = serviceType.toLowerCase().includes('smoke');
    
      if (isSmoke) {
        const smokeQuantities = [];
      
        if (totals.hours > 0) {
          smokeQuantities.push(`${totals.hours} hrs`);
        }
      
        if (totals.mainlineTests > 0) {
          smokeQuantities.push(`${totals.mainlineTests} segments`);
        }
      
        if (totals.serviceConnections > 0) {
          smokeQuantities.push(`${totals.serviceConnections} connections`);
        }
      
        return [
          {
            serviceType: 'Smoke',
            summary: smokeQuantities.length > 0
              ? smokeQuantities.join('\n')
              : 'No quantity',
          },
        ];
      }
    
      const quantities = [];
    
      if (totals.hours > 0) quantities.push(`${totals.hours} hrs`);
      if (totals.feet > 0) quantities.push(`${formatFeet(totals.feet)} ft`);
      if (totals.laterals > 0) quantities.push(`${totals.laterals} laterals`);
      if (totals.flatRates > 0) quantities.push(`${totals.flatRates} flat rate`);
    
      return {
        serviceType,
        summary: quantities.join(' • ') || 'No quantity',
      };
    });
  
    return {
      dayCount: serviceDays.size,
      entryCount: entries.length,
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
  
  const serviceSummary = projectServiceSummary(timeEntries);
  const submissionDates = Array.from(new Set([
    ...timeEntries.map((entry) => entry.work_date),
    ...dayUpdates.map((entry) => entry.work_date),
    ...nonbillableEntries.map((entry) => entry.work_date),
  ])).sort().reverse();
  const groupedSubmissionHistory = submissionDates.map((date) => ({
    workDate: date,
    entries: timeEntries.filter((entry) => entry.work_date === date),
    dayEntries: dayUpdates.filter((entry) => entry.work_date === date),
    nonbillable: nonbillableEntries.filter((entry) => entry.work_date === date),
  }));

  
  function dateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  }
  
  function changeCalendarMonth(direction: number) {
    calendarInitializedFor.current = project?.id ?? null;
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + direction, 1)
    );
    setSelectedCalendarDate(null);
  }
  
  const calendarMonthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  
  const serviceCountByDate = timeEntries.reduce<Record<string, number>>(
    (counts, entry) => {
      counts[entry.work_date] = (counts[entry.work_date] ?? 0) + 1;
      return counts;
    },
    {}
  );

  const serviceHasZeroQuantityByDate = timeEntries.reduce<Record<string, boolean>>(
    (dates, entry) => {
      const hasZeroQuantity =
        entry.hours === 0 ||
        entry.feet === 0 ||
        entry.laterals === 0 ||
        entry.residences === 0 ||
        entry.mainline_tests === 0;
  
      if (hasZeroQuantity) {
        dates[entry.work_date] = true;
      }
  
      return dates;
    },
    {}
  );
  
  const interruptedDates = new Set(dayUpdates.map((entry) => entry.work_date));
  const selectedDayUpdates = dayUpdates.filter((entry) => entry.work_date === selectedCalendarDate);

  const selectedCalendarEntries = selectedCalendarDate
    ? timeEntries.filter((entry) => entry.work_date === selectedCalendarDate)
    : [];
  
  const calendarFirstDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  );
  
  const calendarDaysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  
  const calendarBlankDays = Array.from({ length: calendarFirstDay.getDay() });
  
  const calendarDays = Array.from({ length: calendarDaysInMonth }, (_, index) => {
    const day = index + 1;
    const dayDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );
    const key = dateKey(dayDate);
  
    return {
      day,
      key,
      serviceCount: serviceCountByDate[key] ?? 0,
      hasZeroQuantity: serviceHasZeroQuantityByDate[key] ?? false,
      isToday: key === today,
    };
  });

  async function loadTimeEntries(projectId: string) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        id,
        work_date,
        work_completed,
        service_vehicle,
        hours,
        feet,
        laterals,
        mainline_tests,
        residences,
                flat_rate,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('work_date', { ascending: false });
  
    if (error) {
      console.error('Error loading time entries:', error);
      alert(`Could not load service history: ${error.message}`);
      return;
    }
  
    const userIds = Array.from(
      new Set(
        (data ?? [])
          .flatMap((entry) => [entry.created_by, entry.updated_by])
          .filter((id): id is string => Boolean(id))
      )
    );
  
    let profileById: Record<string, { full_name: string }> = {};
  
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);
  
      if (profileError) {
        console.error('Error loading entry user profiles:', profileError);
      } else {
        profileById = Object.fromEntries(
          (profiles ?? []).map((profile) => [
            profile.id,
            { full_name: profile.full_name },
          ])
        );
      }
    }
  
    const formattedEntries: TimeEntry[] = (data ?? []).map((entry) => ({
      ...entry,
      created_profile: entry.created_by
        ? profileById[entry.created_by] ?? null
        : null,
      updated_profile: entry.updated_by
        ? profileById[entry.updated_by] ?? null
        : null,
    }));
  
    setTimeEntries(formattedEntries);
  }
  


async function updateProjectStatus(status: string) {
  if (!canManageProjects) return;
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
    .select(`
      id,
      note,
      created_at,
      updated_at,
      created_by,
      updated_by
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading project notes:', error);
    alert(`Could not load project notes: ${error.message}`);
    return;
  }

  const userIds = Array.from(
    new Set(
      (data ?? [])
        .flatMap((note) => [note.created_by, note.updated_by])
        .filter((id): id is string => Boolean(id))
    )
  );

  let profileById: Record<string, { full_name: string }> = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profileError) {
      console.error('Error loading note user profiles:', profileError);
    } else {
      profileById = Object.fromEntries(
        (profiles ?? []).map((profile) => [
          profile.id,
          { full_name: profile.full_name },
        ])
      );
    }
  }

  const formattedNotes: ProjectNote[] = (data ?? []).map((note) => ({
    ...note,
    created_profile: note.created_by
      ? profileById[note.created_by] ?? null
      : null,
    updated_profile: note.updated_by
      ? profileById[note.updated_by] ?? null
      : null,
  }));

  setProjectNotes(formattedNotes);
}


async function saveProjectNote() {
  if (!canAddProjectNotes) {
    alert('You do not have permission to add project notes.');
    return;
  }

  if (!project || !newProjectNote.trim()) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert('You must be signed in to add a project note.');
    return;
  }

  const { error } = await supabase.from('project_notes').insert({
    project_id: project.id,
    note: `Project note: ${newProjectNote.trim()}`,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    console.error('Error saving project note:', error);
    alert(error.message);
    return;
  }

  setNewProjectNote('');
  await loadProjectNotes(project.id);
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

async function syncProjectServiceStartDate(projectId: string) {
  if (!project) return;

  const { data, error } = await supabase
    .from('time_entries')
    .select('work_date')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('work_date', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Error syncing service start date:', error);
    return;
  }

  const nextServiceStartDate =
    data?.[0]?.work_date ?? project.service_start_date;

  const { error: updateError } = await supabase
    .from('projects')
    .update({
      service_start_date: nextServiceStartDate,
    })
    .eq('id', projectId);

  if (updateError) {
    console.error('Error updating project service start date:', updateError);
    return;
  }

  setProject((currentProject) =>
    currentProject
      ? {
          ...currentProject,
          service_start_date: nextServiceStartDate,
        }
      : currentProject
  );
}


async function submitTimeEntry() {
  if (!canSubmitService) return;

  if (!project || !timeForm.workDate) {
    return;
  }

  if (pendingServiceItems.length === 0) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

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
  item.billingMethod === 'Per Residence'
    ? Number(item.quantity)
    : item.billingMethod === 'Per Mainline Segment + Per Connection' &&
      item.serviceConnections
    ? Number(item.serviceConnections)
    : null,
mainline_tests:
  item.billingMethod === 'Per Mainline Segment'
    ? Number(item.quantity)
    : item.billingMethod === 'Per Mainline Segment + Per Connection' &&
      item.quantity
    ? Number(item.quantity)
    : null,
flat_rate: item.billingMethod === 'Flat Rate',
    notes: item.note,
    created_by: user.id,
    updated_by: user.id,
  }));


  const { error } = await supabase
  .from('time_entries')
  .insert(timeEntryValues);
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
  setServiceNotes({});

  setPendingServiceItems([]);
  setEditingTimeEntryId(null);
  
  await loadTimeEntries(project.id);
  await loadProjectNotes(project.id);
  
  
  setExpandedServiceDates((dates) =>
    dates.includes(timeForm.workDate) ? dates : [timeForm.workDate, ...dates]
  );
  setSelectedCalendarDate(timeForm.workDate);
  const [submittedYear, submittedMonth] = timeForm.workDate.split('-').map(Number);
  setCalendarMonth(new Date(submittedYear, submittedMonth - 1, 1));
  setShowServiceSubmission(false);
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
    hours:
      entry.hours !== null && entry.hours !== undefined
        ? String(entry.hours)
        : entry.residences !== null && entry.residences !== undefined
        ? String(entry.residences)
        : entry.mainline_tests !== null && entry.mainline_tests !== undefined
        ? String(entry.mainline_tests)
        : '',
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
  if (!project || !inlineTimeForm.workDate || !inlineTimeForm.workCompleted) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const inlineBillingMethod = billingMethodForService(inlineTimeForm.workCompleted);
  const inlineShowsHours = inlineBillingMethod === 'Per Hour';
const inlineShowsFeet = inlineBillingMethod === 'Per Foot';
const inlineShowsLaterals = inlineBillingMethod === 'Per Lateral';
const inlineShowsResidences = inlineBillingMethod === 'Per Residence';
const inlineShowsMainlineTests = inlineBillingMethod === 'Per Mainline Segment';
const inlineShowsFlatRate = inlineBillingMethod === 'Flat Rate';

  const { error } = await supabase
    .from('time_entries')
    .update({
      work_date: inlineTimeForm.workDate,
      work_completed: inlineTimeForm.workCompleted,
      service_vehicle: inlineTimeForm.serviceVehicle,
      hours: inlineShowsHours ? Number(inlineTimeForm.hours) : null,
feet: inlineShowsFeet ? Number(inlineTimeForm.feet) : null,
laterals: inlineShowsLaterals ? Number(inlineTimeForm.laterals) : null,
residences: inlineShowsResidences ? Number(inlineTimeForm.hours) : null,
mainline_tests: inlineShowsMainlineTests ? Number(inlineTimeForm.hours) : null,
flat_rate: inlineShowsFlatRate,
notes: inlineTimeForm.notes,
updated_by: user.id,
    })
    .eq('id', entryId);

  if (error) {
    alert(error.message);
    return;
  }

  cancelInlineTimeEdit();
await loadTimeEntries(project.id);
await syncProjectServiceStartDate(project.id);

}

async function deleteTimeEntry(entryId: string) {
  if (!canManageHistory) return;
  if (!project) return;

  const confirmed = window.confirm('Are you sure you want to delete this time entry?');
  if (!confirmed) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from('time_entries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: 'Deleted from project workspace',
      updated_by: user.id,
    })
    .eq('id', entryId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadTimeEntries(project.id);
  await syncProjectServiceStartDate(project.id);
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
  const createdBy =
  entry.created_profile?.full_name ||
  (entry.created_by === currentUserId ? currentUserName : null) ||
  'Unknown';

const updatedBy =
  entry.updated_profile?.full_name ||
  (entry.updated_by === currentUserId ? currentUserName : null) ||
  createdBy;



  if (entry.updated_at) {
    const createdAt = new Date(entry.created_at).getTime();
    const updatedAt = new Date(entry.updated_at).getTime();

    if (updatedAt - createdAt > 5000) {
      return `Updated by ${updatedBy} at ${formatTimestamp(entry.updated_at)}`;
    }
  }

  return `Submitted by ${createdBy} at ${formatTimestamp(entry.created_at)}`;
}

function noteSubmittedUpdatedLabel(note: ProjectNote) {
  const createdBy = note.created_profile?.full_name || 'Unknown';
  const updatedBy = note.updated_profile?.full_name || createdBy;

  if (note.updated_at) {
    const createdAt = new Date(note.created_at).getTime();
    const updatedAt = new Date(note.updated_at).getTime();

    if (updatedAt - createdAt > 5000) {
      return `Updated by ${updatedBy} at ${formatTimestamp(note.updated_at)}`;
    }
  }

  return `Submitted by ${createdBy} at ${formatTimestamp(note.created_at)}`;
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
  if (!canManageProjects) return;
  if (!project) return;

  setProjectEditForm({
    projectType: projectCustomerService(project) === 'Telecom' ? 'Telecom' : projectCustomerService(project) === 'Sewer' && ['Residential', 'Commercial'].includes(project.project_type ?? '') ? project.project_type! : '',
    projectNumber: project.project_number,
    projectLocation: project.project_location ?? '',
    serviceStartDate: project.service_start_date ?? '',
    pricingType: project.pricing_type ?? '',
    assignedToId: project.assigned_to ?? '',
    billingMethodSource: project.billing_method_source ?? 'customer',
mainPricingType: project.main_pricing_type ?? billingMethods.main,
lateralPricingType: project.lateral_pricing_type ?? billingMethods.lateral,
jetPricingType: project.jet_pricing_type ?? billingMethods.jet,
pushRodPricingType: project.push_rod_pricing_type ?? billingMethods.pushRod,
dyePricingType: project.dye_pricing_type ?? billingMethods.dye,
smokePricingType: project.smoke_pricing_type ?? billingMethods.smoke,
laborerPricingType:
  project.laborer_pricing_type ?? billingMethods.laborer,
trafficControlPricingType:
  project.traffic_control_pricing_type ?? billingMethods.trafficControl,

  });

  setEditingProject(true);
}

async function loadProjectAttachments(projectId: string) {
  const { data, error } = await supabase
    .from('project_attachments')
    .select('id, file_name, file_path, file_type, uploaded_at, uploaded_by, uploaded_by_username')
    .eq('project_id', projectId)
.is('deleted_at', null)
.order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error loading project attachments:', error);
    return;
  }

  const attachmentsWithUrls = await Promise.all(
    (data ?? []).map(async (attachment) => {
      const { data: signedUrlData } = await supabase.storage
        .from('project-attachments')
        .createSignedUrl(attachment.file_path, 60 * 60);

      return {
        ...attachment,
        signedUrl: signedUrlData?.signedUrl,
      };
    })
  );

  setProjectAttachments(attachmentsWithUrls);
}

async function uploadProjectAttachments(
  event: ChangeEvent<HTMLInputElement>
) {
  if (!project || !event.target.files?.length) return;

  setUploadingAttachment(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be signed in to upload attachments.');
      return;
    }

    const { data: profile } = await supabase
  .from('user_profiles')
  .select('username')
  .eq('id', user.id)
  .single();

    const files = Array.from(event.target.files);

    for (const file of files) {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const filePath = `${project.id}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(filePath, file);

      if (uploadError) {
        alert(`Upload failed: ${uploadError.message}`);
        continue;
      }

      const { error: insertError } = await supabase
        .from('project_attachments')
        .insert({
          project_id: project.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          uploaded_by: user.id,
          uploaded_by_username: profile?.username ?? null,
        });

      if (insertError) {
        alert(`Attachment record failed: ${insertError.message}`);
      }
    }

    await loadProjectAttachments(project.id);
  } finally {
    event.target.value = '';
    setUploadingAttachment(false);
  }
}

async function deleteProjectAttachment(attachment: ProjectAttachment) {
  if (!project) return;

  const confirmed = window.confirm('Delete this attachment?');
  if (!confirmed) return;

  const { error: storageError } = await supabase.storage
    .from('project-attachments')
    .remove([attachment.file_path]);

  if (storageError) {
    console.error('Storage delete failed:', storageError);
    alert(`File delete failed: ${storageError.message}`);
    return;
  }

  const { error: recordError } = await supabase
    .from('project_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attachment.id);

  if (recordError) {
    console.error('Attachment record delete failed:', recordError);
    alert(`Attachment record delete failed: ${recordError.message}`);
    return;
  }

  setProjectAttachments((attachments) =>
    attachments.filter((item) => item.id !== attachment.id)
  );

  await loadProjectAttachments(project.id);
}


async function saveProjectEdit() {
  if (!canManageProjects || projectSavingRef.current) return;
  setProjectSaveError('');
  if (!project || !projectEditForm.projectNumber.trim()) {
    return;
  }

  const customerService = projectCustomerService(project);
  const projectTypeToSave = customerService === 'Telecom' ? 'Telecom'
    : customerService === 'Sewer' ? projectEditForm.projectType : project.project_type;
  if (customerService === 'Sewer' && !['Residential', 'Commercial'].includes(projectTypeToSave ?? '')) {
    setProjectSaveError('Choose Residential or Commercial for this sewer project.');
    return;
  }

  const assignedEmployee =
    employees.find((employee) => employee.id === projectEditForm.assignedToId) ??
    null;

  projectSavingRef.current = true;
  setProjectSaving(true);
  try {
  const { data: savedProject, error } = await supabase
    .from('projects')
    .update({
      project_number: projectEditForm.projectNumber,
      project_type: projectTypeToSave || null,
      project_location: projectEditForm.projectLocation,
      ...(timeEntries.length === 0 && {
        service_start_date: projectEditForm.serviceStartDate,
      }),
      assigned_to: projectEditForm.assignedToId || null,
    })
    
    .eq('id', project.id).select('id').maybeSingle();

  if (error) {
    throw error;
  }

  if (!savedProject) throw new Error('The project was not updated. Reload the page and check your access before retrying.');

  setProject({
    ...project,
    project_number: projectEditForm.projectNumber,
    project_type: projectTypeToSave || null,
    project_location: projectEditForm.projectLocation,
    service_start_date:
  timeEntries.length === 0
    ? projectEditForm.serviceStartDate
    : project.service_start_date,
    assigned_to: projectEditForm.assignedToId || null,
    employees: assignedEmployee ? { name: assignedEmployee.name } : null,
  });

  setEditingProject(false);
  } catch (error) {
    setProjectSaveError((error as { message?: string }).message || 'Could not save project. Please retry.');
  } finally {
    projectSavingRef.current = false;
    setProjectSaving(false);
  }
}


  return (
    <div className="space-y-6 text-black">

<ProjectDetailSections onSectionChange={() => { setManagingTimeEntries(false); cancelInlineTimeEdit(); }} sections={[
  <div key="summary" className="min-w-0 space-y-4">
<div className="rounded-2xl bg-white p-4 shadow sm:p-6">
  {editingProject && (
    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
      Editing project details
    </div>
  )}

{editingProject && <div className="mb-4">
  {projectCustomerService(project) === 'Telecom' ? <div className="rounded-lg border border-[#b8def0] bg-[#e8f7ff] p-3">
    <p className="text-sm font-medium">Project type</p>
    <div className="mt-2 flex items-center gap-2 text-[#16324f]"><CustomerTypeBadge value="Telecom" /><span>Telecom</span></div>
    <p className="mt-1 text-xs text-gray-600">Determined by the customer&apos;s service type.</p>
  </div> : projectCustomerService(project) === 'Sewer' ? <ProjectTypePicker value={projectEditForm.projectType} onChange={(value) => setProjectEditForm({ ...projectEditForm, projectType: value })} disabled={projectSaving} />
    : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Set the customer&apos;s service type to Sewer or Telecom to classify this project.</p>}
</div>}
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
      <div className="mt-1 flex min-w-0 items-center gap-2"><ProjectClassificationIcon project={project} /><p className="min-w-0 break-words text-2xl font-bold">{project.project_number}</p></div>
    )}
  </div>

  <div className="shrink-0 text-right">
  <div className="mb-1 h-4">
  {canManageProjects && !editingProject && project.status === 'Active' && (
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

{canManageProjects && !editingProject && project.status === 'Completed' && (
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


  

 
<div className="mt-4 border-t pt-4">

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
  <a
    href={`https://maps.apple.com/?q=${encodeURIComponent(
      project.project_location
    )}`}
    target="_blank"
    rel="noreferrer"
    className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
  >
    Maps
  </a>
)}
      </div>
    )}
</div>
<div className="mt-2 grid gap-3 text-sm">
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
    {displayedServiceStartDate || 'No date saved'}
{firstActiveServiceDate ? '' : ' (Est.)'}
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

  {!editingProject && canManageProjects && (
  <button
    type="button"
    onClick={startProjectEdit}
    className="mt-2 text-center text-sm font-medium text-gray-500 hover:text-black hover:underline"
    >
    Edit project details
  </button>
)}
</div>


</div>





<div className="pt-4">
<p className="text-xs font-medium uppercase text-gray-500">Customer Info</p>

  {project.customers?.id ? (
    <Link
      href={`/customers/${project.customers.id}`}
      className="mt-1 inline-flex max-w-full items-center gap-2 text-lg font-semibold hover:underline"
    >
      <CustomerTypeBadge value={project.customers.customer_type} />
      <span className="min-w-0 break-words">{project.customers.name}</span>
    </Link>
  ) : (
    <p className="mt-1 text-lg font-semibold">No customer saved</p>
  )}


  <p className="mt-1 text-sm text-gray-600">
    {formatPhone(project.customers?.phone)}
    {project.customers?.email ? ` • ${project.customers.email}` : ''}
  </p>

  <div className="mt-4 border-t pt-4">
  <div className="flex w-full items-center justify-between gap-3">
  <div>
    <p className="text-xs font-medium uppercase text-gray-500">
      {canManageProjects ? 'Billing & Rates' : 'Billing Methods'}
    </p>

    {project.billing_methods_updated_at && (
      <p className="mt-1 text-xs text-gray-500">
        Updated {formatTimestamp(project.billing_methods_updated_at)}
      </p>
    )}
  </div>

  <span className="inline-flex min-w-[96px] justify-center rounded-full border bg-gray-50 px-4 py-1 text-xs font-semibold text-gray-700">
    {formatBillingSource(project.billing_method_source)}
  </span>
</div>




{canManageProjects && <ProjectBillingManager project={project}
  effectiveMethods={{MAIN: billingMethods.main, LAT: billingMethods.lateral, JET: billingMethods.jet, PUSH: billingMethods.pushRod, DYE: billingMethods.dye, SMK: billingMethods.smoke, LABOR: billingMethods.laborer, TRFC: billingMethods.trafficControl}}
  onSaved={(patch) => { setProject((current) => current ? { ...current, ...patch } : current); setProjectPricingRevision((value) => value + 1); }} />}
<button type="button" aria-expanded={billingExpanded} aria-controls="project-billing-details"
  onClick={() => setBillingExpanded((value) => !value)}
  className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#007bb5] focus-visible:ring-2 focus-visible:ring-[#009be5]">
  {billingExpanded ? 'Hide details' : 'View details'} <span aria-hidden="true">{billingExpanded ? '▴' : '▾'}</span>
</button>
{(billingExpanded) && <div id="project-billing-details">
{canManageProjects ? <ProjectPricingPanel key={projectPricingRevision}
    projectId={project.id} projectName={project.project_number} customerId={project.customers?.id ?? null}
    source={project.billing_method_source ?? 'customer'} preview={false}
    methods={{MAIN: billingMethods.main, LAT: billingMethods.lateral, JET: billingMethods.jet, PUSH: billingMethods.pushRod, DYE: billingMethods.dye, SMK: billingMethods.smoke, LABOR: billingMethods.laborer, TRFC: billingMethods.trafficControl}}
  /> : (<div className="mt-3 grid grid-cols-2 items-start gap-x-3 gap-y-5">
    {[
      ['MAIN', billingMethods.main], ['LAT', billingMethods.lateral],
      ['JET', billingMethods.jet], ['PUSH', billingMethods.pushRod],
      ['DYE', billingMethods.dye], ['SMK', billingMethods.smoke],
      ['LABOR', billingMethods.laborer], ['TRFC', billingMethods.trafficControl],
    ].map(([code, method]) => <div key={code} className="flex min-w-0 flex-col gap-1 px-1 text-center text-sm">
      <span className="font-semibold">{code}</span><span className="min-w-0 break-words text-gray-600">{method}</span>
    </div>)}
  </div>)}
</div>}



</div>
</div>





{editingProject && (
  <div className="mt-5">
    {projectSaveError && <p role="alert" className="mb-3 text-sm text-red-700">{projectSaveError}</p>}
  <div className="flex gap-3">
    <button
      type="button"
      onClick={saveProjectEdit}
      disabled={projectSaving}
      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
    >
      {projectSaving ? 'Saving...' : 'Save Project'}
    </button>

    <button
      type="button"
      disabled={projectSaving} onClick={() => setEditingProject(false)}
      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
    >
      Cancel
    </button>
  </div>
  </div>
)}
</div>
  {dayUpdateNotice && <p role="status" className="text-sm text-green-700">{dayUpdateNotice}</p>}


          <div className="rounded-2xl bg-white p-6 shadow">
          

{timeEntries.length > 0 && (
  <div className="rounded-xl border bg-gray-50 p-4">
  <div className="grid grid-cols-2 gap-3 text-center">
  <div className="rounded-lg bg-white px-3 py-3">
    <p className="text-xs font-medium uppercase text-gray-500">
      Service Days
    </p>
    <p className="mt-1 text-lg font-bold">
      {serviceSummary.dayCount}
    </p>
  </div>

  <div className="rounded-lg bg-white px-3 py-3">
    <p className="text-xs font-medium uppercase text-gray-500">
      Submissions
    </p>
    <p className="mt-1 text-lg font-bold">
      {serviceSummary.entryCount}
    </p>
  </div>
</div>

{canManageProjects ? <ProjectRevenueSummary projectId={project.id}
  version={JSON.stringify([projectPricingRevision, project.billing_method_source, project.status, timeEntries.map((entry) => [entry.id, entry.work_date, entry.updated_at, entry.work_completed, entry.hours, entry.feet, entry.laterals, entry.mainline_tests, entry.residences, entry.flat_rate, entry.notes])])}
  services={serviceSummary.services}
/> : (<div className="mt-4 border-t pt-4">
  <div className="mb-3 flex items-center justify-between">
    <p className="text-sm font-bold text-gray-800">
      Service Totals
    </p>

    
  </div>

  <div className="space-y-2">
  {serviceSummary.services.map((service, index) => (
  <div
    key={`${service.serviceType}-${service.summary}-${index}`}
    className="rounded-lg border bg-white px-3 py-2"
  >
<div className="flex items-center justify-between gap-3 text-sm">          <span className="font-semibold text-gray-800">
            {service.serviceType}
          </span>

          <span className="whitespace-pre-line text-right font-medium text-gray-600">
  {service.summary}
</span>
        </div>
      </div>
    ))}
  </div>
</div>)}


  </div>
)}

</div>
  </div>,
  <div key="services" className="min-w-0 space-y-4">
    <p className="break-words text-center text-xs font-medium text-gray-500">Project {project.project_number}</p>
  <div className="rounded-2xl bg-white p-6 shadow">
  

<div className="grid grid-cols-2 items-center gap-x-3 gap-y-2 text-[11px] font-medium text-gray-600 sm:grid-cols-4">
  <div className="flex min-w-0 items-center justify-center gap-1">
    <span className="h-3.5 w-3.5 shrink-0 rounded bg-[#009be5]" />
    <span className="whitespace-nowrap">Serviced</span>
  </div>

  <div className="flex min-w-0 items-center justify-center gap-1">
    <span className="h-3.5 w-3.5 shrink-0 rounded bg-[repeating-linear-gradient(135deg,#f1faff_0,#f1faff_3px,#8fd8f7_3px,#8fd8f7_5px)]" />
    <span className="whitespace-nowrap">Holiday/Unable</span>
  </div>

  <div className="flex min-w-0 items-center justify-center gap-1">
    <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded bg-[repeating-linear-gradient(135deg,#edf2f7_0,#edf2f7_3px,#16324f_3px,#16324f_5px)]" />
    <span className="whitespace-nowrap">Non-billable</span>
  </div>

  <div className="flex min-w-0 items-center justify-center gap-1">
    <span className="h-3.5 w-3.5 shrink-0 rounded border bg-gray-50" />
    <span className="whitespace-nowrap">No Service</span>
  </div>
</div>

<div className="mt-4 flex items-center justify-center gap-3">
  <button
    type="button"
    onClick={() => changeCalendarMonth(-1)}
    aria-label="Previous month"
    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8def0] bg-[#e8f7ff] p-0 text-[#16324f] transition-colors hover:border-[#16324f] hover:bg-[#d9f0fc] active:bg-[#c5e8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]"
  >
    <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} className="block" />
  </button>

  <p aria-live="polite" className="min-w-[10rem] text-center text-sm font-bold text-gray-800">    {calendarMonthLabel}
  </p>

  <button
    type="button"
    onClick={() => changeCalendarMonth(1)}
    aria-label="Next month"
    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8def0] bg-[#e8f7ff] p-0 text-[#16324f] transition-colors hover:border-[#16324f] hover:bg-[#d9f0fc] active:bg-[#c5e8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]"
  >
    <ChevronRight aria-hidden="true" size={22} strokeWidth={2.5} className="block" />
  </button>
</div>

  {nonbillableLoading && <p role="status" className="mt-2 text-xs text-gray-500">Loading non-billable work…</p>}
  {nonbillableError && <div className="mt-2"><p role="alert" className="text-sm text-red-700">Non-billable work: {nonbillableError}</p><button type="button" className="min-h-11 rounded-lg border px-3 py-2 text-sm" onClick={()=>setNonbillableRevision(value=>value+1)}>Retry</button></div>}
  {dayUpdatesLoading && <p role="status" className="mt-2 text-xs text-gray-500">Loading Holiday/Unable updates…</p>}
  {dayUpdatesError && <div className="mt-2"><p role="alert" className="text-sm text-red-700">Holiday/Unable updates unavailable: {dayUpdatesError}</p><button type="button" onClick={() => setDayRevision((value) => value + 1)} className="mt-1 rounded-lg border px-3 py-2 text-sm">Retry</button></div>}

  <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-gray-500">
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
      <div key={day}>{day}</div>
    ))}
  </div>

  <div className="mt-2 grid grid-cols-7 gap-1">
    {calendarBlankDays.map((_, index) => (
      <div key={`blank-${index}`} className="aspect-square" />
    ))}

    {calendarDays.map((day) => {
      const hasService = day.serviceCount > 0;
      const hasZeroQuantity = day.hasZeroQuantity;
      const hasDayUpdate = interruptedDates.has(day.key);
      const hasNonbillable = nonbillableEntries.some(entry=>entry.work_date===day.key);
      const isSelected = selectedCalendarDate === day.key;

      return (
        <button
          key={day.key}
          type="button"
          onClick={() => { calendarInitializedFor.current = project.id; setSelectedCalendarDate(isSelected ? null : day.key); }}
          className={`relative flex aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
            (hasZeroQuantity || (hasDayUpdate && !hasService))
    ? 'bg-[repeating-linear-gradient(135deg,#f1faff_0,#f1faff_7px,#8fd8f7_7px,#8fd8f7_9px)] text-[#005f8f] shadow-sm'
    : hasService
    ? 'bg-[#009be5] text-white shadow-sm'
    : hasNonbillable ? 'bg-[repeating-linear-gradient(135deg,#edf2f7_0,#edf2f7_7px,#16324f_7px,#16324f_9px)] text-[#16324f] shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          } ${isSelected ? 'ring-2 ring-black ring-offset-2' : ''} ${
            day.isToday && !isSelected ? 'ring-2 ring-[#009be5] ring-offset-1' : ''
          }`}
        >
          {day.day}
          {hasNonbillable && (hasService || hasDayUpdate) && <span aria-label="Non-billable work also recorded" className="absolute bottom-1 right-1 h-3 w-3 rounded-sm border border-white bg-[repeating-linear-gradient(135deg,#edf2f7_0,#edf2f7_2px,#16324f_2px,#16324f_4px)]" />}
          {hasDayUpdate && hasService && <span aria-label="Holiday or unable-to-work update also recorded" className="absolute right-1 top-1 h-2.5 w-2.5 rounded border border-white bg-[repeating-linear-gradient(135deg,#f1faff_0,#f1faff_2px,#8fd8f7_2px,#8fd8f7_4px)]" />}

          {day.serviceCount > 0 && (
  <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
    {Array.from({ length: Math.min(day.serviceCount, 3) }).map((_, index) => (
      <span
        key={index}
        className={`h-1 w-1 rounded-full ${
          hasService ? 'bg-white' : 'bg-[#007bb8]'
        }`}
      />
    ))}

    {day.serviceCount > 3 && (
      <span
        className={`ml-0.5 text-[9px] leading-none ${
          hasService ? 'text-white' : 'text-[#007bb8]'
        }`}
      >
        +
      </span>
    )}
  </span>
)}
        </button>
      );
    })}
  </div>

  {!selectedCalendarDate && <p className="mt-4 text-center text-sm text-gray-500">Select a date to view or record service.</p>}
  {selectedCalendarDate && (
    <div ref={entryDetailsRef} className="mt-4 rounded-xl border bg-gray-50 p-3">
      <p className="text-sm font-bold text-gray-900">
        {formatDate(selectedCalendarDate)}
      </p>
      {canSubmitService && (
        <div className="mt-3">
          <ProjectSubmissionActions projectId={project.id} projectNumber={project.project_number}
      onNonbillable={(date) => setNonbillableModal({date,entry:null})}
            defaultDate={selectedCalendarDate} buttonLabel="Record Service"
            onRecordService={() => {
              setTimeForm((current) => ({ ...current, workDate: selectedCalendarDate }));
              setShowServiceSubmission(true);
            }}
            onDayRecorded={(date) => {
              setDayRevision((value) => value + 1);
              setSelectedCalendarDate(date);
              const [year, month] = date.split('-').map(Number);
              setCalendarMonth(new Date(year, month - 1, 1));
              setDayUpdateNotice('Project update saved.');
            }} />
        </div>
      )}

      {(selectedCalendarEntries.some(entry => canManageEntry(entry)) ||
        selectedDayUpdates.some(entry => canManageHistory || (normalizedRole === 'field' && entry.created_by === currentUserId)) ||
        nonbillableEntries.some(entry => entry.work_date === selectedCalendarDate && (canManageHistory || (normalizedRole === 'field' && entry.created_by === currentUserId)))) && (
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={() => { setManagingTimeEntries(!managingTimeEntries); setInlineEditingTimeEntryId(null); }}
          className="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50">
          {managingTimeEntries ? 'Done' : 'Manage Entries'}
        </button>
      </div>
      )}
      <div className="mt-3 space-y-2">
        {nonbillableEntries.filter(entry => entry.work_date === selectedCalendarDate).map(entry => <NonbillableCard key={entry.id} entry={entry}
          onEdit={managingTimeEntries && (canManageHistory || (normalizedRole === 'field' && entry.created_by === currentUserId)) ? () => setNonbillableModal({date:entry.work_date,entry}) : undefined} />)}
    {selectedDayUpdates.map((entry) => (
      <ProjectDayHistoryEntry key={`day-${entry.id}`} entry={entry} projectId={project.id}
        managing={managingTimeEntries}
        canEdit={canManageHistory || (normalizedRole === 'field' && entry.created_by === currentUserId)}
        canDelete={canManageHistory}
        onSaved={(date) => {
          setDayRevision((value) => value + 1);
          setExpandedServiceDates((dates) => dates.includes(date) ? dates : [...dates, date]);
          setSelectedCalendarDate(date);
          const [year, month] = date.split('-').map(Number);
          setCalendarMonth(new Date(year, month - 1, 1));
        }} />
    ))}
    {selectedCalendarEntries.map((entry) => {
  const isEditing = inlineEditingTimeEntryId === entry.id;

  return (
    <div key={entry.id} className="rounded-lg border bg-white p-3">
      {isEditing ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <div className="min-w-0">
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
    className="block w-full min-w-0 max-w-full appearance-none rounded-lg border p-3 text-sm"
  />
</div>


{billingMethodForService(inlineTimeForm.workCompleted) !== 'Flat Rate' && (
  <div className="min-w-0">
    <label className="mb-2 block text-sm font-medium">
      {quantityLabelForService(inlineTimeForm.workCompleted)}
    </label>

    <div className="flex min-w-0 overflow-hidden rounded-lg border bg-white">
      <input
        type="number"
        value={
          billingMethodForService(inlineTimeForm.workCompleted) === 'Per Hour'
            ? inlineTimeForm.hours
            : billingMethodForService(inlineTimeForm.workCompleted) === 'Per Foot'
            ? inlineTimeForm.feet
            : billingMethodForService(inlineTimeForm.workCompleted) === 'Per Lateral'
            ? inlineTimeForm.laterals
            : inlineTimeForm.hours
        }
        onChange={(e) => {
          const billingMethod = billingMethodForService(inlineTimeForm.workCompleted);

          if (billingMethod === 'Per Foot') {
            setInlineTimeForm({ ...inlineTimeForm, feet: e.target.value });
            return;
          }

          if (billingMethod === 'Per Lateral') {
            setInlineTimeForm({ ...inlineTimeForm, laterals: e.target.value });
            return;
          }

          setInlineTimeForm({ ...inlineTimeForm, hours: e.target.value });
        }}
        className="min-w-0 flex-1 border-0 p-3 text-sm outline-none"
      />

      <span className="flex items-center border-l bg-gray-50 px-3 text-sm font-medium text-gray-600">
        {billingMethodForService(inlineTimeForm.workCompleted) === 'Per Hour'
          ? 'hrs'
          : billingMethodForService(inlineTimeForm.workCompleted) === 'Per Foot'
          ? 'ft'
          : billingMethodForService(inlineTimeForm.workCompleted) === 'Per Lateral'
          ? 'laterals'
          : billingMethodForService(inlineTimeForm.workCompleted) === 'Per Mainline Segment'
          ? 'tests'
          : ''}
      </span>
    </div>
  </div>
)}


          <div>
            <label className="mb-2 block text-sm font-medium">
              Work Type
            </label>
            <select
              value={inlineTimeForm.workCompleted}
              onChange={(e) => {
                const nextWorkCompleted = e.target.value;
                const nextBillingMethod = billingMethodForService(nextWorkCompleted);
              
                setInlineTimeForm({
                  ...inlineTimeForm,
                  workCompleted: nextWorkCompleted,
                  hours:
                    nextBillingMethod === 'Per Hour' ||
                    nextBillingMethod === 'Per Residence' ||
                    nextBillingMethod === 'Per Mainline Segment'
                      ? inlineTimeForm.hours
                      : '',
                  feet: nextBillingMethod === 'Per Foot' ? inlineTimeForm.feet : '',
                  laterals: nextBillingMethod === 'Per Lateral' ? inlineTimeForm.laterals : '',
                });
              }}
              className="block w-full min-w-0 max-w-full rounded-lg border p-3 text-sm"
              >
              <option value="">Select work type</option>
              <option>Mainline</option>
              <option>Lateral</option>
              <option>Jetter</option>
              <option>Push Rod</option>
              <option>Dye</option>
              <option>Smoke</option>
              <option>Laborer</option>
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
              className="block w-full min-w-0 max-w-full rounded-lg border p-3 text-sm"
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

            {canManageHistory && (
  <button
    type="button"
    onClick={() => deleteTimeEntry(entry.id)}
    className="ml-auto rounded-lg border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
  >
    Delete
  </button>
)}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {entry.work_completed || 'No work type selected'}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {entry.service_vehicle || 'No vehicle selected'}
              </p>
            </div>

            <p className="shrink-0 text-right text-sm font-semibold text-gray-700">
              {quantityLabelForEntry(entry)}
            </p>
          </div>

          {entry.notes && (
            <p className="mt-3 rounded-lg bg-gray-50 p-2 text-sm text-gray-700">
              {entry.notes}
            </p>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Submitted by {entry.created_profile?.full_name || (entry.created_by === currentUserId ? currentUserName : null) || 'Unknown'} · {formatTimestamp(entry.created_at)}
          </p>
          {entry.updated_at && new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime() > 5000 && (
            <p className="mt-1 text-xs text-gray-500">{submittedUpdatedLabel(entry)}</p>
          )}

          {managingTimeEntries && canManageEntry(entry) && (
  <div className="mt-3 flex gap-2">
    <button
      type="button"
      onClick={() => startInlineTimeEdit(entry)}
      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
    >
      Edit
    </button>

    {canManageHistory && (
      <button
        type="button"
        onClick={() => deleteTimeEntry(entry.id)}
        className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    )}
  </div>
)}
        </>
      )}
    </div>
  );
})}
        {selectedCalendarEntries.length === 0 && selectedDayUpdates.length === 0 && !nonbillableEntries.some(entry => entry.work_date === selectedCalendarDate) && !nonbillableLoading && !dayUpdatesLoading && !nonbillableError && !dayUpdatesError && (
          <p className="rounded-lg bg-white p-3 text-sm text-gray-500">No entries recorded for this date.</p>
        )}
      </div>
    </div>
  )}
</div>

  </div>,
  <div key="history" className="min-w-0 space-y-4">
    <p className="break-words text-center text-xs font-medium text-gray-500">Project {project.project_number}</p>
<div className="rounded-2xl bg-white p-6 shadow">
  <button
    type="button"
    onClick={() => setShowNotes(!showNotes)}
    className="flex w-full items-center justify-between gap-4 text-left"
  >
    <div>
      <h2 className="text-xl font-bold">Notes</h2>
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
                {noteSubmittedUpdatedLabel(note)}
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



  </div>
    </>
  )}
</div>
        <div className="rounded-2xl bg-white p-6 shadow">


  <label className="relative flex min-h-[56px] cursor-pointer items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm font-medium text-gray-600 hover:bg-gray-50">
  {uploadingAttachment ? 'Uploading...' : 'Upload maps, plans, or photos'}

  <input
    type="file"
    multiple
    accept="image/*,application/pdf,.pdf"
    onChange={uploadProjectAttachments}
    disabled={uploadingAttachment}
    className="absolute inset-0 cursor-pointer opacity-0"
  />
</label>

  <div className="mt-4 space-y-2">
  {projectAttachments.map((attachment) => (
  <div key={attachment.id} className="rounded-lg border px-3 py-2 text-sm">
    <a
      href={attachment.signedUrl}
      target="_blank"
      rel="noreferrer"
      className="block font-medium hover:underline"
    >
      {attachment.file_name}
    </a>

    <p className="mt-1 text-xs text-gray-500">
    Uploaded by {attachment.uploaded_by_username || 'Unknown'} on{' '}
      {formatTimestamp(attachment.uploaded_at)}
    </p>

    {canManageProjects && (
      <button
        type="button"
        onClick={() => deleteProjectAttachment(attachment)}
        className="mt-2 rounded-lg border px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    )}
  </div>
))}

    {projectAttachments.length === 0 && (
      <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
        No maps, plans, or photos uploaded yet.
      </div>
    )}
  </div>
</div>

  </div>,
]} />
{nonbillableModal && <NonbillableModal projectId={project.id} projectName={project.project_number}
 date={nonbillableModal.date} entry={nonbillableModal.entry} onClose={()=>setNonbillableModal(null)}
 onSaved={(date)=>{
  setNonbillableModal(null);setNonbillableRevision(value=>value+1);setSelectedCalendarDate(date);
  setExpandedServiceDates(dates=>dates.includes(date)?dates:[...dates,date]);
  const [year,month]=date.split('-').map(Number);setCalendarMonth(new Date(year,month-1,1));
  setDayUpdateNotice('Non-billable work updated.');
 }}/>}
{canSubmitService && showServiceSubmission && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <button
      type="button"
      aria-label="Close service submission"
      onClick={() => setShowServiceSubmission(false)}
      className="absolute inset-0"
    />

    <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h2 className="text-xl font-bold">Record Service</h2>
          <p className="mt-1 text-sm text-gray-600">
            Add service date, vehicle, services, quantities, and notes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowServiceSubmission(false)}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      <div className="p-6">
  <div className="grid min-w-0 gap-4 md:grid-cols-2">
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium">Service Date</label>
      <input
        type="date"
        value={timeForm.workDate}
        onChange={(e) => setTimeForm({ ...timeForm, workDate: e.target.value })}
        className="block w-full min-w-0 max-w-full appearance-none rounded-lg border border-black p-3 text-sm"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium">Service Vehicle</label>
      <div className="grid grid-cols-2 gap-2">
      {['2007 Ford F-150', '2016 Ford Van'].map((vehicle) => {
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

                  const nextConnections = { ...serviceConnections };
                  delete nextConnections[serviceType];
                  setServiceConnections(nextConnections);
                
                  const nextNotes = { ...serviceNotes };
                  delete nextNotes[serviceType];
                  setServiceNotes(nextNotes);
                
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

          if (isSmokePackage(serviceType)) {
            return (
              <div key={serviceType} className="rounded-lg border p-3 md:col-span-2">
                <p className="text-sm font-medium">Smoke</p>
                <p className="mt-1 text-sm text-gray-500">
                  Per Mainline Segment + Connection
                </p>
          
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Mainline segments"
                    value={serviceQuantities[serviceType] ?? ''}
                    onChange={(e) =>
                      setServiceQuantities({
                        ...serviceQuantities,
                        [serviceType]: e.target.value,
                      })
                    }
                    className="block w-full rounded-lg border p-3"
                  />
          
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Service connections"
                    value={serviceConnections[serviceType] ?? ''}
                    onChange={(e) =>
                      setServiceConnections({
                        ...serviceConnections,
                        [serviceType]: e.target.value,
                      })
                    }
                    className="block w-full rounded-lg border p-3"
                  />
                </div>
          
                <textarea
                  placeholder="Add note for Smoke..."
                  value={serviceNotes[serviceType] ?? ''}
                  onChange={(e) =>
                    setServiceNotes({
                      ...serviceNotes,
                      [serviceType]: e.target.value,
                    })
                  }
                  className="mt-3 w-full rounded-lg border p-3 text-sm"
                  rows={3}
                />
              </div>
            );
          }

          if (billingMethod === 'Flat Rate') {
            return (
              <div key={serviceType} className="rounded-lg border p-3">
  <p className="text-sm font-medium">{serviceType}</p>
  <p className="mt-1 text-sm text-gray-500">Flat rate</p>

  <textarea
    placeholder={`Add note for ${serviceType}...`}
    value={serviceNotes[serviceType] ?? ''}
    onChange={(e) =>
      setServiceNotes({
        ...serviceNotes,
        [serviceType]: e.target.value,
      })
    }
    className="mt-3 w-full rounded-lg border p-3 text-sm"
    rows={3}
  />
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

<textarea
  placeholder={`Add note for ${serviceType}...`}
  value={serviceNotes[serviceType] ?? ''}
  onChange={(e) =>
    setServiceNotes({
      ...serviceNotes,
      [serviceType]: e.target.value,
    })
  }
  className="mt-3 w-full rounded-lg border p-3 text-sm"
  rows={3}
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
      <div className="rounded-xl border p-4 md:col-span-2">
        <p className="text-sm font-bold text-gray-700">Submission Review</p>

        <div className="mt-3 space-y-2">
          {pendingServiceItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{item.serviceType}</p>
                <p className="text-xs text-gray-500">{item.serviceVehicle}</p>
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


  </div>

  <div className="mt-4 grid gap-3">
    <button
      type="button"
      onClick={submitTimeEntry}
      className="w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
    >
      Submit All
    </button>

    <button
      type="button"
      onClick={clearServiceSubmissionForm}
      className="w-full rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
    >
      Clear
    </button>
  </div>
</div>

    </div>
  </div>
)}
    </div>
  );
}


function ProjectDetailSections({ sections, onSectionChange }: { sections: ReactNode[]; onSectionChange: () => void }) {
  const labels = ['Project Summary', 'Service Calendar', 'Notes & Files'];
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const panels = useRef<Array<HTMLElement | null>>([]);
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollPositions = useRef([0, 0, 0]);
  const touch = useRef<{ x: number; y: number; time: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const id = useId();
  const [tileHeight, setTileHeight] = useState<number | undefined>();
  const [settling, setSettling] = useState(false);
  useEffect(() => {
    if (!settling) return;
    const timer = window.setTimeout(() => setSettling(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [settling]);
  const pendingScroll = useRef<number | null>(null);
  const { swipeArea, swipeFloor } = useSwipeAreaFloor();
  const position = Math.max(0, Math.min(2, active + drag));
  useLayoutEffect(() => {
    const panel = panels.current[active];
    if (!panel) return;
    const measure = () => {
      setTileHeight(current => { const height = Math.ceil(panel.getBoundingClientRect().height); return settling ? Math.max(current ?? height, height) : height; });
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(panel);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [active, settling]);
  function select(next: number, keyboard = false) {
    setDrag(0);
    if (next < 0 || next >= labels.length || next === active) return;
    onSectionChange();
    scrollPositions.current[active] = window.scrollY;
    const focusInside = panels.current[active]?.contains(document.activeElement);
    pendingScroll.current = scrollPositions.current[next];
    setSettling(true);
    setActive(next);
    if (keyboard || focusInside) tabButtons.current[next]?.focus({ preventScroll: true });

  }
  useEffect(() => {
    if (settling || pendingScroll.current === null) return;
    const top = pendingScroll.current; pendingScroll.current = null;
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: 'auto' }));
    return () => cancelAnimationFrame(frame);
  }, [active, settling]);
  return <div ref={root} role="region" aria-roledescription="carousel" aria-label="Project sections" className="min-w-0" style={{ touchAction: 'pan-y pinch-zoom' }}
    onTouchStart={(event) => {
      touch.current = null; setDrag(0);
      if (settling || document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement;
      if (event.touches.length !== 1 || target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog')) { touch.current = null; return; }
      const point = event.touches[0];
      if (point.clientX < 24 || point.clientX > window.innerWidth - 24) return;
      touch.current = { x: point.clientX, y: point.clientY, time: Date.now() };
    }}
    onTouchMove={(event) => {
      if (!touch.current) return;
      if (event.touches.length !== 1) { touch.current = null; setDrag(0); return; }
      const dx = event.touches[0].clientX - touch.current.x;
      const dy = event.touches[0].clientY - touch.current.y;
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { touch.current = null; setDrag(0); return; }
      if (Math.abs(dx) > Math.abs(dy) * 1.5) {
        const progress = Math.max(-1, Math.min(1, -dx / (root.current?.clientWidth || 320)));
        setDrag(active + progress < 0 || active + progress > 2 ? 0 : progress);
      }
    }}
    onTouchEnd={(event) => {
      const start = touch.current; touch.current = null; setDrag(0);
      if (!start || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      const elapsed = Math.max(1, Date.now() - start.time);
      const distance = Math.abs(dx);
      const threshold = Math.max(56, Math.min(96, (root.current?.clientWidth || 320) * 0.2));
      const quickFlick = distance >= 24 && elapsed <= 250 && distance / elapsed >= 0.45;
      if ((distance >= threshold || quickFlick) && distance > Math.abs(dy) * 1.5) {
        suppressClickUntil.current = Date.now() + 600;
        select(active + (dx < 0 ? 1 : -1));
      }
    }}
    onTouchCancel={() => { touch.current = null; setDrag(0); }}
    onClickCapture={(event) => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
    <StickyCarouselHeader>
      <div className="relative h-11 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {labels.map((label, index) => <span key={label}
            className={`absolute inset-y-0 flex w-max items-center whitespace-nowrap text-sm font-semibold text-[#16324f] motion-reduce:transition-none ${drag ? '' : 'transition-[opacity,left] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
            style={{ left: `${50 + (index - position) * 50}%`, transform: 'translateX(-50%)', opacity: Math.max(0, 1 - Math.abs(index - position) * 0.72) }}>
            {label}
          </span>)}
        </div>
        <button type="button" disabled={active === 0} onClick={() => select(active - 1)}
          aria-label={`Show previous section: ${labels[Math.max(0, active - 1)]}`}
          className={`absolute left-0 top-0 h-11 w-14 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5] ${active === 0 ? 'invisible' : ''}`} />
        <button type="button" disabled={active === 2} onClick={() => select(active + 1)}
          aria-label={`Show next section: ${labels[Math.min(2, active + 1)]}`}
          className={`absolute right-0 top-0 h-11 w-14 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5] ${active === 2 ? 'invisible' : ''}`} />
      </div>
      <p className="sr-only" aria-live="polite">{labels[active]}</p>
      <div role="group" aria-label="Choose project section" className="-mt-1 flex items-center justify-center"
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          select(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : Math.max(0, Math.min(2, active + (event.key === 'ArrowRight' ? 1 : -1))), true);
        }}>
        {labels.map((label, index) => <button key={label} type="button" onClick={() => select(index)}
          ref={(node) => { tabButtons.current[index] = node; }} aria-label={`Show ${label}`}
          aria-controls={`${id}-panel-${index}`} aria-current={index === active ? 'true' : undefined}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5]">
          <span aria-hidden="true" className={`h-2.5 rounded-full ${index === active ? 'w-6 bg-[#009be5]' : 'w-2.5 bg-gray-300'}`} />
        </button>)}
      </div>
    </StickyCarouselHeader>
    <p className="sr-only">Swipe between project sections or use the position buttons. Use calendar arrows to change months.</p>
    <div className="overflow-hidden" ref={swipeArea} style={{ height: tileHeight, minHeight: swipeFloor, touchAction: 'pan-y pinch-zoom', overflowAnchor: 'none' }}>
      <div className={`flex items-start gap-2 motion-reduce:transition-none ${drag ? '' : 'motion-safe:transition-transform motion-safe:duration-[260ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
        style={{ willChange: 'transform', transform: `translate3d(calc(${-position * 100}% + ${position * 12}px), 0, 0)` }}>
        {sections.map((section, index) => <section key={labels[index]}
          ref={(node) => {
            panels.current[index] = node;
            if (node) { if (index === active) node.removeAttribute('inert'); else node.setAttribute('inert', ''); }
          }}
          role="group" aria-roledescription="slide" id={`${id}-panel-${index}`}
          aria-label={`${index + 1} of 3: ${labels[index]}`} aria-hidden={index !== active}
          className={`min-w-0 shrink-0 grow-0 ${index === sections.length - 1 ? 'basis-full' : 'basis-[calc(100%_-_20px)]'}`}>
          {section}
        </section>)}
      </div>
    </div>
  </div>;
}

function ProjectSubmissionActions({ projectId, projectNumber, onRecordService, onDayRecorded, onNonbillable, defaultDate, buttonLabel = '+ Record Service' }: {
  projectId: string;
  projectNumber: string;
  onRecordService: () => void;
  onDayRecorded: (date: string) => void;
  onNonbillable: (date: string) => void;
  defaultDate?: string;
  buttonLabel?: string;
}) {
  const modalTitleId = useId();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState<'Holiday' | 'Unable to Service'>('Unable to Service');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const busy = useRef(false);
  const request = useRef<{ id: string; signature: string } | null>(null);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  useEffect(() => {
    if (!dialog.current) return;
    if (!open) {
      if (dialog.current.open) dialog.current.close();
      return;
    }
    if (!dialog.current.open) dialog.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setError('');
    if (!date || note.trim().length > 2000) {
      setError('Choose a date and keep the note under 2,000 characters.');
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Please sign in to record this update.');
      const signature = JSON.stringify([projectId, user.id, date, reason, note.trim()]);
      if (request.current?.signature !== signature) request.current = { id: crypto.randomUUID(), signature };
      const id = request.current.id;
      const { error: saveError } = await supabase.from('project_day_updates').insert({
        id, project_id: projectId, work_date: date, reason, note: note.trim(), created_by: user.id,
      });
      if (saveError) {
        if (saveError.code !== '23505') throw saveError;
        const { data: saved, error: lookupError } = await supabase.from('project_day_updates')
          .select('id').eq('id', id).eq('created_by', user.id).eq('project_id', projectId).maybeSingle();
        if (lookupError || !saved) throw lookupError || saveError;
      }
      request.current = null;
      setNote('');
      setOpen(false);
      onDayRecorded(date);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message :
        (failure as { message?: string })?.message || 'Could not save the update. Please retry.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="relative flex w-full rounded-lg border border-[#009be5] bg-[#eaf7fe] text-[#007bb8] shadow-sm">
        <button type="button" onClick={() => { if (menu.current) menu.current.open = false; onRecordService(); }}
          className="min-h-12 min-w-0 flex-1 rounded-l-lg px-3 py-3 text-sm font-semibold hover:bg-[#d8f0fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#009be5]">
          {buttonLabel}
        </button>
        <details ref={menu} className="group" onKeyDown={(event) => {
          if (event.key === 'Escape' && menu.current) {
            menu.current.open = false;
            menu.current.querySelector('summary')?.focus();
          }
        }}>
          <summary aria-label="More project recording options"
            className="flex h-full min-h-12 w-12 cursor-pointer list-none items-center justify-center gap-2 rounded-r-lg border-l border-[#009be5] px-3 py-3 text-sm font-semibold hover:bg-[#d8f0fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#009be5] [&::-webkit-details-marker]:hidden">
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-gray-200 bg-white p-2 text-gray-800 shadow-lg">
            <button type="button" onClick={() => { if(menu.current)menu.current.open=false;onNonbillable(defaultDate ?? rateToday()); }} className="min-h-12 w-full rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-gray-50">Record Non-billable Work</button>
            <button type="button" onClick={() => {
              if (menu.current) menu.current.open = false;
              setDate(defaultDate ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
              setError('');
              setOpen(true);
            }} className="min-h-12 w-full rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5]">
              Record Holiday / Unable to Service
            </button>
          </div>
        </details>
      </div>
      <dialog ref={dialog} aria-labelledby={modalTitleId}
        onCancel={(event) => { event.preventDefault(); if (!busy.current) setOpen(false); }}
        style={{ width: 'calc(100% - 2rem)', maxWidth: '48rem', boxSizing: 'border-box' }}
        onClose={() => setOpen(false)}
        className="m-auto max-h-[90dvh] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-black shadow-xl backdrop:bg-black/40">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-6 py-4">
          <div className="min-w-0">
            <h2 id={modalTitleId} className="text-xl font-bold">Record Holiday / Unable to Service</h2>
            <p className="mt-1 break-words text-sm text-gray-600">Project {projectNumber}</p>
          </div>
          <button type="button" disabled={saving} onClick={() => setOpen(false)}
            className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Close</button>
        </div>
        <form onSubmit={submit} className="min-w-0 space-y-4 p-6">
          <label className="block min-w-0 text-sm font-medium">Date
            <input type="date" required value={date} disabled={saving} onChange={(event) => setDate(event.target.value)} className="mt-2 block box-border min-w-0 w-full max-w-full appearance-none rounded-lg border border-black bg-white p-3 text-sm font-normal [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left" />
          </label>
          <fieldset disabled={saving} className="min-w-0">
            <legend className="mb-2 text-sm font-normal">Reason</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['Unable to Service', 'Holiday'] as const).map((option) => (
                <button key={option} type="button" aria-pressed={reason === option}
                  onClick={() => setReason(option)}
                  className={`min-h-11 min-w-0 rounded-lg border px-3 py-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5] focus-visible:ring-offset-2 disabled:opacity-50 ${
                    reason === option
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}>
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block min-w-0 text-sm font-medium">Note <span className="font-normal text-gray-500">(optional)</span>
            <textarea rows={3} maxLength={2000} value={note} disabled={saving} onChange={(event) => setNote(event.target.value)} placeholder="Add any details..." className="mt-2 block box-border min-w-0 w-full max-w-full rounded-lg border bg-white p-3 text-sm font-normal" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="grid gap-3">
            <button type="submit" disabled={saving || !date} className="w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">{saving ? 'Saving...' : 'Save Update'}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function ProjectDayHistoryEntry({ entry, projectId, managing, canEdit, canDelete, onSaved }: {
  entry: ProjectDayUpdate;
  projectId: string;
  managing: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSaved: (date: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.work_date);
  const [reason, setReason] = useState(entry.reason);
  const [note, setNote] = useState(entry.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => { if (!managing) { setEditing(false); setError(''); } }, [managing]);

  async function save(remove: boolean) {
    if (lock.current || (remove ? !canDelete : !canEdit)) return;
    setError('');
    if (!remove && (!date || note.trim().length > 2000)) {
      setError('Choose a date and keep the note under 2,000 characters.');
      return;
    }
    if (remove && !window.confirm('Delete this Holiday/Unable to Service submission?')) return;
    lock.current = true;
    setBusy(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Please sign in to change this submission.');
      const values = remove ? { deleted_at: new Date().toISOString() }
        : { work_date: date, reason, note: note.trim() };
      const { data, error: saveError } = await supabase.from('project_day_updates')
        .update(values).eq('id', entry.id).eq('project_id', projectId)
        .eq('updated_at', entry.updated_at).is('deleted_at', null).select('id').maybeSingle();
      if (saveError) throw saveError;
      if (!data) throw new Error('This submission changed or is unavailable. Refresh the page before trying again.');
      setEditing(false);
      onSaved(remove ? entry.work_date : date);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message :
        (failure as { message?: string })?.message || 'Could not update this submission.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-3">
      {editing ? (
        <form onSubmit={(event) => { event.preventDefault(); void save(false); }} className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">Date
            <input type="date" required disabled={busy} value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 block w-full rounded-lg border p-3 text-sm" />
          </label>
          <label className="block text-sm font-medium">Reason
            <select disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 block w-full rounded-lg border p-3 text-sm">
              <option>Unable to Service</option><option>Holiday</option>
            </select>
          </label>
          <label className="block text-sm font-medium md:col-span-2">Note (optional)
            <textarea rows={3} maxLength={2000} disabled={busy} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 block w-full rounded-lg border p-3 text-sm" />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50">{busy ? 'Saving...' : 'Save'}</button>
            <button type="button" disabled={busy} onClick={() => { setEditing(false); setError(''); }} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            {canDelete && <button type="button" disabled={busy} onClick={() => void save(true)} className="ml-auto rounded-lg border px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>}
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#005f8f]">{entry.reason}</p>
          {entry.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{entry.note}</p>}
          <p className="mt-2 text-xs text-gray-500">Submitted by {entry.technician} · {new Date(entry.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' })} ET</p>
          {entry.updated_at !== entry.created_at && <p className="mt-1 text-xs text-gray-500">Updated {new Date(entry.updated_at).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' })} ET</p>}
          {managing && (canEdit || canDelete) && (
            <div className="mt-3 flex gap-2">
              {canEdit && <button type="button" disabled={busy} onClick={() => { setDate(entry.work_date); setReason(entry.reason); setNote(entry.note); setError(''); setEditing(true); }} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Edit</button>}
              {canDelete && <button type="button" disabled={busy} onClick={() => void save(true)} className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>}
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}


const rateServices = [
  { code: 'MAIN', name: 'Mainline', units: ['Per Hour', 'Per Foot'] },
  { code: 'LAT', name: 'Lateral', units: ['Per Hour', 'Per Lateral'] },
  { code: 'JET', name: 'Jetter', units: ['Per Hour', 'Per Foot'] },
  { code: 'PUSH', name: 'Push Rod', units: ['Per Hour'] },
  { code: 'DYE', name: 'Dye', units: ['Per Hour'] },
  { code: 'SMK', name: 'Smoke', units: ['Per Hour', 'Per Mainline Test', 'Per Residence'] },
  { code: 'LABOR', name: 'Laborer', units: ['Per Hour'] },
  { code: 'TRFC', name: 'Traffic Control', units: ['Flat Rate'] },
];
type CustomerRate = {
  id: string; service_code: string; unit: string; amount: number;
  effective_from: string; effective_to: string | null; note: string;
  updated_at: string;
};
function formatCurrentRate(rows: CustomerRate[], code: string, method: string, today: string) {
  const units = code === 'SMK' && method.includes('+')
    ? ['Per Mainline Test', 'Per Residence'] : [method];
  const amounts = units.map((unit) => {
    const rate = rows.find((row) => row.service_code === code && row.unit === unit &&
      row.effective_from <= today && (!row.effective_to || row.effective_to >= today));
    return rate ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(rate.amount)) : 'Missing rate';
  });
  return amounts.join(' + ');
}

function rateToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function rateDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US');
}
function emptyRate() {
  return { service_code: 'MAIN', unit: 'Per Hour', amount: '', effective_from: rateToday(), effective_to: '', note: '' };
}
function splitRateHistory(rows: CustomerRate[], today: string) {
  const visibleIds = new Set<string>();
  // Show one applicable rate per unit; preserve both combined Smoke components.
  for (const unit of Array.from(new Set(rows.map((row) => row.unit)))) {
    const unitRows = rows.filter((row) => row.unit === unit);
    const current = unitRows.find((row) => row.effective_from <= today && (!row.effective_to || row.effective_to >= today));
    const upcoming = [...unitRows].filter((row) => row.effective_from > today)
      .sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0];
    const latest = [...unitRows].sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    const primary = current ?? upcoming ?? latest;
    if (primary) visibleIds.add(primary.id);
  }
  return { visibleIds, historyCount: rows.filter((row) => !visibleIds.has(row.id)).length };
}

function ProjectOverrideRates({ projectId, projectName, methods, billingVersion, canSaveRates, onRatesChanged, onEditState }: {
  projectId: string; projectName: string; methods: Record<string, string>;
  billingVersion: string | null;
  canSaveRates: boolean;
  onRatesChanged: (patch: Partial<ProjectDetail>) => void;
  onEditState: (dirty: boolean, busy: boolean) => void;
}) {
  const busy = useRef(false);
  const open = true;
  const [rows, setRows] = useState<CustomerRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CustomerRate | null>(null);
  const [form, setForm] = useState(emptyRate);
  const [dirty, setDirty] = useState(false);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  useEffect(() => { onEditState(dirty, saving); }, [dirty, saving, onEditState]);
  const units = rateServices.find((service) => service.code === form.service_code)!.units;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setLoadError('');
      try {
        const { data, error } = await supabase.from('project_service_rate_ranges')
          .select('id, service_code, unit, amount, effective_from, effective_to, note, updated_at')
          .eq('project_id', projectId).order('effective_from', { ascending: false });
        if (error) throw error;
        if (!cancelled) setRows(data ?? []);
      } catch (e) {
        if (!cancelled) setLoadError((e as { message?: string }).message || 'Could not load rates. Please retry.');
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, projectId, revision]);
  function discard() {
    return !busy.current && (!dirty || window.confirm('Discard your unsaved rate changes?'));
  }
  function reset() { setActiveService(null); setEditing(null); setForm(emptyRate()); setDirty(false); setError(''); }
  function change(values: Partial<ReturnType<typeof emptyRate>>) { setForm((current) => ({ ...current, ...values })); setDirty(true); setError(''); setNotice(''); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!canSaveRates) { setError('Click Apply Rate above before saving a project override rate.'); return; }
    setError(''); setNotice('');
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) > 99999999.99) {
      setError('Enter a nonnegative rate with up to two decimal places.'); return;
    }
    if (rows.some((row) => row.id !== editing?.id && row.service_code === form.service_code && row.unit === form.unit)) {
      setError('This project already has a rate for this service and unit. Edit that rate instead.'); return;
    }
    const nextMethod = form.service_code === 'SMK' && form.unit !== 'Per Hour'
      ? 'Per Mainline Segment + Per Connection' : form.unit;
    if (methods[form.service_code] !== nextMethod && !window.confirm(`Save this rate and change ${form.service_code} billing from "${methods[form.service_code]}" to "${nextMethod}"? The billing unit changes immediately for new submissions.`)) return;
    busy.current = true; setSaving(true);
    try {
      const result = await supabase.rpc('save_project_rate_and_method', {
        p_project_id: projectId, p_rate_id: editing?.id ?? null,
        p_expected_rate_updated_at: editing?.updated_at ?? null,
        p_expected_billing_updated_at: billingVersion,
        p_service_code: form.service_code, p_unit: form.unit, p_amount: Number(form.amount),
        p_effective_from: null, p_effective_to: null,
        p_note: form.note.trim(),
      });
      if (result.error) throw result.error;
      if (!result.data) throw new Error('This rate changed since you opened it. Reload rates and review it before saving again.');
      reset(); setNotice('Unit and rate saved.'); setRevision((v) => v + 1); onRatesChanged(result.data as Partial<ProjectDetail>);
    } catch (e) {
      const failure = e as { code?: string; message?: string };
      setError(failure.code === '23P01' ? 'Another rate overlaps these dates. Reload rates and adjust the date range.' : failure.message || 'Could not save the rate. Please retry.');
    } finally { busy.current = false; setSaving(false); }
  }
  const inputClass = 'mt-2 block box-border min-w-0 w-full max-w-full rounded-lg border bg-white p-3 text-base font-normal';
  const rateEditor = (
          <form onSubmit={save} className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
            <h3 className="font-semibold">{editing ? 'Edit unit & rate' : 'Set unit & rate'}</h3>
            <p className="text-sm text-gray-600">Applies throughout this project’s service period. Dates follow the project automatically.</p>
            <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-medium">Unit<select disabled={saving || units.length === 1} className={inputClass} value={form.unit} onChange={(e) => change({ unit: e.target.value })}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              <label className="min-w-0 text-sm font-medium">Rate (USD)<input required inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e) => change({ amount: e.target.value })} className={inputClass} /></label>
              <label className="min-w-0 text-sm font-medium sm:col-span-2">Note (optional)<textarea rows={2} maxLength={1000} value={form.note} onChange={(e) => change({ note: e.target.value })} className={inputClass} /></label>
            </fieldset>
            {form.service_code === 'SMK' && <p className="text-sm text-gray-600">For combined Smoke billing, enter a separate rate for each component: Per Mainline Test and Per Residence.</p>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving || !canSaveRates} className="min-h-11 flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : canSaveRates ? 'Save unit & rate' : 'Apply Rate first'}</button>
              <button type="button" disabled={saving} onClick={() => { if (discard()) reset(); }} className="min-h-11 rounded-lg border px-4 py-3 text-sm">Cancel</button>
            </div>
          </form>
  );
  return <div>
      <div className="space-y-3">
        <details className="text-sm text-gray-600">
          <summary className="flex min-h-11 cursor-pointer items-center text-[#007bb5]">Rate dates &amp; pricing help ▾</summary>
          <p className="pb-2">Project rates apply throughout the project’s service period. The start follows the first service date (or estimated start before work begins). The end follows the final service date once completed. Edit an existing unit’s rate rather than adding date ranges.</p>
        </details>
        <p className="text-xs text-gray-500">All override rates follow the project’s service dates.</p>
        {loading ? <p role="status">Loading rates...</p> : loadError ? <p role="alert" className="text-sm text-red-700">{loadError}</p> : <>
          <section aria-label="Service rates" className="grid items-start gap-2 sm:grid-cols-2">
            {rateServices.map((service) => {
              const serviceRows = rows.filter((row) => row.service_code === service.code);
              const visibleIds = new Set(serviceRows.map((row) => row.id));
              const historyCount = 0;
              const historyOpen = expandedHistory[service.code] ?? false;
              const historyId = `rate-history-${projectId}-${service.code}`;
              return <section key={service.code} aria-label={`${service.name} rates`} className={`min-w-0 rounded-lg border px-3 py-2 ${activeService === service.code ? 'sm:col-span-2' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{service.name} <span className="ml-1 text-xs font-normal text-gray-500">{service.code}</span></h3>
                  <button type="button" disabled={saving} onClick={() => {
                    if (!discard()) return;
                    setEditing(null); setActiveService(service.code);
                    setForm({ ...emptyRate(), service_code: service.code, unit: service.units.includes(methods[service.code]) ? methods[service.code] : service.code === 'SMK' && methods[service.code] !== 'Per Hour' ? 'Per Mainline Test' : service.units[0] });
                    setDirty(false); setError(''); setNotice('');
                  }} className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-[#007bb5] hover:bg-[#e8f7ff]" aria-label={`Add project rate for ${service.name}`}>+ Add rate</button>
                </div>
                {serviceRows.length === 0 && activeService !== service.code && <p className="pb-1 text-sm text-gray-500">No rate set.</p>}
                <div id={historyId} className="divide-y border-gray-100">
                  {serviceRows.map((row) => {
                    const status = 'Project service period';
                    return <div key={row.id} hidden={!historyOpen && !visibleIds.has(row.id)} className="py-2">
                      {activeService === service.code && editing?.id === row.id ? rateEditor : <>
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
                          <div className="min-w-0">
                            <p className="text-sm"><span className="font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(row.amount))}</span> <span className="text-gray-600">{row.unit}</span></p>

                          </div>
                          <button type="button" disabled={saving} onClick={() => {
                            if (!discard()) return;
                            setActiveService(service.code); setEditing(row);
                            setForm({ service_code: row.service_code, unit: row.unit, amount: String(row.amount), effective_from: row.effective_from, effective_to: row.effective_to ?? '', note: row.note });
                            setDirty(false); setError(''); setNotice('');
                          }} className="min-h-11 justify-self-end rounded-lg px-3 py-2 text-sm font-medium text-[#007bb5] hover:bg-[#e8f7ff]" aria-label={`Edit ${service.name} ${row.unit} rate from ${rateDate(row.effective_from)}`}>Edit</button>
                        </div>
                        {row.note && <details className="mt-1 text-xs text-gray-600"><summary className="cursor-pointer py-2">Note</summary><p className="whitespace-pre-wrap break-words">{row.note}</p></details>}
                      </>}
                    </div>;
                  })}
                </div>
                {historyCount > 0 && <button type="button" disabled={saving}
                  aria-expanded={historyOpen} aria-controls={historyId}
                  onClick={() => {
                    if (historyOpen && activeService === service.code && editing && !visibleIds.has(editing.id)) {
                      if (!discard()) return;
                      reset();
                    }
                    setExpandedHistory((current) => ({ ...current, [service.code]: !historyOpen }));
                  }} className="min-h-11 rounded-lg px-2 py-2 text-sm font-semibold text-[#007bb5] hover:bg-[#e8f7ff]">
                  {historyOpen ? 'Hide rate changes' : `Show rate changes (${historyCount})`} <span aria-hidden="true">{historyOpen ? '▴' : '▾'}</span>
                </button>}
                {activeService === service.code && !editing && rateEditor}
              </section>;
            })}
          </section>
        </>}
        {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
        <button type="button" disabled={saving || loading} onClick={() => { if (discard()) { reset(); setRevision((v) => v + 1); } }} className="min-h-11 rounded-lg border px-3 py-2 text-sm">Reload rates</button>
      </div>
  </div>;
}

function ProjectPricingPanel({ projectId, projectName, customerId, source, methods, preview }: {
  projectId: string; projectName: string; customerId: string | null;
  source: string; methods: Record<string, string>; preview: boolean;
}) {
  const [rows, setRows] = useState<CustomerRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [asOf, setAsOf] = useState(rateToday);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(''); setRows([]);
      try {
        if (source === 'standard') return;
        if (source !== 'customer' && source !== 'project') throw new Error('Select a valid billing source.');
        if (source === 'customer' && !customerId) throw new Error('This project has no customer linked.');
        let query = supabase.from(source === 'project' ? 'project_service_rate_ranges' : 'customer_service_rates')
          .select('id, service_code, unit, amount, effective_from, effective_to, note, updated_at')
          .eq(source === 'project' ? 'project_id' : 'customer_id', source === 'project' ? projectId : customerId!);
        if (source === 'customer') query = query.lte('effective_from', asOf).or(`effective_to.is.null,effective_to.gte.${asOf}`);
        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setRows(data ?? []);
      } catch (e) { if (!cancelled) setError((e as { message?: string }).message || 'Could not load rates.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [projectId, customerId, source, asOf, revision]);
  useEffect(() => {
    const refresh = () => { setAsOf(rateToday()); setRevision((value) => value + 1); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  return <div className="mt-3 w-full min-w-0 space-y-3">
    {preview && <p className="text-sm text-amber-800">Preview only. Save Project to apply this billing source and its methods.</p>}

    {source === 'standard' && <p className="text-sm text-gray-600">Standard dollar rates have not been configured. Existing standard billing methods remain available.</p>}
    {error && <div><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRevision((v) => v + 1)} className="min-h-11 rounded-lg border px-3 py-2 text-sm">Retry rates</button></div>}
    <div className="grid w-full grid-cols-2 items-start gap-x-3 gap-y-5 sm:gap-x-6">
      {rateServices.map((service) => <div key={service.code} className="min-w-0 px-1 text-center text-sm">
        <p className="font-semibold" title={service.name}>{service.code}</p>
        <p className="mt-1 break-words text-gray-600">{methods[service.code] || 'Method not set'}</p>
        <p className="mt-1 break-words font-semibold">{source === 'standard' ? 'Not configured' : loading ? 'Loading…' : error ? 'Rate unavailable' : !methods[service.code] ? 'Set billing method first' : formatCurrentRate(source === 'project' ? rows.map((row) => ({ ...row, effective_from: '0001-01-01', effective_to: null })) : rows, service.code, methods[service.code], asOf)}</p>
      </div>)}
    </div>
    {source === 'project' && preview && <p className="text-sm text-gray-600">Save Project, then use Manage Project Rates to enter custom rates.</p>}
    {source === 'customer' && customerId && <Link href={`/customers/${customerId}`} className="flex min-h-11 w-full items-center justify-center text-center text-sm font-semibold text-[#007bb5]">Manage customer billing &amp; rates →</Link>}
  </div>;
}

const projectBillingConfig = [
  { code: 'MAIN', column: 'main_pricing_type', standard: 'Per Foot', choices: ['Per Hour', 'Per Foot'] },
  { code: 'LAT', column: 'lateral_pricing_type', standard: 'Per Lateral', choices: ['Per Hour', 'Per Lateral'] },
  { code: 'JET', column: 'jet_pricing_type', standard: 'Per Foot', choices: ['Per Hour', 'Per Foot'] },
  { code: 'PUSH', column: 'push_rod_pricing_type', standard: 'Per Hour', choices: ['Per Hour'] },
  { code: 'DYE', column: 'dye_pricing_type', standard: 'Per Hour', choices: ['Per Hour'] },
  { code: 'SMK', column: 'smoke_pricing_type', standard: 'Per Mainline Segment + Per Connection', choices: ['Per Hour', 'Per Mainline Test + Per Residence', 'Per Mainline Segment + Per Connection', 'Per Mainline Segments + Connections'] },
  { code: 'LABOR', column: 'laborer_pricing_type', standard: 'Per Hour', choices: ['Per Hour'] },
  { code: 'TRFC', column: 'traffic_control_pricing_type', standard: 'Flat Rate', choices: ['Flat Rate'] },
] as const;
function ProjectBillingManager({ project, effectiveMethods, onSaved }: {
  project: ProjectDetail; effectiveMethods: Record<string, string>;
  onSaved: (patch: Partial<ProjectDetail>) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(project.billing_method_source ?? 'customer');
  const [draftMethods, setDraftMethods] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rateDirty, setRateDirty] = useState(false);
  const [rateBusy, setRateBusy] = useState(false);
  const onEditState = useCallback((dirty: boolean, busy: boolean) => { setRateDirty(dirty); setRateBusy(busy); }, []);
  const storedSource = project.billing_method_source ?? 'customer';
  const settingsDirty = source !== storedSource || (source === 'project' && projectBillingConfig.some((item) =>
    draftMethods[item.code] !== (project[item.column] || effectiveMethods[item.code])));
  const inheritedMethods = Object.fromEntries(projectBillingConfig.map((item) => [item.code,
    source === 'standard' ? item.standard : source === 'project' ? draftMethods[item.code] : project.customers?.[item.column] || item.standard]));
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; dialog.current?.close(); };
  }, [open]);
  function start() {
    setSource(storedSource);
    setDraftMethods(Object.fromEntries(projectBillingConfig.map((item) => [item.code, project[item.column] || effectiveMethods[item.code]])));
    setError(''); setNotice(''); setRateDirty(false); setRateBusy(false); setOpen(true);
  }
  function close() {
    if (lock.current || rateBusy) return;
    if ((settingsDirty || rateDirty) && !window.confirm('Discard unsaved project pricing changes?')) return;
    setOpen(false);
  }
  function switchSource(value: string) {
    if (lock.current || rateBusy || value === source) return;
    if (rateDirty && !window.confirm('Discard the unsaved rate edit before switching sources?')) return;
    setRateDirty(false); setSource(value); setError(''); setNotice('');
  }
  async function saveSettings() {
    if (lock.current || rateBusy || !settingsDirty) return;
    if (!window.confirm(`Apply ${source === 'project' ? 'Project Override' : source === 'customer' ? 'Customer' : 'Standard'} billing to ${project.project_number}? This changes the methods used for new submissions and updates revenue estimates using the selected rates. Recorded quantities stay unchanged.`)) return;
    lock.current = true; setSaving(true); setError(''); setNotice('');
    try {
      const methods = Object.fromEntries(projectBillingConfig.map((item) => [item.column, draftMethods[item.code]]));
      const { data, error } = await supabase.rpc('save_project_billing_settings', {
        p_project_id: project.id, p_source: source, p_methods: methods,
        p_expected_source: storedSource, p_expected_updated_at: project.billing_methods_updated_at,
      });
      if (error) throw error;
      if (!data) throw new Error('Project pricing was not saved. Reload the project and retry.');
      onSaved(data as Partial<ProjectDetail>);
      setNotice('Pricing source saved.');
    } catch (e) { setError((e as { message?: string }).message || 'Could not save project pricing.'); }
    finally { lock.current = false; setSaving(false); }
  }
  return <>
    <button type="button" onClick={start} className="mt-3 min-h-11 w-full rounded-lg border border-[#8fd8f7] bg-[#e8f7ff] px-3 py-2 text-sm font-semibold text-[#007bb5]">Manage Project Rates</button>
    <dialog ref={dialog} aria-labelledby="manage-project-billing-title" onCancel={(e) => { e.preventDefault(); close(); }}
      style={{ width: 'calc(100% - 1rem)', maxWidth: '48rem' }}
      className="m-auto max-h-[94dvh] overflow-y-auto rounded-2xl border-0 bg-white p-0 text-black shadow-xl backdrop:bg-black/40">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-3 py-3 sm:px-5">
        <div className="min-w-0"><h2 id="manage-project-billing-title" className="text-xl font-bold">Manage Project Rates</h2><p className="mt-1 break-words text-sm text-gray-600">{project.project_number}</p></div>
        <button type="button" disabled={saving || rateBusy} onClick={close} className="min-h-11 rounded-lg border px-3 py-2 text-sm">Close</button>
      </div>
      {open && <div className="min-w-0 space-y-3 px-3 py-4 sm:space-y-4 sm:px-5">
        <fieldset disabled={saving || rateBusy}>
          <legend className="mb-2 text-sm font-medium">Pricing source</legend>
          <div className="grid grid-cols-3 gap-2">
            {[['customer','Customer'],['project','Project Override'],['standard','Standard']].map(([value,label]) => <button type="button" key={value} aria-pressed={source === value} onClick={() => switchSource(value)} className={`min-h-11 min-w-0 rounded-lg border px-2 py-3 text-sm font-medium sm:px-3 ${source === value ? 'border-black bg-black text-white' : 'bg-white text-gray-700'}`}>{label}</button>)}
          </div>
        </fieldset>
        <p className="text-sm text-gray-600">{source === 'project' ? (settingsDirty ? 'Choose a service and enter its unit and price below. Apply Rate above before saving the rate.' : 'Choose a service below to set its unit and price together.') : source === 'customer' ? 'Uses customer billing units and rates. Choose Project Override for job-specific units and prices.' : 'Standard dollar rates are not configured yet.'}</p>
        {settingsDirty && <button type="button" disabled={saving || rateBusy} onClick={() => void saveSettings()} className="min-h-11 w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Apply Rate'}</button>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
        {source === 'project' ? (<ProjectOverrideRates projectId={project.id} projectName={project.project_number} methods={effectiveMethods} billingVersion={project.billing_methods_updated_at} canSaveRates={!settingsDirty && storedSource === 'project' && !saving} onEditState={onEditState} onRatesChanged={(patch) => {
          if (patch) setDraftMethods(Object.fromEntries(projectBillingConfig.map((item) => [item.code, (patch[item.column] as string) || effectiveMethods[item.code]])));
          onSaved(patch);
        }} />) :
          <ProjectPricingPanel key={source} projectId={project.id} projectName={project.project_number} customerId={project.customers?.id ?? null} source={source} methods={inheritedMethods} preview={false} />}
      </div>}
    </dialog>
  </>;
}


type RevenueEntry = {
  entry_id: string; work_date: string; service: string;
  status: 'priced' | 'missing' | 'review' | 'excluded'; issue: string | null;
  source: string; source_changed: boolean; amount: number | null; calculated_at: string;
  lines: { unit: string; quantity: number; rate: number | null; amount: number | null; rate_from: string | null; rate_to: string | null }[];
};
type RevenueResult = {
  total: number; missing_count: number; review_count: number; excluded_count: number;
  source_changed_count: number; entries: RevenueEntry[];
};
function revenueMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
function revenueServiceKey(value: string) { return value.trim().toLowerCase().includes('smoke') ? 'smoke' : value.trim().toLowerCase(); }
function ProjectRevenueSummary({ projectId, version, services }: {
  projectId: string; version: string; services: { serviceType: string; summary: string }[];
}) {
  const [result, setResult] = useState<RevenueResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const busy = useRef(false);
  const load = useCallback(async (background = false) => {
    const request = ++sequence.current;
    busy.current = true; if (!background) setLoading(true); setError('');
    try {
      const { data, error } = await supabase.rpc('get_project_revenue', { p_project_id: projectId, p_reprice: false });
      if (error) throw error;
      if (!data || !Array.isArray(data.entries)) throw new Error('Revenue response was incomplete. Please retry.');
      if (request === sequence.current) setResult(data as RevenueResult);
    } catch (e) {
      if (request === sequence.current) { setResult(null); setError((e as { message?: string }).message || 'Revenue is unavailable. Please retry.'); }
    } finally { if (request === sequence.current) { busy.current = false; setLoading(false); } }
  }, [projectId]);
  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible' && !busy.current) void load(true);
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      sequence.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load, version]);
  const partialCount = (result?.missing_count ?? 0) + (result?.review_count ?? 0);
  return <div className="mt-4 space-y-4 border-t pt-4">
    <div className="rounded-lg bg-white p-4 text-center">
      <p className="text-xs font-medium uppercase text-gray-500">Estimated Billable Revenue</p>
      {loading ? <p role="status" className="mt-2 text-sm text-gray-600">Calculating estimate…</p> : error ? <p role="alert" className="mt-2 break-words text-sm text-red-700">{error}</p> : result && <>
        <p className="mt-1 text-2xl font-bold">{revenueMoney(Number(result.total))}</p>
        {partialCount > 0 && <p className="mt-2 text-sm font-medium text-amber-800">Partial estimate · {partialCount} {partialCount === 1 ? 'entry needs' : 'entries need'} pricing or review.</p>}
      </>}
      <p className="mt-2 text-xs text-gray-500">Internal estimate based on submitted quantities and rates applicable to each service date.</p>
    </div>
    <div>
      <p className="mb-3 text-sm font-bold text-gray-800">Service Totals</p>
      <div className="space-y-2">
        {services.map((service, index) => {
          const entries = result?.entries.filter((entry) => revenueServiceKey(entry.service) === revenueServiceKey(service.serviceType)) ?? [];
          const subtotal = entries.filter((entry) => entry.status === 'priced').reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
          const pending = entries.filter((entry) => entry.status === 'missing' || entry.status === 'review');
          return <div key={`${service.serviceType}-${index}`} className="rounded-lg border bg-white px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words font-semibold text-gray-800">{service.serviceType}</span>
              <div className="min-w-0 text-right">
                <p className="whitespace-pre-line font-medium text-gray-600">{service.summary}</p>
                {!loading && !error && result && <><p className="mt-1 font-semibold">{revenueMoney(subtotal)}</p>{pending.length > 0 && <p className="mt-1 text-xs text-amber-800">Partial · {pending.length} {pending.length === 1 ? 'entry needs' : 'entries need'} review</p>}</>}
              </div>
            </div>
            {!loading && !error && pending.length > 0 && <div className="mt-3 border-t border-amber-200 pt-2 text-xs text-amber-900">
              <p className="mb-2">Excluded from revenue until resolved:</p>
              <ul className="space-y-2">
                {pending.map((entry) => <li key={entry.entry_id} className="break-words rounded-md bg-amber-50 px-3 py-2">
                  <p className="font-semibold">{rateDate(entry.work_date)}</p>
                  <p className="mt-1">{entry.issue || 'This submission needs pricing review.'}</p>
                  {entry.status === 'missing' && entry.source !== 'standard' && <p className="mt-1">
                    Add or adjust the {entry.source === 'project' ? 'project override' : 'customer'} rate to cover this date
                    {entry.lines.some((line) => line.rate === null) ? ` for ${entry.lines.filter((line) => line.rate === null).map((line) => line.unit).join(' and ')}` : ''}.
                  </p>}
                </li>)}
              </ul>
            </div>}
          </div>;
        })}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {error && <button type="button" disabled={loading} onClick={() => { if (!busy.current) void load(); }} className="min-h-11 rounded-lg border bg-white px-3 py-2 text-sm">Retry estimate</button>}

    </div>

  </div>;
}

type NonbillableEntry = {
 id: string; project_id: string; work_date: string; category: 'Service' | 'Admin Work'; description: string;
 service_type: string | null; vehicle: string | null; quantity: number | null; unit: string | null;
 created_by: string; created_at: string; updated_at: string; technician: string;
};
const nonbillableUnits: Record<string,string[]> = {
 Mainline: ['Hours','Feet'], Lateral: ['Hours','Laterals'], Jetter: ['Hours','Feet'], 'Push Rod': ['Hours'],
 Dye: ['Hours'], Smoke: ['Hours','Segments','Connections'], Laborer: ['Hours'], 'Traffic Control': ['Occurrences'],
};
function NonbillableCard({entry, onEdit}: {entry: NonbillableEntry; onEdit?: () => void}) {
 return <div className="rounded-lg border border-[#cbd5e1] bg-white p-3 text-sm">
  <p className="font-semibold text-[#16324f]">Non-billable · {entry.category === 'Service' ? entry.service_type : 'Admin Work'}</p>
  {entry.vehicle && <p className="mt-1 text-xs text-gray-500">{entry.vehicle}</p>}
  {entry.quantity !== null && <p className="mt-1 text-gray-600">{entry.quantity} {entry.unit?.toLowerCase()}</p>}
  <p className="mt-2 whitespace-pre-wrap break-words text-gray-700">{entry.description}</p>
  <p className="mt-2 text-xs text-gray-500">Submitted {new Date(entry.created_at).toLocaleString('en-US')} by {entry.technician}</p>
  {onEdit && <button type="button" onClick={onEdit} className="mt-2 min-h-11 rounded-lg border px-3 py-2 text-sm">Edit / Delete</button>}
 </div>;
}
function NonbillableModal({projectId, projectName, date, entry, onClose, onSaved}: {
 projectId: string; projectName: string; date: string; entry: NonbillableEntry | null; onClose: () => void; onSaved: (date: string) => void;
}) {
 const dialog=useRef<HTMLDialogElement>(null); const title=useId(); const lock=useRef(false);
 const request=useRef<{id:string;signature:string}|null>(null);
 const [form,setForm]=useState({work_date:entry?.work_date ?? date,category:entry?.category ?? 'Service',description:entry?.description ?? '',service_type:entry?.service_type ?? 'Mainline',vehicle:entry?.vehicle ?? '',quantity:entry?.quantity == null ? '' : String(entry.quantity),unit:entry?.unit ?? 'Hours'});
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [dirty,setDirty]=useState(false);
 useEffect(()=>{dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;dialog.current?.close();};},[]);
 function close(){if(lock.current)return;if(dirty&&!window.confirm('Discard unsaved non-billable work?'))return;onClose();}
 async function save(remove=false){
  if(lock.current)return;setError('');
  if(remove&&!window.confirm('Delete this non-billable work entry?'))return;
  if(!remove&&(!form.work_date||!form.description.trim()||form.description.trim().length>2000)){setError('Choose a date and describe the work performed (up to 2,000 characters).');return;}
  if(!remove&&form.category==='Service'&&form.quantity&&(!/^\d+(\.\d{1,2})?$/.test(form.quantity)||Number(form.quantity)<=0)){setError('Enter a positive quantity with up to two decimal places, or leave it blank.');return;}
  lock.current=true;setBusy(true);
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();if(authError)throw authError;if(!user)throw new Error('Please sign in.');
   const values={work_date:form.work_date,category:form.category,description:form.description.trim(),service_type:form.category==='Service'?form.service_type:null,vehicle:form.category==='Service'&&form.vehicle?form.vehicle:null,quantity:form.category==='Service'&&form.quantity?Number(form.quantity):null,unit:form.category==='Service'&&form.quantity?form.unit:null};
   if(entry){
    const result=await supabase.from('project_nonbillable_work').update(remove?{deleted_at:new Date().toISOString()}:values).eq('id',entry.id).eq('project_id',projectId).eq('updated_at',entry.updated_at).is('deleted_at',null).select('id').maybeSingle();
    if(result.error)throw result.error;if(!result.data)throw new Error('This entry changed or is unavailable. Close this form and reload the page before editing again.');
   }else{
    const signature=JSON.stringify([projectId,user.id,values]);if(request.current?.signature!==signature)request.current={id:crypto.randomUUID(),signature};
    const result=await supabase.from('project_nonbillable_work').insert({...values,id:request.current.id,project_id:projectId,created_by:user.id});
    if(result.error){
     if(result.error.code!=='23505')throw result.error;
     const lookup=await supabase.from('project_nonbillable_work').select('id').eq('id',request.current.id).eq('project_id',projectId).eq('created_by',user.id).maybeSingle();
     if(lookup.error||!lookup.data)throw lookup.error||result.error;
    }
   }
   onSaved(remove&&entry?entry.work_date:form.work_date);
  }catch(e){setError((e as {message?:string}).message||'Could not save non-billable work.');}
  finally{lock.current=false;setBusy(false);}
 }
 const input='mt-2 block box-border min-h-11 w-full min-w-0 max-w-full appearance-none rounded-lg border bg-white p-3 text-base font-normal';
 return <dialog ref={dialog} aria-labelledby={title} onCancel={(e)=>{e.preventDefault();close();}} style={{width:'calc(100% - 2rem)',maxWidth:'48rem'}} className="m-auto max-h-[90dvh] overflow-y-auto rounded-2xl border-0 bg-white p-0 text-black shadow-xl backdrop:bg-black/40">
  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-6 py-4"><div className="min-w-0"><h2 id={title} className="text-xl font-bold">{entry?'Edit':'Record'} Non-billable Work</h2><p className="mt-1 break-words text-sm text-gray-600">{projectName}</p></div><button type="button" disabled={busy} onClick={close} className="min-h-11 shrink-0 rounded-lg border px-3 py-2 text-sm">Close</button></div>
  <form onSubmit={(e)=>{e.preventDefault();void save();}} onChange={()=>setDirty(true)} className="min-w-0 space-y-4 p-6">
   <p className="text-sm text-gray-600">Completed work with no charge. Kept in project history and excluded from billable totals and the invoice tracker.</p>
   <fieldset disabled={busy} className="min-w-0 space-y-4">
    <label className="block min-w-0 text-sm font-medium">Date<input required type="date" className={input} value={form.work_date} onChange={(e)=>setForm({...form,work_date:e.target.value})}/></label>
    <fieldset><legend className="text-sm font-medium">Work category</legend><div className="mt-2 grid grid-cols-2 gap-2">{(['Service','Admin Work'] as const).map(category=><button key={category} type="button" aria-pressed={form.category===category} onClick={()=>{setForm({...form,category});setDirty(true);}} className={`min-h-12 rounded-lg border px-3 py-3 text-sm ${form.category===category?'bg-black text-white':'bg-white text-gray-700'}`}>{category}</button>)}</div></fieldset>
    {form.category==='Service'&&<>
     <label className="block text-sm font-medium">Service type<select className={input} value={form.service_type} onChange={(e)=>setForm({...form,service_type:e.target.value,unit:nonbillableUnits[e.target.value][0],quantity:''})}>{Object.keys(nonbillableUnits).map(name=><option key={name}>{name}</option>)}</select></label>
     <label className="block text-sm font-medium">Vehicle (optional)<select className={input} value={form.vehicle} onChange={(e)=>setForm({...form,vehicle:e.target.value})}><option value="">No vehicle</option><option>2007 Ford F-150</option><option>2016 Ford Van</option></select></label>
     <div className="grid min-w-0 grid-cols-2 gap-3"><label className="min-w-0 text-sm font-medium">Quantity (optional)<input inputMode="decimal" className={input} value={form.quantity} onChange={(e)=>setForm({...form,quantity:e.target.value})}/></label><label className="min-w-0 text-sm font-medium">Unit<select className={input} value={form.unit} onChange={(e)=>setForm({...form,unit:e.target.value})}>{nonbillableUnits[form.service_type].map(unit=><option key={unit}>{unit}</option>)}</select></label></div>
    </>}
    <label className="block text-sm font-medium">Work performed<textarea required maxLength={2000} rows={3} className={input} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label>
   </fieldset>
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   <button disabled={busy} type="submit" className="min-h-12 w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':'Save Non-billable Work'}</button>
   {entry&&<button type="button" disabled={busy} onClick={()=>void save(true)} className="min-h-11 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Delete entry</button>}
  </form>
 </dialog>;
}

function CustomerTypeBadge({ value }: { value: string | null | undefined }) {
  if (value !== 'Sewer' && value !== 'Telecom') return null;
  const label = value === 'Telecom' ? 'Telecom / Fiber' : 'Sewer';
  return <span role="img" aria-label={label} title={label} className="inline-flex shrink-0 items-center text-[#16324f]">
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      {value === 'Sewer' ? <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="7" />
        <path d="M8 7v10M12 5v14M16 7v10M7 8h10M5 12h14M7 16h10" />
      </> : <>
        <path d="M2.7 15.7A10 10 0 1 1 8.3 21.3L11.5 18L6 12.5Z" />
        <g strokeWidth="1.3">
          <path d="M6.8 13.3L7.5 10.5L7.2 8.4M8 14.5L11.4 10.1L12 6.5M9.1 15.6L16.3 8M10.2 16.7L14 13L17.6 12.2M11.3 17.8L14 16.4L16.1 16.8" />
          <circle cx="7.1" cy="7.4" r="1" />
          <circle cx="12.2" cy="5.5" r="1" />
          <circle cx="17" cy="7.3" r="1" />
          <circle cx="18.6" cy="12" r="1" />
          <circle cx="17.1" cy="17" r="1" />
        </g>
      </>}
    </svg>
  </span>;
}

function ProjectTypeIcon({ value }: { value: string | null | undefined }) {
 if(value!=='Commercial'&&value!=='Residential')return null;
 return <span role="img" aria-label={`${value} Sewer`} title={`${value} Sewer`} className="inline-flex shrink-0 text-[#16324f]">
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
   {value==='Residential'?<><path d="M3 11L12 3l9 8M5 10v11h14V10M9 21v-7h6v7"/></>:<><rect x="5" y="2" width="14" height="20" rx="1"/><path d="M9 6h1m4 0h1M9 10h1m4 0h1M9 14h1m4 0h1M10 22v-4h4v4"/></>}
  </svg>
 </span>;
}
function ProjectTypePicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}) {
 return <fieldset disabled={disabled} className="min-w-0"><legend className="mb-2 text-sm font-medium">Sewer project type</legend>
  <div className="grid grid-cols-2 gap-2">{['Commercial','Residential'].map(type=><label key={type} className={`flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm focus-within:ring-2 focus-within:ring-[#009be5] ${value===type?'border-[#009be5] bg-[#e8f7ff] text-[#16324f]':'bg-white text-gray-700'} ${disabled?'opacity-50':''}`}>
   <input type="radio" name="project-type" value={type} checked={value===type} onChange={()=>onChange(type)} required className="sr-only"/>
   <ProjectTypeIcon value={type}/><span>{type}</span>
  </label>)}</div>
 </fieldset>;
}


function projectCustomerService(project: ProjectDetail): 'Telecom' | 'Sewer' | null {
  const value = project.customers?.customer_type?.trim().toLowerCase();
  return value === 'telecom' ? 'Telecom' : value === 'sewer' ? 'Sewer' : null;
}

function ProjectClassificationIcon({ project }: { project: ProjectDetail }) {
  const service = projectCustomerService(project);
  // Never display a historical house/building classification for Telecom.
  if (service === 'Telecom') return <CustomerTypeBadge value="Telecom" />;
  if (service === 'Sewer' && ['Residential', 'Commercial'].includes(project.project_type ?? '')) {
    return <ProjectTypeIcon value={project.project_type} />;
  }
  return <span role="img" aria-label="Unclassified project" title="Unclassified project"
    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400 bg-amber-50 text-sm font-semibold text-amber-900">?</span>;
}


function StickyCarouselHeader({ children }: { children: ReactNode }) {
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const header = document.querySelector('aside');
    const measure = () => setTop(window.matchMedia('(min-width: 768px)').matches ? 0 : Math.ceil(header?.getBoundingClientRect().height ?? 0));
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (header) observer?.observe(header);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return <div className="sticky z-20 -mx-4 mb-2 border-b border-gray-200 bg-gray-100 px-4 md:mx-0 md:px-0" style={{ top }}>
    {children}
  </div>;
}


function DetailPageLoading() {
  const [showMessage, setShowMessage] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowMessage(true), 800);
    return () => window.clearTimeout(timer);
  }, []);
  return <div aria-busy="true" className="min-h-0">
    {showMessage && <p role="status" className="py-4 text-center text-sm text-gray-500">Loading details…</p>}
  </div>;
}


function useSwipeAreaFloor(ready = true) {
  const swipeArea = useRef<HTMLDivElement>(null);
  const [swipeFloor, setSwipeFloor] = useState(0);
  useLayoutEffect(() => {
    if (!ready) return;
    const element = swipeArea.current;
    if (!element) return;
    function measure() {
      if (!element) return;
      const documentTop = element.getBoundingClientRect().top + window.scrollY;
      let bottomSpace = 0;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        bottomSpace += (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0);
        parent = parent.parentElement;
      }
      const height = Math.max(0, Math.floor(document.documentElement.clientHeight - documentTop - bottomSpace));
      setSwipeFloor(previous => previous === height ? previous : height);
    }
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const header = document.querySelector('aside');
    if (header) observer?.observe(header);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [ready]);
  return { swipeArea, swipeFloor };
}
