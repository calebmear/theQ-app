'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabaseClient';

type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
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


type Employee = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
};


export default function OperationsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [operationsSearch, setOperationsSearch] = useState('');
const [projectCustomerSearch, setProjectCustomerSearch] = useState('');

const [employees, setEmployees] = useState<Employee[]>([]);


  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const [newProject, setNewProject] = useState({
    id: '',
    name: '',
    customerId: '',
    pricingType: 'Hourly',
    assignedToId: '',
    status: 'Scheduled',
    progress: 0,
    startdateofservice: '',
    projectLocation: '',
    notes: '',
  });

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
    async function loadCustomers() {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact_name, phone, email, address, notes')
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
        notes: customer.notes ?? '',
      }));
  
      setCustomers(formattedCustomers);
    }
  
    loadCustomers();
  }, []);

  function formatDate(value: string | undefined) {
    if (!value) return '';
  
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  
  const operationsSearchValue = operationsSearch.toLowerCase().trim();

const filteredCustomers = operationsSearchValue
  ? customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(operationsSearchValue) ||
        customer.contactName.toLowerCase().includes(operationsSearchValue) ||
        customer.phone.toLowerCase().includes(operationsSearchValue) ||
        customer.email.toLowerCase().includes(operationsSearchValue) ||
        (customer.address ?? '').toLowerCase().includes(operationsSearchValue)
      );
    })
  : [];

function projectMatchesSearch(project: Project) {
  if (!operationsSearchValue) return true;

  return (
    project.id.toLowerCase().includes(operationsSearchValue) ||
    project.name.toLowerCase().includes(operationsSearchValue) ||
    project.customer.toLowerCase().includes(operationsSearchValue) ||
    project.assignedTo.toLowerCase().includes(operationsSearchValue) ||
    project.status.toLowerCase().includes(operationsSearchValue) ||
    project.startdateofservice.toLowerCase().includes(operationsSearchValue) ||
    (project.projectLocation ?? '').toLowerCase().includes(operationsSearchValue)
  );
}

const activeProjects = projects
  .filter((project) => ['Active', 'Scheduled'].includes(project.status))
  .filter(projectMatchesSearch);

const completedProjects = projects
  .filter((project) => project.status === 'Completed')
  .filter(projectMatchesSearch);

