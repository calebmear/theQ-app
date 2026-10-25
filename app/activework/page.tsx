'use client';

import Link from 'next/link';
import { CalendarDays, ChevronDown, Wrench } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';

import { supabase } from '../../lib/supabaseClient';

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

export default function ActiveWorkPage() {
  const searchParams = useSearchParams();
  const activeWorkSearch = searchParams.get('q') ?? '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [projectsRevision, setProjectsRevision] = useState(0);

  function formatDate(value: string | undefined) {
    if (!value) return '';

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  const activeWorkSearchValue = activeWorkSearch.toLowerCase().trim();

  function projectMatchesSearch(project: Project) {
    if (!activeWorkSearchValue) return true;

    return (
      project.id.toLowerCase().includes(activeWorkSearchValue) ||
      project.name.toLowerCase().includes(activeWorkSearchValue) ||
      project.customer.toLowerCase().includes(activeWorkSearchValue) ||
      project.assignedTo.toLowerCase().includes(activeWorkSearchValue) ||
      project.status.toLowerCase().includes(activeWorkSearchValue) ||
      project.startdateofservice.toLowerCase().includes(activeWorkSearchValue) ||
      (project.projectLocation ?? '').toLowerCase().includes(activeWorkSearchValue)
    );
  }

  const activeProjects = projects
    .filter((project) => project.status === 'Active')
    .filter(projectMatchesSearch)
    .sort((a, b) =>
      (b.latestServiceDate ?? '').localeCompare(a.latestServiceDate ?? '')
    );

  const scheduledProjects = projects
    .filter((project) => project.status === 'Scheduled')
    .filter(projectMatchesSearch);

  useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError('');
      try {
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

      if (error) throw error;

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

      if (!cancelled) setProjects(formattedProjects);
      } catch {
        if (!cancelled) setProjectsError('Could not load projects. Check your connection and try again.');
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }

    void loadProjects();
    return () => { cancelled = true; };
  }, [projectsRevision]);

  return (
    <div className="space-y-6 text-black">
      <div>
        <p className="text-center text-sm text-gray-600">
          Active and scheduled projects assigned to you.
        </p>
        <div className="mt-3">
          <ShopWorkCard />
        </div>
      </div>

      {projectsLoading ? (
        <p role="status" className="rounded-xl bg-white p-4 text-sm text-gray-600">Loading projects...</p>
      ) : projectsError ? (
        <div className="rounded-xl bg-white p-4">
          <p role="alert" className="text-sm text-red-700">{projectsError}</p>
          <button type="button" onClick={() => setProjectsRevision((value) => value + 1)}
            className="mt-3 min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold">Retry</button>
        </div>
      ) : <div className="grid gap-6 xl:grid-cols-2">
        <ProjectTable
          key={`active-${activeWorkSearchValue}`}
          title="Active Projects"
          scheduledCount={scheduledProjects.length}
          collapsedLimit={activeWorkSearchValue ? undefined : 2}
          showCount
          projects={activeProjects}
          formatDate={formatDate}
          emptyMessage="No active projects found."
        />

        <ProjectTable
          title="Scheduled Projects"
          sectionId="scheduled-projects"
          showCount
          projects={scheduledProjects}
          formatDate={formatDate}
          emptyMessage="No scheduled projects found."
        />
      </div>}
    </div>
  );
}

