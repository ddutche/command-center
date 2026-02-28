import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'

const USER_ID = 'donny' // single-user app, hardcoded

// Debounce helper
function useDebouncedSave(saveFn, delay = 1000) {
  const timer = useRef(null)
  return useCallback(
    (data) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => saveFn(data), delay)
    },
    [saveFn, delay]
  )
}

// Default state
const DEFAULTS = {
  daily_tasks: [
    { id: 'd1', text: 'Review research notes', done: false },
    { id: 'd2', text: 'Check Upwork proposals', done: false },
    { id: 'd3', text: 'Work on web scraping script', done: false },
  ],
  someday_tasks: [
    { id: 's1', text: 'Build portfolio website', done: false },
    { id: 's2', text: 'Learn advanced Tableau techniques', done: false },
  ],
  expenses: [
    { id: 'e1', name: 'Rent', amount: 1200, category: 'Housing' },
    { id: 'e2', name: 'Phone', amount: 85, category: 'Utilities' },
    { id: 'e3', name: 'Spotify', amount: 10.99, category: 'Subscriptions' },
    { id: 'e4', name: 'Gym', amount: 30, category: 'Health' },
    { id: 'e5', name: 'Internet', amount: 60, category: 'Utilities' },
  ],
  income_streams: [
    { id: 'i1', name: 'Graduate Research Assistantship', amount: 1800, type: 'Salary' },
    { id: 'i2', name: 'Upwork Freelancing', amount: 500, type: 'Freelance' },
  ],
  streak: 3,
  best_streak: 7,
  streak_bumped_today: false,
  total_completed: 42,
  goal_target: 100,
  goal_prize: 'New Mechanical Keyboard ⌨️',
  last_reset_date: new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
}

export function useDatabase() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingSupabase, setUsingSupabase] = useState(false)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Try Supabase first
      const { data: row, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', USER_ID)
        .single()

      if (!error && row) {
        setData(row.data)
        setUsingSupabase(true)
        setLoading(false)
        return
      }

      // If no row exists, try to create one
      if (error?.code === 'PGRST116') {
        const { error: insertErr } = await supabase
          .from('user_data')
          .insert({ user_id: USER_ID, data: DEFAULTS })

        if (!insertErr) {
          setData(DEFAULTS)
          setUsingSupabase(true)
          setLoading(false)
          return
        }
      }

      throw new Error('Supabase unavailable')
    } catch (e) {
      console.log('Supabase unavailable, using localStorage fallback:', e.message)
      // Fallback to localStorage
      const stored = localStorage.getItem('command-center-data')
      if (stored) {
        try {
          setData(JSON.parse(stored))
        } catch {
          setData(DEFAULTS)
        }
      } else {
        setData(DEFAULTS)
        localStorage.setItem('command-center-data', JSON.stringify(DEFAULTS))
      }
      setUsingSupabase(false)
      setLoading(false)
    }
  }

  // Save to Supabase
  const saveToSupabase = useCallback(async (newData) => {
    try {
      await supabase
        .from('user_data')
        .update({ data: newData, updated_at: new Date().toISOString() })
        .eq('user_id', USER_ID)
    } catch (e) {
      console.error('Supabase save failed:', e)
    }
  }, [])

  // Save to localStorage
  const saveToLocal = useCallback((newData) => {
    try {
      localStorage.setItem('command-center-data', JSON.stringify(newData))
    } catch (e) {
      console.error('localStorage save failed:', e)
    }
  }, [])

  // Debounced save (so we don't spam the DB on every checkbox)
  const debouncedSupabaseSave = useDebouncedSave(saveToSupabase, 800)

  // Update function — updates state + persists
  const updateData = useCallback(
    (updater) => {
      setData((prev) => {
        const newData = typeof updater === 'function' ? updater(prev) : updater
        // Always save to localStorage immediately (instant)
        saveToLocal(newData)
        // Also save to Supabase (debounced)
        if (usingSupabase) {
          debouncedSupabaseSave(newData)
        }
        return newData
      })
    },
    [usingSupabase, debouncedSupabaseSave, saveToLocal]
  )

  return { data, loading, updateData, usingSupabase }
}
