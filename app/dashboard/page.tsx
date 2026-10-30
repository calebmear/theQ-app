'use client';

import Link from 'next/link';
import { Wrench, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo, type ReactNode, type TouchEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../../lib/useUserProfile';

import { supabase } from '../../lib/supabaseClient';


type RevenueSummary = {
  mainlineRevenue: number;
  lateralRevenue: number;
  jetterRevenue: number;
  smokeRevenue: number;
  dyeRevenue: number;
  totalRevenue: number;
  availableMonths: string[];
availableYears: string[];
};

type BillingBucket = 'All' | 'Unbilled' | 'Billed' | 'Paid';


type BillingMethodCodes = {
  MAIN?: string;
  LAT?: string;
  JET?: string;
  PUSH?: string;
  DYE?: string;
  SMK?: string;
  LABOR?: string;
  TRFC?: string;
};


type Customer = {
  id: string;
  customerType: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  pricingModels: BillingMethodCodes;
  notes?: string;
};


type Employee = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
};

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

type RecentService = {
  id: string;
  projectNumber: string;
  customerName: string;
  workDate: string;
  workCompleted: string;
  quantity: string;
};

type DashboardServiceEntry = {
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
  projects:
  | {
      project_number: string;
    }
  | {
      project_number: string;
    }[]
  | null;
};

const emptyPricingModels = {
  MAIN: '',
  LAT: '',
  JET: '',
  PUSH: '',
  DYE: '',
  SMK: '',
  LABOR: '',
  TRFC: '',
};

const emptyCustomerForm = {
  customerType: '',
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  pricingModels: emptyPricingModels,
};

const pricingModelOptions = [
  {
    code: 'MAIN',
    label: 'Mainline',
    choices: ['Per Hour', 'Per Foot'],
  },
  {
    code: 'LAT',
    label: 'Lateral',
    choices: ['Per Hour', 'Per Lateral'],
  },
  {
    code: 'JET',
    label: 'Jetter',
    choices: ['Per Hour', 'Per Foot'],
  },
  {
    code: 'PUSH',
    label: 'Push Rod',
    choices: ['Per Hour'],
  },
  {
    code: 'DYE',
    label: 'Dye',
    choices: ['Per Hour'],
  },
  {
    code: 'SMK',
    label: 'Smoke',
    choices: ['Per Hour', 'Per Mainline Segment + Per Connection'],
  },
  {
    code: 'LABOR',
    label: 'Laborer',
    choices: ['Per Hour'],
  },
  {
    code: 'TRFC',
    label: 'Traffic Control',
    choices: ['Flat Rate'],
  },
] as const;

const BILLING_SHEET_CSV_URL =
  'https://script.google.com/macros/s/AKfycbwAS55viQHZE3Qmebk3i8lNwbEJnZK76--y9O4QuYkLwwvIEp-SODWLQKIPJPXZECvsfQ/exec';

