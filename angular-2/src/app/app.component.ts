import { DatePipe, DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { CreateNotePayload } from './core/create-note-payload.type';
import {
    API_NOTES_DATA_SOURCE,
    LOCAL_STORAGE_NOTES_DATA_SOURCE,
} from './core/notes-data-source.constants';
import { NotesDataSource } from './core/notes-data-source.type';
import { Note } from './core/note.interface';
import { NOTES_REPOSITORY } from './core/notes-repository.token';
import { DARK_THEME, LIGHT_THEME } from './core/theme.constants';
import { Theme } from './core/theme.type';
import { UpdateNotePayload } from './core/update-note-payload.type';
import { NoteFormDraftService } from './services/note-form-draft.service';
import { NotesDataSourceService } from './services/notes-data-source.service';
import { ThemeService } from './services/theme.service';

const TITLE_MAX_LENGTH = 50;
const CONTENT_MAX_LENGTH = 200;
const TOAST_DURATION_MS = 3000;

const EMPTY_NOTE_ERROR_MESSAGE = 'Заголовок и текст заметки обязательны.';
const TITLE_TOO_LONG_ERROR_MESSAGE = `Заголовок не должен превышать ${TITLE_MAX_LENGTH} символов.`;
const CONTENT_TOO_LONG_ERROR_MESSAGE = `Текст заметки не должен превышать ${CONTENT_MAX_LENGTH} символов.`;
const LOAD_NOTES_ERROR_MESSAGE = 'Не удалось загрузить заметки. Попробуйте ещё раз.';
const CREATE_NOTE_ERROR_MESSAGE = 'Не удалось создать заметку. Попробуйте ещё раз.';
const UPDATE_NOTE_ERROR_MESSAGE = 'Не удалось сохранить изменения. Попробуйте ещё раз.';
const DELETE_NOTE_ERROR_MESSAGE = 'Не удалось удалить заметку. Попробуйте ещё раз.';
const PIN_NOTE_ERROR_MESSAGE = 'Не удалось изменить состояние закрепления. Попробуйте ещё раз.';

type NoteSortOption = 'newest' | 'oldest' | 'recentlyUpdated' | 'titleAsc' | 'titleDesc';

type ToastType = 'success' | 'info';

interface DataSourceOption {
    value: NotesDataSource;
    label: string;
}

interface SortOption {
    value: NoteSortOption;
    label: string;
}

interface ToastNotification {
    id: number;
    message: string;
    type: ToastType;
}

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [DatePipe, FormsModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    host: {
        '[class.theme-dark]': 'isDarkTheme',
    },
})
export class AppComponent implements OnInit, OnDestroy {
    private readonly document = inject(DOCUMENT);
    private readonly notesRepository = inject(NOTES_REPOSITORY);
    private readonly notesDataSourceService = inject(NotesDataSourceService);
    private readonly themeService = inject(ThemeService);
    private readonly noteFormDraftService = inject(NoteFormDraftService);

    private nextToastId = 1;
    private readonly toastTimeoutIds = new Map<number, number>();

    readonly titleMaxLength = TITLE_MAX_LENGTH;
    readonly contentMaxLength = CONTENT_MAX_LENGTH;

    readonly dataSourceOptions: DataSourceOption[] = [
        {
            value: API_NOTES_DATA_SOURCE,
            label: 'API',
        },
        {
            value: LOCAL_STORAGE_NOTES_DATA_SOURCE,
            label: 'Локальное хранилище',
        },
    ];

    readonly sortOptions: SortOption[] = [
        {
            value: 'newest',
            label: 'Сначала новые',
        },
        {
            value: 'oldest',
            label: 'Сначала старые',
        },
        {
            value: 'recentlyUpdated',
            label: 'Недавно изменённые',
        },
        {
            value: 'titleAsc',
            label: 'По названию А-Я',
        },
        {
            value: 'titleDesc',
            label: 'По названию Я-А',
        },
    ];

