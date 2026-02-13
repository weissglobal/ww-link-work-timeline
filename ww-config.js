export default {
  editor: {
    label: {
      en: 'Work Timeline',
    },
    icon: 'calendar',
  },
  triggerEvents: [
    { name: 'task-click', label: { en: 'Task Clicked' }, event: { taskId: '', task: {} } },
    { name: 'task-double-click', label: { en: 'Task Double Clicked' }, event: { taskId: '', task: {} } },
    {
      name: 'task-schedule-update',
      label: { en: 'Task Schedule Updated' },
      event: { taskId: '', newStartTime: '', newEndTime: '', newAssignedTo: '', newDate: '' },
    },
    { name: 'view-change', label: { en: 'View Changed' }, event: { view: '' } },
    { name: 'date-change', label: { en: 'Date Changed' }, event: { date: '' } },
    { name: 'filter-change', label: { en: 'Filter Changed' }, event: { category: '' } },
    { name: 'add-task', label: { en: 'Add Task Clicked' }, event: {} },
    { name: 'task-resize', label: { en: 'Task Resized' }, event: { taskId: '', newStartTime: '', newEndTime: '' } },
  ],
  properties: {
    /* ── Data ─────────────────────────────────────────── */
    tasks: {
      label: { en: 'Tasks' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(item) {
          return item?.title || item?.name || `Task ${item?.id || 'Unknown'}`;
        },
        item: {
          type: 'Object',
          defaultValue: {
            id: '',
            title: '',
            priority: 'medium',
            assigned_to: '',
            scheduled_date: '',
            scheduled_start_time: '',
            scheduled_end_time: '',
            project_name: '',
            project_color: '',
            client_name: '',
            category: '',
            estimated_minutes: 60,
            assignee_name: '',
            assignee_avatar: '',
          },
          options: {
            item: {
              id: { label: { en: 'Task ID' }, type: 'Text' },
              title: { label: { en: 'Title' }, type: 'Text' },
              priority: { label: { en: 'Priority' }, type: 'Text' },
              assigned_to: { label: { en: 'Assigned To ID' }, type: 'Text' },
              scheduled_date: { label: { en: 'Scheduled Date' }, type: 'Text' },
              scheduled_start_time: { label: { en: 'Start Time' }, type: 'Text' },
              scheduled_end_time: { label: { en: 'End Time' }, type: 'Text' },
              project_name: { label: { en: 'Project Name' }, type: 'Text' },
              project_color: { label: { en: 'Project Color' }, type: 'Text' },
              client_name: { label: { en: 'Client Name' }, type: 'Text' },
              category: { label: { en: 'Category' }, type: 'Text' },
              estimated_minutes: { label: { en: 'Estimated Min.' }, type: 'Number' },
              assignee_name: { label: { en: 'Assignee Name' }, type: 'Text' },
              assignee_avatar: { label: { en: 'Assignee Avatar' }, type: 'Text' },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Array of task objects with id, title, priority, assigned_to, scheduled_date, scheduled_start_time, scheduled_end_time, etc.',
      },
      /* wwEditor:end */
    },

    /* ── Members (org / team) ───────────────────────── */
    members: {
      label: { en: 'Members' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(item) {
          return item?.name || item?.full_name || `Member ${item?.id || 'Unknown'}`;
        },
        item: {
          type: 'Object',
          defaultValue: { id: '', name: '', avatar: '', role: '' },
          options: {
            item: {
              id: { label: { en: 'Member ID' }, type: 'Text' },
              name: { label: { en: 'Name' }, type: 'Text' },
              avatar: { label: { en: 'Avatar URL' }, type: 'Text' },
              role: { label: { en: 'Role' }, type: 'Text' },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Array of team/org member objects with id, name, avatar, role. When bound, all members appear in the timeline regardless of assigned tasks.',
      },
      /* wwEditor:end */
    },
    membersIdFormula: {
      label: { en: 'Member ID Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.members) && content.members.length > 0 ? content.members[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['id']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.members) || !content.members?.length || !boundProps.members,
    },
    membersNameFormula: {
      label: { en: 'Member Name Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.members) && content.members.length > 0 ? content.members[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['name']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.members) || !content.members?.length || !boundProps.members,
    },
    membersAvatarFormula: {
      label: { en: 'Member Avatar Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.members) && content.members.length > 0 ? content.members[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['avatar']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.members) || !content.members?.length || !boundProps.members,
    },
    membersRoleFormula: {
      label: { en: 'Member Role Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.members) && content.members.length > 0 ? content.members[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['role']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.members) || !content.members?.length || !boundProps.members,
    },

    /* ── Formula mappings (shown only when tasks is bound) ── */
    tasksIdFormula: {
      label: { en: 'ID Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['id']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksTitleFormula: {
      label: { en: 'Title Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['title']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksPriorityFormula: {
      label: { en: 'Priority Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['priority']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksAssignedToFormula: {
      label: { en: 'Assigned To Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['assigned_to']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksScheduledDateFormula: {
      label: { en: 'Scheduled Date Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['scheduled_date']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksStartTimeFormula: {
      label: { en: 'Start Time Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['scheduled_start_time']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksEndTimeFormula: {
      label: { en: 'End Time Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['scheduled_end_time']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksProjectNameFormula: {
      label: { en: 'Project Name Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['project_name']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksProjectColorFormula: {
      label: { en: 'Project Color Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['project_color']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksClientNameFormula: {
      label: { en: 'Client Name Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['client_name']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksCategoryFormula: {
      label: { en: 'Category Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['category']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksEstimatedMinutesFormula: {
      label: { en: 'Estimated Minutes Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['estimated_minutes']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksAssigneeNameFormula: {
      label: { en: 'Assignee Name Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['assignee_name']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },
    tasksAssigneeAvatarFormula: {
      label: { en: 'Assignee Avatar Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.tasks) && content.tasks.length > 0 ? content.tasks[0] : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['assignee_avatar']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.tasks) || !content.tasks?.length || !boundProps.tasks,
    },

    /* ── Settings ─────────────────────────────────────── */
    defaultView: {
      label: { en: 'Default View' },
      type: 'TextSelect',
      section: 'settings',
      options: {
        options: [
          { value: 'today', label: { en: 'Today' } },
          { value: 'tomorrow', label: { en: 'Tomorrow' } },
          { value: 'week', label: { en: 'Week' } },
          { value: 'backlog', label: { en: 'Backlog' } },
        ],
      },
      defaultValue: 'today',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Valid values: today | tomorrow | week | backlog',
      },
      /* wwEditor:end */
    },
    hourStart: {
      label: { en: 'Day Start Hour' },
      type: 'Number',
      section: 'settings',
      options: { min: 0, max: 12, step: 1 },
      defaultValue: 7,
      /* wwEditor:start */
      bindingValidation: { type: 'number', tooltip: 'Hour the day view starts (0-12)' },
      /* wwEditor:end */
    },
    hourEnd: {
      label: { en: 'Day End Hour' },
      type: 'Number',
      section: 'settings',
      options: { min: 13, max: 24, step: 1 },
      defaultValue: 20,
      /* wwEditor:start */
      bindingValidation: { type: 'number', tooltip: 'Hour the day view ends (13-24)' },
      /* wwEditor:end */
    },
    defaultZoom: {
      label: { en: 'Default Zoom (px/hour)' },
      type: 'Number',
      section: 'settings',
      options: { min: 60, max: 240, step: 10 },
      defaultValue: 120,
      /* wwEditor:start */
      bindingValidation: { type: 'number', tooltip: 'Pixels per hour in day view (60-240)' },
      /* wwEditor:end */
    },
    showWeekends: {
      label: { en: 'Show Weekends in Week View' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: false,
      /* wwEditor:start */
      bindingValidation: { type: 'boolean', tooltip: 'Show Saturday and Sunday in week view' },
      /* wwEditor:end */
    },
    memberSidebarWidth: {
      label: { en: 'Member Sidebar Width' },
      type: 'Number',
      section: 'settings',
      options: { min: 140, max: 300, step: 10 },
      defaultValue: 200,
      /* wwEditor:start */
      bindingValidation: { type: 'number', tooltip: 'Width of team member sidebar in pixels' },
      /* wwEditor:end */
    },
    rowHeight: {
      label: { en: 'Row Height' },
      type: 'Number',
      section: 'settings',
      options: { min: 48, max: 96, step: 4 },
      defaultValue: 64,
      /* wwEditor:start */
      bindingValidation: { type: 'number', tooltip: 'Height of each member row in pixels' },
      /* wwEditor:end */
    },
    height: {
      label: { en: 'Height' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '100%',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Component height (e.g. 100%, 600px, 80vh)' },
      /* wwEditor:end */
    },

    /* ── Style ────────────────────────────────────────── */
    bgColor: {
      label: { en: 'Background' },
      type: 'Color',
      section: 'style',
      defaultValue: '#191A1A',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Main background color' },
      /* wwEditor:end */
    },
    bgCard: {
      label: { en: 'Card Background' },
      type: 'Color',
      section: 'style',
      defaultValue: '#262626',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Card/panel background color' },
      /* wwEditor:end */
    },
    borderColor: {
      label: { en: 'Border Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#2E3030',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Border color' },
      /* wwEditor:end */
    },
    textColor: {
      label: { en: 'Text Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#FFFFFF',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Primary text color' },
      /* wwEditor:end */
    },
    textMuted: {
      label: { en: 'Muted Text' },
      type: 'Color',
      section: 'style',
      defaultValue: '#BFBFBF',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Secondary/muted text color' },
      /* wwEditor:end */
    },
    accentColor: {
      label: { en: 'Accent Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#3E82F6',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Accent/highlight color' },
      /* wwEditor:end */
    },
    nowLineColor: {
      label: { en: 'Now Line Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#ef4444',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Current time indicator line color' },
      /* wwEditor:end */
    },
  },
};
