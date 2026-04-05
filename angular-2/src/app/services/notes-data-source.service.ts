import { Injectable } from '@angular/core';

import {
    API_NOTES_DATA_SOURCE,
    DEFAULT_NOTES_DATA_SOURCE,
    LOCAL_STORAGE_NOTES_DATA_SOURCE,
    NOTES_DATA_SOURCE_STORAGE_KEY,
} from '../core/notes-data-source.constants';
import { NotesDataSource } from '../core/notes-data-source.type';

@Injectable({
    providedIn: 'root',
})
export class NotesDataSourceService {
    private readonly storageKey: string = NOTES_DATA_SOURCE_STORAGE_KEY;

    getDataSource(): NotesDataSource {
        const storedDataSource = localStorage.getItem(this.storageKey);
        const dataSource = this.isNotesDataSource(storedDataSource)
            ? storedDataSource
            : DEFAULT_NOTES_DATA_SOURCE;

        return dataSource;
    }

    setDataSource(dataSource: NotesDataSource): void {
        localStorage.setItem(this.storageKey, dataSource);
    }

    private isNotesDataSource(value: string | null): value is NotesDataSource {
        const isValidDataSource =
            value === API_NOTES_DATA_SOURCE || value === LOCAL_STORAGE_NOTES_DATA_SOURCE;

        return isValidDataSource;
    }
}
