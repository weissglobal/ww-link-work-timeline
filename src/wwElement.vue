<template>
  <div class="tl-root" :style="[cssVars, rootStyle]">
    <!-- Header -->
    <div class="tl-header">
      <div class="tl-header-left">
        <button class="tl-nav-btn" @click="navigateDate(-1)">&#8249;</button>
        <div class="tl-date-display" v-html="dateDisplayHtml"></div>
        <button class="tl-nav-btn" @click="navigateDate(1)">&#8250;</button>
        <div class="tl-tabs">
          <button
            v-for="tab in viewTabs"
            :key="tab.value"
            class="tl-tab"
            :class="{ active: currentView === tab.value }"
            @click="setView(tab.value)"
          >{{ tab.label }}</button>
        </div>
      </div>
      <div class="tl-header-right">
        <div class="tl-filters">
          <button
            v-for="cat in filterOptions"
            :key="cat.value"
            class="tl-filter-pill"
            :class="{ active: activeFilter === cat.value }"
            @click="setFilter(cat.value)"
          >{{ cat.label }}</button>
        </div>
        <div v-show="currentView !== 'week' && currentView !== 'backlog'" class="tl-zoom-controls">
          <button class="tl-zoom-btn" :class="{ disabled: !canZoomOut }" @click="zoomOut">&#8722;</button>
          <span class="tl-zoom-label">{{ zoomLabel }}</span>
          <button class="tl-zoom-btn" @click="zoomIn">&#43;</button>
        </div>
        <button class="tl-add-btn" @click="handleAddTask">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Neue Aufgabe
        </button>
      </div>
    </div>

    <!-- Day View -->
    <div v-show="isDayView" class="tl-body">
      <!-- Member sidebar -->
      <div ref="memberPanelRef" class="tl-members" :style="{ width: sidebarWidth + 'px', minWidth: sidebarWidth + 'px' }" @scroll="onMemberScroll">
        <div class="tl-member-header" :style="{ height: headerRowHeight + 'px' }">Team</div>
        <div
          v-for="(member, mi) in displayMembers"
          :key="member.id"
          class="tl-member-row"
          :class="{ 'drop-target': dragState.active && dragState.currentRow === mi }"
          :style="{ height: rowH + 'px' }"
        >
          <div class="tl-avatar">
            <img v-if="member.avatar" :src="member.avatar" alt="" />
            <template v-else>{{ initials(member.name) }}</template>
          </div>
          <div class="tl-member-info">
            <div class="tl-member-name">{{ member.name }}</div>
            <div class="tl-member-role">{{ member.role }}</div>
          </div>
        </div>
      </div>
      <!-- Grid wrapper -->
      <div
        ref="gridWrapperRef"
        class="tl-grid-wrapper"
        :class="{ panning: isPanning }"
        @scroll="onGridScroll"
        @pointerdown="onGridPanStart"
        @pointermove="onGridPanMove"
        @pointerup="onGridPanEnd"
        @pointercancel="onGridPanEnd"
        @click="onGridClick"
      >
        <div class="tl-grid" :style="{ width: gridWidth + 'px' }">
          <!-- Hour headers (sticky) -->
          <div class="tl-hour-headers" :style="{ height: headerRowHeight + 'px' }">
            <div
              v-for="h in hourRange"
              :key="h"
              class="tl-hour-header"
              :class="{ current: isCurrentHour(h) }"
              :style="{ width: zoom + 'px' }"
            >{{ padHour(h) }}:00</div>
          </div>
          <template v-if="dayTasks.length">
            <div
              v-for="(member, mi) in displayMembers"
              :key="'row-' + member.id"
              class="tl-grid-row"
              :style="{ width: gridWidth + 'px', height: rowH + 'px' }"
              :data-mi="mi"
            >
              <template v-for="h in hourRange" :key="'gl-' + h">
                <div class="tl-grid-line hour" :style="{ left: (h - hourStart) * zoom + 'px' }"></div>
                <div class="tl-grid-line" :style="{ left: (h - hourStart) * zoom + zoom / 2 + 'px' }"></div>
              </template>
              <div
                v-for="task in memberDayTasks(member.id)"
                :key="task.id"
                class="tl-task"
                :class="{
                  selected: selectedTaskId === task.id,
                  dragging: dragState.active && dragState.moved && dragState.taskId === task.id,
                  expanded: expandedTaskId === task.id,
                  resizing: resizeState.active && resizeState.taskId === task.id,
                }"
                :style="taskBlockStyle(task)"
                @pointerdown.stop="onTaskPointerDown($event, task, member.id, mi)"
                @pointermove="onTaskPointerMove($event, task)"
                @pointerup="onTaskPointerUp"
                @click.stop="handleTaskClick(task)"
                @dblclick.stop="handleTaskDblClick(task)"
                @pointerenter="onTaskPointerEnter($event, task)"
                @pointerleave="onTaskLeave"
              >
                <div class="tl-task-priority" :style="{ background: taskColor(task) }"></div>
                <div class="tl-task-content">
                  <div class="tl-task-title" :style="{ color: taskColor(task) }">{{ task.title }}</div>
                  <div v-if="taskBlockWidth(task) > 120 || expandedTaskId === task.id" class="tl-task-meta">{{ task.client_name || task.project_name || '' }}</div>
                </div>
                <div v-if="taskBlockWidth(task) > 80 || expandedTaskId === task.id" class="tl-task-duration">{{ taskDuration(task) }}m</div>
              </div>
            </div>
          </template>
          <div v-else class="tl-empty">
            <div class="tl-empty-icon">&#128203;</div>
            <div class="tl-empty-text">Keine geplanten Tasks</div>
            <div class="tl-empty-sub">Tasks mit Zeitplan erscheinen hier automatisch</div>
          </div>
          <!-- Resize time indicator -->
          <div v-if="resizeState.active" class="tl-resize-indicator" :style="resizeIndicatorStyle">{{ resizeTimeText }}</div>
          <!-- Now line -->
          <div v-if="nowLinePos !== null" class="tl-now-line" :style="{ left: nowLinePos + 'px' }"></div>
        </div>
      </div>
    </div>

    <!-- Week View -->
    <div v-if="currentView === 'week'" class="tl-body tl-body-week">
      <div class="tl-week-header">
        <div
          v-for="day in weekDays"
          :key="day.ds"
          class="tl-week-day-header"
          :class="{ today: day.isToday, 'drag-over': weekDragState.active && weekDragState.hoverDs === day.ds }"
          @click="goToDay(day.date)"
        >
          <span class="day-name">{{ day.dayName }}</span>
          <span class="day-num">{{ day.dayNum }}</span>
        </div>
      </div>
      <div ref="weekGridRef" class="tl-week-grid" @pointermove="onWeekDrag" @pointerup="endWeekDrag" @pointercancel="endWeekDrag">
        <div v-for="day in weekDays" :key="'wc-' + day.ds" class="tl-week-column" :data-ds="day.ds">
          <div
            v-for="task in weekTasksByDay[day.ds]"
            :key="task.id"
            class="tl-week-task"
            :class="{ dragging: weekDragState.active && weekDragState.taskId === task.id }"
            :style="weekTaskStyle(task)"
            @pointerdown.stop="startWeekDrag($event, task)"
            @click.stop="handleTaskClick(task)"
            @dblclick.stop="handleTaskDblClick(task)"
          >
            <div class="tl-week-task-title">{{ task.title }}</div>
            <div class="tl-week-task-time">{{ formatTimeRange(task) }}</div>
            <div class="tl-week-task-assignee">{{ task.assignee_name || '' }}</div>
          </div>
          <div v-if="!weekTasksByDay[day.ds]?.length" class="tl-week-empty">&mdash;</div>
        </div>
      </div>
    </div>

    <!-- Backlog View -->
    <div v-show="currentView === 'backlog'" class="tl-backlog">
      <template v-if="backlogTasks.length">
        <div
          v-for="task in backlogTasks"
          :key="task.id"
          class="tl-backlog-card"
          @click="handleTaskClick(task)"
          @dblclick="handleTaskDblClick(task)"
        >
          <div class="tl-backlog-priority" :style="{ background: prioColor(task.priority) }"></div>
          <div class="tl-backlog-content">
            <div class="tl-backlog-title">{{ task.title }}</div>
            <div class="tl-backlog-detail">
              <span v-if="task.category" class="tl-backlog-badge" :style="{ background: catColor(task.category) }">{{ catLabel(task.category) }}</span>
              <span v-if="task.client_name">{{ task.client_name }}</span>
              <span v-if="task.estimated_minutes">{{ task.estimated_minutes }}m</span>
              <span v-if="task.assignee_name">{{ task.assignee_name }}</span>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="tl-empty" style="grid-column:1/-1">
        <div class="tl-empty-icon">&#10024;</div>
        <div class="tl-empty-text">Backlog ist leer</div>
        <div class="tl-empty-sub">Alle Tasks sind eingeplant</div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      class="tl-tooltip"
      :class="{ visible: tooltipData.visible }"
      :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px' }"
    >
      <div class="tl-tooltip-title">{{ tooltipData.task?.title || '' }}</div>
      <div class="tl-tooltip-body">
        <div class="tl-tooltip-row"><strong>Zeit:</strong> {{ formatTimeRange(tooltipData.task) }}</div>
        <div v-if="tooltipData.task?.client_name" class="tl-tooltip-row"><strong>Kunde:</strong> {{ tooltipData.task.client_name }}</div>
        <div v-if="tooltipData.task?.project_name" class="tl-tooltip-row"><strong>Projekt:</strong> {{ tooltipData.task.project_name }}</div>
        <div v-if="tooltipData.task?.category" class="tl-tooltip-row"><strong>Kategorie:</strong> {{ catLabel(tooltipData.task.category) }}</div>
        <div v-if="tooltipData.task?.priority" class="tl-tooltip-row"><strong>Priorit&auml;t:</strong> {{ prioLabel(tooltipData.task.priority) }}</div>
        <div v-if="tooltipData.task?.estimated_minutes" class="tl-tooltip-row"><strong>Gesch&auml;tzt:</strong> {{ tooltipData.task.estimated_minutes }} Min.</div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

