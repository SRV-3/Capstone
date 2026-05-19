import { Router } from "express";
import agent from "../agents/code.agent.js";

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
  try {
    const { message, projectId } = req.body;

    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const writer = (text) => res.write(text);

    const response = await agent.stream(
      {
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        context: {
          projectId,
          writer,
        },
        streamMode: "custom",
      },
    );
    for await (const chunk of response) {
      console.log(chunk);
      res.write(`data: ${chunk}\n\n`);
    }
    // walk lastState.messages in reverse to find the final AI message (no tool_calls)
    // write it to the stream, then:
    return res.end();
  } catch (error) {
    console.error("Error invoking agent:", error);
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ error: "Failed to invoke agent" });
    }
  }
});

export default agentRouter;
