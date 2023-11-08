import { API, APIEvent, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { WeatherFlowTempestPlatformAccessory } from './platformAccessory';

import { TempestApi, TempestSocket, Observation } from './tempest';

interface TempestSensor {
  name: string;
  sensor_type: string;
  temperature_properties: [value_key: string];
  humidity_properties: [value_key: string];
  light_properties: [value_key: string];
  motion_properties: [value_key: string, trigger_value: number];
  fan_properties: [value_key: string];
  occupancy_properties: [value_key: string, trigger_value: number];
}

/**
 * WeatherFlowTempestPlatform
 */
export class WeatherFlowTempestPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  private tempestApi: TempestApi | undefined;
  private tempestSocket: TempestSocket | undefined;

  public observation_data: Observation;  // Observation data for Accessories to use.
  public tempest_battery_level!: number; // Tempest battery level
  public tempest_device_id!: number;     // Tempest device ID

  private activeAccessory: PlatformAccessory[] = []; // array of active Tempest sensors

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    log.info('Finished initializing platform:', this.config.name);

    // Initialize observation_data
    this.observation_data = {
      air_temperature: 0,
      barometric_pressure: 0,
      relative_humidity: 0,
      precip: 0,
      precip_accum_local_day: 0,
      wind_avg: 0,
      wind_direction: 0,
      wind_gust: 0,
      solar_radiation: 0,
      uv: 0,
      brightness: 0,
      feels_like: 0,
      wind_chill: 0,
      dew_point: 0,
    };
    this.tempest_battery_level = 0;
    this.tempest_device_id = 0;

    // Make sure the Station ID is the integer ID
    if (this.config.local_api === false && isNaN(this.config.station_id)) {
      log.warn(
        'Station ID is not an Integer! Please make sure you are using the ID integer found here: ' +
        'https://tempestwx.com/station/<STATION_ID>/',
      );
      return;
    }

    api.on(APIEvent.DID_FINISH_LAUNCHING, () => {

      log.info('Executed didFinishLaunching callback');

      if (this.areSensorsSet() === false) {
        log.info('No Sensors configured. Refusing to continue.');
        return;
      }

      // Initialize Tempest Interfaces
      if (this.config.local_api === true) {
        this.initializeBySocket();
      } else {
        this.initializeByApi();
      }

    });

  }

  private async initializeBySocket() {

    this.log.info('Initializing by Socket');

    try {
      this.log.info('Using Tempest Local API.');
      this.tempestSocket = new TempestSocket(this.log);
      this.tempestSocket.start();

      // Hold thread for first message and set values
      await this.socketDataRecieved();
      this.observation_data = this.tempestSocket.getStationCurrentObservation();
      this.tempest_battery_level = this.tempestSocket.getBatteryLevel();

      // Initialize sensors after first API response.
      this.discoverDevices();
      this.log.info ('discoverDevices completed');

      // Remove cached sensors that are no longer required.
      this.removeDevices();
      this.log.info ('removeDevices completed');

      // Poll every minute for local API
      this.pollLocalStationCurrentObservation();


    } catch(exception) {
      this.log.error(exception as string);
    }
  }

  private socketDataRecieved(): Promise<void> {

    this.log.info('Waiting for first local broadcast. This could take up to 60 seconds...');
    return new Promise((resolve) => {
      const socket_interval = setInterval(() => {
        if (this.tempestSocket === undefined) {
          return;
        }
        if (this.tempestSocket.hasData()) {
          clearInterval(socket_interval);
          this.log.info('Initial local broadcast recieved.');
          resolve();
        }
      }, 1000);
    });

  }

  private initializeByApi() {

    this.log.info('Initializing by API');

    try {
      this.log.info('Using Tempest RESTful API.');
      this.tempestApi = new TempestApi(this.config.token, this.config.station_id, this.log);
      this.tempestApi.getStationCurrentObservation(0).then( (observation_data: Observation) => {

        if (!observation_data) {
          this.log.warn('Failed to fetch initial Station Current Observations after retrying. Refusing to continue.');
          return;
        }

        if (this.tempestApi === undefined) {
          return;
        }

        // Cache the observation results
        this.observation_data = observation_data;

        // Initialize sensors after first API response.
        this.discoverDevices();
        this.log.info ('discoverDevices completed');

        // Remove cached sensors that are no longer required.
        this.removeDevices();
        this.log.info ('removeDevices completed');

        // Determine Tempest device_id & initial battery level
        this.tempestApi.getTempestDeviceId().then( (device_id: number) => {
          this.tempest_device_id = device_id;
          if (this.tempestApi === undefined) {
            return;
          }
          this.tempestApi.getTempestBatteryLevel(this.tempest_device_id).then( (battery_level: number) => {
            if (battery_level === undefined) {
              this.log.warn('Failed to fetch initial Tempest battery level');
              return;
            }
            this.tempest_battery_level = battery_level;
          });
        });

        // Then begin to poll the station current observations data.
        this.pollStationCurrentObservation();
      });

    } catch(exception) {
      this.log.error(exception as string);
    }

  }

  private pollLocalStationCurrentObservation(): void {

    setInterval( async () => {

      if (this.tempestSocket === undefined) {
        return;
      }

      // Update values
      this.observation_data = this.tempestSocket.getStationCurrentObservation();
      this.tempest_battery_level = this.tempestSocket.getBatteryLevel();

    }, 60 * 1000); // Tempest local API broadcasts every minute.

  }

  private pollStationCurrentObservation(): void {

    // Poll Tempest API
    const interval = (this.config.interval as number || 10) * 1000;
    this.log.debug(`Tempest API Polling interval (ms) -> ${interval}`);

    setInterval( async () => {

      if (this.tempestApi === undefined) {
        return;
      }

      // Update Observation data
      await this.tempestApi.getStationCurrentObservation(0).then( (observation_data: Observation) => {

        if (observation_data === undefined) {
          this.log.warn('observation_data is undefined, skipping update');
        } else {
          this.observation_data = observation_data;
        }

      });

      // Update Battery percentage
      await this.tempestApi.getTempestBatteryLevel(this.tempest_device_id).then( (battery_level: number) => {

        if (battery_level === undefined) {
          this.log.warn('battery_level is undefined, skipping update');
        } else {
          this.tempest_battery_level = battery_level;
        }

      });

    }, interval);

  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  public configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  private areSensorsSet(): boolean {

    this.log.debug('Confirming sensors configured.');
    // Make sure config.sensors is set and iterable.
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const device of this.config.sensors as Array<TempestSensor>) {
        continue;
      }
    } catch(exception) {
      if (exception instanceof TypeError) {
        this.log.warn('No Sensors are configured.');
      }
      this.log.error(exception as string);
      return false;
    }

    this.log.debug('Sensors configured.');
    return true;

  }

  /**
   * Discover Configured Sensors.
   */
  private discoverDevices(): void {

    try {
      for (const device of this.config.sensors as Array<TempestSensor>) {
        // Create sensor accessory for tempest sensor value
        this.initAccessory(device);
      }
    } catch (exception) {
      this.log.error(exception as string);
    }

  }

  private initAccessory(device: TempestSensor): void {

    let value_key = '';
    switch (device.sensor_type) {
      case 'Temperature Sensor':
        value_key = device.temperature_properties['value_key'];
        break;
      case 'Humidity Sensor':
        value_key = device.humidity_properties['value_key'];
        break;
      case 'Light Sensor':
        value_key = device.light_properties['value_key'];
        break;
      case 'Fan':
        value_key = device.fan_properties['value_key'];
        break;
      case 'Motion Sensor':
        value_key = device.motion_properties['value_key'];
        break;
      case 'Occupancy Sensor':
        value_key = device.occupancy_properties['value_key'];
        if((this.config.local_api === true) && (value_key === 'precip_accum_local_day')) {
          value_key = 'not_available';
        }
        break;
      default:
        this.log.warn('device.sensor_type not defined');
    }

    const uuid = this.api.hap.uuid.generate(
      `${device.name}-${device.sensor_type}-${value_key}`,
    );

    if (value_key !== 'not_available') {

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // pick up any changes such as 'trigger_value'
        existingAccessory.context.device = device;

        // update accessory context information
        this.api.updatePlatformAccessories(this.accessories);

        new WeatherFlowTempestPlatformAccessory(this, existingAccessory);

        // add to array of active accessories
        this.activeAccessory.push(existingAccessory);

      } else {
        this.log.info('Adding new accessory:', device.name);
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // initialize context information
        accessory.context.device = device;

        new WeatherFlowTempestPlatformAccessory(this, accessory);

        // link the accessory to the platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

        // add to array of active accessories
        this.activeAccessory.push(accessory);
      }
    }
  }

  /**
   * Remove Tempest inactive sensors that are no loger used.
   */
  private removeDevices(): void {
    this.accessories.forEach((accessory): void => {
      if (!this.activeAccessory.includes(accessory)){
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.splice(this.accessories.indexOf(accessory), 1); // remove unused accessory from accessories array
        this.log.info(`Unused accessory: ${accessory.context.device.name} removed.`);
      }
    });
    return;
  }

}
