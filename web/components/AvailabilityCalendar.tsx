'use client'

import { useMemo, useState } from 'react'

interface BlockedRange {
  start_date: string
  end_date: string
}

interface AvailabilityCalendarProps {
  blockedDates: BlockedRange[]
  startDate: string
  endDate: string
  onChange: (startDate: string, endDate: string) => void
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export default function AvailabilityCalendar({ blockedDates, startDate, endDate, onChange }: AvailabilityCalendarProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const blockedSet = useMemo(() => {
    const set = new Set<string>()
    for (const b of blockedDates) {
      let cur = parseISODate(b.start_date)
      const end = parseISODate(b.end_date)
      while (cur <= end) {
        set.add(toISODate(cur))
        cur = addDays(cur, 1)
      }
    }
    return set
  }, [blockedDates])

  function rangeHasBlocked(startIso: string, endIso: string) {
    let cur = parseISODate(startIso)
    const end = parseISODate(endIso)
    while (cur <= end) {
      if (blockedSet.has(toISODate(cur))) return true
      cur = addDays(cur, 1)
    }
    return false
  }

  function handleDayClick(iso: string) {
    if (blockedSet.has(iso)) return

    if (!startDate || endDate) {
      onChange(iso, '')
      return
    }
    if (iso <= startDate || rangeHasBlocked(startDate, iso)) {
      onChange(iso, '')
      return
    }
    onChange(startDate, iso)
  }

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-gray-900">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-xs text-gray-400">
            {w}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />

          const iso = toISODate(date)
          const blocked = blockedSet.has(iso)
          const past = date < today
          const isStart = iso === startDate
          const isEnd = iso === endDate
          const inSelectedRange = Boolean(startDate && endDate && iso >= startDate && iso <= endDate)
          const isEndpoint = isStart || isEnd

          // A contiguous band (booked or selected) is only rounded at its
          // true start/end — everywhere else it butts up against its
          // neighbor with no gap, so it reads as one continuous pill.
          const prevBlocked = blockedSet.has(toISODate(addDays(date, -1)))
          const nextBlocked = blockedSet.has(toISODate(addDays(date, 1)))

          let bandClasses = 'relative flex h-8 items-center justify-center '
          if (blocked) {
            bandClasses += `bg-emerald-100 ${prevBlocked ? '' : 'rounded-l-full'} ${nextBlocked ? '' : 'rounded-r-full'}`
          } else if (inSelectedRange) {
            bandClasses += `bg-emerald-50 ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}`
          }

          let dayClasses = 'flex h-8 w-8 items-center justify-center rounded-full text-sm '
          if (blocked) {
            dayClasses += 'text-emerald-700 cursor-not-allowed'
          } else if (past) {
            dayClasses += 'text-gray-300 cursor-not-allowed'
          } else if (isEndpoint) {
            dayClasses += 'bg-emerald-700 font-semibold text-white'
          } else if (inSelectedRange) {
            dayClasses += 'text-emerald-900'
          } else {
            dayClasses += 'text-gray-700 hover:bg-emerald-50'
          }

          return (
            <div key={iso} className={bandClasses}>
              <button
                type="button"
                disabled={blocked || past}
                onClick={() => handleDayClick(iso)}
                className={dayClasses}
              >
                {date.getDate()}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-100" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-700" /> Selected
        </span>
      </div>
    </div>
  )
}
