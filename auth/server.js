import app from "./src/app.js";
import { connectToDb } from "./src/config/db.js";

const PORT = process.env.PORT || 3000;

connectToDb();

app.listen(PORT, () => {
  console.log(`AUTH server is running on port ${PORT}`);
});
