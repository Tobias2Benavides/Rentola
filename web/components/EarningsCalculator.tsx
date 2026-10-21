'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/format'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-emerald-700">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-700"
      />
    </div>
  )
}

export default function EarningsCalculator() {
  const [pricePerDay, setPricePerDay] = useState(10)
  const [daysRentedPerMonth, setDaysRentedPerMonth] = useState(10)
  const [totalDaysRenting, setTotalDaysRenting] = useState(90)

  const monthlyEarnings = pricePerDay * daysRentedPerMonth
  const totalMonths = totalDaysRenting / 30
  const totalEarnings = monthlyEarnings * totalMonths

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
      <div className="space-y-5">
        <Slider
          label="Price per day"
          value={pricePerDay}
          min={1}
          max={50}
          step={1}
          unit="/ day"
          onChange={setPricePerDay}
        />
        <Slider
          label="Days rented per month"
          value={daysRentedPerMonth}
          min={0}
          max={30}
          step={1}
          unit="days"
          onChange={setDaysRentedPerMonth}
        />
        <Slider
          label="Total time you've been renting it out"
          value={totalDaysRenting}
          min={30}
          max={365}
          step={1}
          unit="days"
          onChange={setTotalDaysRenting}
        />
      </div>

      <div className="mt-6 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-gray-400">Estimated earnings / month</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">{formatPrice(monthlyEarnings)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Estimated total over {totalDaysRenting} days</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-700">{formatPrice(totalEarnings)}</p>
        </div>
      </div>
    </div>
  )
}
