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
        },
        streamMode: "custom",
      },
    );
    for await (const chunk of response) {
      console.log(chunk);
      res.write(`data: ${chunk}\n\n`);
    }
    return res.status(200).json({ response });
  } catch (error) {
    console.error("Error invoking agent:", error);
    return res.status(500).json({ error: "Failed to invoke agent" });
  }
});

export default agentRouter;