const projectCustomerOptions = customers.filter((customer) => {
  const search = projectCustomerSearch.toLowerCase();

  return (
    customer.name.toLowerCase().includes(search) ||
    customer.contactName.toLowerCase().includes(search) ||
    customer.phone.toLowerCase().includes(search) ||
    customer.email.toLowerCase().includes(search)
  );
});


  async function saveCustomer() {
    if (!newCustomer.name.trim()) return;
  
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: newCustomer.name,
        contact_name: newCustomer.contactName,
        phone: newCustomer.phone,
        email: newCustomer.email,
      })
      .select()
      .single();
  
    if (error) {
      console.error('Error saving customer:', error);
      return;
    }
  
    const customer: Customer = {
      id: data.id,
      name: data.name,
      contactName: data.contact_name ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      notes: data.notes ?? '',
    };
  
    setCustomers([...customers, customer]);
  
    setNewCustomer({
      name: '',
      contactName: '',
      phone: '',
      email: '',
    });
  
    setShowCustomerForm(false);
  }

  async function saveProject() {
    if (!newProject.id.trim() || !newProject.customerId) {
      return;
    }
  
    const { data, error } = await supabase
      .from('projects')
      .insert({
        project_number: newProject.id,
        customer_id: newProject.customerId,
        assigned_to: newProject.assignedToId || null,
        status: newProject.status,
        progress: Number(newProject.progress),
        service_start_date: newProject.startdateofservice,
        project_location: newProject.projectLocation,
        pricing_type: newProject.pricingType,
        notes: newProject.notes,
      })
      .select()
      .single();
  
    if (error) {
      console.error('Error saving project:', error);
      return;
    }
  
    const selectedCustomer = customers.find(
      (customer) => customer.id === newProject.customerId
    );
  
    const selectedEmployee = employees.find(
      (employee) => employee.id === newProject.assignedToId
    );
  
    const project: Project = {
      id: data.project_number,
      name: data.project_number,
      customer: selectedCustomer?.name ?? '',
      assignedTo: selectedEmployee?.name ?? '',
      status: data.status ?? 'Active',
      progress: Number(data.progress ?? 0),
      startdateofservice: data.service_start_date ?? '',
      projectLocation: data.project_location ?? '',
      notes: data.notes ?? '',
    };
    
  
    setProjects([...projects, project]);
  
    setNewProject({
      id: '',
      name: '',
      customerId: '',
      pricingType: 'Hourly',
      assignedToId: '',
      status: 'Scheduled',
      progress: 0,
      startdateofservice: '',
      projectLocation: '',
      notes: '',
    });

    setProjectCustomerSearch('');
    setShowProjectForm(false);
  }

  useEffect(() => {
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
        console.error('Error loading projects:', error);
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
  
    loadProjects();
  }, []);
  
  
  
  return (
    <div className="space-y-6 text-black">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-end md:justify-between">
  <div>
    <h1 className="text-2xl font-bold">Operations</h1>
    <p className="mt-1 text-sm text-gray-600">
      Active work, customer lookup, and project scheduling.
    </p>
  </div>

  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={() => setShowCustomerForm(true)}
      className="rounded-lg border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
    >
      + Add Customer
    </button>

    <button
      type="button"
      onClick={() => setShowProjectForm(true)}
      className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
    >
      + Add Project
    </button>
  </div>
</div>


      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
     
<p className="mt-0 text-sm text-gray-600">
  Search customers, projects, addresses, PO numbers, technicians, phone, or email.
</p>

        <input
          type="text"
          placeholder="Search by customer, contact, phone, or email..."
          value={operationsSearch}
onChange={(e) => setOperationsSearch(e.target.value)}
          className="mt-4 w-full rounded-lg border p-3"
        />

{operationsSearch && (
          <div className="mt-4 space-y-3">
            
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-500">{customer.id}</p>
                    <h3 className="font-bold">{customer.name}</h3>
                    <p className="text-sm text-gray-600">
                    {customer.contactName} • {customer.phone}
                    </p>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                  </div>

                  <Link
                    href={`/customers/${customer.id}`}
                    className="rounded-lg border px-4 py-2 text-center text-sm font-medium hover:bg-gray-50"
                  >
                    Open Profile
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-gray-600">
                No matching customers found. Use + Add Customer to create one.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
        <h2 className="text-xl font-bold">Active Projects</h2>

        <div className="mt-4 space-y-3 md:hidden">
  {activeProjects.map((project) => (
    <Link
      key={project.id}
      href={`/projects/${encodeURIComponent(project.id)}`}
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
        {project.projectLocation && <p>Location: {project.projectLocation}</p>}
      </div>
    </Link>
  ))}
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
            {activeProjects.map((project) => (
                <tr key={project.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <Link
                      href={`/projects/${encodeURIComponent(project.id)}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {project.id} — {project.name}
                    </Link>
                  </td>
                  <td className="p-4">{project.customer}</td>
<td className="p-4">{project.assignedTo}</td>
<td className="p-4">
  Latest service date:{' '}
  {project.latestServiceDate
    ? formatDate(project.latestServiceDate)
    : 'No service yet'}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow md:p-6">
  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-xl font-bold">Completed Projects</h2>
      <p className="mt-1 text-sm text-gray-600">
        Search completed work by project, customer, technician, or date.
      </p>
    </div>
  </div>


  <div className="mt-4 space-y-3 md:hidden">
    {completedProjects.map((project) => (
      <Link
        key={project.id}
        href={`/projects/${encodeURIComponent(project.id)}`}
        className="block rounded-xl border p-4"
      >
        <div className="flex items-start justify-between gap-3">
  <div>
    <h3 className="font-bold">{project.id}</h3>
    <p className="mt-1 text-sm font-medium">{project.customer}</p>
  </div>

  <div className="text-right text-xs text-gray-500">
  <p>Completion date</p>
    <p className="font-semibold text-gray-700">
      {project.latestServiceDate
        ? formatDate(project.latestServiceDate)
        : 'No service yet'}
    </p>
  </div>
</div>

<div className="mt-3 grid gap-1 text-sm text-gray-600">
  {project.assignedTo && <p>Assigned: {project.assignedTo}</p>}
  {project.projectLocation && <p>Location: {project.projectLocation}</p>}
</div>

      </Link>
    ))}
  </div>
  

  <div className="mt-4 hidden overflow-hidden rounded-xl border md:block">
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50">
        <tr>
        <th className="p-4">Project</th>
<th className="p-4">Customer / Location</th>
<th className="p-4">Assigned</th>
<th className="p-4">Completion Date</th>

        </tr>
      </thead>

      <tbody>
        {completedProjects.map((project) => (
          <tr key={project.id} className="border-t hover:bg-gray-50">
            <td className="p-4">
  <Link
    href={`/projects/${encodeURIComponent(project.id)}`}
    className="font-semibold text-blue-600 hover:underline"
  >
    {project.id}
  </Link>
</td>

<td className="p-4">
  <p className="font-medium">{project.customer}</p>
  {project.projectLocation && (
    <p className="text-xs text-gray-500">{project.projectLocation}</p>
  )}
</td>

<td className="p-4">{project.assignedTo || 'Unassigned'}</td>

<td className="p-4">
  {project.latestServiceDate
    ? formatDate(project.latestServiceDate)
    : 'No service yet'}
</td>

          </tr>
        ))}

        {completedProjects.length === 0 && (
          <tr>
            <td colSpan={5} className="p-4 text-center text-gray-500">
              No completed projects found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

      {showCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Add Customer</h2>

            <div className="mt-4 grid gap-4">
              <input
                type="text"
                placeholder="Customer name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="text"
                placeholder="Contact name"
                value={newCustomer.contactName}
onChange={(e) =>
  setNewCustomer({ ...newCustomer, contactName: e.target.value })
}
                className="rounded-lg border p-3"
              />

              <input
                type="tel"
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
                className="rounded-lg border p-3"
              />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Add Project</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
            
            <div className="relative">
  <label className="mb-2 block text-sm font-medium">Customer</label>

  <input
    type="text"
    placeholder="Start typing customer"
    value={
      newProject.customerId
        ? customers.find((customer) => customer.id === newProject.customerId)
            ?.name ?? projectCustomerSearch
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
              setNewProject({ ...newProject, customerId: customer.id });
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
  <label className="mb-2 block text-sm font-medium">Project Location</label>
  <input
    type="text"
    placeholder="Enter project address or location"
    value={newProject.projectLocation}
    onChange={(e) =>
      setNewProject({ ...newProject, projectLocation: e.target.value })
    }
    className="w-full rounded-lg border p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm font-medium">Pricing Model</label>
  <select
    value={newProject.pricingType}
    onChange={(e) =>
      setNewProject({ ...newProject, pricingType: e.target.value })
    }
    className="w-full rounded-lg border p-3"
  >
    <option>Hourly</option>
    <option>Per Foot / Lateral</option>
  </select>
</div>


<div>
  <label className="mb-2 block text-sm font-medium">Assigned To</label>
  <select
    value={newProject.assignedToId}
    onChange={(e) =>
      setNewProject({ ...newProject, assignedToId: e.target.value })
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
  className="w-full rounded-lg border p-3"
/>
              </div>
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
