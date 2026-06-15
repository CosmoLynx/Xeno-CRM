import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { createSegment, deleteSegment, getSegments, previewSegment } from '../api/segments'
import AIAssistant from '../components/AIAssistant'
import CampaignSuggestions from '../components/CampaignSuggestions'
import Modal from '../components/Modal'
import { CardGridSkeleton } from '../components/Skeleton'
import SegmentBuilder, { getDefaultRule, normalizeConditions } from '../components/SegmentBuilder'
import { useToast } from '../context/ToastContext'

const EMPTY_FORM = {
  name: '',
  description: '',
  conditions: { operator: 'AND', rules: [getDefaultRule()] },
}

function formatCreatedDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function CreateSegmentModal({
  open,
  onClose,
  onCreated,
  activeTab,
  setActiveTab,
  formData,
  setFormData,
  previewResult,
  setPreviewResult,
  previewLoading,
  setPreviewLoading,
  saving,
  setSaving,
  saveError,
  setSaveError,
  showToast,
}) {
  const canSave = useMemo(() => {
    return (
      formData.name.trim().length > 0 &&
      formData.conditions?.rules?.length > 0 &&
      formData.conditions.rules.every((rule) => rule.field && rule.operator && rule.value !== '')
    )
  }, [formData])

  async function handlePreview() {
    setPreviewLoading(true)
    setSaveError(null)
    try {
      const result = await previewSegment(formData.conditions)
      setPreviewResult(result)
    } catch (err) {
      const message = err.message || 'Failed to preview segment'
      setSaveError(message)
      showToast(message, 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSave() {
    if (!canSave || saving) return

    setSaving(true)
    setSaveError(null)
    try {
      await createSegment({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        conditions: formData.conditions,
      })
      showToast('Segment created successfully')
      onCreated()
      onClose()
    } catch (err) {
      const message = err.message || 'Failed to create segment'
      setSaveError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleAIConditions(conditions, explanation) {
    setFormData((current) => ({
      ...current,
      description: current.description || explanation || current.description,
      conditions: normalizeConditions(conditions),
    }))
    setPreviewResult(null)
    setActiveTab('manual')
    showToast('✨ Generated successfully')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Segment"
      headerExtra={
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {[
              { id: 'ai', label: 'AI Assistant' },
              { id: 'manual', label: 'Manual Builder' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-95',
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      }
      footer={
        <>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving || activeTab === 'ai'}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Segment
            </button>
          </div>
        </>
      }
    >
      {activeTab === 'ai' ? (
        <AIAssistant onConditionsGenerated={handleAIConditions} />
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Segment Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
              placeholder="e.g. Bangalore High Spenders"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description (optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData((current) => ({ ...current, description: e.target.value }))
              }
              placeholder="Who is this audience?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <SegmentBuilder
            conditions={formData.conditions}
            onChange={(conditions) => {
              setFormData((current) => ({ ...current, conditions }))
              setPreviewResult(null)
            }}
          />

          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Preview Matching Customers
          </button>

          {previewResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-medium">
                This segment matches {previewResult.matching_count} customers
              </p>
              {previewResult.customers?.length > 0 && (
                <p className="mt-2 text-emerald-700">
                  {previewResult.customers
                    .slice(0, 5)
                    .map((customer) => customer.name)
                    .join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {saveError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
    </Modal>
  )
}

export default function Segments() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('ai')
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [previewResult, setPreviewResult] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [suggestionSegment, setSuggestionSegment] = useState(null)

  async function loadSegments() {
    setLoading(true)
    setError(null)
    try {
      const data = await getSegments()
      setSegments(data)
    } catch (err) {
      const message = err.message || 'Failed to load segments'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSegments()
  }, [])

  function openModal() {
    setFormData(EMPTY_FORM)
    setActiveTab('ai')
    setPreviewResult(null)
    setSaveError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSaveError(null)
    setPreviewResult(null)
  }

  async function handleDelete(segment) {
    const confirmed = window.confirm(`Delete segment "${segment.name}"?`)
    if (!confirmed) return

    try {
      await deleteSegment(segment.id)
      setSegments((current) => current.filter((item) => item.id !== segment.id))
      showToast('Segment deleted successfully')
    } catch (err) {
      showToast(err.message || 'Failed to delete segment', 'error')
    }
  }

  function handleUseSuggestion(suggestion) {
    if (!suggestionSegment) return

    setSuggestionSegment(null)
    navigate('/campaigns', {
      state: {
        prefill: {
          segment_id: suggestionSegment.id,
          channel: suggestion.channel,
          goal: suggestion.goal,
          tone: suggestion.tone,
        },
      },
    })
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <div className="pointer-events-none absolute -left-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-30 blur-3xl" />
          <h1 className="text-2xl font-semibold text-slate-900">Segments</h1>
          <p className="mt-1 text-slate-500">
            Build audiences with manual rules or AI-generated conditions
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create Segment
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <Filter className="h-10 w-10 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-900">No segments yet</p>
          <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
            Create your first audience segment to target customers for campaigns.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((current) => (current === segment.id ? null : segment.id))
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <h3 className="truncate text-lg font-bold text-slate-900">{segment.name}</h3>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(segment)}
                  className="shrink-0 rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 active:scale-95"
                  aria-label={`Delete ${segment.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setExpandedId((current) => (current === segment.id ? null : segment.id))
                }
                className="mt-2 flex-1 text-left"
              >
                <p className="line-clamp-2 text-sm text-slate-500">
                  {segment.description || 'No description'}
                </p>

                <div className="mt-5">
                  <p className="text-3xl font-bold text-slate-900">{segment.customer_count}</p>
                  <p className="text-sm text-slate-500">customers</p>
                </div>

                {expandedId === segment.id && segment.conditions?.rules?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {segment.conditions.rules.map((rule, ruleIndex) => (
                      <span
                        key={ruleIndex}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                      >
                        {rule.field} {rule.operator} {String(rule.value)}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-400">
                  Created {formatCreatedDate(segment.created_at)}
                </p>
                <button
                  type="button"
                  onClick={() => setSuggestionSegment(segment)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 transition-all hover:bg-indigo-50 active:scale-95"
                >
                  <Sparkles className="h-4 w-4" />
                  Suggest Campaigns
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateSegmentModal
        open={showModal}
        onClose={closeModal}
        onCreated={loadSegments}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formData={formData}
        setFormData={setFormData}
        previewResult={previewResult}
        setPreviewResult={setPreviewResult}
        previewLoading={previewLoading}
        setPreviewLoading={setPreviewLoading}
        saving={saving}
        setSaving={setSaving}
        saveError={saveError}
        setSaveError={setSaveError}
        showToast={showToast}
      />

      {suggestionSegment && (
        <CampaignSuggestions
          segment={suggestionSegment}
          onClose={() => setSuggestionSegment(null)}
          onUseSuggestion={handleUseSuggestion}
        />
      )}
    </div>
  )
}