const CAT_LABELS = {
  design: 'Design', development: 'Development', content: 'Content', seo: 'SEO',
  advertising: 'Ads', social_media: 'Social', consulting: 'Beratung',
  project_management: 'PM', analytics: 'Analytics', qa: 'QA', admin: 'Admin',
  sales: 'Sales', customer_success: 'CS', bookkeeping: 'Buchhaltung',
  tax: 'Steuer', other: 'Sonstige',
};

const CAT_COLORS = {
  design: '#7c3aed', development: '#2563eb', content: '#0891b2', seo: '#059669',
  advertising: '#d97706', social_media: '#db2777', consulting: '#7c3aed',
  project_management: '#6366f1', analytics: '#0d9488', qa: '#ea580c',
  admin: '#64748b', sales: '#16a34a', customer_success: '#0891b2',
  bookkeeping: '#ca8a04', tax: '#9f1239', other: '#6b7280',
};

const PRIO_COLORS = { urgent: '#3b82f6', high: '#ef4444', medium: '#a855f7', low: '#22c55e' };
const PRIO_LABELS = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', urgent: 'Dringend' };

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS_DE = ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const VIEW_TABS = [
  { value: 'today', label: 'Heute' },
  { value: 'tomorrow', label: 'Morgen' },
  { value: 'week', label: 'Woche' },
  { value: 'backlog', label: 'Backlog' },
];

function todayDS() {
  const d = new Date();
  return toDS(d);
}

function toDS(d) {
  const m = d.getMonth() + 1;
  const dy = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dy < 10 ? '0' : '') + dy;
}

function parseDS(s) {
  if (!s) return new Date();
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function t2d(s) {
  if (!s) return 0;
  const p = s.split(':');
  const h = Math.max(0, Math.min(24, parseInt(p[0], 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(p[1] || '0', 10) || 0));
  return h + m / 60;
}

function d2t(d) {
  const clamped = Math.max(0, Math.min(24, d));
  const h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function weekNum(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dn);
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt - ys) / 864e5) + 1) / 7);
}

function getMockTasks() {
  const ds = todayDS();
  return [
    { id: 't1', title: 'Hero Section finalisieren', priority: 'urgent', assigned_to: 'm1', scheduled_date: ds, scheduled_start_time: '08:00:00', scheduled_end_time: '10:00:00', project_name: 'Website Relaunch', project_color: '#3b82f6', client_name: 'MeerWert', category: 'design', estimated_minutes: 120, assignee_name: 'Alex Weber', assignee_avatar: null },
    { id: 't2', title: 'API Integration testen', priority: 'high', assigned_to: 'm2', scheduled_date: ds, scheduled_start_time: '09:00:00', scheduled_end_time: '11:30:00', project_name: 'App Projekt', project_color: '#f97316', client_name: 'terraluma', category: 'development', estimated_minutes: 150, assignee_name: 'Sarah Koch', assignee_avatar: null },
    { id: 't3', title: 'Sprint Planning vorbereiten', priority: 'medium', assigned_to: 'm3', scheduled_date: ds, scheduled_start_time: '10:00:00', scheduled_end_time: '11:00:00', project_name: null, project_color: null, client_name: null, category: 'project_management', estimated_minutes: 60, assignee_name: 'Max Bauer', assignee_avatar: null },
    { id: 't4', title: 'Social Media Assets', priority: 'low', assigned_to: 'm1', scheduled_date: ds, scheduled_start_time: '11:00:00', scheduled_end_time: '12:30:00', project_name: 'Website Relaunch', project_color: '#3b82f6', client_name: 'MeerWert', category: 'design', estimated_minutes: 90, assignee_name: 'Alex Weber', assignee_avatar: null },
    { id: 't5', title: 'Bug Fixes Checkout', priority: 'high', assigned_to: 'm2', scheduled_date: ds, scheduled_start_time: '13:00:00', scheduled_end_time: '15:00:00', project_name: 'App Projekt', project_color: '#f97316', client_name: 'terraluma', category: 'development', estimated_minutes: 120, assignee_name: 'Sarah Koch', assignee_avatar: null },
    { id: 't6', title: 'Client-Call Notizen aufbereiten', priority: 'low', assigned_to: 'm3', scheduled_date: ds, scheduled_start_time: '14:00:00', scheduled_end_time: '14:30:00', project_name: null, project_color: null, client_name: 'terraluma', category: 'admin', estimated_minutes: 30, assignee_name: 'Max Bauer', assignee_avatar: null },
  ];
}

