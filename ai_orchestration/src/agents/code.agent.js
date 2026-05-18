import "dotenv/config";
import { ChatMistralAI } from "@langchain/mistralai";
import { listFile, readFile, updateFile } from "./tool.js";
import { createAgent } from "langchain";

const model = new ChatMistralAI({
  model: "mistral-medium-latest",
  apiKey: process.env.MISTRAL_API_KEY,
});

const agent = createAgent({
  model,
  tools: [listFile, readFile, updateFile],
});

await agent.invoke({
  messages: [
    {
      role: "user",
      content: "create a simple snake gane in the project using react and css.",
    },
  ],
});
