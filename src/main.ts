import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { setLogLevel, LogLevel } from '@angular/fire';

// Silence AngularFire zone warnings in development
// NOTE: Remove or change to LogLevel.DEBUG for production
setLogLevel(LogLevel.SILENT);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
