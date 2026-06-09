"use client"

import { useEffect, useState } from "react"

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) setValue(JSON.parse(item) as T)
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [key])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value, loaded])

  return [value, setValue, loaded] as const
}
