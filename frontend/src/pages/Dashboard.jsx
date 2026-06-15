import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  Filter,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Send,
  Smartphone,
  Users,
} from 'lucide-react'
import { getCampaigns } from '../api/campaigns'
import { getCustomers } from '../api/customers'
import { getSegments } from '../api/segments'
import ChartTooltip from '../components/ChartTooltip'
import { CardGridSkeleton, StatCardSkeleton } from '../components/Skeleton'
import StatCard from '../components/StatCard'
import { useToast } from '../context/ToastContext'
import { BAR_COLORS, CHART_ANIMATION, PIE_COLORS } from '../utils/chartStyles'

/** Render percentage labels inside slices to avoid clipping at card edges. */
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const angle = (-midAngle * Math.PI) / 180
  const x = cx + radius * Math.cos(angle)
  const y = cy + radius * Math.sin(angle)

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CHANNEL_ICONS = {
  whatsapp: Smartphone,
  sms: MessageSquare,
  email: Mail,
  rcs: Send,
}

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-slate-100 text-slate-700',
    sending: 'bg-amber-50 text-amber-700',
    sent: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] || styles.draft}`}
    >
      {status === 'sending' && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      )}
      {status}
    </span>
  )
}

function EmptyChartState({ icon: Icon, message, subtitle }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-slate-400">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <p className="font-medium text-slate-600">{message}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [customerTotal, setCustomerTotal] = useState(0)
  const [segments, setSegments] = useState([])
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const [customersRes, segmentsRes, campaignsRes] = await Promise.all([
          getCustomers({ page: 1, pageSize: 1 }),
          getSegments(),
          getCampaigns(),
        ])

        setCustomerTotal(customersRes.total)
        setSegments(segmentsRes)
        setCampaigns(campaignsRes)
      } catch (err) {
        showToast(err.message || 'Failed to load dashboard data', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [showToast])

  const totalMessagesSent = useMemo(
    () => campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0),
    [campaigns]
  )

  const latestCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3),
    [campaigns]
  )

  const barChartData = useMemo(
    () =>
      latestCampaigns.map((c) => ({
        name: c.name.length > 18 ? `${c.name.slice(0, 18)}…` : c.name,
        delivered: c.total_delivered || 0,
        opened: c.total_opened || 0,
        clicked: c.total_clicked || 0,
        failed: c.total_failed || 0,
      })),
    [latestCampaigns]
  )

  const engagementTotals = useMemo(() => {
    const totals = { delivered: 0, opened: 0, clicked: 0, failed: 0 }
    campaigns.forEach((c) => {
      totals.delivered += c.total_delivered || 0
      totals.opened += c.total_opened || 0
      totals.clicked += c.total_clicked || 0
      totals.failed += c.total_failed || 0
    })
    return [
      { name: 'Delivered', value: totals.delivered },
      { name: 'Opened', value: totals.opened },
      { name: 'Clicked', value: totals.clicked },
      { name: 'Failed', value: totals.failed },
    ]
  }, [campaigns])

  const engagementSum = engagementTotals.reduce((s, item) => s + item.value, 0)

  const recentCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    [campaigns]
  )

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <CardGridSkeleton count={2} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      <div className="relative">
        <div className="pointer-events-none absolute -left-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-30 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-0.5 text-slate-500">Overview of your CRM performance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Customers" value={customerTotal} icon={Users} iconColor="indigo" />
        <StatCard title="Total Segments" value={segments.length} icon={Filter} iconColor="violet" />
        <StatCard title="Total Campaigns" value={campaigns.length} icon={Send} iconColor="emerald" />
        <StatCard
          title="Total Messages Sent"
          value={totalMessagesSent}
          icon={MessageSquare}
          iconColor="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Campaign Performance"
          subtitle={
            campaigns.length > 0 ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Showing latest 3 of {campaigns.length} campaign
                  {campaigns.length === 1 ? '' : 's'}
                </span>
                <Link
                  to="/campaigns/analytics"
                  className="inline-flex items-center gap-0.5 font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null
          }
        >
          {barChartData.length === 0 ? (
            <EmptyChartState
              icon={Send}
              message="No campaigns yet"
              subtitle="Create your first campaign to see performance data"
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
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
          )}
        </Card>

        <Card title="Overall Engagement">
          {engagementSum === 0 ? (
            <EmptyChartState
              icon={MessageSquare}
              message="No engagement data yet"
              subtitle="Launch campaigns to track opens and clicks"
            />
          ) : (
            <div className="pt-1 pb-2">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={engagementTotals}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    label={renderPieLabel}
                    labelLine={false}
                    {...CHART_ANIMATION}
                  >
                    {engagementTotals.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0]
                      const pct =
                        engagementSum > 0
                          ? Math.round((item.value / engagementSum) * 100)
                          : 0
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
                          <p className="font-medium text-slate-900">
                            {item.name}: {item.value} ({pct}%)
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value, entry) => {
                      const pct =
                        engagementSum > 0
                          ? Math.round((entry.payload.value / engagementSum) * 100)
                          : 0
                      return `${value} (${pct}%)`
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Campaigns</h2>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Send className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">No campaigns yet</p>
            <p className="mt-1 text-sm text-slate-400">Create a campaign to get started</p>
            <Link
              to="/campaigns"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md active:scale-95"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Sent</th>
                  <th className="px-6 py-3 font-medium">Delivered Rate</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign, index) => {
                  const ChannelIcon = CHANNEL_ICONS[campaign.channel] || Send
                  const deliveredRate =
                    campaign.total_sent > 0
                      ? Math.round((campaign.total_delivered / campaign.total_sent) * 100)
                      : 0

                  return (
                    <tr
                      key={campaign.id}
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      className="cursor-pointer border-b border-slate-50 transition-all duration-200 hover:-translate-y-px hover:bg-slate-50 hover:shadow-sm"
                      style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">{campaign.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                          <ChannelIcon className="h-3.5 w-3.5" />
                          {campaign.channel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">{campaign.total_sent}</td>
                      <td className="px-6 py-4 text-slate-600">{deliveredRate}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-6 py-4">
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
