import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, BarChart3, MousePointerClick, Send } from 'lucide-react'
import { getCampaigns } from '../api/campaigns'
import ChartTooltip from '../components/ChartTooltip'
import Skeleton, { StatCardSkeleton } from '../components/Skeleton'
import StatCard from '../components/StatCard'
import { useToast } from '../context/ToastContext'
import { BAR_COLORS, CHART_ANIMATION } from '../utils/chartStyles'
import { CHANNEL_CONFIG } from '../utils/channelStyles'

function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-700">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function CampaignAnalytics() {
  const { showToast } = useToast()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getCampaigns()
        setCampaigns(data)
      } catch (err) {
        showToast(err.message || 'Failed to load analytics', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showToast])

  const sentCampaigns = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.status === 'sent' || c.total_sent > 0)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [campaigns]
  )

  const summary = useMemo(() => {
    const sent = sentCampaigns.filter((c) => c.total_sent > 0)
    const totalMessages = sent.reduce((sum, c) => sum + (c.total_sent || 0), 0)

    const deliveryRates = sent
      .filter((c) => c.total_sent > 0)
      .map((c) => (c.total_delivered / c.total_sent) * 100)
    const clickRates = sent
      .filter((c) => c.total_sent > 0)
      .map((c) => (c.total_clicked / c.total_sent) * 100)

    const avgDelivery =
      deliveryRates.length > 0
        ? Math.round(deliveryRates.reduce((a, b) => a + b, 0) / deliveryRates.length)
        : 0
    const avgClick =
      clickRates.length > 0
        ? Math.round(clickRates.reduce((a, b) => a + b, 0) / clickRates.length)
        : 0

    return {
      sentCount: sent.length,
      totalMessages,
      avgDelivery,
      avgClick,
    }
  }, [sentCampaigns])

  const barChartData = useMemo(
    () =>
      sentCampaigns.map((c) => ({
        name: c.name.length > 20 ? `${c.name.slice(0, 20)}…` : c.name,
        delivered: c.total_delivered || 0,
        opened: c.total_opened || 0,
        clicked: c.total_clicked || 0,
        failed: c.total_failed || 0,
      })),
    [sentCampaigns]
  )

  const channelStats = useMemo(() => {
    const byChannel = {}

    sentCampaigns.forEach((campaign) => {
      if (!campaign.total_sent) return
      const channel = campaign.channel
      if (!byChannel[channel]) {
        byChannel[channel] = { delivery: [], open: [], click: [], count: 0 }
      }
      byChannel[channel].delivery.push((campaign.total_delivered / campaign.total_sent) * 100)
      byChannel[channel].open.push((campaign.total_opened / campaign.total_sent) * 100)
      byChannel[channel].click.push((campaign.total_clicked / campaign.total_sent) * 100)
      byChannel[channel].count += 1
    })

    return Object.entries(byChannel).map(([channel, stats]) => {
      const avg = (arr) =>
        arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
      const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.whatsapp
      return {
        channel,
        label: config.label,
        icon: config.icon,
        badge: config.badge,
        campaigns: stats.count,
        delivery: avg(stats.delivery),
        open: avg(stats.open),
        click: avg(stats.click),
      }
    })
  }, [sentCampaigns])

  const chartMinWidth = Math.max(barChartData.length * 140, 600)

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-8">
        <Skeleton height={20} width={160} />
        <Skeleton height={32} width={280} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton height={360} className="rounded-xl" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="relative">
        <div className="pointer-events-none absolute -left-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-30 blur-3xl" />
        <h1 className="text-2xl font-semibold text-slate-900">Campaign Analytics</h1>
        <p className="mt-1 text-slate-500">
          Performance across all {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'}
        </p>
      </div>

      {sentCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <BarChart3 className="h-10 w-10 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-900">No sent campaigns yet</p>
          <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
            Launch a campaign to start tracking delivery, opens, and clicks here.
          </p>
          <Link
            to="/campaigns"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95"
          >
            Go to Campaigns
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Campaigns Sent"
              value={summary.sentCount}
              icon={Send}
              iconColor="indigo"
            />
            <StatCard
              title="Total Messages Sent"
              value={summary.totalMessages}
              icon={BarChart3}
              iconColor="violet"
            />
            <StatCard
              title="Avg Delivery Rate"
              value={summary.avgDelivery}
              suffix="%"
              icon={Send}
              iconColor="emerald"
            />
            <StatCard
              title="Avg Click Rate"
              value={summary.avgClick}
              suffix="%"
              icon={MousePointerClick}
              iconColor="amber"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Campaign Performance
            </h2>
            <div className="overflow-x-auto pb-2">
              <div style={{ width: chartMinWidth, height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="delivered"
                      fill={BAR_COLORS.delivered}
                      radius={[4, 4, 0, 0]}
                      {...CHART_ANIMATION}
                    />
                    <Bar
                      dataKey="opened"
                      fill={BAR_COLORS.opened}
                      radius={[4, 4, 0, 0]}
                      {...CHART_ANIMATION}
                    />
                    <Bar
                      dataKey="clicked"
                      fill={BAR_COLORS.clicked}
                      radius={[4, 4, 0, 0]}
                      {...CHART_ANIMATION}
                    />
                    <Bar
                      dataKey="failed"
                      fill={BAR_COLORS.failed}
                      radius={[4, 4, 0, 0]}
                      {...CHART_ANIMATION}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {channelStats.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Performance by Channel
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {channelStats.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.channel}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${item.badge}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.campaigns} campaign{item.campaigns === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <ProgressBar label="Delivery" value={item.delivery} color={BAR_COLORS.delivered} />
                        <ProgressBar label="Open" value={item.open} color={BAR_COLORS.opened} />
                        <ProgressBar label="Click" value={item.click} color={BAR_COLORS.clicked} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
