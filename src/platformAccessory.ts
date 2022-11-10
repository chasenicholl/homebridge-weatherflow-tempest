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

      const value_key: string = this.accessory.context.device.value_key;
      const temperature: number = parseFloat(this.platform.observation_data[value_key]);
      if (temperature > 100.00) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting temperatures exceeding 100c: ${temperature}c`);
        return 100;
      } else if (temperature < -271.00) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting temperatures less than -271c: ${temperature}c`);
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
      const value_key: string = this.accessory.context.device.value_key;
      const lux: number = parseFloat(this.platform.observation_data[value_key]);
      if (lux < 0.0001) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting lux less than 0.0001: ${lux}`);
        return 0.0001;
      }
      return lux;
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
      const value_key: string = this.accessory.context.device.value_key;
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
      const value_key: string = this.accessory.context.device.value_key;
      const speed: number = parseInt(this.platform.observation_data[value_key]);
      if (speed > 100) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting wind speed exceeding 100mph: ${speed}mph`);
        return 100;
      } else if (speed < 0) {
        this.platform.log.debug(`WeatherFlow Tempest is reporting wind speed less than 0mph: ${speed}mph`);
        return 0;
      } else {
        return speed;
      }
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
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '000');

    // ["Temperature Sensor", "Light Sensor", "Humidity Sensor", "Fan"]
    switch (this.accessory.context.device.sensor_type) {
      case 'Temperature Sensor':
        new TemperatureSensor(this.platform, this.accessory);
        break;
      case 'Light Sensor':
        new LightSensor(this.platform, this.accessory);
        break;
      case 'Humidity Sensor':
        new HumiditySensor(this.platform, this.accessory);
        break;
      case 'Fan':
        new Fan(this.platform, this.accessory);
        break;
    }

  }

}
