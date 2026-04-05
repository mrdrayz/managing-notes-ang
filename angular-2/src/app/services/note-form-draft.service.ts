import { Injectable } from '@angular/core';

import { NoteFormDraft } from '../core/note-form-draft.interface';

@Injectable({
    providedIn: 'root',
})
export class NoteFormDraftService {
    private readonly storageKey = 'noteFormDraft';

    getDraft(): NoteFormDraft | null {
        const storedDraft = localStorage.getItem(this.storageKey);
        const parsedDraft = this.parseStoredDraft(storedDraft);
        const draft = this.isNoteFormDraft(parsedDraft) ? parsedDraft : null;

        return draft;
    }

    saveDraft(draft: NoteFormDraft): void {
        const serializedDraft = JSON.stringify(draft);

        localStorage.setItem(this.storageKey, serializedDraft);
    }

    clearDraft(): void {
        localStorage.removeItem(this.storageKey);
    }

    private parseStoredDraft(storedDraft: string | null): unknown {
        let parsedDraft: unknown = null;

        if (storedDraft !== null) {
            try {
                parsedDraft = JSON.parse(storedDraft);
            } catch {
                parsedDraft = null;
            }
        }

        return parsedDraft;
    }

    private isNoteFormDraft(value: unknown): value is NoteFormDraft {
        const isValidDraft =
            typeof value === 'object' &&
            value !== null &&
            'title' in value &&
            'content' in value &&
            'editingNoteId' in value &&
            typeof value.title === 'string' &&
            typeof value.content === 'string' &&
            (typeof value.editingNoteId === 'number' || value.editingNoteId === null);

        return isValidDraft;
    }
}
