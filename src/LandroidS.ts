import * as LandroidCloud from "iobroker.landroid-s/lib/mqttCloud";
import { Config } from "./Config";
import { Mqtt } from "./Mqtt";
import { IoBrokerAdapter } from "./IoBrokerAdapter";
import { getLogger, Logger } from "log4js";

export class LandroidS {
    private static INSTANCE: LandroidS = new LandroidS();
    private static INIT_TIMEOUT: number = 60;
    private initialized: boolean = false;
    private landroidCloud: LandroidCloud;
    private firstCloudMessageCallback: Function = null;
    private log: Logger;

    constructor() {
        if (LandroidS.INSTANCE) {
            throw new Error("Call LandroidS.getInstance() instead!");
        }
        this.log = getLogger(this.constructor.name);
    }

    public startMower(): void {
        this.sendMessage(1);
    }

    public pauseMower(): void {
        this.sendMessage(2);
    }

    public stopMower(): void {
        this.sendMessage(3);
    }

    public setTimeExtension(timeExtension: number): void {
        if (isNaN(timeExtension) || timeExtension < -100 || timeExtension > 100) {
            throw Error("Time extension must be >= -100 and <= 100");
        }
        timeExtension = Number(timeExtension);
        this.log.info("Setting time extension to %d", timeExtension);
        this.sendMessage(null, {sc: {p: timeExtension}});
    }

    public setRainDelay(rainDelay: number): void {
        if (isNaN(rainDelay) || rainDelay < 0 || rainDelay > 300) {
            throw Error("Rain delay must be >= 0 and <= 300");
        }
        rainDelay = Number(rainDelay);
        this.log.info("Setting rain delay to %d", rainDelay);
        this.sendMessage(null, {rd: rainDelay});
    }

    public setSchedule(val: string|Object): void {
        this.sendMessage(null, {sc: {d: this.jsonToObject(val)}});
    }

    public poll(): void {
        this.sendMessage(null, {});
    }

    public setJson(val: string|Object): void {
        this.sendMessage(null, this.jsonToObject(val));
    }

    private timePeriodToCloudArray(timePeriod: any): Array<any> {
        return [
            ("00" + timePeriod["startHour"]).slice(-2) + ":" + ("00" + timePeriod["startMinute"]).slice(-2),
            parseInt(timePeriod["durationMinutes"], 10),
            (timePeriod["cutEdge"] ? 1 : 0)
        ];
    }

    private jsonToObject(json: string|Object) {
        if (typeof(json) === "string") {
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        } else {
            return json;
        }
    }

    public init(): Promise<void> {
        let adapter: IoBrokerAdapter = new IoBrokerAdapter(Config.getInstance().get("landroid-s"));
        let doInit = function() {
            this.landroidCloud = new LandroidCloud(adapter);
            this.landroidCloud.init(this.updateListener.bind(this));
        };
        return new Promise((resolve, reject) => {
            if (this.initialized) {
                reject(new Error("Already initialized!"));
            }
            this.initialized = true;
            this.log.info("Initializing Landroid Cloud Service...");
            Mqtt.getInstance().on("mqttMessage", this.onMqttMessage.bind(this));
            let retryInterval;
            let onFirstCloudUpdate = function() {
                this.log.info("First cloud update received, finishing initialization");
                clearInterval(retryInterval);
                resolve();
            };
            let tryCount = 0;
            let retryInit = function() {
                tryCount++;
                if (tryCount > 1) {
                    this.log.info("Could not finish initialization, retrying...");
                    this.landroidCloud.updateListener = null;
                    delete this.landroidCloud;
                }
                this.firstCloudMessageCallback = onFirstCloudUpdate;
                doInit.bind(this)();
            };
            retryInterval = setInterval(retryInit.bind(this), LandroidS.INIT_TIMEOUT * 1000);
            retryInit.bind(this)();
        });
    }

    private sendMessage(cmd?: number, params?: Object): void {
        let message: Object = {};
        if (cmd) {
            message["cmd"] = cmd;
        }
        if (params) {
            message = Object.assign(message, params);
        }
        let outMsg = JSON.stringify(message);
        this.log.info("Sending to landroid cloud: %s", outMsg);
        this.landroidCloud.sendMessage(outMsg);
    }

    private updateListener(status: any): void {
        Mqtt.getInstance().publish("", JSON.stringify(status), true);
        if (this.firstCloudMessageCallback) {
            this.firstCloudMessageCallback();
            this.firstCloudMessageCallback = null;
        }
    }

    private onMqttMessage(topic: string, payload: any): void {
        try {
            if (topic === "set/start") {
                this.startMower();
            } else if (topic === "set/stop") {
                this.stopMower();
            } else if (topic === "set/pause") {
                this.pauseMower();
            } else if (topic === "set/mow") {
                if (String(payload) === "start") {
                    this.startMower();
                } else if (String(payload) === "stop") {
                    this.stopMower();
                } else if (String(payload) === "pause") {
                    this.pauseMower();
                } else {
                    this.log.error("Invalid MQTT payload for topic %s: %s", topic, payload);
                }
            } else if (topic === "set/rainDelay") {
                this.setRainDelay(payload);
            } else if (topic === "set/timeExtension") {
                this.setTimeExtension(payload);
            } else if (topic === "set/schedule") {
                this.setSchedule(String(payload));
            } else if (topic === "set/poll") {
                this.poll();
            } else if (topic === "set/json") {
                this.setJson(String(payload));
            } else {
                this.log.error("Unknown MQTT topic: %s", topic);
            }
        } catch (e) {
            this.log.error("Invalid MQTT payload for topic %s: %s", topic, e);
        }
    }

    public static getInstance(): LandroidS {
        return LandroidS.INSTANCE;
    }
}
