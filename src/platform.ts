import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { WeatherFlowTempestPlatformAccessory } from './platformAccessory';

import { TempestApi, Observation } from './tempestApi';

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
  private tempestApi: TempestApi;

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

    // Initialize TempestApi
    this.tempestApi = new TempestApi(this.config.token, this.config.station_id, log);

    // initialize observation_data
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
    if (isNaN(this.config.station_id)) {
      log.warn(
        'Station ID is not an Integer! Please make sure you are using the ID integer found here: ' +
        'https://tempestwx.com/station/<STATION_ID>/',
      );
      return;
    }

    this.api.on('didFinishLaunching', () => {

      log.info('Executed didFinishLaunching callback');

      if (this.areSensorsSet() === false) {
        log.info('No Sensors configured. Refusing to continue.');
        return;
      }

      try {

        this.tempestApi.getStationCurrentObservation(0).then( (observation_data: Observation) => {

          if (!observation_data) {
            log.warn('Failed to fetch initial Station Current Observations after retrying. Refusing to continue.');
            return;
          }

          // Cache the observation results
          this.observation_data = observation_data;

          // Initialize sensors after first API response.
          this.discoverDevices();

          this.log.debug ('discoverDevices completed');

          // Remove cached sensors that are no longer required.
          this.removeDevices();

          this.log.debug ('removeDevices completed');

          // Determine Tempest device_id & initial battery level
          this.tempestApi.getTempestDeviceId().then( (device_id: number) => {
            this.tempest_device_id = device_id;

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

    });

  }

  private pollStationCurrentObservation(): void {

    // Poll Tempest API
    const interval = (this.config.interval as number || 10) * 1000;
    this.log.debug(`Tempest API Polling interval (ms) -> ${interval}`);

    setInterval( async () => {

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
        break;
      default:
        this.log.warn('device.sensor_type not defined');
    }

    const uuid = this.api.hap.uuid.generate(
      `${device.name}-${device.sensor_type}-${value_key}`,
    );

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