function parseMoney(value: string | undefined) {
  if (!value) return 0;

  return Number(value.replace(/[$,"]/g, '').trim()) || 0;
}

function getBillingBucket(row: string[]): Exclude<BillingBucket, 'All'> {
  const invoiceNo = row[19]?.trim();
  const invoiceStatus = row[20]?.trim();
  const paid = row[22]?.trim().toUpperCase();

  if (paid === 'Y') return 'Paid';

  if (invoiceNo || invoiceStatus === 'Invoiced') return 'Billed';

  return 'Unbilled';
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1;

      row.push(value.trim());

      if (row.some((cell) => cell !== '')) rows.push(row);

      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  row.push(value.trim());

  if (row.some((cell) => cell !== '')) rows.push(row);

  return rows;

}

function getYearKey(value: string | undefined) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return String(date.getFullYear());
}

function getMonthKey(value: string | undefined) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string) {
  if (!monthKey) return 'All months';

  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatMonthOnlyLabel(monthKey: string) {
  if (!monthKey) return 'All months';

  const [, month] = monthKey.split('-');
  const date = new Date(2000, Number(month) - 1, 1);

  return date.toLocaleDateString('en-US', {
    month: 'long',
  });
}

function getCell(row: string[], headers: string[], header: string) {
  const index = headers.indexOf(header);

  if (index === -1) return '';

  return row[index] ?? '';
}

function totalRevenueFromSheet(csv: string) {
  const rows = parseCsvRows(csv);
  const headers = rows[0] ?? [];

  return rows.slice(1).reduce((total, row) => {
    return total + parseMoney(getCell(row, headers, 'Total Revenue'));
  }, 0);
}

function revenueSummaryFromSheet(
  csv: string,
  selectedMonth: string,
  selectedYear: string,
  selectedBillingBucket: BillingBucket
): RevenueSummary {
  const rows = parseCsvRows(csv);
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1);

  const availableMonths = Array.from(
    new Set(
      dataRows
        .map((row) => getMonthKey(getCell(row, headers, 'work_date')))
        .filter(Boolean)
    )
  ).sort().reverse();

  const availableYears = Array.from(
    new Set(
      dataRows
        .map((row) => getYearKey(getCell(row, headers, 'work_date')))
        .filter(Boolean)
    )
  ).sort().reverse();

  return dataRows.reduce(
    (summary, row) => {
      const rowMonth = getMonthKey(getCell(row, headers, 'work_date'));
      const rowYear = getYearKey(getCell(row, headers, 'work_date'));

      if (selectedYear && rowYear !== selectedYear) return summary;
      if (selectedMonth && rowMonth !== selectedMonth) return summary;

      const rowBillingBucket = getBillingBucketByHeaders(row, headers);

      if (
        selectedBillingBucket !== 'All' &&
        rowBillingBucket !== selectedBillingBucket
      ) {
        return summary;
      }

      summary.mainlineRevenue += parseMoney(
        getCell(row, headers, 'Mainline Revenue')
      );
      summary.lateralRevenue += parseMoney(
        getCell(row, headers, 'Lateral Revenue')
      );
      summary.jetterRevenue += parseMoney(
        getCell(row, headers, 'Jetter Revenue')
      );
      summary.dyeRevenue += parseMoney(getCell(row, headers, 'Dye Revenue'));
      summary.smokeRevenue += parseMoney(getCell(row, headers, 'Smoke Revenue'));
      summary.totalRevenue += parseMoney(getCell(row, headers, 'Total Revenue'));

      return summary;
    },
    {
      mainlineRevenue: 0,
      lateralRevenue: 0,
      jetterRevenue: 0,
      smokeRevenue: 0,
      dyeRevenue: 0,
      totalRevenue: 0,
      availableMonths,
      availableYears,
    }
  );
}
function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function getBillingBucketByHeaders(
  row: string[],
  headers: string[]
): Exclude<BillingBucket, 'All'> {
  const invoiceNo = getCell(row, headers, 'Invoice No.')?.trim();
  const invoiceStatus = getCell(row, headers, 'Invoice Status')?.trim();
  const paid = getCell(row, headers, 'Paid?')?.trim().toUpperCase();

  if (paid === 'Y') return 'Paid';
  if (invoiceNo || invoiceStatus === 'Invoiced') return 'Billed';

  return 'Unbilled';
}

export default function DashboardPage() {
  const router = useRouter();
  const { role } = useUserProfile();
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary>({
    mainlineRevenue: 0,
    lateralRevenue: 0,
    jetterRevenue: 0,
    smokeRevenue: 0,
    dyeRevenue: 0,
    totalRevenue: 0,
    availableMonths: [],
    availableYears: [],

  });
  const normalizedRole = role ? String(role).trim().toLowerCase() : null;
  const canViewDashboard =
    normalizedRole === 'admin' || normalizedRole === 'management';
    const [billingCsv, setBillingCsv] = useState('');
    const [selectedServiceMonth, setSelectedServiceMonth] = useState('');
    const [selectedServiceYear, setSelectedServiceYear] = useState('');
    const [selectedBillingBucket, setSelectedBillingBucket] =
    useState<BillingBucket>('All');
    const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectCustomerSearch, setProjectCustomerSearch] = useState('');

  const [billingConnected, setBillingConnected] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [confirmedTotalRevenue, setConfirmedTotalRevenue] = useState(0);

  const [recentServices, setRecentServices] = useState<RecentService[]>([]);
  const [dashboardServiceEntries, setDashboardServiceEntries] = useState<DashboardServiceEntry[]>([]);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [duplicateProjectId, setDuplicateProjectId] = useState(false);
  const [checkingProjectId, setCheckingProjectId] = useState(false);
  const [projectIdCheckError, setProjectIdCheckError] = useState('');
  const [showCustomerBillingMethods, setShowCustomerBillingMethods] =
  useState(false);

  const [newCustomer, setNewCustomer] = useState(emptyCustomerForm);

  function getLocalDateInputValue() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  
    return formatter.format(new Date());
  }
  
  const today = getLocalDateInputValue();
  

  const [newProject, setNewProject] = useState({
    projectType: '',
    id: '',
    name: '',
    customerId: '',
    assignedToId: '',
    status: 'Scheduled',
    progress: 0,
    startdateofservice: today,
    projectLocation: '',
    notes: '',
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

  const projectCustomer = customers.find((customer) => customer.id === newProject.customerId);
  const projectCustomerType = projectCustomer?.customerType ?? '';
  const effectiveProjectType = projectCustomerType === 'Telecom' ? 'Telecom'
    : projectCustomerType === 'Sewer' && ['Residential', 'Commercial'].includes(newProject.projectType)
      ? newProject.projectType : '';


  function formatDate(value: string | undefined) {
    if (!value) return '';

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  useEffect(() => {
    if (!billingCsv) return;
  
    setRevenueSummary(
      revenueSummaryFromSheet(
        billingCsv,
        selectedServiceMonth,
        selectedServiceYear,
        selectedBillingBucket
      )
    );
  }, [billingCsv, selectedServiceMonth, selectedServiceYear, selectedBillingBucket]);

  useEffect(() => {
    if (!normalizedRole) return;
  
    if (normalizedRole !== 'admin' && normalizedRole !== 'management') {
      router.replace('/activework');
    }
  }, [normalizedRole, router]);
  
  


  const projectCustomerOptions = customers.filter((customer) => {
    const search = projectCustomerSearch.toLowerCase();

    return (
      customer.name.toLowerCase().includes(search) ||
      customer.contactName.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search)
    );
  });

  async function testBillingSheetConnection() {
    try {
      setBillingError('');
  
      const response = await fetch(BILLING_SHEET_CSV_URL);
      const csv = await response.text();
  
      console.log('Billing sheet status:', response.status);
      console.log('Billing sheet preview:', csv.slice(0, 500));
  
      if (!response.ok) {
        throw new Error(`Google Sheet request failed: ${response.status}`);
      }
  
      if (csv.trim().startsWith('<')) {
        throw new Error('Google returned an HTML page instead of CSV.');
      }
  
      const total = totalRevenueFromSheet(csv);
      setBillingCsv(csv);

      const summary = revenueSummaryFromSheet(
        csv,
        selectedServiceMonth,
        selectedServiceYear,
        selectedBillingBucket
      );
      setConfirmedTotalRevenue(total);
      setRevenueSummary(summary);

      setBillingConnected(true);
    } catch (error) {
      console.error('Billing sheet connection failed:', error);
      setBillingConnected(false);
      setBillingError(
        error instanceof Error ? error.message : 'Could not load billing sheet.'
      );
    }
  }

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
      console.error('Error loading dashboard projects:', error);
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

  useEffect(() => {
    if (!canViewDashboard) return;
  
    async function loadCustomers() {
      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, name, customer_type, contact_name, phone, email, address, main_pricing_type, lateral_pricing_type, jet_pricing_type, push_rod_pricing_type, dye_pricing_type, smoke_pricing_type, laborer_pricing_type, traffic_control_pricing_type, notes'
        )        
        .order('name');

      if (error) {
        console.error('Error loading customers:', error);
        return;
      }

      const formattedCustomers: Customer[] = (data ?? []).map((customer) => ({
        id: customer.id,
        name: customer.name,
        customerType: customer.customer_type ?? '',
        contactName: customer.contact_name ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        pricingModels: {
          MAIN: customer.main_pricing_type ?? '',
          LAT: customer.lateral_pricing_type ?? '',
          JET: customer.jet_pricing_type ?? '',
          PUSH: customer.push_rod_pricing_type ?? '',
          DYE: customer.dye_pricing_type ?? '',
          SMK: customer.smoke_pricing_type ?? '',
          LABOR: customer.laborer_pricing_type ?? '',
          TRFC: customer.traffic_control_pricing_type ?? '',
        },
        notes: customer.notes ?? '',
      }));

      setCustomers(formattedCustomers);
    }

    loadCustomers();
  }, [canViewDashboard]);

  useEffect(() => {
    if (!canViewDashboard) return;
  
    async function loadEmployees() {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role, active')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error loading employees:', error);
        return;
      }

      setEmployees(data ?? []);
    }

    loadEmployees();
  }, [canViewDashboard]);

  useEffect(() => {
    if (!canViewDashboard) return;
  
    loadProjects();
    loadRecentServices();
    loadDashboardServiceEntries();
    testBillingSheetConnection();
  }, [canViewDashboard]);

  async function loadDashboardServiceEntries() {
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
        residences,
        mainline_tests,
        flat_rate,
        notes,
        projects (
          project_number
        )
      `)
      .is('deleted_at', null)
      .order('work_date', { ascending: false });
  
    if (error) {
      console.error('Error loading dashboard service calendar:', error);
      return;
    }
  
    setDashboardServiceEntries((data ?? []) as unknown as DashboardServiceEntry[]);  }

  async function saveCustomer() {

    if (!canViewDashboard) return;

    if (
      !['Sewer', 'Telecom'].includes(newCustomer.customerType) ||
      !newCustomer.name.trim() ||
      !newCustomer.contactName.trim() ||
      !newCustomer.phone.trim() ||
      !newCustomer.email.trim() ||
      !newCustomer.address.trim() ||
      
      Object.values(newCustomer.pricingModels).some((value) => !value)
    ) {
      alert('Please complete all required customer fields.');
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: newCustomer.name,
        customer_type: newCustomer.customerType || null,
        contact_name: newCustomer.contactName,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        notes: newCustomer.notes,
        main_pricing_type: newCustomer.pricingModels.MAIN,
        lateral_pricing_type: newCustomer.pricingModels.LAT,
        jet_pricing_type: newCustomer.pricingModels.JET,
        push_rod_pricing_type: newCustomer.pricingModels.PUSH,
        dye_pricing_type: newCustomer.pricingModels.DYE,
        smoke_pricing_type: newCustomer.pricingModels.SMK,
        laborer_pricing_type: newCustomer.pricingModels.LABOR,
        traffic_control_pricing_type: newCustomer.pricingModels.TRFC,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving customer:', error);
      alert(error.message);
      return;
    }

    const customer: Customer = {
      id: data.id,
      name: data.name,
      customerType: data.customer_type ?? '',
      contactName: data.contact_name ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      notes: data.notes ?? '',
      pricingModels: {
        MAIN: data.main_pricing_type ?? '',
        LAT: data.lateral_pricing_type ?? '',
        JET: data.jet_pricing_type ?? '',
        PUSH: data.push_rod_pricing_type ?? '',
        DYE: data.dye_pricing_type ?? '',
        SMK: data.smoke_pricing_type ?? '',
        LABOR: data.laborer_pricing_type ?? '',
        TRFC: data.traffic_control_pricing_type ?? '',
      },
    };

    setCustomers(
      [...customers, customer].sort((a, b) => a.name.localeCompare(b.name))
    );

    setNewCustomer(emptyCustomerForm);
    setShowCustomerBillingMethods(false);
    setShowCustomerForm(false);
  }

  async function saveProject() {
    const projectId = newProject.id.trim();
  
    if (!projectId || !newProject.customerId) return;
    if (!effectiveProjectType) { alert(projectCustomerType === 'Sewer' ? 'Choose Residential or Commercial for this sewer project.' : 'Set this customer to Sewer or Telecom before creating a project.'); return; }
  
    setCheckingProjectId(true);
    setProjectIdCheckError('');
  
    try {
      const exists = await projectIdExists(projectId);
  
      if (exists) {
        setDuplicateProjectId(true);
        return;
      }
    } catch (error) {
      console.error('Error checking project ID before save:', error);
      setProjectIdCheckError(
        'Could not verify this project ID. Please try again.'
      );
      return;
    } finally {
      setCheckingProjectId(false);
    }
  
    const { error } = await supabase.from('projects').insert({
      project_number: projectId,
      project_type: effectiveProjectType,
      customer_id: newProject.customerId,
      assigned_to: newProject.assignedToId || null,
      status: newProject.status,
      progress: Number(newProject.progress),
      service_start_date: newProject.startdateofservice,
      project_location: newProject.projectLocation,
      notes: newProject.notes,
      billing_method_source: newProject.billingMethodSource,
main_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.mainPricingType
    : null,
lateral_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.lateralPricingType
    : null,
jet_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.jetPricingType
    : null,
push_rod_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.pushRodPricingType
    : null,
dye_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.dyePricingType
    : null,
smoke_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.smokePricingType
    : null,
laborer_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.laborerPricingType
    : null,
traffic_control_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.trafficControlPricingType
    : null,
    });

    if (error) {
      console.error('Error saving project:', error);
      alert(error.message);
      return;
    }

    setNewProject({
      projectType: '',
      id: '',
      name: '',
      customerId: '',
      assignedToId: '',
      status: 'Scheduled',
      progress: 0,
      startdateofservice: today,
      projectLocation: '',
      notes: '',
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

    setProjectCustomerSearch('');
    setShowProjectForm(false);
    loadProjects();
loadRecentServices();
loadDashboardServiceEntries();
testBillingSheetConnection();

  }

  async function projectIdExists(projectId: string) {
    const normalizedId = projectId.trim();
  
    if (!normalizedId) return false;
  
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .ilike('project_number', normalizedId)
      .limit(1);
  
    if (error) throw error;
  
    return (data?.length ?? 0) > 0;
  }
  
  useEffect(() => {
    const projectId = newProject.id.trim();
  
    if (!showProjectForm || !projectId) {
      setDuplicateProjectId(false);
      setCheckingProjectId(false);
      setProjectIdCheckError('');
      return;
    }
  
    let cancelled = false;
  
    const timeoutId = window.setTimeout(async () => {
      setCheckingProjectId(true);
      setProjectIdCheckError('');
  
      try {
        const exists = await projectIdExists(projectId);
  
        if (!cancelled) {
          setDuplicateProjectId(exists);
        }
      } catch (error) {
        console.error('Error checking project ID:', error);
  
        if (!cancelled) {
          setDuplicateProjectId(false);
          setProjectIdCheckError('Could not verify this project ID.');
        }
      } finally {
        if (!cancelled) {
          setCheckingProjectId(false);
        }
      }
    }, 400);
  
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [newProject.id, showProjectForm]);

  
  async function loadRecentServices() {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        id,
        work_date,
        work_completed,
        hours,
        feet,
        laterals,
        residences,
        mainline_tests,
        flat_rate,
        projects (
          project_number,
          customers ( name )
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(4);
  
    if (error) {
      console.error('Error loading recent services:', error);
      return;
    }
  
    const formattedServices: RecentService[] = (data ?? []).map((entry) => {
      const project = Array.isArray(entry.projects) ? entry.projects[0] : entry.projects;
      const customer = Array.isArray(project?.customers)
        ? project.customers[0]
        : project?.customers;
  
      const quantity =
        entry.hours != null ? `${entry.hours} hrs` :
        entry.feet != null ? `${entry.feet} ft` :
        entry.laterals != null ? `${entry.laterals} laterals` :
        entry.residences != null ? `${entry.residences} residences` :
        entry.mainline_tests != null ? `${entry.mainline_tests} tests` :
        entry.flat_rate ? 'Flat rate' :
        'No quantity';
  
      return {
        id: entry.id,
        projectNumber: project?.project_number ?? '',
        customerName: customer?.name ?? 'No customer saved',
        workDate: entry.work_date,
        workCompleted: entry.work_completed ?? 'Service',
        quantity,
      };
    });
  
    setRecentServices(formattedServices);
  }
  
  if (!normalizedRole) {
    return null;
  }
  
  if (!canViewDashboard) {
    return null;
  }

  return (
    <div className="space-y-6 pb-20 text-black">
    <DashboardSections
      actions={null}
      revenue={<>
    <AppRevenueSnapshot onProjectClassified={() => { void loadProjects(); }} />

    <div className="hidden">
    <div className="rounded-2xl bg-white p-4 shadow md:p-6">
    <div className="flex items-center justify-between gap-3">
  <h2 className="text-xl font-bold">Revenue Snapshot</h2>

  <button
    type="button"
    onClick={testBillingSheetConnection}
    className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
    aria-label="Refresh revenue snapshot"
    title="Refresh revenue snapshot"
  >
    ↻
  </button>
</div>
  <div className="mt-4">
    <DashboardFilters
      availableMonths={revenueSummary.availableMonths}
      availableYears={revenueSummary.availableYears}
      selectedServiceMonth={selectedServiceMonth}
      selectedServiceYear={selectedServiceYear}
      selectedBillingBucket={selectedBillingBucket}
      onServiceMonthChange={setSelectedServiceMonth}
      onServiceYearChange={setSelectedServiceYear}
      onBillingBucketChange={setSelectedBillingBucket}
    />
  </div>

  <div className="mt-4 border-t pt-3">
    <RevenueSnapshot summary={revenueSummary} />
  </div>
</div>
</div>
      </>}
      work={
        <div className="space-y-2">
          <DashboardServiceCalendar
            entries={dashboardServiceEntries}
            formatDate={formatDate}
          />
          <RecentActivity
            services={recentServices}
            formatDate={formatDate}
          />
        </div>
      }
    />

      {canViewDashboard && <DashboardQuickAdd
        modalOpen={showProjectForm || showCustomerForm}
        onProject={() => setShowProjectForm(true)}
        onCustomer={() => { setShowCustomerBillingMethods(false); setShowCustomerForm(true); }}
      />}

      {canViewDashboard && showCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
          <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Add Customer</h2>

            <div className="mt-4 grid flex-1 gap-4 overflow-y-auto pr-1">
              <input
                required
                type="text"
                placeholder="Customer name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <CustomerServiceTypePicker value={newCustomer.customerType}
                onChange={(customerType) => setNewCustomer((current) => ({ ...current, customerType }))} />

              <input
                required
                type="text"
                placeholder="Contact name"
                value={newCustomer.contactName}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    contactName: e.target.value,
                  })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="tel"
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="text"
                placeholder="Mailing address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <div className="rounded-lg border p-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowCustomerBillingMethods(!showCustomerBillingMethods)
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-medium">Billing Methods</span>

                  <span className="text-xl leading-none text-gray-500">
                    {showCustomerBillingMethods ? '⌄' : '›'}
                  </span>
                </button>

                {showCustomerBillingMethods && (
                  <div className="mt-3 grid gap-3">
                    {pricingModelOptions.map((option) => (
                      <div
                        key={option.code}
                        className="grid gap-2 md:grid-cols-[120px_1fr]"
                      >
                        <div className="flex items-baseline gap-2">
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs font-medium text-gray-500">
                            {option.code}
                          </p>
                        </div>

                        <select
                          value={newCustomer.pricingModels[option.code]}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              pricingModels: {
                                ...newCustomer.pricingModels,
                                [option.code]: e.target.value,
                              },
                            })
                          }
                          className={`rounded-lg border p-3 ${
                            newCustomer.pricingModels[option.code]
                              ? 'text-black'
                              : 'text-gray-400'
                          }`}
                        >
                          <option value="" disabled hidden>
                            Select pricing
                          </option>

                          {option.choices.map((choice) => (
                            <option
                              key={choice}
                              value={choice}
                              className="text-black"
                            >
                              {choice}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCustomerForm(false)}
                className="rounded-lg border px-5 py-3 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCustomer}
                className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-2xl font-bold">Add Project</h2>
    
          <div className="mt-4 grid min-w-0 flex-1 grid-cols-1 gap-4 overflow-x-hidden overflow-y-auto pr-1 md:grid-cols-2">              <div className="relative">
                <label className="mb-2 block text-sm font-medium">
                  Customer
                </label>

                <input
                  type="text"
                  placeholder="Start typing customer"
                  value={
                    newProject.customerId
                      ? customers.find(
                          (customer) => customer.id === newProject.customerId
                        )?.name ?? projectCustomerSearch
                      : projectCustomerSearch
                  }
                  onChange={(e) => {
                    setProjectCustomerSearch(e.target.value);
                    setNewProject({ ...newProject, customerId: '', projectType: '' });
                  }}
                  className="w-full rounded-lg border p-3"
                />

                {projectCustomerSearch && !newProject.customerId && (
                  <div className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                    {projectCustomerOptions.length > 0 ? (
                      projectCustomerOptions.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setNewProject({
                              ...newProject,
                              customerId: customer.id,
                              projectType: customer.customerType === 'Telecom' ? 'Telecom' : '',
                            });
                            setProjectCustomerSearch(customer.name);
                          }}
                          className="w-full border-b p-3 text-left hover:bg-gray-50"
                        >
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-500">
                            {customer.contactName} • {customer.phone}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-gray-500">
                        No matching customers found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
  <label className="mb-2 block text-sm font-medium">
    Project ID / PO Number
  </label>

  <input
    type="text"
    placeholder="Enter project ID or PO number"
    value={newProject.id}
    onChange={(e) =>
      setNewProject({ ...newProject, id: e.target.value })
    }
    aria-invalid={duplicateProjectId}
    aria-describedby="project-id-message"
    className={`w-full rounded-lg border p-3 outline-none ${
      duplicateProjectId
        ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200'
        : 'focus:ring-2 focus:ring-blue-200'
    }`}
  />

  <div id="project-id-message" className="mt-2 min-h-5 text-sm">
    {checkingProjectId && (
      <p className="text-gray-500">Checking project ID...</p>
    )}

    {!checkingProjectId && duplicateProjectId && (
      <p className="font-medium text-red-600">
        This project ID already exists. Enter a unique ID before saving.
      </p>
    )}

    {!checkingProjectId && projectIdCheckError && (
      <p className="font-medium text-red-600">
        {projectIdCheckError}
      </p>
    )}

    {!checkingProjectId &&
      newProject.id.trim() &&
      !duplicateProjectId &&
      !projectIdCheckError && (
        <p className="font-medium text-green-700">
          Project ID is available.
        </p>
      )}
  </div>
</div>

              <div className="md:col-span-2">
                {projectCustomerType === 'Telecom' ? <div className="rounded-lg border border-[#b8def0] bg-[#e8f7ff] p-3">
                  <p className="text-sm font-medium">Project type</p>
                  <div className="mt-2 flex items-center gap-2 text-[#16324f]"><RevenueServiceIcon value="Telecom" /><span>Telecom</span></div>
                  <p className="mt-1 text-xs text-gray-600">Automatically selected for this Telecom customer.</p>
                </div> : projectCustomerType === 'Sewer' ? <ProjectTypePicker value={newProject.projectType} onChange={(value) => setNewProject({ ...newProject, projectType: value })} />
                  : <p className="text-sm text-gray-600">{newProject.customerId ? 'Set the customer service type to Sewer or Telecom before adding this project.' : 'Select a customer to see the project type.'}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Project Location
                </label>
                <input
                  type="text"
                  placeholder="Enter project address or location"
                  value={newProject.projectLocation}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      projectLocation: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Assigned To
                </label>
                <select
                  value={newProject.assignedToId}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      assignedToId: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3"
                >
                  <option value="" disabled hidden>
                    Select Technician
                  </option>

                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Service Start Date (Est.)
                </label>
                <input
  type="date"
  value={newProject.startdateofservice}
  onChange={(e) =>
    setNewProject({
      ...newProject,
      startdateofservice: e.target.value,
    })
  }
  className="block w-full min-w-0 max-w-full appearance-none rounded-lg border p-3 text-sm"
/>

              </div>
              <div className="md:col-span-2">
  <label className="mb-2 block text-sm font-medium">
    Billing Method Source
  </label>

  <select
    value={newProject.billingMethodSource}
    onChange={(e) =>
      setNewProject({
        ...newProject,
        billingMethodSource: e.target.value,
      })
    }
    className="w-full rounded-lg border p-3"
  >
    <option value="customer">Customer</option>
    <option value="standard">Standard</option>
    <option value="project">Project Override</option>
  </select>
</div>

{newProject.billingMethodSource === 'project' && (
  <div className="min-w-0 max-w-full rounded-lg border p-3 md:col-span-2">
        <p className="text-sm font-medium">Project Override Billing Methods</p>

        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                {pricingModelOptions.map((option) => {
        const fieldMap = {
          MAIN: 'mainPricingType',
          LAT: 'lateralPricingType',
          JET: 'jetPricingType',
          PUSH: 'pushRodPricingType',
          DYE: 'dyePricingType',
          SMK: 'smokePricingType',
          LABOR: 'laborerPricingType',
          TRFC: 'trafficControlPricingType',
        } as const;

        const field = fieldMap[option.code];

        return (
<div key={option.code} className="grid min-w-0 gap-2">
              <div className="flex items-baseline gap-2">
  <p className="font-medium">{option.label}</p>
  <p className="text-xs font-medium text-gray-500">{option.code}</p>
</div>

            <select
              value={newProject[field]}
              onChange={(e) =>
                setNewProject({
                  ...newProject,
                  [field]: e.target.value,
                })
              }
              className={`box-border block w-full min-w-0 max-w-full rounded-lg border p-3 text-base ${
                newProject[field] ? 'text-black' : 'text-gray-400'
              }`}
            >
              <option value="" disabled hidden>
                Select billing method
              </option>

              {option.choices.map((choice) => (
                <option key={choice} value={choice} className="text-black">
                  {choice}
                </option>
              ))}
                                    </select>
          </div>
        );
      })}


    </div>
  </div>
)}

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="rounded-lg border px-5 py-3 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
  type="button"
  onClick={saveProject}
  disabled={
    duplicateProjectId ||
    checkingProjectId ||
    !newProject.id.trim() ||
    !newProject.customerId ||
    !effectiveProjectType
  }
  className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
>
  {checkingProjectId ? 'Checking...' : 'Save Project'}
</button>
            </div>
          </div>
        </div>
      )}
        </div>
  );
}

function DashboardFilters({
  availableMonths,
  availableYears,
  selectedServiceMonth,
  selectedServiceYear,
  selectedBillingBucket,
  onServiceMonthChange,
  onServiceYearChange,
  onBillingBucketChange,
}: {
  availableMonths: string[];
  availableYears: string[];
  selectedServiceMonth: string;
  selectedServiceYear: string;
  selectedBillingBucket: BillingBucket;
  onServiceMonthChange: (value: string) => void;
  onServiceYearChange: (value: string) => void;
  onBillingBucketChange: (value: BillingBucket) => void;
}) {
  const monthsForSelectedYear = selectedServiceYear
    ? availableMonths.filter((month) =>
        month.startsWith(`${selectedServiceYear}-`)
      )
    : availableMonths;

  function handleYearChange(value: string) {
    onServiceYearChange(value);

    if (
      selectedServiceMonth &&
      value &&
      !selectedServiceMonth.startsWith(`${value}-`)
    ) {
      onServiceMonthChange('');
    }
  }

  return (
<div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-center text-sm font-medium text-gray-600">
            Service Month
          </label>
  
          <select
            value={selectedServiceMonth}
            onChange={(event) => onServiceMonthChange(event.target.value)}
            className="w-full rounded-lg border bg-white p-2 text-sm"
          >
            <option value="">All months</option>
  
            {monthsForSelectedYear.map((month) => (
              <option key={month} value={month}>
                {formatMonthOnlyLabel(month)}
              </option>
            ))}
          </select>
        </div>
  
        <div>
          <label className="mb-1 block text-center text-sm font-medium text-gray-600">
            Service Year
          </label>
  
          <select
            value={selectedServiceYear}
            onChange={(event) => handleYearChange(event.target.value)}
            className="w-full rounded-lg border bg-white p-2 text-sm"
          >
            <option value="">All years</option>
  
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
  
      <div className="mt-3">
  <label className="mb-1 block text-center text-sm font-medium text-gray-600">
    Billing Status
  </label>

  <div className="grid grid-cols-4 gap-2">
    {(['All', 'Unbilled', 'Billed', 'Paid'] as BillingBucket[]).map(
      (bucket) => (
        <button
          key={bucket}
          type="button"
          onClick={() => onBillingBucketChange(bucket)}
          className={`rounded-lg border px-2 py-2 text-sm font-medium ${
            selectedBillingBucket === bucket
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {bucket}
        </button>
      )
    )}
  </div>
