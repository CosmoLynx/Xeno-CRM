import client from './client'

/** List all audience segments. */
export async function getSegments() {
  const { data } = await client.get('/api/segments')
  return data
}

/** Fetch a segment with matching customers. */
export async function getSegment(id) {
  const { data } = await client.get(`/api/segments/${id}`)
  return data
}

/** Create and persist a new segment. */
export async function createSegment(payload) {
  const { data } = await client.post('/api/segments', payload)
  return data
}

/** Preview segment matches without saving. */
export async function previewSegment(conditions) {
  const { data } = await client.post('/api/segments/preview', { conditions })
  return data
}

/** Delete a segment by id. */
export async function deleteSegment(id) {
  await client.delete(`/api/segments/${id}`)
}
