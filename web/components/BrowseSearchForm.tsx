'use client'

import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '@/lib/categories'

const CHECK_PATH = 'M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.085l6.79-6.79a1 1 0 011.414 0z'

interface BrowseSearchFormProps {
  initialQuery: string
  initialCategory: string
}

export default function BrowseSearchForm({ initialQuery, initialCategory }: BrowseSearchFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState(initialCategory)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function choose(value: string) {
    setCategory(value)
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form className="flex items-stretch overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
        <input
          type="text"
          name="q"
          placeholder="Search listings…"
          defaultValue={initialQuery}
          className="min-w-0 flex-1 bg-transparent px-6 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
        <div className="my-2 w-px shrink-0 bg-gray-200" />
        <input type="hidden" name="category" value={category} />
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Category"
          data-testid="category-trigger"
          className="w-36 shrink-0 truncate bg-transparent px-4 py-3.5 text-left text-sm text-gray-700 outline-none sm:w-52"
        >
          {category || 'All categories'}
        </button>
        <button
          type="submit"
          className="m-1.5 shrink-0 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Search
        </button>
      </form>

      {isOpen && (
        <div className="absolute right-[4.5rem] top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-lg ring-1 ring-gray-900/5">
          <button
            type="button"
            onClick={() => choose('')}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            All categories
            {!category && (
              <svg className="h-4 w-4 text-emerald-700" viewBox="0 0 20 20" fill="currentColor">
                <path d={CHECK_PATH} />
              </svg>
            )}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => choose(c)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {c}
              {category === c && (
                <svg className="h-4 w-4 text-emerald-700" viewBox="0 0 20 20" fill="currentColor">
                  <path d={CHECK_PATH} />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
