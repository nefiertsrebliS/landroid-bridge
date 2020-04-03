import * as debug from 'debug';
import { App } from './App';
import { Config } from './Config';
import { getLogger, Logger, configure as configureLog4js } from "log4js";

configureLog4js({
    appenders: {
        out: { type: 'stdout' }
    },
    categories: {
        default: { appenders: ["out"], level: "debug" }
    }
});
const log: Logger = getLogger("server.ts");

log.info("Starting Landroid Bridge...");

debug('ts-express:server');

App.getInstance().start();
