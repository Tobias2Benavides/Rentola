import Link from 'next/link'
import RequestForm from '@/components/RequestForm'

export default function NewRequestPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/requests" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Request an Item</h1>
      </div>
      <RequestForm />
    </div>
  )
}
