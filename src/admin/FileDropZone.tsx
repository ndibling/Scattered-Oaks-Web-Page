import { useRef, useState } from 'preact/hooks';

type Props = {
  accept: string;
  onFileSelected: (file: File) => void;
  label?: string;
};

// [ADDED] 2026-07-22 (M6) — no upload UI precedent exists anywhere in this
// repo; built from scratch. Used by AnimalEditor, GalleryEditor, and
// ContentEditor's image fields.
export default function FileDropZone({ accept, onFileSelected, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      class={`file-drop-zone${dragging ? ' file-drop-zone-dragging' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer?.files ?? null);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        class="file-drop-zone-input"
        onChange={(e) => handleFiles((e.target as HTMLInputElement).files)}
      />
      <span>{label ?? 'Click or drag a file here to upload'}</span>

      <style>{`
        .file-drop-zone {
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-input);
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: var(--color-text-muted);
          cursor: pointer;
        }
        .file-drop-zone:hover,
        .file-drop-zone-dragging {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        .file-drop-zone-input {
          display: none;
        }
      `}</style>
    </div>
  );
}
