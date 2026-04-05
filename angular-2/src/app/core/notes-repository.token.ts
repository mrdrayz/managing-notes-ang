import { InjectionToken } from '@angular/core';

import { NotesRepository } from './notes-repository.interface';

export const NOTES_REPOSITORY = new InjectionToken<NotesRepository>('NOTES_REPOSITORY');
