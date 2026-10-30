'use client';

import Link from 'next/link';
import { Wrench, X, ChevronLeft, ChevronRight, Map } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode, type TouchEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

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
    <div className="space-y-6 pb-20 text-black">
      {projectsLoading ? (
        <ActiveWorkLoading />
      ) : projectsError ? (
        <div className="rounded-xl bg-white p-4">
          <p role="alert" className="text-sm text-red-700">{projectsError}</p>
          <button type="button" onClick={() => setProjectsRevision((value) => value + 1)}
            className="mt-3 min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold">Retry</button>
        </div>
      ) : <ActiveWorkTiles
      key={activeWorkSearchValue || 'all'}
      initialView={searchParams.get('view')}
      activeCount={activeProjects.length}
      scheduledCount={scheduledProjects.length}
        activeProjects={<ProjectTable title="Active Projects" hideTitle
          collapsedLimit={activeWorkSearchValue ? undefined : 2}
          projects={activeProjects} formatDate={formatDate} emptyMessage="No active projects found." />}
        scheduledProjects={<ProjectTable title="Scheduled Projects" hideTitle
          projects={scheduledProjects} formatDate={formatDate} emptyMessage="No scheduled projects found." />}
      />}
      <ShopWorkCard />
    </div>
  );
}

function ProjectTable({
  title,
  hideTitle = false,
  projects,
  formatDate,
  emptyMessage,
  collapsedLimit,
  showCount = false,
  scheduledCount,
  sectionId,
}: {
  title: string;
  hideTitle?: boolean;
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
        <h2 className={hideTitle ? 'sr-only' : 'text-xl font-bold'}>{title}{showCount ? ` (${projects.length})` : ''}</h2>
        {scheduledCount !== undefined && (
          <a href="#scheduled-projects"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-[#007bb5] hover:text-[#005f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5]">
            Scheduled ({scheduledCount}) <span aria-hidden="true" className="ml-1">↓</span>
          </a>
        )}
      </div>

      <div id={listId} ref={listRef}
        style={canExpand && expanded ? { maxHeight: expandedHeight ? `min(${expandedHeight}px, 65dvh)` : '65dvh' } : undefined}
        className={`${hideTitle ? '' : 'mt-4'} ${canExpand && expanded ? 'overflow-y-auto pr-2' : ''}`}>
      <div className="space-y-3 md:hidden">
        {visibleProjects.map((project) => (
          <article data-project-row key={project.id} className="relative rounded-xl border">
            <Link href={`/projects/${encodeURIComponent(project.id)}?from=/activework&fromLabel=Active%20Work`}
              className="block rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009be5]">
            <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${project.projectLocation ? 'pr-12' : ''}`}>
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

</div>

</Link>
{project.projectLocation && (
  <div className="flex items-center gap-2 px-4 pb-4 text-sm text-gray-600">
    <p className="min-w-0 flex-1 break-words">Location: {project.projectLocation}</p>
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        project.projectLocation
      )}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open maps for ${project.id}`}
      title="Open in Maps"
      className="absolute right-3 top-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f7ff] p-0 text-[#16324f] hover:bg-[#d9f0fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]"
      >
      <Map aria-hidden="true" size={20} className="block" />
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
  const [showShopCalendar, setShowShopCalendar] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const shopTriggerRef = useRef<HTMLButtonElement>(null);
  const hadModalOpen = useRef(false);

  useEffect(() => {
    let timer: number | undefined;
    const scroll = () => { setScrolling(true); if (timer !== undefined) window.clearTimeout(timer); timer = window.setTimeout(() => setScrolling(false), 400); };
    window.addEventListener('scroll', scroll, { passive: true, capture: true });
    return () => { window.removeEventListener('scroll', scroll, true); if (timer !== undefined) window.clearTimeout(timer); };
  }, []);



  const [historyRevision, setHistoryRevision] = useState(0);
  const [showShopWorkForm, setShowShopWorkForm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const modalOpen = showShopWorkForm || showShopCalendar;
    let frame: number | undefined;
    if (!modalOpen && hadModalOpen.current) frame = window.requestAnimationFrame(() => shopTriggerRef.current?.focus());
    hadModalOpen.current = modalOpen;
    return () => { if (frame !== undefined) window.cancelAnimationFrame(frame); };
  }, [showShopWorkForm, showShopCalendar]);

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

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(''), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  function closeShopWork() {
    if (savingRef.current) return;
    if ((description.trim() || categories.length > 0) &&
        !window.confirm('Discard this unsaved shop work entry?')) return;
    setDescription('');
    setCategories([]);
    setSaveError('');
    setShowShopWorkForm(false);
    setShowShopCalendar(false);
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
      setSuccess('Shop time recorded.');
      setHistoryRevision((value) => value + 1);
      setShowShopWorkForm(false);
      setShowShopCalendar(true);
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
      {!showShopWorkForm && !showShopCalendar && <div
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)_+_2rem)] right-6 z-30 md:bottom-[calc(env(safe-area-inset-bottom)_+_1rem)] flex flex-col items-end gap-3 transition-opacity duration-200 motion-reduce:transition-none md:right-8 ${scrolling ? 'opacity-25' : 'opacity-100'}`}>
        <button ref={shopTriggerRef} type="button" aria-label="Open shop calendar to add shop time" aria-haspopup="dialog"
          onClick={() => setShowShopCalendar(true)} className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-0 bg-[#16324f] p-0 text-white shadow-lg hover:bg-[#10263d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]">
          <Wrench aria-hidden="true" size={26} strokeWidth={2.25} />
        </button>
      </div>}
      {success && <p role="status" className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)_+_5.5rem)] left-4 right-4 z-40 rounded-xl bg-[#16324f] px-4 py-3 text-center text-sm text-white shadow-lg md:left-auto md:right-8">{success}</p>}

      <dialog ref={dialogRef} aria-labelledby="shop-work-modal-title"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeShopWork();
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeShopWork();
        }}
        style={{ width: 'calc(100% - 2rem)', maxWidth: '48rem', boxSizing: 'border-box' }}
        onClose={() => setShowShopWorkForm(false)}
        className="m-auto max-h-[90dvh] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-black shadow-xl backdrop:bg-black/40">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-6 py-4">
          <h2 id="shop-work-modal-title" className="min-w-0 text-xl font-bold">Add Shop Time</h2>
          <button type="button" disabled={saving} onClick={closeShopWork} aria-label="Close Add Shop Time"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border p-0 hover:bg-gray-50 disabled:opacity-50"><X aria-hidden="true" size={22} /></button>
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
          {saving ? 'Saving...' : 'Save Shop Time'}
        </button>
        </div>
      </form>
      </dialog>

      {showShopCalendar && <ShopWorkHistory initialDate={workDate} refreshKey={historyRevision} onClose={() => setShowShopCalendar(false)} onAddForDate={(date) => {
        setShowShopCalendar(false);
        setWorkDate(date);
        setSaveError('');
        setSuccess('');
        setShowShopWorkForm(true);
      }} />}
    </div>
  );
}

type ShopWorkEntry = {
  id: string;
  created_by: string;
  technician_name: string;
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

function ShopWorkHistory({ refreshKey, onAddForDate, onClose, initialDate }: { refreshKey: number; onAddForDate: (date: string) => void; onClose: () => void; initialDate: string }) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const expanded = true;
  const calendarDialogRef = useRef<HTMLDialogElement>(null);
  const monthGesture = useRef<{ x: number; y: number; startedAt: number } | null>(null);
  const suppressDayClickUntil = useRef(0);

  function startMonthSwipe(event: TouchEvent<HTMLDialogElement>) {
    monthGesture.current = null;
    if (event.touches.length !== 1) return;
    const target = event.target;
    if (target instanceof Element) {
      if (target.closest('a, input, select, textarea, [contenteditable="true"]')) return;
      if (target.closest('button') && !target.closest('[data-shop-calendar-days]')) return;
    }
    const touch = event.touches[0];
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
    monthGesture.current = { x: touch.clientX, y: touch.clientY, startedAt: Date.now() };
  }

  function moveMonthSwipe(event: TouchEvent<HTMLDialogElement>) {
    const start = monthGesture.current;
    if (!start || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - start.x, dy = event.touches[0].clientY - start.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { monthGesture.current = null; return; }
    if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.5) suppressDayClickUntil.current = Date.now() + 600;
  }

  function endMonthSwipe(event: TouchEvent<HTMLDialogElement>) {
    const start = monthGesture.current;
    monthGesture.current = null;
    if (!start || event.changedTouches.length !== 1 || event.touches.length !== 0) return;
    const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy) * 1.5 || Date.now() - start.startedAt > 800) return;
    event.stopPropagation();
    suppressDayClickUntil.current = Date.now() + 600;
    // The existing changeMonth function preserves busy and unsaved-edit checks.
    changeMonth(dx < 0 ? 1 : -1);
  }

  const [month, setMonth] = useState(() => (initialDate || shopWorkToday()).slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(() => initialDate || shopWorkToday());
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
    const dialog = calendarDialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);


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
        if (!user) throw new Error('Please sign in to view shop work.');
        if (!cancelled) setViewerId(user.id);
        const { start, end } = shopMonthBounds(month);
        const { data, error } = await supabase.rpc('get_team_shop_work', { p_start: start, p_end: end });
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

  useEffect(() => {
    if (!expanded || editingId || busy) return;
    const refresh = () => { if (document.visibilityState === 'visible') setRevision((value) => value + 1); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [expanded, editingId, busy]);

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
    if (entry.created_by !== viewerId) { setActionError('You can only edit or delete your own shop entries.'); return; }
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
    <dialog ref={calendarDialogRef} aria-labelledby="activework-shop-calendar-title" aria-busy={loading}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (outside && discardEdit()) onClose();
      }}
      onTouchStart={startMonthSwipe} onTouchMove={moveMonthSwipe} onTouchEnd={endMonthSwipe}
      onTouchCancel={() => { monthGesture.current = null; }}
      onClickCapture={(event) => {
        if (Date.now() < suppressDayClickUntil.current && event.target instanceof Element && event.target.closest('[data-shop-calendar-days]')) {
          event.preventDefault(); event.stopPropagation();
        }
      }}
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onCancel={(event) => { event.preventDefault(); if (discardEdit()) onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-black shadow-xl backdrop:bg-black/40">
      <div className="sticky top-0 z-20 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 border-b bg-white px-4 py-3">
        <span aria-hidden="true" />
        <h2 id="activework-shop-calendar-title" className="text-center text-lg font-bold">Shop Calendar</h2>
        <button type="button" disabled={busy} onClick={() => { if (discardEdit()) onClose(); }} aria-label="Close shop calendar" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border p-0 disabled:opacity-50"><X aria-hidden="true" size={22} /></button>
      </div>
      {expanded && (
        <div id="shop-work-history" className="bg-white p-4 md:p-6">
          <div className="mx-auto max-w-lg">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-gray-600">
              <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded bg-[#16324f]" />Submitted</span>
              <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded border bg-gray-50" />No submission</span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button type="button" aria-label="Previous month" disabled={busy} onClick={() => changeMonth(-1)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8def0] bg-[#e8f7ff] p-0 text-[#16324f] transition-colors hover:border-[#16324f] hover:bg-[#d9f0fc] active:bg-[#c5e8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]"><ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} className="block" /></button>
              <p aria-live="polite" className="min-w-[10rem] text-center text-sm font-bold text-gray-800">{bounds.label}</p>
              <button type="button" aria-label="Next month" disabled={busy} onClick={() => changeMonth(1)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8def0] bg-[#e8f7ff] p-0 text-[#16324f] transition-colors hover:border-[#16324f] hover:bg-[#d9f0fc] active:bg-[#c5e8fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007bb5]"><ChevronRight aria-hidden="true" size={22} strokeWidth={2.5} className="block" /></button>
            </div>
            {loadError ? (
              <div className="mt-4"><p role="alert" className="text-sm text-red-700">{loadError}</p>
                <button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 rounded-lg border px-3 py-2 text-sm">Retry</button></div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-gray-500">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
                </div>
                <div data-shop-calendar-days className="mt-2 grid grid-cols-7 gap-1">
                  {Array.from({ length: bounds.firstWeekday }, (_, i) => <div key={`blank-${i}`} className="aspect-square" />)}
                  {Array.from({ length: bounds.dayCount }, (_, i) => {
                    const day = i + 1;
                    const key = `${month}-${String(day).padStart(2, '0')}`;
                    const selected = key === selectedDate;
                    const count = counts[key] ?? 0;
                    const dayAreas = areasByDate[key] ?? [];
                    return <button key={key} type="button" disabled={busy} aria-pressed={selected} aria-current={key === shopWorkToday() ? 'date' : undefined}
                      aria-label={`${key}: ${count} shop work submissions${dayAreas.length ? `; ${dayAreas.join(', ')}` : ''}`}
                      onClick={() => { if (!discardEdit()) return; setSelectedDate(selected ? null : key); setEditingId(null); setActionError(''); setNotice(''); }}
                      className={`relative flex min-h-11 aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                        count ? 'bg-[#16324f] text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      } ${selected ? 'ring-2 ring-[#16324f] ring-offset-2' : key === shopWorkToday() ? 'ring-2 ring-[#009be5] ring-offset-1' : ''}`}>
                      <span className="leading-none">{day}</span>
                    </button>;
                  })}
                </div>
                {selectedDate && (
                  <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                    <p className="text-sm font-bold text-gray-900">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US')}</p>
                    <button type="button" disabled={busy} onClick={() => { if (discardEdit()) onAddForDate(selectedDate); }}
                      className="mt-3 min-h-11 w-full rounded-lg border border-[#8fd8f7] bg-[#e8f7ff] px-3 py-2 text-sm font-semibold text-[#007bb5] hover:bg-[#d5f0ff] disabled:opacity-50">
                      Add Shop Time
                    </button>
                    {!loading && selectedEntries.length === 0 && <p className="mt-2 text-sm text-gray-500">No shop work submitted for this day.</p>}
                    {selectedEntries.some((entry) => entry.created_by === viewerId) && (
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
                        {editingId === entry.id && entry.created_by === viewerId ? (
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
                            <p className="mt-2 text-xs text-gray-500">Submitted {new Date(entry.created_at).toLocaleString('en-US')} by {entry.technician_name}{entry.created_by === viewerId ? ' (you)' : ''}</p>
                            {managingEntries && entry.created_by === viewerId && (
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
    </dialog>
  );
}

function shopWorkError(error: unknown) {
  return error instanceof Error ? error.message :
    (error as { message?: string })?.message || 'Could not update shop work. Please try again.';
}


type ActiveWorkTile = 'active' | 'scheduled';

function ActiveWorkTiles({
  activeProjects,
  scheduledProjects,
  activeCount,
  scheduledCount,
  initialView,
}: {
  activeProjects: ReactNode;
  scheduledProjects: ReactNode;
  activeCount: number;
  scheduledCount: number;
  initialView: string | null;
}) {
  const [active, setActive] = useState<ActiveWorkTile>(() =>
    initialView === 'scheduled'
      ? 'scheduled'
      : activeCount === 0 && scheduledCount > 0
        ? 'scheduled'
        : 'active'
  );
  const [swipeProgress, setSwipeProgress, swipeHost] = useCompositorSwipe(active === 'scheduled' ? 1 : 0, 1);
  const carouselPosition = Math.max(0, Math.min(1, (active === 'scheduled' ? 1 : 0) + swipeProgress));
  const [tileHeight, setTileHeight] = useState<number | undefined>();
  const { swipeArea, swipeFloor } = useSwipeAreaFloor();
  const [settling, setSettling] = useState(false);
  useEffect(() => {
    if (!settling) return;
    const timer = window.setTimeout(() => setSettling(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [settling]);

  const slides = useRef<Partial<Record<ActiveWorkTile, HTMLDivElement | null>>>({});
  const dots = useRef<Partial<Record<ActiveWorkTile, HTMLButtonElement | null>>>({});
  const gesture = useRef<{ x: number; y: number; startedAt: number } | null>(null);
  const suppressProjectClickUntil = useRef(0);
  const scrollPositions = useRef<Record<ActiveWorkTile, number>>({ active: 0, scheduled: 0 });
  const pendingScroll = useRef<number | null>(null);
  const router = useRouter();
  const items = [{ id: 'active', label: 'Active Projects' }, { id: 'scheduled', label: 'Scheduled Projects' }] as const;

  function select(next: ActiveWorkTile, focus = false) {
    if (next !== active) {
      scrollPositions.current[active] = window.scrollY;
      pendingScroll.current = scrollPositions.current[next];
      // Keep focus outside an inactive, inert slide.
      if (slides.current[active]?.contains(document.activeElement)) focus = true;
      setSettling(true);
      setActive(next);
    }
    if (focus) dots.current[next]?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    const slide = slides.current[active];
    if (!slide) return;
    const measure = () => {
      const height = Math.ceil(slide.getBoundingClientRect().height);
      setTileHeight((current) => settling ? Math.max(current ?? height, height) : height);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(slide);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [active, settling]);

  useEffect(() => {
    if (settling || pendingScroll.current === null) return;
    const position = pendingScroll.current;
    pendingScroll.current = null;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: position, behavior: 'auto' }));
    return () => window.cancelAnimationFrame(frame);
  }, [active, settling]);

  function startSwipe(event: TouchEvent<HTMLDivElement>) {
    gesture.current = null;
    setSwipeProgress(0);
    if (settling || event.touches.length !== 1 || document.querySelector('dialog[open]')) return;
    const target = event.target;
    if (target instanceof Element && target.closest('[data-dashboard-swipe-ignore], button, input, select, textarea, dialog, [contenteditable="true"]')) return;
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
      suppressProjectClickUntil.current = Date.now() + 600;
      const width = Math.max(1, event.currentTarget.getBoundingClientRect().width);
      const progress = -dx / width;
      setSwipeProgress(active === 'active' ? Math.max(0, Math.min(1, progress)) : Math.min(0, Math.max(-1, progress)));
    }
  }
  function endSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = gesture.current;
    gesture.current = null;
    setSwipeProgress(0);
  
    if (!start || event.changedTouches.length !== 1 || event.touches.length !== 0) return;
  
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
  
    const elapsed = Math.max(1, Date.now() - start.startedAt);
    const distance = Math.abs(dx);
    const threshold = Math.max(56, Math.min(96, event.currentTarget.clientWidth * 0.2));
    const quickFlick = distance >= 24 && elapsed <= 250 && distance / elapsed >= 0.45;
    if ((distance < threshold && !quickFlick) || distance <= Math.abs(dy) * 1.5) return;
  
    // Swipe left = advance
    if (dx < 0) {
      if (active === 'active') {
        select('scheduled');
      } else {
        if (distance < 64 || elapsed > 800) return;
        router.push('/projects');
      }
      return;
    }
  
    // Swipe right = go back
    if (dx > 0) {
      if (active === 'scheduled') {
        select('active');
      } else {
        if (distance < 64 || elapsed > 800) return;
        router.push('/dashboard');
      }
    }
  }



  return <div>
    <div role="region" ref={swipeHost} aria-roledescription="carousel" aria-label="Project views"
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onClickCapture={(event) => {
        if (Date.now() < suppressProjectClickUntil.current && event.target instanceof Element && event.target.closest('a')) {
          event.preventDefault(); event.stopPropagation();
        }
      }}
      onTouchStart={startSwipe} onTouchMove={moveSwipe} onTouchEnd={endSwipe} onTouchCancel={() => { gesture.current = null; setSwipeProgress(0); }}>
      <StickyCarouselHeader>
        <div className="relative h-9 overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span data-swipe-title className={`absolute inset-y-0 flex w-max items-center whitespace-nowrap text-sm font-semibold text-[#16324f] motion-reduce:transition-none ${swipeProgress ? '' : 'transition-[opacity,left] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
              style={{ opacity: 1 - carouselPosition * 0.72, left: `${50 * (1 - carouselPosition)}%`, transform: 'translateX(-50%)' }}>Active Projects ({activeCount})</span>
            <span data-swipe-title className={`absolute inset-y-0 flex w-max items-center whitespace-nowrap text-sm font-semibold text-[#16324f] motion-reduce:transition-none ${swipeProgress ? '' : 'transition-[opacity,left] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
              style={{ opacity: 0.28 + carouselPosition * 0.72, left: `${100 - carouselPosition * 50}%`, transform: 'translateX(-50%)' }}>Scheduled Projects ({scheduledCount})</span>
          </div>
          <button type="button" disabled={active === 'active'} onClick={() => select('active')}
            aria-label="Show previous tile: Active Projects"
            className={`absolute left-0 top-0 h-9 w-14 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5] ${active === 'active' ? 'invisible' : ''}`} />
          <button type="button" disabled={active === 'scheduled'} onClick={() => select('scheduled')}
            aria-label="Show next tile: Scheduled Projects"
            className={`absolute right-0 top-0 h-9 w-14 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5] ${active === 'scheduled' ? 'invisible' : ''}`} />
        </div>
        <p className="sr-only" aria-live="polite">{active === 'active' ? 'Active Projects' : 'Scheduled Projects'}</p>
        <div className="-mt-3 flex items-center justify-center" role="group" aria-label="Choose project view">
            {items.map((item) => <button key={item.id} type="button"
              ref={(element) => { dots.current[item.id] = element; }}
              aria-label={`Show ${item.label}`} aria-current={active === item.id ? 'true' : undefined}
              aria-controls={`activework-tile-${item.id}`} onClick={() => select(item.id)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                select(event.key === 'Home' || event.key === 'ArrowLeft' ? 'active' : 'scheduled', true);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007bb5]">
              <span aria-hidden="true" className={`h-2.5 rounded-full ${active === item.id ? 'w-6 bg-[#009be5]' : 'w-2.5 bg-gray-300'}`} />
            </button>)}
        </div>
      </StickyCarouselHeader>
      <p className="sr-only">
  Swipe right to advance from Active Projects to Scheduled Projects,
  then Projects Summary. Swipe left to return to the previous view.
  Project links remain tappable.
</p>      <div
  className="overflow-hidden"
  ref={swipeArea} style={{ height: tileHeight, minHeight: swipeFloor, touchAction: 'pan-y pinch-zoom', overflowAnchor: 'none' }}
>        <div className={`flex items-start gap-2 motion-reduce:transition-none ${swipeProgress ? '' : 'motion-safe:transition-transform motion-safe:duration-[260ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
          data-swipe-layer style={{ willChange: 'transform', transform: `translate3d(calc(${-carouselPosition * 100}% + ${carouselPosition * 12}px), 0, 0)` }}>
          {items.map((item, index) => <div key={item.id}
            ref={(element) => {
              slides.current[item.id] = element;
              if (element) { if (active === item.id) element.removeAttribute('inert'); else element.setAttribute('inert', ''); }
            }}
            id={`activework-tile-${item.id}`} role="group" aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}: ${item.label}`}
            aria-hidden={active !== item.id}
            className={`min-w-0 shrink-0 grow-0 ${index === items.length - 1 ? 'basis-full' : 'basis-[calc(100%_-_20px)]'}`}>
            {item.id === 'active' ? activeProjects : scheduledProjects}
          </div>)}
        </div>
      </div>
    </div>
  </div>;
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
  return <div className="sticky z-20 -mx-4 mb-1 border-b border-gray-200 bg-gray-100 px-4 md:mx-0 md:px-0" style={{ top }}>
    {children}
  </div>;
}


function ActiveWorkLoading() {
  const [showMessage, setShowMessage] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowMessage(true), 800);
    return () => window.clearTimeout(timer);
  }, []);
  return <div aria-busy="true" className="min-h-0">
    {showMessage && <p role="status" className="py-4 text-center text-sm text-gray-500">Loading projects…</p>}
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


function useCompositorSwipe(base: number, maximum: number) {
  const swipeHost = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);
  const latest = useRef(base);
  const nodes = useRef<{ host: HTMLDivElement; track: HTMLElement | null; titles: HTMLElement[] } | null>(null);
  function paint(position: number, dragging: boolean) {
    const host = swipeHost.current;
    if (!host) return;
    if (nodes.current?.host !== host) {
      nodes.current = { host, track: host.querySelector<HTMLElement>('[data-swipe-layer]'), titles: Array.from(host.querySelectorAll<HTMLElement>('[data-swipe-title]')) };
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transition = '260ms cubic-bezier(.22,1,.36,1)';
    if (nodes.current.track) {
      nodes.current.track.style.transition = dragging || reducedMotion ? 'none' : `transform ${transition}`;
      nodes.current.track.style.transform = `translate3d(calc(${-position * 100}% + ${position * 12}px), 0, 0)`;
    }
    nodes.current.titles.forEach((title, index) => {
      title.style.transition = dragging || reducedMotion ? 'none' : `left ${transition}, opacity ${transition}`;
      title.style.left = `${50 + (index - position) * 50}%`;
      title.style.opacity = String(Math.max(0, 1 - Math.abs(index - position) * .72));
    });
  }
  function setProgress(progress: number) {
    latest.current = Math.max(0, Math.min(maximum, base + progress));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (progress === 0) {
      frame.current = null;
      paint(base, false);
      return;
    }
    frame.current = requestAnimationFrame(() => { frame.current = null; paint(latest.current, true); });
  }
  useLayoutEffect(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    paint(base, false);
  }, [base]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  // Dragging changes only the compositor layer, not React's page tree.
  return [0, setProgress, swipeHost] as const;
}
