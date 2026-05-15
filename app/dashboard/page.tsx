'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';



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


export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [projectCustomerSearch, setProjectCustomerSearch] = useState('');

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

  const [newProject, setNewProject] = useState({
    id: '',
    name: '',
    customerId: '',
    assignedToId: '',
    status: 'Scheduled',
    progress: 0,
    startdateofservice: '',
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

  const activeProjects = projects.filter((project) => project.status === 'Active');

  const scheduledProjects = projects.filter(
    (project) => project.status === 'Scheduled'
  );

  const projectCustomerOptions = customers.filter((customer) => {
    const search = projectCustomerSearch.toLowerCase();

    return (
      customer.name.toLowerCase().includes(search) ||
      customer.contactName.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search)
    );
  });

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
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    loadProjects();
  }, []);

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
      startdateofservice: '',
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
  }

  return (
    <div className="space-y-6 text-black">
  
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Snapshot of active and scheduled work.
          </p>
        </div>
  
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

      <div className="grid gap-6 xl:grid-cols-2">
        <ProjectTable
          title="Active Projects"
          projects={activeProjects}
          formatDate={formatDate}
        />

        <ProjectTable
          title="Scheduled Projects"
          projects={scheduledProjects}
          formatDate={formatDate}
        />
      </div>

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
                  type={newProject.startdateofservice ? 'date' : 'text'}
                  placeholder="Enter scheduled service start date"
                  value={newProject.startdateofservice}
                  onFocus={(e) => {
                    e.currentTarget.type = 'date';
                  }}
                  onBlur={(e) => {
                    if (!newProject.startdateofservice) {
                      e.currentTarget.type = 'text';
                    }
                  }}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      startdateofservice: e.target.value,
                    })
                  }
                  className="block w-full min-w-0 max-w-full rounded-lg border p-3"
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
              <div>
                <h3 className="font-bold">{project.id}</h3>
                <p className="mt-1 text-sm font-medium">{project.customer}</p>
              </div>

              <div className="text-right text-xs text-gray-500">
                <p>Latest service</p>
                <p className="font-semibold text-gray-700">
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