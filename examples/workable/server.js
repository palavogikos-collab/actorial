import { createServer } from "actorial";
import config from "./agent.config.js";
createServer(config).listen(4005, () => console.log("workable mock on http://localhost:4005"));
