import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { CreateNotePayload } from '../core/create-note-payload.type';
import { Note } from '../core/note.interface';
import { normalizeNotes } from '../core/note.utils';
import { NotesRepository } from '../core/notes-repository.interface';
import { UpdateNotePayload } from '../core/update-note-payload.type';

@Injectable({
    providedIn: 'root',
})
export class LocalStorageNotesService implements NotesRepository {
    private readonly storageKey = 'notes';

    getNotes(): Observable<Note[]> {
        const notes = this.readNotes();

        return of(notes);
    }

    addNote(note: CreateNotePayload): Observable<Note> {
        const storedNotes = this.readNotes();
        const timestamp = new Date().toISOString();
        const newNote: Note = {
            id: this.getNextNoteId(storedNotes),
            title: note.title,
            content: note.content,
            createdAt: timestamp,
            updatedAt: null,
            isPinned: false,
        };
        const updatedNotes = [newNote, ...storedNotes];

        this.writeNotes(updatedNotes);

        return of(newNote);
    }

    updateNote(noteId: number, note: UpdateNotePayload): Observable<Note> {
        const storedNotes = this.readNotes();
        const noteToUpdate = storedNotes.find(
            (storedNote: Note): boolean => storedNote.id === noteId,
        );

        if (noteToUpdate === undefined) {
            return throwError((): Error => new Error('Note not found.'));
        }

        const updatedNote: Note = {
            ...noteToUpdate,
            title: note.title,
            content: note.content,
            createdAt: note.createdAt,
            isPinned: note.isPinned,
            updatedAt: new Date().toISOString(),
        };
        const updatedNotes = storedNotes.map(
            (storedNote: Note): Note => (storedNote.id === noteId ? updatedNote : storedNote),
        );

        this.writeNotes(updatedNotes);

        return of(updatedNote);
    }

    deleteNote(noteId: number): Observable<void> {
        const storedNotes = this.readNotes();
        const updatedNotes = storedNotes.filter(
            (storedNote: Note): boolean => storedNote.id !== noteId,
        );

        this.writeNotes(updatedNotes);

        return of(undefined);
    }

    setNotePinned(note: Note, isPinned: boolean): Observable<Note> {
        const storedNotes = this.readNotes();
        const noteToUpdate = storedNotes.find(
            (storedNote: Note): boolean => storedNote.id === note.id,
        );

        if (noteToUpdate === undefined) {
            return throwError((): Error => new Error('Note not found.'));
        }

        const updatedNote: Note = {
            ...noteToUpdate,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            isPinned,
        };
        const updatedNotes = storedNotes.map(
            (storedNote: Note): Note => (storedNote.id === note.id ? updatedNote : storedNote),
        );

        this.writeNotes(updatedNotes);

        return of(updatedNote);
    }

    private readNotes(): Note[] {
        const storedNotes = localStorage.getItem(this.storageKey);
        const parsedNotes = this.parseStoredNotes(storedNotes);
        const notes = normalizeNotes(parsedNotes);

        return notes;
    }

    private writeNotes(notes: Note[]): void {
        const serializedNotes = JSON.stringify(notes);

        localStorage.setItem(this.storageKey, serializedNotes);
    }

    private getNextNoteId(notes: Note[]): number {
        const largestNoteId = notes.reduce(
            (currentLargestId: number, currentNote: Note): number =>
                currentNote.id > currentLargestId ? currentNote.id : currentLargestId,
            0,
        );
        const nextNoteId = largestNoteId + 1;

        return nextNoteId;
    }

    private parseStoredNotes(storedNotes: string | null): unknown {
        let parsedNotes: unknown = [];

        if (storedNotes !== null) {
            try {
                parsedNotes = JSON.parse(storedNotes);
            } catch {
                parsedNotes = [];
            }
        }

        return parsedNotes;
    }
}
