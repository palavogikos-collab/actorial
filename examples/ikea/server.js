import { createServer } from "actorial";
import config from "./agent.config.js";
createServer(config).listen(4002, () => console.log("ikea mock on http://localhost:4002"));
