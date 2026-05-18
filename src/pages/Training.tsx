import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { useTrainingStore } from "../store/useTrainingStore";
import { useExerciseStore } from "../store/useExerciseStore";
import { useDrillStore } from "../store/useDrillStore";
import { deleteDrill } from "../utils/drillStorage";
import { usePlayerStore } from "../store/usePlayerStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Input, Textarea, Select } from "../components/ui/Input";
import { format } from "date-fns";
import type { TrainingSession, Exercise, ExerciseCategory, Drill } from "../types";

type ViewMode = "library" | "sessions";

const EXERCISE_TAGS = [
  "1v1",
  "2v2",
  "3v3",
  "4v4",
  "5v5",
  "puolustaminen",
  "hyökkääminen",
  "syöttäminen",
  "laukaus",
  "maalivahti",
  "koordinaatio",
  "nopeus",
  "kondis",
  "yhteistyö",
];

const CAT_LABELS: Record<ExerciseCategory, string> = {
  warmup: "Lämmittely",
  technical: "Tekninen",
  tactical: "Taktinen",
  physical: "Fyysinen",
  game: "Peli",
};

const CAT_COLORS: Record<
  ExerciseCategory,
  "yellow" | "blue" | "purple" | "red" | "green"
> = {
  warmup: "yellow",
  technical: "blue",
  tactical: "purple",
  physical: "red",
  game: "green",
};

const CATEGORIES: Array<{ value: ExerciseCategory | "all"; label: string }> = [
  { value: "all", label: "Kaikki" },
  { value: "warmup", label: "Lämmittely" },
  { value: "technical", label: "Tekninen" },
  { value: "tactical", label: "Taktinen" },
  { value: "physical", label: "Fyysinen" },
  { value: "game", label: "Peli" },
];

const BUILT_IN: Exercise[] = [
  {
    id: "b-warmup1",
    name: "Hölkkä & venyttely",
    category: "warmup",
    duration: 10,
    tags: ["koordinaatio"],
    description: "Kevyt hölkkä kentän ympäri ja dynaaminen venyttely.",
    goals: "Kehon lämmittely ja loukkaantumisten ehkäisy.",
  },
  {
    id: "b-warmup2",
    name: "Rondo 4v1",
    category: "warmup",
    duration: 10,
    tags: ["4v4", "syöttäminen", "yhteistyö"],
    description: "Pieni syöttöympyrä hallinnan ja liikkeen herättelyyn.",
    goals: "Pallonhallinta ja liike pallotta.",
    playerCount: 5,
  },
  {
    id: "b-tech1",
    name: "Syöttöharjoitus pareittain",
    category: "technical",
    duration: 15,
    tags: ["2v2", "syöttäminen"],
    description:
      "Lyhyet syöttöyhdistelmät pareittain. Painopiste ensimmäisessä kosketuksessa ja tarkkuudessa.",
    goals: "Parantaa syöttötarkkuutta ja vastaanottotekniikkaa.",
    playerCount: 2,
  },
  {
    id: "b-tech2",
    name: "Laukausharjoitus",
    category: "technical",
    duration: 15,
    tags: ["laukaus", "maalivahti"],
    description:
      "Laukauksia eri kulmista. Sisällytetään volleyt ja syöttö–laukaus-yhdistelmät.",
    goals: "Kehittää laukaustekniikkaa ja tarkkuutta.",
  },
  {
    id: "b-tact1",
    name: "1v1 puolustus",
    category: "tactical",
    duration: 15,
    tags: ["1v1", "puolustaminen"],
    description:
      "Yksilöpuolustusharjoitus, painopiste asemoinnissa ja jalkatyössä.",
    goals: "Hidastaa pallollista ja pakottaa suunta.",
  },
  {
    id: "b-tact2",
    name: "2v1 hyökkäys",
    category: "tactical",
    duration: 15,
    tags: ["2v2", "hyökkääminen"],
    description:
      "Kaksi hyökkääjää vastaan yksi puolustaja. Ylivoiman hyödyntäminen.",
    goals: "Luoda maalipaikka ylivoimatilanteessa.",
  },
  {
    id: "b-tact3",
    name: "Prässimuoto",
    category: "tactical",
    duration: 20,
    tags: ["puolustaminen", "yhteistyö"],
    description:
      "Koordinoitu puolustava prässi 7v7-asetelmassa. Laukaisijat ja varjostukset.",
    goals: "Tehokas joukkueprässi ja pallonriisto.",
  },
  {
    id: "b-tact4",
    name: "Vakiotilanteet",
    category: "tactical",
    duration: 15,
    tags: ["hyökkääminen", "puolustaminen"],
    description:
      "Kulmapotkulut ja vapaapotkut — hyökkäys- ja puolustusasetelmat.",
    goals: "Tehokkuus vakiotilanteissa molempiin suuntiin.",
  },
  {
    id: "b-phys1",
    name: "Juoksuintervallit",
    category: "physical",
    duration: 10,
    tags: ["nopeus", "kondis"],
    description:
      "10x20m spurtit 30s levolla. Painopiste kiihdytyksessä ja maksimivauhdissa.",
    goals: "Kehittää kiihdytyskykyä ja nopeuskestävyyttä.",
  },
  {
    id: "b-game1",
    name: "Pienpeli 5v5",
    category: "game",
    duration: 20,
    tags: ["5v5", "yhteistyö"],
    description:
      "5v5 tai 7v7. Sovelletaan harjoituksen teemaa vapaassa pelitilanteessa.",
    goals: "Opitun soveltaminen pelissä.",
  },
  {
    id: "b-game2",
    name: "Koko kentän harjoitusottelu",
    category: "game",
    duration: 30,
    tags: ["yhteistyö"],
    description: "Täysimittainen ottelu normaalisäännöillä.",
    goals: "Joukkuepeli ja kokonaiskuva.",
  },
];

