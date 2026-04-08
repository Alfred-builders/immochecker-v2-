import { useState } from 'react';
import { Plus, Package, Archive, ArchiveRestore, Search } from 'lucide-react';
import { toast } from 'sonner';

import { AnimatedPage } from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import {
  useTypePieces, useCreateTypePiece, useArchiveTypePiece,
  useCatalogueItems, useCreateCatalogueItem, useArchiveCatalogueItem,
} from './api';
import {
  CATEGORIE_PIECE_LABELS, CATEGORIE_ITEM_LABELS,
  type TypePiece, type CatalogueItem, type TypePieceCategorie,
} from './types';

function TypePieceRow({ piece }) {
  const archive = useArchiveTypePiece(piece.id);
  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{piece.nom}</p>
        {piece.categorie_piece && (
          <p className="text-xs text-muted-foreground">{CATEGORIE_PIECE_LABELS[piece.categorie_piece]}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {piece.is_plateforme && <Badge variant="secondary" className="text-xs">Plateforme</Badge>}
        {!piece.is_plateforme && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
            onClick={async () => { await archive.mutateAsync(!piece.est_archive); toast.success(piece.est_archive ? 'Restauré' : 'Archivé'); }}
            disabled={archive.isPending}>
            {piece.est_archive ? <><ArchiveRestore className="h-3.5 w-3.5" /> Restaurer</> : <><Archive className="h-3.5 w-3.5" /> Archiver</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function TypePieceTab() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('');
  const { data: pieces = [], isLoading } = useTypePieces({ search });
  const createPiece = useCreateTypePiece();
  async function handleCreate() {
    if (!nom.trim()) return toast.error('Nom requis');
    await createPiece.mutateAsync({ nom, categorie_piece: categorie || undefined });
    toast.success('Type de pièce créé'); setNom(''); setCategorie(''); setCreateOpen(false);
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nouveau type
        </Button>
      </div>
      <div className="space-y-2">
        {pieces.map((p) => <TypePieceRow key={p.id} piece={p} />)}
        {!isLoading && pieces.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">Aucun type de pièce</p>}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nouveau type de pièce</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Nom *</label>
              <Input placeholder="Cuisine, Chambre, SDB..." value={nom} onChange={(e) => setNom(e.target.value)} className="mt-1" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
            <div><label className="text-sm font-medium">Catégorie</label>
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORIE_PIECE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={createPiece.isPending}>{createPiece.isPending ? 'Création...' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatalogueItemsTab() {
  const [search, setSearch] = useState('');
  const [contexte, setContexte] = useState('edl');
  const [createOpen, setCreateOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('');
  const { data: items = [], isLoading } = useCatalogueItems({ search, contexte });
  const createItem = useCreateCatalogueItem();
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.categorie]) acc[item.categorie] = [];
    acc[item.categorie].push(item);
    return acc;
  }, {});
  async function handleCreate() {
    if (!nom.trim() || !categorie) return toast.error('Nom et catégorie requis');
    await createItem.mutateAsync({ nom, categorie, contexte });
    toast.success('Item créé'); setNom(''); setCategorie(''); setCreateOpen(false);
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un item..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={contexte} onValueChange={setContexte}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="edl">EDL</SelectItem>
              <SelectItem value="inventaire">Inventaire</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvel item
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {CATEGORIE_ITEM_LABELS[cat] ?? cat} ({catItems.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {catItems.map((item) => (
                <div key={item.id} className="flex flex-col rounded-md border p-3 gap-2">
                  <p className="text-sm font-medium truncate">{item.nom}</p>
                  {item.is_plateforme && <Badge variant="secondary" className="text-[10px] w-fit">Plateforme</Badge>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!isLoading && Object.keys(grouped).length === 0 && <p className="text-sm text-center text-muted-foreground py-8">Aucun item dans le catalogue</p>}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nouvel item catalogue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Nom *</label>
              <Input placeholder="Robinet, Carrelage..." value={nom} onChange={(e) => setNom(e.target.value)} className="mt-1" />
            </div>
            <div><label className="text-sm font-medium">Catégorie *</label>
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORIE_ITEM_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={createItem.isPending}>{createItem.isPending ? 'Création...' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TemplatesPage() {
  return (
    <AnimatedPage className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gérez les types de pièces et le catalogue d'items pour les EDL et inventaires.</p>
      </div>
      <Tabs defaultValue="pieces">
        <TabsList>
          <TabsTrigger value="pieces">Types de pièces</TabsTrigger>
          <TabsTrigger value="items">Catalogue items</TabsTrigger>
        </TabsList>
        <TabsContent value="pieces" className="mt-4"><TypePieceTab /></TabsContent>
        <TabsContent value="items" className="mt-4"><CatalogueItemsTab /></TabsContent>
      </Tabs>
    </AnimatedPage>
  );
}
