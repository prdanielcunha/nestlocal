export function addIsoCalendarDays(isoDate, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || '')) || !Number.isInteger(Number(days))) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate));
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(days), 12));
  return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

export function daysBetweenIso(from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to || ''))) return 0;
  const a = Date.parse(from + 'T12:00:00Z');
  const b = Date.parse(to + 'T12:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86400000));
}

export function decorateAction(action, today) {
  const overdueDays = action.dueDate ? daysBetweenIso(action.dueDate, today) : 0;
  const urgency =
    action.priority >= 90 ? 'now' :
    action.priority >= 75 ? 'next' :
    'opportunity';

  let reasonKey = 'why_review';
  let reasonValue = 0;

  switch (action.type) {
    case 'finish':
      reasonKey = 'why_finish';
      break;
    case 'schedule':
      reasonKey = 'why_schedule';
      break;
    case 'execute':
      reasonKey = overdueDays > 0 ? 'why_execute_overdue' : 'why_execute_today';
      reasonValue = overdueDays;
      break;
    case 'review':
      reasonKey = 'why_review';
      break;
    case 'followup':
      reasonKey = 'why_followup';
      reasonValue = Math.max(48, Number(action.ageHours || 48));
      break;
    case 'collect':
      reasonKey = 'why_collect';
      break;
    case 'reactivate':
      reasonKey = overdueDays > 0 ? 'why_reactivate_overdue' : 'why_reactivate_today';
      reasonValue = overdueDays;
      break;
  }

  return {
    ...action,
    urgency,
    overdueDays,
    reasonKey,
    reasonValue,
  };
}

export function buildFocusQueue(actions = [], today = '') {
  const decorated = actions.map((action) => decorateAction(action, today));
  return {
    focus: decorated[0] || null,
    next: decorated.slice(1, 6),
    remainingCount: Math.max(0, decorated.length - 6),
    total: decorated.length,
  };
}


export function actionCooldownAllows(entity={},actionType='',today=''){
  const next=String(entity?.assistanceCooldowns?.[actionType]||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(next))return true;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(today||'')))return true;
  return next<=today;
}
