# Homebridge WeatherFlow Tempest Plugin

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) ![npm-version](https://badgen.net/npm/v/homebridge-weatherflow-tempest?icon=npm&label) ![npm-downloads](https://badgen.net/npm/dt/homebridge-weatherflow-tempest?icon=npm&label) [![donate](https://badgen.net/badge/donate/paypal/yellow)](https://paypal.me/chasenicholl)

<table align="center">
<tr>
<td>
<img src="https://user-images.githubusercontent.com/3979615/78016493-9b89a800-7396-11ea-9442-414ad9ffcdf2.png" width="200" sytle="border: 0px;">
</td>
<td>
<img src="https://t9s9z3m3.rocketcdn.me/wp-content/uploads/2016/05/Tempest-powered-by-01.svg" width="250" sytle="border: 0px;">
</td>
</tr>
</table>

*New* in v4.0.0 Local API Support!

Homebridge Plugin providing basic WeatherFlow Tempest support. Exposing 7 Acessories.

- Temperature Sensor
- Humidity Sensor
- Light Sensor
- Motion Sensor (triggered by user configured value)
- Occupancy Sensor (triggered by user configured value)
- Fan (expressed as Rotation Speed - Wind Speed 0-100mph)
- Battery Sensor (added to `air_temperature` Temperature sensor)

<br>

---
<u><h3 align=center>NOTE:</h3></u>

It is recommended when upgrading to v3.0 of the plugin from a prior version that you save your configuration information including `token` and `station_id`, uninstall the prior version of the plugin, restart Homebridge to clear the accessory cache, install v3.0 of the plugin, enter your Settings, and finally restart Homebridge to initialize the plugin.

---
<br>

### Setup and Parameters

Local API is now supported which requires no authentication. If you choose to use the non-local HTTP API you will need to create an account at https://tempestwx.com/ and then generate a Personal Use Token https://tempestwx.com/settings/tokens.

- `name`: _(Required)_ Must always be set to `WeatherFlow Tempest Platform`.
- `local_api`: _(Required)_ Use the Local API versus HTTP API.
- `token`: _(Required for HTTP API)_ Oauth2 Personal Use Token, create via your tempestwx account.
- `station_id`: _(Required for HTTP API)_ The station ID you are pulling weather data from.
- `interval`: _(Required for HTTP API)_ How often to poll the Tempest REST API. Default 10 seconds. Minimum every second.
- `local_api_shared`: _(Optional)_ enable multicast. Will reuse the address, even if another process has already bound a socket on it, but only one socket can receive the data. Default: False.
- `sensors`: _(Required)_ An array of sensors to create. This is dynamic incase you want to target different temperature or wind speed attributes.
- `sensors[].name`: _(Required)_ Display name of Sensor in Apple Home.
- `sensors[].sensor_type`: _(Required)_ The type of Home Sensor to create. There are 6 options ["Temperature Sensor", "Light Sensor", "Humidity Sensor", "Fan", "Motion Sensor", "Occupancy Sensor"].
- `sensors[].{1}_properties.value_key`: _(Required)_ Which REST API response body key to target for its value. You can find the available value_keys in the table below.
- `sensors[].motion_properties.trigger_value`: _(Required with Motion Sensor)_ At what point (value) to trigger motion detected on/off. Minimum 1.
- `sensors[].occupancy_properties.trigger_value`: _(Required with Occupancy Sensor)_ At what point (value) to trigger occupancy detected on/off. Minimum 0.
- `sensors[].contact_properties.trigger_distance`: _(Required with Contact Sensor)_ The minimum distance (in kilometers) at which the strike was detected to activate the contact sensor.
- `sensors[].contact_properties.trigger_time`: _(Required with Contact Sensor)_ The minimum time interval (in seconds) between the detected strike to activate the contact sensor.

`{1}`  Replace with Sensor: temperature, humidity, light, fan 

sensor_type `{2}` | value_key | metric units | std units | additional_properties | Typ metric trigger | Typ std trigger | Notes
:-- | :--- | :--: | :--: | :--- | :--: | :--: | :---
`Temperature Sensor` | air_temperature | C | F | NA | NA | NA | set by UI preferences
` ` | feels_like | C | F | NA | NA | NA | set by UI preferences
` ` | wind_chill | C | F | NA | NA | NA | set by UI preferences
` ` | dew_point | C | F | NA | NA | NA | set by UI preferences
`Humidity Sensor` | relative_humidity | % | % | NA | NA | NA |
`Light Sensor` | brightness | lux | lux | NA | NA | NA |
`Fan` | wind_avg | m/s | mi/hr | NA | NA | NA | wind_avg speed reported as Fan %
`Motion Sensor` | wind_gust | m/s | mi/hr | motion_trigger_value | 5 | 10 |
`Occupancy Sensor {3}{4}` | barometric_pressure | mb | inHg | occupancy_trigger_value | 1000 | 30 |
` ` | precip | mm/min | in/hr | occupancy_trigger_value | 0.1 | 0.25 |
` ` | precip_accum_local_day | mm | in | occupancy_trigger_value | 25 | 1 | **Not available with Local API**
` ` | solar_radiation | W/m^2 | W/m^2 | occupancy_trigger_value | 1000| 1000 |
` ` | uv | Index | Index | occupancy_trigger_value | 3 | 3 |
` ` | wind_direction | degrees | degrees | occupancy_trigger_value | 360 | 360 |

`{2}`  Reference: https://weatherflow.github.io/Tempest/api/swagger/#!/observations/getStationObservation

`{3}` Reference Wiki for details on how to view Occupancy Sensor values with iOS 16.x and MacOS Ventura 13.x.

`{4}` <b><u>NOTE:</u></b> There is a current limitation with v3.0.0 and v4.0.0 of the plug-in in that HomeKit accessory names are set when the accessory is <u>initially</u> added and cannot be dynamically updated. The accessories are correctly displayed and updated in the Homebridge "Accessories" tab of the webpage interface. Occupancy sensors `trigger_value` status is correctly displayed in both HomeKit and Homebridge.

### Local API Config Example

```json
{
  "name": "WeatherFlow Tempest Platform",
  "local_api": true,
  "station_id": 10000,
  "units": "Standard",
  "local_api_shared": false,
  "sensors": [
      {
          "name": "Temperature",
          "sensor_type": "Temperature Sensor",
          "temperature_properties": {
              "value_key": "air_temperature"
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
              "trigger_value": 10
          }
      },
      {
          "name": "Barometer",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "barometric_pressure",
              "trigger_value": 30
          }
      },
      {
          "name": "Solar Radiation",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "solar_radiation",
              "trigger_value": 1000
          }
      },
      {
          "name": "UV",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "uv",
              "trigger_value": 3
          }
      },
      {
          "name": "Precipitation Rate",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "precip",
              "trigger_value": 0.25
          }
      },
      {
          "name": "Precipitation Today",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "precip_accum_local_day",
              "trigger_value": 1
          }
      },
      {
          "name": "Wind Direction",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "wind_direction",
              "trigger_value": 360
          }
      },
      {
          "name": "Lightening Detector",
          "sensor_type": "Contact Sensor",
          "contact_properties": {
              "trigger_distance": 10,
              "trigger_time": 120
          }
      }
  ],
  "platform": "WeatherFlowTempest"
}
```

### HTTP API Config Example

```json
{
  "name": "WeatherFlow Tempest Platform",
  "local_api": false,
  "token": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "station_id": 10000,
  "interval": 10,
  "units": "Standard",
  "local_api_shared": false,
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
              "trigger_value": 10
          }
      },
      {
          "name": "Barometer",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "barometric_pressure",
              "trigger_value": 30
          }
      },
      {
          "name": "Solar Radiation",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "solar_radiation",
              "trigger_value": 1000
          }
      },
      {
          "name": "UV",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "uv",
              "trigger_value": 3
          }
      },
      {
          "name": "Precipitation Rate",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "precip",
              "trigger_value": 0.25
          }
      },
      {
          "name": "Precipitation Today",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "precip_accum_local_day",
              "trigger_value": 1
          }
      },
      {
          "name": "Wind Direction",
          "sensor_type": "Occupancy Sensor",
          "occupancy_properties": {
              "value_key": "wind_direction",
              "trigger_value": 360
          }
      },
      {
          "name": "Lightening Detector",
          "sensor_type": "Contact Sensor",
          "contact_properties": {
              "trigger_distance": 10,
              "trigger_time": 120
          }
      }
  ],
  "platform": "WeatherFlowTempest"
}
```