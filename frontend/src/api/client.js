import axios from 'axios'

/** Shared axios instance for all CRM API requests. */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
          : error.message || 'Request failed'

    const cleanError = {
      message,
      status: error.response?.status ?? null,
      detail,
    }

    console.error('[API Error]', cleanError)
    return Promise.reject(cleanError)
  }
)

export default client
