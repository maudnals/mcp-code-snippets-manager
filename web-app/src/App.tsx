import { useEffect, useState } from "react";
import "./App.css";
import { SnippetCard } from "./SnippetCard";
import type { Snippet } from "./types";
// import { useWidgetProps } from "../use-widget-props";

function App() {
  const [count, setCount] = useState(0);
  const [snippetList, setSnippetList] = useState([] as Snippet[]);
  // const [toolOutput, setToolOutput] = useState("");
  // const toolOutput = useWidgetProps<{
  //   text?: string;
  //   result?: { structuredContent?: { result?: string } };
  // }>();

  // on mount
  useEffect(() => {
    console.log("mounted. calling useEffect");
    // Call tool
    listSnippets();
  }, []);

  // async function callT() {
  //   const r = await window.openai.callTool("hello", { name: "maud" });
  //   setToolOutput(r);
  // }

  // Function that calls the MCP tool
  async function listSnippets() {
    console.log("listing snippets");
    // setIsSaving(true);
    // setFormState(next);
    // window.openai.setWidgetState(widgetId, next);

    const result = await window.openai.callTool("get_snippets");
    console.log("snippets", result.structuredContent.snippetsAsArr);
    setSnippetList(result.structuredContent.snippetsAsArr);
    // const snippetList = result?.structuredContent?.snippets;

    // const updated = result?.structuredContent?.preferences ?? next;
    // setFormState(updated);
    // window.openai.setWidgetState(widgetId, updated);
    // setIsSaving(false);
  }

  return (
    <>
      <p>Hey from React component!</p>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <div>
          Returned from tool call:
          {snippetList.map((s) => (
            <SnippetCard
              id={s.id}
              userId={s.userId}
              title={s.title}
              language={s.language}
              code={s.code}
            ></SnippetCard>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
