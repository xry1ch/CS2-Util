import { useState, useEffect } from 'react'
import type { MapPost } from '@/data/posts'

interface PostCardProps {
  post: MapPost
  resolveImage: (path: string) => string | undefined
  onClick: () => void
  methodLabel: string
  imageRotationDelay?: number
  imageChangeInterval?: number
}

export function PostCard({
  post,
  resolveImage,
  onClick,
  methodLabel,
  imageRotationDelay = 50,
  imageChangeInterval = 800,
}: PostCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [hasStartedRotation, setHasStartedRotation] = useState(false)

  useEffect(() => {
    let rotationTimeoutId: NodeJS.Timeout | null = null
    let rotationIntervalId: NodeJS.Timeout | null = null

    if (isHovering) {
      // Start rotation after delay
      rotationTimeoutId = setTimeout(() => {
        setHasStartedRotation(true)
      }, imageRotationDelay)
    } else {
      // Reset when not hovering
      setCurrentImageIndex(0)
      setHasStartedRotation(false)
    }

    return () => {
      if (rotationTimeoutId) clearTimeout(rotationTimeoutId)
      if (rotationIntervalId) clearInterval(rotationIntervalId)
    }
  }, [isHovering, imageRotationDelay])

  // Handle image rotation when hovering and started
  useEffect(() => {
    if (!hasStartedRotation) return

    const rotationIntervalId = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % post.images.length)
    }, imageChangeInterval)

    return () => clearInterval(rotationIntervalId)
  }, [hasStartedRotation, post.images.length, imageChangeInterval])

  const displayImagePath = post.images[currentImageIndex]
  const displayImage = displayImagePath ? resolveImage(displayImagePath) : undefined

  const previewImage = resolveImage(post.images[0])

  return (
    <button
      type="button"
      className="group overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {displayImage || previewImage ? (
        <div className="relative overflow-hidden">
          <img
            src={displayImage || previewImage}
            alt={post.title}
            className="h-44 w-full object-cover transition-opacity duration-200"
            loading="lazy"
            key={displayImage}
          />
          {isHovering && post.images.length > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-1 opacity-70 group-hover:opacity-100">
              {post.images.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 w-1 rounded-full transition-all ${
                    index === currentImageIndex ? 'bg-white w-2' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
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
            {methodLabel}
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
}
