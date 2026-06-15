import { Plus, X } from 'lucide-react'

const FIELD_OPTIONS = [
  { value: 'total_spent', label: 'Total Spent (₹)', type: 'numeric' },
  { value: 'order_count', label: 'Number of Orders', type: 'numeric' },
  { value: 'last_order_date', label: 'Last Order Date', type: 'date' },
  { value: 'city', label: 'City', type: 'string' },
  { value: 'gender', label: 'Gender', type: 'string' },
  { value: 'age', label: 'Age', type: 'numeric' },
  { value: 'created_at', label: 'Joined Date', type: 'date' },
]

const OPERATORS_BY_TYPE = {
  numeric: [
    { value: 'gt', label: 'is greater than' },
    { value: 'lt', label: 'is less than' },
    { value: 'gte', label: 'is at least' },
    { value: 'lte', label: 'is at most' },
    { value: 'eq', label: 'equals' },
  ],
  string: [{ value: 'eq', label: 'is' }],
  date: [
    { value: 'days_ago_gt', label: 'is more than ___ days ago' },
    { value: 'days_ago_lt', label: 'is less than ___ days ago' },
  ],
}

const CITY_OPTIONS = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Kolkata',
  'Jaipur',
  'Lucknow',
]

const GENDER_OPTIONS = ['male', 'female', 'other']

function getFieldMeta(field) {
  return FIELD_OPTIONS.find((option) => option.value === field) || FIELD_OPTIONS[0]
}

function getDefaultValue(field, operator) {
  const meta = getFieldMeta(field)
  if (meta.type === 'date') return 30
  if (field === 'city') return CITY_OPTIONS[0]
  if (field === 'gender') return GENDER_OPTIONS[0]
  if (field === 'total_spent') return 1000
  if (field === 'order_count') return 5
  if (field === 'age') return 25
  return operator === 'eq' ? '' : 0
}

function getDefaultRule() {
  return { field: 'total_spent', operator: 'gt', value: 1000 }
}

function normalizeConditions(conditions) {
  const rules =
    conditions?.rules?.length > 0 ? conditions.rules.map((rule) => ({ ...rule })) : [getDefaultRule()]

  return {
    operator: conditions?.operator === 'OR' ? 'OR' : 'AND',
    rules,
  }
}

/**
 * Controlled manual segment rule builder.
 */
export default function SegmentBuilder({ conditions, onChange }) {
  const normalized = normalizeConditions(conditions)

  function updateConditions(next) {
    onChange(normalizeConditions(next))
  }

  function updateOperator(operator) {
    updateConditions({ ...normalized, operator })
  }

  function updateRule(index, patch) {
    const rules = normalized.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule))
    updateConditions({ ...normalized, rules })
  }

  function handleFieldChange(index, field) {
    const meta = getFieldMeta(field)
    const operator = OPERATORS_BY_TYPE[meta.type][0].value
    updateRule(index, { field, operator, value: getDefaultValue(field, operator) })
  }

  function handleOperatorChange(index, operator) {
    const rule = normalized.rules[index]
    updateRule(index, { operator, value: getDefaultValue(rule.field, operator) })
  }

  function addRule() {
    updateConditions({
      ...normalized,
      rules: [...normalized.rules, getDefaultRule()],
    })
  }

  function removeRule(index) {
    if (normalized.rules.length === 1) return
    updateConditions({
      ...normalized,
      rules: normalized.rules.filter((_, i) => i !== index),
    })
  }

  function renderValueInput(rule, index) {
    const meta = getFieldMeta(rule.field)

    if (meta.type === 'date') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={rule.value ?? ''}
            onChange={(e) => updateRule(index, { value: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <span className="shrink-0 text-sm text-slate-500">days ago</span>
        </div>
      )
    }

    if (rule.field === 'city') {
      return (
        <select
          value={rule.value ?? CITY_OPTIONS[0]}
          onChange={(e) => updateRule(index, { value: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {CITY_OPTIONS.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      )
    }

    if (rule.field === 'gender') {
      return (
        <select
          value={rule.value ?? GENDER_OPTIONS[0]}
          onChange={(e) => updateRule(index, { value: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {GENDER_OPTIONS.map((gender) => (
            <option key={gender} value={gender}>
              {gender}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type="number"
        value={rule.value ?? ''}
        onChange={(e) => updateRule(index, { value: Number(e.target.value) })}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        {[
          { value: 'AND', label: 'Match ALL conditions (AND)' },
          { value: 'OR', label: 'Match ANY condition (OR)' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateOperator(option.value)}
            className={[
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              normalized.operator === option.value
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {normalized.rules.map((rule, index) => {
          const meta = getFieldMeta(rule.field)
          const operators = OPERATORS_BY_TYPE[meta.type]

          return (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-[1.2fr_1.2fr_1fr_auto]"
            >
              <select
                value={rule.field}
                onChange={(e) => handleFieldChange(index, e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {FIELD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={rule.operator}
                onChange={(e) => handleOperatorChange(index, e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {operators.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div>{renderValueInput(rule, index)}</div>

              <button
                type="button"
                onClick={() => removeRule(index)}
                disabled={normalized.rules.length === 1}
                className="flex h-10 w-10 items-center justify-center self-start rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Remove condition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-200 px-4 py-3 text-sm font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
      >
        <Plus className="h-4 w-4" />
        Add Condition
      </button>
    </div>
  )
}

export { getDefaultRule, normalizeConditions }
