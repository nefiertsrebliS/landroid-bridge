# Landroid Bridge mainly for IP-Symcon
Publishes readings from the Worx Landroid S Lawn Mower via MQTT. Allows for modifying settings via MQTT.

### THIS BRIDGE IS OUT OF SERVICE. PLEASE USE THE [NEW ONE](https://github.com/nefiertsrebliS/mqtt-landroid-bridge)

## Changelog

| Version | Changes          |
| --------|------------------|
| V1.00   | Baseversion      |
| V1.01   | New: set/json    |

## Setup
### Prerequisites
* To use MQTT, you need to have an MQTT Broker like [IP-Symcon V5.0 or newer](https://www.symcon.de/) or [Eclipse Mosquitto](http://mosquitto.org/) installed.

### Building from source
1. Make sure you have [Node.js](https://nodejs.org) installed (tested with Node.js v11).
1. Check out the source code and build it:
    ```
    git clone https://github.com/nefiertsrebliS/landroid-bridge.git
    cd landroid-bridge
    npm install
    npm run grunt
    ```
1. Update ```config.json``` to match your environment.
1. Run the server:
    ```
    node dist/server.js
    ```
1. Optional (Linux only): 
    1. Set up an init.d script to start the bridge on system startup (see example in initd-script folder).
    1. Set up a systemctl script to start the bridge on system startup (see example in systemctl-script folder).

### Security
Landroid Bridge does not feature any authentication or authorization right now. Make sure to use strong passwords to authenticate with your MQTT broker. 

## Setting up MQTT
To connect to an MQTT broker without any authentication, please modify your config.json like this:

```
"mqtt": {
    "enable": true,
    "url": "mqtt://localhost",
    "topic": "landroid"
}
```

If your MQTT broker requires username/password authentication:

```
"mqtt": {
    "enable": true,
    "url": "mqtt://username:password@localhost",
    "topic": "landroid"
}
```

To use SSL/TLS, specify the paths to the CA, Key and Cert files (paths relative to the bridge's working directory). You can optionally allow self-signed certificates:

```
"mqtt": {
    "enable": true,
    "url": "mqtts://localhost",
    "topic": "landroid",
    "caFile": "./optional_path_to_ca_file.crt",
    "keyFile": "./optional_path_to_key_file.key",
    "certFile": "./optional_path_to_cert_file.crt",
    "allowSelfSigned": true
}
```

## Managing multiple mowers
If you have more than one mower connected to your Landroid Account, you can set the mower to be selected by changing the ```dev_sel``` value in the ```config.json``` file. The default value is 0 (zero-based for the first mower in your account).

If you want to manage more than one mower with this Landroid Bridge, please start multiple instances of the bridge, each with a differnt ```dev_sel``` value. You'll need to set a unique HTTP Port and MQTT Topic per instance then.

## Connecting to IP-Symcon
To connect this Landroid Bridge to [IP-Symcon](https://www.symcon.de/), add the [MQTTworx-Modul](https://github.com/nefiertsrebliS/MQTTworx) to your Symcon-installation after Landroid Bridge is up and running successfully (see above).

## MQTT Topics
## Published by the bridge (you can listen on these topics with your application)
* landroid

### Published by your application (the bridge will perform updates)
* landroid/set/start (starts the mower)
* landroid/set/stop (stops the mower and sends it home)
* landroid/set/pause (stops the mower)
* landroid/set/mow (payload "start" starts the mower, "stop" sends the mover home, "pause" stops the mower)
* landroid/set/rainDelay (sets rain delay in minutes, supply delay value as payload)
* landroid/set/timeExtension (sets time extension in percent, supply percentage value as payload)
* landroid/set/schedule (sets work time for week – see examples below)
* landroid/set/poll (polls data from landroid cloud)

### Examples
The following examples use the mosquitto_pub command line util of the Mosquitto MQTT broker.

Starting the mower:
```
mosquitto_pub -t landroid/set/start
```

Setting rain delay to 120 minutes:
```
mosquitto_pub -t landroid/set/rainDelay -m 120
```

Setting week's work time. First day is Sunday. Please use the following format for each day: ["Starttime", minutes to go, edge cut]:
```
mosquitto_pub -t landroid/set/schedule -m '[["14:23",123,0],["17:01",23,1],["10:30",0,0],["11:00",0,0],["11:00",0,0],["11:00",0,0],["11:00",60,0]]'
```
