import { ArrowLeft, X } from 'lucide-react'
import JSZip from 'jszip'
import { nanoid } from 'nanoid'
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
const methodComponents = ['THROW', 'DOUBLE', 'JUMP', 'CROUCH', 'WALK', 'RUN']
const methodOrder = ['CROUCH', 'JUMP', 'THROW', 'DOUBLE', 'WALK', 'RUN']
const MAX_IMAGES = 4
const OPTIMIZED_MAX_DIMENSION = 1920
const OPTIMIZED_QUALITY = 0.9
const OPTIMIZED_MIME = 'image/webp'
const sanitizeTitle = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9 ]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 24)

const getFileExtension = (name: string) => name.match(/\.[^/.]+$/)?.[0] ?? ''

const getExtensionFromMime = (mime: string) =>
  mime.includes('/') ? `.${mime.split('/')[1]}` : ''

const buildImageName = (index: number, extension: string) =>
  `image_${index + 1}${extension}`

const loadImageFromBlob = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    image.src = url
  })

const getScaledDimensions = (
  width: number,
  height: number,
  maxDimension: number
) => {
  const maxSide = Math.max(width, height)
  if (maxSide <= maxDimension) {
    return { width, height }
  }
  const scale = maxDimension / maxSide
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

const optimizeImageBlob = async (blob: Blob) => {
  const image = await loadImageFromBlob(blob)
  const { width, height } = getScaledDimensions(
    image.naturalWidth,
    image.naturalHeight,
    OPTIMIZED_MAX_DIMENSION
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return blob
  context.drawImage(image, 0, 0, width, height)

  const optimized = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OPTIMIZED_MIME, OPTIMIZED_QUALITY)
  })

  return optimized ?? blob
}

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
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportTitle, setExportTitle] = useState('')
  const [exportMapId, setExportMapId] = useState(() => maps[0]?.id ?? '')
  const [exportMethod, setExportMethod] = useState<Set<string>>(new Set())
  const [exportSide, setExportSide] = useState<string | null>(null)
  const [exportSite, setExportSite] = useState<string | null>(null)
  const [exportUtils, setExportUtils] = useState<string | null>(null)
  const [exportImages, setExportImages] = useState<File[]>([])
  const [exportError, setExportError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editPostImages, setEditPostImages] = useState<File[]>([])
  const [editError, setEditError] = useState<string | null>(null)
  const [isEditExporting, setIsEditExporting] = useState(false)

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

  const toggleExportSet = (
    value: string,
    setter: Dispatch<SetStateAction<Set<string>>>
  ) => {
    setter((current) => {
      const next = new Set(current)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }

  const resetExportForm = () => {
    setExportTitle('')
    setExportMapId(maps[0]?.id ?? '')
    setExportMethod(new Set())
    setExportSide(null)
    setExportSite(null)
    setExportUtils(null)
    setExportImages([])
    setExportError(null)
  }

  const closeExportModal = () => {
    setIsExportOpen(false)
    resetExportForm()
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

  const generatePostId = (mapId: string): string => `${mapId}-${nanoid(8)}`

  const sortMethods = (methods: string[]) =>
    [...methods].sort(
      (a, b) => methodOrder.indexOf(a) - methodOrder.indexOf(b)
    )

  const handleExportFiles = (files: FileList | null) => {
    if (!files) return
    const nextFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    )

    if (nextFiles.length === 0) {
      setExportError('Solo se permiten imagenes.')
      return
    }

    setExportError(null)

    setExportImages((current) => {
      const combined = [...current, ...nextFiles]
      if (combined.length > MAX_IMAGES) {
        setExportError(`Maximo ${MAX_IMAGES} imagenes.`)
        return combined.slice(0, MAX_IMAGES)
      }
      return combined
    })
  }

  const handleExport = async () => {
    setExportError(null)

    if (!exportTitle.trim()) {
      setExportError('Debes ingresar un titulo.')
      return
    }

    if (!exportMapId) {
      setExportError('Debes seleccionar un mapa.')
      return
    }

    if (exportMethod.size === 0) {
      setExportError('Debes seleccionar al menos un componente de metodo.')
      return
    }

    const exportTags = [exportSide, exportSite, exportUtils].filter(
      (tag): tag is string => Boolean(tag)
    )

    if (exportTags.length === 0) {
      setExportError('Debes seleccionar al menos un tag.')
      return
    }

    if (exportImages.length === 0) {
      setExportError('Debes subir al menos una imagen.')
      return
    }

    if (exportImages.length > MAX_IMAGES) {
      setExportError(`Maximo ${MAX_IMAGES} imagenes.`)
      return
    }

    setIsExporting(true)

    try {
      const zip = new JSZip()
      const postId = generatePostId(exportMapId)
      const optimizedImages = await Promise.all(
        exportImages.map(async (file, index) => {
          const optimizedBlob = await optimizeImageBlob(file)
          const extension =
            getExtensionFromMime(optimizedBlob.type || file.type) ||
            getFileExtension(file.name) ||
            '.webp'
          return {
            name: buildImageName(index, extension),
            blob: optimizedBlob,
          }
        })
      )
      const jsonData = {
        id: postId,
        mapId: exportMapId,
        title: exportTitle.trim(),
        tags: exportTags,
        method: sortMethods(Array.from(exportMethod)),
        imageCount: optimizedImages.length,
        images: optimizedImages.map((image) => image.name),
      }

      zip.file('post.json', JSON.stringify(jsonData, null, 2))

      const imagesFolder = zip.folder('images')
      optimizedImages.forEach((image) => {
        imagesFolder?.file(image.name, image.blob)
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      const slug = exportTitle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const downloadName = slug ? `cs2-post-${slug}.zip` : 'cs2-post.zip'

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloadName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      setIsExportOpen(false)
      resetExportForm()
    } catch (error) {
      console.error(error)
      setExportError('No se pudo generar el archivo. Intentalo de nuevo.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleEditFiles = (files: FileList | null) => {
    if (!files) return
    const nextFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    )

    if (nextFiles.length === 0) {
      setEditError('Solo se permiten imagenes.')
      return
    }

    setEditError(null)

    const maxAllowed = MAX_IMAGES - (activePost?.images.length ?? 0)
    const filesToAdd = nextFiles.slice(0, Math.max(0, maxAllowed))

    if (filesToAdd.length === 0) {
      setEditError(
        `Ya tienes ${activePost?.images.length} imagenes. Maximo ${MAX_IMAGES} en total.`
      )
      return
    }

    setEditPostImages((current) => {
      const combined = [...current, ...filesToAdd]
      if (combined.length > maxAllowed) {
        setEditError(
          `Puedes agregar hasta ${maxAllowed} imagenes mas (maximo ${MAX_IMAGES} en total).`
        )
        return combined.slice(0, maxAllowed)
      }
      return combined
    })
  }

  const handleEditExport = async () => {
    setEditError(null)

    if (!activePost) {
      setEditError('No hay post cargado.')
      return
    }

    const currentImageCount = activePost.images.length + editPostImages.length
    if (currentImageCount === 0) {
      setEditError('Debes tener al menos una imagen.')
      return
    }

    setIsEditExporting(true)

    try {
      const zip = new JSZip()
      const existingImages = await Promise.all(
        activePost.images.map(async (imagePath, index) => {
          const imageUrl = resolvePostImage(imagePath)
          if (!imageUrl) return null
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          const optimizedBlob = await optimizeImageBlob(blob)
          const extension =
            getExtensionFromMime(optimizedBlob.type || blob.type) ||
            getFileExtension(imagePath) ||
            '.webp'
          return {
            index,
            name: buildImageName(index, extension),
            blob: optimizedBlob,
          }
        })
      )
      const newImages = await Promise.all(
        editPostImages.map(async (file, index) => {
          const imageIndex = activePost.images.length + index
          const optimizedBlob = await optimizeImageBlob(file)
          const extension =
            getExtensionFromMime(optimizedBlob.type || file.type) ||
            getFileExtension(file.name) ||
            '.webp'
          return {
            index: imageIndex,
            name: buildImageName(imageIndex, extension),
            blob: optimizedBlob,
          }
        })
      )
      const optimizedImages = [...existingImages, ...newImages]
        .filter((image): image is NonNullable<typeof image> => Boolean(image))
        .sort((a, b) => a.index - b.index)

      const jsonData = {
        id: activePost.id,
        mapId: activePost.mapId,
        title: activePost.title,
        tags: activePost.tags,
        method: sortMethods(activePost.method),
        imageCount: optimizedImages.length,
        images: optimizedImages.map((image) => image.name),
      }

      zip.file('post.json', JSON.stringify(jsonData, null, 2))

      const imagesFolder = zip.folder('images')

      optimizedImages.forEach((image) => {
        imagesFolder?.file(image.name, image.blob)
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      const slug = activePost.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const downloadName = slug ? `cs2-post-${slug}.zip` : 'cs2-post.zip'

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloadName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      setActivePost(null)
      setIsEditMode(false)
      setEditPostImages([])
    } catch (error) {
      console.error(error)
      setEditError('No se pudo generar el archivo. Intentalo de nuevo.')
    } finally {
      setIsEditExporting(false)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    setZoom((prev) => Math.min(Math.max(0.6, prev + delta), 5))
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
    setZoom(0.85)
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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportOpen(true)}
            >
              Crear Post
            </Button>
            <ThemeSwitch
              isDark={isDark}
              onToggle={() => setIsDark((current) => !current)}
            />
          </div>
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
                            {sortMethods(post.method).join(' ')}
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
                    {sortMethods(activePost.method).join(' ')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActivePost(null)}
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div
              className={`grid gap-4 px-6 py-6 ${
                Math.min(activePost.images.length, MAX_IMAGES) === 1
                  ? 'md:grid-cols-1'
                  : Math.min(activePost.images.length, MAX_IMAGES) === 2
                    ? 'md:grid-cols-2'
                    : Math.min(activePost.images.length, MAX_IMAGES) === 4
                      ? 'md:grid-cols-2 lg:grid-cols-2'
                      : 'md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {activePost.images.slice(0, MAX_IMAGES).map((image, index) => {
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
      {isEditMode && activePost ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={() => setIsEditMode(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-border bg-background shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Editar
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {activePost.title}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditMode(false)}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Imagenes actuales
                  </label>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {activePost.images.length}/{MAX_IMAGES}
                  </span>
                </div>
                <div className="space-y-2">
                  {activePost.images.map((image, index) => (
                    <div
                      key={`current-${image}-${index}`}
                      className="rounded-md border border-border px-3 py-2 text-sm text-foreground"
                    >
                      {index + 1}. {image}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Agregar imagenes
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {editPostImages.length}/{Math.max(
                      0,
                      MAX_IMAGES - activePost.images.length
                    )}
                  </label>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  multiple
                  onChange={(event) => {
                    handleEditFiles(event.target.files)
                    event.currentTarget.value = ''
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={activePost.images.length >= MAX_IMAGES}
                />
                <div className="space-y-2">
                  {editPostImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {activePost.images.length >= MAX_IMAGES
                        ? 'Ya tienes el maximo de imagenes.'
                        : `Sube hasta ${MAX_IMAGES - activePost.images.length} imagenes mas.`}
                    </p>
                  ) : (
                    editPostImages.map((file, index) => (
                      <div
                        key={`new-${file.name}-${index}`}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <span className="text-sm text-foreground">
                          {activePost.images.length + index + 1}. {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditPostImages((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index)
                            )
                          }
                          className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive"
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {editError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {editError}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditMode(false)
                  setEditPostImages([])
                  setEditError(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditExport}
                disabled={isEditExporting || editPostImages.length === 0}
              >
                {isEditExporting ? 'Generando...' : 'Descargar actualizado'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {isExportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={closeExportModal}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-border bg-background shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Crear post
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  Nuevo post
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeExportModal}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Titulo
                </label>
                <input
                  type="text"
                  value={exportTitle}
                  onChange={(event) =>
                    setExportTitle(sanitizeTitle(event.target.value))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ej: Smoke A Site"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Mapa
                  </label>
                  <Select value={exportMapId} onValueChange={setExportMapId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un mapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {maps.map((map) => (
                        <SelectItem key={map.id} value={map.id}>
                          {map.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Metodo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {methodComponents.map((method) => {
                      const isSelected = exportMethod.has(method)
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => toggleExportSet(method, setExportMethod)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {method}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Side
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sideOptions.map((option) => {
                      const isSelected = exportSide === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setExportSide((current) =>
                              current === option ? null : option
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Site
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {siteOptions.map((option) => {
                      const isSelected = exportSite === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setExportSite((current) =>
                              current === option ? null : option
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Utilidades
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((option) => {
                      const isSelected = exportUtils === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setExportUtils((current) =>
                              current === option ? null : option
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Imagenes (max 4)
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {exportImages.length}/{MAX_IMAGES}
                  </label>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  multiple
                  onChange={(event) => {
                    handleExportFiles(event.target.files)
                    event.currentTarget.value = ''
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="space-y-2">
                  {exportImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sube hasta 4 imagenes en orden.
                    </p>
                  ) : (
                    exportImages.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <span className="text-sm text-foreground">
                          {index + 1}. {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExportImages((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index)
                            )
                          }
                          className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive"
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {exportError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {exportError}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={closeExportModal}>
                Cancelar
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? 'Generando...' : 'Descargar post'}
              </Button>
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
                setZoom(0.85)
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
