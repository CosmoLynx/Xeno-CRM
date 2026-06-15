import { useEffect, useState } from 'react'
import { ArrowRight, Sparkles, TrendingUp, X } from 'lucide-react'
import { getCampaignSuggestions } from '../api/ai'
import Modal from './Modal'
import { getChannelConfig } from '../utils/channelStyles'

function ChannelPerformanceCard({ stat }) {
  const config = getChannelConfig(stat.channel)
  const Icon = config.icon

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-flex rounded-lg p-1.5 ${config.badge}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium capitalize text-slate-900">{config.label}</span>
      </div>
      <div className="space-y-1 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Delivered</span>
          <span className="font-medium">{stat.avg_delivery_rate}%</span>
        </div>
        <div className="flex justify-between">
          <span>Opened</span>
          <span className="font-medium">{stat.avg_open_rate}%</span>
        </div>
        <div className="flex justify-between">
          <span>Clicked</span>
          <span className="font-medium">{stat.avg_click_rate}%</span>
        </div>
      </div>
    </div>
  )
}

function ToneBadge({ tone }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
      {tone}
    </span>
  )
}

/**
 * Modal showing AI-generated campaign strategies for a segment.
 */
export default function CampaignSuggestions({ segment, onClose, onUseSuggestion }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    async function loadSuggestions() {
      setLoading(true)
      setError(null)
      try {
        const result = await getCampaignSuggestions(segment.id)
        setData(result)
      } catch (err) {
        setError(
          err.status === 502
            ? "Couldn't generate suggestions right now. You can still create a campaign manually."
            : err.message || "Couldn't generate suggestions right now."
        )
      } finally {
        setLoading(false)
      }
    }

    loadSuggestions()
  }, [segment.id])

  if (!segment) return null

  return (
    <Modal
      open
      onClose={onClose}
      maxWidth="max-w-3xl"
      header={
        <div className="flex items-start justify-between px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Campaign Suggestions for {segment.name}
              </h2>
            </div>
            {data?.segment_summary && (
              <p className="mt-2 text-sm italic text-slate-500">{data.segment_summary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      }
    >
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Sparkles className="mb-4 h-10 w-10 animate-pulse text-indigo-500" />
          <p className="text-sm">Analyzing past campaigns and crafting strategies…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-95"
          >
            Close
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Based on Past Performance
            </h3>
            {data.historical_performance?.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {data.historical_performance.map((stat) => (
                  <ChannelPerformanceCard key={stat.channel} stat={stat} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No campaign history yet — suggestions based on best practices
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Suggested Strategies</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data.suggestions.map((suggestion, index) => {
                const channelConfig = getChannelConfig(suggestion.channel)
                const ChannelIcon = channelConfig.icon

                return (
                  <div
                    key={`${suggestion.title}-${index}`}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <h4 className="font-semibold text-slate-900">{suggestion.title}</h4>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${channelConfig.badge}`}
                      >
                        <ChannelIcon className="h-3 w-3" />
                        {channelConfig.label}
                      </span>
                      <ToneBadge tone={suggestion.tone} />
                    </div>

                    <p className="mb-3 flex-1 text-sm text-slate-700">{suggestion.goal}</p>

                    <div className="mb-4 rounded-lg bg-slate-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Why this works
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">{suggestion.reasoning}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUseSuggestion(suggestion)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-violet-600 active:scale-95"
                    >
                      Use This Strategy
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
