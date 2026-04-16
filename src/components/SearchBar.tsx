import { Search } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { User } from '@/types'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSearch = async (value: string) => {
    setQuery(value)
    setSelectedIndex(-1)

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (value.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const result = await api.searchUsers(value)
        setSuggestions(result.results || [])
        setIsOpen(true)
      } catch (error) {
        console.error('Search error:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }

  const handleSelect = (user: User) => {
    setQuery(user.login)
    setSuggestions([])
    setIsOpen(false)
    navigate(`/dashboard/${user.login}`)
  }

  const handleAnalyze = async () => {
    if (query.trim()) {
      navigate(`/dashboard/${query.trim()}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleAnalyze()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex])
        } else {
          handleAnalyze()
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="rounded-[22px] border border-white/10 bg-black/70 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
            placeholder="Search GitHub username..."
            className="w-full rounded-xl border border-white/10 bg-black/80 px-4 py-3.5 pl-11 text-white placeholder:text-white/35 outline-none transition-all focus:border-white/25 focus:ring-2 focus:ring-white/10"
          />
            {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 animate-spin">⟳</div>}
          </div>
          <button
            onClick={handleAnalyze}
            className="rounded-xl border border-white/15 bg-[#0b0b0b] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#111111]"
          >
            Analyze
          </button>
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-[18px] border border-white/10 bg-black/95 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.login}
              onClick={() => handleSelect(user)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                index === selectedIndex ? 'bg-white/8' : 'hover:bg-white/6'
              } ${index > 0 ? 'border-t border-white/8' : ''}`}
            >
              <img
                src={user.avatar_url || `https://github.com/${user.login}.png?size=32`}
                alt={user.login}
                className="h-8 w-8 rounded-full border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">{user.login}</div>
                {user.name && <div className="text-xs text-white/55 truncate">{user.name}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
