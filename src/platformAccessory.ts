import { Service, PlatformAccessory } from 'homebridge';
import { WeatherFlowTempestPlatform } from './platform';

class TemperatureSensor {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Get or Add Service to Accessory
    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
    this.accessory.addService(this.platform.Service.TemperatureSensor);

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    // Set Current Temperature
    this.service.getCharacteristic(
      this.platform.Characteristic.CurrentTemperature).updateValue(this.getCurrentTemperature(),
    );

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(
        this.platform.Characteristic.CurrentTemperature).updateValue(this.getCurrentTemperature(),
      );
    }, interval);

  }

  /**
   * Get the current temperature from the global observation object. Convert to F if station units_temp is F.
   */
  private getCurrentTemperature(): number {

    try {
      const value_key: string = this.accessory.context.device.temperature_properties.value_key;
      const temperature: number = parseFloat(this.platform.observation_data[value_key]);
      if (temperature > 100.00) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting temperatures exceeding 100C: ${temperature}C`);
        return 100;
      } else if (temperature < -271.00) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting temperatures less than -271C: ${temperature}C`);
        return -271.00;
      } else {
        return temperature;
      }
    } catch(exception) {
      this.platform.log.error(exception as string);
      return -270;
    }

  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  private handleCurrentTemperatureGet(): number {

    this.platform.log.debug('Triggered GET CurrentTemperature');
    const temperature: number = this.getCurrentTemperature();
    return temperature;

  }

}

class LightSensor {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.service = this.accessory.getService(this.platform.Service.LightSensor) ||
    this.accessory.addService(this.platform.Service.LightSensor);

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.handleCurrentAmbientLightLevelGet.bind(this));

    // Set initial value
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(this.getCurrentLux());

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(this.getCurrentLux());
    }, interval);

  }

  private getCurrentLux(): number {

    try {
      const value_key: string = this.accessory.context.device.light_properties.value_key;
      const lux: number = parseFloat(this.platform.observation_data[value_key]);
      if (lux < 0.0001) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting lux less than 0.0001: ${lux}`);
        return 0.0001;
      } else if (lux > 100000) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting lux greater than 100000: ${lux}`);
        return 100000;
      } else {
        return lux;
      }
    } catch(exception) {
      this.platform.log.error(exception as string);
      return 0.0001;
    }

  }

  /**
   * Handle requests to get the current value of the "Current Ambient Light Level" characteristic
   */
  private handleCurrentAmbientLightLevelGet(): number {

    this.platform.log.debug('Triggered GET CurrentAmbientLightLevel');
    const lux: number = this.getCurrentLux();
    return lux;

  }

}

class HumiditySensor {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.service = this.accessory.getService(this.platform.Service.HumiditySensor) ||
    this.accessory.addService(this.platform.Service.HumiditySensor);

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleCurrentRelativeHumidityGet.bind(this));

    // Set initial value
    this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity).updateValue(this.getCurrentRelativeHumidity());

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity).updateValue(this.getCurrentRelativeHumidity());
    }, interval);

  }

  private getCurrentRelativeHumidity(): number {

    try {
      const value_key: string = this.accessory.context.device.humidity_properties.value_key;
      const relative_humidity: number = parseInt(this.platform.observation_data[value_key]);
      if (relative_humidity > 100) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting relative humidity exceeding 100%: ${relative_humidity}%`);
        return 100;
      } else if (relative_humidity < 0) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting relative humidity less than 0%: ${relative_humidity}%`);
        return 0;
      } else {
        return relative_humidity;
      }
    } catch(exception) {
      this.platform.log.error(exception as string);
      return 0;
    }

  }

  /**
   * Handle requests to get the current value of the "Current Relative Humidity" characteristic
   */
  private handleCurrentRelativeHumidityGet(): number {

    this.platform.log.debug('Triggered GET CurrentRelativeHumidity');
    const relative_humidity: number = this.getCurrentRelativeHumidity();
    return relative_humidity;

  }

}

