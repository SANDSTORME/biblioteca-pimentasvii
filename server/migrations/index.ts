import { initialSchemaMigration } from './001-initial-schema';
import { libraryEvolutionMigration } from './002-library-evolution';

export interface MigrationDefinition {
  id: string;
  description: string;
  statements: readonly string[];
}

export const migrations: MigrationDefinition[] = [initialSchemaMigration, libraryEvolutionMigration];
