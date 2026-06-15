import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Search, Users, X } from 'lucide-react'
import { getCustomers, getOrders } from '../api/customers'
import CustomerTable, { formatCurrency, formatDate } from '../components/CustomerTable'
import { TableSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'

const PAGE_SIZE = 20

const CITY_OPTIONS = [
  'All Cities',
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Kolkata',
  'Jaipur',
  'Lucknow',
]

function CustomerDetailPanel({ customer, onClose }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!customer) return undefined

    async function loadOrders() {
      setLoading(true)
      setError(null)
      try {
        const data = await getOrders(customer.id)
        setOrders(data)
      } catch (err) {
        setError(err.message || 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [customer])

  useEffect(() => {
    if (!customer) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [customer, onClose])

  if (!customer) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 right-0 z-[101] flex w-full flex-col bg-white shadow-2xl md:w-[480px] animate-fade-in-up">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{customer.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:scale-95"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-b border-slate-200 px-6 py-4">
          {[
            { label: 'Total Spent', value: formatCurrency(customer.total_spent) },
            { label: 'Orders', value: customer.order_count },
            { label: 'Last Order', value: formatDate(customer.last_order_date) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-slate-50 px-3 py-3">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Order History</h3>

          {loading && <p className="text-sm text-slate-500">Loading orders…</p>}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-600">No orders yet</p>
              <p className="mt-1 text-sm text-slate-400">This customer hasn&apos;t placed any orders</p>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {order.product_name || 'Order'}
                      </p>
                      {order.category && (
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {order.category}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(order.order_amount)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{formatDate(order.ordered_at)}</span>
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 font-medium capitalize',
                        order.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                      ].join(' ')}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body
  )
}

export default function Customers() {
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('All Cities')
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true)
      setError(null)

      try {
        const data = await getCustomers({
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          city: city === 'All Cities' ? undefined : city,
        })
        setCustomers(data.customers)
        setTotal(data.total)
      } catch (err) {
        const message = err.message || 'Failed to load customers'
        setError(message)
        showToast(message, 'error')
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [page, search, city, showToast])

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="relative">
        <div className="pointer-events-none absolute -left-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-30 blur-3xl" />
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <p className="mt-1 text-slate-500">
          {total.toLocaleString('en-IN')} customer{total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-52"
        >
          {CITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <CustomerTable customers={customers} onRowClick={setSelectedCustomer} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Showing {start}-{end} of {total.toLocaleString('en-IN')} customers
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <CustomerDetailPanel
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  )
}
