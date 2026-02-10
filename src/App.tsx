import { ArrowLeft, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/ui/theme-switch'
import { posts, type MapPost } from '@/data/posts'

const mapImages = import.meta.glob('./assets/maps/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const mapOrder = ['de_inferno', 'de_anubis', 'de_dust2', 'de_ancient', 'de_nuke', 'de_overpass', 'de_mirage']

const maps = Object.entries(mapImages)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() ?? ''
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const rawName = nameWithoutExt.startsWith('de_')
      ? nameWithoutExt.slice(3)
      : nameWithoutExt
    const label = rawName
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    return {
      id: nameWithoutExt,
      label,
      url,
    }
  })
  .sort((a, b) => {
    const indexA = mapOrder.indexOf(a.id)
    const indexB = mapOrder.indexOf(b.id)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

const postImages = import.meta.glob(
  './assets/posts/**/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    import: 'default',
  }
) as Record<string, string>

const sideOptions = ['CT', 'T']
const siteOptions = ['A', 'MID', 'B']
const tags = ['SMOKE', 'MOLO', 'FLASH', 'NADE']

function App() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') return true
    if (stored === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [selectedSide, setSelectedSide] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [activePost, setActivePost] = useState<MapPost | null>(null)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const selectedMap = selectedMapId
    ? maps.find((map) => map.id === selectedMapId) ?? null
    : null

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      const next = new Set(current)
      if (next.has(tag)) {
        next.delete(tag)
        return next
      }
      next.add(tag)
      return next
    })
  }

  const filteredPosts = useMemo(() => {
    if (!selectedMap) return []
    return posts.filter((post) => {
      if (post.mapId !== selectedMap.id) return false
      if (selectedSide && !post.tags.includes(selectedSide)) return false
      if (selectedSite && !post.tags.includes(selectedSite)) return false
      if (selectedTags.size > 0) {
        const hasAnyTag = Array.from(selectedTags).some((tag) =>
          post.tags.includes(tag)
        )
        if (!hasAnyTag) return false
      }
      return true
    })
  }, [selectedMap, selectedSide, selectedSite, selectedTags])

  const resolvePostImage = (path: string) =>
    postImages[`./assets/posts/${path}`]

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    setZoom((prev) => Math.min(Math.max(1, prev + delta), 5))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const closeViewer = () => {
    setViewerImage(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setIsDragging(false)
  }

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewerImage) {
          closeViewer()
        } else if (activePost) {
          setActivePost(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewerImage, activePost])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16">
        <div className="flex w-full items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              CS2-UTILS
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {selectedMap ? selectedMap.label : 'Selecciona un mapa'}
            </h1>
          </div>
          <ThemeSwitch
            isDark={isDark}
            onToggle={() => setIsDark((current) => !current)}
          />
        </div>
        {selectedMap ? (
          <section className="flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedMapId(null)
                  setSelectedSide(null)
                  setSelectedSite(null)
                  setSelectedTags(new Set())
                  setActivePost(null)
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <p className="text-sm text-muted-foreground">
                Selecciona las categorias que quieras filtrar.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-border">
              <img
                src={selectedMap.url}
                alt={selectedMap.label}
                className="h-32 w-full object-cover sm:h-40"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center text-3xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  {selectedMap.label}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Side
                </span>
                <div className="inline-flex overflow-hidden rounded-full border border-border bg-muted/40">
                  {sideOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setSelectedSide((current) =>
                          current === option ? null : option
                        )
                      }
                      className={`px-4 py-2 text-sm font-semibold transition ${
                        selectedSide === option
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Site
                </span>
                <div className="inline-flex overflow-hidden rounded-full border border-border bg-muted/40">
                  {siteOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setSelectedSite((current) =>
                          current === option ? null : option
                        )
                      }
                      className={`px-4 py-2 text-sm font-semibold transition ${
                        selectedSite === option
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              {tags.map((tag) => {
                const isSelected = selectedTags.has(tag)
                return (
                  <Button
                    key={tag}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                )
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-8 text-sm text-muted-foreground">
                  No hay posts para este mapa con esos filtros.
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const previewImage = resolvePostImage(post.images[0])
                  return (
                    <button
                      key={post.id}
                      type="button"
                      className="group overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      onClick={() => setActivePost(post)}
                    >
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={post.title}
                          className="h-44 w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-44 items-center justify-center bg-muted text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                      <div className="space-y-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {post.title}
                          </p>
                          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {post.method.join(' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <span
                              key={`${post.id}-${tag}`}
                              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {maps.map((map) => (
              <button
                key={map.id}
                type="button"
                className="group relative overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                onClick={() => setSelectedMapId(map.id)}
              >
                <img
                  src={map.url}
                  alt={map.label}
                  className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/70 transition-opacity group-hover:opacity-95" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-center text-3xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-transform group-hover:scale-110">
                    {map.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {activePost ? (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={() => setActivePost(null)}
        >
          <div 
            className="relative w-full max-w-4xl rounded-2xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {selectedMap?.label}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {activePost.title}
                  </h2>
                  <span className="rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    {activePost.method.join(' ')}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePost(null)}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              {activePost.images.slice(0, 2).map((image, index) => {
                const imageUrl = resolvePostImage(image)
                return (
                  <button
                    type="button"
                    key={`${activePost.id}-${image}-${index}`}
                    className="overflow-hidden rounded-xl border border-border bg-muted transition hover:opacity-90"
                    onClick={() => imageUrl && setViewerImage(imageUrl)}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`${activePost.title} ${index + 1}`}
                        className="h-64 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
              {activePost.tags.map((tag) => (
                <span
                  key={`${activePost.id}-modal-${tag}`}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {viewerImage ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-8"
          onClick={closeViewer}
        >
          <div
            className="relative h-full max-h-[80vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-2xl"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewerImage}
              alt="Viewer"
              className="absolute left-1/2 top-1/2 max-h-none max-w-none select-none"
              style={{
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
                transition: isDragging ? 'none' : 'transform 0.1s',
              }}
              draggable={false}
              onDoubleClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 bg-black/50 text-white hover:bg-black/70 hover:text-white"
              onClick={closeViewer}
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <span className="text-white/50">|</span>
              <span className="text-xs text-white/70">
                Rueda: zoom · Arrastrar: mover
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
