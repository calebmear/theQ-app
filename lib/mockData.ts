export const projects = [
  {
    id: 'P-1001',
    customer: 'Smith Residence',
    name: 'Kitchen Remodel',
    status: 'In Progress',
    assignedTo: 'Mike',
    progress: 65,
    targetCompletion: '2026-06-15',
  },
  {
    id: 'P-1002',
    customer: 'Acme Office',
    name: 'Conference Room Buildout',
    status: 'Scheduled',
    assignedTo: 'Sarah',
    progress: 20,
    targetCompletion: '2026-06-28',
  },
  {
    id: 'P-1003',
    customer: 'Johnson Home',
    name: 'Basement Finish',
    status: 'In Progress',
    assignedTo: 'Chris',
    progress: 45,
    targetCompletion: '2026-07-10',
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