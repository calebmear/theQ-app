export const customers = [
  {
    id: 'cust-001',
    name: 'Bayside Apartments',
    contactName: 'Mark Reynolds',
    email: 'mark@bayside.com',
    phone: '555-214-8890',
    address: '1200 Harbor Ave, Tampa, FL',
    notes: 'Prefers morning service windows.',
  },
  {
    id: 'cust-002',
    name: 'Northpoint Plaza',
    contactName: 'Sarah Miller',
    email: 'sarah@northpoint.com',
    phone: '555-907-4412',
    address: '880 Northpoint Blvd, Orlando, FL',
    notes: 'Multiple active projects expected this quarter.',
  },
  {
    id: 'cust-003',
    name: 'Westlake HOA',
    contactName: 'Daniel Perez',
    email: 'daniel@westlakehoa.com',
    phone: '555-661-3009',
    address: '45 Westlake Dr, Lakeland, FL',
    notes: 'Board approval needed before new projects begin.',
  },
];

export const projects = [
  {
    id: 'P-1001',
    customer: 'Smith Residence',
    name: 'Kitchen Remodel',
    status: 'In Progress',
    assignedTo: 'Mike',
    progress: 65,
    startdateofservice: '2026-06-15',
  },
  {
    id: 'P-1002',
    customer: 'Acme Office',
    name: 'Conference Room Buildout',
    status: 'Scheduled',
    assignedTo: 'Sarah',
    progress: 20,
    startdateofservice: '2026-06-28',
  },
  {
    id: 'P-1003',
    customer: 'Johnson Home',
    name: 'Basement Finish',
    status: 'In Progress',
    assignedTo: 'Chris',
    progress: 45,
    startdateofservice: '2026-07-10',
  },
];

export const timeEntries = [
  {
    id: 'T-001',
    projectId: 'P-1001',
    user: 'Mike',
    submittedAt: '2026-05-08 2:43 PM',
    hours: 4.5,
    workCompleted: 'Mainline',
    vehicle: '2016 Ford Van',
    notes: 'Completed mainline service and cleanup.',
  },
  {
    id: 'T-002',
    projectId: 'P-1001',
    user: 'Mike',
    submittedAt: '2026-05-07 11:10 AM',
    hours: 3,
    workCompleted: 'Lateral',
    vehicle: '2007 Ford F-150',
    notes: 'Worked on lateral access and inspection.',
  },
];

export const employees = [
  {
    id: 'emp-all',
    name: 'All',
    role: 'Field Team',
    active: true,
  },
  {
    id: 'emp-001',
    name: 'Robert',
    role: 'Technician',
    active: true,
  },
  {
    id: 'emp-002',
    name: 'Tylor',
    role: 'Technician',
    active: true,
  },
  {
    id: 'emp-003',
    name: 'Cameron',
    role: 'Technician',
    active: true,
  },
];

