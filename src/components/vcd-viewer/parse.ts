// models:
import {
    type VcdFile,
    type VcdToken,
}                           from '@/models/vcd'
import {
    produce,
}                           from 'immer'



export const parseVcdFromFileContent = (content: string): VcdFile|null => {
    const vcdFile = produce({ signals: [] } as unknown as VcdFile, (draft) => {
        let prevToken   : VcdToken|null = null;
        let prevModules : string[] = [];
        for (const lineRaw of content.split(/\r?\n/)) {
            // conditions:
            const line = lineRaw.trim();
            if (!line) continue;
            
            
            
            // parses:
            const prevTokenValue = prevToken;
            prevToken = null;
            switch (prevTokenValue) {
                case 'DATE': {
                    const dateOffset = Date.parse(line);
                    if (!isNaN(dateOffset)) draft.date = new Date(dateOffset);
                } break;
                
                case 'VERSION': {
                    draft.version = line;
                } break;
                
                case 'TIMESCALE': {
                    const parsed = (/(\d+)(\w+)/).exec(line);
                    if (parsed) {
                        const { '1': valueStr, '2': unit} = parsed;
                        const value = valueStr ? Number.parseInt(valueStr) : NaN;
                        if (!isNaN(value)) {
                            let divider : number|null = null;
                            switch (unit) {
                                case 's': divider  = 10 ** 0; break;
                                case 'ms': divider = 10 ** 3; break;
                                case 'us': divider = 10 ** 6; break;
                                case 'ns': divider = 10 ** 9; break;
                                case 'ps': divider = 10 ** 12; break;
                                case 'fs': divider = 10 ** 15; break;
                                case 'as': divider = 10 ** 18; break;
                                case 'zs': divider = 10 ** 21; break;
                                case 'ys': divider = 10 ** 24; break;
                            } // switch
                            if (divider !== null) draft.timescale = (value / divider);
                        } // if
                    } // if
                } break;
            } // switch
            
            switch (line.trimEnd()) {
                case '$date'     : prevToken = 'DATE'      ; continue;
                case '$version'  : prevToken = 'VERSION'   ; continue;
                case '$timescale': prevToken = 'TIMESCALE' ; continue;
                
                case '$end'      : prevToken = null        ; continue;
                default          : {
                    const module = (/^\$scope\s+module\s+([^\s]+)(?:\s+\$end)?/).exec(line);
                    if (module) {
                        prevModules.push(module[1]);
                        continue;
                    } // if
                    
                    if ((/^\$upscope(?:\s+\$end)?/).test(line)) {
                        prevModules.pop();
                        continue;
                    } // if
                    
                    const variable = (/^\$var\s+([^\s]+)\s+(\d+)\s+([^\s])\s+([^\s]+)(?:\s+\[\s*(\d+)\s*:\s*(\d+)\s*\])?(?:\s+\$end)?/).exec(line);
                    if (variable) {
                        const {
                            '1': type,
                            '2': size,
                            '3': alias,
                            '4': name,
                            '5': msb,
                            '6': lsb,
                        } = variable;
                        draft.signals.push({
                            modules : prevModules.slice(0), // copy
                            
                            name    : name,
                            alias   : alias,
                            
                            size    : Number.parseInt(size),
                            msb     : Number.parseInt(msb),
                            lsb     : Number.parseInt(lsb),
                            waves   : [],
                        });
                        continue;
                    } // if
                    
                    if ((/^\$enddefinitions(?:\s+\$end)?/).test(line)) {
                        // TODO: reading waves
                        continue;
                    } // if
                }
            } // switch
        } // for
    });
    if (vcdFile.timescale === undefined) return null;
    return vcdFile;
}