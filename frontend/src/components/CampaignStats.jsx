import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Send } from 'lucide-react'
import { CHART_ANIMATION } from '../utils/chartStyles'
import { formatPercent } from '../utils/statusStyles'

const FUNNEL_COLORS = ['#6366f1', '#7c3aed', '#8b5cf6', '#10b981']

/**
 * Funnel-style delivery stats visualization for a campaign.
 */
export default function CampaignStats({ campaign }) {
  const totalSent = campaign?.total_sent || 0

  if (totalSent === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Send className="h-8 w-8 text-slate-400" />
        </div>
        <p className="font-medium text-slate-600">No delivery data yet</p>
        <p className="mt-1 text-sm text-slate-400">Launch this campaign to see results</p>
      </div>
    )
  }

  const funnelData = [
    {
      stage: 'Sent',
      value: campaign.total_sent,
      label: `${campaign.total_sent} (${formatPercent(campaign.total_sent, totalSent)})`,
    },
    {
      stage: 'Delivered',
      value: campaign.total_delivered,
      label: `${campaign.total_delivered} (${formatPercent(campaign.total_delivered, totalSent)})`,
    },
    {
      stage: 'Opened',
      value: campaign.total_opened,
      label: `${campaign.total_opened} (${formatPercent(campaign.total_opened, totalSent)})`,
    },
    {
      stage: 'Clicked',
      value: campaign.total_clicked,
      label: `${campaign.total_clicked} (${formatPercent(campaign.total_clicked, totalSent)})`,
    },
  ]

  const failed = campaign.total_failed || 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Delivery Funnel</h2>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" domain={[0, totalSent]} tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis
            type="category"
            dataKey="stage"
            width={80}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0]
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
                  <p className="font-medium text-slate-900">
                    {item.payload.stage}: {item.payload.label}
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28} {...CHART_ANIMATION}>
            {funnelData.map((_, index) => (
              <Cell key={index} fill={FUNNEL_COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {funnelData.map((item, index) => (
          <div key={item.stage} className="text-sm text-slate-600">
            <span
              className="mr-2 inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: FUNNEL_COLORS[index] }}
            />
            <span className="font-medium text-slate-900">{item.stage}:</span> {item.label}
          </div>
        ))}
      </div>

      {failed > 0 && (
        <p className="mt-4 text-sm font-medium text-red-600">
          {failed} messages failed ({formatPercent(failed, totalSent)})
        </p>
      )}
    </div>
  )
}
