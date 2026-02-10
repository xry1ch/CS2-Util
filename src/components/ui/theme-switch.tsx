import { Moon, Sun } from 'lucide-react'

interface ThemeSwitchProps {
  isDark: boolean
  onToggle: () => void
}

export function ThemeSwitch({ isDark, onToggle }: ThemeSwitchProps) {
  return (
    <button
      onClick={onToggle}
      className="relative inline-flex h-10 w-20 items-center rounded-full border border-border bg-muted/50 transition-all hover:bg-muted"
      aria-label="Toggle theme"
    >
      {/* Background icons */}
      <span className={`absolute left-2.5 transition-opacity duration-200 ${!isDark ? 'opacity-0' : 'opacity-40'}`}>
        <Sun className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className={`absolute right-2.5 transition-opacity duration-200 ${isDark ? 'opacity-0' : 'opacity-40'}`}>
        <Moon className="h-4 w-4 text-muted-foreground" />
      </span>
      
      {/* Switch toggle with icon */}
      <span
        className={`relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-md transition-transform duration-200 ${
          isDark ? 'translate-x-11' : 'translate-x-1'
        }`}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-foreground" />
        ) : (
          <Sun className="h-4 w-4 text-foreground" />
        )}
      </span>
    </button>
  )
}
