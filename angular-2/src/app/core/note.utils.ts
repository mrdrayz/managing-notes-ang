import { Note } from './note.interface';

interface NoteCandidate {
    id: number;
    title: string;
    content: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    isPinned?: unknown;
}

export function normalizeNotes(value: unknown): Note[] {
    const normalizedNotes = Array.isArray(value)
        ? value
              .map((note: unknown): Note | null => normalizeNote(note))
              .filter((note: Note | null): note is Note => note !== null)
        : [];

    return normalizedNotes;
}

export function normalizeNote(value: unknown): Note | null {
    if (!isNoteCandidate(value)) {
        return null;
    }

    const fallbackTimestamp = new Date().toISOString();
    const createdAt = typeof value.createdAt === 'string' ? value.createdAt : fallbackTimestamp;
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    const isPinned = typeof value.isPinned === 'boolean' ? value.isPinned : false;

    const note: Note = {
        id: value.id,
        title: value.title,
        content: value.content,
        createdAt,
        updatedAt,
        isPinned,
    };

    return note;
}

function isNoteCandidate(value: unknown): value is NoteCandidate {
    const isValidNoteCandidate =
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        'title' in value &&
        'content' in value &&
        typeof value.id === 'number' &&
        typeof value.title === 'string' &&
        typeof value.content === 'string';

    return isValidNoteCandidate;
}
