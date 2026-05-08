export type BibleVerse = {
  reference: string;
  passage: string;
  version: string;
  book?: string;
  chapter?: string;
  verses?: string;
};

export async function lookupBibleVerse(reference: string): Promise<BibleVerse> {
  const response = await fetch(`/api/bible/verse?reference=${encodeURIComponent(reference)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to look up verse');
  }

  return data as BibleVerse;
}