class MotionSensor {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.service = this.accessory.getService(this.platform.Service.MotionSensor) ||
    this.accessory.addService(this.platform.Service.MotionSensor);

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.MotionDetected)
      .onGet(this.handleMotionDetectedGet.bind(this));

    // Set initial value
    this.service.getCharacteristic(
      this.platform.Characteristic.MotionDetected).updateValue(this.isMotionDetected(),
    );

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(this.platform.Characteristic.MotionDetected).updateValue(this.isMotionDetected());
    }, interval);

  }

  private getMotionSensorValue(): number {

    try {
      const value_key: string = this.accessory.context.device.motion_properties.value_key;
      let speed: number = parseFloat(this.platform.observation_data[value_key]);

      if (this.platform.config.units === 'Metric') {
        speed = Math.round(speed);
      } else {
        speed = Math.round(speed * 2.236936); // convert m/s to mph
      }

      if (speed < 0) {
        this.platform.log.debug(`WeatherFlow Tempest Motion Sensor is reporting less than 0: ${speed}`);
        return 0;
      } else {
        return speed;
      }
    } catch(exception) {
      this.platform.log.error(exception as string);
      return 0;
    }

  }

  private isMotionDetected(): boolean {

    const current_value = this.getMotionSensorValue();
    let trigger_value = 1;
    try {
      trigger_value = this.accessory.context.device.motion_properties.trigger_value;
    } catch(exception) {
      this.platform.log.error(exception as string);
      this.platform.log.warn('Defaulting to 1 as motion trigger value.');
    }
    return current_value >= trigger_value;

  }

  /**
   * Handle requests to get the current value of the "Motion Detected" characteristic
   */
  private handleMotionDetectedGet(): boolean {

    this.platform.log.debug('Triggered GET MotionDetected');
    return this.isMotionDetected();

  }

}

class Fan {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.service = this.accessory.getService(this.platform.Service.Fan) ||
    this.accessory.addService(this.platform.Service.Fan);

    // The air is always moving a lil' bit. If this isn't true we are all screwed.
    this.service.setCharacteristic(this.platform.Characteristic.On, true);

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.handleCurrentRotationSpeedGet.bind(this));

    // Set initial value
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(this.getCurrentWindSpeed());

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(this.getCurrentWindSpeed());
    }, interval);

  }

  private getCurrentWindSpeed(): number {

    try {
      const value_key: string = this.accessory.context.device.fan_properties.value_key;
      let speed: number = parseFloat(this.platform.observation_data[value_key]);
      if (this.platform.config.units === 'Metric') {
        speed = Math.round(speed); // round as fan % is integer value
        if (speed > 45) {
          this.platform.log.debug(`WeatherFlow Tempest is reporting wind speed exceeding 45 m/s: ${speed} m/s`);
          speed = 45;
        } else if (speed < 0) {
          this.platform.log.debug(`WeatherFlow Tempest is reporting wind speed less than 0 m/s: ${speed} m/s`);
          speed = 0;
        }
      } else {
        speed = Math.round(speed * 2.236936); // convert m/s to mph and round as fan % is integer value
        if (speed > 100) {
          this.platform.log.debug(`WeatherFlow Tempest is reporting wind speed exceeding 100 mph: ${speed} mph`);
          speed = 100;
        } else if (speed < 0) {
          this.platform.log.debug(`WeatherFlow Tempest is reporting wind speed less than 0 mph: ${speed} mph`);
          speed = 0;
        }
      }
      return speed;

    } catch(exception) {
      this.platform.log.error(exception as string);
      return 0;
    }

  }

  /**
   * Handle requests to get the current value of the "Current Rotation Speed" characteristic
   */
  private handleCurrentRotationSpeedGet(): number {

    this.platform.log.debug('Triggered GET RotationSpeed');
    return this.getCurrentWindSpeed();

  }

}

class OccupancySensor {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Restore or create Occupancy Sensor
    this.service = this.accessory.getService(this.platform.Service.OccupancySensor) ||
    this.accessory.addService(this.platform.Service.OccupancySensor);

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet(this.handleOccupancyDetectedGet.bind(this));

    // Set initial state of Occupancy Sensor and sensor value
    const sensorName = this.accessory.context.device.name;
    const [sensorValue, sensorUnits, sensorTrip] = this.getOccupancySensorValue();

    this.service.getCharacteristic(
      this.platform.Characteristic.Name).updateValue(`${sensorName}: ${sensorValue} ${sensorUnits}`,
    );

    this.service.getCharacteristic(
      this.platform.Characteristic.OccupancyDetected).updateValue((sensorValue >= sensorTrip),
    );

    // Update occupancy sensor state and name based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;