</div>
    </div>
  );
}

function RevenueSnapshot({ summary }: { summary: RevenueSummary }) {
  const items = [
    { label: 'Total Revenue', value: summary.totalRevenue },
    { label: 'Mainline', value: summary.mainlineRevenue },
    { label: 'Lateral', value: summary.lateralRevenue },
    { label: 'Jetter', value: summary.jetterRevenue },
    { label: 'Smoke', value: summary.smokeRevenue },
    { label: 'Dye', value: summary.dyeRevenue },
  ].filter((item) => item.label === 'Total Revenue' || item.value !== 0);

  return (
    <div className="rounded-xl border bg-white px-4 py-2 shadow-sm">
      {items.map((item) => (
  <div
    key={item.label}
    className={`flex items-center justify-between gap-4 py-1.5 ${
      item.label === 'Total Revenue' ? 'border-b pb-2' : ''
    }`}
  >
          <p
            className={`text-sm ${
              item.label === 'Total Revenue'
                ? 'font-semibold text-gray-900'
                : 'font-medium text-gray-700'
            }`}
          >
            {item.label}
          </p>

          <p
            className={`text-sm ${
              item.label === 'Total Revenue'
                ? 'font-bold text-gray-900'
                : 'font-semibold text-gray-900'
            }`}
          >
            {formatMoney(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function NeedsAttention({
  projects,
  formatDate,
}: {
  projects: Project[];
  formatDate: (value: string | undefined) => string;
}) {
  const needsAttention = projects
    .filter(
      (project) =>
        !project.assignedTo ||
        !project.projectLocation ||
        !project.latestServiceDate
    )
    .slice(0, 8);

  return (
    <div className="rounded-2xl bg-white p-4 shadow md:p-6">
      <h2 className="text-xl font-bold">Needs Attention</h2>

      <div className="mt-4 space-y-3">
        {needsAttention.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${encodeURIComponent(project.id)}?from=/dashboard&fromLabel=Dashboard`}
            className="block rounded-xl border p-4 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{project.id}</p>
                <p className="mt-1 text-sm text-gray-600">{project.customer}</p>
              </div>

              <span className="rounded-full border px-2 py-1 text-xs font-medium text-gray-600">
                {project.status}
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-sm text-gray-600">
              {!project.assignedTo && <p>Missing assigned tech</p>}
              {!project.projectLocation && <p>Missing project location</p>}
              {!project.latestServiceDate && <p>No service submitted yet</p>}
              {project.latestServiceDate && (
                <p>Latest service: {formatDate(project.latestServiceDate)}</p>
              )}
            </div>
          </Link>
        ))}

        {needsAttention.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
            No projects need attention.
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardServiceCalendar({
  entries,
  formatDate,
}: {
  entries: DashboardServiceEntry[];
  formatDate: (value: string | undefined) => string;
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(`${dashboardShopToday()}T00:00:00`));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(dashboardShopToday);
  const [calendarView, setCalendarView] = useState<'all' | 'service' | 'shop'>('all');
  const monthGesture = useRef<{ x: number; y: number; startedAt: number } | null>(null);
  const suppressDayClickUntil = useRef(0);

  function startMonthSwipe(event: TouchEvent<HTMLDivElement>) {
    monthGesture.current = null;
    if (event.touches.length !== 1) return;
    const target = event.target;
    if (target instanceof Element) {
      if (target.closest('a, input, select, textarea, [contenteditable="true"]')) return;
    }
    const touch = event.touches[0];
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
    monthGesture.current = { x: touch.clientX, y: touch.clientY, startedAt: Date.now() };
  }

  function moveMonthSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = monthGesture.current;
    if (!start || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { monthGesture.current = null; return; }
    // Avoid a synthesized date-cell click after a horizontal drag.
    if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.5) suppressDayClickUntil.current = Date.now() + 600;
  }

  function endMonthSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = monthGesture.current;
    monthGesture.current = null;
    if (!start || event.changedTouches.length !== 1 || event.touches.length !== 0) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy) * 1.5 || Date.now() - start.startedAt > 800) return;
    event.stopPropagation();
    suppressDayClickUntil.current = Date.now() + 600;
    changeCalendarMonth(dx < 0 ? 1 : -1);
  }

  const [shopEntries, setShopEntries] = useState<DashboardShopEntry[]>([]);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState('');
  const [shopRevision, setShopRevision] = useState(0);
  const [loadedShopMonth, setLoadedShopMonth] = useState('');
  const shopMonth = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;
  const showService = calendarView !== 'shop';
  const showShop = calendarView !== 'service';
  const shopReady = loadedShopMonth === shopMonth && !shopLoading && !shopError;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setShopLoading(true);
      setShopError('');
      setShopEntries([]);
      try {
        const range = dashboardShopMonth(shopMonth);
        const { data, error } = await supabase.rpc('get_dashboard_shop_work', {
          p_start: range.start, p_end: range.end,
        });
        if (error) throw error;
        if (!cancelled) {
          setShopEntries((data ?? []) as DashboardShopEntry[]);
          setLoadedShopMonth(shopMonth);
        }
      } catch (error) {
        if (!cancelled) setShopError(error instanceof Error ? error.message :
          (error as { message?: string })?.message || 'Could not load shop work.');
      } finally {
        if (!cancelled) setShopLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [shopMonth, shopRevision]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => setShopRevision((value) => value + 1), 250);
    };
    const channel = supabase.channel('dashboard-shop-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_work_entries' }, refresh)
      .subscribe((status) => {
        // Also catch changes made before subscription or during a reconnect.
        if (status === 'SUBSCRIBED') refresh();
      });
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, []);

  const visibleShopEntries = shopReady ? shopEntries : [];
  const shopCountByDate = visibleShopEntries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.work_date] = (counts[entry.work_date] ?? 0) + 1;
    return counts;
  }, {});
  const shopAreas = shopAreasByDate(visibleShopEntries);
  const selectedShopEntries = showShop
    ? visibleShopEntries.filter((entry) => entry.work_date === selectedCalendarDate)
    : [];

  function dateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function changeCalendarMonth(direction: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    setSelectedCalendarDate(null);
  }

  const calendarMonthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const serviceCountByDate = entries.reduce<Record<string, number>>(
    (counts, entry) => {
      counts[entry.work_date] = (counts[entry.work_date] ?? 0) + 1;
      return counts;
    },
    {}
  );

  function quantityLabelForEntry(entry: DashboardServiceEntry) {
    if (entry.hours !== null && entry.hours !== undefined) {
      return `${entry.hours} hrs`;
    }
  
    if (entry.feet !== null && entry.feet !== undefined) {
      return `${entry.feet} ft`;
    }
  
    if (entry.laterals !== null && entry.laterals !== undefined) {
      return `${entry.laterals} laterals`;
    }
  
    if (entry.residences !== null && entry.residences !== undefined) {
      return `${entry.residences} residences`;
    }
  
    if (entry.mainline_tests !== null && entry.mainline_tests !== undefined) {
      return `${entry.mainline_tests} tests`;
    }
  
    if (entry.flat_rate) {
      return 'Flat rate';
    }
  
    return 'No quantity';
  }

  const serviceHasZeroQuantityByDate = entries.reduce<Record<string, boolean>>(
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

  const selectedCalendarEntries = showService && selectedCalendarDate
    ? entries.filter((entry) => entry.work_date === selectedCalendarDate)
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
    const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const key = dateKey(dayDate);

    return {
      day,
      key,
      serviceCount: showService ? serviceCountByDate[key] ?? 0 : 0,
      shopCount: showShop ? shopCountByDate[key] ?? 0 : 0,
      areas: showShop ? shopAreas[key] ?? [] : [],
      hasZeroQuantity: showService && (serviceHasZeroQuantityByDate[key] ?? false),
      isToday: key === dashboardShopToday(),
    };
  });

  return (
    <div
      onClickCapture={(event) => {
        if (Date.now() < suppressDayClickUntil.current && event.target instanceof Element && event.target.closest('[data-calendar-days]')) {
          event.preventDefault(); event.stopPropagation();
        }
      }}
      style={{ touchAction: 'pan-y pinch-zoom' }}
      className="rounded-2xl bg-white p-4 shadow md:p-6">
      <div role="group" aria-label="Calendar work filter" className="grid grid-cols-3 gap-2">
        {([{ value: 'all', label: 'All Work' }, { value: 'service', label: 'Service' }, { value: 'shop', label: 'Shop' }] as const).map((view) => (
          <button key={view.value} type="button" aria-pressed={calendarView === view.value}
            onClick={() => setCalendarView(view.value)}
            className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-medium ${calendarView === view.value
              ? 'border-[#8fd8f7] bg-[#e8f7ff] text-[#007bb5]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
            {view.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-gray-600">
        {showService && <>
          <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded bg-[#009be5]" />Serviced</span>
          <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded bg-[repeating-linear-gradient(135deg,#f1faff_0,#f1faff_3px,#8fd8f7_3px,#8fd8f7_5px)]" />Holiday/Unable</span>
        </>}
        {showShop && <span className="flex items-center gap-1 text-[#16324f]"><span className="h-3.5 w-3.5 rounded bg-[#16324f]" />Shop Work</span>}
        <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded border bg-gray-50" />No submissions</span>
      </div>
      {showShop && shopError && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p role="alert" className="text-red-700">Shop submissions unavailable: {shopError}</p>
          {shopError && <button type="button" disabled={shopLoading} onClick={() => setShopRevision((value) => value + 1)}
            className="rounded-lg border px-3 py-2 font-medium hover:bg-gray-50 disabled:opacity-50">
            Retry shop
          </button>}
        </div>
      )}

<div
  data-dashboard-swipe-ignore
  style={{ touchAction: 'pan-y' }}
  onTouchStart={startMonthSwipe}
  onTouchMove={moveMonthSwipe}
  onTouchEnd={endMonthSwipe}
  onTouchCancel={() => {
    monthGesture.current = null;
  }}
>
  <div className="mt-4 flex items-center justify-center gap-3">        <button
          type="button"
          aria-label="Previous month"
          onClick={() => changeCalendarMonth(-1)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8def0] bg-[#e8f7ff] p-0 text-[#16324f] transition-colors hover:border-[#16324f] hover:bg-[#d9f0fc] active:bg-[#c5e8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]"
        >
          <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} className="block" />
        </button>

        <p aria-live="polite" className="min-w-[10rem] text-center text-sm font-bold text-gray-800">
          {calendarMonthLabel}
        </p>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => changeCalendarMonth(1)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8def0] bg-[#e8f7ff] p-0 text-[#16324f] transition-colors hover:border-[#16324f] hover:bg-[#d9f0fc] active:bg-[#c5e8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]"
        >
          <ChevronRight aria-hidden="true" size={22} strokeWidth={2.5} className="block" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-gray-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div data-calendar-days className="mt-2 grid grid-cols-7 gap-1">
        {calendarBlankDays.map((_, index) => (
          <div key={`blank-${index}`} className="aspect-square" />
        ))}

        {calendarDays.map((day) => {
          const hasService = day.serviceCount > 0;
          const hasShop = day.shopCount > 0;
          const isSelected = selectedCalendarDate === day.key;

          return (
            <button
              key={day.key}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${day.key}${showService ? `: ${day.serviceCount} service submissions` : ''}${showShop ? shopReady ? `; ${day.shopCount} shop submissions${day.areas.length ? `; ${day.areas.join(', ')}` : ''}` : '; shop submissions not loaded' : ''}`}
              onClick={() => setSelectedCalendarDate(isSelected ? null : day.key)}
              style={hasService && hasShop ? {
                backgroundImage: day.hasZeroQuantity
                  ? 'linear-gradient(135deg, transparent 50%, #16324f 50%), repeating-linear-gradient(135deg, #f1faff 0, #f1faff 7px, #8fd8f7 7px, #8fd8f7 9px)'
                  : 'linear-gradient(135deg, #009be5 50%, #16324f 50%)',
              } : undefined}
              className={`relative flex min-h-11 aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                hasService && hasShop ? 'text-white shadow-sm' : day.hasZeroQuantity
                  ? 'bg-[repeating-linear-gradient(135deg,#f1faff_0,#f1faff_7px,#8fd8f7_7px,#8fd8f7_9px)] text-[#005f8f] shadow-sm'
                  : hasService
                  ? 'bg-[#009be5] text-white shadow-sm'
                  : hasShop ? 'bg-[#16324f] text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              } ${isSelected ? 'ring-2 ring-black ring-offset-2' : ''} ${
                day.isToday && !isSelected ? 'ring-2 ring-[#009be5] ring-offset-1' : ''
              }`}
            >
              <span className={hasShop && day.hasZeroQuantity ? 'rounded bg-[#16324f] px-1' : undefined}>{day.day}</span>
            </button>
          );
        })}
            </div>

</div> {/* End of calendar month swipe area */}

  {selectedCalendarDate && (
        <div className="mt-4 rounded-xl border bg-gray-50 p-3">
          <p className="text-sm font-bold text-gray-900">
            {formatDate(selectedCalendarDate)}
          </p>

          <div className="mt-3 space-y-2">
          {selectedCalendarEntries.length > 0 && <h3 className="text-xs font-semibold uppercase text-[#007bb5]">Service</h3>}
          {selectedCalendarEntries.map((entry) => (
  <Link
    key={entry.id}
    href={`/projects/${encodeURIComponent(
      (Array.isArray(entry.projects)
  ? entry.projects[0]?.project_number
  : entry.projects?.project_number) || ''
    )}?from=/dashboard&fromLabel=Dashboard`}
    className="block rounded-lg border bg-white p-3 text-sm hover:bg-gray-50"
  >
    <div className="flex items-start justify-between gap-3">
  <div className="min-w-0">
    <p className="text-sm font-semibold text-gray-900">
      {(Array.isArray(entry.projects)
  ? entry.projects[0]?.project_number
  : entry.projects?.project_number) || 'Unknown Project'}
    </p>

    <p className="mt-1 text-xs text-gray-500">
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
  </Link>
))}
            {selectedShopEntries.length > 0 && <h3 className="pt-2 text-xs font-semibold uppercase text-[#16324f]">Shop Work</h3>}
            {selectedShopEntries.map((entry) => (
              <div key={`shop-${entry.id}`} className="rounded-lg border border-slate-200 bg-white p-3">
                {shopWorkCategories.some((area) => entry.categories?.includes(area)) && (
                  <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[#16324f]">
                    {shopWorkCategories.filter((area) => entry.categories?.includes(area)).map((area) => (
                      <span key={area} className="inline-flex items-center gap-1"><ShopAreaIcon area={area} className="h-4 w-4" />{area}</span>
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{entry.description}</p>
                <p className="mt-2 text-xs text-gray-500">Submitted by {entry.technician_name} · {new Date(entry.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' })} ET</p>
              </div>
            ))}
            {selectedCalendarEntries.length === 0 && selectedShopEntries.length === 0 && (!showShop || shopReady) && (
              <p className="text-sm text-gray-500">No {calendarView === 'all' ? 'work' : calendarView} submissions for this day.</p>
            )}
            {showShop && !shopReady && <p className="text-sm text-gray-500">{shopError ? 'Shop work could not be loaded. Retry above.' : 'Shop work is loading.'}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentActivity({
  services,
  formatDate,
}: {
  services: RecentService[];
  formatDate: (value: string | undefined) => string;
}) {
  const groupedServices = Object.entries(
    services.reduce<
      Record<
        string,
        {
          customerName: string;
          workDate: string;
          projectNumbers: string[];
          items: RecentService[];
        }
      >
    >((groups, service) => {
      const key = `${service.customerName}-${service.workDate}`;

      if (!groups[key]) {
        groups[key] = {
          customerName: service.customerName,
          workDate: service.workDate,
          projectNumbers: [],
          items: [],
        };
      }

      if (!groups[key].projectNumbers.includes(service.projectNumber)) {
        groups[key].projectNumbers.push(service.projectNumber);
      }

      groups[key].items.push(service);
      return groups;
    }, {})
  )
    .map(([, group]) => group)
    .sort((a, b) => b.workDate.localeCompare(a.workDate));

  return (
    <div className="rounded-2xl bg-white p-4 shadow md:p-6">
      <h2 className="sr-only">Recent Service Activity</h2>

      <div className="space-y-3">
        {groupedServices.map((group) => (
          <Link
            key={`${group.customerName}-${group.workDate}`}
            href={`/projects/${encodeURIComponent(
              group.projectNumbers[0]
            )}?from=/dashboard&fromLabel=Dashboard`}
            className="block rounded-xl border p-4 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{group.projectNumbers.join(', ')}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {group.customerName}
                </p>
              </div>

              <div className="shrink-0 text-right text-sm text-gray-500">
  <p className="font-medium">Service date</p>
  <p className="mt-1 font-semibold text-gray-700">
    {formatDate(group.workDate)}
  </p>
</div>
            </div>

            <div className="mt-3 space-y-2">
              {group.items.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  {service.workCompleted} • {service.quantity}
                </div>
              ))}
            </div>
          </Link>
        ))}

        {groupedServices.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
            No recent service activity.
          </div>
        )}
      </div>
    </div>
  );
}




function ProjectTable({
  title,
  projects,
  formatDate,
}: {
  title: string;
  projects: Project[];
  formatDate: (value: string | undefined) => string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow md:p-6">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="mt-4 space-y-3 md:hidden">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${encodeURIComponent(project.id)}?from=/dashboard&fromLabel=Dashboard`}
            className="block rounded-xl border p-4"
          >
           <div className="flex items-start justify-between gap-3">
  <div className="min-w-0">
    <h3 className="truncate font-bold">{project.id}</h3>
    <p className="mt-1 text-sm font-medium">{project.customer}</p>
  </div>

  <div className="shrink-0 text-right text-sm text-gray-500">
    <p className="font-medium">Latest service</p>
    <p className="mt-1 font-semibold text-gray-700">
      {project.latestServiceDate
        ? formatDate(project.latestServiceDate)
        : 'No service yet'}
    </p>
  </div>
</div>

            <div className="mt-3 grid gap-1 text-sm text-gray-600">
              {project.assignedTo && <p>Assigned: {project.assignedTo}</p>}
              {project.projectLocation && (
                <p>Location: {project.projectLocation}</p>
              )}
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
            No projects found.
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
                    href={`/projects/${encodeURIComponent(project.id)}`}
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
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DashboardShopEntry = {
  id: string;
  categories: string[];
  work_date: string;
  description: string;
  created_by: string;
  technician_name: string;
  created_at: string;
  updated_at: string;
};

function dashboardShopToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function dashboardShopMonth(month: string) {
  const [year, number] = month.split('-').map(Number);
  const next = new Date(year, number, 1);
  return {
    start: `${month}-01`,
    end: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
    blanks: new Date(year, number - 1, 1).getDay(),
    days: new Date(year, number, 0).getDate(),
    label: new Date(year, number - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}


const shopWorkCategories = ['Van', 'Truck', 'Misc'] as const;
type ShopWorkCategory = typeof shopWorkCategories[number];

function ShopAreaIcon({ area, className }: { area: ShopWorkCategory; className: string }) {
  if (area === 'Misc') return <Wrench aria-hidden="true" className={className} />;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {area === 'Van' ? (
        <>
          <path d="M2 16V4h12v12M14 8h4l4 5v5h-2M2 18h2M8 18h8M14 13h8" />
          <circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
        </>
      ) : (
        <>
          <path d="M2 17v-6h7V7h7l3 6h3v4h-2M8 17h8M2 17h2M9 11v2h10M13 7v6M2 13h7" />
          <circle cx="6" cy="17" r="2" /><circle cx="18" cy="17" r="2" />
        </>
      )}
    </svg>
  );
}

function shopAreasByDate(entries: { work_date: string; categories?: string[] | null }[]) {
  const areas: Record<string, Set<string>> = {};
  for (const entry of entries) {
    const dayAreas = areas[entry.work_date] ??= new Set<string>();
    for (const area of entry.categories ?? []) dayAreas.add(area);
  }
  return Object.fromEntries(Object.entries(areas).map(([date, dayAreas]) => [
    date, shopWorkCategories.filter((area) => dayAreas.has(area)),
  ]));
}



type AppRevenueSnapshotData = {
  total: number;
  has_unclassified_amounts: boolean;
  available_categories: string[];
  services: { service: string; amount: number; pending: number }[];
  issues: { entry_id: string; project_id: string; project_name: string; work_date: string; service: string; issue: string }[];
  available_years: number[];
  available_periods: { year: number; month: number }[];
  priced_count: number;
  excluded_count: number;
  calculated_at: string;
};
const appRevenueServiceNames = ['Mainline', 'Lateral', 'Jetter', 'Push Rod', 'Dye', 'Smoke', 'Laborer', 'Traffic Control'];
function appRevenueCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
}
function RevenueCategoryToggle({ label, selected, onToggle, icon }: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  icon: ReactNode;
}) {
  return <button type="button" aria-label={label} title={label}
    aria-pressed={selected} onClick={onToggle}
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5] ${
      selected ? 'border-[#16324f] bg-[#16324f] text-white' : 'border-[#b8def0] bg-[#e8f7ff] text-[#16324f] hover:bg-[#d5effc]'
    }`}>
    <span aria-hidden="true" className="inline-flex items-center justify-center [&_span]:text-inherit [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
  </button>;
}

function RevenueServiceIcon({ value }: { value: string | null | undefined }) {
  if (value !== 'Sewer' && value !== 'Telecom') return null;
  const label = value === 'Telecom' ? 'Telecom / Fiber' : 'Sewer';
  return <span role="img" aria-label={label} title={label} className="inline-flex shrink-0 items-center text-current">
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
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


function AppRevenueSnapshot({ onProjectClassified }: { onProjectClassified: () => void }) {
  const [today] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    return { year: parts.find((part) => part.type === 'year')!.value, month: String(Number(parts.find((part) => part.type === 'month')!.value)) };
  });
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState('');
  const [serviceSelections, setServiceSelections] = useState<string[]>([]);
  const [sewerTypes, setSewerTypes] = useState<string[]>([]);
  const [unknownSelected, setUnknownSelected] = useState(false);
  // Expand the Sewer parent into leaf categories, never a second revenue subtotal.
  const categories = useMemo(() => {
    const selected: string[] = [];
    if (serviceSelections.includes('Telecom')) selected.push('Telecom');
    if (serviceSelections.includes('Sewer')) {
      selected.push(...(sewerTypes.length ? sewerTypes : ['Residential', 'Commercial']));
    }
    if (unknownSelected) selected.push('Unclassified');
    return Array.from(new Set(selected));
  }, [serviceSelections, sewerTypes, unknownSelected]);
  const [data, setData] = useState<AppRevenueSnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [showIssues, setShowIssues] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    async function load(background = false) {
      if (inFlight) return;
      inFlight = true;
      if (!background) setLoading(true);
      try {
        const response = await supabase.rpc('get_dashboard_app_revenue_categories', { p_year: year ? Number(year) : null, p_month: year && month ? Number(month) : null, p_categories: categories });
        if (response.error) throw response.error;
        if (!response.data || !Array.isArray(response.data.services) || !Array.isArray(response.data.issues) || !Array.isArray(response.data.available_periods) || typeof response.data.has_unclassified_amounts !== 'boolean' || !Array.isArray(response.data.available_categories)) throw new Error('The revenue response was incomplete. Please retry.');
        if (!cancelled) {
          const next = response.data as AppRevenueSnapshotData;
          setData(next);
          setError('');
          if (year && !next.available_years.includes(Number(year))) {
            setYear(next.available_years.length ? String(Math.max(...next.available_years)) : '');
            setMonth('');
            setShowIssues(false);
          } else if (month && !next.available_periods.some((period) => period.year === Number(year) && period.month === Number(month))) {
            setMonth('');
            setShowIssues(false);
          }
        }
      } catch (failure) {
        if (!cancelled) setError((failure as { message?: string }).message || 'App revenue is unavailable.');
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(true); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('q:project-classification-updated', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('q:project-classification-updated', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [year, month, categories, revision]);
  const years = [...(data?.available_years ?? [])].sort((a, b) => b - a);
  const activeMonths = Array.from(new Set<number>(
    (data?.available_periods ?? [])
      .filter((period) => period.year === Number(year))
      .map((period) => period.month)
  )).sort((a, b) => b - a);
  const defaultYear = years.includes(Number(today.year)) ? today.year : years.length ? String(years[0]) : '';
  const filtersActive = categories.length > 0 || year !== defaultYear || month !== '';
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }));
  const names = [...appRevenueServiceNames, ...(data?.services.map((row) => row.service).filter((name) => !appRevenueServiceNames.includes(name)) ?? [])].filter((name) => data?.services.some((row) => row.service === name));
  const period = year ? `${month ? `${months[Number(month) - 1]} ` : ''}${year}` : 'All service dates';
  return <section aria-labelledby="app-revenue-heading" aria-busy={loading} className="rounded-2xl bg-white p-4 shadow md:p-6">
    <h2 tabIndex={-1} id="app-revenue-heading" className="sr-only">Revenue Snapshot</h2>
    <div className="grid grid-cols-2 gap-3">
      <label className="min-w-0 text-center text-sm font-medium">Year
        <select value={year} onChange={(event) => { setYear(event.target.value); setMonth(''); setShowIssues(false); }} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-center text-base [text-align-last:center]">
          <option value="">All years</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-center text-sm font-medium">Month
        <select disabled={!year} value={month} onChange={(event) => { setMonth(event.target.value); setShowIssues(false); }} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-center text-base [text-align-last:center] disabled:bg-gray-50 disabled:text-gray-500">
          <option value="">All months</option>{activeMonths.map((value) => <option key={value} value={value}>{months[value - 1]}</option>)}
        </select>
      </label>
    </div>
    <div className="mt-3">
      <div role="group" aria-label="Revenue categories" className="mx-auto flex w-max max-w-full flex-nowrap items-center gap-1 overflow-x-auto py-1">
        {(!data || data.available_categories.includes('Telecom') || serviceSelections.includes('Telecom')) && <RevenueCategoryToggle
          label="Telecom" selected={serviceSelections.includes('Telecom')}
          onToggle={() => { setServiceSelections((current) => current.includes('Telecom') ? current.filter((type) => type !== 'Telecom') : [...current, 'Telecom']); setShowIssues(false); }}
          icon={<RevenueServiceIcon value="Telecom" />} />}
        {(!data || data.available_categories.some((type) => ['Residential', 'Commercial'].includes(type)) || serviceSelections.includes('Sewer')) && <RevenueCategoryToggle
          label="Sewer — expand Residential and Commercial filters" selected={serviceSelections.includes('Sewer')}
          onToggle={() => {
            if (serviceSelections.includes('Sewer')) { setServiceSelections((current) => current.filter((type) => type !== 'Sewer')); setSewerTypes([]); }
            else setServiceSelections((current) => [...current, 'Sewer']);
            setShowIssues(false);
          }} icon={<RevenueServiceIcon value="Sewer" />} />}
        {serviceSelections.includes('Sewer') && <div role="group" aria-label="Sewer project type" className="ml-1 inline-flex shrink-0 items-center gap-1 border-l border-[#b8def0] pl-2">
          {['Residential', 'Commercial'].filter((type) => sewerTypes.includes(type) || !data || data.available_categories.includes(type)).map((type) => <RevenueCategoryToggle key={type}
            label={type === 'Residential' ? 'Residential Sewer' : 'Commercial Sewer'} selected={sewerTypes.includes(type)}
            onToggle={() => { setSewerTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); setShowIssues(false); }}
            icon={<ProjectTypeIcon value={type} />} />)}
        </div>}
        {(unknownSelected || data?.has_unclassified_amounts) && <RevenueCategoryToggle label="Unclassified" selected={unknownSelected}
          onToggle={() => { setUnknownSelected((current) => !current); setShowIssues(false); }}
          icon={<span className="font-semibold">?</span>} />}
      </div>
      <div className="flex justify-center"><UnclassifiedProjectsModal onSaved={onProjectClassified} /></div>
      <div className="relative mt-1 flex min-h-11 items-center justify-center pl-12 pr-12">
      <p aria-live="polite" className="w-full min-w-0 truncate text-center text-xs text-gray-600">
        {categories.length ? [
          ...(serviceSelections.includes('Telecom') ? ['Telecom'] : []),
          ...(serviceSelections.includes('Sewer') ? [sewerTypes.length === 1 ? `${sewerTypes[0]} Sewer` : 'All Sewer'] : []),
          ...(unknownSelected ? ['Unclassified'] : []),
        ].join(' + ') : 'All revenue'}
      </p>
      <button type="button" disabled={!filtersActive || !data} aria-hidden={!filtersActive || !data}
        aria-label="Reset all revenue filters"
        onClick={() => {
          setServiceSelections([]); setSewerTypes([]); setUnknownSelected(false);
          setYear(defaultYear); setMonth(''); setShowIssues(false);
        }}
        className={`absolute right-0 top-1/2 inline-flex h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg px-1 text-xs font-medium text-[#007bb5] hover:underline ${filtersActive && data ? '' : 'invisible'}`}>
        Reset
      </button>
      </div>

    </div>
    {loading && data && <span role="status" className="sr-only">Updating revenue.</span>}
    {loading && !data ? <p role="status" className="mt-4 text-sm text-gray-600">Loading revenue…</p> : error ? <div className="mt-4">
      <p role="alert" className="break-words text-sm text-red-700">{error}</p>
      <button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 min-h-11 rounded-lg border px-3 py-2 text-sm">Retry</button>
    </div> : data && <>
      <div className="mt-4 rounded-xl bg-[#e8f7ff] p-4 text-center">
        <p className="text-xs font-medium uppercase text-gray-600">Estimated Billable Revenue · {period}</p>
        <p className="mt-1 break-words text-3xl font-bold">{appRevenueCurrency(data.total)}</p>
        {data.issues.length > 0 ? <p className="mt-2 text-sm text-amber-900">Partial estimate · {data.issues.length} {data.issues.length === 1 ? 'submission needs' : 'submissions need'} pricing or review. These submissions are excluded from revenue.</p> : data.priced_count === 0 && <p className="mt-2 text-sm text-gray-600">No priced service submissions match these filters.</p>}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {names.map((name) => {
          const row = data.services.find((service) => service.service === name);
          return <div key={name} className="flex min-w-0 items-start justify-between gap-3 rounded-lg border px-3 py-3 text-sm">
            <span className="min-w-0 break-words font-medium">{name}</span>
            <div className="min-w-0 text-right"><p className="break-words font-semibold">{appRevenueCurrency(row?.amount ?? 0)}</p>{!!row?.pending && <p className="mt-1 text-xs text-amber-800">Partial · {row.pending} need review</p>}</div>
          </div>;
        })}
      </div>
      {data.issues.length > 0 && <div className="mt-3">
        <button type="button" aria-expanded={showIssues} aria-controls="app-revenue-issues" onClick={() => setShowIssues((value) => !value)} className="min-h-11 w-full rounded-lg px-3 py-2 text-sm font-semibold text-[#007bb5] hover:bg-[#e8f7ff]">
          {showIssues ? 'Hide' : 'View'} pricing issues ({data.issues.length}) {showIssues ? '▴' : '▾'}
        </button>
        {showIssues && <ul id="app-revenue-issues" className="mt-2 space-y-2">
          {data.issues.map((issue) => <li key={issue.entry_id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <Link href={`/projects/${issue.project_id}`} className="inline-flex min-h-11 items-center break-words font-semibold text-[#007bb5] underline">{issue.project_name || 'Open project'}</Link>
            <p className="font-medium">{new Date(`${issue.work_date}T00:00:00`).toLocaleDateString('en-US')} · {issue.service}</p>
            <p className="mt-1 break-words text-amber-900">{issue.issue || 'Review this submission’s quantity and applicable rate.'}</p>
          </li>)}
        </ul>}
      </div>}
      <p className="mt-3 text-xs text-gray-500">Updated {new Date(data.calculated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · Updates automatically while this page is open.</p>
    </>}
  </section>;
}

function ProjectTypeIcon({ value }: { value: string | null | undefined }) {
 if(value!=='Commercial'&&value!=='Residential')return null;
 return <span role="img" aria-label={value} title={value} className="inline-flex shrink-0 text-[#16324f]">
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
   {value==='Residential'?<><path d="M3 11L12 3l9 8M5 10v11h14V10M9 21v-7h6v7"/></>:<><rect x="5" y="2" width="14" height="20" rx="1"/><path d="M9 6h1m4 0h1M9 10h1m4 0h1M9 14h1m4 0h1M10 22v-4h4v4"/></>}
  </svg>
 </span>;
}
function ProjectTypePicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}) {
 return <fieldset disabled={disabled} className="min-w-0"><legend className="mb-2 text-sm font-medium">Project type</legend>
  <div className="grid grid-cols-2 gap-2">{['Commercial','Residential'].map(type=><label key={type} className={`flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm focus-within:ring-2 focus-within:ring-[#009be5] ${value===type?'border-[#009be5] bg-[#e8f7ff] text-[#16324f]':'bg-white text-gray-700'} ${disabled?'opacity-50':''}`}>
   <input type="radio" name="project-type" value={type} checked={value===type} onChange={()=>onChange(type)} required className="sr-only"/>
   <ProjectTypeIcon value={type}/><span>{type}</span>
  </label>)}</div>
 </fieldset>;
}


type UnclassifiedProjectRow = {
  id: string;
  projectNumber: string;
  location: string;
  customerName: string;
  customerType: string;
};

function UnclassifiedProjectsModal({ onSaved }: { onSaved: () => void }) {
  const { role } = useUserProfile();
  const canClassify = ['admin', 'management'].includes(String(role ?? '').trim().toLowerCase());
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UnclassifiedProjectRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, 'Residential' | 'Commercial'>>({});

  const reload = useCallback(async () => {
    if (!canClassify) return;
    setLoading(true);
    try {
      // Load a small batch; reloading after a save brings in the next project.
      const { data, error, count } = await supabase.from('projects')
        .select('id, project_number, project_location, customers(name,customer_type)', { count: 'exact' })
        .or('project_type.is.null,project_type.eq.')
        .order('project_number').order('id').limit(25);
      if (error) throw error;
      setRows((data ?? []).map((row) => {
        const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        return { id: row.id, projectNumber: row.project_number || 'Project',
          location: row.project_location ?? '', customerName: customer?.name ?? '', customerType: customer?.customer_type ?? '' };
      }));
      setCount(count ?? 0);
      setError('');
    } catch (failure) {
      setError((failure as { message?: string }).message || 'Could not load unclassified projects.');
    } finally { setLoading(false); }
  }, [canClassify]);

  useEffect(() => {
    if (!canClassify) return;
    void reload();
    const refresh = () => { if (document.visibilityState === 'visible' && !busy.current) void reload(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [canClassify, reload]);

  useEffect(() => {
    if (!open || !canClassify) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.current?.close(); document.body.style.overflow = oldOverflow; };
  }, [open, canClassify]);

  function close() {
    if (busy.current) return;
    setOpen(false);
    setDrafts({});
    setNotice('');
    window.requestAnimationFrame(() => {
      // The link disappears when the last project is classified.
      if (returnFocus.current) returnFocus.current.focus();
      else document.getElementById('app-revenue-heading')?.focus();
    });
  }

  async function confirm(row: UnclassifiedProjectRow) {
    const type = row.customerType === 'Telecom' ? 'Telecom' : row.customerType === 'Sewer' ? drafts[row.id] : '';
    if (!canClassify || !type || busy.current) return;
    busy.current = true;
    setSaving(row.id); setError(''); setNotice('');
    try {
      // Keep existing row-level permissions and do not overwrite another user's classification.
      const { data, error } = await supabase.from('projects')
        .update({ project_type: type }).eq('id', row.id)
        .or('project_type.is.null,project_type.eq.').select('id').maybeSingle();
      if (error) throw error;
      if (!data) {
        await reload();
        throw new Error('This project may already be classified, or you may not have permission. The list has been refreshed.');
      }
      setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next; });
      setNotice(`${row.projectNumber} classified as ${type}.`);
      await reload();
      onSaved();
      window.dispatchEvent(new Event('q:project-classification-updated'));
    } catch (failure) {
      setError((failure as { message?: string }).message || 'Classification could not be saved. Please retry.');
    } finally { busy.current = false; setSaving(null); }
  }

  if (!canClassify) return null;
  return <>
    {(count > 0 || error) && <button ref={returnFocus} type="button"
      onClick={() => { setOpen(true); setNotice(''); void reload(); }}
      className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
      <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-orange-400 text-orange-800">?</span>
      {count > 0 ? `Unclassified projects (${count})` : 'Review project classifications'}
      <span aria-hidden="true">→</span>
    </button>}
    <dialog ref={dialog} aria-labelledby="unclassified-projects-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border bg-white p-0 text-black shadow-xl backdrop:bg-black/40">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div><h2 id="unclassified-projects-title" className="text-lg font-bold">Unclassified projects</h2>
          <p className="mt-1 text-xs text-gray-600">{count} remaining</p></div>
        <button type="button" disabled={!!saving} onClick={close} aria-label="Close classification modal"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-xl disabled:opacity-50">×</button>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gray-600">Telecom customers use Telecom. For Sewer customers, choose Residential or Commercial.</p>
        {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <p>{error}</p><button type="button" disabled={!!saving} onClick={() => void reload()} className="mt-1 min-h-11 underline">Retry loading</button>
        </div>}
        {loading && <p role="status" className="text-sm text-gray-600">Refreshing projects…</p>}
        {!loading && !error && count === 0 && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">All projects are classified.</p>}
        {rows.map((row) => <article key={row.id} className="rounded-xl border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{row.projectNumber}</h3>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">Unclassified</span>
          </div>
          {row.customerName && <p className="mt-1 break-words text-sm text-gray-600">{row.customerName}</p>}
          {row.location && <p className="mt-1 break-words text-sm text-gray-600">{row.location}</p>}
          {row.customerType === 'Telecom' ? <div className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-[#b8def0] bg-[#e8f7ff] px-3 text-sm text-[#16324f]"><RevenueServiceIcon value="Telecom" />Telecom · automatically selected</div>
            : row.customerType === 'Sewer' ? <div role="group" aria-label={`Project type for ${row.projectNumber}`} className="mt-3 grid grid-cols-2 gap-2">
              {(['Residential', 'Commercial'] as const).map((type) => <button key={type} type="button"
                disabled={!!saving || loading} aria-pressed={drafts[row.id] === type}
                onClick={() => setDrafts((current) => ({ ...current, [row.id]: type }))}
                className={`flex min-h-11 min-w-0 flex-wrap items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm disabled:opacity-50 ${drafts[row.id] === type ? 'border-[#16324f] bg-[#16324f] text-white' : 'border-[#b8def0] bg-[#e8f7ff] text-[#16324f]'}`}>
                <span aria-hidden="true" className="inline-flex [&_span]:text-inherit"><ProjectTypeIcon value={type} /></span>{type}
              </button>)}
            </div> : <p className="mt-3 text-sm text-amber-900">Set this customer&apos;s service type before classifying the project.</p>}
          <div className="mt-3 flex justify-end"><button type="button" disabled={(row.customerType !== 'Telecom' && (row.customerType !== 'Sewer' || !drafts[row.id])) || !!saving || loading}
            onClick={() => void confirm(row)} className="min-h-11 rounded-lg bg-[#16324f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            {saving === row.id ? 'Saving…' : 'Confirm'}
          </button></div>
        </article>)}
        {!loading && count > rows.length && <p className="text-xs text-gray-600">Showing {rows.length} of {count}. More projects appear as you classify these.</p>}
      </div>
    </dialog>
  </>;
}


function CustomerServiceTypePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <fieldset><legend className="mb-2 text-sm font-medium">Customer service type</legend>
    <div className="grid grid-cols-2 gap-2">{['Sewer', 'Telecom'].map((type) => <button key={type} type="button"
      aria-pressed={value === type} onClick={() => onChange(type)}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium ${value === type ? 'border-[#16324f] bg-[#16324f] text-white' : 'border-[#b8def0] bg-[#e8f7ff] text-[#16324f]'}`}>
      <span aria-hidden="true" className="inline-flex [&_span]:text-inherit"><RevenueServiceIcon value={type} /></span>{type}
    </button>)}</div>
  </fieldset>;
}


type DashboardSection = 'revenue' | 'work';

function DashboardSections({ revenue, work, actions }: { revenue: ReactNode; work: ReactNode; actions: ReactNode }) {
  const [active, setActive] = useState<DashboardSection>('revenue');
  const [swipeProgress, setSwipeProgress] = useState(0);
  const carouselPosition = Math.max(0, Math.min(1, (active === 'work' ? 1 : 0) + swipeProgress));
  const [tileHeight, setTileHeight] = useState<number | undefined>();
  const slides = useRef<Partial<Record<DashboardSection, HTMLDivElement | null>>>({});
  const dots = useRef<Partial<Record<DashboardSection, HTMLButtonElement | null>>>({});
  const gesture = useRef<{ x: number; y: number; startedAt: number } | null>(null);
  const scrollPositions = useRef<Record<DashboardSection, number>>({ revenue: 0, work: 0 });
  const pendingScroll = useRef<number | null>(null);
  const items = [{ id: 'revenue', label: 'Revenue Snapshot' }, { id: 'work', label: 'Work Calendar' }] as const;

  function select(next: DashboardSection, focus = false) {
    if (next !== active) {
      scrollPositions.current[active] = window.scrollY;
      pendingScroll.current = scrollPositions.current[next];
      // Keep focus outside an inactive, inert slide.
      if (slides.current[active]?.contains(document.activeElement)) focus = true;
      setActive(next);
    }
    if (focus) dots.current[next]?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    const slide = slides.current[active];
    if (!slide) return;
    const measure = () => {
      const height = Math.ceil(slide.getBoundingClientRect().height);

const minimumHeight =
  window.innerHeight -
  slide.getBoundingClientRect().top -
  24;

const nextHeight = Math.max(height, minimumHeight);

setTileHeight((current) =>
  current === nextHeight ? current : nextHeight
);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(slide);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [active]);

  useEffect(() => {
    if (pendingScroll.current === null) return;
    const position = pendingScroll.current;
    pendingScroll.current = null;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: position, behavior: 'auto' }));
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  function startSwipe(event: TouchEvent<HTMLDivElement>) {
    gesture.current = null;
    setSwipeProgress(0);
    if (event.touches.length !== 1 || document.querySelector('dialog[open]')) return;
    const target = event.target;
    if (target instanceof Element && target.closest('[data-dashboard-swipe-ignore], input, select, textarea, dialog, [contenteditable="true"]')) return;
    const touch = event.touches[0];
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
    gesture.current = { x: touch.clientX, y: touch.clientY, startedAt: Date.now() };
  }
  function moveSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
      gesture.current = null; setSwipeProgress(0); return;
    }
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const width = Math.max(1, event.currentTarget.getBoundingClientRect().width);
      const progress = -dx / width;
      setSwipeProgress(active === 'revenue' ? Math.max(0, Math.min(1, progress)) : Math.min(0, Math.max(-1, progress)));
    }
  }
  function endSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = gesture.current;
    gesture.current = null;
    setSwipeProgress(0);
    if (!start || event.changedTouches.length !== 1 || event.touches.length !== 0) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) <= Math.abs(dy) * 1.5 || Date.now() - start.startedAt > 800) return;
    if (dx < 0 && active === 'revenue') select('work');
    if (dx > 0 && active === 'work') select('revenue');
  }

  return <div>
    {actions}
    <div
  role="region"
  aria-roledescription="carousel"
  aria-label="Dashboard tiles"
>
      <div className="mb-2">
        <div className="relative h-11 overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className={`absolute inset-y-0 flex w-max items-center whitespace-nowrap text-sm font-semibold text-[#16324f] motion-reduce:transition-none ${swipeProgress ? '' : 'transition-[opacity,left] duration-300 ease-out'}`}
              style={{ opacity: 1 - carouselPosition * 0.72, left: `${50 * (1 - carouselPosition)}%`, transform: 'translateX(-50%)' }}>Revenue Snapshot</span>
            <span className={`absolute inset-y-0 flex w-max items-center whitespace-nowrap text-sm font-semibold text-[#16324f] motion-reduce:transition-none ${swipeProgress ? '' : 'transition-[opacity,left] duration-300 ease-out'}`}
              style={{ opacity: 0.28 + carouselPosition * 0.72, left: `${100 - carouselPosition * 50}%`, transform: 'translateX(-50%)' }}>Work Calendar</span>
          </div>
          <button type="button" disabled={active === 'revenue'} onClick={() => select('revenue')}
            aria-label="Show previous tile: Revenue Snapshot"
            className={`absolute left-0 top-0 h-11 w-14 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5] ${active === 'revenue' ? 'invisible' : ''}`} />
          <button type="button" disabled={active === 'work'} onClick={() => select('work')}
            aria-label="Show next tile: Work Calendar"
            className={`absolute right-0 top-0 h-11 w-14 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5] ${active === 'work' ? 'invisible' : ''}`} />
        </div>
        <p className="sr-only" aria-live="polite">{active === 'revenue' ? 'Revenue Snapshot' : 'Work Calendar'}</p>
        <div className="-mt-1 flex items-center justify-center" role="group" aria-label="Choose dashboard tile">
            {items.map((item) => <button key={item.id} type="button"
              ref={(element) => { dots.current[item.id] = element; }}
              aria-label={`Show ${item.label}`} aria-current={active === item.id ? 'true' : undefined}
              aria-controls={`dashboard-tile-${item.id}`} onClick={() => select(item.id)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                select(event.key === 'Home' || event.key === 'ArrowLeft' ? 'revenue' : 'work', true);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5]">
              <span aria-hidden="true" className={`h-2.5 rounded-full ${active === item.id ? 'w-6 bg-[#009be5]' : 'w-2.5 bg-gray-300'}`} />
            </button>)}
        </div>
      </div>
      <p className="sr-only">Swipe left for Work Calendar, right for Revenue Snapshot, or use the position buttons. Calendar gestures stay within the calendar.</p>
      <div
  className="overflow-hidden"
  style={{ height: tileHeight, touchAction: 'pan-y' }}
  onTouchStart={startSwipe}
  onTouchMove={moveSwipe}
  onTouchEnd={endSwipe}
  onTouchCancel={() => {
    gesture.current = null;
    setSwipeProgress(0);
  }}
>       <div className={`flex items-start gap-2 motion-reduce:transition-none ${swipeProgress ? '' : 'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out'}`}
          style={{ transform: `translateX(calc(${-carouselPosition * 100}% + ${carouselPosition * 32}px))` }}>
          {items.map((item, index) => <div key={item.id}
            ref={(element) => {
              slides.current[item.id] = element;
              if (element) { if (active === item.id) element.removeAttribute('inert'); else element.setAttribute('inert', ''); }
            }}
            id={`dashboard-tile-${item.id}`} role="group" aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}: ${item.label}`}
            aria-hidden={active !== item.id}
            className="min-w-0 shrink-0 grow-0 basis-[calc(100%_-_20px)]">
            {item.id === 'revenue' ? revenue : work}
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}


function DashboardQuickAdd({ modalOpen, onProject, onCustomer }: {
  modalOpen: boolean;
  onProject: () => void;
  onCustomer: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => {
      setScrolling(true);
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), 400);
    };
    // Capture also handles scrolling within dashboard panels.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const [otherDialogOpen, setOtherDialogOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // Native dialogs (for example project classification) also hide the launcher.
  useEffect(() => {
    const check = () => setOtherDialogOpen(!!document.querySelector('dialog[open]'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (modalOpen || otherDialogOpen) setOpen(false);
  }, [modalOpen, otherDialogOpen]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => container.current?.querySelector<HTMLButtonElement>('#dashboard-quick-add-actions button')?.focus());
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  if (modalOpen || otherDialogOpen) return null;
  const faded = scrolling && !open;
  return <div ref={container} className={`fixed bottom-[calc(env(safe-area-inset-bottom)_+_1rem)] right-4 z-30 flex flex-col items-end gap-3 transition-opacity duration-200 motion-reduce:transition-none md:right-8 ${faded ? 'opacity-25' : 'opacity-100'}`}>
    {open && <div id="dashboard-quick-add-actions" role="group" aria-label="Add to dashboard"
      className="flex w-52 flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-2 text-black shadow-xl">
      <button type="button" onClick={() => { setOpen(false); onProject(); }}
        className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#e8f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5]">
        <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e8f7ff] text-[#007bb5]"><Plus size={18} strokeWidth={2.25} className="block shrink-0" /></span>
        Add Project
      </button>
      <button type="button" onClick={() => { setOpen(false); onCustomer(); }}
        className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-[#e8f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5]">
        <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e8f7ff] text-[#007bb5]"><Plus size={18} strokeWidth={2.25} className="block shrink-0" /></span>
        Add Customer
      </button>
    </div>}
    <button ref={trigger} type="button" aria-label={open ? 'Close add options' : 'Add project or customer'}
      aria-expanded={open} aria-controls="dashboard-quick-add-actions"
      onClick={() => setOpen((current) => !current)}
      className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-0 bg-[#16324f] p-0 text-white shadow-lg hover:bg-[#10263d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]">
      {open ? <X aria-hidden="true" size={28} strokeWidth={2.25} className="block shrink-0" /> : <Plus aria-hidden="true" size={28} strokeWidth={2.25} className="block shrink-0" />}
    </button>
  </div>;
}
