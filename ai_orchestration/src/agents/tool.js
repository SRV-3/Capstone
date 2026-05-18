import axios from "axios";
import { tool } from "langchain";
import * as z from "zod";

export const listFile = tool(
  async ({}) => {
    console.log("=========================================");
    console.log("using llist files tool");
    console.log("=========================================");
    const response = await axios.get("http://019e3b45-6925-74bb-b2fc-7e7a279a6ba3.agent.localhost/list-files");
    console.log("=========================================");
    console.log("response:", response.data);
    console.log("=========================================");

    return JSON.stringify(response.data.files);
  },
  {
    name: "list_files",
    description: "List all the files in the project director. This is useful for understanding what files are available to work with.",
    schema: z.object({}),
  },
);

export const readFile = tool(
  async ({ files }) => {
    console.log("=========================================");
    console.log("using read files tool");
    console.log("=========================================");
    const response = await axios.get(`http://019e3b45-6925-74bb-b2fc-7e7a279a6ba3.agent.localhost/read-files?files=` + files.join(","));
    console.log("=========================================");
    console.log("response:", response.data);
    console.log("=========================================");
    return JSON.stringify(response.data.data);
  },
  {
    name: "read_file",
    description: "Read the content of a file. This is useful for understanding the content of a files that are relevant to the task at hand",
    schema: z.object({
      files: z
        .array(z.string())
        .describe("The list of files absolute paths to read. These should be files that were listed using the list_files tool or created later"),
    }),
  },
);

export const updateFile = tool(
  async ({ files }) => {
    console.log("=========================================");
    console.log("using update and creates files tool");
    console.log(files);
    console.log("=========================================");
    const response = await axios.patch(`http://019e3b45-6925-74bb-b2fc-7e7a279a6ba3.agent.localhost/update-files`, {
      updates: files,
    });
    console.log("=========================================");
    console.log("response:", response.data);
    console.log("=========================================");

    return JSON.stringify(response.data.data);
  },
  {
    name: "update_file",
    description:
      "Update the contents of specified files. This is useful for making changes to files based on the requirements of the task at hand. this tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field. ",
    schema: z.object({
      files: z
        .array(
          z.object({
            file: z.string().describe("The absolute path of the file to update"),
            content: z.string().describe("The new content of the file"),
          }),
        )
        .describe("The list of files to update with their new content. "),
    }),
  },
);

// export const createFile = tool(
//   async ({ files }) => {
//     const response = await axios.post(
//       `http://019e3b45-6925-74bb-b2fc-7e7a279a6ba3.agent.localhost/create-files`,
//       {
//         files,
//       },
//     );
//     return JSON.stringify(response.data.data);
//   },
//   {
//     name: "create_file",
//     description:
//       "Create new files with the specified content. This is useful for creating new files that are relevant to the task at hand.",
//     inputSchema: z.object({
//       files: z
//         .array(
//           z.object({
//             file: z
//               .string()
//               .describe("The absolute path of the file to create"),
//             content: z.string().describe("The content of the file to create"),
//           }),
//         )
//         .describe("The list of files to create with their content. "),
//     }),
//   },
// );
