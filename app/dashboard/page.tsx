'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  DYE?: string;
  SMK?: string;
  TRFC?: string;
};


type Customer = {
  id: string;
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
  DYE: '',
  SMK: '',
  TRFC: '',
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
    code: 'DYE',
    label: 'Dye',
    choices: ['Per Hour'],
  },
  {
    code: 'SMK',
    label: 'Smoke',
    choices: ['Per Hour', 'Per Mainline Test', 'Per Residence'],
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
  const [showCustomerBillingMethods, setShowCustomerBillingMethods] =
  useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    pricingModels: emptyPricingModels,
  });

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
dyePricingType: '',
smokePricingType: '',
trafficControlPricingType: '',
  });


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
          'id, name, contact_name, phone, email, address, main_pricing_type, lateral_pricing_type, jet_pricing_type, dye_pricing_type, smoke_pricing_type, traffic_control_pricing_type, notes'
        )        
        .order('name');

      if (error) {
        console.error('Error loading customers:', error);
        return;
      }

      const formattedCustomers: Customer[] = (data ?? []).map((customer) => ({
        id: customer.id,
        name: customer.name,
        contactName: customer.contact_name ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        pricingModels: {
          MAIN: customer.main_pricing_type ?? '',
          LAT: customer.lateral_pricing_type ?? '',
          JET: customer.jet_pricing_type ?? '',
          DYE: customer.dye_pricing_type ?? '',
          SMK: customer.smoke_pricing_type ?? '',
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
    if (
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
        contact_name: newCustomer.contactName,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        main_pricing_type: newCustomer.pricingModels.MAIN,
        lateral_pricing_type: newCustomer.pricingModels.LAT,
        jet_pricing_type: newCustomer.pricingModels.JET,
        dye_pricing_type: newCustomer.pricingModels.DYE,
        smoke_pricing_type: newCustomer.pricingModels.SMK,
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
      contactName: data.contact_name ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      pricingModels: {
        MAIN: data.main_pricing_type ?? '',
        LAT: data.lateral_pricing_type ?? '',
        JET: data.jet_pricing_type ?? '',
        DYE: data.dye_pricing_type ?? '',
        SMK: data.smoke_pricing_type ?? '',
        TRFC: data.traffic_control_pricing_type ?? '',
      },
      notes: data.notes ?? '',
    };

    setCustomers([...customers, customer]);

    setNewCustomer({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',

      pricingModels: emptyPricingModels,
    });

    setShowCustomerForm(false);
  }

  async function saveProject() {
    if (!newProject.id.trim() || !newProject.customerId) return;

    const { error } = await supabase.from('projects').insert({
      project_number: newProject.id,
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
dye_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.dyePricingType
    : null,
smoke_pricing_type:
  newProject.billingMethodSource === 'project'
    ? newProject.smokePricingType
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
      dyePricingType: '',
      smokePricingType: '',
      trafficControlPricingType: '',
    });

    setProjectCustomerSearch('');
    setShowProjectForm(false);
    loadProjects();
loadRecentServices();
loadDashboardServiceEntries();
testBillingSheetConnection();

  }

  
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
    <div className="space-y-6 text-black">
      <div className="space-y-3">
        <p className="text-center text-sm text-gray-600">
          Snapshot of active and scheduled work.
        </p>
  
        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
  

          <button
            type="button"
            onClick={() => setShowProjectForm(true)}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
          >
            + Add Project
          </button>

          <button
            type="button"
onClick={() => {
  setShowCustomerBillingMethods(false);
  setShowCustomerForm(true);
}}            className="rounded-lg border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            + Add Customer
          </button>
          </div>
      </div>
    </div>

    <div>
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

   






<DashboardServiceCalendar
  entries={dashboardServiceEntries}
  formatDate={formatDate}
/>

<RecentActivity services={recentServices} formatDate={formatDate} />

      {showCustomerForm && (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
    <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
      <h2 className="text-2xl font-bold">Add Customer</h2>

      <div className="mt-4 grid flex-1 gap-4 overflow-y-auto pr-1">
      <input required
          type="text"
          placeholder="Customer name"
          value={newCustomer.name}
          onChange={(e) =>
            setNewCustomer({ ...newCustomer, name: e.target.value })
          }
          className="rounded-lg border p-3"
        />

<input required
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

<input required
          type="tel"
          placeholder="Phone"
          value={newCustomer.phone}
          onChange={(e) =>
            setNewCustomer({ ...newCustomer, phone: e.target.value })
          }
          className="rounded-lg border p-3"
        />

<input required
          type="email"
          placeholder="Email"
          value={newCustomer.email}
          onChange={(e) =>
            setNewCustomer({ ...newCustomer, email: e.target.value })
          }
          className="rounded-lg border p-3"
        />

<input
  type="text"
  required
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
  <p className="text-xs font-medium text-gray-500">{option.code}</p>
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
              <option key={choice} value={choice} className="text-black">
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
    
          <div className="mt-4 grid flex-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
              <div className="relative">
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
                    setNewProject({ ...newProject, customerId: '' });
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
                  className="w-full rounded-lg border p-3"
                />
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
  <div className="md:col-span-2 rounded-lg border p-3">
    <p className="text-sm font-medium">Project Override Billing Methods</p>

    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {pricingModelOptions.map((option) => {
        const fieldMap = {
          MAIN: 'mainPricingType',
          LAT: 'lateralPricingType',
          JET: 'jetPricingType',
          DYE: 'dyePricingType',
          SMK: 'smokePricingType',
          TRFC: 'trafficControlPricingType',
        } as const;

        const field = fieldMap[option.code];

        return (
          <div key={option.code} className="grid gap-2">
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
              className={`rounded-lg border p-3 ${
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
                className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
              >
                Save Project
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
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;
  
    const sortedDates = [...entries]
      .map((entry) => entry.work_date)
      .sort();
  
    const latestEntryDate = sortedDates[sortedDates.length - 1];
  
    if (!latestEntryDate) return;
  
    const [year, month] = latestEntryDate.split('-').map(Number);
  
    setCalendarMonth(new Date(year, month - 1, 1));
  }, [entries]);

  function dateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function changeCalendarMonth(direction: number) {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + direction, 1)
    );
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

  const selectedCalendarEntries = selectedCalendarDate
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
      serviceCount: serviceCountByDate[key] ?? 0,
      hasZeroQuantity: serviceHasZeroQuantityByDate[key] ?? false,
      isToday: key === dateKey(new Date()),
    };
  });

  return (
    <div className="rounded-2xl bg-white p-4 shadow md:p-6">
      <div>
        <h2 className="text-xl font-bold">Service Calendar</h2>
        <p className="mt-1 text-sm text-gray-600">
          Monthly view of service submissions across all projects.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 items-center gap-2 text-[11px] font-medium text-gray-600">
        <div className="flex min-w-0 items-center justify-center gap-1">
          <span className="h-3.5 w-3.5 shrink-0 rounded bg-[#009be5]" />
          <span className="whitespace-nowrap">Serviced</span>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-1">
          <span className="h-3.5 w-3.5 shrink-0 rounded bg-[repeating-linear-gradient(135deg,#f1faff_0,#f1faff_3px,#8fd8f7_3px,#8fd8f7_5px)]" />
          <span className="whitespace-nowrap">Holiday/Unable</span>
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
          className="flex h-9 w-9 items-center justify-center rounded-full border text-lg font-semibold hover:bg-gray-50"
        >
          &lt;
        </button>

        <p className="min-w-[10rem] text-center text-sm font-bold text-gray-800">
          {calendarMonthLabel}
        </p>

        <button
          type="button"
          onClick={() => changeCalendarMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border text-lg font-semibold hover:bg-gray-50"
        >
          &gt;
        </button>
      </div>

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
          const isSelected = selectedCalendarDate === day.key;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedCalendarDate(isSelected ? null : day.key)}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                day.hasZeroQuantity
                  ? 'bg-[repeating-linear-gradient(135deg,#f1faff_0,#f1faff_7px,#8fd8f7_7px,#8fd8f7_9px)] text-[#005f8f] shadow-sm'
                  : hasService
                  ? 'bg-[#009be5] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              } ${isSelected ? 'ring-2 ring-black ring-offset-2' : ''} ${
                day.isToday && !isSelected ? 'ring-2 ring-[#009be5] ring-offset-1' : ''
              }`}
            >
              {day.day}
            </button>
          );
        })}
      </div>

      {selectedCalendarDate && (
        <div className="mt-4 rounded-xl border bg-gray-50 p-3">
          <p className="text-sm font-bold text-gray-900">
            {formatDate(selectedCalendarDate)}
          </p>

          <div className="mt-3 space-y-2">
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
    </p>1

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
      <h2 className="text-xl font-bold">Recent Service Activity</h2>

      <div className="mt-4 space-y-3">
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