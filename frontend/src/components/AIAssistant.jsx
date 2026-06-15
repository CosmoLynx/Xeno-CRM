import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { generateSegmentConditions } from '../api/ai'

const EXAMPLE_PROMPTS = [
  'High value customers from Mumbai',
  'Customers inactive for 60+ days',
  'New customers who joined this month',
  'Frequent buyers with 5+ orders',
]

/**
 * Chat-style AI assistant for generating segment conditions from plain English.
 */
export default function AIAssistant({ onConditionsGenerated }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [explanation, setExplanation] = useState(null)

  async function handleGenerate(event) {
    event.preventDefault()
    const trimmed = description.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await generateSegmentConditions(trimmed)
      setExplanation(result.explanation)
      onConditionsGenerated?.(result.conditions, result.explanation)
    } catch (err) {
      setExplanation(null)
      setError(
        err.status === 502
          ? "AI couldn't generate this segment. Try rephrasing or use the manual builder."
          : err.message || "AI couldn't generate this segment. Try rephrasing or use the manual builder."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h3 className="font-medium text-slate-900">Describe your audience in plain English</h3>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setDescription(prompt)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleGenerate} className="space-y-3">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="e.g. customers from Bangalore who spent over 2000 and haven't ordered in 45 days"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        <button
          type="submit"
          disabled={!description.trim() || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Thinking…' : 'Generate'}
        </button>
      </form>

      {loading && (
        <p className="mt-4 text-sm text-slate-500">Thinking…</p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {explanation && !loading && (
        <div className="mt-4 flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="max-w-xl rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {explanation}
          </div>
        </div>
      )}
    </div>
  )
}