    notes: Note[] = [];
    noteFormModel: CreateNotePayload = {
        title: '',
        content: '',
    };
    toastNotifications: ToastNotification[] = [];
    selectedDataSource = this.notesDataSourceService.getDataSource();
    currentTheme = this.themeService.getTheme();
    selectedSortOption: NoteSortOption = 'newest';
    editingNoteId: number | null = null;
    deletingNoteId: number | null = null;
    togglingPinnedNoteId: number | null = null;
    notePendingDeletion: Note | null = null;
    searchQuery = '';
    isLoadingNotes = false;
    isSubmittingNote = false;
    errorMessage: string | null = null;

    ngOnInit(): void {
        this.applyTheme();
        this.restoreDraft();
        this.loadNotes();
    }

    ngOnDestroy(): void {
        this.toastTimeoutIds.forEach((timeoutId: number): void => {
            window.clearTimeout(timeoutId);
        });
        this.toastTimeoutIds.clear();
    }

    get visibleNotes(): Note[] {
        const visibleNotes = this.getVisibleNotes(
            this.notes,
            this.searchQuery,
            this.selectedSortOption,
        );

        return visibleNotes;
    }

    get hasVisibleNotes(): boolean {
        const hasVisibleNotes = this.visibleNotes.length > 0;

        return hasVisibleNotes;
    }

    get isEditMode(): boolean {
        const isEditMode = this.editingNoteId !== null;

        return isEditMode;
    }

    get isDarkTheme(): boolean {
        const isDarkTheme = this.currentTheme === DARK_THEME;

        return isDarkTheme;
    }

    get isSearchActive(): boolean {
        const isSearchActive = this.searchQuery.trim().length > 0;

        return isSearchActive;
    }

    get submitButtonLabel(): string {
        let buttonLabel = 'Добавить заметку';

        if (this.isSubmittingNote && this.isEditMode) {
            buttonLabel = 'Сохранение...';
        } else if (this.isSubmittingNote) {
            buttonLabel = 'Добавление...';
        } else if (this.isEditMode) {
            buttonLabel = 'Сохранить изменения';
        }

        return buttonLabel;
    }

    get formTitle(): string {
        const title = this.isEditMode ? 'Редактировать заметку' : 'Создать заметку';

        return title;
    }

    get themeToggleLabel(): string {
        const label = this.isDarkTheme ? 'Включить светлую тему' : 'Включить тёмную тему';

        return label;
    }

    get themeToggleIcon(): string {
        const icon = this.isDarkTheme ? '☀️' : '🌙';

        return icon;
    }

    get isNoteSubmitDisabled(): boolean {
        const hasValidationError = this.getNoteFormValidationError() !== null;
        const isNoteSubmitDisabled = this.isSubmittingNote || hasValidationError;

        return isNoteSubmitDisabled;
    }

    get emptyStateTitle(): string {
        const title = this.isSearchActive ? 'Ничего не найдено' : 'Пока нет заметок';

        return title;
    }

    get emptyStateDescription(): string {
        const description = this.isSearchActive
            ? 'Попробуйте изменить поисковый запрос или выбрать другую сортировку.'
            : 'Создайте первую заметку — она появится здесь.';

        return description;
    }

    get emptyStateIcon(): string {
        const icon = this.isSearchActive ? '🔍' : '📝';

        return icon;
    }

    onNoteFormChange(): void {
        this.persistDraft();
    }

    onNoteSubmit(): void {
        const validationError = this.getNoteFormValidationError();

        if (validationError !== null) {
            this.errorMessage = validationError;

            return;
        }

        const notePayload = this.buildNotePayload();

        this.errorMessage = null;

        if (this.isEditMode) {
            this.updateEditedNote(notePayload);
        } else {
            this.createNote(notePayload);
        }
    }

    onEditStart(note: Note): void {
        this.editingNoteId = note.id;
        this.noteFormModel = {
            title: note.title,
            content: note.content,
        };
        this.errorMessage = null;
        this.persistDraft();
    }

    onEditCancel(): void {
        this.resetFormState();
        this.errorMessage = null;
        this.showToast('Редактирование отменено.', 'info');
    }

