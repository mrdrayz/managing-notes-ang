import { NotesDataSource } from './notes-data-source.type';

export const API_NOTES_DATA_SOURCE: NotesDataSource = 'api';
export const LOCAL_STORAGE_NOTES_DATA_SOURCE: NotesDataSource = 'localStorage';
export const DEFAULT_NOTES_DATA_SOURCE: NotesDataSource = API_NOTES_DATA_SOURCE;
export const NOTES_DATA_SOURCE_STORAGE_KEY: string = 'notesDataSource';
