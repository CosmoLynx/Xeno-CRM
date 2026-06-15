import client from './client'

/** Convert natural language into segment filter conditions. */
export async function generateSegmentConditions(description) {
  const { data } = await client.post('/api/ai/segment', { description })
  return data
}

/** Generate a campaign message template with placeholders. */
export async function generateCampaignMessage({
  goal,
  segmentDescription,
  channel,
  tone = 'friendly',
}) {
  const { data } = await client.post('/api/ai/message', {
    goal,
    segment_description: segmentDescription,
    channel,
    tone,
  })
  return data
}

/** Fetch AI-generated campaign strategy suggestions for a segment. */
export async function getCampaignSuggestions(segmentId) {
  const { data } = await client.post('/api/ai/campaign-suggestions', {
    segment_id: segmentId,
  })
  return data
}
