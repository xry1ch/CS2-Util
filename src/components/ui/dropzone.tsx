import * as React from "react"
import { cn } from "@/lib/utils"

interface DropzoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop'> {
  onDrop?: (files: File[]) => void
  onDragEnter?: () => void
  onDragLeave?: () => void
  accept?: string
  disabled?: boolean
}

const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
  ({ className, onDrop, onDragEnter, onDragLeave, accept, disabled, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragging(true)
        onDragEnter?.()
      }
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      onDragLeave?.()
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const acceptedFiles = accept
        ? files.filter((file) => {
            const mimeTypes = accept.split(',').map((type) => type.trim())
            return mimeTypes.some((mimeType) => {
              if (mimeType.endsWith('/*')) {
                const [type] = mimeType.split('/')
                return file.type.startsWith(type)
              }
              return file.type === mimeType
            })
          })
        : files

      if (acceptedFiles.length > 0) {
        onDrop?.(acceptedFiles)
      }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files
      if (files) {
        const fileArray = Array.from(files)
        onDrop?.(fileArray)
        e.currentTarget.value = ''
      }
    }

    const handleClick = () => {
      if (!disabled) {
        inputRef.current?.click()
      }
    }

    return (
      <div
        ref={ref}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative rounded-lg border-2 border-dashed border-border bg-background p-8 text-center transition cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
    )
  }
)
Dropzone.displayName = "Dropzone"

export { Dropzone }
