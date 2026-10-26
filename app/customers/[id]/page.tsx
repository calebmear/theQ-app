'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useUserProfile } from '../../../lib/useUserProfile';

import { supabase } from '../../../lib/supabaseClient';

type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  mainPricingType: string;
  lateralPricingType: string;
  jetPricingType: string;
  pushRodPricingType: string;
  dyePricingType: string;
smokePricingType: string;
laborerPricingType: string;
trafficControlPricingType: string;

};

type Project = {
  id: string;
  project_number: string;
  status: string;
  service_start_date: string | null;
  project_location: string | null;
  latestServiceDate: string | null;
};

const pricingOptions = {
  mainPricingType: ['Per Hour', 'Per Foot'],
  lateralPricingType: ['Per Hour', 'Per Lateral'],
  jetPricingType: ['Per Hour', 'Per Foot'],
  pushRodPricingType: ['Per Hour'],
  dyePricingType: ['Per Hour'],
  smokePricingType: ['Per Hour', 'Per Mainline Test + Per Residence'],
  laborerPricingType: ['Per Hour'],
  trafficControlPricingType: ['Flat Rate'],

};

export default function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectView, setProjectView] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const { role } = useUserProfile();

  const normalizedRole = role ? String(role).trim().toLowerCase() : null;
  const canManageCustomers =
    normalizedRole === 'admin' || normalizedRole === 'management';
  const [currentRates, setCurrentRates] = useState<CustomerRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);
  const [ratesRevision, setRatesRevision] = useState(0);
  useEffect(() => {
    if (!canManageCustomers) { setCurrentRates([]); return; }
    let cancelled = false;
    async function loadCurrentRates() {
      setRatesLoading(true); setRatesError(false);
      try {
        const today = rateToday();
        const { data, error } = await supabase.from('customer_service_rates')
          .select('id, service_code, unit, amount, effective_from, effective_to, note, updated_at')
          .eq('customer_id', params.id).lte('effective_from', today)
          .or(`effective_to.is.null,effective_to.gte.${today}`);
        if (error) throw error;
        if (!cancelled) setCurrentRates(data ?? []);
      } catch {
        if (!cancelled) { setCurrentRates([]); setRatesError(true); }
      } finally { if (!cancelled) setRatesLoading(false); }
    }
    void loadCurrentRates();
    return () => { cancelled = true; };
  }, [canManageCustomers, params.id, ratesRevision]);
  useEffect(() => {
    if (!canManageCustomers) return;
    const refresh = () => setRatesRevision((value) => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [canManageCustomers]);
  function currentRateLabel(code: string, method: string) {
    if (!canManageCustomers || !method) return undefined;
    if (ratesLoading) return 'Loading rate…';
    if (ratesError) return 'Rate unavailable';
    return formatCurrentRate(currentRates, code, method, rateToday());
  }
  const [customerEditForm, setCustomerEditForm] = useState({
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    mainPricingType: '',
    lateralPricingType: '',
    jetPricingType: '',
    pushRodPricingType: '',
    dyePricingType: '',
    smokePricingType: '',
    laborerPricingType: '',
    trafficControlPricingType: '',

  });

  useEffect(() => {
    async function loadCustomer() {
      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, name, contact_name, phone, email, address, notes, main_pricing_type, lateral_pricing_type, jet_pricing_type, push_rod_pricing_type, dye_pricing_type, smoke_pricing_type, laborer_pricing_type, traffic_control_pricing_type'

          )
        
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error loading customer:', error);
        setLoading(false);
        return;
      }

      setCustomer({
        id: data.id,
        name: data.name,
        contactName: data.contact_name ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        notes: data.notes ?? '',
        mainPricingType: data.main_pricing_type ?? '',
lateralPricingType: data.lateral_pricing_type ?? '',
jetPricingType: data.jet_pricing_type ?? '',
pushRodPricingType: data.push_rod_pricing_type ?? '',
dyePricingType: data.dye_pricing_type ?? '',
smokePricingType: data.smoke_pricing_type ?? '',
laborerPricingType: data.laborer_pricing_type ?? '',
trafficControlPricingType: data.traffic_control_pricing_type ?? '',



      });

      const { data: projectData, error: projectError } = await supabase
  .from('projects')
  .select('id, project_number, status, service_start_date, project_location')
  .eq('customer_id', params.id)
  .order('created_at', { ascending: false });

if (projectError) {
  console.error('Error loading customer projects:', projectError);
}

const projectIds = (projectData ?? []).map((project) => project.id);

let latestServiceByProjectId: Record<string, string | null> = {};

if (projectIds.length > 0) {
  const { data: timeEntryData, error: timeEntryError } = await supabase
    .from('time_entries')
    .select('project_id, work_date')
    .in('project_id', projectIds)
    .is('deleted_at', null)
    .order('work_date', { ascending: false });

  if (timeEntryError) {
    console.error('Error loading customer project service dates:', timeEntryError);
  }

  console.log('Customer project IDs:', projectIds);
console.log('Customer project time entries:', timeEntryData);

  latestServiceByProjectId = (timeEntryData ?? []).reduce<
    Record<string, string | null>
  >((dates, entry) => {
    if (!dates[entry.project_id]) {
      dates[entry.project_id] = entry.work_date;
    }

    return dates;
  }, {});
}

const formattedProjects: Project[] = (projectData ?? []).map((project) => ({
  id: project.id,
  project_number: project.project_number,
  status: project.status,
  service_start_date: project.service_start_date,
  project_location: project.project_location,
  latestServiceDate: latestServiceByProjectId[project.id] ?? null,
}));

setProjects(formattedProjects);

      setLoading(false);
    }

    loadCustomer();
  }, [params.id]);

  function formatPhone(value: string) {
    if (!value) return 'No phone saved';

    const digits = value.replace(/\D/g, '');

    if (digits.length !== 10) {
      return value;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function formatDate(value: string | null) {
    if (!value) return 'No date saved';

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  function startCustomerEdit() {
    if (!canManageCustomers) return;
    if (!customer) return;
  
    setCustomerEditForm({
      contactName: customer.contactName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      mainPricingType: customer.mainPricingType,
      lateralPricingType: customer.lateralPricingType,
      jetPricingType: customer.jetPricingType,
      pushRodPricingType: customer.pushRodPricingType,
      dyePricingType: customer.dyePricingType,
      smokePricingType: customer.smokePricingType,
      laborerPricingType: customer.laborerPricingType,
      trafficControlPricingType: customer.trafficControlPricingType,
    });
  
    setEditingCustomer(true);
  }
  
  function cancelCustomerEdit() {
    setEditingCustomer(false);
  }
  
  async function saveCustomerEdit() {
    if (!canManageCustomers) return;
    if (!customer) return;
  
    const { error } = await supabase
      .from('customers')
      .update({
        contact_name: customerEditForm.contactName,
        phone: customerEditForm.phone,
        email: customerEditForm.email,
        address: customerEditForm.address,
        notes: customerEditForm.notes,
      })
      .eq('id', customer.id);
  
    if (error) {
      console.error('Error updating customer:', error);
      alert(error.message);
      return;
    }
  
    setCustomer({
      ...customer,
      contactName: customerEditForm.contactName,
      phone: customerEditForm.phone,
      email: customerEditForm.email,
      address: customerEditForm.address,
      notes: customerEditForm.notes,
    });
  
    setEditingCustomer(false);
  }
  

  if (loading) {
    return <div className="text-black">Loading customer...</div>;
  }

  const activeProjects = projects.filter((project) =>
    ['Active', 'Scheduled'].includes(project.status)
  );

  const completedProjects = projects.filter(
    (project) => project.status === 'Completed'
  );

  const visibleProjects =
    projectView === 'active' ? activeProjects : completedProjects;

  if (!customer) {
    return <div className="text-black">Customer not found.</div>;
  }

  return (
    <div className="space-y-6 text-black">
      <div className="text-sm text-gray-500">
        <Link href="/customers" className="hover:text-black hover:underline">
          Customers
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-700">{customer.name}</span>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-3">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Customer</p>
            <h1 className="mt-1 text-xl font-bold">{customer.name}</h1>
          </div>

          {canManageCustomers && !editingCustomer && (
            <button
              type="button"
              onClick={startCustomerEdit}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Edit Customer
            </button>
          )}
        </div>

        <div className="grid gap-3 py-3 md:grid-cols-[1fr_420px] md:gap-4 md:py-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm md:gap-x-4 md:gap-y-3">
            <EditableText
              label="Contact"
              editing={editingCustomer}
              value={customerEditForm.contactName}
              displayValue={customer.contactName || 'No contact saved'}
              onChange={(value) =>
                setCustomerEditForm({ ...customerEditForm, contactName: value })
              }
            />

            <EditableText
              label="Phone"
              editing={editingCustomer}
              value={customerEditForm.phone}
              displayValue={formatPhone(customer.phone)}
              onChange={(value) =>
                setCustomerEditForm({ ...customerEditForm, phone: value })
              }
            />

            <EditableText
              label="Address"
              editing={editingCustomer}
              value={customerEditForm.address}
              displayValue={customer.address || 'No address saved'}
              onChange={(value) =>
                setCustomerEditForm({ ...customerEditForm, address: value })
              }
            />

            <EditableText
              label="Email"
              editing={editingCustomer}
              value={customerEditForm.email}
              displayValue={customer.email || 'No email saved'}
              onChange={(value) =>
                setCustomerEditForm({ ...customerEditForm, email: value })
              }
            />
          </div>

          <div className="space-y-4 border-t pt-4 text-sm md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Billing Methods
              </p>
              {canManageCustomers && !editingCustomer && <CustomerRates key={customer.id} customerId={customer.id} customerName={customer.name} customer={customer} onMethodSaved={(field, value) => setCustomer((current) => current ? { ...current, [field]: value } : current)} onRatesChanged={() => setRatesRevision((value) => value + 1)} />}

              <div
  className={`mt-2 grid gap-2 ${
    'grid-cols-2 gap-x-4'
  }`}
>
  <PricingSelect
    code="MAIN"
    rateLabel={currentRateLabel('MAIN', customer.mainPricingType)}
    editing={false}
    value={customerEditForm.mainPricingType}
    displayValue={customer.mainPricingType || 'Not set'}
    choices={pricingOptions.mainPricingType}
    onChange={(value) =>
      setCustomerEditForm({
        ...customerEditForm,
        mainPricingType: value,
      })
    }
  />

  <PricingSelect
    code="LAT"
    rateLabel={currentRateLabel('LAT', customer.lateralPricingType)}
    editing={false}
    value={customerEditForm.lateralPricingType}
    displayValue={customer.lateralPricingType || 'Not set'}
    choices={pricingOptions.lateralPricingType}
    onChange={(value) =>
      setCustomerEditForm({
        ...customerEditForm,
        lateralPricingType: value,
      })
    }
  />

  <PricingSelect
    code="JET"
    rateLabel={currentRateLabel('JET', customer.jetPricingType)}
    editing={false}
    value={customerEditForm.jetPricingType}
    displayValue={customer.jetPricingType || 'Not set'}
    choices={pricingOptions.jetPricingType}
    onChange={(value) =>
      setCustomerEditForm({
        ...customerEditForm,
        jetPricingType: value,
      })
    }
  />

  <PricingSelect
    code="PUSH"
    rateLabel={currentRateLabel('PUSH', customer.pushRodPricingType)}
    editing={false}
    value={customerEditForm.pushRodPricingType}
    displayValue={customer.pushRodPricingType || 'Not set'}
    choices={pricingOptions.pushRodPricingType}
    onChange={(value) =>
      setCustomerEditForm({
        ...customerEditForm,
        pushRodPricingType: value,
      })
    }
  />

  <PricingSelect
    code="DYE"
    rateLabel={currentRateLabel('DYE', customer.dyePricingType)}
    editing={false}
    value={customerEditForm.dyePricingType}
    displayValue={customer.dyePricingType || 'Not set'}
    choices={pricingOptions.dyePricingType}
    onChange={(value) =>
      setCustomerEditForm({
        ...customerEditForm,
        dyePricingType: value,
      })
    }
  />

  <PricingSelect
    code="SMK"
    rateLabel={currentRateLabel('SMK', customer.smokePricingType)}
    editing={false}
    value={customerEditForm.smokePricingType}
    displayValue={customer.smokePricingType || 'Not set'}
    choices={pricingOptions.smokePricingType}
    onChange={(value) =>
      setCustomerEditForm({
        ...customerEditForm,
        smokePricingType: value,
      })
    }
  />

  <PricingSelect
    code="LABOR"
    rateLabel={currentRateLabel('LABOR', customer.laborerPricingType)}
    editing={false}
    value={customerEditForm.laborerPricingType}
    displayValue={customer.laborerPricingType || 'Not set'}
    choices={pricingOptions.laborerPricingType}
    onChange={(value) =>
      setCustomerEditForm({
        ...customerEditForm,
        laborerPricingType: value,
      })
    }
  />

  <PricingSelect
  code="TRFC"
    rateLabel={currentRateLabel('TRFC', customer.trafficControlPricingType)}
  editing={false}
  value={customerEditForm.trafficControlPricingType}
  displayValue={customer.trafficControlPricingType || 'Not set'}
  choices={pricingOptions.trafficControlPricingType}
  onChange={(value) =>
    setCustomerEditForm({
      ...customerEditForm,
      trafficControlPricingType: value,
    })
  }
/>

</div>
</div>


            <div className="border-t pt-4">
  <p className="text-xs font-medium uppercase text-gray-500">
    Customer Notes
  </p>

  {editingCustomer ? (
    <textarea
      placeholder="Add customer notes..."
      value={customerEditForm.notes}
      onChange={(e) =>
        setCustomerEditForm({
          ...customerEditForm,
          notes: e.target.value,
        })
      }
      className="mt-1 block min-h-28 w-full resize-y rounded-lg border p-2 text-sm text-black"
      rows={4}
    />
  ) : (
    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
      {customer.notes || 'No notes saved'}
    </p>
  )}
</div>



          </div>
        </div>

        {canManageCustomers && editingCustomer && (




<div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={cancelCustomerEdit}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveCustomerEdit}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save Customer
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div>
          <h2 className="text-xl font-bold">Customer Project History</h2>

          <div className="mt-3 w-full">
            <div className="grid w-full grid-cols-2 rounded-lg border bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setProjectView('active')}
                className={`w-full rounded-md px-4 py-2 text-sm font-medium ${
                  projectView === 'active'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Active
              </button>

              <button
                type="button"
                onClick={() => setProjectView('completed')}
                className={`w-full rounded-md px-4 py-2 text-sm font-medium ${
                  projectView === 'completed'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {visibleProjects.map((project) => (
            <Link
            key={project.id}
            href={`/projects/${encodeURIComponent(
              project.project_number
            )}?from=/customers/${customer.id}&fromLabel=${encodeURIComponent(customer.name)}`}
            className="block rounded-xl border p-4 hover:bg-gray-50"
          >
          
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{project.project_number}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {project.project_location || 'No project location saved'}
                  </p>
                </div>

                <span className="rounded-full border px-2 py-1 text-xs font-medium text-gray-600">
                  {project.status}
                </span>
              </div>

              <p className="mt-3 text-sm text-gray-600">
  {projectView === 'active' ? 'Last service' : 'Service completed'}:{' '}
  {project.latestServiceDate
    ? formatDate(project.latestServiceDate)
    : 'No service submitted'}
</p>
            </Link>
          ))}

          {visibleProjects.length === 0 && (
            <div className="rounded-xl border border-dashed p-4 text-center text-sm text-gray-500">
              {projectView === 'active'
                ? 'No active projects found for this customer.'
                : 'No completed projects found for this customer.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditableText({
  label,
  editing,
  value,
  displayValue,
  onChange,
}: {
  label: string;
  editing: boolean;
  value: string;
  displayValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>

      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border p-2"
        />
      ) : (
        <p className="mt-1 break-words font-semibold">{displayValue}</p>
      )}
    </div>
  );
}

function PricingSelect({
  code,
  rateLabel,
  editing,
  value,
  displayValue,
  choices,
  onChange,
}: {
  code: string;
  rateLabel?: string;
  editing: boolean;
  value: string;
  displayValue: string;
  choices: string[];
  onChange: (value: string) => void;
}) {
  return (
<div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-center sm:gap-x-2">
      <span className="whitespace-nowrap font-semibold">{code}</span>

      {editing ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`min-w-0 w-full rounded-lg border p-2 text-sm ${
            value ? 'text-black' : 'text-gray-400'
          }`}
        >
          <option value="" disabled hidden>
            Select
          </option>

          {choices.map((choice) => (
            <option key={choice} value={choice} className="text-black">
              {choice}
            </option>
          ))}
        </select>
      ) : (
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 break-words text-gray-600">
          <span>{displayValue}</span>
          {rateLabel && <span className="font-medium text-gray-900">· {rateLabel}</span>}
        </span>
      )}
    </div>
  );
}


type BillingField = keyof typeof pricingOptions;
const billingFields: Record<string, BillingField> = {
  MAIN: 'mainPricingType',
  LAT: 'lateralPricingType',
  JET: 'jetPricingType',
  PUSH: 'pushRodPricingType',
  DYE: 'dyePricingType',
  SMK: 'smokePricingType',
  LABOR: 'laborerPricingType',
  TRFC: 'trafficControlPricingType',
};

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
  const units = code === 'SMK' && method === 'Per Mainline Test + Per Residence'
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
  for (const unit of new Set(rows.map((row) => row.unit))) {
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

function CustomerRates({ customerId, customerName, customer, onMethodSaved, onRatesChanged }: {
  customerId: string; customerName: string; customer: Customer;
  onMethodSaved: (field: BillingField, value: string) => void;
  onRatesChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [methodDrafts, setMethodDrafts] = useState<Record<string, string>>({});
  const [methodError, setMethodError] = useState('');
  const [methodNotice, setMethodNotice] = useState('');
  const [methodFeedbackCode, setMethodFeedbackCode] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
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
  const units = rateServices.find((service) => service.code === form.service_code)!.units;
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; dialog.current?.close(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setLoadError('');
      try {
        const { data, error } = await supabase.from('customer_service_rates')
          .select('id, service_code, unit, amount, effective_from, effective_to, note, updated_at')
          .eq('customer_id', customerId).order('effective_from', { ascending: false });
        if (error) throw error;
        if (!cancelled) setRows(data ?? []);
      } catch (e) {
        if (!cancelled) setLoadError((e as { message?: string }).message || 'Could not load rates. Please retry.');
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, customerId, revision]);
  function discard() {
    return !busy.current && (!dirty || window.confirm('Discard your unsaved rate changes?'));
  }
  function reset() { setActiveService(null); setEditing(null); setForm(emptyRate()); setDirty(false); setError(''); }
  function close() {
    if (busy.current) return;
    const methodsDirty = Object.entries(methodDrafts).some(([code, value]) => value !== customer[billingFields[code]]);
    if ((dirty || methodsDirty) && !window.confirm('Discard your unsaved billing and rate changes?')) return;
    reset(); setMethodDrafts({}); setEditingMethod(null); setMethodError(''); setMethodNotice(''); setOpen(false);
  }
  function beginMethodEdit(code: string) {
    if (busy.current) return;
    if (editingMethod && methodDrafts[editingMethod] !== undefined &&
        methodDrafts[editingMethod] !== customer[billingFields[editingMethod]] &&
        !window.confirm('Discard the unsaved billing method change before editing another service?')) return;
    setMethodDrafts({ [code]: customer[billingFields[code]] });
    setEditingMethod(code); setMethodError(''); setMethodNotice('');
  }
  function cancelMethodEdit() {
    if (busy.current) return;
    setMethodDrafts({}); setEditingMethod(null); setMethodError(''); setMethodNotice('');
  }
  async function saveMethod(code: string) {
    if (busy.current || editingMethod !== code) return;
    const field = billingFields[code];
    const value = methodDrafts[code] ?? customer[field];
    if (value === customer[field]) return;
    const serviceName = rateServices.find((service) => service.code === code)?.name ?? code;
    if (!window.confirm(`Change ${serviceName} billing for ${customerName} from "${customer[field] || 'Not set'}" to "${value || 'Not set'}"?\n\nThis applies to the customer default immediately. Saved rates and existing submissions will not be repriced.`)) return;
    busy.current = true; setSaving(true); setMethodFeedbackCode(code); setMethodError(''); setMethodNotice('');
    try {
      const { error } = await supabase.rpc('set_customer_billing_method', {
        p_customer_id: customerId, p_service_code: code, p_method: value,
        p_expected_method: customer[field] || '',
      });
      if (error) throw error;
      onMethodSaved(field, value);
      setMethodDrafts((current) => { const next = { ...current }; delete next[code]; return next; });
      setEditingMethod(null);
      setMethodNotice('Billing method saved.');
    } catch (e) { setMethodError((e as { message?: string }).message || 'Could not save billing method.'); }
    finally { busy.current = false; setSaving(false); }
  }
  function change(values: Partial<ReturnType<typeof emptyRate>>) { setForm((current) => ({ ...current, ...values })); setDirty(true); setError(''); setNotice(''); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setError(''); setNotice('');
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) > 99999999.99) {
      setError('Enter a nonnegative rate with up to two decimal places.'); return;
    }
    if (!form.effective_from || (form.effective_to && form.effective_to < form.effective_from)) {
      setError('The end date must be on or after the start date.'); return;
    }
    if (rows.some((row) => row.id !== editing?.id && row.service_code === form.service_code && row.unit === form.unit &&
      (!row.effective_to || row.effective_to >= form.effective_from) && (!form.effective_to || row.effective_from <= form.effective_to))) {
      setError('These dates overlap another rate for this service and unit. End the previous rate the day before the new rate starts.'); return;
    }
    busy.current = true; setSaving(true);
    try {
      const values = { service_code: form.service_code, unit: form.unit, amount: Number(form.amount), effective_from: form.effective_from, effective_to: form.effective_to || null, note: form.note.trim() };
      const result = editing
        ? await supabase.from('customer_service_rates').update(values).eq('id', editing.id).eq('customer_id', customerId).eq('updated_at', editing.updated_at).select('id').maybeSingle()
        : await supabase.from('customer_service_rates').insert({ ...values, customer_id: customerId }).select('id').single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('This rate changed since you opened it. Reload rates and review it before saving again.');
      reset(); setNotice('Rate saved.'); setRevision((v) => v + 1); onRatesChanged();
    } catch (e) {
      const failure = e as { code?: string; message?: string };
      setError(failure.code === '23P01' ? 'Another rate overlaps these dates. Reload rates and adjust the date range.' : failure.message || 'Could not save the rate. Please retry.');
    } finally { busy.current = false; setSaving(false); }
  }
  async function deleteRate(row: CustomerRate) {
    if (busy.current) return;
    const service = rateServices.find((item) => item.code === row.service_code)?.name ?? row.service_code;
    const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(row.amount));
    if (!window.confirm(`Delete ${service}: ${price} ${row.unit}, ${rateDate(row.effective_from)} – ${row.effective_to ? rateDate(row.effective_to) : 'Ongoing'}?\n\nRevenue estimates for these dates will update and may show a missing rate. Other date ranges will not extend automatically. The deletion will remain in the audit history.${dirty ? '\n\nUnsaved edits to this rate will be discarded.' : ''}`)) return;
    busy.current = true; setSaving(true); setError(''); setNotice('');
    try {
      const { error } = await supabase.rpc('delete_customer_service_rate', {
        p_customer_id: customerId, p_rate_id: row.id, p_expected_updated_at: row.updated_at,
      });
      if (error) throw error;
      setRows((current) => current.filter((item) => item.id !== row.id));
      reset(); setNotice('Rate deleted. Review the remaining date ranges to ensure the dates you need are covered.');
      setRevision((value) => value + 1); onRatesChanged();
    } catch (e) { setError((e as { message?: string }).message || 'Could not delete this rate.'); }
    finally { busy.current = false; setSaving(false); }
  }
  const inputClass = 'mt-2 block box-border min-w-0 w-full max-w-full rounded-lg border bg-white p-3 text-base font-normal';
  const rateEditor = (
          <form onSubmit={save} className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
            <h3 className="font-semibold">{editing ? 'Edit rate and dates' : 'Add date range'}</h3>
            {editing && <p className="text-sm text-gray-600">Use editing for corrections or an end date. Add a separate rate for a price increase to retain earlier pricing.</p>}
            <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-medium">Unit<select disabled={saving || units.length === 1} className={inputClass} value={form.unit} onChange={(e) => change({ unit: e.target.value })}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              <label className="min-w-0 text-sm font-medium">Rate (USD)<input required inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e) => change({ amount: e.target.value })} className={inputClass} /></label>
              <label className="min-w-0 text-sm font-medium">Effective from<input required type="date" value={form.effective_from} onChange={(e) => change({ effective_from: e.target.value })} className={`${inputClass} appearance-none`} /></label>
              <label className="min-w-0 text-sm font-medium">Effective through (optional)<input type="date" value={form.effective_to} onChange={(e) => change({ effective_to: e.target.value })} className={`${inputClass} appearance-none`} /></label>
              <label className="min-w-0 text-sm font-medium sm:col-span-2">Note (optional)<textarea rows={2} maxLength={1000} value={form.note} onChange={(e) => change({ note: e.target.value })} className={inputClass} /></label>
            </fieldset>
            {form.service_code === 'SMK' && <p className="text-sm text-gray-600">For combined Smoke billing, enter a separate rate for each component: Per Mainline Test and Per Residence.</p>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="min-h-11 flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Rate'}</button>
              <button type="button" disabled={saving} onClick={() => { if (discard()) reset(); }} className="min-h-11 rounded-lg border px-4 py-3 text-sm">Cancel</button>
            </div>
            {editing && <button type="button" disabled={saving} onClick={() => void deleteRate(editing)} className="min-h-11 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 disabled:opacity-50">Delete rate</button>}
          </form>
  );
  return <>
    <button type="button" onClick={() => { setNotice(''); setOpen(true); }} className="mt-3 min-h-11 w-full rounded-lg border border-[#8fd8f7] bg-[#e8f7ff] px-3 py-2 text-sm font-semibold text-[#007bb5]">Manage Billing &amp; Rates</button>
    <dialog ref={dialog} aria-labelledby="customer-rates-title" onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto max-h-[90dvh] overflow-y-auto rounded-2xl border-0 bg-white p-0 text-black shadow-xl backdrop:bg-black/40"
      style={{ width: 'calc(100% - 2rem)', maxWidth: '48rem' }}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="min-w-0"><h2 id="customer-rates-title" className="text-xl font-bold">Billing &amp; Rates</h2><p className="mt-1 break-words text-sm text-gray-600">{customerName}</p></div>
        <button type="button" disabled={saving} onClick={close} className="min-h-11 shrink-0 rounded-lg border px-3 py-2 text-sm">Close</button>
      </div>
      <div className="space-y-3 p-3 sm:p-4">
        <details className="text-sm text-gray-600">
          <summary className="flex min-h-11 cursor-pointer items-center text-[#007bb5]">Rate dates &amp; pricing help ▾</summary>
          <p className="pb-2">Rates are in USD. Dates are inclusive; leave the end blank for an ongoing rate. For a price change, end the previous range and add the next range within the same service.</p>
        </details>
        {loading ? <p role="status">Loading rates...</p> : loadError ? <p role="alert" className="text-sm text-red-700">{loadError}</p> : <>
          <section aria-label="Service rates" className="space-y-3">
            {rateServices.map((service) => {
              const billingField = billingFields[service.code];
              const method = methodDrafts[service.code] ?? customer[billingField];
              const methodChanged = method !== customer[billingField];
              const serviceRows = rows.filter((row) => row.service_code === service.code);
              const { visibleIds, historyCount } = splitRateHistory(serviceRows, rateToday());
              const historyOpen = expandedHistory[service.code] ?? false;
              const historyId = `rate-history-${customerId}-${service.code}`;
              return <section key={service.code} aria-label={`${service.name} rates`} className="min-w-0 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{service.name} <span className="ml-1 text-xs font-normal text-gray-500">{service.code}</span></h3>
                  <button type="button" disabled={saving} onClick={() => {
                    if (!discard()) return;
                    setEditing(null); setActiveService(service.code);
                    setForm({ ...emptyRate(), service_code: service.code, unit: service.units.includes(customer[billingField]) ? customer[billingField] : service.code === 'SMK' && customer[billingField] === 'Per Mainline Test + Per Residence' ? 'Per Mainline Test' : service.units[0] });
                    setDirty(false); setError(''); setNotice('');
                  }} className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-[#007bb5] hover:bg-[#e8f7ff]" aria-label={`Add date range for ${service.name}`}>+ Add rate</button>
                </div>
                <div className="mb-3 mt-2">
                  {editingMethod === service.code ? <>
                    <label className="block min-w-0 text-xs text-gray-500">Billing method
                      <select autoFocus disabled={saving} value={method} onChange={(event) => {
                        const value = event.target.value;
                        setMethodDrafts((current) => ({ ...current, [service.code]: value }));
                        setMethodError(''); setMethodNotice('');
                      }} style={{ minHeight: 48 }} className="mt-2 block w-full min-w-0 rounded-lg border bg-white px-3 py-3 text-base leading-6 text-black">
                        <option value="">Not set</option>
                        {pricingOptions[billingField].map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </label>
                    {methodChanged && <p className="mt-2 text-xs text-amber-800">Unsaved: {customer[billingField] || 'Not set'} → {method || 'Not set'}</p>}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" disabled={saving || !methodChanged} onClick={() => void saveMethod(service.code)} className="min-h-11 rounded-lg bg-black px-3 py-3 text-sm font-semibold text-white disabled:opacity-50">Save method</button>
                      <button type="button" disabled={saving} onClick={cancelMethodEdit} className="min-h-11 rounded-lg border px-3 py-3 text-sm">Cancel</button>
                    </div>
                  </> : <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-xs text-gray-500">Billing method</p><p className="mt-1 break-words text-sm">{customer[billingField] || 'Not set'}</p></div>
                    <button type="button" disabled={saving} onClick={() => beginMethodEdit(service.code)} aria-label={`Edit ${service.name} billing method`} className="min-h-11 shrink-0 rounded-lg border px-3 py-2 text-sm font-medium text-[#007bb5]">Edit method</button>
                  </div>}
                </div>
                {methodFeedbackCode === service.code && methodError && <p role="alert" className="mb-3 text-sm text-red-700">{methodError}</p>}
                {methodFeedbackCode === service.code && methodNotice && <p role="status" className="mb-3 text-sm text-green-700">{methodNotice}</p>}
                {serviceRows.length === 0 && activeService !== service.code && <p className="pb-1 text-sm text-gray-500">No rate set.</p>}
                <div id={historyId} className="divide-y border-t border-gray-100 pt-2">
                  {serviceRows.map((row) => {
                    const status = row.effective_from > rateToday() ? 'Upcoming' : row.effective_to && row.effective_to < rateToday() ? 'Past' : 'Current';
                    return <div key={row.id} hidden={!historyOpen && !visibleIds.has(row.id)} className="py-2">
                      {activeService === service.code && editing?.id === row.id ? rateEditor : <>
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
                          <div className="min-w-0">
                            <p className="text-sm"><span className="font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(row.amount))}</span> <span className="text-gray-600">{row.unit}</span></p>
                            <p className="mt-0.5 text-xs leading-5 text-gray-500">{rateDate(row.effective_from)} – {row.effective_to ? rateDate(row.effective_to) : 'Ongoing'} · {status}</p>
                          </div>
                          <button type="button" disabled={saving} onClick={() => {
                            if (!discard()) return;
                            setActiveService(service.code); setEditing(row);
                            setForm({ service_code: row.service_code, unit: row.unit, amount: String(row.amount), effective_from: row.effective_from, effective_to: row.effective_to ?? '', note: row.note });
                            setDirty(false); setError(''); setNotice('');
                          }} className="min-h-11 justify-self-end rounded-lg px-3 py-2 text-sm font-medium text-[#007bb5] hover:bg-[#e8f7ff]" aria-label={`Edit ${service.name} ${row.unit} rate from ${rateDate(row.effective_from)}`}>Edit</button>
                        </div>
                        {row.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">{row.note}</p>}
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
    </dialog>
  </>;
}
