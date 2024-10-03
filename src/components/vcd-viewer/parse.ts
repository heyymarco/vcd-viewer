// models:
import {
    type Vcd,
    type VcdModule,
    type VcdVariable,
    type VcdToken,
    VcdValueFormat,
}                           from '@/models/vcd'
import {
    produce,
}                           from 'immer'



const nanFallback = <TNumber extends number, TFallback>(num: TNumber, fallback: TFallback): TNumber|TFallback => {
    if (isNaN(num)) return fallback;
    return num;
}
export const parseVcdFromFileContent = (content: string): Vcd|null => {
    const vcd = produce({ rootModule: { name: 'root', submodules: [], variables: [] } } as unknown as Vcd, (draft) => {
        let idCounter      : number = -1;
        let prevToken      : VcdToken|null = null;
        let parentModules  : VcdModule[]   = [];
        let currentModule  : VcdModule     = draft.rootModule;
        const variableMap  = new Map<string, VcdVariable[]>();
        let doReadingVars  = false;
        let currentTick    = 0;
        for (const lineRaw of content.split(/\r?\n/)) {
            // conditions:
            const line = lineRaw.trim();
            if (!line) continue;
            
            
            
            // parses:
            const prevTokenValue : VcdToken|null = prevToken;
            prevToken = null;
            switch (prevTokenValue) {
                case 'DATE': {
                    const dateOffset = Date.parse(line);
                    if (!isNaN(dateOffset)) draft.date = new Date(dateOffset);
                } continue;
                
                case 'VERSION': {
                    draft.version = line;
                } continue;
                
                case 'TIMESCALE': {
                    const parsed = (/(\d+)(\w+)/).exec(line);
                    if (parsed) {
                        const { '1': valueStr, '2': unit} = parsed;
                        const value = valueStr ? Number.parseInt(valueStr) : NaN;
                        if (!isNaN(value)) {
                            let divider : number|null = null;
                            switch (unit) {
                                case 's': divider  = 10 **  0; break;
                                case 'ms': divider = 10 **  3; break;
                                case 'us': divider = 10 **  6; break;
                                case 'ns': divider = 10 **  9; break;
                                case 'ps': divider = 10 ** 12; break;
                                case 'fs': divider = 10 ** 15; break;
                                case 'as': divider = 10 ** 18; break;
                                case 'zs': divider = 10 ** 21; break;
                                case 'ys': divider = 10 ** 24; break;
                            } // switch
                            if (divider !== null) draft.timescale = (value / divider);
                        } // if
                    } // if
                } continue;
            } // switch
            
            switch (line.trimEnd()) {
                case '$date'     : prevToken = 'DATE'      ; continue;
                case '$version'  : prevToken = 'VERSION'   ; continue;
                case '$timescale': prevToken = 'TIMESCALE' ; continue;
                case '$dumpvars' :
                    prevToken = 'DUMPVARS';
                    doReadingVars = true;
                    continue;
                
                case '$end'      :
                    prevToken = null;
                    if (doReadingVars) doReadingVars = false;
                    continue;
                
                default          : {
                    const module = (/^\$scope\s+module\s+([^\s]+)(?:\s+\$end)?/).exec(line);
                    if (module) {
                        // add a child module:
                        const moduleName = module[1];
                        const childModule : VcdModule =(
                            // find existing module by name (if any):
                            currentModule.submodules.find(({ name: searchName }) => (searchName === moduleName))
                            
                            ??
                            
                            // create a new module
                            (() => {
                                const newModule : VcdModule = {
                                    name       : moduleName,
                                    submodules : [],
                                    variables  : [],
                                };
                                currentModule.submodules.push(newModule);
                                return newModule;
                            })()
                        );
                        
                        // move down:
                        parentModules.push(currentModule);
                        currentModule = childModule;
                        
                        continue;
                    } // if
                    
                    if ((/^\$upscope(?:\s+\$end)?/).test(line)) {
                        // move up:
                        currentModule = parentModules.pop() ?? currentModule;
                        
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
                        const newVariable : VcdVariable = {
                            name    : name,
                            alias   : alias,
                            
                            type    : type,
                            size    : Number.parseInt(size),
                            msb     : nanFallback(Number.parseInt(msb), undefined),
                            lsb     : nanFallback(Number.parseInt(lsb), undefined),
                            waves   : [],
                            
                            // extra data:
                            id      : (++idCounter),
                            format  : VcdValueFormat.HEXADECIMAL,
                            color   : null,
                        };
                        currentModule.variables.push(newVariable);
                        
                        const variableCollection = variableMap.get(alias) ?? (() => {
                            const newVariableCollection : VcdVariable[] = [];
                            variableMap.set(alias, newVariableCollection);
                            return newVariableCollection;
                        })();
                        variableCollection.push(newVariable);
                        
                        continue;
                    } // if
                    
                    if ((/^\$enddefinitions(?:\s+\$end)?/).test(line)) {
                        // do nothing
                        
                        continue;
                    } // if
                }
            } // switch
            
            if (doReadingVars || (line[0] !== '#')) {
                const variableValue = /^(\w[^\s]*)\s+([^\s]+)/.exec(line) ?? /^(\d+)([^\s]+)/.exec(line);
                if (variableValue) {
                    const {
                        '1': valueRaw,
                        '2': alias,
                    } = variableValue;
                    const valueNum = (valueRaw[0] === 'b') ? Number.parseInt(valueRaw.slice(1), 2) : Number.parseInt(valueRaw);
                    const value    = nanFallback(valueNum, valueRaw);
                    
                    const variableCollection = variableMap.get(alias) ?? (() => {
                        const newVariableCollection : VcdVariable[] = [];
                        variableMap.set(alias, newVariableCollection);
                        return newVariableCollection;
                    })();
                    for (const variable of variableCollection) variable.waves.push({
                        tick  : currentTick,
                        value : value,
                    });
                } // if
                
                continue;
            }
            else if (line[0] === '#') {
                const tick = Number.parseInt(line.slice(1));
                if (!isNaN(tick)) currentTick = tick;
            } // if
        } // for
    });
    if (vcd.timescale === undefined) return null;
    return vcd;
}