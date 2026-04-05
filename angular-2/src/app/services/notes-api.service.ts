import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { CreateNotePayload } from '../core/create-note-payload.type';
import { Note } from '../core/note.interface';
import { normalizeNote, normalizeNotes } from '../core/note.utils';
import { NotesRepository } from '../core/notes-repository.interface';
import { UpdateNotePayload } from '../core/update-note-payload.type';

@Injectable({
    providedIn: 'root',
})
export class NotesApiService implements NotesRepository {
    private readonly httpClient = inject(HttpClient);
    private readonly notesApiUrl = `${environment.apiBaseUrl}/notes`;

    getNotes(): Observable<Note[]> {
        return this.httpClient
            .get<unknown>(this.notesApiUrl)
            .pipe(map((response: unknown): Note[] => normalizeNotes(response)));
    }

    addNote(note: CreateNotePayload): Observable<Note> {
        const timestamp = new Date().toISOString();
        const notePayload = {
            ...note,
            createdAt: timestamp,
            updatedAt: null,
            isPinned: false,
        };

        return this.httpClient
            .post<unknown>(this.notesApiUrl, notePayload)
            .pipe(map((response: unknown): Note => this.normalizeNoteResponse(response)));
    }

    updateNote(noteId: number, note: UpdateNotePayload): Observable<Note> {
        const notePayload = {
            ...note,
            updatedAt: new Date().toISOString(),
        };

        return this.httpClient
            .patch<unknown>(`${this.notesApiUrl}/${noteId}`, notePayload)
            .pipe(map((response: unknown): Note => this.normalizeNoteResponse(response)));
    }

    deleteNote(noteId: number): Observable<void> {
        return this.httpClient.delete<void>(`${this.notesApiUrl}/${noteId}`);
    }

    setNotePinned(note: Note, isPinned: boolean): Observable<Note> {
        const notePayload = {
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            isPinned,
        };

        return this.httpClient
            .patch<unknown>(`${this.notesApiUrl}/${note.id}`, notePayload)
            .pipe(map((response: unknown): Note => this.normalizeNoteResponse(response)));
    }

    private normalizeNoteResponse(response: unknown): Note {
        const normalizedNote = normalizeNote(response);

        if (normalizedNote === null) {
            throw new Error('Invalid note response.');
        }

        return normalizedNote;
    }
}
