import { 
  Service, 
  PlatformAccessory,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue
} from 'homebridge';
import { callbackify } from 'util';

import { WeatherFlowTempestPlatform } from './platform';

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
      const speed: number = parseInt(this.platform.observation_data['obs'][0][value_key]);
      return (speed > 100) ? 100 : Math.round(speed);
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
      const lux: number = parseInt(this.platform.observation_data['obs'][0][value_key]);
      return lux;
    } catch(exception) {
      this.platform.log.error(exception as string);
      return -1;
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

class TemperatureSensor {
  private service: Service;
  private is_celsius: boolean;

  constructor(
    private readonly platform: WeatherFlowTempestPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Get or Add Service to Accessory
    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
    this.accessory.addService(this.platform.Service.TemperatureSensor);

    // Are we using metric? Note* not used right now.
    this.is_celsius = this.platform.observation_data['station_units']['units_temp'] === 'c';

    // Create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    // Set Current Temperature
    this.service.getCharacteristic(
      this.platform.Characteristic.CurrentTemperature).updateValue(this.getCurrentTemperature()
    );

    // Update value based on user defined global interval
    const interval = (this.platform.config.interval as number || 10) * 1000;
    setInterval( () => {
      this.service.getCharacteristic(
        this.platform.Characteristic.CurrentTemperature).updateValue(this.getCurrentTemperature()
      );
    }, interval);

  }

  /**
   * Get the current temperature from the global observation object. Convert to F if station units_temp is F.
   */
  private getCurrentTemperature(): number {

    try {
      const value_key: string = this.accessory.context.device.value_key;
      const c: number = parseFloat(this.platform.observation_data['obs'][0][value_key]);
      return c; // return this.is_celsius ? c : (c * 9/5) + 32; 
    } catch(exception) {
      this.platform.log.error(exception as string);
      return -99;
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
  
    // ["Light Sensor", "Temperature Sensor", "Fan"]
    switch (this.accessory.context.device.sensor_type) {
      case 'Fan':
        new Fan(this.platform, this.accessory);
        break;
      case 'Light Sensor':
        new LightSensor(this.platform, this.accessory);
        break;
      case 'Temperature Sensor':
        new TemperatureSensor(this.platform, this.accessory);
        break;
    }

  }

// Incase we ever need a Switch to trigger things.
// class Switch {
//   private service: Service;
//   private is_on: boolean = false;

//   constructor(
//     private readonly platform: WeatherFlowTempestPlatform,
//     private readonly accessory: PlatformAccessory,
//   ) {
//     this.service = this.accessory.getService(this.platform.Service.Switch) ||
//     this.accessory.addService(this.platform.Service.Switch);

//     // Register handlers for the On/Off Characteristic
//     this.service.getCharacteristic(this.platform.Characteristic.On)
//       .on('set', this.setOn.bind(this))
//       .on('get', this.getOn.bind(this));
    
//     // Default Switch to Off
//     this.service.setCharacteristic(this.platform.Characteristic.On, this.is_on);

//     // Update value based on user defined global interval
//     const interval = (this.platform.config.interval as number || 10) * 1000;
//     setInterval( () => {
//       try {
//         const current_value: number = this.platform.observation_data['obs'][0][this.accessory.context.value_key];
//         const trigger_value: number = this.accessory.context.trigger_value;
//         if (current_value >= trigger_value) {
//           this.service.setCharacteristic(this.platform.Characteristic.On, true);
//         } else {
//           this.service.setCharacteristic(this.platform.Characteristic.On, false);
//         }
//       } catch(exception) {
//         this.platform.log.error(exception as string);
//       }
//     }, interval);
  
//   }

//   private getOn(callback: CharacteristicGetCallback) {

//     const is_on = this.is_on;
//     this.platform.log.debug(`[${this.accessory.displayName}] Get Characteristic On -> ${is_on}`);
//     callback(null, is_on);

//   }

//   private setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

//     this.is_on = value as boolean;
//     this.platform.log.debug(`[${this.accessory.displayName}] Set Characteristic On -> ${value}`);
//     callback(null);

//   }
// }

}