    setInterval( () => {
      const sensorName = this.accessory.context.device.name;
      const [sensorValue, sensorUnits, sensorTrip] = this.getOccupancySensorValue();

      this.service.getCharacteristic(
        this.platform.Characteristic.Name).updateValue(`${sensorName}: ${sensorValue} ${sensorUnits}`,
      );

      this.service.getCharacteristic(
        this.platform.Characteristic.OccupancyDetected).updateValue((sensorValue >= sensorTrip),
      );

    }, interval);

  }

  private getOccupancySensorValue(): [value: number, units: string, trip_level: number] {

    try {
      const value_key: string = this.accessory.context.device.occupancy_properties.value_key;
      let trigger_value = this.accessory.context.device.occupancy_properties.trigger_value;
      let value: number = parseFloat(this.platform.observation_data[value_key]);
      let units = '';

      // check that trip_level is not less than 0
      if (trigger_value < 0) {
        trigger_value = 0;
      }

      switch (value_key) {
        case 'barometric_pressure':
          if (this.platform.config.units === 'Metric') {
            value = Math.round(value * 1000) / 1000; // 3 decimal places
            units = 'mb';
          } else {
            value = Math.round(value / 33.8638 * 1000) / 1000; // convert from mb to inHg
            units = 'inHg';
          }
          break;
        case 'precip': //
          if (this.platform.config.units === 'Metric') {
            value = Math.round(value * 100) / 100; // 2 decimal places
            units = 'mm/min';
          } else {
            value = Math.round(value * 2.36 * 100) / 100; // convert mm/min to in/hr
            units = 'in/hr';
          }
          break;
        case 'precip_accum_local_day': // convert mm to in
          if (this.platform.config.units === 'Metric') {
            value = Math.round(value * 100) / 100; // 2 decimal places
            units = 'mm';
          } else {
            value = Math.round(value / 25.4 * 100) / 100; // convert mm to in
            units = 'in';
          }
          break;
        case 'solar_radiation': // no conversion needed
          units = 'W/m\xB2';
          break;
        case 'uv': // no conversion needed
          value = Math.round(value * 10) / 10; // 1 decimal place
          units = ' ';
          break;
        case 'wind_direction': // convert from degrees to cardinal (N, S, E, W)
          // eslint-disable-next-line no-case-declarations
          const cat = Math.round(value % 360 / 22.5);
          switch (cat) {
            case 0:
              units = '\xB0 N';
              break;
            case 1:
              units = '\xB0 NNE';
              break;
            case 2:
              units = '\xB0 NE';
              break;
            case 3:
              units = '\xB0 ENE';
              break;
            case 4:
              units = '\xB0 E';
              break;
            case 5:
              units = '\xB0 ESE';
              break;
            case 6:
              units = '\xB0 SE';
              break;
            case 7:
              units = '\xB0 SSE';
              break;
            case 8:
              units = '\xB0 S';
              break;
            case 9:
              units = '\xB0 SSW';
              break;
            case 10:
              units = '\xB0 SW';
              break;
            case 11:
              units = '\xB0 WSW';
              break;
            case 12:
              units = '\xB0 W';
              break;
            case 13:
              units = '\xB0 WNW';
              break;
            case 14:
              units = '\xB0 NW';
              break;
            case 15:
              units = '\xB0 NNW';
              break;
            case 16:
              units = '\xB0 N';
              break;
            default:
              units = ' Variable';
          }
          break;
        default:
          break;
      }

      if (value < 0) {
        value = 0;
        this.platform.log.debug(`WeatherFlow Tempest ${value_key} is reporting less than 0: ${value}`);
        return [value, units, trigger_value];

      } else {
        this.platform.log.debug(`WeatherFlow Tempest ${value_key}: ${value} ${units}, trip_level: ${trigger_value}`);
        return [value, units, trigger_value];
      }

    } catch(exception) {
      this.platform.log.error(exception as string);
      return [0, '', 1000];
    }

  }

  private isOccupancyDetected(): boolean {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [sensorValue, sensorUnits, sensorTrip] = this.getOccupancySensorValue();
    return sensorValue >= sensorTrip;

  }

  /**
   * Handle requests to get the current value of the "Motion Detected" characteristic
   */
  private handleOccupancyDetectedGet(): boolean {

    this.platform.log.debug('Triggered GET MotionDetected');
    return this.isOccupancyDetected();

  }

}

