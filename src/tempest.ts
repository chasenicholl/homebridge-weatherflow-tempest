import { Logger } from 'homebridge';
import axios, { AxiosResponse } from 'axios';
import * as dgram from 'dgram';
import https from 'https';


axios.defaults.timeout = 10000; // same as default interval
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true });


export interface Observation {
  // temperature sensors
  air_temperature: number;               // C, displayed according to Homebridge and HomeKit C/F settings
  feels_like: number;
  wind_chill: number;
  dew_point: number;

  // humidity sensor
  relative_humidity: number;             // %

  // fan and motion sensor
  wind_avg: number;                      // m/s, used for Fan speed %
  wind_gust: number;                     // m/s, used for motion sensor

  // occupancy sensors
  barometric_pressure: number;           // mbar
  precip: number;                        // mm/min (minute sampling)
  precip_accum_local_day: number;        // mm
  wind_direction: number;                // degrees
  solar_radiation: number;               // W/m^2
  uv: number;                            // Index

  brightness: number;                    // Lux

  lightning_strike_last_epoch: number;    // timestamp in seconds
  lightning_strike_last_distance: number; // km
}


export class TempestSocket {

  private log: Logger;
  private s: dgram.Socket;
  private data: Observation;
  private tempest_battery_level: number;

  constructor(log: Logger, reuse_address: boolean) {

    this.log = log;
    this.data = {
      air_temperature: 0,
      feels_like: 0,
      wind_chill: 0,
      dew_point: 0,
      relative_humidity: 0,
      wind_avg: 0,
      wind_gust: 0,
      barometric_pressure: 0,
      precip: 0,
      precip_accum_local_day: 0,
      wind_direction: 0,
      solar_radiation: 0,
      uv: 0,
      brightness: 0,
      lightning_strike_last_epoch: 0,
      lightning_strike_last_distance: 0
    };
    this.tempest_battery_level = 0;
    this.s = dgram.createSocket({ type: 'udp4', reuseAddr: reuse_address });

    this.log.info('TempestSocket initialized.');

  }

  public start(address = '0.0.0.0', port = 50222) {

    this.setupSocket(address, port);
    this.setupSignalHandlers();

  }

  private setupSocket(address: string, port: number) {

    this.s.bind({ address: address, port: port });
    this.s.on('message', (msg) => {
      try {
        const message_string = msg.toString('utf-8');
        const data = JSON.parse(message_string);
        this.processReceivedData(data);
      } catch (error) {
        this.log.warn('JSON processing of data failed');
        this.log.error(error as string);
      }
    });

    this.s.on('error', (err) => {
      this.log.error('Socket error:', err);
    });

  }

  private processReceivedData(data) {

    if (data.type === 'obs_st') { // Observation event
      this.setTempestData(data);
    } else if (data.type === 'evt_strike') { // Lightening strike event
      this.appendStrikeEvent(data);
    }

  }

  private setTempestData(event): void {

    const obs = event.obs[0];
    // const windLull = (obs[1] !== null) ? obs[1] : 0;
    const windSpeed = (obs[2] !== null) ? obs[2] * 2.2369 : 0; // convert to mph for heatindex calculation
    const T = (obs[7] * 9/5) + 32; // T in F for heatindex, feelsLike and windChill calculations

    // eslint-disable-next-line max-len
    const heatIndex = -42.379 + 2.04901523*T + 10.14333127*obs[8] - 0.22475541*T*obs[8] - 0.00683783*(T**2) - 0.05481717*(obs[8]**2) + 0.00122874*(T**2)*obs[8] + 0.00085282*T*(obs[8]**2) - 0.00000199*(T**2)*(obs[8]**2);

    // feels like temperature on defined for temperatures between 80F and 110F
    const feelsLike = ((T >= 80) && (T <= 110)) ? heatIndex : T;

    // windChill only defined for wind speeds > 3 mph and temperature < 50F
    const windChill = ((windSpeed > 3) && (T < 50)) ? (35.74 + 0.6215*T - 35.75*(windSpeed**0.16) + 0.4275*T*(windSpeed**0.16)) : T;

    this.data.air_temperature = obs[7];
    this.data.feels_like = 5/9 * (feelsLike - 32); // convert back to C
    this.data.wind_chill = 5/9 * (windChill - 32); // convert back to C
    this.data.dew_point = obs[7] - ((100 - obs[8]) / 5.0); // Td = T - ((100 - RH)/5)
    this.data.relative_humidity = obs[8];
    this.data.wind_avg = obs[2];
    this.data.wind_gust = obs[3];
    this.data.barometric_pressure = obs[6];
    this.data.precip = obs[12];
    this.data.precip_accum_local_day = obs[12];
    this.data.wind_direction = obs[4];
    this.data.solar_radiation = obs[11];
    this.data.uv = obs[10];
    this.data.brightness = obs[9];
    this.tempest_battery_level = Math.round((obs[16] - 1.8) * 100); // 2.80V = 100%, 1.80V = 0%

  }