    onDeleteRequest(note: Note): void {
        this.notePendingDeletion = note;
        this.errorMessage = null;
    }

    onDeleteCancel(): void {
        this.notePendingDeletion = null;
    }

    onDeleteConfirm(): void {
        const notePendingDeletion = this.notePendingDeletion;

        if (notePendingDeletion === null) {
            return;
        }

        const noteId = notePendingDeletion.id;

        this.errorMessage = null;
        this.deletingNoteId = noteId;

        this.notesRepository
            .deleteNote(noteId)
            .pipe(
                finalize((): void => {
                    this.deletingNoteId = null;
                }),
            )
            .subscribe({
                next: (): void => {
                    this.notes = this.notes.filter((note: Note): boolean => note.id !== noteId);

                    if (this.editingNoteId === noteId) {
                        this.resetFormState();
                    }

                    this.notePendingDeletion = null;
                    this.showToast('Заметка удалена.', 'success');
                },
                error: (): void => {
                    this.errorMessage = DELETE_NOTE_ERROR_MESSAGE;
                },
            });
    }

    onNotePinToggle(note: Note): void {
        const nextPinnedState = !note.isPinned;

        this.errorMessage = null;
        this.togglingPinnedNoteId = note.id;

        this.notesRepository
            .setNotePinned(note, nextPinnedState)
            .pipe(
                finalize((): void => {
                    this.togglingPinnedNoteId = null;
                }),
            )
            .subscribe({
                next: (updatedNote: Note): void => {
                    this.notes = this.notes.map(
                        (storedNote: Note): Note =>
                            storedNote.id === updatedNote.id ? updatedNote : storedNote,
                    );

                    this.showToast(
                        nextPinnedState ? 'Заметка закреплена.' : 'Закрепление снято.',
                        'success',
                    );
                },
                error: (): void => {
                    this.errorMessage = PIN_NOTE_ERROR_MESSAGE;
                },
            });
    }

    onSearchClear(): void {
        this.searchQuery = '';
    }

    onDataSourceChange(dataSource: NotesDataSource): void {
        const isDataSourceChanged = dataSource !== this.selectedDataSource;

        if (isDataSourceChanged) {
            this.notesDataSourceService.setDataSource(dataSource);
            window.location.reload();
        }
    }

    onThemeToggle(): void {
        const nextTheme: Theme = this.isDarkTheme ? LIGHT_THEME : DARK_THEME;

        this.currentTheme = nextTheme;
        this.themeService.setTheme(nextTheme);
        this.applyTheme();
    }

    onToastDismiss(toastId: number): void {
        this.dismissToast(toastId);
    }

    private loadNotes(): void {
        this.errorMessage = null;
        this.isLoadingNotes = true;

        this.notesRepository
            .getNotes()
            .pipe(
                finalize((): void => {
                    this.isLoadingNotes = false;
                }),
            )
            .subscribe({
                next: (notes: Note[]): void => {
                    this.notes = notes;
                    this.ensureEditingNoteExists();
                },
                error: (): void => {
                    this.errorMessage = LOAD_NOTES_ERROR_MESSAGE;
                },
            });
    }

    private createNote(notePayload: CreateNotePayload): void {
        this.isSubmittingNote = true;

        this.notesRepository
            .addNote(notePayload)
            .pipe(
                finalize((): void => {
                    this.isSubmittingNote = false;
                }),
            )
            .subscribe({
                next: (createdNote: Note): void => {
                    this.notes = [createdNote, ...this.notes];
                    this.resetFormState();
                    this.showToast('Заметка создана.', 'success');
                },
                error: (): void => {
                    this.errorMessage = CREATE_NOTE_ERROR_MESSAGE;
                },
            });
    }

