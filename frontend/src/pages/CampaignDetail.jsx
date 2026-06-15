import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Send,
  Users,
} from 'lucide-react'
import { getCampaign, getCampaignMessages, sendCampaign } from '../api/campaigns'
import CampaignStats from '../components/CampaignStats'
import { StatCardSkeleton } from '../components/Skeleton'
import StatCard from '../components/StatCard'
import { useToast } from '../context/ToastContext'
import {
  CAMPAIGN_STATUS_STYLES,
  CHANNEL_CONFIG,
  MESSAGE_STATUS_STYLES,
  formatDate,
  formatPercent,
} from '../utils/statusStyles'

const MESSAGE_FILTERS = ['all', 'sent', 'delivered', 'opened', 'clicked', 'failed']

function StatusBadge({ status, styles = CAMPAIGN_STATUS_STYLES }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] || styles.draft || 'bg-slate-100 text-slate-700'}`}
    >
      {status === 'sending' && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      )}
      {status}
    </span>
  )
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CampaignDetail() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [campaign, setCampaign] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [isPolling, setIsPolling] = useState(false)
  const [launching, setLaunching] = useState(false)

  const loadCampaignData = useCallback(async () => {
    try {
      const [campaignData, messagesData] = await Promise.all([
        getCampaign(id),
        getCampaignMessages(id),
      ])
      setCampaign(campaignData)
      setMessages(messagesData)
      setError(null)
      return campaignData
    } catch (err) {
      const message = err.message || 'Failed to load campaign'
      setError(message)
      showToast(message, 'error')
      return null
    }
  }, [id, showToast])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadCampaignData()
      setLoading(false)
    }
    init()
  }, [loadCampaignData])

  useEffect(() => {
    if (!campaign || campaign.status !== 'sending') {
      setIsPolling(false)
      return undefined
    }

    setIsPolling(true)
    const interval = setInterval(async () => {
      const updated = await loadCampaignData()
      if (updated && updated.status !== 'sending') {
        setIsPolling(false)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [campaign?.status, loadCampaignData])

  const filteredMessages = useMemo(() => {
    if (activeFilter === 'all') return messages
    return messages.filter((message) => message.status === activeFilter)
  }, [messages, activeFilter])

  async function handleLaunch() {
    if (!campaign || launching) return

    setLaunching(true)

    try {
      const updated = await sendCampaign(campaign.id)
      setCampaign(updated)
      showToast('Campaign launched! Tracking delivery...')
      await loadCampaignData()
    } catch (err) {
      showToast(err.message || 'Failed to launch campaign', 'error')
    } finally {
      setLaunching(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-8">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="animate-fade-in-up rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Failed to load campaign</p>
        <p className="mt-1 text-sm">{error || 'Campaign not found'}</p>
        <Link to="/campaigns" className="mt-4 inline-block text-sm font-medium underline">
          Back to Campaigns
        </Link>
      </div>
    )
  }

  const channelConfig = CHANNEL_CONFIG[campaign.channel] || CHANNEL_CONFIG.whatsapp
  const ChannelIcon = channelConfig.icon
  const totalSent = campaign.total_sent || 0

  return (
    <div className="animate-fade-in-up space-y-8">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="pointer-events-none absolute -left-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-30 blur-3xl" />
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{campaign.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${channelConfig.badge}`}
            >
              <ChannelIcon className="h-3.5 w-3.5" />
              {channelConfig.label}
            </span>
            <StatusBadge status={campaign.status} />
            {isPolling && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Segment: {campaign.segment?.name || '—'} · Created {formatDate(campaign.created_at)}
            {campaign.sent_at ? ` · Sent ${formatDate(campaign.sent_at)}` : ''}
          </p>
        </div>

        {campaign.status === 'draft' && (
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launching}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95 disabled:opacity-60"
          >
            {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Launch Campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Sent" value={totalSent} icon={Send} iconColor="indigo" />
        <StatCard
          title="Delivered"
          value={campaign.total_delivered ?? 0}
          trend={formatPercent(campaign.total_delivered, totalSent)}
          icon={MessageSquare}
          iconColor="violet"
        />
        <StatCard
          title="Opened"
          value={campaign.total_opened ?? 0}
          trend={formatPercent(campaign.total_opened, totalSent)}
          icon={Users}
          iconColor="emerald"
        />
        <StatCard
          title="Clicked"
          value={campaign.total_clicked ?? 0}
          trend={formatPercent(campaign.total_clicked, totalSent)}
          icon={MousePointerClick}
          iconColor="amber"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Message Template</h2>
        <div className="rounded-lg bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-700">
          {campaign.message_template}
        </div>
      </div>

      <CampaignStats campaign={campaign} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {MESSAGE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors active:scale-95',
                  activeFilter === filter
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <MessageSquare className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">
              {activeFilter === 'all' ? 'No messages yet' : `No ${activeFilter} messages`}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {activeFilter === 'all'
                ? 'Launch this campaign to start sending messages'
                : 'Try a different filter to see other messages'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="px-6 py-3 font-medium">Recipient</th>
                  <th className="px-6 py-3 font-medium">Content</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Sent At</th>
                  <th className="px-6 py-3 font-medium">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((message, index) => (
                  <tr
                    key={message.id}
                    className="border-b border-slate-50 transition-all duration-200 hover:bg-slate-50"
                    style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
                  >
                    <td className="px-6 py-4 text-slate-600">
                      Customer #{message.customer_id.slice(0, 8)}
                    </td>
                    <td className="max-w-xs px-6 py-4">
                      <p className="line-clamp-1 text-slate-700">{message.content}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={message.status}
                        styles={MESSAGE_STATUS_STYLES}
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDateTime(message.sent_at)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDateTime(message.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