  private appendStrikeEvent(data): void {

    if (this.data) {
      this.data.lightning_strike_last_epoch = data.evt[0];
      this.data.lightning_strike_last_distance = data.evt[1];
    }

  }

  private setupSignalHandlers(): void {

    process.on('SIGTERM', () => {
      this.log.info('Got SIGTERM, shutting down Tempest Homebridge...');
      this.s.close();
    });

    process.on('SIGINT', () => {
      this.log.info('Got SIGINT, shutting down Tempest Homebridge...');
      this.s.close();
    });

  }

  public hasData(): boolean {
    return this.data !== undefined;
  }

  public getStationCurrentObservation(): Observation {
    return this.data as Observation;
  }

  public getBatteryLevel(): number {
    return this.tempest_battery_level;
  }

}

export class TempestApi {

  private log: Logger;
  private token: string;
  private station_id: string;
  private data: object | undefined;
  private tempest_device_id: number;
  private tempest_battery_level: number;
  private readonly max_retries: number = 30;

  constructor(token: string, station_id: string, log: Logger) {

    this.log = log;
    this.token = token;
    this.station_id = station_id;
    this.data = undefined; // last sample of Observation data
    this.tempest_device_id = 0;
    this.tempest_battery_level = 0;

    this.log.info('TempestApi initialized.');

  }

  private async getStationObservation(): Promise<AxiosResponse | undefined> {

    let observation: AxiosResponse | undefined;

    const url = `https://swd.weatherflow.com/swd/rest/observations/station/${this.station_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status >= 200 && status < 300, // Default
    };

    await axios.get(url, options)
      .then(response => {
        observation = response.data['obs'][0];
      })

      .catch(exception => {
        this.log.warn(`[WeatherFlow] ${exception}`);
      });

    return observation;

  }

  private async delay(ms: number): Promise<unknown> {

    return new Promise(resolve => setTimeout(resolve, ms));

  }

  public async getStationCurrentObservation(retry_count: number) {

    if (retry_count === this.max_retries) {
      this.log.error(`Reached max API retries: ${this.max_retries}. Stopping.`);
      return;
    }

    const observation = await this.getStationObservation();

    if (observation === undefined) {
      this.log.warn('Response missing "obs" data.');

      if (this.data !== undefined) {
        this.log.warn('Returning last cached response.');
        return this.data;

      } else {
        this.log.warn(`Retrying ${retry_count + 1} of ${this.max_retries}. No cached "obs" data.`);
        retry_count += 1;
        await this.delay(1000 * retry_count);
        return this.getStationCurrentObservation(retry_count);
      }

    } else {

      this.data = observation;
      return this.data;

    }

  }

  public async getTempestBatteryLevel(device_id): Promise<number> {

    const url = `https://swd.weatherflow.com/swd/rest/observations/device/${device_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status >= 200 && status < 300, // Default
    };

    await axios.get(url, options) // assumes single Tempest station
      .then(response => {
        const tempest_battery_voltage = response.data.obs[0][16];
        this.tempest_battery_level = Math.round((tempest_battery_voltage - 1.8) * 100); // 2.80V = 100%, 1.80V = 0%
      })

      .catch(exception => {
        this.log.warn(`[WeatherFlow] ${exception}`);
      });

    return this.tempest_battery_level;

  }

  public async getTempestDeviceId(): Promise<number> {

    const url = `https://swd.weatherflow.com/swd/rest/stations/${this.station_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status >= 200 && status < 300, // Default
    };

    await axios.get(url, options) // assumes single hub with single Tempest station
      .then(response => {
        this.tempest_device_id = response.data.stations[0].devices[1].device_id;
      })

      .catch(exception => {
        this.log.warn(`[WeatherFlow] ${exception}`);
      });

    return this.tempest_device_id;

  }

}
