import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import { Server } from "http";
import { Config } from "./Config";
import { Router, NextFunction } from 'express-serve-static-core';
import { EventEmitter } from 'events';
import { LandroidS } from './LandroidS';
import { Mqtt } from './Mqtt';
import { getLogger, Logger, configure as configureLog4js } from "log4js";

export class App extends EventEmitter {
    private static readonly INSTANCE: App = new App();
    public readonly express: express.Application;
    public server: Server;
    public mqtt: Mqtt;
    public devEnvironment: boolean = false;
    private log: Logger;

    constructor() {
        super();
        if (App.INSTANCE) {
            throw new Error("Call App.getInstance() instead!");
        }
        this.log = getLogger(this.constructor.name);
        this.devEnvironment = (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === "dev");
        this.log.info("Dev mode = %s", this.devEnvironment);
        if (this.devEnvironment) {
            Config.getInstance().loadDevConfig();
        }
        configureLog4js({
            appenders: {
                out: { type: 'stdout' }
            },
            categories: {
                default: {
                    appenders: ["out"],
                    level: (Config.getInstance().get("logLevel") ? Config.getInstance().get("logLevel") : "info")
                }
            }
        });
        process.on("SIGINT", this.exitOnSignal.bind(this));
        process.on("SIGTERM", this.exitOnSignal.bind(this));
        process.on("uncaughtException", this.handleUnknownException.bind(this));
        process.on("unhandledRejection", this.handleUnknownRejection.bind(this));
        this.express = express();
    }

    public start(): void {
        this.setupMqtt();
        this.express.set("trust proxy", true);
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));
        LandroidS.getInstance().init();
    }

    private setupMqtt(): void {
        this.mqtt = Mqtt.getInstance();
    }

    private exitOnSignal(): void {
        this.log.info("Received exit signal...");
        process.exit(0);
    }

    private handleUnknownException(e: Error): void {
        this.log.error("Unhandled exception: %s", e);
    }

    private handleUnknownRejection(reason: Error, p: Promise<any>): void {
        this.log.error("Unhandled rejection: %s", reason);
    }

    public static getInstance(): App {
        return App.INSTANCE;
    }
}