class BatterySensor {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Get or Add Service to Accessory
    this.service = this.accessory.getService(this.platform.Service.Battery) ||
    this.accessory.addService(this.platform.Service.Battery, 'Tempest Battery');

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.handleCurrentBatteryLevelGet.bind(this));

    // Set Current Battery Level
    this.service.getCharacteristic(
      this.platform.Characteristic.BatteryLevel).updateValue(this.getCurrentBatteryLevel(),
    );

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(
        this.platform.Characteristic.BatteryLevel).updateValue(this.getCurrentBatteryLevel(),
      );
    }, interval);

  }

  /**
   * Get the current battery level from the global observation object.
   */
  private getCurrentBatteryLevel(): number {

    try {
      const batteryLevel: number = this.platform.tempest_battery_level;
      if (batteryLevel > 100) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting battery level exceeding 100%: ${batteryLevel}%`);
        return 100;
      } else if (batteryLevel < 0) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting battery level less than 0%: ${batteryLevel}%`);
        return 0;
      } else {
        return batteryLevel;
      }
    } catch(exception) {
      this.platform.log.error(exception as string);
      return 0;
    }

  }

  /**
   * Handle requests to get the current value of the "Current Battery Level" characteristic
   */
  private handleCurrentBatteryLevelGet(): number {

    this.platform.log.debug('Triggered GET CurrentBatteryLevel');
    const batteryLevel: number = this.getCurrentBatteryLevel();
    return batteryLevel;
  }

}

class ContactSensor {
  private service: Service;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.service = this.accessory.getService(this.platform.Service.ContactSensor) ||
    this.accessory.addService(this.platform.Service.ContactSensor);

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.handleCurrentStateGet.bind(this));

    // Set initial value
    this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).updateValue(0);

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).updateValue(this.getState());
    }, interval);

  }

  private getState(): number {

    try {
      const lightning_strike_last_epoch: number = this.platform.observation_data.lightning_strike_last_epoch;
      const lightning_strike_last_distance: number = this.platform.observation_data.lightning_strike_last_distance;
      const trigger_distance: number = this.accessory.context.device.contact_properties.trigger_distance;
      const trigger_time: number = this.accessory.context.device.contact_properties.trigger_time;
      const current_epoch_now = Math.floor(Date.now() / 1000);
      if (lightning_strike_last_epoch > 0
        && lightning_strike_last_distance > 0
        && lightning_strike_last_distance <= trigger_distance
        && (current_epoch_now - lightning_strike_last_epoch) <= trigger_time) {
        return 1; // trigger CONTACT_NOT_DETECTED.
      }
      return 0;
    } catch(exception) {
      this.platform.log.error(exception as string);
      return 0;
    }

  }

  /**
   *
   */
  private handleCurrentStateGet(): number {

    this.platform.log.debug('Triggered GET CurrentRelativeHumidity');
    const relative_humidity: number = this.getState();
    return relative_humidity;

  }

}

/**
 * Initialize Tempest Platform (only need to do once)
 */
export class InitWeatherFlowTempestPlatform {

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Configure Accessory
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'WeatherFlow')
      .setCharacteristic(this.platform.Characteristic.Model, 'Tempest')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${this.platform.config.station_id}`);

    // Add battery sensor
    new BatterySensor(this.platform, this.accessory);

  }
}

/**
 * Platform Accessory
 */
export class WeatherFlowTempestPlatformAccessory {

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Configure Accessory
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'WeatherFlow')
      .setCharacteristic(this.platform.Characteristic.Model, `Tempest - ${this.accessory.context.device.name}`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${this.platform.config.station_id}`);

    switch (this.accessory.context.device.sensor_type) {
      case 'Temperature Sensor':
        new TemperatureSensor(this.platform, this.accessory);
        // Add Battery to default Temperature air_temperature sensor
        if (this.accessory.context.device.temperature_properties.value_key === 'air_temperature') {
          new BatterySensor(this.platform, this.accessory);
        }
        break;
      case 'Light Sensor':
        new LightSensor(this.platform, this.accessory);
        break;
      case 'Humidity Sensor':
        new HumiditySensor(this.platform, this.accessory);
        break;
      case 'Motion Sensor':
        new MotionSensor(this.platform, this.accessory);
        break;
      case 'Fan':
        new Fan(this.platform, this.accessory);
        break;
      case 'Occupancy Sensor':
        new OccupancySensor(this.platform, this.accessory);
        break;
      case 'Contact Sensor':
        new ContactSensor(this.platform, this.accessory);
        break;
    }

  }

}
