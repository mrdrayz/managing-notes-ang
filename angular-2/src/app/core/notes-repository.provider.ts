import { Provider, inject } from '@angular/core';

import { LocalStorageNotesService } from '../services/local-storage-notes.service';
import { NotesApiService } from '../services/notes-api.service';
import { NotesDataSourceService } from '../services/notes-data-source.service';
import { LOCAL_STORAGE_NOTES_DATA_SOURCE } from './notes-data-source.constants';
import { NotesRepository } from './notes-repository.interface';
import { NOTES_REPOSITORY } from './notes-repository.token';

export function notesRepositoryFactory(): NotesRepository {
    const notesDataSourceService = inject(NotesDataSourceService);
    const notesApiService = inject(NotesApiService);
    const localStorageNotesService = inject(LocalStorageNotesService);
    const currentDataSource = notesDataSourceService.getDataSource();

    const repository =
        currentDataSource === LOCAL_STORAGE_NOTES_DATA_SOURCE
            ? localStorageNotesService
            : notesApiService;

    return repository;
}

export const NOTES_REPOSITORY_PROVIDER: Provider = {
    provide: NOTES_REPOSITORY,
    useFactory: notesRepositoryFactory,
};
