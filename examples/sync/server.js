import { createServer } from "actorial";
import config from "./agent.config.js";
createServer(config).listen(4004, () => console.log("sync mock on http://localhost:4004"));
