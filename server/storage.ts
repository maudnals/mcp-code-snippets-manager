import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const SNIPPETS_FILE = path.join(__dirname, "./snippets.json");

interface Snippet {
  id: string;
  userId: string;
  title: string;
  language: string;
  code: string;
}

interface StorageData {
  snippets: Snippet[];
}

// Helper to read data from the JSON file
async function readSnippets(): Promise<StorageData> {
  try {
    const fileContent = await fs.readFile(SNIPPETS_FILE, "utf-8");
    return JSON.parse(fileContent) as StorageData;
  } catch (error) {
    // If the file doesn't exist or is empty, return an empty structure
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { snippets: [] };
    }
    console.error("Error reading snippets file:", error);
    throw new Error("Could not read snippets data.");
  }
}

// Helper to write data to the JSON file
async function writeSnippets(data: StorageData): Promise<void> {
  try {
    await fs.writeFile(SNIPPETS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing snippets file:", error);
    throw new Error("Could not save snippets data.");
  }
}

// --- CRUD Operations ---

export async function getSnippetsByUserId(userId: string): Promise<Snippet[]> {
  const data = await readSnippets();
  return data.snippets.filter((snippet) => snippet.userId === userId);
}

export async function createSnippet(
  userId: string,
  title: string,
  language: string,
  code: string
): Promise<Snippet> {
  const data = await readSnippets();
  const newSnippet: Snippet = {
    id: uuidv4(),
    userId,
    title,
    language,
    code,
  };
  data.snippets.push(newSnippet);
  await writeSnippets(data);
  return newSnippet;
}

export async function updateSnippet(
  userId: string,
  id: string,
  title: string,
  language: string,
  code: string
): Promise<Snippet | null> {
  const data = await readSnippets();
  const snippetIndex = data.snippets.findIndex(
    (s) => s.id === id && s.userId === userId
  );
  if (snippetIndex === -1) {
    return null; // Not found or not owned by user
  }
  const updatedSnippet = {
    ...data.snippets[snippetIndex],
    title,
    language,
    code,
  };
  data.snippets[snippetIndex] = updatedSnippet;
  await writeSnippets(data);
  return updatedSnippet;
}

export async function deleteSnippet(
  userId: string,
  id: string
): Promise<boolean> {
  const data = await readSnippets();
  const initialLength = data.snippets.length;
  data.snippets = data.snippets.filter(
    (s) => !(s.id === id && s.userId === userId)
  );
  if (data.snippets.length < initialLength) {
    await writeSnippets(data);
    return true; // Deleted
  }
  return false; // Not found or not owned by user
}