    private updateEditedNote(notePayload: CreateNotePayload): void {
        const editingNote = this.getEditingNote();

        if (editingNote === null) {
            this.errorMessage = UPDATE_NOTE_ERROR_MESSAGE;

            return;
        }

        const updateNotePayload = this.buildUpdateNotePayload(editingNote, notePayload);

        this.isSubmittingNote = true;

        this.notesRepository
            .updateNote(editingNote.id, updateNotePayload)
            .pipe(
                finalize((): void => {
                    this.isSubmittingNote = false;
                }),
            )
            .subscribe({
                next: (updatedNote: Note): void => {
                    this.notes = this.notes.map(
                        (note: Note): Note => (note.id === updatedNote.id ? updatedNote : note),
                    );
                    this.resetFormState();
                    this.showToast('Изменения сохранены.', 'success');
                },
                error: (): void => {
                    this.errorMessage = UPDATE_NOTE_ERROR_MESSAGE;
                },
            });
    }

    private buildNotePayload(): CreateNotePayload {
        const notePayload: CreateNotePayload = {
            title: this.noteFormModel.title.trim(),
            content: this.noteFormModel.content.trim(),
        };

        return notePayload;
    }

    private buildUpdateNotePayload(
        editingNote: Note,
        notePayload: CreateNotePayload,
    ): UpdateNotePayload {
        const updateNotePayload: UpdateNotePayload = {
            title: notePayload.title,
            content: notePayload.content,
            createdAt: editingNote.createdAt,
            isPinned: editingNote.isPinned,
        };

        return updateNotePayload;
    }

    private getEditingNote(): Note | null {
        const editingNoteId = this.editingNoteId;
        const editingNote =
            editingNoteId === null
                ? null
                : (this.notes.find((note: Note): boolean => note.id === editingNoteId) ?? null);

        return editingNote;
    }

    private getNoteFormValidationError(): string | null {
        const trimmedTitle = this.noteFormModel.title.trim();
        const trimmedContent = this.noteFormModel.content.trim();

        let validationError: string | null = null;

        if (trimmedTitle.length === 0 || trimmedContent.length === 0) {
            validationError = EMPTY_NOTE_ERROR_MESSAGE;
        } else if (this.noteFormModel.title.length > this.titleMaxLength) {
            validationError = TITLE_TOO_LONG_ERROR_MESSAGE;
        } else if (this.noteFormModel.content.length > this.contentMaxLength) {
            validationError = CONTENT_TOO_LONG_ERROR_MESSAGE;
        }

        return validationError;
    }

    private resetFormState(): void {
        this.editingNoteId = null;
        this.noteFormModel = {
            title: '',
            content: '',
        };
        this.noteFormDraftService.clearDraft();
    }

    private restoreDraft(): void {
        const savedDraft = this.noteFormDraftService.getDraft();

        if (savedDraft === null) {
            return;
        }

        const hasDraftContent =
            savedDraft.title.trim().length > 0 ||
            savedDraft.content.trim().length > 0 ||
            savedDraft.editingNoteId !== null;

        if (hasDraftContent) {
            this.noteFormModel = {
                title: savedDraft.title,
                content: savedDraft.content,
            };
            this.editingNoteId = savedDraft.editingNoteId;
            this.showToast('Черновик восстановлен.', 'info');
        } else {
            this.noteFormDraftService.clearDraft();
        }
    }

    private persistDraft(): void {
        const hasDraftContent =
            this.noteFormModel.title.trim().length > 0 ||
            this.noteFormModel.content.trim().length > 0 ||
            this.editingNoteId !== null;

        if (hasDraftContent) {
            this.noteFormDraftService.saveDraft({
                title: this.noteFormModel.title,
                content: this.noteFormModel.content,
                editingNoteId: this.editingNoteId,
            });
        } else {
            this.noteFormDraftService.clearDraft();
        }
    }

    private ensureEditingNoteExists(): void {
        const editingNoteId = this.editingNoteId;

        if (editingNoteId === null) {
            return;
        }

        const editingNoteExists = this.notes.some(
            (note: Note): boolean => note.id === editingNoteId,
        );

        if (!editingNoteExists) {
            this.editingNoteId = null;
            this.persistDraft();
        }
    }

