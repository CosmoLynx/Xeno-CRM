import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react'
import { generateCampaignMessage } from '../api/ai'
import { createCampaign, getCampaigns, sendCampaign } from '../api/campaigns'
import { getSegments, previewSegment } from '../api/segments'
import Modal from '../components/Modal'
import { TableSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import {
  CAMPAIGN_STATUS_STYLES,
  formatDate,
  formatPercent,
  personalizePreview,
} from '../utils/statusStyles'
import { CHANNEL_CONFIG, getCharLimit } from '../utils/channelStyles'

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'sms', label: 'SMS', icon: Smartphone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'rcs', label: 'RCS', icon: MessageSquare },
]

const TONE_OPTIONS = ['friendly', 'professional', 'urgent', 'playful']

const EMPTY_FORM = {
  name: '',
  segment_id: '',
  channel: 'whatsapp',
  message_template: '',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CAMPAIGN_STATUS_STYLES[status] || CAMPAIGN_STATUS_STYLES.draft}`}
    >
      {status === 'sending' && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      )}
      {status}
    </span>
  )
}

function ChannelBadge({ channel }) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.whatsapp
  const Icon = config.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${config.badge}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}

function CreateCampaignModal({
  open,
  onClose,
  segments,
  onCreated,
  prefill = null,
  onPrefillConsumed,
}) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const prefillAppliedRef = useRef(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [aiGoal, setAiGoal] = useState('')
  const [aiTone, setAiTone] = useState('friendly')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [previewCustomer, setPreviewCustomer] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showPrefillBanner, setShowPrefillBanner] = useState(false)

  const selectedSegment = segments.find((segment) => segment.id === formData.segment_id)
  const charLimit = getCharLimit(formData.channel)
  const charCount = formData.message_template.length
  const overLimit = charCount > charLimit

  const canSave =
    formData.name.trim() &&
    formData.segment_id &&
    formData.channel &&
    formData.message_template.trim() &&
    !overLimit &&
    !saving

  useEffect(() => {
    if (!open) {
      setFormData(EMPTY_FORM)
      setAiGoal('')
      setAiTone('friendly')
      setAiError(null)
      setSaveError(null)
      setPreviewCustomer(null)
      setShowPrefillBanner(false)
      prefillAppliedRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (!open || !prefill || prefillAppliedRef.current) return

    prefillAppliedRef.current = true
    setShowPrefillBanner(true)
    setFormData({
      name: '',
      segment_id: prefill.segment_id,
      channel: prefill.channel || 'whatsapp',
      message_template: '',
    })
    setAiGoal(prefill.goal || '')
    setAiTone(prefill.tone || 'friendly')
  }, [open, prefill])

  useEffect(() => {
    if (!open || !prefill || !prefillAppliedRef.current || segments.length === 0) return

    let cancelled = false

    async function autoGenerateFromSuggestion() {
      const segment = segments.find((item) => item.id === prefill.segment_id)
      setAiGenerating(true)
      setAiError(null)

      try {
        const result = await generateCampaignMessage({
          goal: prefill.goal,
          segmentDescription: segment?.description || segment?.name || '',
          channel: prefill.channel || 'whatsapp',
          tone: prefill.tone || 'friendly',
        })

        if (!cancelled) {
          setFormData((current) => ({ ...current, message_template: result.message }))
          showToast('✨ Generated successfully')
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err.status === 502
              ? "AI couldn't generate a message. Try rephrasing or write it manually."
              : err.message || "AI couldn't generate a message."
          setAiError(message)
          showToast(message, 'error')
        }
      } finally {
        if (!cancelled) {
          setAiGenerating(false)
          onPrefillConsumed?.()
        }
      }
    }

    autoGenerateFromSuggestion()
    return () => {
      cancelled = true
    }
  }, [open, prefill, segments, onPrefillConsumed, showToast])

  useEffect(() => {
    async function loadPreviewCustomer() {
      if (!selectedSegment?.conditions) {
        setPreviewCustomer(null)
        return
      }

      try {
        const result = await previewSegment(selectedSegment.conditions)
        setPreviewCustomer(result.customers?.[0] || null)
      } catch {
        setPreviewCustomer(null)
      }
    }

    loadPreviewCustomer()
  }, [selectedSegment])

  async function handleGenerateMessage() {
    if (!aiGoal.trim() || aiGenerating) return

    setAiGenerating(true)
    setAiError(null)

    try {
      const result = await generateCampaignMessage({
        goal: aiGoal.trim(),
        segmentDescription: selectedSegment?.description || selectedSegment?.name || '',
        channel: formData.channel,
        tone: aiTone,
      })

      if (
        formData.message_template.trim() &&
        !window.confirm('Replace the current message template with the AI-generated one?')
      ) {
        return
      }

      setFormData((current) => ({ ...current, message_template: result.message }))
      showToast('✨ Generated successfully')
    } catch (err) {
      const message =
        err.status === 502
          ? "AI couldn't generate a message. Try rephrasing or write it manually."
          : err.message || "AI couldn't generate a message. Try rephrasing or write it manually."
      setAiError(message)
      showToast(message, 'error')
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleCreate() {
    if (!canSave) return

    setSaving(true)
    setSaveError(null)

    try {
      const created = await createCampaign({
        name: formData.name.trim(),
        segment_id: formData.segment_id,
        channel: formData.channel,
        message_template: formData.message_template.trim(),
      })
      showToast('Campaign created successfully')
      onCreated(created)
      onClose()
      navigate(`/campaigns/${created.id}`)
    } catch (err) {
      const message = err.message || 'Failed to create campaign'
      setSaveError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Campaign"
      footer={
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
            onClick={handleCreate}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Campaign
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {showPrefillBanner && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <span>✨ Pre-filled from AI suggestion — review and adjust as needed</span>
            <button
              type="button"
              onClick={() => setShowPrefillBanner(false)}
              className="shrink-0 text-indigo-500 hover:text-indigo-700"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Campaign Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
            placeholder="e.g. Welcome Back Offer"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Target Segment
          </label>
          {segments.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Create a segment first.{' '}
              <Link to="/segments" className="font-medium underline" onClick={onClose}>
                Go to Segments
              </Link>
            </div>
          ) : (
            <select
              value={formData.segment_id}
              onChange={(e) =>
                setFormData((current) => ({ ...current, segment_id: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select a segment</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name} ({segment.customer_count} customers)
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Channel</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHANNEL_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData((current) => ({ ...current, channel: value }))}
                className={[
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors active:scale-95',
                  formData.channel === value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Generate with AI</h3>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              placeholder='Campaign goal, e.g. "win back inactive customers with 20% discount"'
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {TONE_OPTIONS.map((tone) => (
                <option key={tone} value={tone}>
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleGenerateMessage}
              disabled={!aiGoal.trim() || aiGenerating}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiGenerating ? 'Generating…' : 'Generate'}
            </button>

            {aiError && <p className="text-sm text-red-600">{aiError}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Message Template
          </label>
          <textarea
            value={formData.message_template}
            onChange={(e) =>
              setFormData((current) => ({ ...current, message_template: e.target.value }))
            }
            rows={5}
            placeholder="Hey {name}! Here's an exclusive offer just for you…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p className={`mt-1 text-xs ${overLimit ? 'text-red-600' : 'text-slate-500'}`}>
            {charCount} / {charLimit} characters
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Use {'{name}'}, {'{city}'}, {'{email}'} as placeholders for personalization
          </p>

          {formData.message_template && previewCustomer && (
            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium text-indigo-700">Preview:</span>{' '}
              {personalizePreview(formData.message_template, previewCustomer)}
            </div>
          )}
        </div>

        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function Campaigns() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [campaigns, setCampaigns] = useState([])
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [launchingId, setLaunchingId] = useState(null)

  const segmentMap = useMemo(
    () => Object.fromEntries(segments.map((segment) => [segment.id, segment.name])),
    [segments]
  )

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [campaignsData, segmentsData] = await Promise.all([getCampaigns(), getSegments()])
      setCampaigns(campaignsData)
      setSegments(segmentsData)
    } catch (err) {
      setError(err.message || 'Failed to load campaigns')
      showToast(err.message || 'Failed to load campaigns', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (location.state?.prefill) {
      setPrefill(location.state.prefill)
      setShowModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  async function handleLaunch(campaign, event) {
    event.stopPropagation()

    setLaunchingId(campaign.id)
    setCampaigns((current) =>
      current.map((item) =>
        item.id === campaign.id ? { ...item, status: 'sending' } : item
      )
    )

    try {
      await sendCampaign(campaign.id)
      showToast('Campaign launched! Tracking delivery...')
      await loadData()
    } catch (err) {
      setCampaigns((current) =>
        current.map((item) =>
          item.id === campaign.id ? { ...item, status: 'draft' } : item
        )
      )
      showToast(err.message || 'Failed to launch campaign', 'error')
    } finally {
      setLaunchingId(null)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <div className="pointer-events-none absolute -left-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-30 blur-3xl" />
          <h1 className="text-2xl font-semibold text-slate-900">Campaigns</h1>
          <p className="mt-1 text-slate-500">Create and launch multi-channel campaigns</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Link
            to="/campaigns/analytics"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-slate-50 hover:shadow-md active:scale-95"
          >
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Analytics
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <Send className="h-10 w-10 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-900">No campaigns yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create your first campaign to reach your audience.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-6 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95"
          >
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Segment</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Stats</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign, index) => {
                  const deliveryRate =
                    campaign.total_sent > 0
                      ? formatPercent(campaign.total_delivered, campaign.total_sent)
                      : '—'

                  return (
                    <tr
                      key={campaign.id}
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      className="cursor-pointer border-b border-slate-50 transition-all duration-200 hover:-translate-y-px hover:bg-slate-50 hover:shadow-sm"
                      style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">{campaign.name}</td>
                      <td className="px-6 py-4">
                        <ChannelBadge channel={campaign.channel} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {segmentMap[campaign.segment_id] || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {campaign.total_sent} sent · {deliveryRate} delivered
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(campaign.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {campaign.status === 'draft' && (
                          <button
                            type="button"
                            onClick={(event) => handleLaunch(campaign, event)}
                            disabled={launchingId === campaign.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 active:scale-95 disabled:opacity-60"
                          >
                            {launchingId === campaign.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Launch
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateCampaignModal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setPrefill(null)
        }}
        segments={segments}
        onCreated={() => loadData()}
        prefill={prefill}
        onPrefillConsumed={() => setPrefill(null)}
      />
    </div>
  )
}
