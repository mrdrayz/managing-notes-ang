import { Observable } from 'rxjs';

import { CreateNotePayload } from './create-note-payload.type';
import { Note } from './note.interface';
import { UpdateNotePayload } from './update-note-payload.type';

export interface NotesRepository {
    getNotes(): Observable<Note[]>;
    addNote(note: CreateNotePayload): Observable<Note>;
    updateNote(noteId: number, note: UpdateNotePayload): Observable<Note>;
    deleteNote(noteId: number): Observable<void>;
    setNotePinned(note: Note, isPinned: boolean): Observable<Note>;
}
