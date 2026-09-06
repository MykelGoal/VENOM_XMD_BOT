import { createCollection } from '../index';

interface NoteModel extends Record<string, unknown> {
  /** key = `${number}:${name}` */
  key: string;
  number: string;
  name: string;
  content: string;
  createdAt: number;
}

const notes = createCollection<NoteModel>('notes');

function keyFor(number: string, name: string): string {
  return `${number}:${name.toLowerCase()}`;
}

export const noteRepo = {
  set(number: string, name: string, content: string): void {
    notes.set(keyFor(number, name), {
      key: keyFor(number, name),
      number,
      name,
      content,
      createdAt: Date.now(),
    });
  },
  get(number: string, name: string): NoteModel | undefined {
    return notes.get(keyFor(number, name));
  },
  delete(number: string, name: string): boolean {
    if (!notes.get(keyFor(number, name))) return false;
    notes.delete(keyFor(number, name));
    return true;
  },
  list(number: string): NoteModel[] {
    return notes.all().filter((n) => n.number === number);
  },
  clearAll(number: string): number {
    const mine = this.list(number);
    for (const n of mine) notes.delete(n.key);
    return mine.length;
  },
};
