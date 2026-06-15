import client from './client'

/** Fetch paginated customers with optional search and city filters. */
export async function getCustomers({ page = 1, pageSize = 20, search, city } = {}) {
  const { data } = await client.get('/api/customers', {
    params: {
      page,
      page_size: pageSize,
      search: search || undefined,
      city: city || undefined,
    },
  })
  return data
}

/** Fetch a single customer with order history. */
export async function getCustomer(id) {
  const { data } = await client.get(`/api/customers/${id}`)
  return data
}

/** Create a new customer. */
export async function createCustomer(payload) {
  const { data } = await client.post('/api/customers', payload)
  return data
}

/** Partially update a customer. */
export async function updateCustomer(id, payload) {
  const { data } = await client.patch(`/api/customers/${id}`, payload)
  return data
}

/** Create an order for a customer. */
export async function createOrder(payload) {
  const { data } = await client.post('/api/orders', payload)
  return data
}

/** List orders, optionally filtered by customer. */
export async function getOrders(customerId) {
  const { data } = await client.get('/api/orders', {
    params: customerId ? { customer_id: customerId } : undefined,
  })
  return data
}
