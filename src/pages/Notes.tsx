import { useState, useCallback } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extension-placeholder';
import { format } from 'date-fns';
import {
  Plus, Trash2, ChevronLeft, Pencil, Check,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Table as TableIcon, Undo2, Redo2,
  FileText, IndentIncrease, IndentDecrease,
} from 'lucide-react';
import { useNotesStore } from '../store/useNotesStore';
import type { Note, NoteCategory } from '../types';

const CAT_LABELS: Record<NoteCategory, string> = {
  'general': 'Yleinen',
  'season-plan': 'Kausisuunnitelma',
  'player-notes': 'Pelaaja-arvio',
  'tactics': 'Taktiikka',
};

const CAT_COLORS: Record<NoteCategory, string> = {
  'general': 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
  'season-plan': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  'player-notes': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  'tactics': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

function ToolbarBtn({
  onClick, active, tooltip, children,
}: {
  onClick: () => void; active?: boolean; tooltip: string; children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={`p-1.5 rounded-md transition-colors ${
          active
            ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        {children}
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-gray-800 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-0.5 flex-shrink-0" />;
}

function RichEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Kirjoita muistiinpano tähän...' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] p-4 text-sm text-gray-900 leading-relaxed',
      },
    },
  });

  const s = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return null;
      return {
        isBold:        e.isActive('bold'),
        isItalic:      e.isActive('italic'),
        isUnderline:   e.isActive('underline'),
        isStrike:      e.isActive('strike'),
        isCode:        e.isActive('code'),
        isH1:          e.isActive('heading', { level: 1 }),
        isH2:          e.isActive('heading', { level: 2 }),
        isH3:          e.isActive('heading', { level: 3 }),
        isBullet:      e.isActive('bulletList'),
        isOrdered:     e.isActive('orderedList'),
        isBlockquote:  e.isActive('blockquote'),
        isTable:       e.isActive('table'),
        isAlignLeft:   e.isActive({ textAlign: 'left' }),
        isAlignCenter: e.isActive({ textAlign: 'center' }),
        isAlignRight:  e.isActive({ textAlign: 'right' }),
      };
    },
  });

  if (!editor || !s) return null;

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-col border border-gray-200 dark:border-slate-700 rounded-xl h-full">
      {/* Toolbar — sticky so it stays visible when content scrolls */}
      <div
        className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 rounded-t-xl"
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Undo/Redo */}
        <ToolbarBtn tooltip="Kumoa (⌘Z)" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Tee uudelleen (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} />
        </ToolbarBtn>
        <Divider />

        {/* Headings */}
        <ToolbarBtn tooltip="Otsikko 1" active={s.isH1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Otsikko 2" active={s.isH2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Otsikko 3" active={s.isH3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={14} />
        </ToolbarBtn>
        <Divider />

        {/* Text formatting */}
        <ToolbarBtn tooltip="Lihavointi (⌘B)" active={s.isBold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Kursiivi (⌘I)" active={s.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Alleviivaus (⌘U)" active={s.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Yliviivaus" active={s.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Koodi" active={s.isCode} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={14} />
        </ToolbarBtn>
        <Divider />

        {/* Lists & indent */}
        <ToolbarBtn tooltip="Luettelo" active={s.isBullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Numeroitu luettelo" active={s.isOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Sisennä (Tab)" onClick={() => editor.chain().focus().sinkListItem('listItem').run()}>
          <IndentIncrease size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Poista sisennys (⇧Tab)" onClick={() => editor.chain().focus().liftListItem('listItem').run()}>
          <IndentDecrease size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Lainaus" active={s.isBlockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Vaakaviiva" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolbarBtn>
        <Divider />

        {/* Alignment */}
        <ToolbarBtn tooltip="Tasaa vasemmalle" active={s.isAlignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Keskitä" active={s.isAlignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={14} />
        </ToolbarBtn>
        <ToolbarBtn tooltip="Tasaa oikealle" active={s.isAlignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={14} />
        </ToolbarBtn>
        <Divider />

        {/* Table */}
        <ToolbarBtn tooltip="Lisää taulukko" onClick={insertTable}>
          <TableIcon size={14} />
        </ToolbarBtn>
        {s.isTable && (
          <>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}
              className="text-xs px-1.5 py-1 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >+col</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}
              className="text-xs px-1.5 py-1 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Lisää rivi"
            >+rivi</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}
              className="text-xs px-1.5 py-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Poista sarake"
            >-col</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}
              className="text-xs px-1.5 py-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Poista rivi"
            >-rivi</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }}
              className="text-xs px-1.5 py-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Poista taulukko"
            >✕ taul.</button>
          </>
        )}
      </div>

      {/* Editor area */}
      <div className="bg-white dark:bg-slate-900 flex-1 overflow-y-auto min-h-0 rounded-b-xl">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

export function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useNotesStore();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (notes.length === 0) return null;
    return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0].id;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showList, setShowList] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<NoteCategory | 'all'>('all');

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const filtered = filterCat === 'all'
    ? [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : [...notes].filter((n) => n.category === filterCat).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function createNote() {
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Uusi muistiinpano',
      content: '',
      category: 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addNote(note);
    setSelectedId(note.id);
    setIsEditing(true);
    setShowList(false);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setIsEditing(false);
    setShowList(false);
  }

  function handleDelete(id: string) {
    deleteNote(id);
    if (selectedId === id) {
      const remaining = notes
        .filter((n) => n.id !== id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setSelectedId(remaining[0]?.id ?? null);
      setIsEditing(false);
    }
    setConfirmDeleteId(null);
  }

  const handleContentChange = useCallback((html: string) => {
    if (selectedId) updateNote(selectedId, { content: html });
  }, [selectedId, updateNote]);

  const editorKey = selectedId ?? 'none';

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Mobile: back button when viewing note */}
      {selectedId && (!showList || isEditing) && (
        <button
          onClick={() => { setShowList(true); setIsEditing(false); }}
          className="md:hidden flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white mb-3 transition-colors"
        >
          <ChevronLeft size={16} /> Muistiinpanot
        </button>
      )}

      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Left: List ── */}
        <div className={`flex flex-col gap-3 flex-shrink-0 transition-all duration-200 ${
          isEditing
            ? 'hidden'
            : (!showList ? 'hidden md:flex md:w-72' : 'flex w-full md:w-72')
        }`}>

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Muistiinpanot</h2>
            <button
              onClick={createNote}
              className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-900 transition-colors"
            >
              <Plus size={13} /> Lisää
            </button>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'general', 'season-plan', 'player-notes', 'tactics'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterCat === cat
                    ? 'bg-gray-800 dark:bg-slate-200 text-white dark:text-gray-900 border-gray-800 dark:border-slate-200'
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500'
                }`}
              >
                {cat === 'all' ? 'Kaikki' : CAT_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Note list */}
          <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                Ei muistiinpanoja.
              </div>
            )}
            {filtered.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelect(note.id)}
                className={`cursor-pointer text-left px-3 py-2.5 rounded-xl border transition-all group ${
                  selectedId === note.id
                    ? 'bg-slate-700 border-slate-600'
                    : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold truncate flex-1 ${
                    selectedId === note.id ? 'text-white' : 'text-gray-900 dark:text-slate-100'
                  }`}>
                    {note.title || 'Nimetön'}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(note.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 dark:text-slate-600 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CAT_COLORS[note.category]}`}>
                    {CAT_LABELS[note.category]}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {format(new Date(note.updatedAt), 'dd.MM.yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Editor ── */}
        <div className={`flex-1 flex flex-col gap-3 min-h-0 ${!isEditing && showList ? 'hidden md:flex' : 'flex'}`}>
          {!selectedNote ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-slate-500 gap-3">
              <FileText size={48} className="opacity-20" />
              <p className="text-sm">Valitse muistiinpano tai luo uusi</p>
              <button
                onClick={createNote}
                className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors"
              >
                <Plus size={14} /> Uusi muistiinpano
              </button>
            </div>
          ) : (
            <>
              {/* Note header — 2-row layout for mobile */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {/* Row 1: title + primary action */}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={selectedNote.title}
                      onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                      placeholder="Otsikko"
                      className="flex-1 min-w-0 text-lg font-bold text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-300 dark:placeholder:text-slate-600"
                    />
                  ) : (
                    <h2 className="flex-1 min-w-0 text-lg font-bold text-gray-900 dark:text-slate-100 truncate">
                      {selectedNote.title || 'Nimetön'}
                    </h2>
                  )}
                  {isEditing ? (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-colors flex-shrink-0"
                    >
                      <Check size={13} /> Valmis
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
                    >
                      <Pencil size={13} /> Muokkaa
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(selectedNote.id)}
                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Row 2: category tag + date + category select when editing */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CAT_COLORS[selectedNote.category]}`}>
                    {CAT_LABELS[selectedNote.category]}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {format(new Date(selectedNote.updatedAt), 'dd.MM. HH:mm')}
                  </span>
                  {isEditing && (
                    <select
                      value={selectedNote.category}
                      onChange={(e) => updateNote(selectedNote.id, { category: e.target.value as NoteCategory })}
                      className="text-xs font-medium border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {(Object.entries(CAT_LABELS) as [NoteCategory, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Content: read view or editor */}
              {isEditing ? (
                <div className="flex-1 min-h-0">
                  <RichEditor
                    key={editorKey}
                    content={selectedNote.content}
                    onChange={handleContentChange}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-5 py-4">
                  {selectedNote.content ? (
                    <div
                      className="note-content text-sm text-gray-800 dark:text-slate-200 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                    />
                  ) : (
                    <p className="text-gray-400 dark:text-slate-500 text-sm italic">Ei sisältöä. Paina Muokkaa lisätäksesi tekstiä.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">Poistetaanko muistiinpano?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">Tätä toimintoa ei voi peruuttaa.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                Peruuta
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors">
                Poista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
