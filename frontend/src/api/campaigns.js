import client from './client'

/** List all campaigns. */
export async function getCampaigns() {
  const { data } = await client.get('/api/campaigns')
  return data
}

/** Fetch a campaign with segment details. */
export async function getCampaign(id) {
  const { data } = await client.get(`/api/campaigns/${id}`)
  return data
}

/** Create a draft campaign. */
export async function createCampaign(payload) {
  const { data } = await client.post('/api/campaigns', payload)
  return data
}

/** Launch a draft campaign. */
export async function sendCampaign(id) {
  const { data } = await client.post(`/api/campaigns/${id}/send`)
  return data
}

/** List messages for a campaign, optionally filtered by status. */
export async function getCampaignMessages(id, status) {
  const { data } = await client.get(`/api/campaigns/${id}/messages`, {
    params: status ? { status } : undefined,
  })
  return data
}
