import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';

import { NOTES_REPOSITORY_PROVIDER } from './core/notes-repository.provider';

export const appConfig: ApplicationConfig = {
    providers: [provideHttpClient(), NOTES_REPOSITORY_PROVIDER],
};