function ProjectTable({
  title,
  projects,
  formatDate,
  emptyMessage,
  collapsedLimit,
  showCount = false,
  scheduledCount,
  sectionId,
}: {
  title: string;
  projects: Project[];
  formatDate: (value: string | undefined) => string;
  emptyMessage: string;
  collapsedLimit?: number;
  showCount?: boolean;
  scheduledCount?: number;
  sectionId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [expandedHeight, setExpandedHeight] = useState<number>();
  const hiddenCount = collapsedLimit === undefined ? 0 : Math.max(0, projects.length - collapsedLimit);
  const canExpand = hiddenCount > 0;
  const visibleProjects = canExpand && !expanded ? projects.slice(0, collapsedLimit) : projects;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !expanded || !canExpand) return;
    function measure() {
      if (!list) return;
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-project-row]'))
        .filter((row) => row.getBoundingClientRect().height > 0);
      const lastVisibleRow = rows[Math.min(4, rows.length) - 1];
      if (!lastVisibleRow) return;
      // Includes the desktop header or mobile card gaps, and preserves the bottom border.
      const height = Math.ceil(lastVisibleRow.getBoundingClientRect().bottom -
        list.getBoundingClientRect().top + list.scrollTop) + 1;
      setExpandedHeight((current) => current === height ? current : height);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.querySelectorAll<HTMLElement>('[data-project-row]').forEach((row) => observer.observe(row));
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [expanded, canExpand, projects]);

  return (
    <div id={sectionId} className="scroll-mt-4 rounded-2xl bg-white p-4 shadow md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold">{title}{showCount ? ` (${projects.length})` : ''}</h2>
        {scheduledCount !== undefined && (
          <a href="#scheduled-projects"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-[#007bb5] hover:text-[#005f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5]">
            Scheduled ({scheduledCount}) <span aria-hidden="true" className="ml-1">↓</span>
          </a>
        )}
      </div>

      <div id={listId} ref={listRef}
        style={canExpand && expanded ? { maxHeight: expandedHeight ? `min(${expandedHeight}px, 65dvh)` : '65dvh' } : undefined}
        className={`mt-4 ${canExpand && expanded ? 'overflow-y-auto pr-2' : ''}`}>
      <div className="space-y-3 md:hidden">
        {visibleProjects.map((project) => (
          <article data-project-row key={project.id} className="rounded-xl border">
            <Link href={`/projects/${encodeURIComponent(project.id)}?from=/activework&fromLabel=Active%20Work`}
              className="block rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div className="min-w-0 flex-1">
  <h3 className="break-words font-bold">{project.id}</h3>
    <p className="mt-1 break-words text-sm font-medium">{project.customer}</p>
  </div>

  <div className="mt-1 text-sm text-gray-500 sm:shrink-0 sm:text-right">
  <p className="font-medium">
    {project.status === 'Scheduled' && !project.latestServiceDate
      ? 'Service start date (Est.)'
      : 'Latest service'}
  </p>

  <p className="mt-1 font-semibold text-gray-700">
    {project.latestServiceDate
      ? formatDate(project.latestServiceDate)
      : project.status === 'Scheduled' && project.startdateofservice
      ? formatDate(project.startdateofservice)
      : 'No service yet'}
  </p>
</div>
</div>

            <div className="mt-3 grid gap-1 break-words text-sm text-gray-600">
  {project.assignedTo && <p>Assigned: {project.assignedTo}</p>}
  {project.projectLocation && <p>Location: {project.projectLocation}</p>}
</div>

</Link>
{project.projectLocation && (
  <div className="px-4 pb-4">
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        project.projectLocation
      )}`}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
      Open in Maps
    </a>
  </div>
)}



          </article>
        ))}

        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="p-4">Project</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Assigned</th>
              <th className="p-4">
  {title === 'Scheduled Projects'
    ? 'Service Start Date (Est.)'
    : 'Latest Service Date'}
</th>            </tr>
          </thead>

          <tbody>
            {visibleProjects.map((project) => (
              <tr data-project-row key={project.id} className="border-t hover:bg-gray-50">
                <td className="p-4">
                  <Link
href={`/projects/${encodeURIComponent(project.id)}?from=/activework&fromLabel=Active%20Work`}
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
    : project.status === 'Scheduled' && project.startdateofservice
    ? formatDate(project.startdateofservice)
    : 'No service yet'}
</td>
              </tr>
            ))}

            {projects.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
      {canExpand && (
        <button type="button" aria-expanded={expanded} aria-controls={listId}
          onClick={() => {
            if (listRef.current) listRef.current.scrollTop = 0;
            setExpanded((value) => !value);
          }}
          className="mt-3 min-h-11 w-full rounded-lg border border-[#8fd8f7] bg-[#e8f7ff] px-3 py-2 text-sm font-semibold text-[#007bb5] transition-colors hover:bg-[#d5f0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5] focus-visible:ring-offset-2">
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

function shopWorkToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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


function ShopWorkCard() {
  const [historyRevision, setHistoryRevision] = useState(0);
  const [showShopWorkForm, setShowShopWorkForm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [workDate, setWorkDate] = useState(shopWorkToday);
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<ShopWorkCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const savingRef = useRef(false);
  // Reuse the request ID after an uncertain network failure to avoid duplicates.
  const pendingRequest = useRef<{
    id: string;
    userId: string;
    workDate: string;
    description: string;
    categories: ShopWorkCategory[];
  } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!showShopWorkForm) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showShopWorkForm]);

  function closeShopWork() {
    if (savingRef.current) return;
    if ((description.trim() || categories.length > 0) &&
        !window.confirm('Discard this unsaved shop work entry?')) return;
    setDescription('');
    setCategories([]);
    setSaveError('');
    setShowShopWorkForm(false);
  }

  async function submitShopWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const note = description.trim();
    const selectedCategories = shopWorkCategories.filter((category) => categories.includes(category));
    setSuccess('');
    setSaveError('');
    if (selectedCategories.length === 0) {
      setSaveError('Select at least one area: Van, Truck, or Misc.');
      return;
    }
    if (!workDate || !note) {
      setSaveError('Enter the work date and describe the shop work performed.');
      return;
    }
    if (note.length > 2000) {
      setSaveError('Keep the description to 2,000 characters or fewer.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Please sign in before submitting shop work.');
      if (!pendingRequest.current ||
          pendingRequest.current.userId !== user.id ||
          pendingRequest.current.workDate !== workDate ||
          pendingRequest.current.description !== note ||
          JSON.stringify(pendingRequest.current.categories) !== JSON.stringify(selectedCategories)) {
        pendingRequest.current = {
          id: crypto.randomUUID(), userId: user.id, workDate, description: note, categories: selectedCategories,
        };
      }
      const request = pendingRequest.current;
      const { error } = await supabase.from('shop_work_entries').insert({
        id: request.id,
        work_date: request.workDate,
        description: request.description,
        categories: request.categories,
        created_by: request.userId,
      });
      if (error) {
        // If a retry finds the same committed record, confirm it before succeeding.
        if (error.code !== '23505') throw error;
        const { data: existing, error: lookupError } = await supabase
          .from('shop_work_entries')
          .select('id, work_date, description, categories')
          .eq('id', request.id)
          .eq('created_by', user.id)
          .maybeSingle();
        if (lookupError || !existing || existing.work_date !== request.workDate ||
            existing.description !== request.description ||
            JSON.stringify(existing.categories) !== JSON.stringify(request.categories)) throw lookupError || error;
      }
      pendingRequest.current = null;
      setDescription('');
      setCategories([]);
      setSuccess('Shop work recorded.');
      setHistoryRevision((value) => value + 1);
      setShowShopWorkForm(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message :
        (error as { message?: string })?.message || 'Could not save shop work. Please retry.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => {
        setSaveError('');
        setSuccess('');
        setWorkDate(shopWorkToday());
        setShowShopWorkForm(true);
      }} className="flex h-9 min-h-9 max-h-9 w-full items-center justify-center rounded-lg bg-black px-3 py-0 text-sm font-medium leading-5 text-white shadow-sm hover:bg-gray-800">
        + Shop Work
      </button>
      {success && <p role="status" className="mt-3 text-sm font-medium text-green-700">{success}</p>}

      <dialog ref={dialogRef} aria-labelledby="shop-work-modal-title"
        onCancel={(event) => {
          event.preventDefault();
          closeShopWork();
        }}
        style={{ width: 'calc(100% - 2rem)', maxWidth: '48rem', boxSizing: 'border-box' }}
        onClose={() => setShowShopWorkForm(false)}
        className="m-auto max-h-[90dvh] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-black shadow-xl backdrop:bg-black/40">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-6 py-4">
          <h2 id="shop-work-modal-title" className="min-w-0 text-xl font-bold">Log Shop Work</h2>
          <button type="button" disabled={saving} onClick={closeShopWork}
            className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Close</button>
        </div>
      <form onSubmit={submitShopWork} className="min-w-0 p-6">
        <div className="min-w-0 space-y-4">
        <div className="min-w-0">
          <label htmlFor="shop-work-date" className="mb-2 block text-sm font-medium">Work date</label>
          <input id="shop-work-date" type="date" required value={workDate} disabled={saving}
            onChange={(event) => {
              setWorkDate(event.target.value);
              setSuccess('');
              setSaveError('');
            }}
            className="block box-border min-w-0 w-full max-w-full appearance-none rounded-lg border border-black bg-white p-3 text-sm font-normal disabled:bg-gray-50 [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left" />
        </div>
        <fieldset disabled={saving} className="min-w-0">
          <legend className="mb-2 text-sm font-medium">Work area <span className="font-normal text-gray-500">(select at least one)</span></legend>
          <div className="grid grid-cols-3 gap-2">
            {shopWorkCategories.map((category) => (
              <label key={category} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-3 text-sm font-medium focus-within:ring-2 focus-within:ring-[#009be5] ${categories.includes(category) ? 'text-[#16324f]' : 'text-gray-700'}`}>
                <input type="checkbox" checked={categories.includes(category)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setCategories((current) => checked ? [...current, category] : current.filter((value) => value !== category));
                  }} className="h-4 w-4 accent-[#16324f]" />
                {category}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="shop-work-description" className="mb-2 block text-sm font-medium">Work performed</label>
          <textarea id="shop-work-description" required maxLength={2000} rows={3}
            value={description} disabled={saving}
            onChange={(event) => { setDescription(event.target.value); setSuccess(''); }}
            placeholder="Describe the shop work you completed..."
            className="block w-full resize-y rounded-lg border p-3 text-sm font-normal disabled:bg-gray-50" />
        </div>
        {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
        </div>
        <div className="mt-4 grid gap-3">
        <button type="submit" disabled={saving || !workDate || !description.trim() || categories.length === 0}
          className="w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Saving...' : 'Submit Shop Work'}
        </button>
        </div>
      </form>
      </dialog>

      <ShopWorkHistory refreshKey={historyRevision} onAddForDate={(date) => {
        setWorkDate(date);
        setSaveError('');
        setSuccess('');
        setShowShopWorkForm(true);
      }} />
    </div>
  );
}

type ShopWorkEntry = {
  id: string;
  categories: string[];
  work_date: string;
  description: string;
  created_at: string;
  updated_at: string;
};

function shopMonthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const next = new Date(year, monthNumber, 1);
  return {
    start: `${month}-01`,
    end: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
    firstWeekday: new Date(year, monthNumber - 1, 1).getDay(),
    dayCount: new Date(year, monthNumber, 0).getDate(),
    label: new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

function ShopWorkHistory({ refreshKey, onAddForDate }: { refreshKey: number; onAddForDate: (date: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState(() => shopWorkToday().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(shopWorkToday);
  const [entries, setEntries] = useState<ShopWorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingEntries, setManagingEntries] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategories, setEditCategories] = useState<ShopWorkCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const bounds = shopMonthBounds(month);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      setEntries([]);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('Please sign in to view your shop work.');
        const { start, end } = shopMonthBounds(month);
        const { data, error } = await supabase.from('shop_work_entries')
          .select('id, work_date, description, categories, created_at, updated_at')
          .eq('created_by', user.id).is('deleted_at', null)
          .gte('work_date', start).lt('work_date', end)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setEntries(data ?? []);
      } catch (error) {
        if (!cancelled) setLoadError(shopWorkError(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [expanded, month, refreshKey, revision]);

  function discardEdit() {
    if (busyRef.current) return false;
    const original = entries.find((entry) => entry.id === editingId);
    const dirty = original && (editDate !== original.work_date || editDescription !== original.description ||
      JSON.stringify(shopWorkCategories.filter((area) => editCategories.includes(area))) !==
      JSON.stringify(shopWorkCategories.filter((area) => original.categories?.includes(area))));
    if (dirty && !window.confirm('Discard your unsaved changes?')) return false;
    setEditingId(null);
    return true;
  }

  function changeMonth(direction: number) {
    if (!discardEdit()) return;
    const [year, number] = month.split('-').map(Number);
    const date = new Date(year, number - 1 + direction, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDate(null);
    setEditingId(null);
    setActionError('');
    setNotice('');
  }

  async function changeEntry(entry: ShopWorkEntry, remove: boolean) {
    if (busyRef.current) return;
    setActionError('');
    setNotice('');
    if (!remove && (!editDate || !editDescription.trim() || editDescription.trim().length > 2000)) {
      setActionError('Enter a date and a description of up to 2,000 characters.');
      return;
    }
    if (!remove && editCategories.length === 0) {
      setActionError('Select at least one area: Van, Truck, or Misc.');
      return;
    }
    if (remove && !window.confirm('Delete this shop work submission?')) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Please sign in to change shop work.');
      const values = remove
        ? { deleted_at: new Date().toISOString() }
        : { work_date: editDate, description: editDescription.trim(), categories: shopWorkCategories.filter((area) => editCategories.includes(area)) };
      const { data, error } = await supabase.from('shop_work_entries')
        .update(values).eq('id', entry.id).eq('created_by', user.id)
        .eq('updated_at', entry.updated_at).is('deleted_at', null)
        .select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This submission changed or is no longer available. Refresh the history before trying again.');
      setEditingId(null);
      if (!remove) {
        setMonth(editDate.slice(0, 7));
        setSelectedDate(editDate);
      }
      setNotice(remove ? 'Shop work deleted.' : 'Shop work updated.');
      setRevision((value) => value + 1);
    } catch (error) {
      setActionError(shopWorkError(error));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const counts = entries.reduce<Record<string, number>>((result, entry) => {
    result[entry.work_date] = (result[entry.work_date] ?? 0) + 1;
    return result;
  }, {});
  const areasByDate = shopAreasByDate(entries);
  const selectedEntries = entries.filter((entry) => entry.work_date === selectedDate);

  return (
    <section className="mt-3">
      <button type="button" aria-expanded={expanded} aria-controls="shop-work-history"
        onClick={() => { if (expanded && !discardEdit()) return; setExpanded((value) => !value); }}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-1 py-2 text-center text-sm font-semibold text-[#007bb5] transition-colors hover:text-[#005f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5] focus-visible:ring-offset-2">
        <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span>Shop Calendar</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div id="shop-work-history" className="mt-2 rounded-2xl bg-white p-4 md:p-6">
          <div className="mx-auto max-w-lg">
            <div className="flex justify-center gap-6 text-[11px] font-medium text-gray-600">
              <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded bg-[#16324f]" />Submitted</span>
              <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded border bg-gray-50" />No submission</span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button type="button" aria-label="Previous month" disabled={busy} onClick={() => changeMonth(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg font-semibold hover:bg-gray-50">‹</button>
              <p className="min-w-0 flex-1 text-center text-sm font-bold text-gray-800">{bounds.label}</p>
              <button type="button" aria-label="Next month" disabled={busy} onClick={() => changeMonth(1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg font-semibold hover:bg-gray-50">›</button>
            </div>
            {loading ? <p role="status" className="mt-4 text-sm text-gray-500">Loading shop work...</p> : loadError ? (
              <div className="mt-4"><p role="alert" className="text-sm text-red-700">{loadError}</p>
                <button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 rounded-lg border px-3 py-2 text-sm">Retry</button></div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-gray-500">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {Array.from({ length: bounds.firstWeekday }, (_, i) => <div key={`blank-${i}`} className="aspect-square" />)}
                  {Array.from({ length: bounds.dayCount }, (_, i) => {
                    const day = i + 1;
                    const key = `${month}-${String(day).padStart(2, '0')}`;
                    const selected = key === selectedDate;
                    const count = counts[key] ?? 0;
                    const dayAreas = areasByDate[key] ?? [];
                    return <button key={key} type="button" disabled={busy} aria-pressed={selected}
                      aria-label={`${key}: ${count} shop work submissions${dayAreas.length ? `; ${dayAreas.join(', ')}` : ''}`}
                      onClick={() => { if (!discardEdit()) return; setSelectedDate(selected ? null : key); setEditingId(null); setActionError(''); setNotice(''); }}
                      className={`relative flex min-h-11 aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                        count ? 'bg-[#16324f] text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      } ${selected ? 'ring-2 ring-black ring-offset-2' : key === shopWorkToday() ? 'ring-2 ring-[#16324f] ring-offset-1' : ''}`}>
                      <span className="leading-none">{day}</span>
                    </button>;
                  })}
                </div>
                {selectedDate && (
                  <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                    <p className="text-sm font-bold text-gray-900">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US')}</p>
                    <button type="button" disabled={busy} onClick={() => { if (discardEdit()) onAddForDate(selectedDate); }}
                      className="mt-3 min-h-11 w-full rounded-lg border border-[#8fd8f7] bg-[#e8f7ff] px-3 py-2 text-sm font-semibold text-[#007bb5] hover:bg-[#d5f0ff] disabled:opacity-50">
                      + Add entry for this date
                    </button>
                    {selectedEntries.length === 0 && <p className="mt-2 text-sm text-gray-500">No shop work submitted for this day.</p>}
                    {selectedEntries.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <button type="button" disabled={busy} aria-pressed={managingEntries}
                          onClick={() => {
                            if (!discardEdit()) return;
                            setManagingEntries((value) => !value);
                            setEditingId(null);
                            setActionError('');
                          }}
                          className="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                          {managingEntries ? 'Done' : 'Manage Entries'}
                        </button>
                      </div>
                    )}
                    <div className="mt-3 space-y-2">
                      {selectedEntries.map((entry) => <div key={entry.id} className="rounded-lg border bg-white p-3">
                        {editingId === entry.id ? (
                          <form onSubmit={(event) => { event.preventDefault(); void changeEntry(entry, false); }} className="space-y-3">
                            <label className="block text-sm font-medium">Work date
                              <input type="date" required value={editDate} disabled={busy} onChange={(event) => setEditDate(event.target.value)} className="mt-1 block min-w-0 w-full rounded-lg border p-2 text-base" />
                            </label>
                            <label className="block text-sm font-medium">Work performed
                              <textarea required maxLength={2000} rows={3} value={editDescription} disabled={busy} onChange={(event) => setEditDescription(event.target.value)} className="mt-1 block min-w-0 w-full rounded-lg border p-2 text-base" />
                            </label>
                            <fieldset disabled={busy}>
                              <legend className="text-sm font-medium">Work area (select at least one)</legend>
                              <div className="flex flex-wrap gap-2">
                                {shopWorkCategories.map((area) => (
                                  <label key={area} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm focus-within:ring-2 focus-within:ring-[#009be5]">
                                    <input type="checkbox" className="h-4 w-4 accent-[#16324f]" checked={editCategories.includes(area)}
                                      onChange={(event) => {
                                        const checked = event.target.checked;
                                        setEditCategories((current) => checked ? [...current, area] : current.filter((value) => value !== area));
                                      }} />{area}
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                            <div className="flex flex-wrap gap-2">
                              <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50">{busy ? 'Saving...' : 'Save'}</button>
                              <button type="button" disabled={busy} onClick={() => { discardEdit(); }} className="min-h-11 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
                              <button type="button" disabled={busy} onClick={() => void changeEntry(entry, true)} className="min-h-11 rounded-lg border px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            {shopWorkCategories.some((area) => entry.categories?.includes(area)) && (
                              <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[#16324f]">
                                {shopWorkCategories.filter((area) => entry.categories?.includes(area)).map((area) => (
                                  <span key={area} className="inline-flex items-center gap-1"><ShopAreaIcon area={area} className="h-4 w-4" />{area}</span>
                                ))}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{entry.description}</p>
                            {managingEntries && (
                              <div className="mt-3 flex gap-2">
                                <button type="button" disabled={busy} onClick={() => { if (!discardEdit()) return; setEditCategories(shopWorkCategories.filter((area) => entry.categories?.includes(area))); setEditingId(entry.id); setEditDate(entry.work_date); setEditDescription(entry.description); setActionError(''); }} className="min-h-11 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Edit</button>
                                <button type="button" disabled={busy} onClick={() => void changeEntry(entry, true)} className="min-h-11 rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>)}
                    </div>
                  </div>
                )}
              </>
            )}
            {actionError && <div className="mt-3"><p role="alert" className="text-sm text-red-700">{actionError}</p><button type="button" disabled={busy} onClick={() => { if (!discardEdit()) return; setEditingId(null); setRevision((value) => value + 1); setActionError(''); }} className="mt-2 rounded-lg border px-3 py-2 text-sm">Refresh history</button></div>}
            {notice && <p role="status" className="mt-3 text-sm text-green-700">{notice}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function shopWorkError(error: unknown) {
  return error instanceof Error ? error.message :
    (error as { message?: string })?.message || 'Could not update shop work. Please try again.';
}