    private getVisibleNotes(
        notes: Note[],
        searchQuery: string,
        sortOption: NoteSortOption,
    ): Note[] {
        const filteredNotes = this.filterNotes(notes, searchQuery);
        const visibleNotes = this.sortNotes(filteredNotes, sortOption);

        return visibleNotes;
    }

    private filterNotes(notes: Note[], searchQuery: string): Note[] {
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        const filteredNotes =
            normalizedSearchQuery.length === 0
                ? notes
                : notes.filter((note: Note): boolean => {
                      const matchesTitle = note.title.toLowerCase().includes(normalizedSearchQuery);
                      const matchesContent = note.content
                          .toLowerCase()
                          .includes(normalizedSearchQuery);
                      const matchesSearchQuery = matchesTitle || matchesContent;

                      return matchesSearchQuery;
                  });

        return filteredNotes;
    }

    private sortNotes(notes: Note[], sortOption: NoteSortOption): Note[] {
        const sortedNotes = [...notes].sort((firstNote: Note, secondNote: Note): number =>
            this.compareNotes(firstNote, secondNote, sortOption),
        );

        return sortedNotes;
    }

    private getRelevantUpdatedAt(note: Note): string {
        const relevantUpdatedAt = note.updatedAt ?? note.createdAt;

        return relevantUpdatedAt;
    }

    private compareNotes(firstNote: Note, secondNote: Note, sortOption: NoteSortOption): number {
        const pinnedComparison = this.comparePinnedNotes(firstNote, secondNote);

        if (pinnedComparison !== 0) {
            return pinnedComparison;
        }

        let comparisonResult = 0;

        switch (sortOption) {
            case 'oldest':
                comparisonResult =
                    this.toTimestamp(firstNote.createdAt) - this.toTimestamp(secondNote.createdAt);
                break;
            case 'recentlyUpdated':
                comparisonResult =
                    this.toTimestamp(this.getRelevantUpdatedAt(secondNote)) -
                    this.toTimestamp(this.getRelevantUpdatedAt(firstNote));
                break;
            case 'titleAsc':
                comparisonResult = firstNote.title.localeCompare(secondNote.title, 'ru-RU');
                break;
            case 'titleDesc':
                comparisonResult = secondNote.title.localeCompare(firstNote.title, 'ru-RU');
                break;
            case 'newest':
            default:
                comparisonResult =
                    this.toTimestamp(secondNote.createdAt) - this.toTimestamp(firstNote.createdAt);
                break;
        }

        return comparisonResult;
    }

    private comparePinnedNotes(firstNote: Note, secondNote: Note): number {
        const firstPinnedOrder = firstNote.isPinned ? 0 : 1;
        const secondPinnedOrder = secondNote.isPinned ? 0 : 1;
        const pinnedComparison = firstPinnedOrder - secondPinnedOrder;

        return pinnedComparison;
    }

    private toTimestamp(value: string | null): number {
        const timestamp = value === null ? 0 : new Date(value).getTime();
        const safeTimestamp = Number.isNaN(timestamp) ? 0 : timestamp;

        return safeTimestamp;
    }

    private applyTheme(): void {
        this.document.body.classList.toggle('theme-dark', this.isDarkTheme);
        this.document.documentElement.classList.toggle('theme-dark', this.isDarkTheme);
    }

    private showToast(message: string, type: ToastType): void {
        const toastId = this.nextToastId;
        const toast: ToastNotification = {
            id: toastId,
            message,
            type,
        };

        this.nextToastId += 1;
        this.toastNotifications = [...this.toastNotifications, toast];

        const timeoutId = window.setTimeout((): void => {
            this.dismissToast(toastId);
        }, TOAST_DURATION_MS);

        this.toastTimeoutIds.set(toastId, timeoutId);
    }

    private dismissToast(toastId: number): void {
        const timeoutId = this.toastTimeoutIds.get(toastId);

        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
            this.toastTimeoutIds.delete(toastId);
        }

        this.toastNotifications = this.toastNotifications.filter(
            (toast: ToastNotification): boolean => toast.id !== toastId,
        );
    }
}
