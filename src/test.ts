import * as dgram from 'dgram';

export interface SocketObservation {

  timestamp: number;
  windLull: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  pressure: number;
  temperature: number;
  humidity: number;
  illumination: number;
  uvIndex: number;
  solarRadiation: number;
  rain: number;
  strikes: number;
  lightningDistance: number;
  reportingInterval: number;

}


export class TempestSocket {

  // private log: Logger;
  private s: dgram.Socket;

  constructor(address = '0.0.0.0', port = 50222) {

    // this.log = log;
    this.s = dgram.createSocket('udp4');
    this.setupSocket(address, port);
    this.setupSignalHandlers();
  }

  private setupSocket(address: string, port: number) {

    // this.s.setsockopt(dgram.SOL_SOCKET, dgram.SO_REUSEADDR, 1);
    // this.s.setsockopt(dgram.SOL_SOCKET, dgram.SO_REUSEPORT, 1);
    this.s.bind({ address: address, port: port });
    this.s.on('message', (msg) => {
      try {
        const message_string = msg.toString('utf-8');
        const data = JSON.parse(message_string);
        console.log(data);
        this.processReceivedData(data);
      } catch (error) {
        console.log('JSON processing of data failed');
        console.log(error as string);
      }
    });

    this.s.on('error', (err) => {
      console.log('Socket error:', err);
    });

  }

  private processReceivedData(data: any) {
    // if (data.type === 'obs_air') {
    //   console.log(data);
    //   // air_tm = this.air_data(data, air_tm);
    // }

    if (data.type === 'obs_st') {
      // console.log(data);
      const parsed_data = this.parseTempestData(data);
      console.log(parsed_data);
      // st_tm = this.tempest_data(data, st_tm);
    }

    // if (data.type === 'obs_sky') {
    //   console.log(data);
    //   // sky_tm = this.sky_data(data, sky_tm);
    // }
  }

  private parseTempestData(data: any): SocketObservation {
    const obs = data.obs[0];
    const windLull = (obs[1] !== null) ? obs[1] * 2.2369 : 0;
    const windSpeed = (obs[2] !== null) ? obs[2] * 2.2369 : 0;
    const windGust = (obs[3] !== null) ? obs[3] * 2.2369 : 0;
    return {
      timestamp: obs[0],
      windLull: windLull,
      windSpeed: windSpeed,
      windGust: windGust,
      windDirection: obs[4],
      pressure: obs[6],
      temperature: obs[7],
      humidity: obs[8],
      illumination: obs[9],
      uvIndex: obs[10],
      solarRadiation: obs[11],
      rain: parseFloat(obs[12]),
      strikes: obs[14],
      lightningDistance: obs[15],
      reportingInterval: obs[17],
    } as SocketObservation;

  }

  private setupSignalHandlers() {

    process.on('SIGTERM', () => {
      console.log('Got SIGTERM, shutting down Tempest Homebridge...');
    });

    process.on('SIGINT', () => {
      console.log('Got SIGINT, shutting down Tempest Homebridge...');
      this.s.close();
    });

  }

}

new TempestSocket();