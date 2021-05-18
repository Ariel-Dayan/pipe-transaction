/* eslint-disable no-console */
export default class Logger {
    static log(show: boolean, message: string | Error, level = 'Info', params?: unknown): void {
      if(show) {
        const fullMessage = `[${level}]: ${message}`;
    
        // eslint-disable-next-line no-nested-ternary
        const outParams = params && typeof params === 'object' ? (params instanceof Error ? params.message : JSON.stringify(params, null, 4)) : params;
    
        if (params) {
          console.log(fullMessage, outParams);
        } else {
          console.log(fullMessage);
        }
      }
    }
  }
  