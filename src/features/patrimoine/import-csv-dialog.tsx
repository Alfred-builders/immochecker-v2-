import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useImportCSV } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedPreview {
  headers: string[];
  rows: string[][];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCSVPreview(text: string): ParsedPreview {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines
    .slice(1, 6) // first 5 data rows
    .map((line) => line.split(separator).map((c) => c.trim().replace(/^"|"$/g, '')));

  return { headers, rows };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  }),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCSVDialog({ open, onOpenChange }: ImportCSVDialogProps) {
  const importCSV = useImportCSV();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setDirection(1);
    setFile(null);
    setPreview(null);
    setResult(null);
    importCSV.reset();
  }, [importCSV]);

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function handleFile(f: File) {
    setFile(f);
    const text = await f.text();
    setPreview(parseCSVPreview(text));
    setDirection(1);
    setStep(2);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) {
      handleFile(f);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    try {
      const res = await importCSV.mutateAsync(file);
      setResult(res);
      setDirection(1);
      setStep(3);
    } catch {
      // Error handled by mutation state
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importer un fichier CSV</DialogTitle>
          <DialogDescription>
            Importez vos batiments et lots depuis un fichier CSV.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-[#2563EB]'
                  : s < step
                    ? 'w-4 bg-[#2563EB]/40'
                    : 'w-4 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="relative min-h-[240px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* --- Step 1: File selection --- */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
                    dragOver
                      ? 'border-[#2563EB] bg-blue-50'
                      : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                  }`}
                >
                  <Upload
                    className={`h-10 w-10 ${
                      dragOver ? 'text-[#2563EB]' : 'text-muted-foreground/40'
                    }`}
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Glissez votre fichier CSV ici
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ou cliquez pour parcourir
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              </motion.div>
            )}

            {/* --- Step 2: Preview --- */}
            {step === 2 && preview && file && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                {/* File info */}
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <FileText className="h-8 w-8 text-[#2563EB]" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setDirection(-1);
                      setStep(1);
                      setFile(null);
                      setPreview(null);
                    }}
                  >
                    Changer
                  </Button>
                </div>

                {/* Preview table */}
                <div className="rounded-lg border overflow-auto max-h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.map((h, i) => (
                          <TableHead
                            key={i}
                            className="whitespace-nowrap text-xs"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row, ri) => (
                        <TableRow key={ri}>
                          {row.map((cell, ci) => (
                            <TableCell
                              key={ci}
                              className="whitespace-nowrap text-xs"
                            >
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Apercu des 5 premieres lignes
                </p>
              </motion.div>
            )}

            {/* --- Step 3: Results --- */}
            {step === 3 && result && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center gap-4 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                </motion.div>

                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {result.imported} lignes importees
                  </p>
                  {result.errors.length > 0 && (
                    <p className="mt-1 text-sm text-amber-600">
                      {result.errors.length} erreur
                      {result.errors.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="w-full max-h-[120px] overflow-auto rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-amber-800"
                      >
                        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          {step === 2 && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setDirection(-1);
                  setStep(1);
                  setFile(null);
                  setPreview(null);
                }}
              >
                Retour
              </Button>
              <Button onClick={handleImport} disabled={importCSV.isPending}>
                {importCSV.isPending ? 'Importation...' : 'Importer'}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={() => handleClose(false)}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
