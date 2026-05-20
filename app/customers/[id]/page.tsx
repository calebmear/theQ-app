'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  dyePricingType: string;
smokePricingType: string;
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
  dyePricingType: ['Per Hour'],
  smokePricingType: ['Per Hour', 'Per Mainline Test','Per Residence'],
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
  const [customerEditForm, setCustomerEditForm] = useState({
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    mainPricingType: '',
    lateralPricingType: '',
    jetPricingType: '',
    dyePricingType: '',
    smokePricingType: '',
    trafficControlPricingType: '',

  });

  useEffect(() => {
    async function loadCustomer() {
      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, name, contact_name, phone, email, address, notes, main_pricing_type, lateral_pricing_type, jet_pricing_type, dye_pricing_type, smoke_pricing_type, traffic_control_pricing_type'

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
dyePricingType: data.dye_pricing_type ?? '',
smokePricingType: data.smoke_pricing_type ?? '',
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
      dyePricingType: customer.dyePricingType,
      smokePricingType: customer.smokePricingType,
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
  
    const pricingChanged =
      customerEditForm.mainPricingType !== customer.mainPricingType ||
      customerEditForm.lateralPricingType !== customer.lateralPricingType ||
      customerEditForm.jetPricingType !== customer.jetPricingType ||
      customerEditForm.dyePricingType !== customer.dyePricingType ||
      customerEditForm.smokePricingType !== customer.smokePricingType ||
      customerEditForm.trafficControlPricingType !==
        customer.trafficControlPricingType;
  
    const { error } = await supabase
      .from('customers')
      .update({
        contact_name: customerEditForm.contactName,
        phone: customerEditForm.phone,
        email: customerEditForm.email,
        address: customerEditForm.address,
        notes: customerEditForm.notes,
        main_pricing_type: customerEditForm.mainPricingType,
        lateral_pricing_type: customerEditForm.lateralPricingType,
        jet_pricing_type: customerEditForm.jetPricingType,
        dye_pricing_type: customerEditForm.dyePricingType,
        smoke_pricing_type: customerEditForm.smokePricingType,
        traffic_control_pricing_type: customerEditForm.trafficControlPricingType,
        ...(pricingChanged && {
          pricing_updated_at: new Date().toISOString(),
        }),
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
      mainPricingType: customerEditForm.mainPricingType,
      lateralPricingType: customerEditForm.lateralPricingType,
      jetPricingType: customerEditForm.jetPricingType,
      dyePricingType: customerEditForm.dyePricingType,
      smokePricingType: customerEditForm.smokePricingType,
      trafficControlPricingType: customerEditForm.trafficControlPricingType,
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

              <div
  className={`mt-2 grid gap-2 ${
    editingCustomer ? 'grid-cols-1' : 'grid-cols-2 gap-x-4'
  }`}
>
  <PricingSelect
    code="MAIN"
    editing={editingCustomer}
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
    code="DYE"
    editing={editingCustomer}
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
    code="LAT"
    editing={editingCustomer}
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
    code="SMK"
    editing={editingCustomer}
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
    code="JET"
    editing={editingCustomer}
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
  code="TRFC"
  editing={editingCustomer}
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
  editing,
  value,
  displayValue,
  choices,
  onChange,
}: {
  code: string;
  editing: boolean;
  value: string;
  displayValue: string;
  choices: string[];
  onChange: (value: string) => void;
}) {
  return (
<div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[40px_minmax(0,1fr)] sm:items-center sm:gap-x-2">
      <span className="font-semibold">{code}</span>

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
        <span className="text-gray-600">{displayValue}</span>
      )}
    </div>
  );
}