const emptyExForm = () => ({
  name: "",
  category: "technical" as ExerciseCategory,
  tags: [] as string[],
  description: "",
  goals: "",
  duration: 15,
  playerCount: "",
});

export function Training() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessions, deleteSession } = useTrainingStore();
  const {
    exercises: custom,
    addExercise,
    updateExercise,
    deleteExercise,
  } = useExerciseStore();
  const players = usePlayerStore((s) => s.players);
  const drills = useDrillStore((s) => s.drills);

  const [view, setView] = useState<ViewMode>(
    searchParams.get("view") === "library" ? "library" : "sessions"
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<
    string | null
  >(null);

  // Library filters
  const [filterCat, setFilterCat] = useState<ExerciseCategory | "all">("all");
  const [filterTag, setFilterTag] = useState("all");

  // Drill preview modal
  const [previewDrill, setPreviewDrill] = useState<Drill | null>(null);

  // Exercise create/edit modal
  const [showExModal, setShowExModal] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  const [exForm, setExForm] = useState(emptyExForm());

  const allExercises = useMemo(() => [...BUILT_IN, ...custom], [custom]);
  const customIds = useMemo(() => new Set(custom.map((e) => e.id)), [custom]);

  const filteredLibrary = useMemo(
    () =>
      allExercises.filter((e) => {
        if (filterCat !== "all" && e.category !== filterCat) return false;
        if (filterTag !== "all" && !(e.tags ?? []).includes(filterTag))
          return false;
        return true;
      }),
    [allExercises, filterCat, filterTag]
  );

  function openEditEx(e: Exercise) {
    setEditingEx(e);
    setExForm({
      name: e.name,
      category: e.category,
      tags: e.tags ?? [],
      description: e.description,
      goals: e.goals ?? "",
      duration: e.duration,
      playerCount: e.playerCount?.toString() ?? "",
    });
    setShowExModal(true);
  }

  function handleSaveEx() {
    if (!exForm.name.trim()) return;
    const ex: Exercise = {
      id: editingEx?.id ?? crypto.randomUUID(),
      name: exForm.name.trim(),
      category: exForm.category,
      tags: exForm.tags,
      description: exForm.description,
      goals: exForm.goals || undefined,
      duration: exForm.duration,
      playerCount: exForm.playerCount ? +exForm.playerCount : undefined,
    };
    if (editingEx) updateExercise(editingEx.id, ex);
    else addExercise(ex);
    setShowExModal(false);
  }

  function toggleExTag(tag: string) {
    setExForm((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));
  }

  function printSession(s: TrainingSession) {
    const { settings } = useSettingsStore.getState();
    const win = window.open("", "_blank");
    if (!win) return;

    const groupSetsHtml = (s.groupSets ?? [])
      .map(
        (gs) => `
    <div class="group-set">
      <h3>${gs.label}</h3>
      <div class="groups-row">
        ${gs.playerIds
          .map(
            (groupPlayerIds, gi) => `
          <div class="group-card">
            <div class="group-heading">${
              gs.groupNames[gi] ?? `Ryhmä ${gi + 1}`
            }</div>
            ${groupPlayerIds
              .map((pid) => {
                const player = players.find((p) => p.id === pid);
                if (!player) return "";
                const color = gs.playerColors?.[pid];
                const uncertain = (s.uncertainPlayerIds ?? []).includes(pid);
                return `<div class="group-player${
                  color ? ` color-${color}` : ""
                }">${player.name}${uncertain ? ' <span class="uncertain">?</span>' : ""}</div>`;
              })
              .join("")}
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><title>${s.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 780px; margin: 0 auto; color: #111827; background: #f9fafb; }
    .header { background: #15803d; color: #fff; padding: 24px 32px 20px; }
    .header h1 { font-size: 22px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.3px; }
    .meta { font-size: 13px; color: #bbf7d0; display: flex; gap: 16px; flex-wrap: wrap; }
    .content { padding: 24px 32px 32px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #16a34a; margin: 24px 0 10px; }
    .exercise { background: #fff; border: 1px solid #e5e7eb; border-left: 3px solid #16a34a; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; display: flex; gap: 16px; align-items: flex-start; }
    .ex-content { flex: 1; min-width: 0; }
    .ex-drill-image { width: 360px; min-width: 360px; height: auto; border-radius: 6px; flex-shrink: 0; display: block; }
    .ex-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; }
    .ex-name { font-weight: 700; font-size: 15px; color: #111827; }
    .ex-cat { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    .ex-desc { color: #4b5563; font-size: 13px; margin-top: 4px; line-height: 1.5; }
    .ex-goals { color: #15803d; font-size: 12px; margin-top: 6px; }
    .ex-dur { color: #6b7280; font-size: 12px; margin-top: 6px; }
    .groups-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .group-set { margin-bottom: 0; break-inside: avoid; }
    .group-set h3 { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
    .groups-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .group-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; min-width: 100px; flex: 1; }
    .group-heading { font-weight: 700; font-size: 12px; margin-bottom: 6px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.04em; }
    .group-player { font-size: 12px; color: #374151; padding: 2px 4px; border-radius: 4px; margin-bottom: 2px; }
    .uncertain { color: #d97706; font-weight: 700; }
    .color-red { background: #fee2e2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .color-yellow { background: #fef9c3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .color-green { background: #dcfce7; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .color-blue { background: #dbeafe; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .notes { background: #fff; border: 1px solid #e5e7eb; border-left: 3px solid #22c55e; padding: 12px 16px; border-radius: 8px; margin-top: 16px; color: #4b5563; font-size: 13px; line-height: 1.5; }
    @media print { body { background: #fff; } @page { margin: 16mm; } }
  </style></head><body>
  <div class="header">
    <h1>⚽ ${s.title}</h1>
    <div class="meta">
      <span>📅 ${format(new Date(s.date), "dd.MM.yyyy")}</span>
      <span>⏱ ${s.duration} min</span>
      ${settings.coachName ? `<span>👤 ${settings.coachName}</span>` : ""}
      ${settings.teamName ? `<span>${settings.teamName}</span>` : ""}
    </div>
  </div>
  <div class="content">

  ${
    s.exercises.length > 0 ? `<div class="section-title">Harjoitteet</div>` : ""
  }
  ${s.exercises
    .map(
      (e, i) => `
    <div class="exercise">
      <div class="ex-content">
        <div class="ex-header">
          <span class="ex-name">${i + 1}. ${e.name}</span>
          <span class="ex-cat">${CAT_LABELS[e.category]}</span>
        </div>
        <div class="ex-desc">${e.description}</div>
        ${e.goals ? `<div class="ex-goals">🎯 ${e.goals}</div>` : ""}
        <div class="ex-dur">⏱ ${e.duration} min${
        e.playerCount ? ` · 👥 ${e.playerCount} pelaajaa` : ""
      }</div>
      </div>
      ${
        e.canvasDataUrl
          ? `<img src="${e.canvasDataUrl}" class="ex-drill-image" />`
          : ""
      }
    </div>`
    )
    .join("")}

  ${
    (s.groupSets ?? []).length > 0
      ? `<div class="section-title">Ryhmät &amp; Joukkueet</div><div class="groups-grid">${groupSetsHtml}</div>`
      : ""
  }

  ${s.notes ? `<div class="notes">📝 ${s.notes}</div>` : ""}
  </div>
  <script>window.print();</script>
  </body></html>`;

    win.document.write(html);
    win.document.close();
  }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setView("sessions")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              view === "sessions"
                ? "bg-gray-800 text-white"
                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            <CalendarDays size={14} /> Harjoitussuunnitelmat
          </button>
          <button
            onClick={() => setView("library")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-slate-700 transition-colors ${
              view === "library"
                ? "bg-gray-800 text-white"
                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            <BookOpen size={14} /> Harjoitekirjasto
          </button>
        </div>
        {view === "library" && (
          <Button
            icon={<Plus size={15} />}
            onClick={() => navigate("/training/new-drill")}
          >
            Uusi harjoite
          </Button>
        )}
        {view === "sessions" && (
          <Button
            icon={<Plus size={15} />}
            onClick={() => navigate("/training/new")}
          >
            Uusi suunnitelma
          </Button>
        )}
      </div>

      {/* ── LIBRARY VIEW ── */}
      {view === "library" && (
        <div className="space-y-4">
          {/* Saved tactical drills */}
          {drills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Tallennetut harjoitteet
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-2">
                {drills.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-brand-300 hover:shadow-sm transition-all"
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => setPreviewDrill(d)}
                    >
                      <img
                        src={d.canvasDataUrl}
                        alt={d.name}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="px-2 pt-2 pb-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate">
                          {d.name}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center justify-between px-2 pb-2">
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {d.duration} min
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            navigate(`/training/drills/${d.id}/edit`)
                          }
                          className="p-1 text-gray-400 dark:text-slate-500 hover:text-brand-600 transition-colors"
                          title="Muokkaa harjoitetta"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() =>
                            deleteDrill(d.id).catch(console.error)
                          }
                          className="p-1 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                          title="Poista harjoite"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterCat === c.value
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Tag filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterTag("all")}
              className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                filterTag === "all"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500"
              }`}
            >
              kaikki tagit
            </button>
            {EXERCISE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? "all" : tag)}
                className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                  filterTag === tag
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {filteredLibrary.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 dark:text-slate-500 py-8">
                Ei harjoitteita valituilla suodattimilla.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredLibrary.map((e) => (
              <div
                key={e.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-2 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                        {e.name}
                      </p>
                      {customIds.has(e.id) && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">
                          Oma
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge
                        label={CAT_LABELS[e.category]}
                        color={CAT_COLORS[e.category]}
                      />
                      {(e.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {customIds.has(e.id) && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditEx(e)}
                        className="text-gray-400 dark:text-slate-500 hover:text-brand-600 transition-colors p-0.5"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteExercise(e.id)}
                        className="text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors p-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {e.description && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                    {e.description}
                  </p>
                )}
                {e.goals && (
                  <p className="text-xs text-brand-700 bg-brand-50 rounded px-2 py-1.5">
                    🎯 {e.goals}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50 dark:border-slate-700">
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    ⏱ {e.duration} min
                    {e.playerCount ? ` · 👥 ${e.playerCount} pelaajaa` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SESSIONS VIEW ── */}
      {view === "sessions" && (
        <div className="space-y-3">
          {sessions.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 dark:text-slate-500 py-8">
                Ei harjoitussuunnitelmia. Luo ensimmäinen!
              </p>
            </Card>
          )}
          {sessions
            .slice()
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .map((s) => (
              <div
                key={s.id}
                className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {s.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {format(new Date(s.date), "dd.MM.yyyy")} · {s.duration}{" "}
                      min · {s.exercises.length} harjoitetta
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2"
                    onClick={(evt) => evt.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FileText size={13} />}
                      onClick={() => printSession(s)}
                    >
                      Lataa PDF
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Pencil size={13} />}
                      onClick={() => navigate(`/training/${s.id}/edit`)}
                    >
                      Muokkaa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={13} />}
                      onClick={() => setConfirmDeleteSessionId(s.id)}
                    />
                    {expanded === s.id ? (
                      <ChevronUp
                        size={16}
                        className="text-gray-400 dark:text-slate-500 cursor-pointer"
                        onClick={() => setExpanded(null)}
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-gray-400 dark:text-slate-500"
                      />
                    )}
                  </div>
                </div>
                {expanded === s.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                    <div className="pt-3 space-y-2">
                      {s.exercises.map((e, i) => (
                        <div
                          key={e.id}
                          className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100 dark:border-slate-700 flex items-start gap-3"
                        >
                          <span className="text-gray-300 dark:text-slate-600 text-sm font-bold w-5 mt-0.5">
                            {i + 1}.
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-gray-900 dark:text-white">
                                {e.name}
                              </span>
                              <Badge
                                label={CAT_LABELS[e.category]}
                                color={CAT_COLORS[e.category]}
                              />
                              <span className="text-xs text-brand-600 font-medium">
                                {e.duration} min
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                              {e.description}
                            </p>
                            {e.goals && (
                              <p className="text-xs text-brand-600 mt-0.5">
                                🎯 {e.goals}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {(s.groupSets ?? []).length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                            Ryhmät
                          </p>
                          {(s.groupSets ?? []).map((gs) => (
                            <div key={gs.id} className="flex flex-wrap gap-2 items-start">
                              <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0 mt-0.5">{gs.label}:</span>
                              {gs.playerIds.map((groupPlayerIds, gi) => (
                                <div key={gi} className="flex items-center gap-1 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">{gs.groupNames[gi] ?? `R${gi + 1}`}:</span>
                                  {groupPlayerIds.map((pid) => {
                                    const player = players.find((p) => p.id === pid);
                                    if (!player) return null;
                                    const color = gs.playerColors?.[pid];
                                    const cls = color === 'red' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                      : color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                                      : color === 'green' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                      : color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300';
                                    const uncertain = (s.uncertainPlayerIds ?? []).includes(pid);
                                    return (
                                      <span key={pid} className={`text-xs px-1.5 py-0.5 rounded ${cls}`}>
                                        {player.name}{uncertain && <span className="ml-0.5 text-amber-500 font-bold">?</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {s.notes && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 italic pt-1">
                          {s.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* ── CREATE / EDIT EXERCISE MODAL ── */}
      {showExModal && (
        <Modal
          title={editingEx ? "Muokkaa harjoitetta" : "Uusi harjoite"}
          onClose={() => setShowExModal(false)}
          wide
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nimi"
                value={exForm.name}
                onChange={(e) => setExForm({ ...exForm, name: e.target.value })}
                placeholder="Harjoitteen nimi"
              />
              <Select
                label="Kategoria"
                value={exForm.category}
                onChange={(e) =>
                  setExForm({
                    ...exForm,
                    category: e.target.value as ExerciseCategory,
                  })
                }
              >
                <option value="warmup">Lämmittely</option>
                <option value="technical">Tekninen</option>
                <option value="tactical">Taktinen</option>
                <option value="physical">Fyysinen</option>
                <option value="game">Peli</option>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                Tagit
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXERCISE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleExTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-colors ${
                      exForm.tags.includes(tag)
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-brand-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Kuvaus"
              value={exForm.description}
              onChange={(e) =>
                setExForm({ ...exForm, description: e.target.value })
              }
              placeholder="Miten harjoite toteutetaan…"
              rows={3}
            />
            <Textarea
              label="Tavoitteet"
              value={exForm.goals}
              onChange={(e) => setExForm({ ...exForm, goals: e.target.value })}
              placeholder="Mitä pelaajat oppivat tai kehittävät…"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Kesto (min)"
                type="number"
                min={1}
                max={120}
                value={exForm.duration}
                onChange={(e) =>
                  setExForm({ ...exForm, duration: +e.target.value })
                }
              />
              <Input
                label="Pelaajamäärä (vapaaehtoinen)"
                type="number"
                min={1}
                value={exForm.playerCount}
                onChange={(e) =>
                  setExForm({ ...exForm, playerCount: e.target.value })
                }
                placeholder="esim. 6"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowExModal(false)}>
                Peruuta
              </Button>
              <Button onClick={handleSaveEx} disabled={!exForm.name.trim()}>
                {editingEx ? "Tallenna muutokset" : "Luo harjoite"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DRILL PREVIEW ── */}
      {previewDrill && (
        <Modal
          title={previewDrill.name}
          onClose={() => setPreviewDrill(null)}
          wide
        >
          <div className="flex flex-col gap-4">
            <img
              src={previewDrill.canvasDataUrl}
              alt={previewDrill.name}
              className="w-full rounded-lg border border-gray-100 dark:border-slate-700"
            />
            <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-slate-400">
              <span>⏱ {previewDrill.duration} min</span>
              {previewDrill.repetitions > 1 && (
                <span>🔁 {previewDrill.repetitions} toistoa</span>
              )}
            </div>
            {previewDrill.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Kuvaus</p>
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{previewDrill.description}</p>
              </div>
            )}
            {previewDrill.goals && (
              <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-wide mb-1">Tavoitteet</p>
                <p className="text-sm text-brand-800 dark:text-brand-300 leading-relaxed">{previewDrill.goals}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => { setPreviewDrill(null); navigate(`/training/drills/${previewDrill.id}/edit`); }} icon={<Pencil size={13} />}>
                Muokkaa
              </Button>
              <Button variant="secondary" onClick={() => setPreviewDrill(null)}>
                Sulje
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DELETE SESSION CONFIRMATION ── */}
      {confirmDeleteSessionId && (
        <Modal
          title="Poistetaanko harjoitussuunnitelma?"
          onClose={() => setConfirmDeleteSessionId(null)}
        >
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
            Tätä toimintoa ei voi peruuttaa. Harjoitussuunnitelma poistetaan
            pysyvästi.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmDeleteSessionId(null)}
            >
              Peruuta
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={() => {
                deleteSession(confirmDeleteSessionId);
                setConfirmDeleteSessionId(null);
              }}
            >
              Poista
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
