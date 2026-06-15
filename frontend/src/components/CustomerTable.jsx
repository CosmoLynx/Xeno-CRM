import { Users } from 'lucide-react'

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
]

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatCurrency(value) {
  const amount = Number(value || 0)
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function formatDate(value) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function CustomerAvatar({ name, index }) {
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-semibold text-white`}
    >
      {getInitials(name)}
    </div>
  )
}

/**
 * Reusable customer table with responsive columns and row click handler.
 */
export default function CustomerTable({ customers = [], onRowClick }) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-slate-400 shadow-sm">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <Users className="h-10 w-10 text-slate-400" />
        </div>
        <p className="text-lg font-semibold text-slate-600">No customers found</p>
        <p className="mt-1 text-sm text-slate-400">Try adjusting your search or city filter</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="hidden px-6 py-3 font-medium md:table-cell">Email</th>
              <th className="px-6 py-3 font-medium">City</th>
              <th className="px-6 py-3 font-medium">Total Spent</th>
              <th className="px-6 py-3 font-medium">Orders</th>
              <th className="hidden px-6 py-3 font-medium lg:table-cell">Last Order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr
                key={customer.id}
                onClick={() => onRowClick?.(customer)}
                className="cursor-pointer border-b border-slate-50 transition-all duration-200 hover:-translate-y-px hover:bg-slate-50 hover:shadow-sm"
                style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <CustomerAvatar name={customer.name} index={index} />
                    <span className="font-semibold text-slate-900">{customer.name}</span>
                  </div>
                </td>
                <td className="hidden px-6 py-4 text-slate-500 md:table-cell">{customer.email}</td>
                <td className="px-6 py-4 text-slate-600">{customer.city || '—'}</td>
                <td className="px-6 py-4 font-medium text-slate-900">
                  {formatCurrency(customer.total_spent)}
                </td>
                <td className="px-6 py-4 text-slate-600">{customer.order_count}</td>
                <td className="hidden px-6 py-4 text-slate-600 lg:table-cell">
                  {formatDate(customer.last_order_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { formatCurrency, formatDate }
