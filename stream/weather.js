import AIStream from '../../../lib/aistream/aistream.js';
import fetch from 'node-fetch';

export default class WeatherStream extends AIStream {
  constructor() {
    super({
      name: 'weather',
      description: '天气查询插件',
      priority: 80
    });
  }

  async init() {
    await super.init();

    this.registerMCPTool('get_weather', {
      description: '根据城市名称或城市编码查询天气信息，包括实时天气、扩展气象数据、生活指数和天气预报',
      inputSchema: {
        type: 'object',
        properties: {
          adcode: {
            type: 'string',
            description: '6位数字城市编码。例如，北京市的Adcode是 "110000"。使用Adcode查询更准确、更快速。'
          },
          city: {
            type: 'string',
            description: '标准的城市名称，如 "北京", "上海市", "福田区"。请使用官方的省、市、区县行政区划名称。'
          },
          extended: {
            type: 'boolean',
            description: '是否返回扩展气象字段（体感温度、能见度、气压、紫外线指数、空气质量、降水量、云量）。'
          },
          forecast: {
            type: 'boolean',
            description: '是否返回预报数据（当日最高/最低气温及未来3天天气预报）。'
          },
          indices: {
            type: 'boolean',
            description: '是否返回生活指数（穿衣、紫外线、洗车、晾晒、空调、感冒、运动、舒适度）。'
          }
        }
      },
      handler: async (params) => {
        const { city, adcode, extended = false, forecast = false, indices = false } = params;

        if (!city && !adcode) {
          return {
            error: {
              code: 'INVALID_ARGUMENT',
              message: 'Either \'city\' or \'adcode\' parameter is required.'
            }
          };
        }

        try {
          const url = new URL('https://uapis.cn/api/v1/misc/weather');
          
          if (city) url.searchParams.append('city', city);
          if (adcode) url.searchParams.append('adcode', adcode);
          if (extended) url.searchParams.append('extended', extended.toString());
          if (forecast) url.searchParams.append('forecast', forecast.toString());
          if (indices) url.searchParams.append('indices', indices.toString());

          const response = await fetch(url.toString());
          const data = await response.json();

          if (!response.ok) {
            return {
              error: {
                code: data.code || 'UNKNOWN_ERROR',
                message: data.message || 'Failed to fetch weather data'
              }
            };
          }

          return data;
        } catch (error) {
          console.error('Error fetching weather data:', error);
          return {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An error occurred while fetching weather data'
            }
          };
        }
      }
    });
  }
}