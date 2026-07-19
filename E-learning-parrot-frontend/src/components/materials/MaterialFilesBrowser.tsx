import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Download,
  Eye,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  LayoutList,
  Loader2,
  Music,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import type { LearnerCourseMaterial } from "@/api/axios";
import {
  buildMaterialPreviewItem,
  categoryLabel,
  formatMaterialBytes,
  getMaterialStreamUrl,
  materialFileCategory,
  type MaterialFileCategory,
} from "@/lib/materialFileUtils";
import { MaterialPreviewDialog, type MaterialPreviewItem } from "@/components/materials/MaterialPreviewDialog";
import { cn } from "@/lib/utils";

type Props = {
  courseId: number;
  materials: LearnerCourseMaterial[];
  loading?: boolean;
  onDelete: (material: LearnerCourseMaterial) => Promise<void>;
  deletingId?: number | null;
  readOnly?: boolean;
  studentId?: number;
};

const FILTERS: Array<{ key: "all" | MaterialFileCategory; label: string; icon?: typeof FileText }> = [
  { key: "all", label: "All" },
  { key: "documents", label: "Docs", icon: FileText },
  { key: "images", label: "Images", icon: ImageIcon },
  { key: "audio", label: "Audio", icon: Music },
  { key: "videos", label: "Video", icon: Video },
];

const categoryIcon = (category: MaterialFileCategory) => {
  if (category === "images") return ImageIcon;
  if (category === "videos") return Video;
  if (category === "audio") return Music;
  return FileText;
};

function MaterialSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border overflow-hidden bg-white animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="aspect-video bg-gradient-to-br from-[#0A0A0A]/10 to-[#FCC400]/10" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded-md w-3/4" />
            <div className="h-3 bg-muted rounded-md w-1/2" />
            <div className="flex gap-2">
              <div className="h-8 bg-muted rounded-md flex-1" />
              <div className="h-8 w-8 bg-muted rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MaterialFilesBrowser({ courseId, materials, loading, onDelete, deletingId, readOnly, studentId }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | MaterialFileCategory>("all");
  const [preview, setPreview] = useState<MaterialPreviewItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      const name = (m.filename ?? m.title).toLowerCase();
      const category = materialFileCategory(m);
      if (filter !== "all" && category !== filter) return false;
      if (!q) return true;
      return name.includes(q) || (m.description ?? "").toLowerCase().includes(q);
    });
  }, [materials, search, filter]);

  const counts = useMemo(() => {
    const tally = { all: materials.length, documents: 0, images: 0, audio: 0, videos: 0 };
    materials.forEach((m) => {
      const c = materialFileCategory(m);
      tally[c]++;
    });
    return tally;
  }, [materials]);

  const resolveCourseId = (material: LearnerCourseMaterial) => material.course_id ?? courseId;

  const openPreview = (material: LearnerCourseMaterial) => {
    const item = buildMaterialPreviewItem(material, resolveCourseId(material), studentId);
    if (!item) return;
    setPreview(item);
    setPreviewOpen(true);
  };

  const thumbUrl = (material: LearnerCourseMaterial) => {
    if (material.storage !== "pcloud" || !material.id) return null;
    const category = materialFileCategory(material);
    if (category === "images" || category === "documents" || category === "videos") {
      return getMaterialStreamUrl(resolveCourseId(material), material.id, "thumb", studentId);
    }
    return null;
  };

  const showSkeleton = loading && materials.length === 0;
  const showEmpty = !loading && filtered.length === 0;
  const showGrid = !showSkeleton && filtered.length > 0 && view === "grid";
  const showList = !showSkeleton && filtered.length > 0 && view === "list";

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar � filters stay on one row */}
        <div className="rounded-xl border border-[#0A0A0A]/15 bg-gradient-to-r from-[#0A0A0A]/[0.06] via-white to-[#FCC400]/[0.08] p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search materials..."
                className="pl-9 h-9 bg-white/90 border-[#0A0A0A]/20 focus-visible:ring-[#0A0A0A]/30"
              />
            </div>

            <div className="flex items-center gap-1 flex-nowrap overflow-x-auto max-w-full pb-0.5">
              {FILTERS.map(({ key, label, icon: Icon }) => {
                const active = filter === key;
                const count = counts[key];
                return (
                  <Button
                    key={key}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "h-8 shrink-0 px-2.5 text-xs font-medium transition-all",
                      active
                        ? "bg-[#0A0A0A] hover:bg-[#0070D0] shadow-sm"
                        : "bg-white/80 hover:bg-white border-[#0A0A0A]/15"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 mr-1" />}
                    {label}
                    {count > 0 && (
                      <span
                        className={cn(
                          "ml-1.5 rounded-full px-1.5 py-0 text-[10px] font-semibold",
                          active ? "bg-white/20 text-white" : "bg-[#0A0A0A]/10 text-[#0A0A0A]"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              {loading && materials.length > 0 && (
                <Loader2 className="h-4 w-4 animate-spin text-[#0A0A0A]" aria-label="Refreshing" />
              )}
              <Badge variant="outline" className="border-[#0A0A0A]/25 bg-white/80">
                {filtered.length} file{filtered.length !== 1 ? "s" : ""}
              </Badge>
              <Button
                size="icon"
                variant={view === "grid" ? "default" : "outline"}
                className={cn("h-8 w-8", view === "grid" && "bg-[#0A0A0A] hover:bg-[#0070D0]")}
                onClick={() => setView("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={view === "list" ? "default" : "outline"}
                className={cn("h-8 w-8", view === "list" && "bg-[#0A0A0A] hover:bg-[#0070D0]")}
                onClick={() => setView("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {showSkeleton && <MaterialSkeletonGrid />}

        {showEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center text-muted-foreground rounded-2xl border border-dashed border-[#0A0A0A]/20 bg-gradient-to-br from-white to-[#0A0A0A]/5"
          >
            <FileText className="h-12 w-12 mx-auto mb-3 text-[#0A0A0A]/40" />
            <p className="font-medium text-foreground">No materials yet</p>
            <p className="text-sm mt-1">Upload files above � they are stored on pCloud for this course.</p>
          </motion.div>
        )}

        {showGrid && (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((material, index) => {
                const category = materialFileCategory(material);
                const Icon = categoryIcon(category);
                const thumb = thumbUrl(material);
                const download =
                  material.storage === "pcloud" && material.id
                    ? getMaterialStreamUrl(resolveCourseId(material), material.id, "download", studentId)
                    : material.resource_url ?? undefined;

                return (
                  <motion.div
                    key={material.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                    className="group rounded-2xl border border-[#0A0A0A]/10 bg-gradient-to-br from-white to-[#0A0A0A]/[0.03] overflow-hidden hover:shadow-lg hover:border-[#0A0A0A]/35 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <button
                      type="button"
                      className="relative w-full aspect-video bg-gradient-to-br from-[#0A0A0A]/8 to-[#FCC400]/10 flex items-center justify-center overflow-hidden"
                      onClick={() => openPreview(material)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                          <Icon className="h-10 w-10 text-[#0A0A0A]/60" />
                        </div>
                      </div>
                      {thumb && (
                        <img
                          src={thumb}
                          alt={material.title}
                          className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-white"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-[#0A0A0A]/0 group-hover:bg-[#0A0A0A]/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Eye className="h-8 w-8 text-white drop-shadow-md" />
                      </div>
                    </button>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-sm">{material.filename ?? material.title}</p>
                          {material.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{material.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px] border-[#FCC400]/40">
                          {categoryLabel(category)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatMaterialBytes(material.file_size)}</p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 bg-[#0A0A0A]/10 hover:bg-[#0A0A0A]/15 text-[#0A0A0A]"
                          onClick={() => openPreview(material)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Preview
                        </Button>
                        {download && (
                          <Button size="sm" variant="outline" asChild className="border-[#0A0A0A]/20">
                            <a href={download} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        {!readOnly && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200"
                            disabled={deletingId === material.id}
                            onClick={() => onDelete(material)}
                          >
                            {deletingId === material.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {showList && (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0A0A0A]/5 hover:bg-[#0A0A0A]/5">
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((material) => {
                  const category = materialFileCategory(material);
                  const Icon = categoryIcon(category);
                  const download =
                    material.storage === "pcloud" && material.id
                      ? getMaterialStreamUrl(resolveCourseId(material), material.id, "download", studentId)
                      : material.resource_url ?? undefined;

                  return (
                    <TableRow key={material.id} className="hover:bg-[#0A0A0A]/[0.03]">
                      <TableCell>
                        <Badge variant="outline">{categoryLabel(category)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 shrink-0 text-[#0A0A0A]" />
                          <span className="truncate font-medium">{material.filename ?? material.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatMaterialBytes(material.file_size)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openPreview(material)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {download && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={download} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          {!readOnly && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              disabled={deletingId === material.id}
                              onClick={() => onDelete(material)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <MaterialPreviewDialog item={preview} open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}
