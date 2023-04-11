# Homebridge WeatherFlow Tempest Plugin

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) ![npm-version](https://badgen.net/npm/v/homebridge-weatherflow-tempest?icon=npm&label) ![npm-downloads](https://badgen.net/npm/dt/homebridge-weatherflow-tempest?icon=npm&label) [![donate](https://badgen.net/badge/donate/paypal/yellow)](https://paypal.me/chasenicholl)

<p align="center">
<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
<img src="https://weatherflow.com/wp-content/uploads/2016/05/Tempest-powered-by-01.svg" width="250">
</p>

Homebridge Plugin providing basic WeatherFlow Tempest support. Exposing 6 Acessories + Battery Sensor.

- Temperature Sensor
- Humidity Sensor
- Light Sensor
- Motion Sensor (triggered by user configured value)
- Occupancy Sensor (triggered by user configured value)
- Fan (expressed as Rotation Speed - Wind Speed 0-100mph)
- Battery Sensor (added to `air_temperature` Temperature sensor)

### Setup and Parameters

You will need to create an account at https://tempestwx.com/ and then generate a Personal Use Token https://tempestwx.com/settings/tokens.

- `name`: _(Required)_ Must always be set to `WeatherFlow Tempest Platform`.
- `token`: _(Required)_ Oauth2 Personal Use Token, create via your tempestwx account.
- `station_id`: _(Required)_ The station ID you are pulling weather data from.
- `interval`: _(Required)_ How often to poll the Tempest REST API. Default 10 seconds. Minimum every second.
- `sensors`: _(Required)_ An array of sensors to create. This is dynamic incase you want to target different temperature or wind speed attributes.
- `sensors[].name`: _(Required)_ Display name of Sensor in Apple Home.
- `sensors[].sensor_type`: _(Required)_ The type of Home Sensor to create. There are 6 options ["Temperature Sensor", "Light Sensor", "Humidity Sensor", "Fan", "Motion Sensor", "Occupancy Sensor"].
- `sensors[].{*}_properties.value_key`: _(Required)_ Which REST API response body key to target for its value. You can find the available value_keys in the table below.
- `sensors[].motion_properties.motion_trigger_value`: _(Required with Motion Sensor)_ At what point (value) to trigger motion detected on/off. Minimum 1.
- `sensors[].occupancy_properties.occupancy_trigger_value`: _(Required with Occupancy Sensor)_ At what point (value) to trigger occupancy detected on/off. Minimum 0.

`{*}`  Will depend on Sensor: temperature, humidity, light, fan

sensor_type | value_key | units | additional_properties | Typical | Notes
:-- | :--- | :--- | :--- | :--- | :---
`Temperature Sensor` | air_temperature | F | NA | NA |
` ` | feels_like | F | NA | NA |
` ` | wind_chill | F | NA | NA |
` ` | dew_point | F | NA | NA |
`Humidity Sensor` | relative_humidity | % | NA | NA |
`Light Sensor` | brightness | lux | NA | NA |
`Fan` | wind_avg | mi/hr | NA | NA | wind_avg speed reported as Fan %
`Motion Sensor` | wind_gust | mi/hr | occupancy_trigger_value | 30 |
`Occupancy Sensor` | barometric_pressure | inHg | occupancy_trigger_value | 30 |
` ` | precip | in/hr | occupancy_trigger_value | 0.25 |
` ` | precip_accum_local_day | in | occupancy_trigger_value | 1 |
` ` | solar_radiation | W/m^2 | occupancy_trigger_value | 1000 |
` ` | uv | UV Index | occupancy_trigger_value | 3 |
` ` | wind_direction |   | occupancy_trigger_value | 360 |

Reference: https://weatherflow.github.io/Tempest/api/swagger/#!/observations/getStationObservation.

### Config Example

```json
{
  "name": "WeatherFlow Tempest Platform",
  "token": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "station_id": 10000,
  "interval": 10,
  "sensors": [
      {
          "name": "Temperature",
          "sensor_type": "Temperature Sensor",
          "temperature_properties": {
              "value_key": "air_temperature"
          }
      },
      {
          "name": "Feels Like",
          "sensor_type": "Temperature Sensor",
          "temperature_properties": {
              "value_key": "feels_like"
          }
      },
      {
          "name": "Dew Point",
          "sensor_type": "Temperature Sensor",
          "temperature_properties": {
              "value_key": "dew_point"
          }
      },
      {
          "name": "Relative Humidity",
          "sensor_type": "Humidity Sensor",
          "humidity_properties": {
              "value_key": "relative_humidity"
          }
      },
      {
          "name": "Light Level",
          "sensor_type": "Light Sensor",
          "light_properties": {
              "value_key": "brightness"
          }
      },
      {
          "name": "Wind Speed",
          "sensor_type": "Fan",
          "fan_properties": {
              "value_key": "wind_avg"
          }
      },
      {
          "name": "Wind Gust",
          "sensor_type": "Motion Sensor",
          "motion_properties": {
              "value_key": "wind_gust",
              "motion_trigger_value": 10
          }
      },
      {
          "name": "Barometer",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "barometric_pressure",
              "occupancy_trigger_value": 30
          }
      },
      {
          "name": "Solar Radiation",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "solar_radiation",
              "occupancy_trigger_value": 1000
          }
      },
      {
          "name": "UV",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "uv",
              "occupancy_trigger_value": 3
          }
      },
      {
          "name": "Precipitation Rate",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "precip",
              "occupancy_trigger_value": 0.25
          }
      },
      {
          "name": "Precipitation Today",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "precip_accum_local_day",
              "occupancy_trigger_value": 1
          }
      },
      {
          "name": "Wind Direction",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "wind_direction",
              "occupancy_trigger_value": 360
          }
      }
  ],
  "platform": "WeatherFlowTempest"
}
```