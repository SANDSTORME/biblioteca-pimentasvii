import React, { useRef, useState } from 'react';
import { Loader2, Paperclip, RefreshCcw, UploadCloud } from 'lucide-react';
import { UploadedAsset } from '@/services/api';
import { cn } from '@/lib/utils';

interface FileUploadFieldProps {
  label: string;
  description: string;
  accept: string;
  asset?: UploadedAsset | null;
  preview?: React.ReactNode;
  onUpload: (file: File) => Promise<UploadedAsset>;
  className?: string;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  description,
  accept,
  asset,
  preview,
  onUpload,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await onUpload(file);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className={cn('rounded-[1.5rem] border border-border/70 bg-card/70 p-4 shadow-sm', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {asset ? 'Trocar arquivo' : 'Enviar arquivo'}
          </button>
          {asset && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm font-medium text-foreground"
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
          )}
        </div>
      </div>

      {(asset || preview) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Arquivo atual</p>
            {asset ? (
              <>
                <p className="mt-3 text-sm font-semibold text-foreground">{asset.arquivoNome}</p>
                <p className="mt-1 text-xs text-muted-foreground">{asset.arquivoMime}</p>
                <p className="mt-3 break-all text-xs text-muted-foreground">{asset.caminhoPublico}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p>
            )}
          </div>
          {preview}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default FileUploadField;
