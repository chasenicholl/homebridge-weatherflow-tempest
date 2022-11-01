import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { WeatherFlowTempestPlatformAccessory } from './platformAccessory';

import { TempestApi } from './tempestApi';

interface TempestSensor {
  name: string;
  sensor_type: string;
  value_key: string;
}

/**
 * WeatherFlowTempestPlatform
 */
export class WeatherFlowTempestPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  private tempestApi: TempestApi;

  public observation_data = {}; // Observation data for Accessories to use.

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    log.info('Finished initializing platform:', this.config.name);
    this.tempestApi = new TempestApi(this.config.token, this.config.station_id, log);
    this.api.on('didFinishLaunching', () => {
      log.info('Executed didFinishLaunching callback');
      if (this.areSensorsSet() === false) {
        log.info('No Sensors configured - refusing to continue.');
        return;
      }
      try {
        this.tempestApi.getStationCurrentObservation().then( (observation_data) => {
          this.observation_data = observation_data;
          // Initialize sensors after first API response.
          this.discoverDevices();
          // Then begin to poll the station current observations data.
          this.pollStationCurrentObservation();
        });
      } catch(exception) {
        this.log.info(exception as string);
      }
    });

  }

  private pollStationCurrentObservation() {

    // Poll Tempest API
    const interval = (this.config.interval as number || 10) * 1000;
    this.log.info(`Tempest API Polling interval (ms) -> ${interval}`);
    const tick = () => {
      setTimeout( () => {
        this.tempestApi.getStationCurrentObservation().then( (observation_data) => {
          this.observation_data = observation_data;
          timer = setTimeout(tick, interval);
        });
      }, interval);
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let timer = setTimeout(tick, interval);

  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  areSensorsSet(): boolean {

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
  discoverDevices() {

    try {
      for (const device of this.config.sensors as Array<TempestSensor>) {
        // Create sensor accessory for tempest sensor value
        this.initAccessory(device);
      }
    } catch (exception) {
      this.log.error(exception as string);
    }

  }

  private initAccessory(device: TempestSensor) {

    const uuid = this.api.hap.uuid.generate(
      `${device.name}-${device.sensor_type}-${device.value_key}`,
    );
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      new WeatherFlowTempestPlatformAccessory(this, existingAccessory);
    } else {
      this.log.info('Adding new accessory:', device.name);
      const accessory = new this.api.platformAccessory(device.name, uuid);
      accessory.context.device = device;
      new WeatherFlowTempestPlatformAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

  }

}