export default {
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  setup(props, { emit }) {
    /* ── Internal Variables ──────────────────────────── */
    const { value: selectedTaskId, setValue: setSelectedTaskId } =
      wwLib.wwVariable.useComponentVariable({ uid: props.uid, name: 'selectedTaskId', type: 'string', defaultValue: '' });

    const { value: currentView, setValue: setCurrentView } =
      wwLib.wwVariable.useComponentVariable({ uid: props.uid, name: 'currentView', type: 'string', defaultValue: props.content?.defaultView || 'today' });

    const { value: currentDateStr, setValue: setCurrentDateStr } =
      wwLib.wwVariable.useComponentVariable({ uid: props.uid, name: 'currentDate', type: 'string', defaultValue: todayDS() });

    const { value: visibleTaskCount, setValue: setVisibleTaskCount } =
      wwLib.wwVariable.useComponentVariable({ uid: props.uid, name: 'visibleTaskCount', type: 'number', defaultValue: 0 });

    /* ── Local UI Refs ──────────────────────────────── */
    const activeFilter = ref('all');
    const zoom = ref(props.content?.defaultZoom || 120);
    const nowTick = ref(Date.now());
    const gridWrapperRef = ref(null);
    const memberPanelRef = ref(null);
    const expandedTaskId = ref(null);
    const gridWrapperWidth = ref(0);

    const tooltipData = ref({ visible: false, task: null, x: 0, y: 0 });
    let tooltipTimer = null;

    const dragState = ref({
      active: false, taskId: null, task: null,
      startX: 0, startY: 0,
      originalLeft: 0, originalMemberId: null, originalRowIndex: -1,
      currentRow: -1, taskEl: null, moved: false,
      gridRect: null,
    });

    const dragMembers = ref(null);

    const weekDragState = ref({
      active: false, taskId: null, task: null,
      startX: 0, startY: 0, moved: false,
      originalDs: '', hoverDs: '', taskEl: null,
      translateX: 0, translateY: 0,
    });

    const weekGridRef = ref(null);

    const taskOverrides = ref(new Map());

    const isPanning = ref(false);
    const panStart = ref({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    let nowInterval = null;
    let justDragged = false;
    let resizeObserver = null;

    /* ── Editor state ───────────────────────────────── */
    /* wwEditor:start */
    const isEditing = computed(() => props.wwEditorState?.isEditing);
    /* wwEditor:end */

    /* ── Resolve formula mappings ────────────────────── */
    const { resolveMappingFormula } = wwLib.wwFormula.useFormula();

    /* Raw tasks from props (no drag overrides) — used for stable member list */
    const rawTasks = computed(() => {
      const raw = props.content?.tasks;
      if (!Array.isArray(raw) || raw.length === 0) {
        return getMockTasks();
      }
      return raw.map(item => {
        const id = resolveMappingFormula(props.content?.tasksIdFormula, item) ?? item?.id;
        const title = resolveMappingFormula(props.content?.tasksTitleFormula, item) ?? item?.title;
        const priority = resolveMappingFormula(props.content?.tasksPriorityFormula, item) ?? item?.priority;
        const assigned_to = resolveMappingFormula(props.content?.tasksAssignedToFormula, item) ?? item?.assigned_to;
        const scheduled_date = resolveMappingFormula(props.content?.tasksScheduledDateFormula, item) ?? item?.scheduled_date;
        const scheduled_start_time = resolveMappingFormula(props.content?.tasksStartTimeFormula, item) ?? item?.scheduled_start_time;
        const scheduled_end_time = resolveMappingFormula(props.content?.tasksEndTimeFormula, item) ?? item?.scheduled_end_time;
        const project_name = resolveMappingFormula(props.content?.tasksProjectNameFormula, item) ?? item?.project_name;
        const project_color = resolveMappingFormula(props.content?.tasksProjectColorFormula, item) ?? item?.project_color;
        const client_name = resolveMappingFormula(props.content?.tasksClientNameFormula, item) ?? item?.client_name;
        const category = resolveMappingFormula(props.content?.tasksCategoryFormula, item) ?? item?.category;
        const estimated_minutes = resolveMappingFormula(props.content?.tasksEstimatedMinutesFormula, item) ?? item?.estimated_minutes;
        const assignee_name = resolveMappingFormula(props.content?.tasksAssigneeNameFormula, item) ?? item?.assignee_name;
        const assignee_avatar = resolveMappingFormula(props.content?.tasksAssigneeAvatarFormula, item) ?? item?.assignee_avatar;

        return {
          id: id || `task-${Math.random().toString(36).slice(2, 8)}`,
          title: title || 'Untitled',
          priority, assigned_to, scheduled_date,
          scheduled_start_time, scheduled_end_time,
          project_name, project_color, client_name,
          category, estimated_minutes, assignee_name, assignee_avatar,
          originalItem: item,
        };
      });
    });

    /* Tasks with drag overrides applied (for rendering) */
    const tasks = computed(() => {
      if (taskOverrides.value.size === 0) return rawTasks.value;
      return rawTasks.value.map(t => {
        const ov = taskOverrides.value.get(t.id);
        return ov ? { ...t, ...ov } : t;
      });
    });

    /* ── Derived data ───────────────────────────────── */
    const hourStart = computed(() => props.content?.hourStart ?? 7);
    const hourEnd = computed(() => props.content?.hourEnd ?? 20);
    const rowH = computed(() => props.content?.rowHeight ?? 64);
    const sidebarWidth = computed(() => props.content?.memberSidebarWidth ?? 200);
    const headerRowHeight = 40;

    const hourCount = computed(() => hourEnd.value - hourStart.value);

    const minZoom = computed(() => {
      if (!gridWrapperWidth.value || !hourCount.value) return 60;
      return Math.ceil(gridWrapperWidth.value / hourCount.value);
    });

    const canZoomOut = computed(() => zoom.value > minZoom.value);

    const hourRange = computed(() => {
      const arr = [];
      for (let h = hourStart.value; h < hourEnd.value; h++) arr.push(h);
      return arr;
    });

    const gridWidth = computed(() => hourCount.value * zoom.value);

    const currentDate = computed(() => parseDS(currentDateStr.value));

    const isDayView = computed(() => currentView.value === 'today' || currentView.value === 'tomorrow');

    /* Members derived from RAW tasks (no overrides) — stable across drags */
    const members = computed(() => {
      const map = {};
      rawTasks.value.forEach(t => {
        if (t.assigned_to && !map[t.assigned_to]) {
          map[t.assigned_to] = {
            id: t.assigned_to,
            name: t.assignee_name || 'Unbekannt',
            avatar: t.assignee_avatar || null,
            role: t.category ? (CAT_LABELS[t.category] || t.category) : '',
          };
        }
      });
      const arr = Object.values(map);
      if (arr.length) return arr;
      return [
        { id: 'm1', name: 'Alex Weber', avatar: null, role: 'Design' },
        { id: 'm2', name: 'Sarah Koch', avatar: null, role: 'Development' },
        { id: 'm3', name: 'Max Bauer', avatar: null, role: 'PM' },
      ];
    });

    /* Frozen members during drag to prevent re-renders */
    const displayMembers = computed(() => {
      if (dragState.value.active && dragMembers.value) return dragMembers.value;
      return members.value;
    });

    const filteredTasks = computed(() => {
      let t = tasks.value;
      if (activeFilter.value && activeFilter.value !== 'all') {
        t = t.filter(x => x.category === activeFilter.value);
      }
      return t;
    });

    const scheduledTasks = computed(() =>
      filteredTasks.value.filter(t => t.scheduled_start_time && t.scheduled_end_time)
    );

    const dayTasks = computed(() => {
      const ds = toDS(currentDate.value);
      return scheduledTasks.value.filter(t => t.scheduled_date === ds);
    });

    const backlogTasks = computed(() =>
      filteredTasks.value.filter(t => !t.scheduled_start_time || !t.scheduled_end_time)
    );

    const categories = computed(() => {
      const cats = {};
      tasks.value.forEach(t => { if (t.category) cats[t.category] = 1; });
      return Object.keys(cats).sort();
    });

    const filterOptions = computed(() => {
      const opts = [{ value: 'all', label: 'Alle' }];
      categories.value.forEach(c => opts.push({ value: c, label: CAT_LABELS[c] || c }));
      return opts;
    });

    const nowLinePos = computed(() => {
      void nowTick.value;
      if (!isDayView.value) return null;
      const now = new Date();
      if (!sameDay(currentDate.value, now)) return null;
      const dec = now.getHours() + now.getMinutes() / 60;
      if (dec < hourStart.value || dec > hourEnd.value) return null;
      return (dec - hourStart.value) * zoom.value;
    });

    /* ── Week view ──────────────────────────────────── */
    const weekDays = computed(() => {
      const d = new Date(currentDate.value);
      const dayOfWeek = d.getDay();
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((dayOfWeek + 6) % 7));

      const count = props.content?.showWeekends ? 7 : 5;
      const today = new Date();
      const days = [];
      for (let i = 0; i < count; i++) {
        const dd = new Date(mon);
        dd.setDate(mon.getDate() + i);
        days.push({
          date: dd,
          ds: toDS(dd),
          dayName: DAYS_DE[dd.getDay()],
          dayNum: dd.getDate(),
          isToday: sameDay(dd, today),
        });
      }
      return days;
    });

    const weekTasksByDay = computed(() => {
      const allTasks = tasks.value;
      const filter = activeFilter.value;
      const scheduled = allTasks.filter(t =>
        t.scheduled_start_time && t.scheduled_end_time &&
        (filter === 'all' || !filter || t.category === filter)
      );
      const map = {};
      weekDays.value.forEach(day => {
        map[day.ds] = scheduled
          .filter(t => t.scheduled_date === day.ds)
          .sort((a, b) => t2d(a.scheduled_start_time) - t2d(b.scheduled_start_time));
      });
      return map;
    });

    /* ── CSS variables ──────────────────────────────── */
    const cssVars = computed(() => ({
      '--tl-bg': props.content?.bgColor || '#191A1A',
      '--tl-bg-card': props.content?.bgCard || '#262626',
      '--tl-bg-card-hover': adjustBrightness(props.content?.bgCard || '#262626', 6),
      '--tl-bg-surface': props.content?.bgCard || '#262626',
      '--tl-bg-elevated': adjustBrightness(props.content?.bgCard || '#262626', 12),
      '--tl-bg-row-alt': adjustBrightness(props.content?.bgColor || '#191A1A', 5),
      '--tl-border': props.content?.borderColor || '#2E3030',
      '--tl-border-light': adjustBrightness(props.content?.borderColor || '#2E3030', -5),
      '--tl-text': props.content?.textColor || '#FFFFFF',
      '--tl-text-muted': props.content?.textMuted || '#BFBFBF',
      '--tl-text-dim': '#5B5B5B',
      '--tl-accent': props.content?.accentColor || '#3E82F6',
      '--tl-accent-hover': adjustBrightness(props.content?.accentColor || '#3E82F6', -15),
      '--tl-accent-dim': hexToRgba(props.content?.accentColor || '#3E82F6', 0.15),
      '--tl-now': props.content?.nowLineColor || '#ef4444',
    }));

    const rootStyle = computed(() => {
      const h = props.content?.height || '100%';
      return { height: h };
    });

    /* ── Display helpers ────────────────────────────── */
    const dateDisplayHtml = computed(() => {
      if (currentView.value === 'week') {
        const mon = weekDays.value[0];
        const last = weekDays.value[weekDays.value.length - 1];
        if (!mon || !last) return '';
        return `<strong>KW ${weekNum(currentDate.value)}</strong> <span>${mon.dayNum}. ${MONTHS_DE[mon.date.getMonth()].slice(0, 3)} \u2013 ${last.dayNum}. ${MONTHS_DE[last.date.getMonth()].slice(0, 3)} ${last.date.getFullYear()}</span>`;
      }
      if (currentView.value === 'backlog') {
        return '<strong>Backlog</strong> <span>Ungeplante Tasks</span>';
      }
      const d = currentDate.value;
      return `${DAYS_DE[d.getDay()]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
    });

    const zoomLabel = computed(() => Math.round(zoom.value / 1.2) + '%');

    const viewTabs = VIEW_TABS;

    /* ── Helper functions ───────────────────────────── */
    function initials(name) {
      if (!name) return '?';
      return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function taskColor(t) {
      return t?.project_color || CAT_COLORS[t?.category] || '#6b7280';
    }

    function prioColor(p) {
      return PRIO_COLORS[p] || '#575b6e';
    }

    function prioLabel(p) {
      return PRIO_LABELS[p] || p || '';
    }

    function catColor(c) {
      return CAT_COLORS[c] || '#6b7280';
    }

    function catLabel(c) {
      return CAT_LABELS[c] || c || '';
    }

    function padHour(h) {
      return (h < 10 ? '0' : '') + h;
    }

    function isCurrentHour(h) {
      void nowTick.value;
      const now = new Date();
      return h === now.getHours() && sameDay(currentDate.value, now);
    }

    function taskDuration(t) {
      const sd = t2d(t?.scheduled_start_time);
      const ed = t2d(t?.scheduled_end_time);
      return Math.round((ed - sd) * 60);
    }

    function taskBlockWidth(t) {
      const sd = t2d(t?.scheduled_start_time);
      const ed = t2d(t?.scheduled_end_time);
      return Math.max((ed - sd) * zoom.value, 30);
    }

    function taskBlockStyle(t) {
      const sd = t2d(t?.scheduled_start_time);
      const ed = t2d(t?.scheduled_end_time);
      const maxRight = gridWidth.value;
      const left = Math.max(0, (sd - hourStart.value) * zoom.value);
      const naturalW = Math.max((ed - sd) * zoom.value, 30);
      const isExpanded = expandedTaskId.value === t?.id;
      const w = isExpanded ? Math.max(naturalW, 160) : naturalW;
      const clampedW = Math.min(w, Math.max(maxRight - left, 10));
      const col = taskColor(t);
      return {
        left: left + 'px',
        width: clampedW + 'px',
        background: col + '20',
        borderColor: col + '44',
        '--task-color': col,
      };
    }

    function memberDayTasks(memberId) {
      return dayTasks.value.filter(t => t.assigned_to === memberId);
    }

    function weekDayTasks(ds) {
      return tasks.value
        .filter(t => t.scheduled_start_time && t.scheduled_end_time && t.scheduled_date === ds)
        .sort((a, b) => t2d(a.scheduled_start_time) - t2d(b.scheduled_start_time));
    }

    function formatTimeRange(t) {
      if (!t) return '';
      const st = t.scheduled_start_time ? t.scheduled_start_time.slice(0, 5) : '\u2013';
      const en = t.scheduled_end_time ? t.scheduled_end_time.slice(0, 5) : '\u2013';
      return st + ' \u2013 ' + en;
    }

    function adjustBrightness(hex, amount) {
      if (!hex) return hex;
      const clean = hex.replace('#', '');
      const r = Math.max(0, Math.min(255, parseInt(clean.slice(0, 2), 16) + amount));
      const g = Math.max(0, Math.min(255, parseInt(clean.slice(2, 4), 16) + amount));
      const b = Math.max(0, Math.min(255, parseInt(clean.slice(4, 6), 16) + amount));
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    function hexToRgba(hex, alpha) {
      if (!hex) return 'rgba(59,130,246,' + alpha + ')';
      const clean = hex.replace('#', '');
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    /* ── Actions ────────────────────────────────────── */
    function setView(view) {
      const today = new Date();
      if (view === 'today') {
        setCurrentDateStr(toDS(today));
      } else if (view === 'tomorrow') {
        const tom = new Date(today);
        tom.setDate(today.getDate() + 1);
        setCurrentDateStr(toDS(tom));
      }
      setCurrentView(view);
      emit('trigger-event', { name: 'view-change', event: { view } });
    }

    function navigateDate(direction) {
      const d = new Date(currentDate.value);
      const delta = currentView.value === 'week' ? 7 * direction : direction;
      d.setDate(d.getDate() + delta);
      setCurrentDateStr(toDS(d));
      emit('trigger-event', { name: 'date-change', event: { date: toDS(d) } });
    }

    function setFilter(category) {
      activeFilter.value = category;
      emit('trigger-event', { name: 'filter-change', event: { category } });
    }

    function zoomIn() {
      zoom.value = Math.min(zoom.value + 20, 240);
    }

    function zoomOut() {
      if (!canZoomOut.value) return;
      zoom.value = Math.max(zoom.value - 20, minZoom.value);
    }

    function goToDay(date) {
      setCurrentDateStr(toDS(date));
      setCurrentView('today');
      emit('trigger-event', { name: 'view-change', event: { view: 'today' } });
      emit('trigger-event', { name: 'date-change', event: { date: toDS(date) } });
    }

    function handleTaskClick(task) {
      if (justDragged) {
        justDragged = false;
        return;
      }
      if (expandedTaskId.value === task.id) {
        expandedTaskId.value = null;
      } else {
        expandedTaskId.value = task.id;
      }
      setSelectedTaskId(task.id);
      emit('trigger-event', { name: 'task-click', event: { taskId: task.id, task: task.originalItem || task } });
    }

    function handleTaskDblClick(task) {
      emit('trigger-event', { name: 'task-double-click', event: { taskId: task.id, task: task.originalItem || task } });
    }

    function handleAddTask() {
      emit('trigger-event', { name: 'add-task', event: {} });
    }

    /* ── Tooltip ────────────────────────────────────── */
    function onTaskPointerEnter(e, task) {
      if (dragState.value.active) return;
      clearTimeout(tooltipTimer);
      const rootEl = e.currentTarget?.closest('.tl-root');
      if (!rootEl) return;
      const cx = e.clientX;
      const cy = e.clientY;
      tooltipTimer = setTimeout(() => {
        const rr = rootEl.getBoundingClientRect();
        tooltipData.value = {
          visible: true,
          task,
          x: cx - rr.left + 12,
          y: cy - rr.top + 12,
        };
      }, 400);
    }

    function hideTooltip() {
      clearTimeout(tooltipTimer);
      tooltipData.value = { ...tooltipData.value, visible: false };
    }

    /* ── Day View Drag & Drop (left-based) ───────────── */
    function startDrag(e, task, memberId, rowIndex) {
      const taskEl = e.currentTarget;
      if (!taskEl) return;

      setSelectedTaskId(task.id);
      expandedTaskId.value = null;
      dragMembers.value = [...members.value];

      const wrapper = gridWrapperRef.value;
      const gridRect = wrapper ? wrapper.getBoundingClientRect() : null;

      dragState.value = {
        active: true, taskId: task.id, task,
        startX: e.clientX, startY: e.clientY,
        originalLeft: parseFloat(taskEl.style.left) || 0,
        originalMemberId: memberId,
        originalRowIndex: rowIndex, currentRow: rowIndex,
        taskEl, moved: false, gridRect,
      };

      taskEl.setPointerCapture(e.pointerId);
    }

    function onDrag(e) {
      const ds = dragState.value;
      if (!ds.active || !ds.taskEl) return;

      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;

      if (!ds.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (!ds.moved) e.preventDefault();
      ds.moved = true;

      /* Update left directly (snapped to 15-min) */
      const snap = zoom.value / 4;
      const newLeft = Math.max(0, Math.min(gridWidth.value - 30, ds.originalLeft + Math.round(dx / snap) * snap));
      ds.taskEl.style.left = newLeft + 'px';

      /* Detect target row from Y position */
      if (ds.gridRect) {
        const wrapper = gridWrapperRef.value;
        const scrollTop = wrapper ? wrapper.scrollTop : 0;
        const relY = e.clientY - ds.gridRect.top - headerRowHeight + scrollTop;
        const ri = Math.floor(relY / rowH.value);
        const frozen = dragMembers.value || members.value;
        ds.currentRow = Math.max(0, Math.min(frozen.length - 1, ri));
      }
    }

    function endDrag(e) {
      const ds = dragState.value;
      if (!ds.active) return;

      if (ds.taskEl) {
        try { ds.taskEl.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      if (ds.moved && ds.task) {
        justDragged = true;

        const finalLeft = parseFloat(ds.taskEl?.style.left) || 0;
        const sd = hourStart.value + (finalLeft / zoom.value);
        const osd = t2d(ds.task.scheduled_start_time);
        const oed = t2d(ds.task.scheduled_end_time);
        const dur = oed - osd;
        const nsd = Math.round(sd * 4) / 4;
        const ned = nsd + dur;
        const newStart = d2t(nsd);
        const newEnd = d2t(ned);

        const frozen = dragMembers.value || members.value;
        let newAssignedTo = ds.originalMemberId;
        if (ds.currentRow >= 0 && ds.currentRow < frozen.length) {
          newAssignedTo = frozen[ds.currentRow].id;
        }

        taskOverrides.value.set(ds.taskId, {
          scheduled_start_time: newStart + ':00',
          scheduled_end_time: newEnd + ':00',
          assigned_to: newAssignedTo,
        });

        emit('trigger-event', {
          name: 'task-schedule-update',
          event: {
            taskId: ds.taskId,
            newStartTime: newStart + ':00',
            newEndTime: newEnd + ':00',
            newAssignedTo,
            newDate: ds.task.scheduled_date || '',
          },
        });
      }

      dragState.value = {
        active: false, taskId: null, task: null,
        startX: 0, startY: 0,
        originalLeft: 0, originalMemberId: null, originalRowIndex: -1,
        currentRow: -1, taskEl: null, moved: false,
        gridRect: null,
      };
      dragMembers.value = null;
    }

    /* ── Week View Drag & Drop ─────────────────────── */
    function startWeekDrag(e, task) {
      const taskEl = e.currentTarget;
      if (!taskEl) return;
      weekDragState.value = {
        active: true, taskId: task.id, task,
        startX: e.clientX, startY: e.clientY, moved: false,
        originalDs: task.scheduled_date || '', hoverDs: task.scheduled_date || '',
        taskEl, translateX: 0, translateY: 0,
      };
      taskEl.setPointerCapture(e.pointerId);
    }

    function onWeekDrag(e) {
      const ws = weekDragState.value;
      if (!ws.active || !ws.taskEl) return;
      const dx = e.clientX - ws.startX;
      const dy = e.clientY - ws.startY;
      if (!ws.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (!ws.moved) e.preventDefault();
      ws.moved = true;
      ws.translateX = dx;
      ws.translateY = dy;
      ws.taskEl.style.transform = `translate(${dx}px, ${dy}px)`;

      const gridEl = weekGridRef.value;
      if (gridEl) {
        const cols = gridEl.querySelectorAll('.tl-week-column');
        for (const col of cols) {
          const rect = col.getBoundingClientRect();
          if (e.clientX >= rect.left && e.clientX <= rect.right) {
            ws.hoverDs = col.dataset.ds || '';
            break;
          }
        }
      }
    }

    function endWeekDrag(e) {
      const ws = weekDragState.value;
      if (!ws.active) return;
      if (ws.taskEl) {
        try { ws.taskEl.releasePointerCapture(e.pointerId); } catch (_) {}
        ws.taskEl.style.transform = '';
      }
      if (ws.moved && ws.task && ws.hoverDs && ws.hoverDs !== ws.originalDs) {
        justDragged = true;
        taskOverrides.value.set(ws.taskId, { scheduled_date: ws.hoverDs });
        emit('trigger-event', {
          name: 'task-schedule-update',
          event: {
            taskId: ws.taskId,
            newStartTime: ws.task.scheduled_start_time || '',
            newEndTime: ws.task.scheduled_end_time || '',
            newAssignedTo: ws.task.assigned_to || '',
            newDate: ws.hoverDs,
          },
        });
      }
      weekDragState.value = {
        active: false, taskId: null, task: null,
        startX: 0, startY: 0, moved: false,
        originalDs: '', hoverDs: '', taskEl: null,
        translateX: 0, translateY: 0,
      };
    }

    function weekTaskStyle(task) {
      return { borderLeftColor: taskColor(task) };
    }

    /* ── Resize (edge drag to change duration) ──────── */
    const resizeEdge = ref(null);
    const resizeState = ref({
      active: false, taskId: null, task: null, edge: null,
      startX: 0, initialLeft: 0, initialWidth: 0,
      currentLeft: 0, currentWidth: 0,
      taskEl: null, rowIndex: -1, moved: false,
    });

    function detectResizeEdge(e) {
      const el = e.currentTarget;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const threshold = 6;

      if (x <= threshold) {
        resizeEdge.value = 'start';
        el.style.cursor = 'col-resize';
      } else if (x >= rect.width - threshold) {
        resizeEdge.value = 'end';
        el.style.cursor = 'col-resize';
      } else {
        resizeEdge.value = null;
        el.style.cursor = '';
      }
    }

    function startResize(e, task, rowIndex) {
      const taskEl = e.currentTarget;
      if (!taskEl) return;
      expandedTaskId.value = null;
      hideTooltip();

      const left = parseFloat(taskEl.style.left) || 0;
      const width = parseFloat(taskEl.style.width) || 0;

      resizeState.value = {
        active: true, taskId: task.id, task, edge: resizeEdge.value,
        startX: e.clientX, initialLeft: left, initialWidth: width,
        currentLeft: left, currentWidth: width,
        taskEl, rowIndex, moved: false,
      };

      taskEl.setPointerCapture(e.pointerId);
    }

    function onResize(e) {
      const rs = resizeState.value;
      if (!rs.active || !rs.taskEl) return;

      const dx = e.clientX - rs.startX;
      if (!rs.moved && Math.abs(dx) < 4) return;
      rs.moved = true;

      const snap = zoom.value / 4;
      const minW = snap;

      if (rs.edge === 'end') {
        const newWidth = Math.max(minW, rs.initialWidth + Math.round(dx / snap) * snap);
        const maxWidth = gridWidth.value - rs.initialLeft;
        rs.currentWidth = Math.min(newWidth, maxWidth);
        rs.currentLeft = rs.initialLeft;
        rs.taskEl.style.width = rs.currentWidth + 'px';
      } else {
        const rightEdge = rs.initialLeft + rs.initialWidth;
        let newLeft = rs.initialLeft + Math.round(dx / snap) * snap;
        newLeft = Math.max(0, Math.min(newLeft, rightEdge - minW));
        rs.currentWidth = rightEdge - newLeft;
        rs.currentLeft = newLeft;
        rs.taskEl.style.left = newLeft + 'px';
        rs.taskEl.style.width = rs.currentWidth + 'px';
      }
    }

    function endResize(e) {
      const rs = resizeState.value;
      if (!rs.active) return;

      if (rs.taskEl) {
        try { rs.taskEl.releasePointerCapture(e.pointerId); } catch (_) {}
        rs.taskEl.style.cursor = '';
      }

      if (rs.moved && rs.task) {
        justDragged = true;
        const nsd = Math.round((hourStart.value + rs.currentLeft / zoom.value) * 4) / 4;
        const ned = Math.round((hourStart.value + (rs.currentLeft + rs.currentWidth) / zoom.value) * 4) / 4;
        const newStart = d2t(nsd);
        const newEnd = d2t(ned);

        taskOverrides.value.set(rs.taskId, {
          ...(taskOverrides.value.get(rs.taskId) || {}),
          scheduled_start_time: newStart + ':00',
          scheduled_end_time: newEnd + ':00',
        });

        emit('trigger-event', {
          name: 'task-resize',
          event: { taskId: rs.taskId, newStartTime: newStart + ':00', newEndTime: newEnd + ':00' },
        });
      }

      resizeState.value = {
        active: false, taskId: null, task: null, edge: null,
        startX: 0, initialLeft: 0, initialWidth: 0,
        currentLeft: 0, currentWidth: 0,
        taskEl: null, rowIndex: -1, moved: false,
      };
      resizeEdge.value = null;
    }

    const resizeIndicatorStyle = computed(() => {
      const rs = resizeState.value;
      if (!rs.active || !rs.moved) return { display: 'none' };
      const x = rs.edge === 'start' ? rs.currentLeft : rs.currentLeft + rs.currentWidth;
      const y = headerRowHeight + rs.rowIndex * rowH.value;
      return {
        left: x + 'px',
        top: y + 'px',
        transform: rs.edge === 'start' ? 'translate(-100%, -100%)' : 'translate(0, -100%)',
      };
    });

    const resizeTimeText = computed(() => {
      const rs = resizeState.value;
      if (!rs.active || !rs.moved) return '';
      const dec = rs.edge === 'start'
        ? hourStart.value + rs.currentLeft / zoom.value
        : hourStart.value + (rs.currentLeft + rs.currentWidth) / zoom.value;
      return d2t(Math.round(dec * 4) / 4);
    });

    /* ── Unified task pointer handlers ──────────────── */
    function onTaskPointerDown(e, task, memberId, rowIndex) {
      if (resizeEdge.value) {
        startResize(e, task, rowIndex);
      } else {
        startDrag(e, task, memberId, rowIndex);
      }
    }

    function onTaskPointerMove(e, task) {
      if (resizeState.value.active) {
        onResize(e);
        return;
      }
      if (dragState.value.active) {
        onDrag(e);
        return;
      }
      detectResizeEdge(e);
    }

    function onTaskPointerUp(e) {
      if (resizeState.value.active) {
        endResize(e);
      } else {
        endDrag(e);
      }
    }

    function onTaskLeave(e) {
      if (!resizeState.value.active && !dragState.value.active) {
        resizeEdge.value = null;
        const el = e.currentTarget;
        if (el) el.style.cursor = '';
      }
      hideTooltip();
    }

    /* ── Scroll sync ────────────────────────────────── */
    let scrollSyncing = false;

    function onGridScroll() {
      if (scrollSyncing) return;
      scrollSyncing = true;
      if (memberPanelRef.value && gridWrapperRef.value) {
        memberPanelRef.value.scrollTop = gridWrapperRef.value.scrollTop;
      }
      scrollSyncing = false;
    }

    function onMemberScroll() {
      if (scrollSyncing) return;
      scrollSyncing = true;
      if (gridWrapperRef.value && memberPanelRef.value) {
        gridWrapperRef.value.scrollTop = memberPanelRef.value.scrollTop;
      }
      scrollSyncing = false;
    }

    /* ── Grid panning (grab-to-scroll) ──────────────── */
    function onGridPanStart(e) {
      if (e.target.closest('.tl-task')) return;
      const wrapper = gridWrapperRef.value;
      if (!wrapper) return;
      isPanning.value = true;
      panStart.value = {
        x: e.clientX, y: e.clientY,
        scrollLeft: wrapper.scrollLeft, scrollTop: wrapper.scrollTop,
      };
      wrapper.setPointerCapture(e.pointerId);
    }

    function onGridPanMove(e) {
      if (!isPanning.value) return;
      const wrapper = gridWrapperRef.value;
      if (!wrapper) return;
      const dx = e.clientX - panStart.value.x;
      const dy = e.clientY - panStart.value.y;
      wrapper.scrollLeft = panStart.value.scrollLeft - dx;
      wrapper.scrollTop = panStart.value.scrollTop - dy;
    }

    function onGridPanEnd(e) {
      if (!isPanning.value) return;
      isPanning.value = false;
      const wrapper = gridWrapperRef.value;
      if (wrapper) {
        try { wrapper.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    }

    function onGridClick(e) {
      if (!e.target.closest('.tl-task')) {
        expandedTaskId.value = null;
      }
    }

    /* ── Watchers ───────────────────────────────────── */
    watch(() => props.content?.defaultView, (v) => {
      if (v) setCurrentView(v);
    });

    watch(() => props.content?.defaultZoom, (v) => {
      if (v) zoom.value = v;
    });

    watch(() => {
      if (currentView.value === 'backlog') return backlogTasks.value.length;
      return dayTasks.value.length;
    }, (count) => {
      setVisibleTaskCount(count);
    }, { immediate: true });

    /* Clear overrides when external task data changes */
    watch(() => props.content?.tasks, () => {
      taskOverrides.value = new Map();
    });

    /* ── Lifecycle ──────────────────────────────────── */
    onMounted(() => {
      nextTick(() => {
        if (gridWrapperRef.value) {
          gridWrapperWidth.value = gridWrapperRef.value.clientWidth;
          const scrollTo = Math.max(0, (8 - hourStart.value) * zoom.value - 40);
          gridWrapperRef.value.scrollLeft = scrollTo;
        }
      });

      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          gridWrapperWidth.value = entry.contentRect.width;
        }
      });
      if (gridWrapperRef.value) {
        resizeObserver.observe(gridWrapperRef.value);
      }

      nowInterval = setInterval(() => {
        nowTick.value = Date.now();
      }, 60000);
    });

    onBeforeUnmount(() => {
      if (nowInterval) clearInterval(nowInterval);
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(tooltipTimer);
    });

    return {
      /* Template refs */
      gridWrapperRef, memberPanelRef, weekGridRef,
      /* Constants */
      viewTabs, headerRowHeight,
      /* Computed */
      cssVars, rootStyle, tasks, members, displayMembers,
      filteredTasks, dayTasks, backlogTasks,
      scheduledTasks, categories, filterOptions, hourRange, gridWidth,
      currentDate, currentView, isDayView, nowLinePos, weekDays, weekTasksByDay,
      dateDisplayHtml, zoomLabel, selectedTaskId, zoom, rowH, sidebarWidth,
      hourStart, canZoomOut,
      resizeIndicatorStyle, resizeTimeText,
      /* Refs */
      activeFilter, tooltipData, dragState, weekDragState, resizeState,
      isPanning, expandedTaskId,
      /* Methods */
      initials, taskColor, prioColor, prioLabel, catColor, catLabel, padHour,
      isCurrentHour, taskDuration, taskBlockWidth, taskBlockStyle,
      memberDayTasks, weekDayTasks, weekTaskStyle, formatTimeRange,
      setView, navigateDate, setFilter, zoomIn, zoomOut, goToDay,
      handleTaskClick, handleTaskDblClick, handleAddTask,
      onTaskPointerEnter, hideTooltip,
      onTaskPointerDown, onTaskPointerMove, onTaskPointerUp, onTaskLeave,
      startWeekDrag, onWeekDrag, endWeekDrag,
      onGridScroll, onMemberScroll,
      onGridPanStart, onGridPanMove, onGridPanEnd, onGridClick,
      /* wwEditor:start */
      isEditing,
      /* wwEditor:end */
    };
  },
};
</script>

<style lang="scss" scoped>
/* ── Reset ──────────────────────────────────────────── */
.tl-root {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  background: var(--tl-bg);
  color: var(--tl-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.4;
  user-select: none;
  -webkit-font-smoothing: antialiased;
  position: relative;
}

/* ── Header ─────────────────────────────────────────── */
.tl-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--tl-border);
  background: var(--tl-bg-card);
  flex-shrink: 0;
  min-height: 52px;
}

.tl-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tl-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.tl-date-display {
  font-size: 14px;
  font-weight: 400;
  color: var(--tl-text);
  white-space: nowrap;

  :deep(span) {
    color: var(--tl-text-muted);
    font-weight: 400;
  }

  :deep(strong) {
    font-weight: 400;
  }
}

.tl-tabs {
  display: flex;
  gap: 2px;
  background: var(--tl-bg);
  border-radius: 10px;
  padding: 2px;
}

.tl-tab {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--tl-text-muted);
  cursor: pointer;
  white-space: nowrap;
  border: none;
  background: none;
  transition: all 0.15s;

  &:hover {
    color: var(--tl-text);
    background: var(--tl-bg-card);
  }

  &.active {
    color: var(--tl-text);
    background: var(--tl-bg-card);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}

.tl-filters {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.tl-filter-pill {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--tl-text-muted);
  cursor: pointer;
  border: 1px solid transparent;
  background: none;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    color: var(--tl-text);
    border-color: var(--tl-border);
  }

  &.active {
    color: var(--tl-text);
    border-color: var(--tl-border);
    background: var(--tl-bg-elevated);
  }
}

.tl-zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tl-zoom-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--tl-bg-surface);
  border: 1px solid var(--tl-border);
  color: var(--tl-text-muted);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;

  &:hover:not(.disabled) {
    color: var(--tl-text);
    border-color: var(--tl-text-muted);
  }

  &.disabled {
    opacity: 0.35;
    cursor: default;
    pointer-events: none;
  }
}

.tl-zoom-label {
  font-size: 11px;
  color: var(--tl-text-dim);
  min-width: 32px;
  text-align: center;
}

.tl-nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--tl-bg-surface);
  border: 1px solid var(--tl-border);
  color: var(--tl-text-muted);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s;

  &:hover {
    color: var(--tl-text);
    border-color: var(--tl-text-muted);
  }
}

.tl-add-btn {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--tl-accent);
  border: 1px solid var(--tl-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    background: var(--tl-accent-hover);
    border-color: var(--tl-accent-hover);
  }
}

/* ── Body / Grid ────────────────────────────────────── */
.tl-body {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  overflow: hidden;
  position: relative;
}

.tl-body-week {
  flex-direction: column;
}

.tl-members {
  flex-shrink: 0;
  border-right: 1px solid var(--tl-border);
  background: var(--tl-bg-card);
  z-index: 10;
  overflow-y: auto;

  &::-webkit-scrollbar {
    display: none;
  }
}

.tl-member-header {
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 500;
  color: var(--tl-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--tl-border);
  background: var(--tl-bg-card);
  position: sticky;
  top: 0;
  z-index: 2;
}

.tl-member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--tl-border-light);
  transition: background 0.1s;

  &:nth-child(even) {
    background: var(--tl-bg-row-alt);
  }

  &:hover {
    background: var(--tl-bg-card-hover);
  }

  &.drop-target {
    background: rgba(62, 130, 246, 0.12);
    box-shadow: inset 0 0 0 1px rgba(62, 130, 246, 0.25);
  }
}

.tl-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--tl-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--tl-text-muted);
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--tl-border);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tl-member-info {
  overflow: hidden;
}

.tl-member-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--tl-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tl-member-role {
  font-size: 11px;
  color: var(--tl-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tl-grid-wrapper {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  position: relative;
  cursor: grab;

  &.panning {
    cursor: grabbing;
    user-select: none;
  }

  &::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--tl-bg);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--tl-border);
    border-radius: 4px;
  }
}

.tl-grid {
  position: relative;
  min-height: 100%;
}

.tl-hour-headers {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--tl-bg-card);
  border-bottom: 1px solid var(--tl-border);
  flex-shrink: 0;
}

.tl-hour-header {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--tl-text-dim);
  border-right: 1px solid var(--tl-border-light);
  flex-shrink: 0;

  &.current {
    color: var(--tl-accent);
    font-weight: 500;
  }
}

.tl-grid-row {
  position: relative;
  border-bottom: 1px solid var(--tl-border-light);

  &:nth-child(even) {
    background: var(--tl-bg-row-alt);
  }
}

.tl-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--tl-border-light);
  z-index: 0;

  &.hour {
    background: var(--tl-border);
  }
}

.tl-now-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--tl-now);
  z-index: 15;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    top: 4px;
    left: -4px;
    width: 10px;
    height: 10px;
    background: var(--tl-now);
    border-radius: 50%;
  }
}

.tl-resize-indicator {
  position: absolute;
  z-index: 200;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--tl-text);
  background: var(--tl-bg-elevated);
  border: 1px solid var(--tl-border);
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
}

/* ── Task Blocks ────────────────────────────────────── */
.tl-task {
  position: absolute;
  top: 6px;
  height: calc(100% - 12px);
  border-radius: 10px;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  overflow: hidden;
  z-index: 10;
  transition: width 0.2s ease, box-shadow 0.15s, transform 0.1s;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  touch-action: none;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
    z-index: 20;
  }

  &.dragging {
    opacity: 0.6;
    cursor: grabbing;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 100;
    transition: none;
  }

  &.selected {
    box-shadow: 0 0 0 1px var(--task-color, var(--tl-accent)), 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 25;
  }

  &.expanded {
    z-index: 30;
    overflow: visible;
  }

  &.resizing {
    cursor: col-resize;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 100;
    transition: none;
    overflow: visible;
  }
}

.tl-task-priority {
  width: 3px;
  height: 60%;
  border-radius: 2px;
  flex-shrink: 0;
}

.tl-task-content {
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.tl-task-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
}

.tl-task-meta {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  opacity: 0.7;
  line-height: 1.3;
}

.tl-task-duration {
  font-size: 10px;
  opacity: 0.6;
  flex-shrink: 0;
  white-space: nowrap;
}

/* ── Empty ──────────────────────────────────────────── */
.tl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 8px;
}

.tl-empty-icon {
  font-size: 32px;
  opacity: 0.5;
}

.tl-empty-text {
  font-size: 14px;
  color: var(--tl-text-muted);
}

.tl-empty-sub {
  font-size: 12px;
  color: var(--tl-text-dim);
}

/* ── Backlog ────────────────────────────────────────── */
.tl-backlog {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
  align-content: start;
}

.tl-backlog-card {
  background: var(--tl-bg-card);
  border: 1px solid var(--tl-border);
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  gap: 10px;
  align-items: flex-start;

  &:hover {
    border-color: var(--tl-text-dim);
    background: var(--tl-bg-card-hover);
  }
}

.tl-backlog-priority {
  width: 4px;
  height: 100%;
  min-height: 36px;
  border-radius: 2px;
  flex-shrink: 0;
}

.tl-backlog-content {
  flex: 1;
  min-width: 0;
}

.tl-backlog-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--tl-text);
  margin-bottom: 4px;
}

.tl-backlog-detail {
  font-size: 11px;
  color: var(--tl-text-dim);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tl-backlog-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

/* ── Week ───────────────────────────────────────────── */
.tl-week-header {
  display: flex;
  height: 48px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--tl-bg-card);
  border-bottom: 1px solid var(--tl-border);
}

.tl-week-day-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--tl-text-dim);
  border-right: 1px solid var(--tl-border-light);
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--tl-bg-card-hover);
  }

  &.today {
    color: var(--tl-accent);
    font-weight: 500;
    background: var(--tl-accent-dim);
  }

  .day-name {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .day-num {
    font-size: 16px;
    font-weight: 500;
  }
}

.tl-week-grid {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}

.tl-week-column {
  flex: 1;
  border-right: 1px solid var(--tl-border-light);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 100%;
}

.tl-week-task {
  background: var(--tl-bg-card);
  border: 1px solid var(--tl-border);
  border-left: 1px solid var(--tl-accent);
  border-radius: 10px;
  padding: 8px;
  cursor: grab;
  transition: all 0.15s;
  font-size: 11px;
  touch-action: none;

  &:hover {
    border-color: var(--tl-text-dim);
    background: var(--tl-bg-card-hover);
  }

  &.dragging {
    opacity: 0.6;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    cursor: grabbing;
    transition: none;
  }
}

.tl-week-day-header.drag-over {
  background: var(--tl-accent-dim);
}

.tl-week-task-title {
  font-weight: 500;
  color: var(--tl-text);
  margin-bottom: 2px;
}

.tl-week-task-time {
  font-size: 10px;
  color: var(--tl-text-dim);
}

.tl-week-task-assignee {
  font-size: 10px;
  color: var(--tl-text-dim);
  margin-top: 2px;
}

.tl-week-empty {
  color: var(--tl-text-dim);
  font-size: 11px;
  text-align: center;
  padding: 16px;
}

/* ── Tooltip ────────────────────────────────────────── */
.tl-tooltip {
  position: absolute;
  z-index: 1000;
  background: var(--tl-bg-card);
  border: 1px solid var(--tl-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  max-width: 260px;
  display: none;

  &.visible {
    opacity: 1;
    display: block;
  }
}

.tl-tooltip-title {
  font-weight: 500;
  color: var(--tl-text);
  margin-bottom: 4px;
}

.tl-tooltip-row {
  color: var(--tl-text-muted);
  font-size: 11px;
  line-height: 1.6;

  strong {
    color: var(--tl-text);
    font-weight: 500;
  }
}
</style>
